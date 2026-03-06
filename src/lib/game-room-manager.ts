// Server-side Game Room Manager
// In production, this would use Redis or a database

import { 
  GameRoom, 
  RoomPlayer, 
  MultiplayerGameState, 
  MultiplayerPlayer,
  SSEEvent
} from './multiplayer-types';
import { 
  Card, 
  GameRules, 
  Suit, 
  defaultRules,
  suitInfo 
} from './types';
import {
  generateId,
  createDeck,
  shuffleDeck,
  dealCards,
  findStartingCard,
  canPlayCard,
  getNextPlayerIndex,
} from './game-logic';

// In-memory storage (use Redis in production)
const rooms = new Map<string, GameRoom>();
const playerConnections = new Map<string, Set<{ controller: ReadableStreamDefaultController }>>();

// Generate a 4-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new room
export function createRoom(
  playerName: string,
  rules: GameRules = defaultRules,
  initialCardCount: number = 5
): { room: GameRoom; playerId: string } {
  const roomId = generateId();
  const roomCode = generateRoomCode();
  const playerId = generateId();

  const player: RoomPlayer = {
    id: playerId,
    name: playerName || 'Spieler 1',
    isHost: true,
    isConnected: true,
    lastSeen: Date.now(),
  };

  const room: GameRoom = {
    id: roomId,
    code: roomCode,
    hostId: playerId,
    players: [player],
    gameState: null,
    rules,
    initialCardCount,
    status: 'lobby',
    createdAt: Date.now(),
  };

  rooms.set(roomCode, room);

  return { room, playerId };
}

// Join an existing room
export function joinRoom(
  roomCode: string,
  playerName: string
): { success: boolean; room?: GameRoom; playerId?: string; error?: string } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return { success: false, error: 'Raum nicht gefunden!' };
  }

  if (room.status !== 'lobby') {
    return { success: false, error: 'Spiel läuft bereits!' };
  }

  if (room.players.length >= 4) {
    return { success: false, error: 'Raum ist voll!' };
  }

  const playerId = generateId();
  const player: RoomPlayer = {
    id: playerId,
    name: playerName || `Spieler ${room.players.length + 1}`,
    isHost: false,
    isConnected: true,
    lastSeen: Date.now(),
  };

  room.players.push(player);

  // Broadcast player joined
  broadcastToRoom(roomCode, {
    type: 'player-joined',
    data: { playerId, playerName: player.name },
    timestamp: Date.now(),
  });

  return { success: true, room, playerId };
}

// Leave a room
export function leaveRoom(roomCode: string, playerId: string): { success: boolean } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return { success: false };
  }

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1) {
    return { success: false };
  }

  const playerName = room.players[playerIndex].name;
  room.players.splice(playerIndex, 1);

  // Broadcast player left
  broadcastToRoom(roomCode, {
    type: 'player-left',
    data: { playerId, playerName },
    timestamp: Date.now(),
  });

  // If no players left, delete the room
  if (room.players.length === 0) {
    rooms.delete(roomCode.toUpperCase());
    playerConnections.delete(roomCode.toUpperCase());
    return { success: true };
  }

  // If host left, assign new host
  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
    room.players[0].isHost = true;
  }

  return { success: true };
}

// Get room by code
export function getRoom(roomCode: string): GameRoom | undefined {
  return rooms.get(roomCode.toUpperCase());
}

// Register SSE connection
export function registerConnection(
  roomCode: string,
  playerId: string,
  controller: ReadableStreamDefaultController
): () => void {
  const code = roomCode.toUpperCase();
  
  if (!playerConnections.has(code)) {
    playerConnections.set(code, new Set());
  }
  
  const connection = { controller };
  playerConnections.get(code)!.add(connection);

  // Update player last seen
  const room = rooms.get(code);
  if (room) {
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = true;
      player.lastSeen = Date.now();
    }
  }

  // Return cleanup function
  return () => {
    playerConnections.get(code)?.delete(connection);
    
    // Update player disconnected
    const room = rooms.get(code);
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.isConnected = false;
      }
    }
  };
}

// Broadcast to all connections in a room
export function broadcastToRoom(roomCode: string, event: SSEEvent): void {
  const code = roomCode.toUpperCase();
  const connections = playerConnections.get(code);
  
  if (!connections) return;

  const eventString = `data: ${JSON.stringify(event)}\n\n`;
  
  connections.forEach(({ controller }) => {
    try {
      controller.enqueue(new TextEncoder().encode(eventString));
    } catch (error) {
      // Connection might be closed
      console.warn('Failed to send to connection:', error);
    }
  });
}

// Start a game
export function startGame(roomCode: string, playerId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room) {
    return { success: false, error: 'Raum nicht gefunden!' };
  }

  if (room.hostId !== playerId) {
    return { success: false, error: 'Nur der Host kann das Spiel starten!' };
  }

  if (room.players.length < 2) {
    return { success: false, error: 'Mindestens 2 Spieler erforderlich!' };
  }

  if (room.status !== 'lobby') {
    return { success: false, error: 'Spiel läuft bereits!' };
  }

  // Create game state
  const gameState = createMultiplayerGameState(room);
  room.gameState = gameState;
  room.status = 'playing';

  // Broadcast game started
  broadcastToRoom(roomCode, {
    type: 'game-started',
    data: { gameState },
    timestamp: Date.now(),
  });

  return { success: true };
}

// Create multiplayer game state
function createMultiplayerGameState(room: GameRoom): MultiplayerGameState {
  const deck = shuffleDeck(createDeck());
  const { hands, remainingDeck } = dealCards(deck, room.players.length, room.initialCardCount);

  // Find a starting card for the discard pile
  let discardPile: Card[] = [];
  let drawPile = [...remainingDeck];
  
  const startCard = findStartingCard(drawPile);
  if (startCard) {
    discardPile.push(startCard);
    drawPile = drawPile.filter(c => c.id !== startCard.id);
  }

  const players: MultiplayerPlayer[] = room.players.map((p, index) => ({
    id: p.id,
    name: p.name,
    hand: hands[index],
    handCount: hands[index].length,
    hasSaidMau: false,
    hasSaidMauMau: false,
    mustDraw: 0,
    isSkipped: false,
  }));

  return {
    phase: 'playing',
    players,
    currentPlayerIndex: 0,
    direction: 'clockwise',
    discardPile,
    drawPile,
    currentSuit: discardPile[0]?.suit || null,
    rules: room.rules,
    pendingSuitSelection: null,
    winner: null,
    initialCardCount: room.initialCardCount,
    lastDrawnCard: null,
    canPlayDrawnCard: false,
  };
}

// Play a card
export function playCard(
  roomCode: string,
  playerId: string,
  cardId: string
): { success: boolean; error?: string } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room || !room.gameState) {
    return { success: false, error: 'Spiel nicht gefunden!' };
  }

  const gameState = room.gameState;
  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1 || playerIndex !== gameState.currentPlayerIndex) {
    return { success: false, error: 'Nicht dein Zug!' };
  }

  const player = gameState.players[playerIndex];
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  
  if (cardIndex === -1) {
    return { success: false, error: 'Karte nicht gefunden!' };
  }

  const card = player.hand[cardIndex];
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  // Check if card can be played
  if (!canPlayCard(card, topCard, gameState.currentSuit, gameState.rules)) {
    return { success: false, error: 'Diese Karte kann nicht gespielt werden!' };
  }

  // Remove card from hand and add to discard pile
  player.hand.splice(cardIndex, 1);
  player.handCount = player.hand.length;
  gameState.discardPile.push(card);

  // Check for winner
  if (player.hand.length === 0) {
    gameState.phase = 'gameOver';
    gameState.winner = player;
    room.status = 'finished';

    broadcastToRoom(roomCode, {
      type: 'game-over',
      data: { winnerId: player.id, winnerName: player.name },
      timestamp: Date.now(),
    });

    return { success: true };
  }

  // Handle special cards
  handleSpecialCard(roomCode, gameState, card, playerIndex);

  // Check if suit selection is needed
  if ((card.value === 'B' && gameState.rules.bubeRegel) || (card.value === 'A' && gameState.rules.assRegel)) {
    gameState.phase = 'suitSelection';
    gameState.pendingSuitSelection = {
      playerId: player.id,
      cardId: card.id,
    };
  } else {
    // Move to next player
    if (card.value !== 'B' || !gameState.rules.bubeRegel) {
      gameState.currentSuit = card.suit;
    }
    advanceToNextPlayer(roomCode, gameState);
  }

  broadcastToRoom(roomCode, {
    type: 'card-played',
    data: { gameState },
    timestamp: Date.now(),
  });

  return { success: true };
}

// Handle special card effects
function handleSpecialCard(
  roomCode: string,
  gameState: MultiplayerGameState,
  card: Card,
  playerIndex: number
): void {
  // 7 rule: next player draws 2
  if (card.value === '7' && gameState.rules.siebenRegel) {
    const nextIndex = getNextPlayerIndex(
      playerIndex,
      gameState.players.length,
      gameState.direction
    );
    gameState.players[nextIndex].mustDraw += 2;

    broadcastToRoom(roomCode, {
      type: 'announcement',
      data: {
        message: `${gameState.players[nextIndex].name} muss 2 Karten ziehen!`,
        type: 'warning',
      },
      timestamp: Date.now(),
    });
  }

  // 8 rule: next player skips
  if (card.value === '8' && gameState.rules.achtRegel) {
    const nextIndex = getNextPlayerIndex(
      playerIndex,
      gameState.players.length,
      gameState.direction
    );
    gameState.players[nextIndex].isSkipped = true;

    broadcastToRoom(roomCode, {
      type: 'announcement',
      data: {
        message: `${gameState.players[nextIndex].name} wird übersprungen!`,
        type: 'info',
      },
      timestamp: Date.now(),
    });
  }

  // 9 rule: reverse direction
  if (card.value === '9' && gameState.rules.neunRegel) {
    gameState.direction = gameState.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';

    broadcastToRoom(roomCode, {
      type: 'announcement',
      data: {
        message: 'Richtung geändert!',
        type: 'info',
      },
      timestamp: Date.now(),
    });
  }
}

// Advance to next player
function advanceToNextPlayer(roomCode: string, gameState: MultiplayerGameState): void {
  let nextIndex = getNextPlayerIndex(
    gameState.currentPlayerIndex,
    gameState.players.length,
    gameState.direction
  );

  // Check if next player is skipped
  if (gameState.players[nextIndex].isSkipped) {
    gameState.players[nextIndex].isSkipped = false;
    nextIndex = getNextPlayerIndex(nextIndex, gameState.players.length, gameState.direction);
  }

  gameState.currentPlayerIndex = nextIndex;
  gameState.lastDrawnCard = null;
  gameState.canPlayDrawnCard = false;
  gameState.phase = 'playing';

  broadcastToRoom(roomCode, {
    type: 'turn-changed',
    data: { currentPlayerIndex: nextIndex, playerName: gameState.players[nextIndex].name },
    timestamp: Date.now(),
  });
}

// Draw a card
export function drawCard(
  roomCode: string,
  playerId: string
): { success: boolean; error?: string; card?: Card } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room || !room.gameState) {
    return { success: false, error: 'Spiel nicht gefunden!' };
  }

  const gameState = room.gameState;
  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1 || playerIndex !== gameState.currentPlayerIndex) {
    return { success: false, error: 'Nicht dein Zug!' };
  }

  const player = gameState.players[playerIndex];
  const cardsToDraw = Math.max(player.mustDraw, 1);

  // Check if draw pile is empty - reshuffle discard pile
  if (gameState.drawPile.length < cardsToDraw) {
    if (gameState.discardPile.length <= 1) {
      return { success: false, error: 'Keine Karten mehr zum Ziehen!' };
    }
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    gameState.drawPile = shuffleDeck(gameState.discardPile.slice(0, -1));
    gameState.discardPile = [topCard];
  }

  // Draw cards
  const drawnCards = gameState.drawPile.splice(0, cardsToDraw);
  player.hand.push(...drawnCards);
  player.handCount = player.hand.length;
  player.mustDraw = 0;

  const lastDrawn = drawnCards[drawnCards.length - 1];
  gameState.lastDrawnCard = lastDrawn;

  // Check if drawn card is playable
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  gameState.canPlayDrawnCard = lastDrawn && canPlayCard(lastDrawn, topCard, gameState.currentSuit, gameState.rules);

  broadcastToRoom(roomCode, {
    type: 'card-drawn',
    data: { gameState, drawnBy: playerId },
    timestamp: Date.now(),
  });

  return { success: true, card: lastDrawn };
}

// Select a suit (after playing Jack or Ace)
export function selectSuit(
  roomCode: string,
  playerId: string,
  suit: Suit
): { success: boolean; error?: string } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room || !room.gameState) {
    return { success: false, error: 'Spiel nicht gefunden!' };
  }

  const gameState = room.gameState;

  if (gameState.phase !== 'suitSelection' || !gameState.pendingSuitSelection) {
    return { success: false, error: 'Keine Farbauswahl erforderlich!' };
  }

  if (gameState.pendingSuitSelection.playerId !== playerId) {
    return { success: false, error: 'Nicht deine Farbauswahl!' };
  }

  gameState.currentSuit = suit;
  gameState.pendingSuitSelection = null;
  
  advanceToNextPlayer(roomCode, gameState);

  broadcastToRoom(roomCode, {
    type: 'suit-selected',
    data: { gameState, suit },
    timestamp: Date.now(),
  });

  return { success: true };
}

// Say Mau
export function sayMau(roomCode: string, playerId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room || !room.gameState) {
    return { success: false, error: 'Spiel nicht gefunden!' };
  }

  const gameState = room.gameState;
  const player = gameState.players.find(p => p.id === playerId);
  
  if (!player) {
    return { success: false, error: 'Spieler nicht gefunden!' };
  }

  if (player.hand.length !== 2) {
    return { success: false, error: 'Du kannst Mau nur bei 2 Karten sagen!' };
  }

  player.hasSaidMau = true;

  broadcastToRoom(roomCode, {
    type: 'announcement',
    data: {
      message: `${player.name} hat "Mau" gesagt!`,
      type: 'info',
    },
    timestamp: Date.now(),
  });

  return { success: true };
}

// Say Mau Mau
export function sayMauMau(roomCode: string, playerId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room || !room.gameState) {
    return { success: false, error: 'Spiel nicht gefunden!' };
  }

  const gameState = room.gameState;
  const player = gameState.players.find(p => p.id === playerId);
  
  if (!player) {
    return { success: false, error: 'Spieler nicht gefunden!' };
  }

  if (player.hand.length !== 1) {
    return { success: false, error: 'Du kannst Mau Mau nur bei 1 Karte sagen!' };
  }

  player.hasSaidMauMau = true;

  broadcastToRoom(roomCode, {
    type: 'announcement',
    data: {
      message: `${player.name} hat "Mau Mau" gesagt!`,
      type: 'info',
    },
    timestamp: Date.now(),
  });

  return { success: true };
}

// End turn (after drawing and can't play)
export function endTurn(roomCode: string, playerId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (!room || !room.gameState) {
    return { success: false, error: 'Spiel nicht gefunden!' };
  }

  const gameState = room.gameState;
  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  
  if (playerIndex === -1 || playerIndex !== gameState.currentPlayerIndex) {
    return { success: false, error: 'Nicht dein Zug!' };
  }

  advanceToNextPlayer(roomCode, gameState);

  broadcastToRoom(roomCode, {
    type: 'turn-changed',
    data: { gameState },
    timestamp: Date.now(),
  });

  return { success: true };
}

// Heartbeat to keep connection alive
export function heartbeat(roomCode: string, playerId: string): void {
  const room = rooms.get(roomCode.toUpperCase());
  
  if (room) {
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.lastSeen = Date.now();
      player.isConnected = true;
    }
  }
}

// Clean up old rooms (call periodically)
export function cleanupOldRooms(): void {
  const now = Date.now();
  const maxAge = 4 * 60 * 60 * 1000; // 4 hours

  rooms.forEach((room, code) => {
    // Remove rooms where all players are disconnected and old
    const allDisconnected = room.players.every(
      p => !p.isConnected && (now - p.lastSeen) > 5 * 60 * 1000
    );
    
    if (allDisconnected || (now - room.createdAt) > maxAge) {
      rooms.delete(code);
      playerConnections.delete(code);
    }
  });
}

// Export draw pile for game state
declare module './multiplayer-types' {
  interface GameRoom {
    drawPile?: Card[];
  }
}
