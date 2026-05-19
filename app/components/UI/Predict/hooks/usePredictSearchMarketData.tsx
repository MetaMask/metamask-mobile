import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { PredictMarket } from '../types';
import { getVisiblePredictMarkets } from '../utils/marketStaleness';
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
  const trimmedQuery = q.trim();

  const query = useQuery<PredictMarket[], Error>({
    queryKey: ['predict', 'markets', 'search', trimmedQuery, pageSize],
    enabled,
    queryFn: async () => {
      if (!Engine?.context) {
        throw new Error('Engine not initialized');
      }

      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('Predict controller not available');
      }

      if (!trimmedQuery) {
        const { markets } = await controller.getMarkets({
          category: 'trending',
          limit: pageSize,
        });
        return markets;
      }

      return controller.searchMarkets({
        q: trimmedQuery,
        limit: pageSize,
        page: 1,
      });
    },
  });

  useEffect(() => {
    if (!query.error) {
      return;
    }

    Logger.error(ensureError(query.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictSearchMarketData',
      },
      context: {
        name: 'usePredictSearchMarketData',
        data: {
          method: 'queryFn',
          action: 'market_search_load',
          operation: 'data_fetching',
          hasSearchQuery: Boolean(trimmedQuery),
          pageSize,
        },
      },
    });
  }, [query.error, pageSize, trimmedQuery]);

  const marketData = useMemo(() => {
    if (!enabled) {
      return [];
    }

    const markets = query.data ?? [];
    const visibleMarkets = getVisiblePredictMarkets(markets);
    return refine ? refine(visibleMarkets) : visibleMarkets;
  }, [enabled, query.data, refine]);

  const queryRefetch = query.refetch;
  const refetch = useCallback(async () => {
    if (!enabled) {
      return;
    }

    await queryRefetch();
  }, [enabled, queryRefetch]);

  return {
    marketData,
    isFetching: enabled ? query.isFetching : false,
    error: enabled ? (query.error?.message ?? null) : null,
    refetch,
  };
};
