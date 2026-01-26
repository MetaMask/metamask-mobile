import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import {
  getTrendingTokens,
  SortTrendingBy,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';

// Default filter constants for trending tokens
export const TRENDING_MIN_LIQUIDITY = 200000;
export const TRENDING_MIN_VOLUME_24H = 1000000;

/**
 * Polling interval in milliseconds (5 minutes)
 */
const POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Options for fetching trending tokens
 */
interface FetchOptions {
  /**
   * If true, the fetch will silently update results without setting loading state or error.
   * On success: updates results
   * On failure: does nothing (preserves existing results and error state)
   */
  isSilentUpdate?: boolean;
}

/**
 * Hook for handling trending tokens request
 * @returns {Object} An object containing the trending tokens results, loading state, error, and a function to trigger fetch
 */
export const useTrendingRequest = (options: {
  chainIds?: CaipChainId[];
  sortBy?: SortTrendingBy;
  minLiquidity?: number;
  minVolume24hUsd?: number;
  maxVolume24hUsd?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
}) => {
  const {
    chainIds: providedChainIds = [],
    sortBy = 'h24_trending',
    minLiquidity = TRENDING_MIN_LIQUIDITY,
    minVolume24hUsd = TRENDING_MIN_VOLUME_24H,
    maxVolume24hUsd,
    minMarketCap = 0,
    maxMarketCap,
  } = options;

  // Use provided chainIds or default to trending networks
  const chainIds = useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }
    return TRENDING_NETWORKS_LIST.map((network) => network.caipChainId);
  }, [providedChainIds]);

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);

  // Stabilize the chainIds array reference to prevent unnecessary re-fetching
  const stableChainIds = useStableArray(chainIds);

  const [results, setResults] = useState<
    Awaited<ReturnType<typeof getTrendingTokens>>
  >([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<Error | null>(null);

  const fetchTrendingTokens = useCallback(
    async (fetchOptions: FetchOptions = {}) => {
      const { isSilentUpdate = false } = fetchOptions;

      if (!stableChainIds.length) {
        if (!isSilentUpdate) {
          setResults([]);
          setIsLoading(false);
        }
        return;
      }

      // Increment request ID to mark this as the current request
      const currentRequestId = ++requestIdRef.current;

      if (!isSilentUpdate) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const resultsToStore = await getTrendingTokens({
          chainIds: stableChainIds,
          sortBy,
          minLiquidity,
          minVolume24hUsd,
          maxVolume24hUsd,
          minMarketCap,
          maxMarketCap,
          excludeLabels: ['stable_coin', 'blue_chip'],
        });
        // Only update state if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setResults(resultsToStore);
        }
      } catch (err) {
        // Only update state if this is still the current request and not a silent update
        if (currentRequestId === requestIdRef.current && !isSilentUpdate) {
          setError(err as Error);
          setResults([]);
        }
        // Silent updates silently fail - don't update error state or results
      } finally {
        // Only update loading state if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      stableChainIds,
      sortBy,
      minLiquidity,
      minVolume24hUsd,
      maxVolume24hUsd,
      minMarketCap,
      maxMarketCap,
    ],
  );

  // Automatically trigger fetch when options change
  useEffect(() => {
    fetchTrendingTokens();
  }, [fetchTrendingTokens]);

  // Track if initial load has completed successfully
  const initialLoadCompleteRef = useRef(false);
  useEffect(() => {
    if (!isLoading && !initialLoadCompleteRef.current) {
      if (results.length > 0 || !error) {
        initialLoadCompleteRef.current = true;
      }
    }
  }, [isLoading, results.length, error]);

  // Refresh interval effect
  useEffect(() => {
    // Don't poll if we are loading, or initial fetch did not return data
    if (
      isLoading ||
      !initialLoadCompleteRef.current ||
      (!results.length && error)
    ) {
      return;
    }

    const pollingInterval = setInterval(() => {
      fetchTrendingTokens({ isSilentUpdate: true });
    }, POLLING_INTERVAL_MS);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [isLoading, results.length, error, fetchTrendingTokens]);

  return {
    results,
    isLoading,
    error,
    fetch: fetchTrendingTokens,
  };
};
