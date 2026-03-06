'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameRules, Suit, Card, defaultRules, SoundName } from '@/lib/types';
import {
  createInitialGameState,
  playCard as playCardLogic,
  drawCard as drawCardLogic,
  selectSuit as selectSuitLogic,
  sayMau as sayMauLogic,
  sayMauMau as sayMauMauLogic,
  nextTurn as nextTurnLogic,
  checkMauViolation,
  applyMauPenalty,
  canPlayCard,
  getPlayableCards,
} from '@/lib/game-logic';

const STORAGE_KEY = 'maumau-gamestate';

interface UseGameStateOptions {
  playSound?: (name: SoundName) => void;
}

export function useGameState(options: UseGameStateOptions = {}) {
  const { playSound } = options;
  // Start with null to avoid hydration mismatch - will load after hydration
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const prevPlayerIndex = useRef<number | null>(null);
  const prevPhase = useRef<string | null>(null);

  // Load game state from localStorage after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGameState(parsed);
      }
    } catch (error) {
      console.warn('Failed to load game state from localStorage:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoaded || !gameState) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch (error) {
      console.warn('Failed to save game state to localStorage:', error);
    }
  }, [gameState, isLoaded]);

  // Sound effects for state changes
  useEffect(() => {
    if (!gameState || !playSound) return;

    // Check for phase changes
    if (prevPhase.current !== gameState.phase) {
      if (gameState.phase === 'playing' && prevPhase.current === 'setup') {
        playSound('game_start');
      }
      if (gameState.phase === 'gameOver') {
        playSound('winner');
      }
      if (gameState.phase === 'suitSelection') {
        playSound('choose_suit');
      }
      prevPhase.current = gameState.phase;
    }

    // Check for player changes
    if (prevPlayerIndex.current !== null && 
        prevPlayerIndex.current !== gameState.currentPlayerIndex &&
        gameState.phase === 'playing') {
      playSound('your_turn');
    }
    prevPlayerIndex.current = gameState.currentPlayerIndex;

  }, [gameState, playSound]);

  // Start a new game
  const startGame = useCallback((
    playerNames: string[],
    rules: GameRules = defaultRules,
    initialCardCount: number = 5
  ) => {
    const newState = createInitialGameState(playerNames, rules, initialCardCount);
    setGameState(newState);
    playSound?.('game_start');
  }, [playSound]);

  // Play a card
  const playCard = useCallback((playerId: string, cardId: string): { success: boolean; message?: string } => {
    if (!gameState) return { success: false };

    const player = gameState.players.find(p => p.id === playerId);
    const card = player?.hand.find(c => c.id === cardId);
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];

    if (!card) return { success: false };

    // Check if card can be played
    if (!canPlayCard(card, topCard, gameState.currentSuit, gameState.rules)) {
      playSound?.('invalid');
      return { success: false, message: 'Diese Karte kann nicht gespielt werden!' };
    }

    // Check Mau violation before playing
    if (player && checkMauViolation(gameState, playerId)) {
      setGameState(prev => {
        if (!prev) return prev;
        return applyMauPenalty(prev, playerId);
      });
      playSound?.('invalid');
      return { success: false, message: 'Du hast nicht "Mau" gesagt! Strafkarte gezogen!' };
    }

    // Play the card
    const newState = playCardLogic(gameState, playerId, cardId);
    setGameState(newState);

    // Play appropriate sounds
    if (card.value === '7' && gameState.rules.siebenRegel) {
      playSound?.('draw_two');
    } else if (card.value === '8' && gameState.rules.achtRegel) {
      playSound?.('skip');
    } else if (card.value === '9' && gameState.rules.neunRegel) {
      playSound?.('reverse');
    }

    // Check for last card warning
    const updatedPlayer = newState.players.find(p => p.id === playerId);
    if (updatedPlayer && updatedPlayer.hand.length === 1) {
      playSound?.('last_card');
    }

    return { success: true };
  }, [gameState, playSound]);

  // Draw a card
  const drawCard = useCallback((playerId: string) => {
    if (!gameState) return;

    const newState = drawCardLogic(gameState, playerId);
    setGameState(newState);
    playSound?.('draw_card');
  }, [gameState, playSound]);

  // Select a suit
  const selectSuit = useCallback((suit: Suit) => {
    if (!gameState || gameState.phase !== 'suitSelection') return;

    const newState = selectSuitLogic(gameState, suit);
    setGameState(newState);
    playSound?.('choose_suit');
  }, [gameState, playSound]);

  // Say Mau
  const sayMau = useCallback((playerId: string) => {
    if (!gameState) return;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.hand.length !== 2) return;

    const newState = sayMauLogic(gameState, playerId);
    setGameState(newState);
    playSound?.('mau_mau');
  }, [gameState, playSound]);

  // Say Mau Mau
  const sayMauMau = useCallback((playerId: string) => {
    if (!gameState) return;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player || player.hand.length !== 1) return;

    const newState = sayMauMauLogic(gameState, playerId);
    setGameState(newState);
    playSound?.('mau_mau');
  }, [gameState, playSound]);

  // End turn (pass to next player)
  const endTurn = useCallback(() => {
    if (!gameState) return;

    const newState = nextTurnLogic(gameState);
    setGameState(newState);
  }, [gameState]);

  // Show hand (privacy toggle)
  const showHand = useCallback(() => {
    if (!gameState) return;
    setGameState(prev => prev ? { ...prev, showHand: true } : prev);
  }, [gameState]);

  // Hide hand
  const hideHand = useCallback(() => {
    if (!gameState) return;
    setGameState(prev => prev ? { ...prev, showHand: false } : prev);
  }, [gameState]);

  // Get playable cards for current player
  const getPlayableCardsForPlayer = useCallback((playerId: string): Card[] => {
    if (!gameState) return [];

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return [];

    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    return getPlayableCards(player.hand, topCard, gameState.currentSuit, gameState.rules);
  }, [gameState]);

  // Check if player can play
  const canPlayerPlay = useCallback((playerId: string): boolean => {
    return getPlayableCardsForPlayer(playerId).length > 0;
  }, [getPlayableCardsForPlayer]);

  // Remove announcement
  const removeAnnouncement = useCallback((id: string) => {
    if (!gameState) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        announcements: prev.announcements.filter(a => a.id !== id),
      };
    });
  }, [gameState]);

  // Clear game (new game)
  const clearGame = useCallback(() => {
    setGameState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear game state:', error);
    }
  }, []);

  return {
    gameState,
    isLoaded,
    startGame,
    playCard,
    drawCard,
    selectSuit,
    sayMau,
    sayMauMau,
    endTurn,
    showHand,
    hideHand,
    getPlayableCardsForPlayer,
    canPlayerPlay,
    removeAnnouncement,
    clearGame,
  };
}
