import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import type { MarketInfo } from '../../../../../UI/Perps/controllers/types';
import { selectPerpsEnabledFlag } from '../../../../../UI/Perps';

/**
 * Result interface for usePerpsMarketsReadOnly hook
 */
export interface UsePerpsMarketsReadOnlyResult {
  /** Array of market data */
  markets: MarketInfo[];
  /** Whether the hook is still loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh function to manually refetch data */
  refresh: () => Promise<void>;
}

// Module-level cache for markets
// Persists across component mounts/unmounts for efficient re-use
interface CacheEntry {
  markets: MarketInfo[];
  timestamp: number;
}

let marketsCache: CacheEntry | null = null;

// Cache TTL: 5 minutes (same as usePerpsMarketForAsset)
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Clear the cache - exported for testing purposes only
 * @internal
 */
export const _clearMarketsCache = (): void => {
  marketsCache = null;
};

/**
 * Popular perps symbols for sorting priority
 * Markets matching these symbols will appear first
 */
const POPULAR_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOGE',
  'AVAX',
  'LINK',
  'SUI',
];

/**
 * Sort markets by popularity (known popular symbols first, then alphabetically)
 */
const sortByPopularity = (markets: MarketInfo[]): MarketInfo[] =>
  [...markets].sort((a, b) => {
    const aIndex = POPULAR_SYMBOLS.indexOf(a.name.toUpperCase());
    const bIndex = POPULAR_SYMBOLS.indexOf(b.name.toUpperCase());

    // If both are popular, sort by popularity order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // Popular symbols come first
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    // Otherwise sort alphabetically
    return a.name.localeCompare(b.name);
  });

/**
 * usePerpsMarketsReadOnly Hook
 *
 * Fetches perps markets in lightweight readOnly mode.
 * Designed for homepage/discovery use cases where live price updates are not needed.
 *
 * Key Features:
 * - Module-level caching (5 min TTL) to avoid repeated API calls
 * - Uses readOnly mode - works without full perps initialization (no wallet/WebSocket)
 * - Sorted by popularity (BTC, ETH, SOL first)
 * - Returns basic market info only (no live prices)
 *
 * @param limit - Maximum number of markets to return (default: 5)
 * @returns Object with markets, isLoading, error, refresh
 *
 * @example
 * ```tsx
 * const { markets, isLoading, error, refresh } = usePerpsMarketsReadOnly(5);
 * ```
 */
export const usePerpsMarketsReadOnly = (
  limit = 5,
): UsePerpsMarketsReadOnlyResult => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  // Track if component is still mounted
  const isMountedRef = useRef(true);

  // Track current request to prevent stale responses
  const requestIdRef = useRef(0);

  const [state, setState] = useState<{
    markets: MarketInfo[];
    isLoading: boolean;
    error: string | null;
  }>(() => {
    // Initialize from cache if available
    if (marketsCache && Date.now() - marketsCache.timestamp < CACHE_TTL_MS) {
      return {
        markets: sortByPopularity(marketsCache.markets).slice(0, limit),
        isLoading: false,
        error: null,
      };
    }

    return {
      markets: [],
      isLoading: isPerpsEnabled,
      error: null,
    };
  });

  const fetchMarkets = useCallback(async () => {
    if (!isPerpsEnabled) {
      setState({
        markets: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    // Capture current request ID to detect stale responses
    const currentRequestId = ++requestIdRef.current;

    // Check cache first
    if (marketsCache && Date.now() - marketsCache.timestamp < CACHE_TTL_MS) {
      if (isMountedRef.current) {
        setState({
          markets: sortByPopularity(marketsCache.markets).slice(0, limit),
          isLoading: false,
          error: null,
        });
      }
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Lightweight API call with readOnly mode
      // readOnly: true bypasses full initialization (no wallet/WebSocket needed)
      const controller = Engine.context.PerpsController;
      const markets = await controller.getMarkets({ readOnly: true });

      // Verify this response matches current request
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      // Cache the result
      marketsCache = {
        markets,
        timestamp: Date.now(),
      };

      // Sort by popularity and limit
      const sortedMarkets = sortByPopularity(markets).slice(0, limit);

      setState({
        markets: sortedMarkets,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      // Verify this error is for current request
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      setState({
        markets: [],
        isLoading: false,
        error:
          err instanceof Error ? err.message : 'Failed to fetch perps markets',
      });
    }
  }, [isPerpsEnabled, limit]);

  // Refresh function that bypasses cache
  const refresh = useCallback(async () => {
    _clearMarketsCache(); // Clear cache to force refetch
    await fetchMarkets();
  }, [fetchMarkets]);

  // Effect to fetch markets on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!isPerpsEnabled) {
      setState({
        markets: [],
        isLoading: false,
        error: null,
      });
      return () => {
        isMountedRef.current = false;
      };
    }

    fetchMarkets();

    return () => {
      isMountedRef.current = false;
    };
  }, [isPerpsEnabled, fetchMarkets]);

  return {
    markets: state.markets,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
};

export default usePerpsMarketsReadOnly;
