import { useEffect, useMemo } from 'react';
import {
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { filterStandaloneMarkets } from '../utils/feed';
import { getVisiblePredictMarkets } from '../utils/marketStaleness';
import { predictQueries } from '../queries';
import type {
  PredictMarket,
  PredictMarketListParams,
  PredictMarketListResponse,
} from '../types';

export interface UsePredictMarketListOptions {
  /** When false, skips fetching (e.g. section mounted while flag/feature off). */
  enabled?: boolean;
}

export interface UsePredictMarketListResult {
  markets: PredictMarket[];
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
  hasNextPage: boolean;
  refetch: () => Promise<unknown>;
  fetchNextPage: () => Promise<unknown>;
}

/**
 * React Query (infinite) market-list hook for the redesigned Predict feed.
 *
 * Drives the generic, category-free `PredictController.listMarkets` API with
 * explicit params (tags/series/order/status/live/search/limit) and cursor
 * pagination. Applies the universal feed hygiene only — `filterStandaloneMarkets`,
 * cross-page dedupe by id, and `getVisiblePredictMarkets`. Section-specific
 * curation (e.g. Up/Down series collapsing, Live Now interleaving) is the
 * caller's responsibility and intentionally lives outside this generic hook.
 *
 * This is additive: the legacy `usePredictMarketData` (category/`getMarkets`)
 * remains the fallback path and is unaffected.
 */
export const usePredictMarketList = (
  params: PredictMarketListParams = {},
  options: UsePredictMarketListOptions = {},
): UsePredictMarketListResult => {
  const { enabled = true } = options;

  const queryResult = useInfiniteQuery<
    PredictMarketListResponse,
    Error,
    InfiniteData<PredictMarketListResponse>,
    ReturnType<typeof predictQueries.marketList.keys.list>,
    string | undefined
  >({
    ...predictQueries.marketList.options(params),
    enabled,
  });

  const markets = useMemo(() => {
    const pages = queryResult.data?.pages ?? [];

    // Rank visibility/staleness PER PAGE, then append, so loading more pages
    // never re-orders markets already on screen. `getVisiblePredictMarkets`
    // scores by `(list.length - index) * penalty`, so ranking the full
    // cross-page list would let a growing length flip the order of earlier
    // items. Matches `usePredictMarketData`'s per-page append behavior.
    const seenIds = new Set<string>();
    const accumulated: PredictMarket[] = [];

    for (const page of pages) {
      const visible = getVisiblePredictMarkets(
        filterStandaloneMarkets(page.markets),
      );

      for (const market of visible) {
        if (seenIds.has(market.id)) {
          continue;
        }
        seenIds.add(market.id);
        accumulated.push(market);
      }
    }

    return accumulated;
  }, [queryResult.data]);

  useEffect(() => {
    if (!queryResult.error) {
      return;
    }

    Logger.error(ensureError(queryResult.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictMarketList',
      },
      context: {
        name: 'usePredictMarketList',
        data: {
          method: 'queryFn',
          action: 'market_list_load',
          operation: 'data_fetching',
        },
      },
    });
  }, [queryResult.error]);

  return {
    markets,
    // isLoading is false for disabled queries in v5 (status: 'pending' with
    // fetchStatus: 'idle'), so feature-gated sections don't show a permanent skeleton.
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    error: queryResult.error ?? null,
    hasNextPage: queryResult.hasNextPage ?? false,
    refetch: queryResult.refetch,
    fetchNextPage: queryResult.fetchNextPage,
  };
};
