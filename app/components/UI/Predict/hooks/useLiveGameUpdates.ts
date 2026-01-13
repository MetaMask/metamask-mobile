import { useEffect, useState, useCallback, useRef } from 'react';
import { GameUpdate } from '../types';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

export interface UseLiveGameUpdatesOptions {
  enabled?: boolean;
}

export interface UseLiveGameUpdatesResult {
  gameUpdate: GameUpdate | null;
  isConnected: boolean;
  lastUpdateTime: number | null;
}

export const useLiveGameUpdates = (
  gameId: string | null,
  options: UseLiveGameUpdatesOptions = {},
): UseLiveGameUpdatesResult => {
  const { enabled = true } = options;

  const [gameUpdate, setGameUpdate] = useState<GameUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  const isMountedRef = useRef(true);

  const handleGameUpdate = useCallback((update: GameUpdate) => {
    if (!isMountedRef.current) return;

    setGameUpdate(update);
    setLastUpdateTime(Date.now());
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !gameId) {
      setGameUpdate(null);
      setIsConnected(false);
      return;
    }

    const manager = WebSocketManager.getInstance();
    const unsubscribe = manager.subscribeToGame(gameId, handleGameUpdate);

    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = manager.getConnectionStatus();
      setIsConnected(status.sportsConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [gameId, enabled, handleGameUpdate]);

  return {
    gameUpdate,
    isConnected,
    lastUpdateTime,
  };
};
