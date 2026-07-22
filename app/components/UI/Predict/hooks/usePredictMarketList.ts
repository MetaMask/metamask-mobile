import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
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

const EMPTY_VISIBLE_MARKETS_PREFETCH_PAGE_LIMIT = 3;

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
    PredictMarketListResponse,
    ReturnType<typeof predictQueries.marketList.keys.list>
  >({
    ...predictQueries.marketList.options(params),
    enabled,
  });
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = queryResult;

  const markets = useMemo(() => {
    const pages = data?.pages ?? [];

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
  }, [data]);

  useEffect(() => {
    const fetchedPageCount = data?.pages.length ?? 0;
    if (
      !enabled ||
      error ||
      isFetching ||
      isFetchingNextPage ||
      !hasNextPage ||
      fetchedPageCount === 0 ||
      fetchedPageCount >= EMPTY_VISIBLE_MARKETS_PREFETCH_PAGE_LIMIT ||
      markets.length > 0
    ) {
      return;
    }

    // Gamma sports pages can be child-heavy. If every fetched item is filtered
    // out client-side, advance once so the user does not see an empty page while
    // later cursors contain visible parent markets.
    fetchNextPage().catch(() => undefined);
  }, [
    data?.pages.length,
    enabled,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    markets.length,
  ]);

  useEffect(() => {
    if (!error) {
      return;
    }

    Logger.error(ensureError(error), {
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
  }, [error]);

  return {
    markets,
    // isInitialLoading (not isLoading) so a disabled query (enabled: false)
    // reports false instead of being stuck "loading": React Query v4 keeps a
    // never-fetched query in `status: 'loading'`, which would otherwise leave a
    // feature-gated section showing a permanent skeleton.
    isLoading: queryResult.isInitialLoading,
    isFetching: queryResult.isFetching,
    isFetchingNextPage: queryResult.isFetchingNextPage,
    error: queryResult.error ?? null,
    hasNextPage: queryResult.hasNextPage ?? false,
    refetch: queryResult.refetch,
    fetchNextPage: queryResult.fetchNextPage,
  };
};
