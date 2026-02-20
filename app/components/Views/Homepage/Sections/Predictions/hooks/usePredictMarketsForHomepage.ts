import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { selectPredictEnabledFlag } from '../../../../../UI/Predict';
import type { PredictMarket } from '../../../../../UI/Predict/types';

/**
 * Result interface for usePredictMarketsForHomepage hook
 */
export interface UsePredictMarketsForHomepageResult {
  /** Array of market data */
  markets: PredictMarket[];
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
  markets: PredictMarket[];
  timestamp: number;
}

let marketsCache: CacheEntry | null = null;

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Clear the cache - exported for testing purposes only
 * @internal
 */
export const _clearMarketsCache = (): void => {
  marketsCache = null;
};

/**
 * usePredictMarketsForHomepage Hook
 *
 * Fetches trending prediction markets for homepage display.
 * Designed for homepage/discovery use cases with module-level caching.
 *
 * Key Features:
 * - Module-level caching (5 min TTL) to avoid repeated API calls
 * - Uses PredictController.getMarkets() with category: 'trending'
 * - Returns limited results for carousel display
 *
 * @param limit - Maximum number of markets to return (default: 5)
 * @returns Object with markets, isLoading, error, refresh
 *
 * @example
 * ```tsx
 * const { markets, isLoading, error, refresh } = usePredictMarketsForHomepage(5);
 * ```
 */
export const usePredictMarketsForHomepage = (
  limit = 5,
): UsePredictMarketsForHomepageResult => {
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  // Track if component is still mounted
  const isMountedRef = useRef(true);

  // Track current request to prevent stale responses
  const requestIdRef = useRef(0);

  const [state, setState] = useState<{
    markets: PredictMarket[];
    isLoading: boolean;
    error: string | null;
  }>(() => {
    // Initialize from cache if available
    if (marketsCache && Date.now() - marketsCache.timestamp < CACHE_TTL_MS) {
      return {
        markets: marketsCache.markets.slice(0, limit),
        isLoading: false,
        error: null,
      };
    }

    return {
      markets: [],
      isLoading: isPredictEnabled,
      error: null,
    };
  });

  const fetchMarkets = useCallback(async () => {
    if (!isPredictEnabled) {
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
          markets: marketsCache.markets.slice(0, limit),
          isLoading: false,
          error: null,
        });
      }
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!Engine || !Engine.context) {
        throw new Error('Engine not initialized');
      }

      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('Predict controller not available');
      }

      const markets = await controller.getMarkets({
        category: 'trending',
        limit,
      });

      // Verify this response matches current request
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      if (!markets || !Array.isArray(markets)) {
        setState({
          markets: [],
          isLoading: false,
          error: null,
        });
        return;
      }

      // Cache the result
      marketsCache = {
        markets,
        timestamp: Date.now(),
      };

      setState({
        markets: markets.slice(0, limit),
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
          err instanceof Error
            ? err.message
            : 'Failed to fetch prediction markets',
      });
    }
  }, [isPredictEnabled, limit]);

  // Refresh function that bypasses cache
  const refresh = useCallback(async () => {
    marketsCache = null; // Clear cache to force refetch
    await fetchMarkets();
  }, [fetchMarkets]);

  // Effect to fetch markets on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!isPredictEnabled) {
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
  }, [isPredictEnabled, fetchMarkets]);

  return {
    markets: state.markets,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
};

export default usePredictMarketsForHomepage;
