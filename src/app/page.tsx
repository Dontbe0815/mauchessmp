'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSound, soundMap, SoundName } from '@/hooks/useSound';
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
  getAIMove,
  getAIPreferredSuit
} from '@/lib/game-logic';
import { 
  Music, 
  Home as HomeIcon, 
  Bot,
  Sparkles,
  Users,
  Globe,
  Monitor
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
type GameMode = 'ai' | 'local' | 'online';

export default function Home() {
  const { playSound, isMuted, toggleMute } = useSound();
  const { isMuted: musicMuted, toggleMusic } = useMusic();
  
  // Game state
  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  
  // Mau Mau state
  const [gameState, setGameState] = useState<ReturnType<typeof createInitialGameState> | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('medium');
  const [cardTheme, setCardTheme] = useState<CardTheme>('classic');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Play sound with mapping
  const playMappedSound = useCallback((name: string) => {
    const mappedName = soundMap[name] || 'card_play';
    playSound(mappedName as SoundName);
  }, [playSound]);

  // AI move handler
  const makeAIMove = useCallback(() => {
    if (!gameState) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== 'ai-player') return;
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const aiCard = getAIMove(currentPlayer.hand, topCard, gameState.currentSuit, gameState.rules, aiDifficulty);
    
    if (aiCard) {
      let newState = playCardLogic(gameState, currentPlayer.id, aiCard.id);
      
      if (newState.phase === 'suitSelection') {
        const preferredSuit = getAIPreferredSuit(currentPlayer.hand.filter(c => c.id !== aiCard.id), gameState.rules);
        newState = selectSuitLogic(newState, preferredSuit);
      }
      
      setGameState(newState);
      playMappedSound('draw_card');
    } else {
      const newState = drawCardLogic(gameState, currentPlayer.id);
      setGameState(newState);
      playMappedSound('draw_card');
    }
  }, [gameState, aiDifficulty, playMappedSound]);

  // AI turn effect
  useEffect(() => {
    if (gameMode !== 'ai' || !gameState || gameState.phase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id === 'ai-player') {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.currentPlayerIndex, gameMode, gameState?.phase, makeAIMove]);

  // Get current player info
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isPlayerTurn = gameMode === 'ai' ? currentPlayer?.id !== 'ai-player' : true;
  
  const playableCards = useMemo(() => {
    if (!gameState || !currentPlayer) return [];
    if (gameMode === 'ai' && currentPlayer.id === 'ai-player') return [];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    return getPlayableCards(currentPlayer.hand, topCard, gameState.currentSuit, gameState.rules);
  }, [gameState, currentPlayer, gameMode]);

  const canDraw = playableCards.length === 0 && gameState?.phase === 'playing' && isPlayerTurn;

  // Handle card click
  const handleCardClick = useCallback((card: CardType) => {
    if (!gameState || !currentPlayer || !isPlayerTurn) return;
    
    const result = playCardLogic(gameState, currentPlayer.id, card.id);
    setGameState(result);
    playMappedSound('draw_card');
  }, [gameState, currentPlayer, isPlayerTurn, playMappedSound]);

  // Handle draw card
  const handleDrawCard = useCallback(() => {
    if (!gameState || !currentPlayer || !isPlayerTurn) return;
    const newState = drawCardLogic(gameState, currentPlayer.id);
    setGameState(newState);
    
    if (newState.canPlayDrawnCard === false) {
      setTimeout(() => {
        setGameState(prev => prev ? nextTurnLogic(prev) : null);
      }, 500);
    }
    
    playMappedSound('draw_card');
  }, [gameState, currentPlayer, isPlayerTurn, playMappedSound]);

  // Handle suit selection
  const handleSelectSuit = useCallback((suit: Suit) => {
    if (!gameState) return;
    const newState = selectSuitLogic(gameState, suit);
    setGameState(newState);
    playMappedSound('choose_suit');
  }, [gameState, playMappedSound]);

  // Handle new game
  const handleNewGame = useCallback(() => {
    setGameState(null);
    setShowSetup(true);
  }, []);

  // Handle start game
  const handleStartGame = useCallback(() => {
    const name1 = playerName.trim() || 'Spieler 1';
    
    let names: string[];
    if (gameMode === 'ai') {
      names = [name1, 'KI'];
    } else if (gameMode === 'local') {
      const name2 = player2Name.trim() || 'Spieler 2';
      names = [name1, name2];
    } else {
      // Online mode - will be handled separately
      names = [name1, 'Gegner'];
    }
    
    const newState = createInitialGameState(names, defaultRules, 5);
    
    if (gameMode === 'ai' && newState.players[1]) {
      newState.players[1].id = 'ai-player';
    }
    
    setGameState(newState);
    setShowSetup(false);
    playMappedSound('game_start');
  }, [playerName, player2Name, gameMode, playMappedSound]);

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
    return <ChessGame onBack={() => setSelectedGame(null)} playSound={playMappedSound} />;
  }

  // Mau Mau setup
  if (showSetup || !gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4">
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
            {/* Game mode selection */}
            <div className="space-y-2">
              <Label>Spielmodus</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={gameMode === 'ai' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGameMode('ai')}
                  className="flex-col h-auto py-2"
                >
                  <Bot className="w-4 h-4 mb-1" />
                  <span className="text-xs">Gegen KI</span>
                </Button>
                <Button
                  variant={gameMode === 'local' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGameMode('local')}
                  className="flex-col h-auto py-2"
                >
                  <Monitor className="w-4 h-4 mb-1" />
                  <span className="text-xs">Lokal</span>
                </Button>
                <Button
                  variant={gameMode === 'online' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGameMode('online')}
                  className="flex-col h-auto py-2"
                >
                  <Globe className="w-4 h-4 mb-1" />
                  <span className="text-xs">Online</span>
                </Button>
              </div>
            </div>

            {/* Player names */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="player1">Spieler 1</Label>
                <input
                  id="player1"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Dein Name..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              {gameMode === 'local' && (
                <div className="space-y-2">
                  <Label htmlFor="player2">Spieler 2</Label>
                  <input
                    id="player2"
                    type="text"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    placeholder="Name des Gegners..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}
            </div>

            {/* AI difficulty */}
            {gameMode === 'ai' && (
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

            {/* Online room */}
            {gameMode === 'online' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsJoining(false)}
                    variant={!isJoining ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    Raum erstellen
                  </Button>
                  <Button
                    onClick={() => setIsJoining(true)}
                    variant={isJoining ? 'default' : 'outline'}
                    className="flex-1"
                  >
                    Raum beitreten
                  </Button>
                </div>
                
                {isJoining && (
                  <div className="space-y-2">
                    <Label>Raum-Code</Label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="XXXX"
                      maxLength={4}
                      className="w-full px-3 py-2 border rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
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
              {gameMode === 'online' 
                ? (isJoining ? 'Raum beitreten' : 'Raum erstellen')
                : 'Spiel starten'}
            </Button>

            {/* Player count info */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>
                {gameMode === 'ai' && '1 Spieler gegen KI'}
                {gameMode === 'local' && '2 Spieler am selben Gerät'}
                {gameMode === 'online' && '2 Spieler online'}
              </span>
            </div>
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
          {gameMode === 'ai' && <Badge variant="secondary">vs KI</Badge>}
          {gameMode === 'local' && <Badge variant="secondary">Lokal</Badge>}
          {gameMode === 'online' && <Badge variant="secondary">Online</Badge>}
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

      {/* Opponent info for AI mode */}
      {gameMode === 'ai' && gameState.players[1] && (
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

      {/* Player info for local mode */}
      {gameMode === 'local' && gameState.players[1] && (
        <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="font-medium">{gameState.players[1].name}</span>
            {!isPlayerTurn && (
              <Badge className="bg-green-500">Am Zug</Badge>
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
