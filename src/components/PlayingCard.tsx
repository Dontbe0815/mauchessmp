'use client';

import { Card as CardType, Suit, Value, suitInfo, valueInfo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PlayingCardProps {
  card: CardType;
  onClick?: () => void;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

// SVG Card component
export function PlayingCard({
  card,
  onClick,
  isPlayable = false,
  isSelected = false,
  size = 'md',
  className,
  animated = true,
}: PlayingCardProps) {
  const suit = suitInfo[card.suit];
  const value = valueInfo[card.value];

  const sizeClasses = {
    sm: 'w-14 h-20',
    md: 'w-20 h-28',
    lg: 'w-24 h-36',
  };

  const getSuitSymbol = () => {
    const symbolSize = size === 'sm' ? 24 : size === 'md' ? 36 : 48;
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={symbolSize}
        fill={suit.color}
      >
        {suit.symbol}
      </text>
    );
  };

  const getValueDisplay = () => {
    const fontSize = size === 'sm' ? 10 : size === 'md' ? 14 : 18;
    return (
      <>
        {/* Top left */}
        <text
          x="15%"
          y="15%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="bold"
          fill={suit.color}
        >
          {value.shortName}
        </text>
        <text
          x="15%"
          y="28%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize - 2}
          fill={suit.color}
        >
          {suit.symbol}
        </text>

        {/* Bottom right (rotated) */}
        <text
          x="85%"
          y="85%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="bold"
          fill={suit.color}
          transform={`rotate(180, ${size === 'sm' ? 9.8 : size === 'md' ? 14 : 17}, ${size === 'sm' ? 14 : size === 'md' ? 20 : 25.2})`}
        >
          {value.shortName}
        </text>
        <text
          x="85%"
          y="72%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize - 2}
          fill={suit.color}
          transform={`rotate(180, ${size === 'sm' ? 9.8 : size === 'md' ? 14 : 17}, ${size === 'sm' ? 10 : size === 'md' ? 14.4 : 18})`}
        >
          {suit.symbol}
        </text>
      </>
    );
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'relative rounded-lg shadow-md transition-all duration-200',
        sizeClasses[size],
        animated && 'hover:scale-105',
        isPlayable && onClick && 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
        isPlayable && 'ring-2 ring-green-400 ring-offset-1',
        isSelected && 'ring-2 ring-yellow-400 ring-offset-2 -translate-y-2',
        !isPlayable && onClick && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <svg
        viewBox="0 0 80 112"
        className="w-full h-full rounded-lg"
        style={{ backgroundColor: '#fff' }}
      >
        {/* Card background */}
        <rect
          x="2"
          y="2"
          width="76"
          height="108"
          rx="6"
          ry="6"
          fill="#fff"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        {/* Value and suit corners */}
        {getValueDisplay()}

        {/* Center suit symbol */}
        {getSuitSymbol()}
      </svg>
    </button>
  );
}

// Card back component
interface CardBackProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function CardBack({ size = 'md', onClick, className }: CardBackProps) {
  const sizeClasses = {
    sm: 'w-14 h-20',
    md: 'w-20 h-28',
    lg: 'w-24 h-36',
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'relative rounded-lg shadow-md overflow-hidden transition-all duration-200',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:scale-105',
        className
      )}
    >
      <img
        src="/cards/card_back.png"
        alt="Kartenrückseite"
        className="w-full h-full object-cover"
      />
    </button>
  );
}

// Stacked cards display (for opponent hands)
interface StackedCardsProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
  className?: string;
}

export function StackedCards({
  count,
  size = 'md',
  maxVisible = 5,
  className,
}: StackedCardsProps) {
  const sizeClasses = {
    sm: 'w-14 h-20',
    md: 'w-20 h-28',
    lg: 'w-24 h-36',
  };

  const offset = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
  const visibleCount = Math.min(count, maxVisible);

  return (
    <div className={cn('relative', className)} style={{ width: sizeClasses[size].split(' ')[0] }}>
      {Array.from({ length: visibleCount }).map((_, i) => (
        <div
          key={i}
          className={cn('absolute', sizeClasses[size])}
          style={{
            left: i * offset,
            zIndex: i,
          }}
        >
          <CardBack size={size} />
        </div>
      ))}
      {count > maxVisible && (
        <div
          className="absolute flex items-center justify-center bg-gray-800 text-white rounded-full text-xs font-bold"
          style={{
            left: visibleCount * offset + 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 24,
            height: 24,
          }}
        >
          +{count - maxVisible}
        </div>
      )}
    </div>
  );
}

// Empty card slot
interface EmptySlotProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function EmptySlot({ size = 'md', label, className }: EmptySlotProps) {
  const sizeClasses = {
    sm: 'w-14 h-20',
    md: 'w-20 h-28',
    lg: 'w-24 h-36',
  };

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      {label && (
        <span className="text-gray-400 text-xs text-center px-1">{label}</span>
      )}
    </div>
  );
}

export default PlayingCard;
