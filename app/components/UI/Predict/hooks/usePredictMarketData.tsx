import { useEffect, useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { predictQueries } from '../queries';
import { PredictCategory, PredictMarket } from '../types';

/**
 * Hook to fetch and manage market data for a specific category with infinite scroll.
 * Returns flattened, deduplicated marketData rather than raw useInfiniteQuery
 * to avoid duplicating page-flattening logic across 4 consumers.
 */
export const usePredictMarketData = ({
  category = 'trending',
  q,
  pageSize = 20,
  customQueryParams,
}: {
  q?: string;
  category?: PredictCategory;
  pageSize?: number;
  customQueryParams?: string;
} = {}) => {
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () =>
      predictQueries.markets.keys.list({
        category,
        q,
        pageSize,
        customQueryParams,
      }),
    [category, q, pageSize, customQueryParams],
  );

  const queryResult = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      DevLogger.log(
        'Fetching market data for category:',
        category,
        'search:',
        q,
        'offset:',
        pageParam,
        'limit:',
        pageSize,
      );

      const controller = Engine.context.PredictController;
      const markets = await controller.getMarkets({
        category,
        q,
        limit: pageSize,
        offset: pageParam,
        customQueryParams,
      });

      DevLogger.log('Market data received:', markets);

      if (!markets || !Array.isArray(markets)) {
        return [] as PredictMarket[];
      }

      return markets as PredictMarket[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) {
        return undefined;
      }
      return allPages.reduce((total, page) => total + page.length, 0);
    },
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!queryResult.error) return;

    Logger.error(ensureError(queryResult.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictMarketData',
      },
      context: {
        name: 'usePredictMarketData',
        data: {
          method: 'queryFn',
          action: 'market_data_load',
          operation: 'data_fetching',
          category,
          hasSearchQuery: !!q,
          pageSize,
        },
      },
    });
  }, [queryResult.error, category, q, pageSize]);

  // Flatten pages and deduplicate by ID
  const marketData = useMemo(() => {
    if (!queryResult.data?.pages) return [];
    const seen = new Set<string>();
    return queryResult.data.pages.flat().filter((market) => {
      if (seen.has(market.id)) return false;
      seen.add(market.id);
      return true;
    });
  }, [queryResult.data?.pages]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = queryResult;

  const fetchMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Use invalidateQueries to trigger a background refetch while keeping
  // existing data visible. This avoids the empty-state flash that resetQueries
  // causes (it clears cache before the refetch completes).
  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    marketData,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    isFetchingMore: isFetchingNextPage,
    error: queryResult.error,
    hasMore: hasNextPage ?? false,
    refetch,
    fetchMore,
  };
};
