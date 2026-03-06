// Mau Mau Card Game Types

// Card suits in German
export type Suit = 'herz' | 'karo' | 'kreuz' | 'pik';

// Card values
export type Value = '7' | '8' | '9' | '10' | 'B' | 'D' | 'K' | 'A';

// Single card
export interface Card {
  id: string;
  suit: Suit;
  value: Value;
}

// Player in the game
export interface Player {
  id: string;
  name: string;
  hand: Card[];
  hasSaidMau: boolean;
  hasSaidMauMau: boolean;
  mustDraw: number; // Cards to draw (from 7 rule)
  isSkipped: boolean;
}

// Game rules configuration
export interface GameRules {
  mauSagen: boolean; // Say Mau when last card
  mauMauSagen: boolean; // Say Mau Mau when playing last card
  siebenRegel: boolean; // 7: next player draws 2
  achtRegel: boolean; // 8: next player skips
  assRegel: boolean; // Ace: wish a suit
  bubeRegel: boolean; // Jack: wish a suit regardless
  neunRegel: boolean; // 9: reverse direction
}

// Direction of play
export type Direction = 'clockwise' | 'counterclockwise';

// Game phase
export type GamePhase = 'setup' | 'playing' | 'suitSelection' | 'gameOver';

// Announcement for special actions
export interface Announcement {
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  id: string;
}

// Complete game state
export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  direction: Direction;
  drawPile: Card[];
  discardPile: Card[];
  currentSuit: Suit | null; // Current active suit (can differ from top card suit)
  rules: GameRules;
  pendingSuitSelection: {
    playerId: string;
    cardId: string;
  } | null;
  announcements: Announcement[];
  winner: Player | null;
  initialCardCount: number;
  lastDrawnCard: Card | null;
  canPlayDrawnCard: boolean;
  showHand: boolean; // For privacy between turns
}

// Suit display info
export interface SuitInfo {
  name: string;
  symbol: string;
  color: string;
  bgColor: string;
}

// Value display info
export interface ValueInfo {
  name: string;
  shortName: string;
}

// Sound file names
export type SoundName = 
  | 'your_turn'
  | 'mau_mau'
  | 'draw_card'
  | 'winner'
  | 'reverse'
  | 'skip'
  | 'choose_suit'
  | 'draw_two'
  | 'game_start'
  | 'invalid'
  | 'draw_again'
  | 'last_card';

// SSE Event types for multiplayer
export type SSEEventType =
  | 'connected'
  | 'room-update'
  | 'player-joined'
  | 'player-left'
  | 'game-started'
  | 'game-state'
  | 'turn-changed'
  | 'card-played'
  | 'card-drawn'
  | 'suit-selected'
  | 'game-over'
  | 'announcement'
  | 'error';

export interface SSEEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

// Game action types for state management
export type GameAction =
  | { type: 'START_GAME'; players: { name: string }[]; rules: GameRules; initialCards: number }
  | { type: 'PLAY_CARD'; playerId: string; cardId: string }
  | { type: 'DRAW_CARD'; playerId: string }
  | { type: 'SELECT_SUIT'; suit: Suit }
  | { type: 'SAY_MAU'; playerId: string }
  | { type: 'SAY_MAU_MAU'; playerId: string }
  | { type: 'NEXT_TURN' }
  | { type: 'ADD_ANNOUNCEMENT'; announcement: Omit<Announcement, 'id'> }
  | { type: 'REMOVE_ANNOUNCEMENT'; id: string }
  | { type: 'TOGGLE_HAND_VISIBILITY' }
  | { type: 'NEW_GAME' }
  | { type: 'LOAD_GAME'; state: GameState };

// Default rules
export const defaultRules: GameRules = {
  mauSagen: true,
  mauMauSagen: true,
  siebenRegel: true,
  achtRegel: true,
  assRegel: true,
  bubeRegel: true,
  neunRegel: false,
};

// Suit information map
export const suitInfo: Record<Suit, SuitInfo> = {
  herz: {
    name: 'Herz',
    symbol: '♥',
    color: '#dc2626',
    bgColor: '#fef2f2',
  },
  karo: {
    name: 'Karo',
    symbol: '♦',
    color: '#dc2626',
    bgColor: '#fef2f2',
  },
  kreuz: {
    name: 'Kreuz',
    symbol: '♣',
    color: '#1f2937',
    bgColor: '#f3f4f6',
  },
  pik: {
    name: 'Pik',
    symbol: '♠',
    color: '#1f2937',
    bgColor: '#f3f4f6',
  },
};

// Value information map
export const valueInfo: Record<Value, ValueInfo> = {
  '7': { name: 'Sieben', shortName: '7' },
  '8': { name: 'Acht', shortName: '8' },
  '9': { name: 'Neun', shortName: '9' },
  '10': { name: 'Zehn', shortName: '10' },
  'B': { name: 'Bube', shortName: 'B' },
  'D': { name: 'Dame', shortName: 'D' },
  'K': { name: 'König', shortName: 'K' },
  'A': { name: 'Ass', shortName: 'A' },
};
