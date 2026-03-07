import { useCallback, useEffect, useRef } from 'react';
import { useQueries, UseQueryResult } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import {
  PredictPriceHistoryInterval,
  PredictPriceHistoryPoint,
} from '../types';

export interface UsePredictPriceHistoryOptions {
  marketIds: string[];
  interval?: PredictPriceHistoryInterval;
  startTs?: number;
  endTs?: number;
  fidelity?: number;
  enabled?: boolean;
}

export interface UsePredictPriceHistoryResult {
  priceHistories: PredictPriceHistoryPoint[][];
  isFetching: boolean;
  errors: (string | null)[];
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage price history data for multiple markets.
 * Returns a curated interface (flattened histories, consolidated isFetching,
 * batched refetch) shared by useChartData and PredictGameChart.
 */
export const usePredictPriceHistory = (
  options: UsePredictPriceHistoryOptions,
): UsePredictPriceHistoryResult => {
  const {
    marketIds = [],
    fidelity,
    interval = PredictPriceHistoryInterval.ONE_DAY,
    startTs,
    endTs,
    enabled = true,
  } = options;

  const queries = useQueries({
    queries: marketIds.map((marketId) => ({
      ...predictQueries.priceHistory.options({
        marketId,
        interval,
        fidelity,
        startTs,
        endTs,
      }),
      enabled: enabled && marketIds.length > 0,
    })),
  });

  const priceHistories = queries.map((q) => q.data ?? []);
  const isFetching = queries.some((q) => q.isFetching);
  const errors = queries.map((q) => {
    if (!q.error) return null;
    return q.error instanceof Error
      ? q.error.message
      : 'Failed to fetch price history';
  });

  // Track which market errors have already been reported to Sentry
  const reportedErrorsRef = useRef<Set<string>>(new Set());

  const queryErrorsKey = queries.map((q) => q.error?.message ?? '').join(',');

  useEffect(() => {
    queries.forEach((q, i) => {
      const marketId = marketIds[i];
      if (q.error && marketId && !reportedErrorsRef.current.has(marketId)) {
        reportedErrorsRef.current.add(marketId);
        Logger.error(ensureError(q.error), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictPriceHistory',
          },
          context: {
            name: 'usePredictPriceHistory',
            data: {
              method: 'loadPriceHistory',
              action: 'price_history_load_single',
              operation: 'data_fetching',
              marketId,
              interval,
              fidelity,
            },
          },
        });
      } else if (!q.error && marketId) {
        reportedErrorsRef.current.delete(marketId);
      }
    });
    // Stable string that only changes when actual errors change, avoiding
    // re-runs caused by useQueries returning a new array reference each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryErrorsKey, marketIds, interval, fidelity]);

  // Use a ref so refetch has a stable identity across renders
  const queriesRef =
    useRef<UseQueryResult<PredictPriceHistoryPoint[]>[]>(queries);
  queriesRef.current = queries;

  const refetch = useCallback(async () => {
    await Promise.all(queriesRef.current.map((q) => q.refetch()));
  }, []);

  return {
    priceHistories: enabled ? priceHistories : [],
    isFetching,
    errors: enabled ? errors : [],
    refetch,
  };
};

export { PredictPriceHistoryInterval };
