import { useCallback, useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
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
  totalResults: number;
  isFetching: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  fetchMore: () => void;
  error: string | null;
  refetch: () => Promise<void>;
}

interface SearchPage {
  markets: PredictMarket[];
  totalResults: number;
}

export const usePredictSearchMarketData = ({
  q,
  pageSize = 20,
  refine,
  enabled = true,
}: UsePredictSearchMarketDataOptions): UsePredictSearchMarketDataResult => {
  const trimmedQuery = q.trim();

  const {
    data,
    error,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: queryRefetch,
  } = useInfiniteQuery<SearchPage, Error>({
    queryKey: ['predict', 'markets', 'search', trimmedQuery, pageSize],
    enabled,
    queryFn: async ({ pageParam = 1 }) => {
      if (!Engine?.context) {
        throw new Error('Engine not initialized');
      }

      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('Predict controller not available');
      }

      return controller.searchMarkets({
        q: trimmedQuery,
        limit: pageSize,
        page: pageParam as number,
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      // Compare pages fetched × pageSize against the server total rather than
      // counting client-side filtered markets, which can be fewer than the raw
      // event count and would cause infinite pagination.
      const fetched = allPages.length * pageSize;
      return fetched < lastPage.totalResults ? allPages.length + 1 : undefined;
    },
  });

  useEffect(() => {
    if (!error) return;

    Logger.error(ensureError(error), {
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
  }, [error, pageSize, trimmedQuery]);

  const marketData = useMemo(() => {
    if (!enabled) return [];
    const flat = data?.pages.flatMap((p) => p.markets) ?? [];
    return refine ? refine(flat) : flat;
  }, [enabled, data, refine]);

  const refetch = useCallback(async () => {
    if (enabled) await queryRefetch();
  }, [enabled, queryRefetch]);

  const fetchMore = useCallback(() => {
    if (enabled && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    marketData,
    totalResults: enabled ? (data?.pages[0]?.totalResults ?? 0) : 0,
    isFetching: enabled ? isFetching && !isFetchingNextPage : false,
    isFetchingMore: enabled ? isFetchingNextPage : false,
    hasMore: enabled ? (hasNextPage ?? false) : false,
    fetchMore,
    error: enabled ? (error?.message ?? null) : null,
    refetch,
  };
};
