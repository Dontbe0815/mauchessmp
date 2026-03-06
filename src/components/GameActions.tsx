'use client';

import { Player, GameRules, Announcement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Eye, 
  EyeOff,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameActionsProps {
  currentPlayer: Player;
  isCurrentPlayer: boolean;
  rules: GameRules;
  isMuted: boolean;
  onToggleMute: () => void;
  onShowHand: () => void;
  onHideHand: () => void;
  onNewGame: () => void;
  showHand: boolean;
  canEndTurn: boolean;
  onEndTurn: () => void;
  isAITurn?: boolean;
}

export function GameActions({
  currentPlayer,
  isCurrentPlayer,
  rules,
  isMuted,
  onToggleMute,
  onShowHand,
  onHideHand,
  onNewGame,
  showHand,
  canEndTurn,
  onEndTurn,
  isAITurn = false,
}: GameActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/80 backdrop-blur-sm border-b">
      {/* Left side: Player info */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Aktueller Spieler</span>
          <span className="font-semibold text-lg flex items-center gap-2">
            {currentPlayer.name}
            {isCurrentPlayer && !isAITurn && (
              <Badge variant="default" className="bg-green-500">
                Du
              </Badge>
            )}
            {isAITurn && (
              <Badge variant="secondary" className="bg-purple-500 text-white">
                KI denkt...
              </Badge>
            )}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {currentPlayer.hand.length} Karten
        </div>
      </div>

      {/* Center: Action buttons */}
      <div className="flex items-center gap-2">
        {canEndTurn && isCurrentPlayer && !isAITurn && (
          <Button
            onClick={onEndTurn}
            variant="secondary"
            className="bg-blue-100 hover:bg-blue-200 text-blue-700"
          >
            Zug beenden
          </Button>
        )}
      </div>

      {/* Right side: Controls */}
      <div className="flex items-center gap-2">
        {/* Hand visibility toggle */}
        {isCurrentPlayer && !isAITurn && (
          <Button
            onClick={showHand ? onHideHand : onShowHand}
            variant="ghost"
            size="icon"
            title={showHand ? 'Karten verbergen' : 'Karten anzeigen'}
          >
            {showHand ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </Button>
        )}

        {/* Sound toggle */}
        <Button
          onClick={onToggleMute}
          variant="ghost"
          size="icon"
          title={isMuted ? 'Ton einschalten' : 'Ton ausschalten'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-gray-400" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        {/* New game */}
        <Button
          onClick={onNewGame}
          variant="ghost"
          size="icon"
          title="Neues Spiel"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

// Announcements display
interface AnnouncementsProps {
  announcements: Announcement[];
  onRemove: (id: string) => void;
}

export function Announcements({ announcements, onRemove }: AnnouncementsProps) {
  if (announcements.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {announcements.map((announcement) => {
        const icons = {
          info: <Info className="w-5 h-5" />,
          warning: <AlertTriangle className="w-5 h-5" />,
          success: <CheckCircle className="w-5 h-5" />,
          error: <AlertCircle className="w-5 h-5" />,
        };

        const colors = {
          info: 'bg-blue-50 border-blue-200 text-blue-800',
          warning: 'bg-amber-50 border-amber-200 text-amber-800',
          success: 'bg-green-50 border-green-200 text-green-800',
          error: 'bg-red-50 border-red-200 text-red-800',
        };

        return (
          <Card
            key={announcement.id}
            className={cn(
              'animate-in slide-in-from-right duration-300 shadow-lg',
              colors[announcement.type]
            )}
          >
            <CardContent className="p-3 flex items-center gap-2">
              {icons[announcement.type]}
              <span className="flex-1 text-sm font-medium">
                {announcement.message}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onRemove(announcement.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Winner celebration component
interface WinnerCelebrationProps {
  winnerName: string;
  onNewGame: () => void;
}

export function WinnerCelebration({ winnerName, onNewGame }: WinnerCelebrationProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-white shadow-2xl animate-in zoom-in duration-500">
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Gewonnen!
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            <span className="font-semibold text-green-600">{winnerName}</span> hat das Spiel gewonnen!
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={onNewGame}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Neues Spiel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GameActions;
