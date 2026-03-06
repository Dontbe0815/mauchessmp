// Multiplayer Game Types

import { Card, GameRules, Suit, Player, Announcement } from './types';

// Player in a room (not in game yet)
export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  lastSeen: number;
}

// Game room
export interface GameRoom {
  id: string;
  code: string;
  hostId: string;
  players: RoomPlayer[];
  gameState: MultiplayerGameState | null;
  rules: GameRules;
  initialCardCount: number;
  status: 'lobby' | 'playing' | 'finished';
  createdAt: number;
}

// Game state for multiplayer (extends base game state)
export interface MultiplayerGameState {
  phase: 'playing' | 'suitSelection' | 'gameOver';
  players: MultiplayerPlayer[];
  currentPlayerIndex: number;
  direction: 'clockwise' | 'counterclockwise';
  discardPile: Card[];
  currentSuit: Suit | null;
  rules: GameRules;
  pendingSuitSelection: {
    playerId: string;
    cardId: string;
  } | null;
  winner: MultiplayerPlayer | null;
  initialCardCount: number;
  lastDrawnCard: Card | null;
  canPlayDrawnCard: boolean;
}

// Player with their hand (hand is only sent to the player themselves)
export interface MultiplayerPlayer {
  id: string;
  name: string;
  handCount: number; // For other players
  hand: Card[]; // Only sent to the player themselves
  hasSaidMau: boolean;
  hasSaidMauMau: boolean;
  mustDraw: number;
  isSkipped: boolean;
}

// Client state (what each player receives)
export interface ClientGameState {
  roomCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  phase: 'lobby' | 'playing' | 'suitSelection' | 'gameOver';
  currentPlayerIndex: number;
  direction: 'clockwise' | 'counterclockwise';
  currentSuit: Suit | null;
  myHand: Card[];
  myPlayerIndex: number;
  players: Array<{
    id: string;
    name: string;
    handCount: number;
    hasSaidMau: boolean;
    hasSaidMauMau: boolean;
    mustDraw: number;
    isSkipped: boolean;
    isCurrentPlayer: boolean;
    isMe: boolean;
  }>;
  topCard: Card | null;
  drawPileCount: number;
  pendingSuitSelection: {
    isMyTurn: boolean;
    cardValue: string;
  } | null;
  winner: { id: string; name: string } | null;
  rules: GameRules;
  canPlayDrawnCard: boolean;
}

// API Request/Response types
export interface CreateRoomRequest {
  playerName: string;
  rules: GameRules;
  initialCardCount: number;
}

export interface CreateRoomResponse {
  success: boolean;
  roomCode?: string;
  playerId?: string;
  error?: string;
}

export interface JoinRoomRequest {
  roomCode: string;
  playerName: string;
}

export interface JoinRoomResponse {
  success: boolean;
  playerId?: string;
  room?: {
    code: string;
    hostId: string;
    players: RoomPlayer[];
    rules: GameRules;
    initialCardCount: number;
    status: string;
  };
  error?: string;
}

export interface LeaveRoomRequest {
  roomCode: string;
  playerId: string;
}

export interface StartGameRequest {
  roomCode: string;
  playerId: string;
}

export interface PlayCardRequest {
  roomCode: string;
  playerId: string;
  cardId: string;
}

export interface DrawCardRequest {
  roomCode: string;
  playerId: string;
}

export interface SelectSuitRequest {
  roomCode: string;
  playerId: string;
  suit: Suit;
}

export interface SayMauRequest {
  roomCode: string;
  playerId: string;
}

export interface SayMauMauRequest {
  roomCode: string;
  playerId: string;
}

export interface EndTurnRequest {
  roomCode: string;
  playerId: string;
}

export interface HeartbeatRequest {
  roomCode: string;
  playerId: string;
}

// SSE Event types
export type SSEEventType = 
  | 'room-update'
  | 'game-state'
  | 'player-joined'
  | 'player-left'
  | 'game-started'
  | 'turn-changed'
  | 'card-played'
  | 'card-drawn'
  | 'suit-selected'
  | 'game-over'
  | 'announcement'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: number;
}

// Announcement for multiplayer
export interface MultiplayerAnnouncement extends Announcement {
  roomCode: string;
}
