import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
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

  useEffect(() => {
    if (!error) return;

    Logger.error(ensureError(error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictPrices',
      },
      context: {
        name: 'usePredictPrices',
        data: {
          method: 'loadPrices',
          action: 'prices_load',
          operation: 'data_fetching',
        },
      },
    });
  }, [error]);

  const hasData = isEnabled && !error && data;

  return {
    prices: hasData ? data : EMPTY_PRICES,
    isFetching,
    error: isEnabled ? (error?.message ?? null) : null,
    refetch: async () => {
      await refetch();
    },
  };
};

export { Side };
