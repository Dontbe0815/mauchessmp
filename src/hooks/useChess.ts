'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ChessGameState,
  createInitialChessState,
  selectSquare,
  processMove,
  getMoveNotation,
  findKing,
  isInCheck,
  PieceColor,
  PieceType,
  Position,
  isCheckmate,
  isStalemate,
} from '@/lib/chess-logic';

interface UseChessOptions {
  timerMinutes?: number;
  onMove?: () => void;
  onCheck?: () => void;
  onCheckmate?: (winner: PieceColor) => void;
  onStalemate?: () => void;
}

export function useChess(options: UseChessOptions = {}) {
  const { timerMinutes = 10, onMove, onCheck, onCheckmate, onStalemate } = options;
  
  const [gameState, setGameState] = useState<ChessGameState>(createInitialChessState);
  const [history, setHistory] = useState<ChessGameState[]>([gameState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [whiteTime, setWhiteTime] = useState(timerMinutes * 60);
  const [blackTime, setBlackTime] = useState(timerMinutes * 60);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // King positions
  const whiteKingPos = useMemo(() => findKing(gameState.board, 'white'), [gameState.board]);
  const blackKingPos = useMemo(() => findKing(gameState.board, 'black'), [gameState.board]);
  const currentKingPos = gameState.currentPlayer === 'white' ? whiteKingPos : blackKingPos;

  // Timer effect
  useEffect(() => {
    if (!timerEnabled || gameState.isGameOver) return;

    timerRef.current = setInterval(() => {
      if (gameState.currentPlayer === 'white') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setGameState((prev) => ({ ...prev, isGameOver: true, winner: 'black' }));
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setGameState((prev) => ({ ...prev, isGameOver: true, winner: 'white' }));
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerEnabled, gameState.currentPlayer, gameState.isGameOver]);

  // Handle square click
  const handleSquareClick = useCallback(
    (position: Position) => {
      if (gameState.isGameOver) return;

      const piece = gameState.board[position.row][position.col];

      // If we have a selected square and clicking on valid move
      if (
        gameState.selectedSquare &&
        gameState.validMoves.some((m) => m.row === position.row && m.col === position.col)
      ) {
        const movingPiece = gameState.board[gameState.selectedSquare.row][gameState.selectedSquare.col];

        // Check for pawn promotion
        if (movingPiece?.type === 'pawn') {
          const promotionRow = movingPiece.color === 'white' ? 0 : 7;
          if (position.row === promotionRow) {
            // Return position for promotion dialog
            return { needsPromotion: true, from: gameState.selectedSquare, to: position };
          }
        }

        // Make the move
        const newState = processMove(gameState, gameState.selectedSquare, position);
        setGameState(newState);
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), newState]);
        setHistoryIndex(historyIndex + 1);

        // Callbacks
        onMove?.();
        if (newState.isCheck) onCheck?.();
        if (newState.isGameOver && newState.winner) onCheckmate?.(newState.winner);
        if (newState.isStalemate) onStalemate?.();

        return { needsPromotion: false };
      } else {
        // Select a piece
        setGameState((prev) => selectSquare(prev, position));
        return { needsPromotion: false };
      }
    },
    [gameState, historyIndex, onMove, onCheck, onCheckmate, onStalemate]
  );

  // Handle promotion
  const handlePromotion = useCallback(
    (from: Position, to: Position, pieceType: PieceType) => {
      const newState = processMove(gameState, from, to, pieceType);
      setGameState(newState);
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newState]);
      setHistoryIndex(historyIndex + 1);

      onMove?.();
      if (newState.isCheck) onCheck?.();
      if (newState.isGameOver && newState.winner) onCheckmate?.(newState.winner);
      if (newState.isStalemate) onStalemate?.();
    },
    [gameState, historyIndex, onMove, onCheck, onCheckmate, onStalemate]
  );

  // Undo move
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setGameState(history[newIndex]);
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, history]);

  // New game
  const handleNewGame = useCallback(() => {
    const newState = createInitialChessState();
    setGameState(newState);
    setHistory([newState]);
    setHistoryIndex(0);
    setWhiteTime(timerMinutes * 60);
    setBlackTime(timerMinutes * 60);
  }, [timerMinutes]);

  // Format time
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get move notation for history
  const getMoveNotationForHistory = useCallback((moveIndex: number) => {
    if (moveIndex < 0 || moveIndex >= gameState.moveHistory.length) return '';
    return getMoveNotation(gameState.moveHistory[moveIndex]);
  }, [gameState.moveHistory]);

  return {
    gameState,
    history,
    historyIndex,
    timerEnabled,
    setTimerEnabled,
    whiteTime,
    blackTime,
    whiteKingPos,
    blackKingPos,
    currentKingPos,
    handleSquareClick,
    handlePromotion,
    handleUndo,
    handleNewGame,
    formatTime,
    getMoveNotationForHistory,
  };
}

export default useChess;
