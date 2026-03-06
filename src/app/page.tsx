'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSound } from '@/hooks/useSound';
import { useMusic } from '@/hooks/useMusic';
import { GameSelection, GameType } from '@/components/GameSelection';
import { ChessGame } from '@/components/chess/ChessGame';
import { useGameState } from '@/hooks/useGameState';
import { GameSetup } from '@/components/GameSetup';
import { GameBoard } from '@/components/GameBoard';
import { PlayerHand } from '@/components/PlayerHand';
import { SuitSelector } from '@/components/SuitSelector';
import { 
  GameActions, 
  Announcements, 
  WinnerCelebration,
  TurnTransition 
} from '@/components/GameActions';
import { Card as UICard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Suit, Card as CardType, GameRules, defaultRules, Player } from '@/lib/types';
import { 
  createInitialGameState, 
  playCard as playCardLogic, 
  drawCard as drawCardLogic,
  selectSuit as selectSuitLogic,
  nextTurn as nextTurnLogic,
  canPlayCard,
  getPlayableCards,
  generateId
} from '@/lib/game-logic';
import { 
  Music, 
  Home as HomeIcon, 
  Settings, 
  Timer, 
  Trophy, 
  Users,
  Bot,
  Sparkles,
  RotateCcw,
  Crown,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Score tracking interface
interface GameScore {
  playerName: string;
  wins: number;
  gamesPlayed: number;
}

// Card themes
export type CardTheme = 'classic' | 'nature' | 'royal';

const cardThemes: Record<CardTheme, { name: string; color: string; gradient: string }> = {
  classic: { name: 'Klassisch', color: 'from-blue-600 to-blue-800', gradient: 'bg-gradient-to-br from-blue-600 to-blue-800' },
  nature: { name: 'Natur', color: 'from-green-500 to-emerald-700', gradient: 'bg-gradient-to-br from-green-500 to-emerald-700' },
  royal: { name: 'Königlich', color: 'from-amber-400 to-yellow-600', gradient: 'bg-gradient-to-br from-amber-400 to-yellow-600' },
};

export default function Home() {
  const { playSound, isMuted, toggleMute } = useSound();
  const { isMuted: musicMuted, toggleMusic } = useMusic();
  
  // Game state
  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Mau Mau enhanced state
  const [gameState, setGameState] = useState<ReturnType<typeof createInitialGameState> | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [turnTransitionDismissed, setTurnTransitionDismissed] = useState(false);
  
  // Enhanced features
  const [scores, setScores] = useState<GameScore[]>([]);
  const [useTimer, setUseTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [cardTheme, setCardTheme] = useState<CardTheme>('classic');
  const [vsAI, setVsAI] = useState(false);
  const [tournamentMode, setTournamentMode] = useState(false);
  const [tournamentRounds, setTournamentRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [speedMode, setSpeedMode] = useState(false);

  // Define callbacks BEFORE they are used in effects
  const handleTimeout = useCallback(() => {
    if (!gameState) return;
    
    // Auto-draw card
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const newState = drawCardLogic(gameState, currentPlayer.id);
    const nextTurn = nextTurnLogic(newState);
    setGameState(nextTurn);
    playSound?.('invalid');
  }, [gameState, playSound]);

  const makeAIMove = useCallback(() => {
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const playableCards = getPlayableCards(currentPlayer.hand, topCard, gameState.currentSuit, gameState.rules);
    
    if (playableCards.length > 0) {
      // Play a random playable card
      const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
      let newState = playCardLogic(gameState, currentPlayer.id, cardToPlay.id);
      
      // If suit selection needed, pick random suit
      if (newState.phase === 'suitSelection') {
        const suits: Suit[] = ['herz', 'karo', 'kreuz', 'pik'];
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        newState = selectSuitLogic(newState, randomSuit);
      }
      
      setGameState(newState);
      playSound?.('draw_card');
    } else {
      // Draw a card
      const newState = drawCardLogic(gameState, currentPlayer.id);
      setGameState(newState);
      playSound?.('draw_card');
    }
  }, [gameState, playSound]);

  // Timer effect
  useEffect(() => {
    if (!useTimer || !gameState || gameState.phase !== 'playing' || turnTransitionDismissed) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - draw a card and end turn
          handleTimeout();
          return timerSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [useTimer, gameState?.phase, turnTransitionDismissed, timerSeconds, handleTimeout]);

  // Reset timer when turn changes
  useEffect(() => {
    if (gameState) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(timerSeconds);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTurnTransitionDismissed(false);
    }
  }, [gameState?.currentPlayerIndex, timerSeconds]);

  // AI turn
  useEffect(() => {
    if (!vsAI || !gameState || gameState.phase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id === 'ai-player') {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.currentPlayerIndex, vsAI, gameState?.phase, makeAIMove]);

  // Get current player info
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const playableCards = useMemo(() => {
    if (!gameState || !currentPlayer) return [];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    return getPlayableCards(currentPlayer.hand, topCard, gameState.currentSuit, gameState.rules);
  }, [gameState, currentPlayer]);

  const canDraw = playableCards.length === 0 && gameState?.phase === 'playing';
  const canEndTurn = gameState?.canPlayDrawnCard === false;

  // Handle card click
  const handleCardClick = useCallback((card: CardType) => {
    if (!gameState || !currentPlayer) return;
    
    const result = playCardLogic(gameState, currentPlayer.id, card.id);
    setGameState(result);
    
    if (result.phase !== gameState.phase) {
      playSound?.('draw_card');
    }
  }, [gameState, currentPlayer, playSound]);

  // Handle draw card
  const handleDrawCard = useCallback(() => {
    if (!gameState || !currentPlayer) return;
    const newState = drawCardLogic(gameState, currentPlayer.id);
    setGameState(newState);
    playSound?.('draw_card');
  }, [gameState, currentPlayer, playSound]);

  // Handle suit selection
  const handleSelectSuit = useCallback((suit: Suit) => {
    if (!gameState) return;
    const newState = selectSuitLogic(gameState, suit);
    setGameState(newState);
    playSound?.('choose_suit');
  }, [gameState, playSound]);

  // Handle end turn
  const handleEndTurn = useCallback(() => {
    if (!gameState) return;
    const newState = nextTurnLogic(gameState);
    setGameState(newState);
  }, [gameState]);

  // Handle ready from turn transition
  const handleReady = useCallback(() => {
    setTurnTransitionDismissed(true);
    setTimeLeft(timerSeconds);
  }, [timerSeconds]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    setGameState(null);
    setShowSetup(true);
    setCurrentRound(1);
    setTimeLeft(timerSeconds);
  }, [timerSeconds]);

  // Handle start game from setup
  const handleStartGame = useCallback((playerNames: string[], rules: GameRules, initialCards: number) => {
    // Add AI player if vs AI mode
    const names = vsAI ? [...playerNames.slice(0, -1), 'KI'] : playerNames;
    
    const newState = createInitialGameState(names, rules, initialCards);
    
    // Mark AI player
    if (vsAI && newState.players[newState.players.length - 1]) {
      newState.players[newState.players.length - 1].id = 'ai-player';
    }
    
    setGameState(newState);
    setShowSetup(false);
    playSound?.('game_start');
  }, [vsAI, playSound]);

  // Handle winner
  const handleWinner = useCallback((winner: Player) => {
    // Update scores
    setScores(prev => {
      const existing = prev.find(s => s.playerName === winner.name);
      if (existing) {
        return prev.map(s => 
          s.playerName === winner.name 
            ? { ...s, wins: s.wins + 1, gamesPlayed: s.gamesPlayed + 1 }
            : { ...s, gamesPlayed: s.gamesPlayed + 1 }
        );
      }
      return [...prev, { playerName: winner.name, wins: 1, gamesPlayed: 1 }];
    });
    
    // Tournament mode
    if (tournamentMode && currentRound < tournamentRounds) {
      setCurrentRound(prev => prev + 1);
    }
  }, [tournamentMode, currentRound, tournamentRounds]);

  // Game selection screen
  if (!selectedGame) {
    return (
      <GameSelection 
        onSelectGame={setSelectedGame}
        musicMuted={musicMuted}
        onToggleMusic={toggleMusic}
      />
    );
  }

  // Chess game
  if (selectedGame === 'chess') {
    return <ChessGame onBack={() => setSelectedGame(null)} playSound={playSound} />;
  }

  // Mau Mau game
  // Show setup
  if (showSetup || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto mb-4">
          <Button variant="ghost" onClick={() => setSelectedGame(null)} className="gap-2 mb-4">
            <HomeIcon className="w-4 h-4" />
            Zurück
          </Button>
        </div>

        {/* Scoreboard */}
        {scores.length > 0 && (
          <div className="max-w-2xl mx-auto mb-6">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Punktestand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {scores.map((score, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant={score.wins > 0 ? 'default' : 'outline'}>
                        {score.playerName}
                      </Badge>
                      <span className="font-medium">{score.wins} Siege</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings */}
        <div className="max-w-2xl mx-auto mb-6">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Spieloptionen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="timer">Timer</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="timer"
                    checked={useTimer}
                    onCheckedChange={setUseTimer}
                  />
                  {useTimer && (
                    <div className="flex gap-1">
                      {[15, 30, 60].map(s => (
                        <Button
                          key={s}
                          variant={timerSeconds === s ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTimerSeconds(s)}
                        >
                          {s}s
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI opponent */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="ai">Gegen KI spielen</Label>
                </div>
                <Switch
                  id="ai"
                  checked={vsAI}
                  onCheckedChange={setVsAI}
                />
              </div>

              {/* Card theme */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-500" />
                  <Label>Kartendesign</Label>
                </div>
                <div className="flex gap-2">
                  {(Object.keys(cardThemes) as CardTheme[]).map(theme => (
                    <Button
                      key={theme}
                      variant={cardTheme === theme ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCardTheme(theme)}
                      className={cn(cardTheme === theme && cardThemes[theme].gradient)}
                    >
                      {cardThemes[theme].name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tournament mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="tournament">Turniermodus</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="tournament"
                    checked={tournamentMode}
                    onCheckedChange={setTournamentMode}
                  />
                  {tournamentMode && (
                    <div className="flex gap-1">
                      {[3, 5, 7].map(r => (
                        <Button
                          key={r}
                          variant={tournamentRounds === r ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTournamentRounds(r)}
                        >
                          {r} Runden
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <GameSetup onStartGame={handleStartGame} />
      </div>
    );
  }

  // Show winner
  if (gameState.phase === 'gameOver' && gameState.winner) {
    return (
      <WinnerCelebration
        winnerName={gameState.winner.name}
        onNewGame={handleNewGame}
      />
    );
  }

  // Main game UI
  const showTurnTransition = gameState.phase === 'playing' && !turnTransitionDismissed;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedGame(null)}>
            <HomeIcon className="w-4 h-4 mr-1" />
            Menü
          </Button>
          <Badge variant="outline">Mau Mau</Badge>
          {tournamentMode && (
            <Badge variant="secondary">
              Runde {currentRound}/{tournamentRounds}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {useTimer && (
            <div className={cn(
              'px-3 py-1 rounded-full font-mono text-sm',
              timeLeft <= 10 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100'
            )}>
              <Timer className="w-3 h-3 inline mr-1" />
              {timeLeft}s
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMusic}
            className={musicMuted ? 'text-gray-400' : 'text-purple-600'}
          >
            <Music className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Game actions bar */}
      {currentPlayer && (
        <GameActions
          currentPlayer={currentPlayer}
          isCurrentPlayer={true}
          rules={gameState.rules}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onSayMau={() => {}}
          onSayMauMau={() => {}}
          onShowHand={() => {}}
          onHideHand={() => {}}
          onNewGame={handleNewGame}
          showHand={true}
          canEndTurn={canEndTurn || false}
          onEndTurn={handleEndTurn}
        />
      )}

      {/* Main game area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          <GameBoard
            gameState={gameState}
            onDrawCard={handleDrawCard}
            currentPlayerId={currentPlayer?.id || null}
            canDraw={!!canDraw}
          />
        </div>

        {currentPlayer && currentPlayer.hand.length > 0 && (
          <UICard className="m-4 shadow-xl bg-white/95 backdrop-blur-sm">
            <div className="p-4">
              <PlayerHand
                player={currentPlayer}
                isCurrentPlayer={true}
                onCardClick={handleCardClick}
                playableCardIds={playableCards.map(c => c.id)}
                showCards={true}
              />
            </div>
          </UICard>
        )}
      </div>

      {/* Suit selector */}
      {gameState.phase === 'suitSelection' && gameState.pendingSuitSelection && (
        <SuitSelector
          onSelect={handleSelectSuit}
          playedValue={'B'}
          playerName={currentPlayer?.name || ''}
        />
      )}

      {/* Turn transition */}
      {showTurnTransition && currentPlayer && (
        <TurnTransition
          playerName={currentPlayer.name}
          onReady={handleReady}
        />
      )}

      {/* Announcements */}
      <Announcements
        announcements={gameState.announcements}
        onRemove={() => {}}
      />
    </div>
  );
}
