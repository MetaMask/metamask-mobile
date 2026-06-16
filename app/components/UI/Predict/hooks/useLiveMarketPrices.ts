import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  useSyncExternalStore,
} from 'react';
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
const LIVE_MARKET_PRICE_CACHE_TTL_MS = 10_000;

const pruneExpiredCachedPrices = (now = Date.now()) => {
  liveMarketPriceCache.forEach((cached, tokenId) => {
    if (now - cached.updatedAt > LIVE_MARKET_PRICE_CACHE_TTL_MS) {
      liveMarketPriceCache.delete(tokenId);
    }
  });
};

// Per-token listeners backing the `useLivePrice` / `useLivePrices` selectors.
// This lets many subscribers (e.g. one per outcome card) read live prices from
// a single shared store and only re-render when *their* token changes, instead
// of each card opening its own WebSocket subscription + React state.
const tokenListeners = new Map<string, Set<() => void>>();

const subscribeToken = (
  tokenId: string,
  listener: () => void,
): (() => void) => {
  let listeners = tokenListeners.get(tokenId);
  if (!listeners) {
    listeners = new Set();
    tokenListeners.set(tokenId, listeners);
  }
  listeners.add(listener);

  return () => {
    const current = tokenListeners.get(tokenId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      tokenListeners.delete(tokenId);
    }
  };
};

const notifyToken = (tokenId: string) => {
  const listeners = tokenListeners.get(tokenId);
  if (!listeners) return;
  listeners.forEach((listener) => listener());
};

const getLivePriceSnapshot = (tokenId: string): PriceUpdate | undefined =>
  liveMarketPriceCache.get(tokenId)?.price;

/**
 * Single write path for live prices. Updates the shared cache and notifies the
 * per-token selector listeners. Used both by the stateful `useLiveMarketPrices`
 * hook and the lightweight `useLiveMarketPricesSubscription` keep-warm hook.
 *
 * @param updates - Price updates received from the WebSocket.
 * @returns The timestamp applied to the updates.
 */
const writePriceUpdates = (updates: PriceUpdate[]): number => {
  const updatedAt = Date.now();
  pruneExpiredCachedPrices(updatedAt);
  updates.forEach((update) => {
    liveMarketPriceCache.set(update.tokenId, { price: update, updatedAt });
  });
  updates.forEach((update) => notifyToken(update.tokenId));
  return updatedAt;
};

export const __resetLiveMarketPricesCacheForTest = () => {
  liveMarketPriceCache.clear();
  tokenListeners.clear();
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

    const updatedAt = writePriceUpdates(updates);

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

    // Connection status is sampled once on (re)subscribe. We intentionally do
    // NOT poll on an interval: nothing consumes `isConnected` reactively, and a
    // per-instance 1s interval re-rendered every subscriber (e.g. every game
    // outcome card) once per second for an unused value.
    const status = PredictController.getConnectionStatus();
    setIsConnected(status.marketConnected);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
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

const EMPTY_LIVE_PRICES: Map<string, PriceUpdate> = new Map();

/**
 * Keeps a single WebSocket market-price subscription warm for the given tokens
 * and feeds the shared store, without holding any React state itself (so it
 * does not re-render its host on every tick). Pair this with `useLivePrice` /
 * `useLivePrices` in descendants so each consumer re-renders only when its own
 * token changes.
 *
 * @param tokenIds - Token IDs to keep subscribed.
 * @param options - Configuration options (enabled: boolean).
 */
export const useLiveMarketPricesSubscription = (
  tokenIds: string[],
  options: UseLiveMarketPricesOptions = {},
): void => {
  const { enabled = true } = options;

  const tokenIdsKey = useMemo(
    () => JSON.stringify([...tokenIds].sort((a, b) => a.localeCompare(b))),
    [tokenIds],
  );
  // Stable by content (tokenIdsKey) rather than array identity, so we do not
  // resubscribe when a parent re-creates the same token list.
  const sortedTokenIds = useMemo(
    () => JSON.parse(tokenIdsKey) as string[],
    [tokenIdsKey],
  );

  useEffect(() => {
    if (!enabled || sortedTokenIds.length === 0) {
      return undefined;
    }

    const { PredictController } = Engine.context;
    return PredictController.subscribeToMarketPrices(
      sortedTokenIds,
      writePriceUpdates,
    );
  }, [enabled, sortedTokenIds]);
};

/**
 * Reads the live price for a single token from the shared store and re-renders
 * the caller only when that token's price changes. Does NOT open a WebSocket
 * subscription itself; a parent must keep the token subscribed (e.g. via
 * `useLiveMarketPricesSubscription` or `useLiveMarketPrices`).
 *
 * @param tokenId - The token ID to read, or undefined to read nothing.
 * @returns The latest live price for the token, if any.
 */
export const useLivePrice = (
  tokenId: string | undefined,
): PriceUpdate | undefined => {
  const subscribe = useCallback(
    (listener: () => void) =>
      tokenId ? subscribeToken(tokenId, listener) : () => undefined,
    [tokenId],
  );
  const getSnapshot = useCallback(
    () => (tokenId ? getLivePriceSnapshot(tokenId) : undefined),
    [tokenId],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

/**
 * Reads live prices for multiple tokens from the shared store. Returns a stable
 * Map reference that only changes identity when one of the requested tokens'
 * prices actually changes, so a consuming card re-renders just for its own
 * tokens. Like `useLivePrice`, this is read-only: a parent must keep the tokens
 * subscribed.
 *
 * @param tokenIds - Token IDs to read.
 * @returns A Map of tokenId to latest live price.
 */
export const useLivePrices = (tokenIds: string[]): Map<string, PriceUpdate> => {
  const tokenIdsKey = useMemo(
    () => JSON.stringify([...tokenIds].sort((a, b) => a.localeCompare(b))),
    [tokenIds],
  );
  // Stable by content (tokenIdsKey) rather than array identity.
  const sortedTokenIds = useMemo(
    () => JSON.parse(tokenIdsKey) as string[],
    [tokenIdsKey],
  );

  const snapshotRef = useRef<{ sig: string; map: Map<string, PriceUpdate> }>({
    sig: '',
    map: EMPTY_LIVE_PRICES,
  });

  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubscribers = sortedTokenIds.map((id) =>
        subscribeToken(id, listener),
      );
      return () => unsubscribers.forEach((unsub) => unsub());
    },
    [sortedTokenIds],
  );

  const getSnapshot = useCallback(() => {
    let sig = '';
    const map = new Map<string, PriceUpdate>();
    sortedTokenIds.forEach((id) => {
      const price = getLivePriceSnapshot(id);
      if (price) {
        map.set(id, price);
        sig += `${id}:${price.price}:${price.bestAsk}:${price.bestBid};`;
      }
    });
    // Preserve referential stability so useSyncExternalStore does not loop:
    // only swap the cached Map when the derived signature changes.
    if (sig !== snapshotRef.current.sig) {
      snapshotRef.current = { sig, map };
    }
    return snapshotRef.current.map;
  }, [sortedTokenIds]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
