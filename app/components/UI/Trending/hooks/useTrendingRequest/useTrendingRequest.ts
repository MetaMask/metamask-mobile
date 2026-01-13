import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import {
  getTrendingTokens,
  SortTrendingBy,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';

/**
 * Polling interval in milliseconds (5 minutes)
 */
const POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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
    minLiquidity = 0,
    minVolume24hUsd = 0,
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

  // Silent fetch function for polling - doesn't set loading state or error
  const silentFetchTrendingTokens = useCallback(async () => {
    if (!stableChainIds.length) {
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;

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
      // Only update state if this is still the current request and silently update results
      if (currentRequestId === requestIdRef.current) {
        setResults(resultsToStore);
      }
    } catch (err) {
      // Silently fail - don't update error state or loading state during polling
      // Only log if needed for debugging
    }
  }, [
    stableChainIds,
    sortBy,
    minLiquidity,
    minVolume24hUsd,
    maxVolume24hUsd,
    minMarketCap,
    maxMarketCap,
  ]);

  const fetchTrendingTokens = useCallback(async () => {
    if (!stableChainIds.length) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

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
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setError(err as Error);
        setResults([]);
      }
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    stableChainIds,
    sortBy,
    minLiquidity,
    minVolume24hUsd,
    maxVolume24hUsd,
    minMarketCap,
    maxMarketCap,
  ]);

  // Automatically trigger fetch when options change
  useEffect(() => {
    fetchTrendingTokens();
  }, [fetchTrendingTokens]);

  // Track if initial load has completed successfully and if polling is active
  const initialLoadCompleteRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mark initial load as complete when loading finishes successfully
  useEffect(() => {
    if (!isLoading && !initialLoadCompleteRef.current) {
      // Only mark as complete if we have results or no error (successful load)
      if (results.length > 0 || !error) {
        initialLoadCompleteRef.current = true;
      }
    }
  }, [isLoading, results.length, error]);

  // Set up polling every 5 minutes for silent refresh
  // Only start polling after initial load completes successfully
  useEffect(() => {
    // Don't start polling if:
    // - Still loading
    // - Initial load hasn't completed successfully
    // - Initial load failed with no results
    if (
      isLoading ||
      !initialLoadCompleteRef.current ||
      (!results.length && error)
    ) {
      return;
    }

    // Clear any existing interval before creating a new one
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Start polling
    pollingIntervalRef.current = setInterval(() => {
      silentFetchTrendingTokens();
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, results.length, error, silentFetchTrendingTokens]);

  return {
    results,
    isLoading,
    error,
    fetch: fetchTrendingTokens,
  };
};
