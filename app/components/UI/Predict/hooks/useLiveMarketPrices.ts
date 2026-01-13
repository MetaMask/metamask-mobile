import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { PriceUpdate } from '../types';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

export interface UseLiveMarketPricesOptions {
  enabled?: boolean;
}

export interface UseLiveMarketPricesResult {
  prices: Map<string, PriceUpdate>;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  isConnected: boolean;
  lastUpdateTime: number | null;
}

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

  const tokenIdsKey = useMemo(() => [...tokenIds].sort().join(','), [tokenIds]);

  tokenIdsRef.current = tokenIds;

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

    if (!enabled || tokenIdsRef.current.length === 0) {
      setPrices(new Map());
      setIsConnected(false);
      return;
    }

    const manager = WebSocketManager.getInstance();
    const unsubscribe = manager.subscribeToMarketPrices(
      tokenIdsRef.current,
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
