import { usePredictMarketData } from '../../../../../UI/Predict/hooks/usePredictMarketData';
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
  /** Refetch function to manually refetch data */
  refetch: () => Promise<unknown>;
}

/**
 * Lightweight wrapper around the Predict team's usePredictMarketData hook,
 * adapted for homepage display with trending markets.
 *
 * The feature flag check is handled at the UI level (Homepage conditionally
 * renders the Predictions section), so this hook assumes it is only called
 * when predictions are enabled.
 *
 * @param limit - Maximum number of markets to return (default: 5)
 * @returns Object with markets, isLoading, error, refetch
 */
export const usePredictMarketsForHomepage = (
  limit = 5,
): UsePredictMarketsForHomepageResult => {
  const { marketData, isFetching, error, refetch } = usePredictMarketData({
    category: 'trending',
    pageSize: limit,
  });

  return {
    markets: marketData,
    isLoading: isFetching,
    error,
    refetch,
  };
};

export default usePredictMarketsForHomepage;
