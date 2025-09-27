import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  GetPriceHistoryParams,
  PredictPriceHistoryInterval,
  PredictPriceHistoryPoint,
} from '../types';

export interface UsePredictPriceHistoryOptions
  extends Omit<GetPriceHistoryParams, 'market'> {
  market?: string;
  enabled?: boolean;
}

export interface UsePredictPriceHistoryResult {
  priceHistory: PredictPriceHistoryPoint[];
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage price history data for a market
 */
export const usePredictPriceHistory = (
  options: UsePredictPriceHistoryOptions = {},
): UsePredictPriceHistoryResult => {
  const {
    market,
    fidelity,
    interval = PredictPriceHistoryInterval.ONE_DAY,
    providerId,
    enabled = true,
  } = options;

  const [priceHistory, setPriceHistory] = useState<PredictPriceHistoryPoint[]>(
    [],
  );
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!enabled && isMountedRef.current) {
      setPriceHistory([]);
      setError(null);
      setIsFetching(false);
    }
  }, [enabled]);

  const fetchPriceHistory = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!market) {
      if (isMountedRef.current) {
        setPriceHistory([]);
        setError(null);
        setIsFetching(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setIsFetching(true);
      setError(null);
    }

    try {
      if (!Engine || !Engine.context) {
        throw new Error('Engine not initialized');
      }

      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('Predict controller not available');
      }

      const history = await controller.getPriceHistory({
        market,
        fidelity,
        interval,
        providerId,
      });

      if (isMountedRef.current) {
        setPriceHistory(history ?? []);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch price history';

      DevLogger.log(
        'usePredictPriceHistory: Error fetching price history',
        err,
      );

      if (isMountedRef.current) {
        setError(errorMessage);
        setPriceHistory([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, [enabled, market, fidelity, interval, providerId]);

  useEffect(() => {
    fetchPriceHistory();
  }, [fetchPriceHistory]);

  return {
    priceHistory,
    isFetching,
    error,
    refetch: fetchPriceHistory,
  };
};

export { PredictPriceHistoryInterval };
