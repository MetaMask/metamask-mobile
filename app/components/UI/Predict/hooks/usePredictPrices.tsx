import { useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import { PriceQuery, Side } from '../types';

export interface UsePredictPricesOptions {
  queries: PriceQuery[];
  enabled?: boolean;
  /**
   * Optional polling interval in milliseconds.
   * If provided, prices will be refetched at this interval.
   * Uses React Query's `refetchInterval` which continues polling
   * even after transient errors.
   */
  pollingInterval?: number;
}

/**
 * Hook to fetch current prices for multiple tokens.
 *
 * Returns the raw React Query result -- consumers are responsible for
 * handling `undefined` data, formatting errors, etc. This matches the
 * pattern used by sibling hooks (usePredictBalance, usePredictPositions).
 */
export function usePredictPrices(options: UsePredictPricesOptions) {
  const { queries = [], enabled = true, pollingInterval } = options;

  return useQuery({
    ...predictQueries.prices.options({ queries }),
    enabled: enabled && queries.length > 0,
    refetchInterval: pollingInterval ?? false,
  });
}

export { Side };
