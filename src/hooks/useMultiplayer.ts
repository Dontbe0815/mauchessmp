'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SSEEvent,
  GameRules,
  Suit,
  defaultRules,
} from '@/lib/types';

interface UseMultiplayerOptions {
  playSound?: (name: string) => void;
}

interface RoomInfo {
  code: string;
  hostId: string;
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    isConnected: boolean;
  }>;
  rules: GameRules;
  initialCardCount: number;
  status: string;
}

interface ClientGameState {
  roomCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  phase: string;
  currentPlayerIndex: number;
  direction: string;
  currentSuit: string | null;
  myHand: any[];
  myPlayerIndex: number;
  players: any[];
  topCard: any;
  drawPileCount: number;
  pendingSuitSelection: any;
  winner: any;
  rules: GameRules;
  canPlayDrawnCard: boolean;
}

export function useMultiplayer(options: UseMultiplayerOptions = {}) {
  const { playSound } = options;
  
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; message: string; type: string }>>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playSoundRef = useRef(playSound);
  const roomCodeRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const playerNameRef = useRef<string>('');
  const isHostRef = useRef<boolean>(false);
  const connectRef = useRef<((code: string, pid: string, pname: string, host: boolean) => void) | null>(null);

  // Keep refs in sync
  useEffect(() => { playSoundRef.current = playSound; }, [playSound]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // Transform game state for client
  const transformGameState = useCallback((state: any, pid: string, pname: string, host: boolean, code: string) => {
    if (!state || !state.players) return;
    
    const myIndex = state.players.findIndex((p: any) => p.id === pid);
    
    const clientState: ClientGameState = {
      roomCode: code,
      playerId: pid,
      playerName: pname,
      isHost: host,
      phase: state.phase,
      currentPlayerIndex: state.currentPlayerIndex,
      direction: state.direction,
      currentSuit: state.currentSuit,
      myHand: myIndex >= 0 ? state.players[myIndex].hand || [] : [],
      myPlayerIndex: myIndex,
      players: state.players.map((p: any, index: number) => ({
        id: p.id,
        name: p.name,
        handCount: p.hand?.length || p.handCount || 0,
        hasSaidMau: p.hasSaidMau,
        hasSaidMauMau: p.hasSaidMauMau,
        mustDraw: p.mustDraw,
        isSkipped: p.isSkipped,
        isCurrentPlayer: index === state.currentPlayerIndex,
        isMe: p.id === pid,
      })),
      topCard: state.discardPile?.[state.discardPile.length - 1] || null,
      drawPileCount: state.drawPile?.length || 0,
      pendingSuitSelection: state.pendingSuitSelection ? {
        isMyTurn: state.pendingSuitSelection.playerId === pid,
        cardValue: 'B',
      } : null,
      winner: state.winner ? { id: state.winner.id, name: state.winner.name } : null,
      rules: state.rules,
      canPlayDrawnCard: state.canPlayDrawnCard || false,
    };
    
    setGameState(clientState);
    
    if (state.currentPlayerIndex !== undefined) {
      const isMyTurn = state.players[state.currentPlayerIndex]?.id === pid;
      if (isMyTurn && state.phase === 'playing') {
        playSoundRef.current?.('your_turn');
      }
    }
  }, []);

  // Handle SSE events
  const handleEvent = useCallback((event: SSEEvent, pid: string, pname: string, host: boolean, code: string) => {
    switch (event.type) {
      case 'connected':
        setIsConnected(true);
        break;

      case 'room-update':
        const roomData = event.data as { room: RoomInfo };
        setRoomInfo(roomData.room);
        break;

      case 'game-started':
      case 'game-state':
      case 'card-played':
      case 'card-drawn':
      case 'suit-selected':
      case 'turn-changed':
        const gameData = event.data as { gameState: any };
        if (gameData?.gameState) {
          transformGameState(gameData.gameState, pid, pname, host, code);
        }
        break;

      case 'player-joined':
        playSoundRef.current?.('game_start');
        break;

      case 'game-over':
        playSoundRef.current?.('winner');
        break;

      case 'announcement':
        const annData = event.data as { message: string; type: string };
        const annId = Date.now().toString();
        setAnnouncements(prev => [...prev, { id: annId, message: annData.message, type: annData.type }]);
        setTimeout(() => {
          setAnnouncements(prev => prev.filter(a => a.id !== annId));
        }, 5000);
        break;

      case 'error':
        const errData = event.data as { message: string };
        setError(errData.message);
        break;
    }
  }, [transformGameState]);

  // Connect function - will be stored in ref
  useEffect(() => {
    const connect = (code: string, pid: string, pname: string, host: boolean) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`/api/game?roomCode=${code}&playerId=${pid}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = JSON.parse(event.data);
          handleEvent(sseEvent, pid, pname, host, code);
        } catch (e) {
          console.warn('Failed to parse SSE event:', e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          const rc = roomCodeRef.current;
          const pi = playerIdRef.current;
          const pn = playerNameRef.current;
          const ih = isHostRef.current;
          if (rc && pi && connectRef.current) {
            connectRef.current(rc, pi, pn, ih);
          }
        }, 3000);
      };
    };

    connectRef.current = connect;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [handleEvent]);

  // API call helper
  const apiCall = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Ein Fehler ist aufgetreten!');
      }
      
      return result;
    } catch (err) {
      setError('Verbindungsfehler!');
      return { success: false, error: 'Verbindungsfehler!' };
    }
  }, []);

  // Create a room
  const createRoomAction = useCallback(async (
    name: string,
    rules: GameRules = defaultRules,
    initialCardCount: number = 5
  ) => {
    setPlayerName(name);
    const result = await apiCall('create-room', { playerName: name, rules, initialCardCount });
    
    if (result.success) {
      setRoomCode(result.roomCode);
      setPlayerId(result.playerId);
      setIsHost(true);
      setRoomInfo(result.room);
      if (connectRef.current) {
        connectRef.current(result.roomCode, result.playerId, name, true);
      }
    }
    
    return result;
  }, [apiCall]);

  // Join a room
  const joinRoomAction = useCallback(async (code: string, name: string) => {
    setPlayerName(name);
    const result = await apiCall('join-room', { roomCode: code, playerName: name });
    
    if (result.success) {
      const upperCode = code.toUpperCase();
      setRoomCode(upperCode);
      setPlayerId(result.playerId);
      const host = result.room?.hostId === result.playerId;
      setIsHost(host);
      setRoomInfo(result.room);
      if (connectRef.current) {
        connectRef.current(upperCode, result.playerId!, name, host);
      }
    }
    
    return result;
  }, [apiCall]);

  // Leave room
  const leaveRoomAction = useCallback(async () => {
    if (roomCodeRef.current && playerIdRef.current) {
      await apiCall('leave-room', { roomCode: roomCodeRef.current, playerId: playerIdRef.current });
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setRoomCode(null);
    setPlayerId(null);
    setIsHost(false);
    setRoomInfo(null);
    setGameState(null);
    setIsConnected(false);
  }, [apiCall]);

  // Start game
  const startGameAction = useCallback(async () => {
    const rc = roomCodeRef.current;
    const pi = playerIdRef.current;
    if (!rc || !pi) return { success: false };
    return apiCall('start-game', { roomCode: rc, playerId: pi });
  }, [apiCall]);

  // Play card
  const playCardAction = useCallback(async (cardId: string) => {
    const rc = roomCodeRef.current;
    const pi = playerIdRef.current;
    if (!rc || !pi) return { success: false };
    const result = await apiCall('play-card', { roomCode: rc, playerId: pi, cardId });
    
    if (result.success) {
      playSoundRef.current?.('draw_card');
    }
    
    return result;
  }, [apiCall]);

  // Draw card
  const drawCardAction = useCallback(async () => {
    const rc = roomCodeRef.current;
    const pi = playerIdRef.current;
    if (!rc || !pi) return { success: false };
    return apiCall('draw-card', { roomCode: rc, playerId: pi });
  }, [apiCall]);

  // Select suit
  const selectSuitAction = useCallback(async (suit: Suit) => {
    const rc = roomCodeRef.current;
    const pi = playerIdRef.current;
    if (!rc || !pi) return { success: false };
    return apiCall('select-suit', { roomCode: rc, playerId: pi, suit });
  }, [apiCall]);

  // Say Mau
  const sayMauAction = useCallback(async () => {
    const rc = roomCodeRef.current;
    const pi = playerIdRef.current;
    if (!rc || !pi) return { success: false };
    return apiCall('say-mau', { roomCode: rc, playerId: pi });
  }, [apiCall]);

  // Say Mau Mau
  const sayMauMauAction = useCallback(async () => {
    const rc = roomCodeRef.current;
    const pi = playerIdRef.current;
    if (!rc || !pi) return { success: false };
    return apiCall('say-mau-mau', { roomCode: rc, playerId: pi });
  }, [apiCall]);

  // End turn
  const endTurnAction = useCallback(async () => {
    const rc = roomCodeRef.current;
    const pi = playerIdRef.current;
    if (!rc || !pi) return { success: false };
    return apiCall('end-turn', { roomCode: rc, playerId: pi });
  }, [apiCall]);

  // Remove announcement
  const removeAnnouncement = useCallback((id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Heartbeat
  useEffect(() => {
    const rc = roomCodeRef.current;
    const pi = playerIdRef.current;
    if (!rc || !pi) return;
    
    const interval = setInterval(() => {
      apiCall('heartbeat', { roomCode: rc, playerId: pi });
    }, 15000);
    
    return () => clearInterval(interval);
  }, [roomCode, playerId, apiCall]);

  return {
    roomCode,
    playerId,
    playerName,
    isHost,
    roomInfo,
    gameState,
    error,
    isConnected,
    announcements,
    
    createRoom: createRoomAction,
    joinRoom: joinRoomAction,
    leaveRoom: leaveRoomAction,
    startGame: startGameAction,
    playCard: playCardAction,
    drawCard: drawCardAction,
    selectSuit: selectSuitAction,
    sayMau: sayMauAction,
    sayMauMau: sayMauMauAction,
    endTurn: endTurnAction,
    removeAnnouncement,
    clearError,
  };
}
