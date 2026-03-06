'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface Player {
  id: string;
  name: string;
}

interface RoomState {
  id: string;
  game: 'mau-mau' | 'chess';
  players: Player[];
  maxPlayers: number;
  state: unknown;
}

interface UseOnlineMultiplayerProps {
  game: 'mau-mau' | 'chess';
  playerName: string;
}

interface UseOnlineMultiplayerReturn {
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  roomCode: string | null;
  playerId: string | null;
  players: Player[];
  gameState: unknown;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  updateGameState: (state: unknown) => Promise<void>;
  pollForUpdates: () => Promise<void>;
}

export function useOnlineMultiplayer({ game, playerName }: UseOnlineMultiplayerProps): UseOnlineMultiplayerReturn {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<unknown>(null);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Start polling for updates
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(async () => {
      if (!roomCode) return;
      
      try {
        const response = await fetch(`/api/room?action=poll&room=${roomCode}`);
        const data = await response.json();
        
        if (data.room) {
          setPlayers(data.room.players);
          if (data.room.state) {
            setGameState(data.room.state);
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 1000);
  }, [roomCode]);

  const createRoom = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const id = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          playerId: id,
          playerName,
          game,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }
      
      setRoomCode(data.room.id);
      setPlayerId(data.room.playerId);
      setPlayers(data.room.players);
      setIsConnected(true);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsConnecting(false);
    }
  }, [game, playerName, startPolling]);

  const joinRoom = useCallback(async (code: string) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const id = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          roomId: code,
          playerId: id,
          playerName,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }
      
      setRoomCode(data.room.id);
      setPlayerId(data.room.playerId);
      setPlayers(data.room.players);
      setIsConnected(true);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsConnecting(false);
    }
  }, [playerName, startPolling]);

  const leaveRoom = useCallback(async () => {
    if (!roomCode || !playerId) return;
    
    try {
      await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          roomId: roomCode,
          playerId,
        }),
      });
    } catch {
      // Ignore leave errors
    }
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    setRoomCode(null);
    setPlayerId(null);
    setPlayers([]);
    setGameState(null);
    setIsConnected(false);
  }, [roomCode, playerId]);

  const updateGameState = useCallback(async (state: unknown) => {
    if (!roomCode) return;
    
    try {
      await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          roomId: roomCode,
          state,
        }),
      });
    } catch {
      // Ignore update errors
    }
  }, [roomCode]);

  const pollForUpdates = useCallback(async () => {
    if (!roomCode) return;
    
    try {
      const response = await fetch(`/api/room?action=poll&room=${roomCode}`);
      const data = await response.json();
      
      if (data.room) {
        setPlayers(data.room.players);
        if (data.room.state) {
          setGameState(data.room.state);
        }
      }
    } catch {
      // Ignore polling errors
    }
  }, [roomCode]);

  return {
    isConnecting,
    isConnected,
    error,
    roomCode,
    playerId,
    players,
    gameState,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGameState,
    pollForUpdates,
  };
}
