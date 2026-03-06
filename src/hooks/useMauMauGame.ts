'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  GameState,
  Player,
  Card,
  GameRules,
  Suit,
  suitInfo,
} from '@/lib/types';
import {
  createInitialGameState,
  playCard as gamePlayCard,
  drawCard as gameDrawCard,
  selectSuit as gameSelectSuit,
  sayMau,
  sayMauMau,
  nextTurn,
  getPlayableCards,
  generateId,
  shuffleDeck,
  createDeck,
} from '@/lib/game-logic';

// Extended player with score tracking
export interface ExtendedPlayer extends Player {
  score: number;
  wins: number;
  isAI?: boolean;
}

// Card theme type
export type CardTheme = 'classic-blue' | 'nature-green' | 'royal-gold';

// Game mode
export type GameMode = 'normal' | 'speed' | 'tournament';

// Tournament state
export interface TournamentState {
  rounds: number;
  currentRound: number;
  scores: Record<string, number>;
  targetScore: number;
}

// Extended game state with new features
export interface EnhancedGameState extends GameState {
  players: ExtendedPlayer[];
  timerSeconds: number;
  timerEnabled: boolean;
  cardTheme: CardTheme;
  gameMode: GameMode;
  tournament: TournamentState | null;
  roundWinner: string | null;
  dealingAnimation: boolean;
  cardPlayedAnimation: {
    cardId: string;
    fromPlayer: string;
    toDiscardPile: boolean;
  } | null;
}

// Timer durations for each mode
const TIMER_DURATIONS: Record<GameMode, number> = {
  speed: 30,
  normal: 0,
  tournament: 0,
};

// Get card theme colors
export function getCardThemeColors(theme: CardTheme) {
  const themes = {
    'classic-blue': {
      primary: '#1e40af',
      secondary: '#3b82f6',
      gradient: 'from-blue-600 to-blue-900',
      border: 'border-blue-400',
      bg: 'bg-blue-500',
    },
    'nature-green': {
      primary: '#166534',
      secondary: '#22c55e',
      gradient: 'from-green-600 to-green-900',
      border: 'border-green-400',
      bg: 'bg-green-500',
    },
    'royal-gold': {
      primary: '#92400e',
      secondary: '#f59e0b',
      gradient: 'from-amber-500 to-amber-800',
      border: 'border-amber-400',
      bg: 'bg-amber-500',
    },
  };
  return themes[theme];
}

// Calculate penalty points for remaining cards
export function calculatePenaltyPoints(hand: Card[]): number {
  const valuePoints: Record<string, number> = {
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'B': 2,
    'D': 3,
    'K': 4,
    'A': 11,
  };
  return hand.reduce((sum, card) => sum + (valuePoints[card.value] || 0), 0);
}

// AI decision making
export function getAIMove(
  gameState: EnhancedGameState,
  playerId: string
): { action: 'play' | 'draw' | 'mau' | 'mauMau'; cardId?: string; suit?: Suit } | null {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player || player.hand.length === 0) return null;

  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  const playableCards = getPlayableCards(
    player.hand,
    topCard,
    gameState.currentSuit,
    gameState.rules
  );

  // Say Mau or Mau Mau if needed
  if (player.hand.length === 2 && !player.hasSaidMau && gameState.rules.mauSagen) {
    return { action: 'mau' };
  }
  if (player.hand.length === 1 && !player.hasSaidMauMau && gameState.rules.mauMauSagen) {
    return { action: 'mauMau' };
  }

  // Play a card if possible
  if (playableCards.length > 0) {
    // Prioritize special cards
    const specialCards = playableCards.filter(c => 
      ['7', '8', 'B', 'A'].includes(c.value)
    );
    
    const cardToPlay = specialCards.length > 0 
      ? specialCards[Math.floor(Math.random() * specialCards.length)]
      : playableCards[Math.floor(Math.random() * playableCards.length)];

    // If Jack or Ace, choose a suit (most common in hand)
    if (cardToPlay.value === 'B' || cardToPlay.value === 'A') {
      const suitCounts: Record<Suit, number> = {
        herz: 0, karo: 0, kreuz: 0, pik: 0
      };
      player.hand.forEach(c => {
        if (c.id !== cardToPlay.id) {
          suitCounts[c.suit]++;
        }
      });
      const bestSuit = Object.entries(suitCounts)
        .sort((a, b) => b[1] - a[1])[0][0] as Suit;
      return { action: 'play', cardId: cardToPlay.id, suit: bestSuit };
    }

    return { action: 'play', cardId: cardToPlay.id };
  }

  // Draw a card
  return { action: 'draw' };
}

// Main hook for Mau Mau game
export function useMauMauGame() {
  const [gameState, setGameState] = useState<EnhancedGameState | null>(null);
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'roundEnd' | 'gameOver'>('setup');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing' || !gameState.timerEnabled) return;
    if (gameState.gameMode !== 'speed') return;

    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.timerSeconds <= 0) {
          // Time's up - auto draw
          if (timerRef.current) clearInterval(timerRef.current);
          
          const currentPlayer = prev?.players[prev.currentPlayerIndex];
          if (currentPlayer && prev) {
            // Force draw and end turn
            const newState = gameDrawCard(prev, currentPlayer.id);
            return {
              ...nextTurn(newState),
              timerSeconds: TIMER_DURATIONS[prev.gameMode],
            };
          }
          return prev;
        }
        return { ...prev, timerSeconds: prev.timerSeconds - 1 };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.phase, gameState?.timerEnabled, gameState?.gameMode]);

  // Start a new game
  const startGame = useCallback((
    playerNames: string[],
    rules: GameRules,
    options: {
      cardTheme: CardTheme;
      gameMode: GameMode;
      timerSeconds?: number;
      tournamentRounds?: number;
      includeAI?: boolean;
    }
  ) => {
    const { cardTheme, gameMode, timerSeconds = 30, tournamentRounds = 3, includeAI = false } = options;
    
    // Create players with scores
    const extendedPlayers: ExtendedPlayer[] = playerNames.map((name, index) => ({
      id: generateId(),
      name: name || `Spieler ${index + 1}`,
      hand: [],
      hasSaidMau: false,
      hasSaidMauMau: false,
      mustDraw: 0,
      isSkipped: false,
      score: 0,
      wins: 0,
      isAI: includeAI && index > 0,
    }));

    // Create initial game state
    const baseState = createInitialGameState(
      playerNames,
      rules,
      5
    );

    // Map to extended players with hands dealt
    const playersWithHands = extendedPlayers.map((player, index) => ({
      ...player,
      hand: baseState.players[index].hand,
    }));

    const newGameState: EnhancedGameState = {
      ...baseState,
      players: playersWithHands,
      timerEnabled: gameMode === 'speed',
      timerSeconds: gameMode === 'speed' ? timerSeconds : 0,
      cardTheme,
      gameMode,
      tournament: gameMode === 'tournament' ? {
        rounds: tournamentRounds,
        currentRound: 1,
        scores: {},
        targetScore: 100,
      } : null,
      roundWinner: null,
      dealingAnimation: true,
      cardPlayedAnimation: null,
    };

    setGameState(newGameState);
    setGamePhase('playing');

    // End dealing animation
    setTimeout(() => {
      setGameState(prev => prev ? { ...prev, dealingAnimation: false } : null);
    }, 1000);
  }, []);

  // Play a card
  const playCardAction = useCallback((playerId: string, cardId: string) => {
    if (!gameState) return;

    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex !== gameState.currentPlayerIndex) return;

    const player = gameState.players[playerIndex];
    const card = player.hand.find(c => c.id === cardId);
    if (!card) return;

    // Set animation
    setGameState(prev => prev ? {
      ...prev,
      cardPlayedAnimation: {
        cardId,
        fromPlayer: playerId,
        toDiscardPile: true,
      },
    } : null);

    setTimeout(() => {
      setGameState(prev => {
        if (!prev) return null;
        
        const newState = gamePlayCard(prev, playerId, cardId);
        
        if (newState.phase === 'gameOver') {
          // Round ended
          const winner = newState.winner;
          const updatedPlayers = newState.players.map(p => ({
            ...p,
            score: p.id === winner?.id ? p.score + 1 : p.score,
            wins: p.id === winner?.id ? p.wins + 1 : p.wins,
          }));

          return {
            ...newState,
            players: updatedPlayers,
            roundWinner: winner?.id || null,
            cardPlayedAnimation: null,
          };
        }

        return {
          ...newState,
          timerSeconds: prev.timerEnabled ? TIMER_DURATIONS[prev.gameMode] : 0,
          cardPlayedAnimation: null,
        };
      });
    }, 300);
  }, [gameState]);

  // Draw a card
  const drawCardAction = useCallback((playerId: string) => {
    if (!gameState) return;

    setGameState(prev => {
      if (!prev) return null;
      const newState = gameDrawCard(prev, playerId);
      return {
        ...newState,
        timerSeconds: prev.timerEnabled ? TIMER_DURATIONS[prev.gameMode] : 0,
      };
    });
  }, [gameState]);

  // Select a suit
  const selectSuitAction = useCallback((suit: Suit) => {
    if (!gameState) return;

    setGameState(prev => {
      if (!prev) return null;
      const newState = gameSelectSuit(prev, suit);
      return {
        ...newState,
        timerSeconds: prev.timerEnabled ? TIMER_DURATIONS[prev.gameMode] : 0,
      };
    });
  }, [gameState]);

  // Say Mau
  const sayMauAction = useCallback((playerId: string) => {
    if (!gameState) return;
    setGameState(prev => prev ? sayMau(prev, playerId) : null);
  }, [gameState]);

  // Say Mau Mau
  const sayMauMauAction = useCallback((playerId: string) => {
    if (!gameState) return;
    setGameState(prev => prev ? sayMauMau(prev, playerId) : null);
  }, [gameState]);

  // End turn
  const endTurnAction = useCallback(() => {
    if (!gameState) return;
    setGameState(prev => {
      if (!prev) return null;
      const newState = nextTurn(prev);
      return {
        ...newState,
        timerSeconds: prev.timerEnabled ? TIMER_DURATIONS[prev.gameMode] : 0,
      };
    });
  }, [gameState]);

  // Start next round (for tournament or when game ends)
  const startNextRound = useCallback(() => {
    if (!gameState) return;

    const deck = shuffleDeck(createDeck());
    const cardsPerPlayer = 5;
    const hands: Card[][] = [];
    let remainingDeck = [...deck];

    for (let i = 0; i < gameState.players.length; i++) {
      hands.push(remainingDeck.splice(0, cardsPerPlayer));
    }

    // Find a starting card
    const startCard = remainingDeck.find(c => !['7', '8', '9', 'B', 'A'].includes(c.value)) || remainingDeck[0];
    remainingDeck = remainingDeck.filter(c => c.id !== startCard.id);

    const newPlayers = gameState.players.map((p, i) => ({
      ...p,
      hand: hands[i],
      hasSaidMau: false,
      hasSaidMauMau: false,
      mustDraw: 0,
      isSkipped: false,
    }));

    // Update tournament scores
    let newTournament = gameState.tournament;
    if (gameState.tournament && gameState.roundWinner) {
      newTournament = {
        ...gameState.tournament,
        currentRound: gameState.tournament.currentRound + 1,
        scores: {
          ...gameState.tournament.scores,
          [gameState.roundWinner]: (gameState.tournament.scores[gameState.roundWinner] || 0) + 1,
        },
      };
    }

    setGameState({
      ...gameState,
      players: newPlayers,
      drawPile: remainingDeck,
      discardPile: startCard ? [startCard] : [],
      currentSuit: startCard?.suit || null,
      currentPlayerIndex: 0,
      direction: 'clockwise',
      phase: 'playing',
      winner: null,
      roundWinner: null,
      tournament: newTournament,
      timerSeconds: gameState.timerEnabled ? TIMER_DURATIONS[gameState.gameMode] : 0,
      dealingAnimation: true,
    });

    setTimeout(() => {
      setGameState(prev => prev ? { ...prev, dealingAnimation: false } : null);
    }, 1000);
  }, [gameState]);

  // Check if tournament is over
  const isTournamentOver = useMemo(() => {
    if (!gameState?.tournament) return false;
    return gameState.tournament.currentRound > gameState.tournament.rounds;
  }, [gameState?.tournament]);

  // Get tournament winner
  const getTournamentWinner = useCallback(() => {
    if (!gameState?.tournament) return null;
    const scores = gameState.tournament.scores;
    let maxScore = 0;
    let winner: string | null = null;

    Object.entries(scores).forEach(([playerId, score]) => {
      if (score > maxScore) {
        maxScore = score;
        winner = playerId;
      }
    });

    return gameState.players.find(p => p.id === winner) || null;
  }, [gameState]);

  // Reset game
  const resetGame = useCallback(() => {
    setGameState(null);
    setGamePhase('setup');
  }, []);

  // AI turn handling
  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.isAI) return;

    // Delay AI move for natural feel
    const aiTimeout = setTimeout(() => {
      const aiMove = getAIMove(gameState, currentPlayer.id);
      if (!aiMove) return;

      switch (aiMove.action) {
        case 'play':
          if (aiMove.cardId) {
            playCardAction(currentPlayer.id, aiMove.cardId);
            // If Jack or Ace was played, select suit after a delay
            if (aiMove.suit) {
              setTimeout(() => {
                selectSuitAction(aiMove.suit!);
              }, 500);
            }
          }
          break;
        case 'draw':
          drawCardAction(currentPlayer.id);
          setTimeout(() => endTurnAction(), 500);
          break;
        case 'mau':
          sayMauAction(currentPlayer.id);
          break;
        case 'mauMau':
          sayMauMauAction(currentPlayer.id);
          break;
      }
    }, 1000);

    return () => clearTimeout(aiTimeout);
  }, [gameState, playCardAction, drawCardAction, selectSuitAction, sayMauAction, sayMauMauAction, endTurnAction]);

  return {
    gameState,
    gamePhase,
    startGame,
    playCard: playCardAction,
    drawCard: drawCardAction,
    selectSuit: selectSuitAction,
    sayMau: sayMauAction,
    sayMauMau: sayMauMauAction,
    endTurn: endTurnAction,
    startNextRound,
    resetGame,
    isTournamentOver,
    getTournamentWinner,
  };
}

export default useMauMauGame;
