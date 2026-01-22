import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import {
  PredictPriceHistoryInterval,
  PredictPriceHistoryPoint,
} from '../types';

// Target number of samples for MAX timeframe to optimize performance
const MAX_HISTORY_SAMPLES = 100;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface UsePredictPriceHistoryOptions {
  marketIds: string[];
  interval?: PredictPriceHistoryInterval;
  startTs?: number;
  endTs?: number;
  fidelity?: number;
  providerId?: string;
  enabled?: boolean;
  /** Market start date for dynamic fidelity calculation when interval is MAX */
  marketStartDate?: string;
}

export interface UsePredictPriceHistoryResult {
  priceHistories: PredictPriceHistoryPoint[][];
  isFetching: boolean;
  errors: (string | null)[];
  refetch: () => Promise<void>;
}

/**
 * Calculates dynamic fidelity for MAX timeframe based on market start date
 * to limit the number of data points returned from the API.
 */
const calculateMaxFidelity = (marketStartDate?: string): number => {
  const startTs = marketStartDate
    ? new Date(marketStartDate).getTime()
    : Date.now() - 365 * DAY_IN_MS; // Fallback to 1 year ago if no startDate

  const rangeMinutes = (Date.now() - startTs) / (60 * 1000);
  // Calculate fidelity to get approximately MAX_HISTORY_SAMPLES points
  // Ensure fidelity is at least 1 minute
  return Math.max(1, Math.ceil(rangeMinutes / MAX_HISTORY_SAMPLES));
};

/**
 * Hook to fetch and manage price history data for multiple markets
 */
export const usePredictPriceHistory = (
  options: UsePredictPriceHistoryOptions,
): UsePredictPriceHistoryResult => {
  const {
    marketIds = [],
    fidelity: fidelityOverride,
    interval = PredictPriceHistoryInterval.ONE_DAY,
    startTs,
    endTs,
    providerId,
    enabled = true,
    marketStartDate,
  } = options;

  // Calculate effective fidelity - use dynamic calculation for MAX interval
  const fidelity = useMemo(() => {
    // If a fidelity override is provided, use it
    if (fidelityOverride !== undefined) {
      return fidelityOverride;
    }
    // For MAX interval, calculate fidelity dynamically based on market start date
    if (interval === PredictPriceHistoryInterval.MAX) {
      return calculateMaxFidelity(marketStartDate);
    }
    // For other intervals, return undefined to use API defaults
    return undefined;
  }, [fidelityOverride, interval, marketStartDate]);

  const [priceHistories, setPriceHistories] = useState<
    PredictPriceHistoryPoint[][]
  >([]);
  const [isFetching, setIsFetching] = useState(false);
  const [errors, setErrors] = useState<(string | null)[]>([]);

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!enabled && isMountedRef.current) {
      setPriceHistories([]);
      setErrors([]);
      setIsFetching(false);
    }
  }, [enabled]);

  // Create a stable string representation for the dependency array
  const marketIdsKey = marketIds?.join(',') ?? '';

  const fetchPriceHistories = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!marketIds?.length) {
      if (isMountedRef.current) {
        setPriceHistories([]);
        setErrors([]);
        setIsFetching(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsFetching(true);
      setErrors(new Array(marketIds.length).fill(null));
    }

    try {
      if (!Engine || !Engine.context) {
        throw new Error('Engine not initialized');
      }

      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('Predict controller not available');
      }

      // Fetch all price histories in parallel
      const promises = marketIds.map(async (marketId, index) => {
        try {
          const history = await controller.getPriceHistory({
            marketId,
            fidelity,
            interval,
            startTs,
            endTs,
            providerId,
          });
          return { index, data: history ?? [], error: null };
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to fetch price history';
          DevLogger.log(
            `usePredictPriceHistory: Error fetching price history for market ${marketId}`,
            err,
          );

          // Capture exception with price history loading context (single market)
          Logger.error(ensureError(err), {
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
                providerId,
                interval,
                startTs,
                endTs,
                fidelity,
              },
            },
          });

          return { index, data: [], error: errorMessage };
        }
      });

      const results = await Promise.all(promises);

      if (isMountedRef.current) {
        const histories = new Array(marketIds.length).fill([]);
        const errorList = new Array(marketIds.length).fill(null);

        results.forEach(({ index, data, error }) => {
          histories[index] = data;
          errorList[index] = error;
        });

        setPriceHistories(histories);
        setErrors(errorList);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch price histories';

      DevLogger.log('usePredictPriceHistory: Error in batch fetching', err);

      // Capture exception with price history batch loading context
      Logger.error(ensureError(err), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictPriceHistory',
        },
        context: {
          name: 'usePredictPriceHistory',
          data: {
            method: 'loadPriceHistory',
            action: 'price_history_load_batch',
            operation: 'data_fetching',
            marketCount: marketIds.length,
            providerId,
            interval,
            startTs,
            endTs,
            fidelity,
          },
        },
      });

      if (isMountedRef.current) {
        setErrors(new Array(marketIds.length).fill(errorMessage));
        setPriceHistories(new Array(marketIds.length).fill([]));
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, marketIdsKey, fidelity, interval, startTs, endTs, providerId]);

  useEffect(() => {
    fetchPriceHistories();
  }, [fetchPriceHistories]);

  return {
    priceHistories,
    isFetching,
    errors,
    refetch: fetchPriceHistories,
  };
};

export { PredictPriceHistoryInterval };
