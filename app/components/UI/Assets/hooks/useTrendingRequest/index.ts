import { useCallback, useMemo, useEffect } from 'react';
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
 * @returns {Function} A debounced function to fetch trending tokens
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
      return;
    }

    await getTrendingTokens(memoizedOptions);
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

  return debouncedFetchTrendingTokens;
};
