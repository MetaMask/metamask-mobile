import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { ensureError } from '../utils/predictErrorHandler';
import type { PriceQuery, GetPriceResponse } from '../types';

/**
 * Query key factory for Predict price queries.
 *
 * - `all()` — prefix key for invalidating every price entry at once.
 * - `byQueries(queries)` — unique key for a specific set of price queries.
 * React Query performs structural comparison, so identical query arrays
 * produce matching keys automatically.
 */
export const predictPricesKeys = {
  all: () => ['predict', 'prices'] as const,
  byQueries: (queries: PriceQuery[]) =>
    [...predictPricesKeys.all(), queries] as const,
};

export const predictPricesOptions = ({ queries }: { queries: PriceQuery[] }) =>
  queryOptions({
    queryKey: predictPricesKeys.byQueries(queries),
    queryFn: async (): Promise<GetPriceResponse> => {
      try {
        const controller = Engine.context.PredictController;
        return await controller.getPrices({ queries });
      } catch (err) {
        throw ensureError(err);
      }
    },
    staleTime: 5_000,
  });
