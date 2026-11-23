import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { PriceUpdate } from '../types';

export interface UseLiveMarketPricesOptions {
  enabled?: boolean;
  /**
   * Keep the last live prices while `enabled` is false, so a quick toggle does
   * not flicker. Pass `false` when the pause can be long (e.g. the screen is
   * blurred) and a price from before it must not show on return.
   * @default true
   */
  retainPricesWhenDisabled?: boolean;
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
const LIVE_MARKET_PRICE_CACHE_TTL_MS = 10_000;

export const __resetLiveMarketPricesCacheForTest = () => {
  liveMarketPriceCache.clear();
};

const pruneExpiredCachedPrices = (now = Date.now()) => {
  liveMarketPriceCache.forEach((cached, tokenId) => {
    if (now - cached.updatedAt > LIVE_MARKET_PRICE_CACHE_TTL_MS) {
      liveMarketPriceCache.delete(tokenId);
    }
  });
};

const getCachedPrices = (tokenIds: string[]) => {
  const prices = new Map<string, PriceUpdate>();
  let lastUpdateTime: number | null = null;
  const now = Date.now();
  pruneExpiredCachedPrices(now);

  tokenIds.forEach((tokenId) => {
    const cached = liveMarketPriceCache.get(tokenId);
    if (!cached) return;
    if (now - cached.updatedAt > LIVE_MARKET_PRICE_CACHE_TTL_MS) {
      liveMarketPriceCache.delete(tokenId);
      return;
    }

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
  const { enabled = true, retainPricesWhenDisabled = true } = options;
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(
    () => getCachedPrices(tokenIds).prices,
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(
    () => getCachedPrices(tokenIds).lastUpdateTime,
  );

  const isMountedRef = useRef(true);
  const tokenIdsRef = useRef(tokenIds);
  // Mirrors the latest `prices` map so we can detect no-op ticks without
  // adding `prices` to `handlePriceUpdates`' dependencies. Kept in sync inside
  // every state updater below.
  const pricesRef = useRef(prices);

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
    pruneExpiredCachedPrices(updatedAt);
    updates.forEach((update) => {
      liveMarketPriceCache.set(update.tokenId, { price: update, updatedAt });
    });

    // Skip the state update entirely when none of the incoming values differ
    // from what we already have. This prevents a re-render of the whole
    // subscriber tree for redundant ticks that carry no visible change.
    const current = pricesRef.current;
    const hasChange = updates.some((update) => {
      const existing = current.get(update.tokenId);
      return (
        !existing ||
        existing.price !== update.price ||
        existing.bestBid !== update.bestBid ||
        existing.bestAsk !== update.bestAsk
      );
    });

    if (!hasChange) {
      return;
    }

    setPrices((prevPrices) => {
      const newPrices = new Map(prevPrices);
      updates.forEach((update) => {
        newPrices.set(update.tokenId, update);
      });
      pricesRef.current = newPrices;
      return newPrices;
    });

    setLastUpdateTime(updatedAt);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const currentTokenIds = tokenIdsRef.current;
    const currentTokenIdSet = new Set(currentTokenIds);

    if (!enabled && !retainPricesWhenDisabled) {
      // Another live subscriber to these tokens refills the cache on its next
      // tick, so dropping them only stops a pre-pause price being reused.
      currentTokenIds.forEach((tokenId) =>
        liveMarketPriceCache.delete(tokenId),
      );
      const emptyPrices = new Map<string, PriceUpdate>();
      pricesRef.current = emptyPrices;
      setPrices(emptyPrices);
      setLastUpdateTime(null);
      setIsConnected(false);
      return;
    }

    const cachedPrices = getCachedPrices(currentTokenIds);

    // Keep the last known live price for still-selected tokens while a new
    // subscription warms up. This prevents brief flashes to older REST or
    // market snapshots when a CTA remounts for the same token IDs.
    setPrices((prevPrices) => {
      const nextPrices = new Map<string, PriceUpdate>();
      currentTokenIds.forEach((tokenId) => {
        const cachedPrice =
          cachedPrices.prices.get(tokenId) ?? prevPrices.get(tokenId);
        if (cachedPrice) {
          nextPrices.set(tokenId, cachedPrice);
        }
      });
      pricesRef.current = nextPrices;
      return nextPrices;
    });

    if (currentTokenIdSet.size === 0) {
      setLastUpdateTime(null);
    } else if (cachedPrices.lastUpdateTime !== null) {
      setLastUpdateTime(cachedPrices.lastUpdateTime);
    }

    if (!enabled || currentTokenIds.length === 0) {
      setIsConnected(false);
      return;
    }

    const { PredictController } = Engine.context;
    const unsubscribe = PredictController.subscribeToMarketPrices(
      currentTokenIds,
      handlePriceUpdates,
    );

    const unsubscribeStatus = PredictController.subscribeToConnectionStatus(
      (status) => {
        if (!isMountedRef.current) return;
        setIsConnected(status.marketConnected);
      },
    );

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      unsubscribeStatus();
    };
  }, [tokenIdsKey, enabled, retainPricesWhenDisabled, handlePriceUpdates]);

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
