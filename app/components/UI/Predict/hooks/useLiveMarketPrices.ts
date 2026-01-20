import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { PriceUpdate } from '../types';

export interface UseLiveMarketPricesOptions {
  enabled?: boolean;
}

export interface UseLiveMarketPricesResult {
  prices: Map<string, PriceUpdate>;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  isConnected: boolean;
  lastUpdateTime: number | null;
}

/**
 * Hook for subscribing to real-time market price updates via WebSocket.
 *
 * @param tokenIds - Array of token IDs to subscribe to price updates for
 * @param options - Configuration options (enabled: boolean)
 * @returns Price map, getPrice helper, connection status, and last update timestamp
 */
export const useLiveMarketPrices = (
  tokenIds: string[],
  options: UseLiveMarketPricesOptions = {},
): UseLiveMarketPricesResult => {
  const { enabled = true } = options;

  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  const tokenIdsRef = useRef(tokenIds);

  // Use JSON.stringify to avoid key collisions if token IDs contain commas
  const tokenIdsKey = useMemo(
    () => JSON.stringify([...tokenIds].sort((a, b) => a.localeCompare(b))),
    [tokenIds],
  );

  // Sync ref in effect to avoid render impurity (React Concurrent Mode safe)
  useEffect(() => {
    tokenIdsRef.current = tokenIds;
  }, [tokenIds]);

  const handlePriceUpdates = useCallback((updates: PriceUpdate[]) => {
    if (!isMountedRef.current) return;

    setPrices((prevPrices) => {
      const newPrices = new Map(prevPrices);
      updates.forEach((update) => {
        newPrices.set(update.tokenId, update);
      });
      return newPrices;
    });

    setLastUpdateTime(Date.now());
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Reset state when token set changes to avoid stale data from previous subscriptions
    setPrices(new Map());
    setLastUpdateTime(null);

    if (!enabled || tokenIdsRef.current.length === 0) {
      setIsConnected(false);
      return;
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToMarketPrices(
      tokenIdsRef.current,
      handlePriceUpdates,
    );

    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = PredictController.getConnectionStatus();
      setIsConnected(status.marketConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [tokenIdsKey, enabled, handlePriceUpdates]);

  const getPrice = useCallback(
    (tokenId: string): PriceUpdate | undefined => prices.get(tokenId),
    [prices],
  );

  return {
    prices,
    getPrice,
    isConnected,
    lastUpdateTime,
  };
};
