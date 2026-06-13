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

const liveMarketPriceCache = new Map<
  string,
  { price: PriceUpdate; updatedAt: number }
>();
const LIVE_MARKET_PRICE_LOG_PREFIX = '[Predict][LiveMarketPrices]';

const logLiveMarketPriceSubscription = (
  event: 'subscribe' | 'unsubscribe' | 'skip',
  tokenIds: string[],
  metadata?: Record<string, unknown>,
) => {
  // Temporary debug log for validating visibility-driven subscriptions.
  // eslint-disable-next-line no-console
  console.debug(LIVE_MARKET_PRICE_LOG_PREFIX, event, {
    tokenIds,
    tokenCount: tokenIds.length,
    ...metadata,
  });
};

export const __resetLiveMarketPricesCacheForTest = () => {
  liveMarketPriceCache.clear();
};

const getCachedPrices = (tokenIds: string[]) => {
  const prices = new Map<string, PriceUpdate>();
  let lastUpdateTime: number | null = null;

  tokenIds.forEach((tokenId) => {
    const cached = liveMarketPriceCache.get(tokenId);
    if (!cached) return;

    prices.set(tokenId, cached.price);
    lastUpdateTime = Math.max(lastUpdateTime ?? 0, cached.updatedAt);
  });

  return { prices, lastUpdateTime };
};

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
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(
    () => getCachedPrices(tokenIds).prices,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(
    () => getCachedPrices(tokenIds).lastUpdateTime,
  );

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

    const updatedAt = Date.now();
    updates.forEach((update) => {
      liveMarketPriceCache.set(update.tokenId, { price: update, updatedAt });
    });

    setPrices((prevPrices) => {
      const newPrices = new Map(prevPrices);
      updates.forEach((update) => {
        newPrices.set(update.tokenId, update);
      });
      return newPrices;
    });

    setLastUpdateTime(updatedAt);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const currentTokenIds = tokenIdsRef.current;
    const currentTokenIdSet = new Set(currentTokenIds);
    const cachedPrices = getCachedPrices(currentTokenIds);

    // Keep every received live price for this screen session. Subscription
    // inputs only control the socket, not whether offscreen rows can keep
    // rendering their last live value while they are unsubscribed.
    setPrices((prevPrices) => {
      const nextPrices = new Map(prevPrices);
      currentTokenIds.forEach((tokenId) => {
        const cachedPrice = cachedPrices.prices.get(tokenId);
        if (cachedPrice) {
          nextPrices.set(tokenId, cachedPrice);
        }
      });
      return nextPrices;
    });

    if (currentTokenIdSet.size === 0) {
      setLastUpdateTime(null);
    } else if (cachedPrices.lastUpdateTime !== null) {
      setLastUpdateTime(cachedPrices.lastUpdateTime);
    }

    if (!enabled || currentTokenIds.length === 0) {
      setIsConnected(false);
      logLiveMarketPriceSubscription('skip', currentTokenIds, {
        enabled,
        reason: !enabled ? 'disabled' : 'empty-token-ids',
      });
      return;
    }

    const { PredictController } = Engine.context;
    logLiveMarketPriceSubscription('subscribe', currentTokenIds, {
      enabled,
    });
    const unsubscribe = PredictController.subscribeToMarketPrices(
      currentTokenIds,
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
      logLiveMarketPriceSubscription('unsubscribe', currentTokenIds, {
        enabled,
      });
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [tokenIdsKey, enabled, handlePriceUpdates]);

  const getPrice = useCallback(
    (tokenId: string): PriceUpdate | undefined =>
      prices.get(tokenId) ?? liveMarketPriceCache.get(tokenId)?.price,
    [prices],
  );

  return {
    prices,
    getPrice,
    isConnected,
    lastUpdateTime,
  };
};
