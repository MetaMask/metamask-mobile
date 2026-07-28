import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  usePredictMarketList,
  type UsePredictMarketListOptions,
  type UsePredictMarketListResult,
} from './usePredictMarketList';
import type { PredictMarket, PredictMarketListParams } from '../types';

export interface UsePredictFeedMarketListOptions
  extends UsePredictMarketListOptions {
  showLiveFirst?: boolean;
  autoAdvanceEmptyPages?: boolean;
}

const LIVE_MARKET_ORDER: NonNullable<PredictMarketListParams['order']> =
  'volume24hr';
const EMPTY_VISIBLE_MARKETS_AUTO_ADVANCE_LIMIT = 3;

interface EmptyPageAdvanceState {
  live: number;
  liveInFlight: boolean;
  regular: number;
  regularInFlight: boolean;
}

const INITIAL_EMPTY_PAGE_ADVANCE_STATE: EmptyPageAdvanceState = {
  live: 0,
  liveInFlight: false,
  regular: 0,
  regularInFlight: false,
};

const createLivePhaseParams = (
  params: PredictMarketListParams,
): PredictMarketListParams => {
  const liveParams: PredictMarketListParams = {
    ...params,
    live: true,
  };

  if (params.queryParams) {
    delete liveParams.order;
  } else {
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

  if (params.queryParams) {
    regularParams.live = false;
  } else {
    delete regularParams.live;
  }

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

const canAutoAdvanceEmptyPage = ({
  phaseEnabled,
  advanceCount,
  isAutoAdvancing,
  error,
  isLoading,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  marketCount,
}: {
  phaseEnabled: boolean;
  advanceCount: number;
  isAutoAdvancing: boolean;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  marketCount: number;
}): boolean =>
  phaseEnabled &&
  advanceCount < EMPTY_VISIBLE_MARKETS_AUTO_ADVANCE_LIMIT &&
  !isAutoAdvancing &&
  !error &&
  !isLoading &&
  !isFetching &&
  !isFetchingNextPage &&
  hasNextPage &&
  marketCount === 0;

/**
 * Generic feed market list that can page through live markets before falling
 * through to the same filter without `live=true`.
 *
 * The underlying phases intentionally reuse `usePredictMarketList` so the
 * generic list hook remains the single source for cursor pagination, feed
 * hygiene, logging, and React Query cache keys.
 */
export const usePredictFeedMarketList = (
  params: PredictMarketListParams = {},
  options: UsePredictFeedMarketListOptions = {},
): UsePredictMarketListResult => {
  const {
    enabled = true,
    showLiveFirst = false,
    autoAdvanceEmptyPages = false,
    filterStaleGameMarkets = false,
  } = options;
  const [emptyPageAdvanceState, setEmptyPageAdvanceState] =
    useState<EmptyPageAdvanceState>(INITIAL_EMPTY_PAGE_ADVANCE_STATE);

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
    filterStaleGameMarkets,
  });
  const {
    error: liveError,
    fetchNextPage: fetchNextLivePage,
    hasNextPage: liveHasNextPage,
    isFetching: liveIsFetching,
    isFetchingNextPage: liveIsFetchingNextPage,
    isLoading: liveIsLoading,
    markets: liveMarkets,
  } = liveResult;
  const liveMarketCount = liveMarkets.length;

  const autoAdvanceResetKey = useMemo(
    () =>
      JSON.stringify({
        livePhaseParams,
        regularPhaseParams,
        enabled,
        showLiveFirst,
        autoAdvanceEmptyPages,
        filterStaleGameMarkets,
      }),
    [
      livePhaseParams,
      regularPhaseParams,
      enabled,
      showLiveFirst,
      autoAdvanceEmptyPages,
      filterStaleGameMarkets,
    ],
  );

  useEffect(() => {
    setEmptyPageAdvanceState(INITIAL_EMPTY_PAGE_ADVANCE_STATE);
  }, [autoAdvanceResetKey]);

  const liveEmptyPageBudgetExhausted =
    autoAdvanceEmptyPages &&
    liveMarketCount === 0 &&
    liveHasNextPage &&
    emptyPageAdvanceState.live >= EMPTY_VISIBLE_MARKETS_AUTO_ADVANCE_LIMIT;
  const isLiveSettled =
    !liveError && !liveIsLoading && !liveIsFetching && !liveIsFetchingNextPage;
  const liveExhausted =
    enabled &&
    showLiveFirst &&
    isLiveSettled &&
    (!liveHasNextPage || liveEmptyPageBudgetExhausted);

  const regularResult = usePredictMarketList(regularPhaseParams, {
    enabled: enabled && (!showLiveFirst || liveExhausted),
    filterStaleGameMarkets,
  });
  const {
    error: regularError,
    fetchNextPage: fetchNextRegularPage,
    hasNextPage: regularHasNextPage,
    isFetching: regularIsFetching,
    isFetchingNextPage: regularIsFetchingNextPage,
    isLoading: regularIsLoading,
    markets: regularMarkets,
  } = regularResult;
  const regularMarketCount = regularMarkets.length;
  const livePhaseEnabled = enabled && showLiveFirst;
  const regularPhaseEnabled = enabled && (!showLiveFirst || liveExhausted);
  const shouldAutoAdvanceLiveEmptyPage = canAutoAdvanceEmptyPage({
    phaseEnabled: livePhaseEnabled,
    advanceCount: emptyPageAdvanceState.live,
    isAutoAdvancing: emptyPageAdvanceState.liveInFlight,
    error: liveError,
    isLoading: liveIsLoading,
    isFetching: liveIsFetching,
    isFetchingNextPage: liveIsFetchingNextPage,
    hasNextPage: liveHasNextPage,
    marketCount: liveMarketCount,
  });
  const shouldAutoAdvanceRegularEmptyPage = canAutoAdvanceEmptyPage({
    phaseEnabled: regularPhaseEnabled,
    advanceCount: emptyPageAdvanceState.regular,
    isAutoAdvancing: emptyPageAdvanceState.regularInFlight,
    error: regularError,
    isLoading: regularIsLoading,
    isFetching: regularIsFetching,
    isFetchingNextPage: regularIsFetchingNextPage,
    hasNextPage: regularHasNextPage,
    marketCount: regularMarketCount,
  });
  const isAutoAdvancingLiveEmptyPage =
    autoAdvanceEmptyPages &&
    (emptyPageAdvanceState.liveInFlight || shouldAutoAdvanceLiveEmptyPage);
  const isAutoAdvancingRegularEmptyPage =
    autoAdvanceEmptyPages &&
    (emptyPageAdvanceState.regularInFlight ||
      shouldAutoAdvanceRegularEmptyPage);

  useEffect(() => {
    if (!autoAdvanceEmptyPages || !shouldAutoAdvanceLiveEmptyPage) {
      return;
    }

    setEmptyPageAdvanceState((current) => ({
      ...current,
      live: current.live + 1,
      liveInFlight: true,
    }));
    fetchNextLivePage()
      .catch(() => undefined)
      .finally(() => {
        setEmptyPageAdvanceState((current) => ({
          ...current,
          liveInFlight: false,
        }));
      });
  }, [
    autoAdvanceEmptyPages,
    fetchNextLivePage,
    shouldAutoAdvanceLiveEmptyPage,
  ]);

  useEffect(() => {
    if (!autoAdvanceEmptyPages || !shouldAutoAdvanceRegularEmptyPage) {
      return;
    }

    setEmptyPageAdvanceState((current) => ({
      ...current,
      regular: current.regular + 1,
      regularInFlight: true,
    }));
    fetchNextRegularPage()
      .catch(() => undefined)
      .finally(() => {
        setEmptyPageAdvanceState((current) => ({
          ...current,
          regularInFlight: false,
        }));
      });
  }, [
    autoAdvanceEmptyPages,
    fetchNextRegularPage,
    shouldAutoAdvanceRegularEmptyPage,
  ]);

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
    setEmptyPageAdvanceState(INITIAL_EMPTY_PAGE_ADVANCE_STATE);

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
    const isAutoAdvancingInitialRegularPage =
      regularMarketCount === 0 && isAutoAdvancingRegularEmptyPage;

    return {
      ...regularResult,
      isLoading: regularResult.isLoading || isAutoAdvancingInitialRegularPage,
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
  const isAutoAdvancingInitialEmptyFeed =
    markets.length === 0 &&
    (isAutoAdvancingLiveEmptyPage || isAutoAdvancingRegularEmptyPage);
  const error = liveExhausted
    ? (regularResult.error ?? liveResult.error)
    : liveResult.error;
  const hasNextPage = liveExhausted
    ? regularResult.hasNextPage
    : liveResult.hasNextPage;

  return {
    markets,
    isLoading:
      liveResult.isLoading ||
      isRegularLoadingAfterEmptyLive ||
      isAutoAdvancingInitialEmptyFeed,
    isFetching: liveResult.isFetching || regularResult.isFetching,
    isFetchingNextPage: isLiveNextPageFetching || isRegularNextPageFetching,
    error,
    hasNextPage,
    refetch,
    fetchNextPage,
  };
};
