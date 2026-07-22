import { useCallback, useMemo } from 'react';
import {
  usePredictMarketList,
  type UsePredictMarketListOptions,
  type UsePredictMarketListResult,
} from './usePredictMarketList';
import type { PredictMarket, PredictMarketListParams } from '../types';

export interface UsePredictFeedMarketListOptions
  extends UsePredictMarketListOptions {
  showLiveFirst?: boolean;
}

const LIVE_MARKET_ORDER: NonNullable<PredictMarketListParams['order']> =
  'volume24hr';

const normalizeRawQueryParams = (queryParams: string): string =>
  queryParams.trim().replace(/^\?/, '');

const withLiveQueryParam = (
  queryParams: string,
  live: boolean,
): string | undefined => {
  const normalizedQueryParams = normalizeRawQueryParams(queryParams);
  if (!normalizedQueryParams) {
    return undefined;
  }

  const params = new URLSearchParams(normalizedQueryParams);
  if (live) {
    params.set('live', 'true');
    params.set('order', LIVE_MARKET_ORDER);
    params.set('ascending', 'false');
  } else {
    params.delete('live');
  }

  const nextQueryParams = params.toString();
  return nextQueryParams || undefined;
};

const createLivePhaseParams = (
  params: PredictMarketListParams,
): PredictMarketListParams => {
  const liveParams: PredictMarketListParams = {
    ...params,
    live: true,
  };
  const queryParams = params.queryParams
    ? withLiveQueryParam(params.queryParams, true)
    : undefined;

  if (queryParams) {
    liveParams.queryParams = queryParams;
    delete liveParams.order;
  } else {
    delete liveParams.queryParams;
    liveParams.order = LIVE_MARKET_ORDER;
  }

  return liveParams;
};

const createRegularPhaseParams = (
  params: PredictMarketListParams,
): PredictMarketListParams => {
  const regularParams: PredictMarketListParams = {
    ...params,
  };
  const queryParams = params.queryParams
    ? withLiveQueryParam(params.queryParams, false)
    : undefined;

  if (queryParams) {
    regularParams.queryParams = queryParams;
  } else {
    delete regularParams.queryParams;
  }
  delete regularParams.live;
  return regularParams;
};

const dedupeMarkets = (markets: PredictMarket[]): PredictMarket[] => {
  const seenIds = new Set<string>();
  const deduped: PredictMarket[] = [];

  for (const market of markets) {
    if (seenIds.has(market.id)) {
      continue;
    }

    seenIds.add(market.id);
    deduped.push(market);
  }

  return deduped;
};

/**
 * Generic feed market list that can page through live markets before falling
 * through to the same filter without `live=true`.
 *
 * The underlying phases intentionally reuse `usePredictMarketList` so the
 * generic list hook remains the single source for cursor pagination, feed
 * hygiene, empty visible-page advancement, logging, and React Query cache keys.
 */
export const usePredictFeedMarketList = (
  params: PredictMarketListParams = {},
  options: UsePredictFeedMarketListOptions = {},
): UsePredictMarketListResult => {
  const { enabled = true, showLiveFirst = false } = options;

  const livePhaseParams = useMemo(
    () => createLivePhaseParams(params),
    [params],
  );
  const regularPhaseParams = useMemo(
    () => createRegularPhaseParams(params),
    [params],
  );

  const liveResult = usePredictMarketList(livePhaseParams, {
    enabled: enabled && showLiveFirst,
  });

  const liveExhausted =
    enabled &&
    showLiveFirst &&
    !liveResult.error &&
    !liveResult.isLoading &&
    !liveResult.isFetching &&
    !liveResult.hasNextPage;

  const regularResult = usePredictMarketList(regularPhaseParams, {
    enabled: enabled && (!showLiveFirst || liveExhausted),
  });

  const markets = useMemo(() => {
    if (!showLiveFirst) {
      return regularResult.markets;
    }

    return dedupeMarkets([...liveResult.markets, ...regularResult.markets]);
  }, [liveResult.markets, regularResult.markets, showLiveFirst]);

  const fetchNextPage = useCallback(() => {
    if (showLiveFirst && !liveExhausted) {
      return liveResult.fetchNextPage();
    }

    return regularResult.fetchNextPage();
  }, [liveExhausted, liveResult, regularResult, showLiveFirst]);

  const refetch = useCallback(async () => {
    if (!showLiveFirst) {
      return regularResult.refetch();
    }

    if (!liveExhausted) {
      return liveResult.refetch();
    }

    const [live, regular] = await Promise.all([
      liveResult.refetch(),
      regularResult.refetch(),
    ]);

    return { live, regular };
  }, [liveExhausted, liveResult, regularResult, showLiveFirst]);

  if (!showLiveFirst) {
    return {
      ...regularResult,
      refetch,
      fetchNextPage,
    };
  }

  const hasLiveMarkets = liveResult.markets.length > 0;
  const isRegularLoadingAfterEmptyLive =
    liveExhausted && !hasLiveMarkets && regularResult.isLoading;
  const isRegularInitialFooter =
    liveExhausted && hasLiveMarkets && regularResult.isLoading;
  const isLiveNextPageFetching =
    !liveExhausted && liveResult.isFetchingNextPage;
  const isRegularNextPageFetching =
    liveExhausted &&
    (regularResult.isFetchingNextPage || isRegularInitialFooter);
  const error = liveExhausted
    ? (regularResult.error ?? liveResult.error)
    : liveResult.error;
  const hasNextPage = liveExhausted
    ? regularResult.hasNextPage
    : liveResult.hasNextPage;

  return {
    markets,
    isLoading: liveResult.isLoading || isRegularLoadingAfterEmptyLive,
    isFetching: liveResult.isFetching || regularResult.isFetching,
    isFetchingNextPage: isLiveNextPageFetching || isRegularNextPageFetching,
    error,
    hasNextPage,
    refetch,
    fetchNextPage,
  };
};
