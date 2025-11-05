import { useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { CaipChainId } from '@metamask/utils';
import {
  getTrendingTokens,
  SortTrendingBy,
} from '@metamask/assets-controllers';
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
  const fetchTrendingTokens = useCallback(async () => {
    if (!options.chainIds.length) {
      return;
    }

    await getTrendingTokens(options);
  }, [options]);

  return useMemo(
    () => debounce(fetchTrendingTokens, DEBOUNCE_WAIT),
    [fetchTrendingTokens],
  );
};
