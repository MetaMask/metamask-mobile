import { useEffect, useState, useCallback, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { GameUpdate } from '../types';

export interface UseLiveGameUpdatesOptions {
  enabled?: boolean;
}

export interface UseLiveGameUpdatesResult {
  gameUpdate: GameUpdate | null;
  isConnected: boolean;
  lastUpdateTime: number | null;
}

/**
 * Hook for subscribing to real-time game updates via WebSocket.
 *
 * @param gameId - Game ID to subscribe to, or null to disable
 * @param options - Configuration options (enabled: boolean)
 * @returns Game update state, connection status, and last update timestamp
 */
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

    // Reset state when gameId changes to avoid stale data from previous game
    setGameUpdate(null);
    setLastUpdateTime(null);

    if (!enabled || !gameId) {
      setIsConnected(false);
      return;
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToGameUpdates(
      gameId,
      handleGameUpdate,
    );

    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = PredictController.getConnectionStatus();
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
