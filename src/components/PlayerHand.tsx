'use client';

import { Player, Card, suitInfo } from '@/lib/types';
import { PlayingCard } from './PlayingCard';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  onCardClick?: (card: Card) => void;
  playableCardIds?: string[];
  showCards?: boolean;
  compact?: boolean;
}

export function PlayerHand({
  player,
  isCurrentPlayer,
  onCardClick,
  playableCardIds = [],
  showCards = true,
  compact = false,
}: PlayerHandProps) {
  // Sort hand by suit and value
  const sortedHand = [...player.hand].sort((a, b) => {
    const suitOrder = ['kreuz', 'pik', 'herz', 'karo'];
    const valueOrder = ['7', '8', '9', '10', 'B', 'D', 'K', 'A'];
    
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    
    return valueOrder.indexOf(a.value) - valueOrder.indexOf(b.value);
  });

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm font-medium text-gray-700">
          {player.name}
          {isCurrentPlayer && (
            <span className="ml-2 text-green-600">(Du bist dran!)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {sortedHand.slice(0, 8).map((card) => (
            <PlayingCard
              key={card.id}
              card={card}
              size="sm"
              isPlayable={playableCardIds.includes(card.id) && isCurrentPlayer}
              onClick={
                isCurrentPlayer && onCardClick
                  ? () => onCardClick(card)
                  : undefined
              }
            />
          ))}
          {player.hand.length > 8 && (
            <span className="text-xs text-gray-500 ml-1">
              +{player.hand.length - 8}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{player.name}</h3>
          {isCurrentPlayer && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full animate-pulse">
              Du bist dran!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {player.hand.length} {player.hand.length === 1 ? 'Karte' : 'Karten'}
          </span>
          {player.mustDraw > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded-full">
              +{player.mustDraw} ziehen
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-4 pt-2">
          {sortedHand.map((card) => {
            const isPlayable = playableCardIds.includes(card.id) && isCurrentPlayer;
            
            return (
              <div key={card.id} className="flex-shrink-0">
                <PlayingCard
                  card={card}
                  size="md"
                  isPlayable={isPlayable}
                  onClick={
                    isCurrentPlayer && onCardClick
                      ? () => onCardClick(card)
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Mau status indicators */}
      {player.hasSaidMau && (
        <div className="mt-2 text-sm text-amber-600 font-medium">
          🐱 Mau gesagt!
        </div>
      )}
      {player.hasSaidMauMau && (
        <div className="mt-2 text-sm text-amber-600 font-medium">
          🐱🐱 Mau Mau gesagt!
        </div>
      )}
    </div>
  );
}

// Opponent player card display (shows card backs with count)
interface OpponentDisplayProps {
  player: Player;
  isCurrentPlayer: boolean;
  position: 'top' | 'left' | 'right';
  showCards?: boolean;
}

export function OpponentDisplay({
  player,
  isCurrentPlayer,
  position,
  showCards = false,
}: OpponentDisplayProps) {
  const isVertical = position === 'left' || position === 'right';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-white/50 backdrop-blur-sm shadow-md',
        isVertical ? 'flex-col' : 'flex-row',
        isCurrentPlayer && 'ring-2 ring-green-400'
      )}
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'font-medium text-gray-800',
            isCurrentPlayer && 'text-green-700'
          )}
        >
          {player.name}
        </div>
        {isCurrentPlayer && (
          <span className="text-xs text-green-600 animate-pulse">
            Du bist dran!
          </span>
        )}
        <div className="text-sm text-gray-500 mt-1">
          {player.hand.length} {player.hand.length === 1 ? 'Karte' : 'Karten'}
        </div>
        {player.mustDraw > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full mt-1">
            +{player.mustDraw} ziehen
          </span>
        )}
      </div>

      {showCards ? (
        <div className="flex gap-1">
          {player.hand.slice(0, 4).map((card) => (
            <PlayingCard key={card.id} card={card} size="sm" />
          ))}
          {player.hand.length > 4 && (
            <span className="text-xs text-gray-500 self-center">
              +{player.hand.length - 4}
            </span>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex',
            isVertical ? 'flex-col' : 'flex-row'
          )}
        >
          {player.hand.slice(0, 4).map((_, i) => (
            <div
              key={i}
              className="w-8 h-12 rounded bg-gradient-to-br from-blue-600 to-blue-800 shadow-sm border border-blue-400"
              style={{
                marginLeft: isVertical ? 0 : i * -4,
                marginTop: isVertical ? i * -8 : 0,
                zIndex: i,
              }}
            />
          ))}
          {player.hand.length > 4 && (
            <span
              className={cn(
                'text-xs text-gray-600 font-medium bg-white/80 rounded-full px-1.5',
                isVertical ? 'ml-1' : 'mt-2'
              )}
            >
              +{player.hand.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerHand;
