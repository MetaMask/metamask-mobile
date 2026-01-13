import { useEffect, useState, useCallback, useRef } from 'react';
import { PriceUpdate } from '../types';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

export interface UseLiveTokenPriceOptions {
  enabled?: boolean;
}

export interface UseLiveTokenPriceResult {
  price: PriceUpdate | null;
  isConnected: boolean;
}

/**
 * Subscribe to price updates for a SINGLE token.
 * Use this hook for individual position rows to minimize re-renders.
 *
 * When price updates come in, ONLY this position row re-renders,
 * not the entire positions list or parent components.
 */
export const useLiveTokenPrice = (
  tokenId: string | null,
  options: UseLiveTokenPriceOptions = {},
): UseLiveTokenPriceResult => {
  const { enabled = true } = options;

  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const isMountedRef = useRef(true);

  const handlePriceUpdates = useCallback(
    (updates: PriceUpdate[]) => {
      if (!isMountedRef.current || !tokenId) return;

      const ourUpdate = updates.find((u) => u.tokenId === tokenId);
      if (ourUpdate) {
        setPrice(ourUpdate);
      }
    },
    [tokenId],
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !tokenId) {
      setPrice(null);
      setIsConnected(false);
      return;
    }

    const manager = WebSocketManager.getInstance();
    const unsubscribe = manager.subscribeToMarketPrices(
      [tokenId],
      handlePriceUpdates,
    );

    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = manager.getConnectionStatus();
      setIsConnected(status.marketConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [tokenId, enabled, handlePriceUpdates]);

  return {
    price,
    isConnected,
  };
};
