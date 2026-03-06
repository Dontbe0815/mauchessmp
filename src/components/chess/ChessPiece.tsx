'use client';

import { Piece, PieceType, PieceColor, pieceSymbols } from '@/lib/chess-logic';
import { cn } from '@/lib/utils';

interface ChessPieceProps {
  piece: Piece;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function ChessPiece({
  piece,
  size = 'md',
  className,
  onClick,
  draggable = false,
  onDragStart,
}: ChessPieceProps) {
  const symbol = pieceSymbols[piece.type][piece.color];
  
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-110',
        sizeClasses[size],
        piece.color === 'white' ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]',
        className
      )}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {symbol}
    </div>
  );
}

// Piece icon for captured pieces display
interface CapturedPieceIconProps {
  type: PieceType;
  color: PieceColor;
  count?: number;
}

export function CapturedPieceIcon({ type, color, count }: CapturedPieceIconProps) {
  const symbol = pieceSymbols[type][color];
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <span className={cn(
        'text-lg',
        color === 'white' ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-gray-800'
      )}>
        {symbol}
      </span>
      {count && count > 1 && (
        <span className="absolute -bottom-1 -right-1 text-xs bg-gray-700 text-white rounded-full w-4 h-4 flex items-center justify-center">
          {count}
        </span>
      )}
    </div>
  );
}

export default ChessPiece;
