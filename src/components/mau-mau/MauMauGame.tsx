'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  useMauMauGame,
  CardTheme,
  GameMode,
  getCardThemeColors,
  EnhancedGameState,
  ExtendedPlayer,
  calculatePenaltyPoints,
} from '@/hooks/useMauMauGame';
import { PlayingCard, CardBack } from '@/components/PlayingCard';
import { SuitSelector } from '@/components/SuitSelector';
import { GameRules, defaultRules, Suit, Card as GameCard, suitInfo } from '@/lib/types';
import { getPlayableCards } from '@/lib/game-logic';
import { useSound } from '@/hooks/useSound';
import { 
  Play, 
  Settings, 
  Users, 
  Clock, 
  Trophy, 
  Crown,
  Sparkles,
  Cat,
  Zap,
  RotateCcw,
  ChevronDown,
  Home,
  Swords,
  Target,
  Bot,
  Timer,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MauMauGameProps {
  onBack: () => void;
}

// Game setup component
function GameSetup({
  onStartGame,
  onBack,
}: {
  onStartGame: (players: string[], rules: GameRules, options: {
    cardTheme: CardTheme;
    gameMode: GameMode;
    timerSeconds?: number;
    tournamentRounds?: number;
    includeAI?: boolean;
  }) => void;
  onBack: () => void;
}) {
  const [players, setPlayers] = useState<string[]>(['', '']);
  const [rules, setRules] = useState<GameRules>(defaultRules);
  const [cardTheme, setCardTheme] = useState<CardTheme>('classic-blue');
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [tournamentRounds, setTournamentRounds] = useState(3);
  const [includeAI, setIncludeAI] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const addPlayer = () => {
    if (players.length < 4) setPlayers([...players, '']);
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const handleStart = () => {
    const validNames = players.map((name, i) => name.trim() || `Spieler ${i + 1}`);
    onStartGame(validNames, rules, {
      cardTheme,
      gameMode,
      timerSeconds,
      tournamentRounds,
      includeAI,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <Home className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl">🃏</span>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Mau Mau</h1>
              <p className="text-gray-500">Das deutsche Kartenspiel</p>
            </div>
          </div>
        </div>

        {/* Players */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Spieler
            </CardTitle>
            <CardDescription>2-4 Spieler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {players.map((player, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                  {index + 1}
                </Badge>
                <Input
                  placeholder={`Spieler ${index + 1}`}
                  value={player}
                  onChange={(e) => updatePlayer(index, e.target.value)}
                  className="flex-1"
                />
                {players.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removePlayer(index)}>
                    ×
                  </Button>
                )}
              </div>
            ))}
            {players.length < 4 && (
              <Button variant="outline" onClick={addPlayer} className="w-full border-dashed">
                + Spieler hinzufügen
              </Button>
            )}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Bot className="w-4 h-4 text-gray-500" />
              <Label htmlFor="ai-toggle" className="flex-1">KI-Gegner</Label>
              <Switch
                id="ai-toggle"
                checked={includeAI}
                onCheckedChange={setIncludeAI}
              />
            </div>
          </CardContent>
        </Card>

        {/* Game Mode */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Spielmodus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={gameMode === 'normal' ? 'default' : 'outline'}
                onClick={() => setGameMode('normal')}
                className="flex-col h-auto py-4"
              >
                <Play className="w-5 h-5 mb-1" />
                Normal
              </Button>
              <Button
                variant={gameMode === 'speed' ? 'default' : 'outline'}
                onClick={() => setGameMode('speed')}
                className="flex-col h-auto py-4"
              >
                <Timer className="w-5 h-5 mb-1" />
                Speed
              </Button>
              <Button
                variant={gameMode === 'tournament' ? 'default' : 'outline'}
                onClick={() => setGameMode('tournament')}
                className="flex-col h-auto py-4"
              >
                <Swords className="w-5 h-5 mb-1" />
                Turnier
              </Button>
            </div>
            {gameMode === 'speed' && (
              <div className="mt-4">
                <Label>Zeit pro Zug: {timerSeconds}s</Label>
                <Slider
                  value={[timerSeconds]}
                  onValueChange={([v]) => setTimerSeconds(v)}
                  min={15}
                  max={60}
                  step={15}
                  className="mt-2"
                />
              </div>
            )}
            {gameMode === 'tournament' && (
              <div className="mt-4">
                <Label>Runden: {tournamentRounds}</Label>
                <Slider
                  value={[tournamentRounds]}
                  onValueChange={([v]) => setTournamentRounds(v)}
                  min={3}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card Theme */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Karten-Design
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {(['classic-blue', 'nature-green', 'royal-gold'] as CardTheme[]).map((theme) => {
                const colors = getCardThemeColors(theme);
                return (
                  <Button
                    key={theme}
                    variant={cardTheme === theme ? 'default' : 'outline'}
                    onClick={() => setCardTheme(theme)}
                    className={cn(
                      'flex-col h-auto py-4',
                      cardTheme === theme && `bg-gradient-to-r ${colors.gradient}`
                    )}
                  >
                    <div className={cn('w-8 h-10 rounded bg-gradient-to-br', colors.gradient)} />
                    <span className="mt-2 text-xs">
                      {theme === 'classic-blue' ? 'Klassisch' : theme === 'nature-green' ? 'Natur' : 'Königlich'}
                    </span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Rules */}
        <Collapsible open={showRules} onOpenChange={setShowRules}>
          <Card className="shadow-lg">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Spielregeln
                  </div>
                  <ChevronDown className={cn('w-5 h-5 transition-transform', showRules && 'rotate-180')} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {Object.entries({
                  siebenRegel: { label: '7-Regel', desc: 'Nächster Spieler zieht 2 Karten' },
                  achtRegel: { label: '8-Regel', desc: 'Nächster Spieler wird übersprungen' },
                  bubeRegel: { label: 'Bube-Regel', desc: 'Wünsche eine Farbe' },
                  assRegel: { label: 'Ass-Regel', desc: 'Wünsche eine Farbe' },
                  neunRegel: { label: '9-Regel', desc: 'Richtung wechseln' },
                  mauSagen: { label: 'Mau sagen', desc: 'Bei der vorletzten Karte' },
                  mauMauSagen: { label: 'Mau Mau sagen', desc: 'Bei der letzten Karte' },
                }).map(([key, { label, desc }]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                    <Switch
                      checked={rules[key as keyof GameRules]}
                      onCheckedChange={(checked) => 
                        setRules(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Start Button */}
        <Button
          onClick={handleStart}
          size="lg"
          className="w-full h-14 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          <Play className="w-5 h-5 mr-2" />
          Spiel starten
        </Button>
      </div>
    </div>
  );
}

// Game board component
function GameBoard({
  gameState,
  onPlayCard,
  onDrawCard,
  onEndTurn,
}: {
  gameState: EnhancedGameState;
  onPlayCard: (cardId: string) => void;
  onDrawCard: () => void;
  onEndTurn: () => void;
}) {
  const themeColors = getCardThemeColors(gameState.cardTheme);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  
  const playableCards = useMemo(() => {
    if (!currentPlayer || !topCard) return [];
    return getPlayableCards(currentPlayer.hand, topCard, gameState.currentSuit, gameState.rules);
  }, [currentPlayer, topCard, gameState.currentSuit, gameState.rules]);

  const canDraw = gameState.phase === 'playing' && playableCards.length === 0;
  const canEndTurn = gameState.canPlayDrawnCard === false && gameState.lastDrawnCard !== null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
      {/* Timer */}
      {gameState.timerEnabled && (
        <div className={cn(
          'absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-mono text-xl font-bold',
          gameState.timerSeconds <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-800'
        )}>
          <Clock className="w-4 h-4 inline mr-2" />
          {gameState.timerSeconds}s
        </div>
      )}

      {/* Draw and Discard piles */}
      <div className="flex items-center gap-8 mb-8">
        {/* Draw pile */}
        <div className="flex flex-col items-center">
          <div className="relative cursor-pointer" onClick={canDraw ? onDrawCard : undefined}>
            <CardBack 
              className={cn(
                'transition-all',
                canDraw && 'hover:scale-105 hover:shadow-lg ring-2 ring-green-400'
              )}
            />
            {gameState.drawPile.length > 0 && (
              <>
                <div className={cn('absolute w-20 h-28 rounded-lg -left-1 -top-1', `bg-gradient-to-br ${themeColors.gradient}`)} />
                <div className={cn('absolute w-20 h-28 rounded-lg -left-2 -top-2 opacity-50', `bg-gradient-to-br ${themeColors.gradient}`)} />
              </>
            )}
          </div>
          <span className="text-sm text-gray-500 mt-2">{gameState.drawPile.length} Karten</span>
        </div>

        {/* Discard pile */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {topCard ? (
              <PlayingCard
                card={topCard}
                size="lg"
                animated
                className={cn(gameState.cardPlayedAnimation && 'animate-bounce')}
              />
            ) : (
              <div className="w-24 h-36 border-2 border-dashed border-gray-300 rounded-lg" />
            )}
          </div>
          {gameState.currentSuit && gameState.currentSuit !== topCard?.suit && (
            <Badge className={cn('mt-2', themeColors.bg)}>
              Gewählt: {suitInfo[gameState.currentSuit].name} {suitInfo[gameState.currentSuit].symbol}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {canDraw && (
          <Button onClick={onDrawCard} size="lg" className="bg-blue-500 hover:bg-blue-600">
            Karte ziehen
          </Button>
        )}
        {canEndTurn && (
          <Button onClick={onEndTurn} size="lg" variant="secondary">
            Zug beenden
          </Button>
        )}
      </div>

      {/* Opponents */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {gameState.players.filter((_, i) => i !== gameState.currentPlayerIndex).map((player) => (
          <Card key={player.id} className="bg-white/80 backdrop-blur-sm px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">{player.name}</div>
              <Badge variant="outline">{player.hand.length}</Badge>
              {player.isAI && <Bot className="w-3 h-3 text-gray-400" />}
            </div>
          </Card>
        ))}
      </div>

      {/* Score/Leaderboard */}
      {gameState.gameMode === 'tournament' && gameState.tournament && (
        <Card className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-2">
          <div className="text-xs text-gray-500 mb-1">
            Runde {gameState.tournament.currentRound}/{gameState.tournament.rounds}
          </div>
          <div className="space-y-1">
            {gameState.players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span>{p.name}</span>
                <Badge variant="secondary">{gameState.tournament?.scores[p.id] || 0}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// Player hand component
function PlayerHandDisplay({
  player,
  isCurrentPlayer,
  playableCardIds,
  onCardClick,
  onSayMau,
  onSayMauMau,
  rules,
}: {
  player: ExtendedPlayer;
  isCurrentPlayer: boolean;
  playableCardIds: string[];
  onCardClick: (card: GameCard) => void;
  onSayMau?: () => void;
  onSayMauMau?: () => void;
  rules: GameRules;
}) {
  const canSayMau = player.hand.length === 2 && !player.hasSaidMau && rules.mauSagen && isCurrentPlayer;
  const canSayMauMau = player.hand.length === 1 && !player.hasSaidMauMau && rules.mauMauSagen && isCurrentPlayer;

  return (
    <Card className="m-4 shadow-xl bg-white/95 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{player.name}</h3>
            {player.isAI && <Bot className="w-4 h-4 text-gray-400" />}
            {isCurrentPlayer && (
              <Badge className="bg-green-500 animate-pulse">Du bist dran!</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canSayMau && (
              <Button onClick={onSayMau} size="sm" className="bg-amber-500 animate-pulse">
                <Cat className="w-4 h-4 mr-1" />
                Mau!
              </Button>
            )}
            {canSayMauMau && (
              <Button onClick={onSayMauMau} size="sm" className="bg-amber-500 animate-pulse">
                <Sparkles className="w-4 h-4 mr-1" />
                Mau Mau!
              </Button>
            )}
            <span className="text-sm text-gray-500">{player.hand.length} Karten</span>
          </div>
        </div>
        <ScrollArea>
          <div className="flex gap-2 pb-2">
            {player.hand.map((card) => {
              const isPlayable = playableCardIds.includes(card.id) && isCurrentPlayer;
              return (
                <PlayingCard
                  key={card.id}
                  card={card}
                  size="md"
                  isPlayable={isPlayable}
                  onClick={isCurrentPlayer ? () => onCardClick(card) : undefined}
                />
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Round end dialog
function RoundEndDialog({
  winner,
  players,
  tournament,
  onNextRound,
  onNewGame,
}: {
  winner: ExtendedPlayer | null;
  players: ExtendedPlayer[];
  tournament: EnhancedGameState['tournament'];
  onNextRound: () => void;
  onNewGame: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const sortedPlayers = [...players].sort((a, b) => b.wins - a.wins);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {tournament ? `Runde ${tournament.currentRound} beendet!` : '🎉 Gewonnen!'}
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-4">
          {winner && (
            <>
              <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              <p className="text-xl font-semibold text-green-600">{winner.name} hat diese Runde gewonnen!</p>
            </>
          )}

          {/* Leaderboard */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-700 mb-2">Punktestand</h4>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className={cn(
                  'flex items-center justify-between p-2 rounded',
                  index === 0 ? 'bg-amber-100' : 'bg-gray-50'
                )}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{index + 1}.</span>
                    <span>{player.name}</span>
                  </div>
                  <Badge>{player.wins} Siege</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          {tournament && tournament.currentRound < tournament.rounds && (
            <Button onClick={() => { setIsOpen(false); onNextRound(); }} className="bg-green-600">
              Nächste Runde
            </Button>
          )}
          <Button variant="outline" onClick={() => { setIsOpen(false); onNewGame(); }}>
            Neues Spiel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main game component
export function MauMauGame({ onBack }: MauMauGameProps) {
  const { playSound } = useSound();
  const {
    gameState,
    gamePhase,
    startGame,
    playCard,
    drawCard,
    selectSuit,
    sayMau,
    sayMauMau,
    endTurn,
    startNextRound,
    resetGame,
    isTournamentOver,
    getTournamentWinner,
  } = useMauMauGame();

  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const topCard = gameState?.discardPile[gameState.discardPile.length - 1];
  
  const playableCardIds = useMemo(() => {
    if (!gameState || !currentPlayer || !topCard) return [];
    return getPlayableCards(currentPlayer.hand, topCard, gameState.currentSuit, gameState.rules).map((c: GameCard) => c.id);
  }, [gameState, currentPlayer, topCard]);

  const handlePlayCard = useCallback((cardId: string) => {
    if (!gameState || !currentPlayer) return;
    playCard(currentPlayer.id, cardId);
    playSound('draw_card');
  }, [gameState, currentPlayer, playCard, playSound]);

  const handleDrawCard = useCallback(() => {
    if (!gameState || !currentPlayer) return;
    drawCard(currentPlayer.id);
    playSound('draw_card');
  }, [gameState, currentPlayer, drawCard, playSound]);

  const handleSelectSuit = useCallback((suit: Suit) => {
    selectSuit(suit);
    playSound('choose_suit');
  }, [selectSuit, playSound]);

  // Show setup
  if (gamePhase === 'setup' || !gameState) {
    return (
      <GameSetup
        onStartGame={(players, rules, options) => startGame(players, rules, options)}
        onBack={onBack}
      />
    );
  }

  // Show suit selection
  if (gameState.phase === 'suitSelection') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 flex items-center justify-center">
        <SuitSelector
          onSelect={handleSelectSuit}
          playedValue={gameState.pendingSuitSelection?.cardId ? 'B' : 'A'}
          playerName={currentPlayer?.name || ''}
        />
      </div>
    );
  }

  // Show round end
  if (gameState.phase === 'gameOver' || gameState.roundWinner) {
    const winner = gameState.players.find(p => p.id === gameState.roundWinner);
    const tournamentWinner = isTournamentOver ? getTournamentWinner() : null;

    if (tournamentWinner) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center shadow-2xl">
            <CardContent className="p-8">
              <Crown className="w-20 h-20 mx-auto text-amber-500 mb-4" />
              <h1 className="text-3xl font-bold text-gray-800 mb-2">🏆 Turnier gewonnen!</h1>
              <p className="text-xl text-green-600 font-semibold mb-6">{tournamentWinner.name} ist der Champion!</p>
              <div className="space-y-2 mb-6">
                {gameState.players.map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{i + 1}. {p.name}</span>
                    <Badge>{p.wins} Siege</Badge>
                  </div>
                ))}
              </div>
              <Button onClick={() => { resetGame(); }} size="lg" className="w-full">
                Neues Turnier
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100">
        <RoundEndDialog
          winner={winner || null}
          players={gameState.players}
          tournament={gameState.tournament}
          onNextRound={startNextRound}
          onNewGame={resetGame}
        />
      </div>
    );
  }

  // Main game view
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b">
        <Button variant="ghost" onClick={() => { resetGame(); onBack(); }}>
          <Home className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">Mau Mau</span>
          {gameState.gameMode === 'speed' && (
            <Badge className="bg-red-500"><Zap className="w-3 h-3 mr-1" />Speed</Badge>
          )}
          {gameState.gameMode === 'tournament' && (
            <Badge className="bg-purple-500"><Swords className="w-3 h-3 mr-1" />Turnier</Badge>
          )}
        </div>
        <Button variant="ghost" onClick={resetGame}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Neues Spiel
        </Button>
      </div>

      {/* Game board */}
      <GameBoard
        gameState={gameState}
        onPlayCard={handlePlayCard}
        onDrawCard={handleDrawCard}
        onEndTurn={endTurn}
      />

      {/* Player hand */}
      {currentPlayer && (
        <PlayerHandDisplay
          player={currentPlayer}
          isCurrentPlayer={true}
          playableCardIds={playableCardIds}
          onCardClick={(card) => handlePlayCard(card.id)}
          onSayMau={() => { sayMau(currentPlayer.id); playSound('mau_mau'); }}
          onSayMauMau={() => { sayMauMau(currentPlayer.id); playSound('mau_mau'); }}
          rules={gameState.rules}
        />
      )}
    </div>
  );
}

export default MauMauGame;
