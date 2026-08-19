import { useCallback, useEffect, useMemo, useRef } from 'react';
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
      enabled,
    })),
  });

  const marketIdsKey = marketIds.join(',');
  const dataUpdatedAtKey = queries.map((q) => q.dataUpdatedAt).join(',');
  const queryErrorKey = queries.map((q) => q.error).join(',');

  const priceHistories = useMemo(
    () => queries.map((q) => q.data ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataUpdatedAtKey, marketIdsKey],
  );
  const isFetching = queries.some((q) => q.isFetching);
  const errors = useMemo(
    () =>
      queries.map((q) => {
        if (!q.error) return null;
        return q.error instanceof Error
          ? q.error.message
          : 'Failed to fetch price history';
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryErrorKey, marketIdsKey],
  );

  // Track which market errors have already been reported to Sentry
  const reportedErrorsRef = useRef<Set<string>>(new Set());

  // Capture query params in a ref so the error-reporting effect only fires
  // when errors actually change, not when interval/fidelity/timestamps shift.
  const queryParamsRef = useRef({ interval, fidelity, startTs, endTs });
  queryParamsRef.current = { interval, fidelity, startTs, endTs };

  useEffect(() => {
    // Clean up reported errors for market IDs that are no longer in the list
    const currentMarketIds = new Set(marketIds);
    for (const id of reportedErrorsRef.current) {
      if (!currentMarketIds.has(id)) {
        reportedErrorsRef.current.delete(id);
      }
    }

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
              ...queryParamsRef.current,
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
  }, [queryErrorKey, marketIdsKey]);

  // Use refs so refetch has a stable identity across renders
  const queriesRef =
    useRef<UseQueryResult<PredictPriceHistoryPoint[]>[]>(queries);
  queriesRef.current = queries;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const refetch = useCallback(async () => {
    if (!enabledRef.current) return;
    await Promise.all(queriesRef.current.map((q) => q.refetch()));
  }, []);

  return {
    priceHistories: enabled ? priceHistories : [],
    isFetching: enabled ? isFetching : false,
    errors: enabled ? errors : [],
    refetch,
  };
};

export { PredictPriceHistoryInterval };
