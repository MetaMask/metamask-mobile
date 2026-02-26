import { useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import { PredictMarket } from '../types';

export interface UsePredictMarketOptions {
  id?: string | number;
  enabled?: boolean;
}

export interface UsePredictMarketResult {
  market: PredictMarket | null;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch detailed Predict market information.
 *
 * Backed by React Query — results are cached, deduplicated, and
 * automatically revalidated on stale-while-revalidate semantics.
 */
export const usePredictMarket = (
  options: UsePredictMarketOptions = {},
): UsePredictMarketResult => {
  const { id, enabled = true } = options;
  const marketId = id !== undefined && id !== null ? String(id) : '';

  const isEnabled = enabled && !!marketId;

  const { data, isFetching, error, refetch } = useQuery({
    ...predictQueries.market.options({ marketId }),
    enabled: isEnabled,
  });

  return {
    market: isEnabled ? (data ?? null) : null,
    isFetching,
    error: isEnabled ? (error?.message ?? null) : null,
    refetch: async () => {
      await refetch();
    },
  };
};
