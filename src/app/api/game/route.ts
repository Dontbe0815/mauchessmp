import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (use Redis in production)
const rooms = new Map<string, any>();
const playerConnections = new Map<string, Set<{ controller: ReadableStreamDefaultController }>>();
const playerRooms = new Map<string, string>(); // playerId -> roomCode

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Generate 4-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a 32-card deck (Mau Mau uses 7,8,9,10,J,Q,K,A)
function createDeck() {
  const suits = ['herz', 'karo', 'kreuz', 'pik'];
  const values = ['7', '8', '9', '10', 'B', 'D', 'K', 'A'];
  const deck: any[] = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        id: generateId(),
        suit,
        value,
      });
    }
  }
  
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

// Broadcast to all connections in a room
function broadcastToRoom(roomCode: string, event: any) {
  const connections = playerConnections.get(roomCode);
  if (!connections) return;

  const eventString = `data: ${JSON.stringify(event)}\n\n`;
  
  connections.forEach(({ controller }) => {
    try {
      controller.enqueue(new TextEncoder().encode(eventString));
    } catch {
      // Connection closed
    }
  });
}

// POST /api/game - Handle game actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create-room': {
        const { playerName, rules, initialCardCount = 5 } = data;
        const roomCode = generateRoomCode();
        const playerId = generateId();
        const roomId = generateId();
        
        const room = {
          id: roomId,
          code: roomCode,
          hostId: playerId,
          players: [{
            id: playerId,
            name: playerName || 'Spieler 1',
            isHost: true,
            isConnected: true,
            lastSeen: Date.now(),
          }],
          rules: rules || {
            mauSagen: true,
            mauMauSagen: true,
            siebenRegel: true,
            achtRegel: true,
            neunRegel: false,
            bubeRegel: true,
            assRegel: true,
          },
          initialCardCount,
          status: 'lobby',
          gameState: null,
          createdAt: Date.now(),
        };
        
        rooms.set(roomCode, room);
        playerRooms.set(playerId, roomCode);
        
        const response = NextResponse.json({
          success: true,
          roomCode,
          playerId,
          room: {
            code: room.code,
            hostId: room.hostId,
            players: room.players,
            rules: room.rules,
            initialCardCount: room.initialCardCount,
            status: room.status,
          },
        });
        
        response.cookies.set('maumau-player-id', playerId, {
          httpOnly: true,
          maxAge: 60 * 60 * 24,
          path: '/',
        });
        
        return response;
      }

      case 'join-room': {
        const { roomCode, playerName } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room) {
          return NextResponse.json({ success: false, error: 'Raum nicht gefunden!' });
        }

        if (room.status !== 'lobby') {
          return NextResponse.json({ success: false, error: 'Spiel läuft bereits!' });
        }

        if (room.players.length >= 4) {
          return NextResponse.json({ success: false, error: 'Raum ist voll!' });
        }

        const playerId = generateId();
        room.players.push({
          id: playerId,
          name: playerName || `Spieler ${room.players.length + 1}`,
          isHost: false,
          isConnected: true,
          lastSeen: Date.now(),
        });

        playerRooms.set(playerId, upperCode);
        
        broadcastToRoom(upperCode, {
          type: 'room-update',
          data: { room: { code: room.code, hostId: room.hostId, players: room.players, rules: room.rules, initialCardCount: room.initialCardCount, status: room.status } },
          timestamp: Date.now(),
        });

        const response = NextResponse.json({
          success: true,
          playerId,
          room: {
            code: room.code,
            hostId: room.hostId,
            players: room.players,
            rules: room.rules,
            initialCardCount: room.initialCardCount,
            status: room.status,
          },
        });
        
        response.cookies.set('maumau-player-id', playerId, {
          httpOnly: true,
          maxAge: 60 * 60 * 24,
          path: '/',
        });
        
        return response;
      }

      case 'leave-room': {
        const { roomCode, playerId } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room) return NextResponse.json({ success: true });

        const playerIndex = room.players.findIndex((p: any) => p.id === playerId);
        if (playerIndex >= 0) {
          room.players.splice(playerIndex, 1);
          playerRooms.delete(playerId);
        }

        if (room.players.length === 0) {
          rooms.delete(upperCode);
          playerConnections.delete(upperCode);
        } else {
          if (room.hostId === playerId) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
          }
          
          broadcastToRoom(upperCode, {
            type: 'room-update',
            data: { room: { code: room.code, hostId: room.hostId, players: room.players, rules: room.rules, initialCardCount: room.initialCardCount, status: room.status } },
            timestamp: Date.now(),
          });
        }

        return NextResponse.json({ success: true });
      }

      case 'start-game': {
        const { roomCode, playerId } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room) {
          return NextResponse.json({ success: false, error: 'Raum nicht gefunden!' });
        }

        if (room.hostId !== playerId) {
          return NextResponse.json({ success: false, error: 'Nur der Host kann das Spiel starten!' });
        }

        if (room.players.length < 2) {
          return NextResponse.json({ success: false, error: 'Mindestens 2 Spieler erforderlich!' });
        }

        // Create game
        const deck = createDeck();
        const { initialCardCount } = room;
        
        // Deal cards to players
        const hands: any[][] = [];
        for (let i = 0; i < room.players.length; i++) {
          hands.push(deck.splice(0, initialCardCount));
        }
        
        // Find starting card (not special)
        let discardPile: any[] = [];
        let startCard = deck.find((c: any) => !['7', '8', 'B', 'A'].includes(c.value));
        if (!startCard) startCard = deck[0];
        if (startCard) {
          deck.splice(deck.indexOf(startCard), 1);
          discardPile.push(startCard);
        }

        const gameState = {
          phase: 'playing',
          players: room.players.map((p: any, i: number) => ({
            ...p,
            hand: hands[i],
            handCount: hands[i].length,
            hasSaidMau: false,
            hasSaidMauMau: false,
            mustDraw: 0,
            isSkipped: false,
          })),
          currentPlayerIndex: 0,
          direction: 'clockwise',
          discardPile,
          drawPile: deck,
          currentSuit: startCard?.suit || null,
          rules: room.rules,
          pendingSuitSelection: null,
          winner: null,
          canPlayDrawnCard: false,
        };

        room.gameState = gameState;
        room.status = 'playing';

        // Broadcast game started to all players
        broadcastToRoom(upperCode, {
          type: 'game-started',
          data: { gameState },
          timestamp: Date.now(),
        });

        return NextResponse.json({ success: true });
      }

      case 'play-card': {
        const { roomCode, playerId, cardId } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room || !room.gameState) {
          return NextResponse.json({ success: false, error: 'Spiel nicht gefunden!' });
        }

        const gameState = room.gameState;
        const playerIndex = gameState.players.findIndex((p: any) => p.id === playerId);
        
        if (playerIndex !== gameState.currentPlayerIndex) {
          return NextResponse.json({ success: false, error: 'Nicht dein Zug!' });
        }

        const player = gameState.players[playerIndex];
        const cardIndex = player.hand.findIndex((c: any) => c.id === cardId);
        
        if (cardIndex < 0) {
          return NextResponse.json({ success: false, error: 'Karte nicht gefunden!' });
        }

        const card = player.hand[cardIndex];
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];

        // Check if card can be played
        const canPlay = card.value === 'B' || 
          card.suit === gameState.currentSuit || 
          card.value === topCard.value;

        if (!canPlay) {
          return NextResponse.json({ success: false, error: 'Diese Karte kann nicht gespielt werden!' });
        }

        // Play the card
        player.hand.splice(cardIndex, 1);
        player.handCount = player.hand.length;
        gameState.discardPile.push(card);

        // Check for winner
        if (player.hand.length === 0) {
          gameState.phase = 'gameOver';
          gameState.winner = { id: player.id, name: player.name };
          room.status = 'finished';

          broadcastToRoom(upperCode, {
            type: 'game-state',
            data: { gameState },
            timestamp: Date.now(),
          });

          return NextResponse.json({ success: true });
        }

        // Handle special cards
        if (card.value === '7' && gameState.rules.siebenRegel) {
          const nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
          gameState.players[nextIndex].mustDraw += 2;
        }

        if (card.value === '8' && gameState.rules.achtRegel) {
          const nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
          gameState.players[nextIndex].isSkipped = true;
        }

        if (card.value === '9' && gameState.rules.neunRegel) {
          gameState.direction = gameState.direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
        }

        // Handle suit selection
        if ((card.value === 'B' && gameState.rules.bubeRegel) || (card.value === 'A' && gameState.rules.assRegel)) {
          gameState.pendingSuitSelection = { playerId: player.id, cardId: card.id };
          
          broadcastToRoom(upperCode, {
            type: 'game-state',
            data: { gameState },
            timestamp: Date.now(),
          });

          return NextResponse.json({ success: true });
        }

        // Move to next player
        gameState.currentSuit = card.suit;
        advanceTurn(gameState);

        broadcastToRoom(upperCode, {
          type: 'game-state',
          data: { gameState },
          timestamp: Date.now(),
        });

        return NextResponse.json({ success: true });
      }

      case 'draw-card': {
        const { roomCode, playerId } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room || !room.gameState) {
          return NextResponse.json({ success: false, error: 'Spiel nicht gefunden!' });
        }

        const gameState = room.gameState;
        const playerIndex = gameState.players.findIndex((p: any) => p.id === playerId);
        
        if (playerIndex !== gameState.currentPlayerIndex) {
          return NextResponse.json({ success: false, error: 'Nicht dein Zug!' });
        }

        const player = gameState.players[playerIndex];
        const cardsToDraw = Math.max(player.mustDraw, 1);

        // Reshuffle if needed
        if (gameState.drawPile.length < cardsToDraw) {
          const topCard = gameState.discardPile.pop();
          gameState.drawPile = [...gameState.discardPile];
          for (let i = gameState.drawPile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gameState.drawPile[i], gameState.drawPile[j]] = [gameState.drawPile[j], gameState.drawPile[i]];
          }
          gameState.discardPile = [topCard];
        }

        // Draw cards
        const drawnCards = gameState.drawPile.splice(0, cardsToDraw);
        player.hand.push(...drawnCards);
        player.handCount = player.hand.length;
        player.mustDraw = 0;

        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        const lastDrawn = drawnCards[drawnCards.length - 1];
        gameState.canPlayDrawnCard = lastDrawn && (
          lastDrawn.suit === gameState.currentSuit ||
          lastDrawn.value === topCard.value ||
          lastDrawn.value === 'B'
        );

        broadcastToRoom(upperCode, {
          type: 'game-state',
          data: { gameState },
          timestamp: Date.now(),
        });

        return NextResponse.json({ success: true, cards: drawnCards });
      }

      case 'select-suit': {
        const { roomCode, playerId, suit } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room || !room.gameState) {
          return NextResponse.json({ success: false, error: 'Spiel nicht gefunden!' });
        }

        const gameState = room.gameState;

        if (!gameState.pendingSuitSelection || gameState.pendingSuitSelection.playerId !== playerId) {
          return NextResponse.json({ success: false, error: 'Keine Farbauswahl!' });
        }

        gameState.currentSuit = suit;
        gameState.pendingSuitSelection = null;
        advanceTurn(gameState);

        broadcastToRoom(upperCode, {
          type: 'game-state',
          data: { gameState },
          timestamp: Date.now(),
        });

        return NextResponse.json({ success: true });
      }

      case 'say-mau': {
        const { roomCode, playerId } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room || !room.gameState) {
          return NextResponse.json({ success: false, error: 'Spiel nicht gefunden!' });
        }

        const player = room.gameState.players.find((p: any) => p.id === playerId);
        if (player && player.hand.length === 2) {
          player.hasSaidMau = true;
        }

        return NextResponse.json({ success: true });
      }

      case 'say-mau-mau': {
        const { roomCode, playerId } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room || !room.gameState) {
          return NextResponse.json({ success: false, error: 'Spiel nicht gefunden!' });
        }

        const player = room.gameState.players.find((p: any) => p.id === playerId);
        if (player && player.hand.length === 1) {
          player.hasSaidMauMau = true;
        }

        return NextResponse.json({ success: true });
      }

      case 'end-turn': {
        const { roomCode, playerId } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (!room || !room.gameState) {
          return NextResponse.json({ success: false, error: 'Spiel nicht gefunden!' });
        }

        const gameState = room.gameState;
        const playerIndex = gameState.players.findIndex((p: any) => p.id === playerId);
        
        if (playerIndex !== gameState.currentPlayerIndex) {
          return NextResponse.json({ success: false, error: 'Nicht dein Zug!' });
        }

        advanceTurn(gameState);

        broadcastToRoom(upperCode, {
          type: 'game-state',
          data: { gameState },
          timestamp: Date.now(),
        });

        return NextResponse.json({ success: true });
      }

      case 'heartbeat': {
        const { roomCode, playerId } = data;
        const upperCode = roomCode?.toUpperCase();
        const room = rooms.get(upperCode);
        
        if (room) {
          const player = room.players.find((p: any) => p.id === playerId);
          if (player) {
            player.lastSeen = Date.now();
            player.isConnected = true;
          }
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unbekannte Aktion!' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Game API error:', error);
    return NextResponse.json({ success: false, error: 'Serverfehler!' }, { status: 500 });
  }
}

// Advance to next player
function advanceTurn(gameState: any) {
  const step = gameState.direction === 'clockwise' ? 1 : -1;
  let nextIndex = (gameState.currentPlayerIndex + step + gameState.players.length) % gameState.players.length;
  
  // Handle skipped players
  if (gameState.players[nextIndex].isSkipped) {
    gameState.players[nextIndex].isSkipped = false;
    nextIndex = (nextIndex + step + gameState.players.length) % gameState.players.length;
  }
  
  gameState.currentPlayerIndex = nextIndex;
  gameState.canPlayDrawnCard = false;
}

// GET /api/game - SSE endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get('roomCode');
  const playerId = searchParams.get('playerId');

  if (!roomCode || !playerId) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const room = rooms.get(roomCode.toUpperCase());
  
  const stream = new ReadableStream({
    start(controller) {
      if (!playerConnections.has(roomCode.toUpperCase())) {
        playerConnections.set(roomCode.toUpperCase(), new Set());
      }
      
      playerConnections.get(roomCode.toUpperCase())!.add({ controller });

      // Send connected event
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
        type: 'connected',
        data: { roomCode, playerId },
        timestamp: Date.now(),
      })}\n\n`));

      // Send current room state
      if (room) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
          type: 'room-update',
          data: { room: { code: room.code, hostId: room.hostId, players: room.players, rules: room.rules, initialCardCount: room.initialCardCount, status: room.status } },
          timestamp: Date.now(),
        })}\n\n`));

        if (room.gameState) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'game-state',
            data: { gameState: room.gameState },
            timestamp: Date.now(),
          })}\n\n`));
        }
      }

      // Heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Store cleanup
      (controller as any).cleanup = () => {
        clearInterval(heartbeatInterval);
        playerConnections.get(roomCode.toUpperCase())?.delete({ controller } as any);
      };
    },
    cancel(controller) {
      if ((controller as any).cleanup) {
        (controller as any).cleanup();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
