import { useQueries } from '@tanstack/react-query';
import { predictQueries } from '../queries';
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

  const refetch = async () => {
    await Promise.all(queries.map((q) => q.refetch()));
  };

  return {
    priceHistories: enabled ? priceHistories : [],
    isFetching,
    errors: enabled ? errors : [],
    refetch,
  };
};

export { PredictPriceHistoryInterval };
