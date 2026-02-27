import { useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import { PriceQuery, GetPriceResponse, Side } from '../types';

export interface UsePredictPricesOptions {
  queries: PriceQuery[];
  enabled?: boolean;
  /**
   * Optional polling interval in milliseconds.
   * If provided, prices will be refetched at this interval.
   * Unlike the previous setTimeout-based implementation, this uses
   * React Query's `refetchInterval` which continues polling even
   * after transient errors.
   */
  pollingInterval?: number;
}

export interface UsePredictPricesResult {
  prices: GetPriceResponse;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const EMPTY_PRICES: GetPriceResponse = { providerId: '', results: [] };

/**
 * Hook to fetch and manage current prices for multiple tokens.
 *
 * Backed by React Query — results are cached, deduplicated, and
 * structurally compared by query key (replacing the manual
 * `JSON.stringify(queries)` approach).
 */
export const usePredictPrices = (
  options: UsePredictPricesOptions,
): UsePredictPricesResult => {
  const { queries = [], enabled = true, pollingInterval } = options;

  const isEnabled = enabled && queries.length > 0;

  const { data, isFetching, error, refetch } = useQuery({
    ...predictQueries.prices.options({ queries }),
    enabled: isEnabled,
    refetchInterval: pollingInterval ?? false,
  });

  return {
    prices: isEnabled ? (data ?? EMPTY_PRICES) : EMPTY_PRICES,
    isFetching,
    error: isEnabled ? (error?.message ?? null) : null,
    refetch: async () => {
      await refetch();
    },
  };
};

export { Side };
