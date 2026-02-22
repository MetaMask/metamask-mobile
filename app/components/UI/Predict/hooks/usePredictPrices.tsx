import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { PriceQuery, GetPriceResponse, Side } from '../types';

export interface UsePredictPricesOptions {
  queries: PriceQuery[];
  providerId?: string;
  enabled?: boolean;
  /**
   * optional polling interval in milliseconds.
   * if provided, prices will be refetched at this interval.
   */
  pollingInterval?: number;
}

export interface UsePredictPricesResult {
  prices: GetPriceResponse;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage current prices for multiple tokens
 */
export const usePredictPrices = (
  options: UsePredictPricesOptions,
): UsePredictPricesResult => {
  const {
    queries = [],
    providerId = 'polymarket',
    enabled = true,
    pollingInterval,
  } = options;

  const [prices, setPrices] = useState<GetPriceResponse>({
    providerId: '',
    results: [],
  });
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled && isMountedRef.current) {
      setPrices({ providerId: '', results: [] });
      setError(null);
      setIsFetching(false);
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    }
  }, [enabled]);

  const queriesKey = JSON.stringify(queries);

  const fetchPrices = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!queries?.length) {
      if (isMountedRef.current) {
        setPrices({ providerId: '', results: [] });
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

      const fetchedPrices = await controller.getPrices({
        queries,
        providerId,
      });

      if (isMountedRef.current) {
        setPrices(fetchedPrices);
        setError(null);
      }

      // set up next poll if polling is enabled
      if (pollingInterval && isMountedRef.current) {
        pollingTimeoutRef.current = setTimeout(() => {
          fetchPrices();
        }, pollingInterval);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch prices';

      DevLogger.log('usePredictPrices: Error fetching prices', err);

      Logger.error(ensureError(err), {
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
            queriesCount: queries.length,
            providerId,
          },
        },
      });

      if (isMountedRef.current) {
        setError(errorMessage);
        setPrices({ providerId: '', results: [] });
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queriesKey, providerId, pollingInterval]);

  useEffect(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
    fetchPrices();
  }, [fetchPrices]);

  return {
    prices,
    isFetching,
    error,
    refetch: fetchPrices,
  };
};

export { Side };
