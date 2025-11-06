import { useCallback, useMemo, useEffect, useState } from 'react';
import { debounce } from 'lodash';
import { CaipChainId } from '@metamask/utils';
import {
  getTrendingTokens,
  SortTrendingBy,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
export const DEBOUNCE_WAIT = 500;

/**
 * Hook for handling trending tokens request
 * @returns {Object} An object containing the trending tokens results, loading state, error, and a function to trigger fetch
 */
export const useTrendingRequest = (options: {
  chainIds: CaipChainId[];
  sortBy?: SortTrendingBy;
  minLiquidity?: number;
  minVolume24hUsd?: number;
  maxVolume24hUsd?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
}) => {
  const {
    chainIds,
    sortBy,
    minLiquidity,
    minVolume24hUsd,
    maxVolume24hUsd,
    minMarketCap,
    maxMarketCap,
  } = options;

  const [results, setResults] = useState<Awaited<
    ReturnType<typeof getTrendingTokens>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const trendingResults = await getTrendingTokens(memoizedOptions);
      setResults(trendingResults || null);
    } catch (err) {
      setError(err as Error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedOptions]);

  const debouncedFetchTrendingTokens = useMemo(
    () => debounce(fetchTrendingTokens, DEBOUNCE_WAIT),
    [fetchTrendingTokens],
  );

  // Cleanup debounced function on unmount or when dependencies change
  useEffect(
    () => () => {
      debouncedFetchTrendingTokens.cancel();
    },
    [debouncedFetchTrendingTokens],
  );

  // Automatically trigger fetch when options change
  useEffect(() => {
    debouncedFetchTrendingTokens();
  }, [debouncedFetchTrendingTokens]);

  return {
    results: results || [],
    isLoading,
    error,
    fetch: debouncedFetchTrendingTokens,
  };
};
