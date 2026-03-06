import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePredictMarketData } from '../../../../../UI/Predict/hooks/usePredictMarketData';
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

/**
 * Lightweight wrapper around the Predict team's usePredictMarketData hook,
 * adapted for homepage display with trending markets.
 *
 * Delegates all caching, retry logic, and error handling to the underlying hook.
 *
 * @param limit - Maximum number of markets to return (default: 5)
 * @returns Object with markets, isLoading, error, refresh
 */
export const usePredictMarketsForHomepage = (
  limit = 5,
): UsePredictMarketsForHomepageResult => {
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  const { marketData, isFetching, error, refetch } = usePredictMarketData({
    category: 'trending',
    pageSize: limit,
  });

  const markets = useMemo(
    () => (isPredictEnabled ? marketData.slice(0, limit) : []),
    [isPredictEnabled, marketData, limit],
  );

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    markets,
    isLoading: isFetching,
    error,
    refresh,
  };
};

export default usePredictMarketsForHomepage;
