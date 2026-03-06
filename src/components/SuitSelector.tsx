'use client';

import { Suit, suitInfo, Value, valueInfo } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SuitSelectorProps {
  onSelect: (suit: Suit) => void;
  playedValue: Value;
  playerName: string;
}

export function SuitSelector({ onSelect, playedValue, playerName }: SuitSelectorProps) {
  const suits: Suit[] = ['herz', 'karo', 'kreuz', 'pik'];
  const playedCardInfo = valueInfo[playedValue];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Farbe wählen
            </h2>
            <p className="text-gray-600">
              {playerName} hat eine{playedValue === '10' ? '' : 'n'}{' '}
              <span className="font-semibold">{playedCardInfo.name}</span> gespielt!
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Wähle die neue Farbe:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {suits.map((suit) => {
              const info = suitInfo[suit];
              return (
                <Button
                  key={suit}
                  onClick={() => onSelect(suit)}
                  variant="outline"
                  className={cn(
                    'h-24 flex flex-col items-center justify-center gap-2 transition-all duration-200',
                    'hover:scale-105 hover:shadow-lg border-2',
                    suit === 'herz' || suit === 'karo'
                      ? 'hover:border-red-400 hover:bg-red-50'
                      : 'hover:border-gray-400 hover:bg-gray-50'
                  )}
                >
                  <span
                    className="text-4xl"
                    style={{ color: info.color }}
                  >
                    {info.symbol}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: info.color }}
                  >
                    {info.name}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mini suit indicator for showing selected suit
interface SuitIndicatorProps {
  suit: Suit;
  size?: 'sm' | 'md' | 'lg';
}

export function SuitIndicator({ suit, size = 'md' }: SuitIndicatorProps) {
  const info = suitInfo[suit];
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-lg',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-16 h-16 text-4xl',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center shadow-md',
        sizeClasses[size]
      )}
      style={{ backgroundColor: info.bgColor }}
    >
      <span style={{ color: info.color }}>{info.symbol}</span>
    </div>
  );
}

export default SuitSelector;
