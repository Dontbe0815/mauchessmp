'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MusicToggle } from './MusicToggle';
import { 
  Sparkles, 
  Crown, 
  Users, 
  Clock, 
  Brain,
  Swords,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type GameType = 'mau-mau' | 'chess' | null;

interface GameSelectionProps {
  onSelectGame: (game: GameType) => void;
  musicMuted: boolean;
  onToggleMusic: () => void;
}

export function GameSelection({ onSelectGame, musicMuted, onToggleMusic }: GameSelectionProps) {
  const games = [
    {
      id: 'mau-mau' as const,
      name: 'Mau Mau',
      description: 'Das klassische deutsche Kartenspiel mit Sonderregeln',
      icon: <Sparkles className="w-12 h-12" />,
      players: '2-4 Spieler',
      features: ['Sonderkarten', 'Mau-Regeln', 'Turniermodus', 'KI-Gegner'],
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:shadow-green-200',
    },
    {
      id: 'chess' as const,
      name: 'Schach',
      description: 'Das königliche Strategiespiel für zwei Spieler',
      icon: <Crown className="w-12 h-12" />,
      players: '2 Spieler',
      features: ['Alle Regeln', 'En Passant', 'Rochade', 'Umwandlung'],
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50',
      hoverColor: 'hover:shadow-amber-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Spieleck
          </span>
        </div>
        <MusicToggle isMuted={musicMuted} onToggle={onToggleMusic} variant="button" />
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Wähle dein Spiel
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Spiele klassische Brett- und Kartenspiele mit Freunden. 
            Lokal am selben Gerät oder gegen die KI.
          </p>
        </div>

        {/* Game Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {games.map((game) => (
            <Card
              key={game.id}
              className={cn(
                'cursor-pointer transition-all duration-300 overflow-hidden group',
                'hover:scale-[1.02] hover:shadow-xl',
                game.hoverColor,
                'border-2 border-transparent hover:border-opacity-50'
              )}
              onClick={() => onSelectGame(game.id)}
            >
              <div className={cn('h-2 bg-gradient-to-r', game.color)} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    'p-3 rounded-xl',
                    game.bgColor
                  )}>
                    <div className={cn('text-gray-700', game.id === 'chess' && 'text-amber-700')}>
                      {game.icon}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-2xl mb-2">{game.name}</CardTitle>
                <CardDescription className="text-base mb-4">
                  {game.description}
                </CardDescription>
                
                {/* Players Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{game.players}</span>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  {game.features.map((feature) => (
                    <Badge 
                      key={feature} 
                      variant="secondary"
                      className="text-xs"
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-100">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">
                Spiele gegen Freunde oder die KI
              </h3>
              <p className="text-gray-600 text-sm">
                Alle Spiele können im lokalen Mehrspielermodus gespielt werden. 
                Für Mau Mau steht auch ein KI-Gegner zur Verfügung. 
                Schalte den Timer ein für ein schnelleres Spielerlebnis!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t px-4 py-3 text-center">
        <p className="text-sm text-gray-500">
          Spieleck • Lokale Mehrspielerspiele • Made with ❤️
        </p>
      </div>
    </div>
  );
}

export default GameSelection;
