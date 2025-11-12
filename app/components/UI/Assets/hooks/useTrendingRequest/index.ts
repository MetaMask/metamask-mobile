import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { debounce } from 'lodash';
import { CaipChainId } from '@metamask/utils';
import {
  getTrendingTokens,
  SortTrendingBy,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import {
  NetworkType,
  useNetworksByNamespace,
  ProcessedNetwork,
} from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworksToUse } from '../../../../hooks/useNetworksToUse/useNetworksToUse';
export const DEBOUNCE_WAIT = 500;

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
    sortBy,
    minLiquidity,
    minVolume24hUsd,
    maxVolume24hUsd,
    minMarketCap,
    maxMarketCap,
  } = options;

  // Get default networks when chainIds is empty
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });

  const { networksToUse } = useNetworksToUse({
    networks,
    networkType: NetworkType.Popular,
  });

  // Use provided chainIds or default to popular networks
  const chainIds = useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }
    return networksToUse.map(
      (network: ProcessedNetwork) => network.caipChainId,
    );
  }, [providedChainIds, networksToUse]);

  const [results, setResults] = useState<Awaited<
    ReturnType<typeof getTrendingTokens>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);

  // Stabilize the chainIds array reference to prevent unnecessary re-memoization
  const stableChainIds = useStableArray(chainIds);

  // Memoize the options object to ensure stable reference
  const memoizedOptions = useMemo(
    () => ({
      chainIds: stableChainIds,
      sortBy,
      minLiquidity,
      minVolume24hUsd,
      maxVolume24hUsd,
      minMarketCap,
      maxMarketCap,
    }),
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

  const fetchTrendingTokens = useCallback(async () => {
    if (!memoizedOptions.chainIds.length) {
      // Increment request ID to invalidate any pending requests
      ++requestIdRef.current;
      setResults(null);
      setIsLoading(false);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const trendingResults = await getTrendingTokens(memoizedOptions);
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setResults(trendingResults || null);
      }
    } catch (err) {
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setError(err as Error);
        setResults(null);
      }
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [memoizedOptions]);

  const debouncedFetchTrendingTokens = useMemo(
    () => debounce(fetchTrendingTokens, DEBOUNCE_WAIT),
    [fetchTrendingTokens],
  );

  // Automatically trigger fetch when options change
  // Cancel previous debounced function BEFORE triggering new one to prevent race conditions
  useEffect(() => {
    // Cancel any pending debounced calls from previous render
    debouncedFetchTrendingTokens.cancel();

    // If chainIds is empty, don't trigger fetch
    if (!stableChainIds.length) {
      return;
    }

    // Trigger new fetch
    debouncedFetchTrendingTokens();

    // Cleanup: cancel on unmount or when dependencies change
    return () => {
      debouncedFetchTrendingTokens.cancel();
    };
  }, [debouncedFetchTrendingTokens, stableChainIds]);

  return {
    results: results || [],
    isLoading,
    error,
    fetch: debouncedFetchTrendingTokens,
  };
};
