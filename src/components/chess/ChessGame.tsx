'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  ChessState, 
  createInitialChessState, 
  makeMove, 
  selectPiece, 
  undoMove,
  Position,
  PieceType,
  pieceNames,
  pieceSymbols
} from '@/lib/chess-logic';
import { SoundName } from '@/lib/types';
import { ChessBoard, CapturedPieces, MoveHistory } from './ChessBoard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RotateCcw, 
  Undo2, 
  Flag, 
  Clock, 
  Crown,
  Home,
  Settings,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChessGameProps {
  onBack: () => void;
  playSound?: (name: SoundName) => void;
}

export function ChessGame({ onBack, playSound }: ChessGameProps) {
  const [state, setState] = useState<ChessState>(() => createInitialChessState(false, 10));
  const [showSettings, setShowSettings] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [showPromotion, setShowPromotion] = useState<Position | null>(null);
  const [pendingMove, setPendingMove] = useState<{ from: Position; to: Position } | null>(null);

  // Timer effect
  useEffect(() => {
    if (!state.useTimer || state.gameMode !== 'playing') return;

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        timers: {
          ...prev.timers,
          [prev.currentPlayer]: Math.max(0, prev.timers[prev.currentPlayer] - 1)
        }
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.useTimer, state.gameMode, state.currentPlayer]);

  // Check for timeout
  useEffect(() => {
    if (!state.useTimer) return;
    
    const currentPlayerTime = state.timers[state.currentPlayer];
    if (currentPlayerTime === 0 && state.gameMode === 'playing') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(prev => ({
        ...prev,
        gameMode: 'gameover',
        winner: prev.currentPlayer === 'white' ? 'black' : 'white'
      }));
      playSound?.('winner');
    }
  }, [state.timers, state.currentPlayer, state.useTimer, state.gameMode, playSound]);

  // Handle square click
  const handleSquareClick = useCallback((pos: Position) => {
    if (state.gameMode !== 'playing') return;

    // Check if clicking on own piece
    const piece = state.board[pos.row][pos.col];
    
    if (state.selectedPosition) {
      // Try to move
      const isValidMove = state.validMoves.some(m => m.row === pos.row && m.col === pos.col);
      
      if (isValidMove) {
        const movingPiece = state.board[state.selectedPosition.row][state.selectedPosition.col];
        
        // Check for pawn promotion
        if (movingPiece?.type === 'pawn' && (pos.row === 0 || pos.row === 7)) {
          setPendingMove({ from: state.selectedPosition, to: pos });
          setShowPromotion(pos);
          return;
        }
        
        const newState = makeMove(state, state.selectedPosition, pos);
        setState(newState);
        
        // Play sounds
        if (newState.lastMove?.captured) {
          playSound?.('draw_card');
        } else {
          playSound?.('draw_card');
        }
        
        if (newState.isCheck) {
          playSound?.('invalid');
        }
        
        if (newState.isCheckmate || newState.isStalemate) {
          playSound?.('winner');
        }
      } else if (piece && piece.color === state.currentPlayer) {
        // Select different piece
        const newState = selectPiece(state, pos);
        setState(newState);
        playSound?.('your_turn');
      } else {
        // Deselect
        setState(prev => ({ ...prev, selectedPosition: null, validMoves: [] }));
      }
    } else if (piece && piece.color === state.currentPlayer) {
      // Select piece
      const newState = selectPiece(state, pos);
      setState(newState);
      playSound?.('your_turn');
    }
  }, [state, playSound]);

  // Handle promotion
  const handlePromotion = useCallback((pieceType: PieceType) => {
    if (!pendingMove) return;
    
    const newState = makeMove(state, pendingMove.from, pendingMove.to, pieceType);
    setState(newState);
    setShowPromotion(null);
    setPendingMove(null);
    
    playSound?.('choose_suit');
    
    if (newState.isCheckmate) {
      playSound?.('winner');
    }
  }, [state, pendingMove, playSound]);

  // New game
  const handleNewGame = useCallback(() => {
    setState(createInitialChessState(state.useTimer, timerMinutes));
    playSound?.('game_start');
  }, [state.useTimer, timerMinutes, playSound]);

  // Undo move
  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    setState(prev => undoMove(prev));
    playSound?.('draw_card');
  }, [state.moveHistory.length, playSound]);

  // Resign
  const handleResign = useCallback(() => {
    setState(prev => ({
      ...prev,
      gameMode: 'gameover',
      winner: prev.currentPlayer === 'white' ? 'black' : 'white'
    }));
    playSound?.('winner');
  }, [playSound]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <Home className="w-4 h-4" />
            Zurück
          </Button>
          
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-600" />
            Schach
          </h1>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleNewGame}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main game area */}
        <div className="space-y-4">
          {/* Timer display */}
          {state.useTimer && (
            <div className="flex justify-center gap-8">
              <div className={cn(
                'px-4 py-2 rounded-lg font-mono text-xl',
                state.currentPlayer === 'black' 
                  ? 'bg-gray-800 text-white ring-2 ring-amber-400' 
                  : 'bg-gray-200 text-gray-600'
              )}>
                ⚫ {formatTime(state.timers.black)}
              </div>
              <div className={cn(
                'px-4 py-2 rounded-lg font-mono text-xl',
                state.currentPlayer === 'white' 
                  ? 'bg-white text-gray-800 ring-2 ring-amber-400' 
                  : 'bg-gray-200 text-gray-600'
              )}>
                ⚪ {formatTime(state.timers.white)}
              </div>
            </div>
          )}

          {/* Captured pieces (black's perspective - pieces white captured) */}
          <CapturedPieces pieces={state.capturedPieces.black} color="black" />

          {/* Chess board */}
          <div className="flex justify-center pt-8">
            <ChessBoard state={state} onSquareClick={handleSquareClick} />
          </div>

          {/* Captured pieces (white's perspective - pieces black captured) */}
          <CapturedPieces pieces={state.capturedPieces.white} color="white" />

          {/* Controls */}
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="outline" onClick={handleUndo} disabled={state.moveHistory.length === 0}>
              <Undo2 className="w-4 h-4 mr-2" />
              Rückgängig
            </Button>
            <Button variant="outline" onClick={handleResign} disabled={state.gameMode !== 'playing'}>
              <Flag className="w-4 h-4 mr-2" />
              Aufgeben
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Settings */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Timer</span>
                <Button
                  variant={state.useTimer ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    useTimer: !prev.useTimer,
                    timers: { white: timerMinutes * 60, black: timerMinutes * 60 }
                  }))}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {state.useTimer ? `${timerMinutes} min` : 'Aus'}
                </Button>
              </div>
              {state.useTimer && (
                <div className="flex gap-1">
                  {[5, 10, 15, 30].map(mins => (
                    <Button
                      key={mins}
                      variant={timerMinutes === mins ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimerMinutes(mins)}
                    >
                      {mins}m
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Move history */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Züge</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MoveHistory moves={state.moveHistory} />
            </CardContent>
          </Card>

          {/* Game info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Spielinfo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Züge</span>
                <span className="font-medium">{state.moveHistory.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge variant={state.gameMode === 'playing' ? 'default' : 'secondary'}>
                  {state.gameMode === 'playing' 
                    ? 'Läuft' 
                    : state.isCheckmate 
                      ? 'Schachmatt' 
                      : 'Patt'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game over overlay */}
      {state.gameMode === 'gameover' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4 bg-white shadow-2xl animate-in zoom-in duration-300">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {state.isStalemate ? 'Patt!' : 'Schachmatt!'}
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                {state.isStalemate 
                  ? 'Das Spiel endet unentschieden.' 
                  : state.winner === 'white'
                    ? 'Weiß hat gewonnen!'
                    : 'Schwarz hat gewonnen!'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleNewGame} size="lg" className="bg-amber-600 hover:bg-amber-700">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Neues Spiel
                </Button>
                <Button onClick={onBack} variant="outline" size="lg">
                  <Home className="w-4 h-4 mr-2" />
                  Hauptmenü
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Promotion dialog */}
      {showPromotion && pendingMove && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-sm mx-4 bg-white shadow-2xl animate-in zoom-in duration-300">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-center mb-4">
                Wähle eine Figur
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {(['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map(type => (
                  <Button
                    key={type}
                    onClick={() => handlePromotion(type)}
                    variant="outline"
                    className="h-16 text-3xl hover:bg-amber-100"
                  >
                    {pieceSymbols[type][state.currentPlayer]}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-center text-gray-500 mt-3">
                {pieceNames['queen']}, {pieceNames['rook']}, {pieceNames['bishop']}, {pieceNames['knight']}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ChessGame;
