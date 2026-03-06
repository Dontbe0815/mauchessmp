import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for rooms (resets on server restart)
// For production, use Redis or a database
const rooms = new Map<string, {
  id: string;
  game: 'mau-mau' | 'chess';
  players: { id: string; name: string }[];
  maxPlayers: number;
  state: unknown;
  createdAt: number;
  lastActivity: number;
}>();

// Clean up old rooms (older than 1 hour)
function cleanupOldRooms() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.lastActivity < oneHourAgo) {
      rooms.delete(id);
    }
  }
}

// Generate random room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(request: NextRequest) {
  cleanupOldRooms();
  
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const roomId = searchParams.get('room');

  try {
    // Get room status
    if (action === 'status' && roomId) {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        room: {
          id: room.id,
          game: room.game,
          players: room.players,
          maxPlayers: room.maxPlayers,
          isFull: room.players.length >= room.maxPlayers,
        }
      });
    }

    // Poll for updates
    if (action === 'poll' && roomId) {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      
      room.lastActivity = Date.now();
      
      return NextResponse.json({
        room: {
          id: room.id,
          game: room.game,
          players: room.players,
          state: room.state,
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  cleanupOldRooms();
  
  try {
    const body = await request.json();
    const { action, roomId, playerId, playerName, game, state } = body;

    // Create room
    if (action === 'create') {
      let code = generateRoomCode();
      while (rooms.has(code)) {
        code = generateRoomCode();
      }
      
      const player = {
        id: playerId || `player-${Date.now()}`,
        name: playerName || 'Spieler 1',
      };
      
      const room = {
        id: code,
        game: game || 'mau-mau',
        players: [player],
        maxPlayers: 2,
        state: null,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      
      rooms.set(code, room);
      
      return NextResponse.json({
        success: true,
        room: {
          id: room.id,
          game: room.game,
          players: room.players,
          playerId: player.id,
        }
      });
    }

    // Join room
    if (action === 'join' && roomId) {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      
      if (room.players.length >= room.maxPlayers) {
        return NextResponse.json({ error: 'Room is full' }, { status: 400 });
      }
      
      const player = {
        id: playerId || `player-${Date.now()}`,
        name: playerName || 'Spieler 2',
      };
      
      room.players.push(player);
      room.lastActivity = Date.now();
      
      return NextResponse.json({
        success: true,
        room: {
          id: room.id,
          game: room.game,
          players: room.players,
          playerId: player.id,
        }
      });
    }

    // Update game state
    if (action === 'update' && roomId) {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      
      room.state = state;
      room.lastActivity = Date.now();
      
      return NextResponse.json({ success: true });
    }

    // Leave room
    if (action === 'leave' && roomId && playerId) {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      
      room.players = room.players.filter(p => p.id !== playerId);
      room.lastActivity = Date.now();
      
      if (room.players.length === 0) {
        rooms.delete(roomId.toUpperCase());
      }
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
