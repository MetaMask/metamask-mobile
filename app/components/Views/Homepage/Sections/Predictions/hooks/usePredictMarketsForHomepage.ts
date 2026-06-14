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

interface UsePredictMarketsForHomepageOptions {
  enabled?: boolean;
}

/**
 * Lightweight wrapper around the Predict team's usePredictMarketData hook,
 * adapted for homepage display with trending markets.
 *
 * Pass `enabled: false` when the Predict feature flag is off so the parent can
 * keep `PredictionsSection` mounted without triggering market fetches.
 *
 * @param limit - Maximum number of markets to return (default: 5)
 * @param options - Optional `enabled` gate (default true)
 * @returns Object with markets, isLoading, error, refetch
 */
export const usePredictMarketsForHomepage = (
  limit = 5,
  options: UsePredictMarketsForHomepageOptions = {},
): UsePredictMarketsForHomepageResult => {
  const { enabled = true } = options;
  const { marketData, isFetching, error, refetch } = usePredictMarketData({
    category: 'trending',
    pageSize: limit,
    enabled,
  });

  return {
    markets: marketData,
    isLoading: isFetching,
    error,
    refetch,
  };
};

export default usePredictMarketsForHomepage;
