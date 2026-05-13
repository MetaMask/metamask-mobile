/* eslint-disable react/prop-types */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { PredictMarket } from '../types';
import { ensureError } from '../utils/predictErrorHandler';

export interface UsePredictSearchMarketDataOptions {
  q: string;
  pageSize?: number;
  refine?: (markets: PredictMarket[]) => PredictMarket[];
  enabled?: boolean;
}

export interface UsePredictSearchMarketDataResult {
  marketData: PredictMarket[];
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePredictSearchMarketData = ({
  q,
  pageSize = 20,
  refine,
  enabled = true,
}: UsePredictSearchMarketDataOptions): UsePredictSearchMarketDataResult => {
  const [marketData, setMarketData] = useState<PredictMarket[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const prevEnabledRef = useRef(enabled);

  useLayoutEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      setIsLoading(true);
    }
    prevEnabledRef.current = enabled;
  }, [enabled]);

  const fetchSearchMarketData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      setMarketData([]);
      return;
    }

    const trimmedQuery = q.trim();

    try {
      setIsLoading(true);
      setError(null);

      DevLogger.log('Fetching search market data:', {
        hasSearchQuery: Boolean(trimmedQuery),
        limit: pageSize,
      });

      let retryCount = 0;
      const maxRetries = 3;
      const baseDelay = 1000;

      while (retryCount < maxRetries) {
        try {
          if (!Engine || !Engine.context) {
            throw new Error('Engine not initialized');
          }

          const controller = Engine.context.PredictController;
          if (!controller) {
            throw new Error('Predict controller not available');
          }

          const markets = trimmedQuery
            ? await controller.searchMarkets({
                q: trimmedQuery,
                limit: pageSize,
                page: 1,
              })
            : (
                await controller.getMarkets({
                  category: 'trending',
                  limit: pageSize,
                })
              ).markets;

          setMarketData(refine ? refine(markets) : markets);
          break;
        } catch (engineError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw engineError;
          }

          const delay =
            baseDelay * Math.pow(2, retryCount - 1) + Math.random() * 1000;
          DevLogger.log(
            `Engine not ready, retrying in ${Math.round(
              delay,
            )}ms (attempt ${retryCount}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } catch (err) {
      DevLogger.log('Error fetching search market data:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch search market data';
      setError(errorMessage);
      setMarketData([]);

      Logger.error(ensureError(err), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictSearchMarketData',
        },
        context: {
          name: 'usePredictSearchMarketData',
          data: {
            method: 'loadSearchMarketData',
            action: 'market_search_load',
            operation: 'data_fetching',
            hasSearchQuery: Boolean(trimmedQuery),
            pageSize,
          },
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [enabled, pageSize, q, refine]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    await fetchSearchMarketData();
  }, [enabled, fetchSearchMarketData]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setError(null);
      setMarketData([]);
      return;
    }

    fetchSearchMarketData();
  }, [enabled, fetchSearchMarketData]);

  return {
    marketData,
    isFetching: isLoading,
    error,
    refetch,
  };
};
