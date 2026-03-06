'use client';

import { GameState, Suit, suitInfo, Player } from '@/lib/types';
import { PlayingCard, CardBack, EmptySlot } from './PlayingCard';
import { OpponentDisplay } from './PlayerHand';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RotateCw, RotateCcw, ArrowDown, Users, Layers } from 'lucide-react';

interface GameBoardProps {
  gameState: GameState;
  onDrawCard: () => void;
  currentPlayerId: string | null;
  canDraw: boolean;
}

export function GameBoard({
  gameState,
  onDrawCard,
  currentPlayerId,
  canDraw,
}: GameBoardProps) {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  const currentSuit = gameState.currentSuit || topCard?.suit;
  const currentSuitDisplay = currentSuit ? suitInfo[currentSuit] : null;

  // Get current player
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Get opponent players
  const opponents = gameState.players.filter((_, i) => i !== gameState.currentPlayerIndex);
  
  // Map opponents to positions based on player count
  const getOpponentPosition = (index: number): 'top' | 'left' | 'right' => {
    const totalOpponents = opponents.length;
    if (totalOpponents === 1) return 'top';
    if (totalOpponents === 2) {
      return index === 0 ? 'left' : 'right';
    }
    // 3 opponents: left, top, right
    if (index === 0) return 'left';
    if (index === 1) return 'top';
    return 'right';
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col items-center justify-center">
      {/* Current suit indicator */}
      {currentSuitDisplay && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="px-4 py-2 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Aktuelle Farbe:</span>
              <span
                className="text-2xl"
                style={{ color: currentSuitDisplay.color }}
              >
                {currentSuitDisplay.symbol}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: currentSuitDisplay.color }}
              >
                {currentSuitDisplay.name}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Opponent displays */}
      {opponents.map((opponent, index) => {
        const position = getOpponentPosition(index);
        const positionClasses = {
          top: 'absolute top-20 left-1/2 -translate-x-1/2',
          left: 'absolute left-4 top-1/2 -translate-y-1/2',
          right: 'absolute right-4 top-1/2 -translate-y-1/2',
        };

        return (
          <div key={opponent.id} className={positionClasses[position]}>
            <OpponentDisplay
              player={opponent}
              isCurrentPlayer={false}
              position={position}
              showCards={gameState.showHand && opponent.id === currentPlayerId}
            />
          </div>
        );
      })}

      {/* Center area: Draw pile and Discard pile */}
      <div className="flex items-center gap-8 my-8">
        {/* Draw pile */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {/* Stack effect */}
            {gameState.drawPile.length > 0 && (
              <>
                <div
                  className="absolute w-20 h-28 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 shadow-md"
                  style={{ left: -3, top: -3, zIndex: 0 }}
                />
                <div
                  className="absolute w-20 h-28 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 shadow-md"
                  style={{ left: -1, top: -1, zIndex: 1 }}
                />
              </>
            )}
            {gameState.drawPile.length > 0 ? (
              <CardBack
                size="md"
                onClick={canDraw ? onDrawCard : undefined}
                className="relative z-10"
              />
            ) : (
              <EmptySlot size="md" label="Leer" />
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Layers className="w-4 h-4" />
            <span>Ziehstapel</span>
          </div>
          <div className="text-xs text-gray-500">
            {gameState.drawPile.length} Karten
          </div>
        </div>

        {/* Direction indicator */}
        <div className="flex flex-col items-center gap-1">
          {gameState.direction === 'clockwise' ? (
            <RotateCw className="w-8 h-8 text-gray-600" />
          ) : (
            <RotateCcw className="w-8 h-8 text-gray-600" />
          )}
          <span className="text-xs text-gray-500">
            {gameState.direction === 'clockwise' ? 'Uhrzeigersinn' : 'Gegen den Uhrzeigersinn'}
          </span>
        </div>

        {/* Discard pile */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {/* Show last few cards for stack effect */}
            {gameState.discardPile.length > 1 && (
              <div
                className="absolute w-20 h-28 rounded-lg bg-gray-200 shadow-sm"
                style={{
                  left: -2,
                  top: -2,
                  transform: 'rotate(-2deg)',
                  zIndex: 0,
                }}
              />
            )}
            {gameState.discardPile.length > 2 && (
              <div
                className="absolute w-20 h-28 rounded-lg bg-gray-100 shadow-sm"
                style={{
                  left: -4,
                  top: -4,
                  transform: 'rotate(-5deg)',
                  zIndex: -1,
                }}
              />
            )}
            {topCard ? (
              <PlayingCard
                card={topCard}
                size="md"
                className="relative z-10"
                animated={false}
              />
            ) : (
              <EmptySlot size="md" label="Ablage" />
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <ArrowDown className="w-4 h-4" />
            <span>Ablagestapel</span>
          </div>
          <div className="text-xs text-gray-500">
            {gameState.discardPile.length} Karten
          </div>
        </div>
      </div>

      {/* Draw button */}
      {canDraw && currentPlayerId === currentPlayer?.id && (
        <Button
          onClick={onDrawCard}
          variant="outline"
          size="lg"
          className="mt-4 bg-blue-50 hover:bg-blue-100 border-blue-200"
        >
          Karte ziehen
        </Button>
      )}

      {/* Player count indicator */}
      <div className="absolute bottom-4 right-4">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="px-3 py-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">
              {gameState.players.length} Spieler
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Current player indicator bar
interface CurrentPlayerBarProps {
  player: Player;
  isCurrentPlayer: boolean;
}

export function CurrentPlayerBar({ player, isCurrentPlayer }: CurrentPlayerBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 rounded-full shadow-md transition-all duration-300',
        isCurrentPlayer
          ? 'bg-green-500 text-white scale-105'
          : 'bg-white/80 text-gray-700'
      )}
    >
      <div
        className={cn(
          'w-3 h-3 rounded-full',
          isCurrentPlayer ? 'bg-white' : 'bg-gray-300'
        )}
      />
      <span className="font-medium">{player.name}</span>
      <span className="text-sm opacity-75">
        {player.hand.length} Karten
      </span>
    </div>
  );
}

export default GameBoard;
