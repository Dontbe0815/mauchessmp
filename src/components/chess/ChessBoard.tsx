'use client';

import { ChessState, Position, Piece, pieceSymbols, getNotation } from '@/lib/chess-logic';
import { cn } from '@/lib/utils';

interface ChessBoardProps {
  state: ChessState;
  onSquareClick: (pos: Position) => void;
  flipped?: boolean;
}

export function ChessBoard({ state, onSquareClick, flipped = false }: ChessBoardProps) {
  const { board, selectedPosition, validMoves, lastMove, isCheck, currentPlayer } = state;

  const isSelected = (row: number, col: number) => 
    selectedPosition?.row === row && selectedPosition?.col === col;

  const isValidMove = (row: number, col: number) =>
    validMoves.some(m => m.row === row && m.col === col);

  const isLastMove = (row: number, col: number) =>
    lastMove && ((lastMove.from.row === row && lastMove.from.col === col) ||
                 (lastMove.to.row === row && lastMove.to.col === col));

  const isKingInCheck = (row: number, col: number) => {
    const piece = board[row][col];
    return isCheck && piece?.type === 'king' && piece.color === currentPlayer;
  };

  const renderSquare = (row: number, col: number) => {
    const actualRow = flipped ? 7 - row : row;
    const actualCol = flipped ? 7 - col : col;
    const piece = board[actualRow][actualCol];
    const isLight = (actualRow + actualCol) % 2 === 0;
    
    return (
      <button
        key={`${actualRow}-${actualCol}`}
        onClick={() => onSquareClick({ row: actualRow, col: actualCol })}
        className={cn(
          'aspect-square relative flex items-center justify-center transition-all duration-200',
          'hover:brightness-110',
          isLight ? 'bg-amber-100' : 'bg-amber-700',
          isSelected(actualRow, actualCol) && 'ring-4 ring-blue-500 ring-inset',
          isLastMove(actualRow, actualCol) && 'bg-yellow-300/50',
          isKingInCheck(actualRow, actualCol) && 'bg-red-400',
          isValidMove(actualRow, actualCol) && 'cursor-pointer'
        )}
      >
        {/* Valid move indicator */}
        {isValidMove(actualRow, actualCol) && (
          <div className={cn(
            'absolute rounded-full transition-opacity',
            piece 
              ? 'w-4 h-4 bg-red-500/50 border-2 border-red-500' 
              : 'w-3 h-3 bg-green-500/60'
          )} />
        )}
        
        {/* Piece */}
        {piece && (
          <span 
            className={cn(
              'text-4xl md:text-5xl select-none drop-shadow-md transition-transform',
              'hover:scale-110',
              piece.color === 'white' ? 'text-white' : 'text-gray-900'
            )}
            style={{ 
              textShadow: piece.color === 'white' 
                ? '1px 1px 2px rgba(0,0,0,0.8)' 
                : '1px 1px 2px rgba(255,255,255,0.3)'
            }}
          >
            {pieceSymbols[piece.type][piece.color]}
          </span>
        )}
        
        {/* Coordinates */}
        {actualCol === (flipped ? 7 : 0) && (
          <span className={cn(
            'absolute left-1 top-0.5 text-xs font-bold',
            isLight ? 'text-amber-700' : 'text-amber-100'
          )}>
            {8 - actualRow}
          </span>
        )}
        {actualRow === (flipped ? 0 : 7) && (
          <span className={cn(
            'absolute right-1 bottom-0 text-xs font-bold',
            isLight ? 'text-amber-700' : 'text-amber-100'
          )}>
            {String.fromCharCode(97 + actualCol)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="relative">
      {/* Board border */}
      <div className="p-2 bg-amber-900 rounded-lg shadow-xl">
        {/* Board grid */}
        <div className="grid grid-cols-8 gap-0 border-2 border-amber-900 rounded overflow-hidden">
          {Array.from({ length: 8 }, (_, row) =>
            Array.from({ length: 8 }, (_, col) => renderSquare(row, col))
          )}
        </div>
      </div>
      
      {/* Current player indicator */}
      <div className={cn(
        'absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-medium',
        currentPlayer === 'white' 
          ? 'bg-white text-gray-800 border-2 border-gray-300' 
          : 'bg-gray-800 text-white border-2 border-gray-600'
      )}>
        {currentPlayer === 'white' ? 'Weiß' : 'Schwarz'} ist dran
        {isCheck && <span className="ml-2 text-red-500 font-bold">⚡ Schach!</span>}
      </div>
    </div>
  );
}

// Captured pieces display
interface CapturedPiecesProps {
  pieces: Piece[];
  color: 'white' | 'black';
}

export function CapturedPieces({ pieces, color }: CapturedPiecesProps) {
  const sortedPieces = [...pieces].sort((a, b) => {
    const order = ['queen', 'rook', 'bishop', 'knight', 'pawn'];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

  return (
    <div className={cn(
      'flex flex-wrap gap-0.5 p-2 rounded-lg min-h-[40px]',
      color === 'white' ? 'bg-gray-100' : 'bg-gray-800'
    )}>
      {sortedPieces.map((piece, i) => (
        <span 
          key={i} 
          className={cn(
            'text-xl select-none',
            piece.color === 'white' ? 'text-white' : 'text-gray-900'
          )}
          style={{ 
            textShadow: piece.color === 'white' 
              ? '1px 1px 1px rgba(0,0,0,0.8)' 
              : '1px 1px 1px rgba(255,255,255,0.3)'
          }}
        >
          {pieceSymbols[piece.type][piece.color]}
        </span>
      ))}
      {pieces.length === 0 && (
        <span className={cn(
          'text-xs opacity-50',
          color === 'white' ? 'text-gray-400' : 'text-gray-500'
        )}>
          Keine geschlagenen Figuren
        </span>
      )}
    </div>
  );
}

// Move history display
interface MoveHistoryProps {
  moves: ChessState['moveHistory'];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  return (
    <div className="max-h-48 overflow-y-auto text-sm font-mono">
      {moves.map((move, i) => (
        <div 
          key={i}
          className={cn(
            'px-2 py-1 rounded',
            i % 2 === 0 ? 'bg-gray-50' : 'bg-white'
          )}
        >
          <span className="text-gray-400 mr-2">{Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'}</span>
          <span className={move.isCheckmate ? 'text-red-600 font-bold' : ''}>
            {getNotation(move.from)}-{getNotation(move.to)}
            {move.promotion && `=${move.promotion[0].toUpperCase()}`}
            {move.isCheckmate ? '#' : move.isCheck ? '+' : ''}
          </span>
        </div>
      ))}
      {moves.length === 0 && (
        <div className="text-gray-400 text-center py-2">
          Noch keine Züge
        </div>
      )}
    </div>
  );
}

export default ChessBoard;
