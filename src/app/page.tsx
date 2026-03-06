'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSound } from '@/hooks/useSound';
import { useMusic } from '@/hooks/useMusic';
import { GameSelection, GameType } from '@/components/GameSelection';
import { ChessGame } from '@/components/chess/ChessGame';
import { GameBoard } from '@/components/GameBoard';
import { PlayerHand } from '@/components/PlayerHand';
import { SuitSelector } from '@/components/SuitSelector';
import { WinnerCelebration } from '@/components/GameActions';
import { Card as UICard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Suit, Card as CardType, GameRules, defaultRules } from '@/lib/types';
import { 
  createInitialGameState, 
  playCard as playCardLogic, 
  drawCard as drawCardLogic,
  selectSuit as selectSuitLogic,
  nextTurn as nextTurnLogic,
  getPlayableCards,
  generateId,
  getAIMove,
  getAIPreferredSuit
} from '@/lib/game-logic';
import { 
  Music, 
  Home as HomeIcon, 
  Settings, 
  Bot,
  Sparkles,
  RotateCcw,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Card themes
export type CardTheme = 'classic' | 'nature' | 'royal';

const cardThemes: Record<CardTheme, { name: string; gradient: string }> = {
  classic: { name: 'Klassisch', gradient: 'bg-gradient-to-br from-blue-600 to-blue-800' },
  nature: { name: 'Natur', gradient: 'bg-gradient-to-br from-green-500 to-emerald-700' },
  royal: { name: 'Königlich', gradient: 'bg-gradient-to-br from-amber-400 to-yellow-600' },
};

type AIDifficulty = 'easy' | 'medium' | 'hard';

export default function Home() {
  const { playSound, isMuted, toggleMute } = useSound();
  const { isMuted: musicMuted, toggleMusic } = useMusic();
  
  // Game state
  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Mau Mau state
  const [gameState, setGameState] = useState<ReturnType<typeof createInitialGameState> | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [vsAI, setVsAI] = useState(true);
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('medium');
  const [cardTheme, setCardTheme] = useState<CardTheme>('classic');

  // AI move handler
  const makeAIMove = useCallback(() => {
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== 'ai-player') return;
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const aiCard = getAIMove(currentPlayer.hand, topCard, gameState.currentSuit, gameState.rules, aiDifficulty);
    
    if (aiCard) {
      let newState = playCardLogic(gameState, currentPlayer.id, aiCard.id);
      
      // If suit selection needed, AI picks best suit
      if (newState.phase === 'suitSelection') {
        const preferredSuit = getAIPreferredSuit(currentPlayer.hand.filter(c => c.id !== aiCard.id), gameState.rules);
        newState = selectSuitLogic(newState, preferredSuit);
      }
      
      setGameState(newState);
      playSound?.('draw_card');
    } else {
      // Draw a card
      const newState = drawCardLogic(gameState, currentPlayer.id);
      setGameState(newState);
      playSound?.('draw_card');
    }
  }, [gameState, aiDifficulty, playSound]);

  // AI turn effect
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
    if (!gameState || !currentPlayer || currentPlayer.id === 'ai-player') return [];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    return getPlayableCards(currentPlayer.hand, topCard, gameState.currentSuit, gameState.rules);
  }, [gameState, currentPlayer]);

  const canDraw = playableCards.length === 0 && gameState?.phase === 'playing' && currentPlayer?.id !== 'ai-player';

  // Handle card click
  const handleCardClick = useCallback((card: CardType) => {
    if (!gameState || !currentPlayer || currentPlayer.id === 'ai-player') return;
    
    const result = playCardLogic(gameState, currentPlayer.id, card.id);
    setGameState(result);
    playSound?.('draw_card');
  }, [gameState, currentPlayer, playSound]);

  // Handle draw card
  const handleDrawCard = useCallback(() => {
    if (!gameState || !currentPlayer || currentPlayer.id === 'ai-player') return;
    const newState = drawCardLogic(gameState, currentPlayer.id);
    setGameState(newState);
    
    // Auto end turn after drawing if can't play
    if (newState.canPlayDrawnCard === false) {
      setTimeout(() => {
        setGameState(prev => prev ? nextTurnLogic(prev) : null);
      }, 500);
    }
    
    playSound?.('draw_card');
  }, [gameState, currentPlayer, playSound]);

  // Handle suit selection
  const handleSelectSuit = useCallback((suit: Suit) => {
    if (!gameState) return;
    const newState = selectSuitLogic(gameState, suit);
    setGameState(newState);
    playSound?.('choose_suit');
  }, [gameState, playSound]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    setGameState(null);
    setShowSetup(true);
  }, []);

  // Handle start game from setup
  const handleStartGame = useCallback(() => {
    const name = playerName.trim() || 'Spieler';
    const names = vsAI ? [name, 'KI'] : [name, 'Spieler 2'];
    
    const newState = createInitialGameState(names, defaultRules, 5);
    
    // Mark AI player
    if (vsAI && newState.players[1]) {
      newState.players[1].id = 'ai-player';
    }
    
    setGameState(newState);
    setShowSetup(false);
    playSound?.('game_start');
  }, [playerName, vsAI, playSound]);

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

  // Mau Mau game - Setup
  if (showSetup || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4">
        {/* Header */}
        <div className="max-w-md mx-auto mb-4">
          <Button variant="ghost" onClick={() => setSelectedGame(null)} className="gap-2 mb-4">
            <HomeIcon className="w-4 h-4" />
            Zurück
          </Button>
        </div>

        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl">🃏 Mau Mau</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Player name */}
            <div className="space-y-2">
              <Label htmlFor="playerName">Dein Name</Label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Name eingeben..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* AI opponent toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-gray-500" />
                <Label>Gegen KI spielen</Label>
              </div>
              <Switch checked={vsAI} onCheckedChange={setVsAI} />
            </div>

            {/* AI difficulty */}
            {vsAI && (
              <div className="space-y-2">
                <Label>KI-Schwierigkeit</Label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((d) => (
                    <Button
                      key={d}
                      variant={aiDifficulty === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAIDifficulty(d)}
                      className="flex-1"
                    >
                      {d === 'easy' ? 'Leicht' : d === 'medium' ? 'Mittel' : 'Schwer'}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Card theme */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Kartendesign
              </Label>
              <div className="flex gap-2">
                {(Object.keys(cardThemes) as CardTheme[]).map(theme => (
                  <Button
                    key={theme}
                    variant={cardTheme === theme ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCardTheme(theme)}
                    className={cn('flex-1', cardTheme === theme && cardThemes[theme].gradient)}
                  >
                    {cardThemes[theme].name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <Button
              onClick={handleStartGame}
              size="lg"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              Spiel starten
            </Button>
          </CardContent>
        </Card>
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
  const isPlayerTurn = currentPlayer?.id !== 'ai-player';

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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMusic}
            className={musicMuted ? 'text-gray-400' : 'text-purple-600'}
          >
            <Music className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className={isMuted ? 'text-gray-400' : 'text-blue-600'}
          >
            {isMuted ? '🔇' : '🔊'}
          </Button>
        </div>
      </div>

      {/* Opponent info */}
      {vsAI && gameState.players[1] && (
        <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="font-medium">KI</span>
            {!isPlayerTurn && (
              <Badge className="bg-amber-500 animate-pulse">Denkt nach...</Badge>
            )}
          </div>
          <Badge variant="outline">{gameState.players[1].hand.length} Karten</Badge>
        </div>
      )}

      {/* Main game area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 relative">
          <GameBoard
            gameState={gameState}
            onDrawCard={handleDrawCard}
            currentPlayerId={currentPlayer?.id || null}
            canDraw={!!canDraw && isPlayerTurn}
          />
        </div>

        {currentPlayer && isPlayerTurn && currentPlayer.hand.length > 0 && (
          <UICard className="m-4 shadow-xl bg-white/95 backdrop-blur-sm">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{currentPlayer.name}</span>
                <Badge variant="secondary">{currentPlayer.hand.length} Karten</Badge>
              </div>
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
      {gameState.phase === 'suitSelection' && gameState.pendingSuitSelection && isPlayerTurn && (
        <SuitSelector
          onSelect={handleSelectSuit}
          playedValue={'B'}
          playerName={currentPlayer?.name || ''}
        />
      )}
    </div>
  );
}
