import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  focusManager,
  useInfiniteQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useQuery } from '@metamask/react-data-query';
import type { PositionsResponse, Position } from '@metamask/social-controllers';
import {
  formatSocialQueryErrorMessage,
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import {
  buildClosedPositionsQueryKey,
  buildOpenPositionsQueryKey,
  buildPaginatedClosedPositionsQueryKey,
  buildPaginatedOpenPositionsQueryKey,
} from '../../../../../util/social/traderProfileQueries';
import {
  fetchTraderPositionsPage,
  flattenTraderPositionPages,
  getNextTraderPositionsPageParam,
  keepFirstTraderPositionsPage,
  replaceFirstTraderPositionsPage,
  type TraderPositionsInfiniteData,
  type TraderPositionsStatus,
} from '../../../../../util/social/traderPositionsPagination';

const EMPTY_POSITIONS: Position[] = [];
const TRADER_POSITIONS_SOURCE = 'useTraderPositions';

/**
 * Refreshes page 1 of one tab without touching pages the user already loaded.
 * Failures are logged; the list keeps its last good data.
 */
const pollFirstPositionsPage = (
  queryClient: QueryClient,
  status: TraderPositionsStatus,
  addressOrId: string,
): void => {
  const queryKey =
    status === 'open'
      ? buildPaginatedOpenPositionsQueryKey(addressOrId)
      : buildPaginatedClosedPositionsQueryKey(addressOrId);

  fetchTraderPositionsPage(status, addressOrId, 1)
    .then((firstPage) => {
      queryClient.setQueryData<TraderPositionsInfiniteData>(queryKey, (data) =>
        replaceFirstTraderPositionsPage(data, firstPage),
      );
    })
    .catch((reason: unknown) => {
      reportSocialServiceFailure(
        reason,
        {
          surface: 'trader_profile',
          operation: 'refetch_positions',
          extraMessage: 'Trader positions poll failed',
          source: TRADER_POSITIONS_SOURCE,
        },
        { breadcrumb: false },
      );
    });
};

export interface UseTraderPositionsOptions {
  /** Defaults to true. */
  enabled?: boolean;
  /**
   * Pages through positions with infinite queries (SocialV1 profile). The
   * poll then refreshes only page 1. Defaults to false: one page of 100.
   */
  paginated?: boolean;
  refetchInterval?: number;
}

export interface UseTraderPositionsResult {
  openPositions: Position[];
  closedPositions: Position[];
  isLoadingOpen: boolean;
  isLoadingClosed: boolean;
  /** First non-null open/closed fetch error (legacy combined signal). */
  error: string | null;
  openError: string | null;
  closedError: string | null;
  refetch: () => Promise<void>;
  /*
   * Paginated mode only. Single-page mode omits them, and callers treat that
   * as no more pages, nothing loading, and a no-op load.
   */
  hasMoreOpen?: boolean;
  hasMoreClosed?: boolean;
  isFetchingMoreOpen?: boolean;
  isFetchingMoreClosed?: boolean;
  loadMoreOpen?: () => void;
  loadMoreClosed?: () => void;
}

export const useTraderPositions = (
  addressOrId: string,
  options?: UseTraderPositionsOptions,
): UseTraderPositionsResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const enabled =
    Boolean(addressOrId) && isUnlocked && (options?.enabled ?? true);
  const paginated = options?.paginated ?? false;
  const refetchInterval = options?.refetchInterval;
  const queryClient = useQueryClient();

  // Both hooks run on every render; `paginated` picks which one is live.
  const legacyOpenQuery = useQuery<PositionsResponse>({
    queryKey: buildOpenPositionsQueryKey(addressOrId),
    enabled: enabled && !paginated,
    refetchInterval: paginated ? undefined : refetchInterval,
    refetchOnMount: 'always',
  });

  const legacyClosedQuery = useQuery<PositionsResponse>({
    queryKey: buildClosedPositionsQueryKey(addressOrId),
    enabled: enabled && !paginated,
    refetchInterval: paginated ? undefined : refetchInterval,
    refetchOnMount: 'always',
  });

  const openQuery = useInfiniteQuery({
    queryKey: buildPaginatedOpenPositionsQueryKey(addressOrId),
    queryFn: ({ pageParam }) =>
      fetchTraderPositionsPage('open', addressOrId, pageParam),
    initialPageParam: 1,
    getNextPageParam: getNextTraderPositionsPageParam,
    enabled: enabled && paginated,
    refetchOnMount: 'always',
  });

  const closedQuery = useInfiniteQuery({
    queryKey: buildPaginatedClosedPositionsQueryKey(addressOrId),
    queryFn: ({ pageParam }) =>
      fetchTraderPositionsPage('closed', addressOrId, pageParam),
    initialPageParam: 1,
    getNextPageParam: getNextTraderPositionsPageParam,
    enabled: enabled && paginated,
    refetchOnMount: 'always',
  });

  const openPages = openQuery.data?.pages;
  const closedPages = closedQuery.data?.pages;
  const pagedOpenPositions = useMemo(
    () => flattenTraderPositionPages(openPages),
    [openPages],
  );
  const pagedClosedPositions = useMemo(
    () => flattenTraderPositionPages(closedPages),
    [closedPages],
  );

  const openError = paginated ? openQuery.error : legacyOpenQuery.error;
  const closedError = paginated ? closedQuery.error : legacyClosedQuery.error;

  useLogSocialQueryError(openError, {
    surface: 'trader_profile',
    operation: 'fetch_open_positions',
    extraMessage: 'Trader open positions fetch failed',
    source: TRADER_POSITIONS_SOURCE,
    endpoint: 'open_positions',
  });

  useLogSocialQueryError(closedError, {
    surface: 'trader_profile',
    operation: 'fetch_closed_positions',
    extraMessage: 'Trader closed positions fetch failed',
    source: TRADER_POSITIONS_SOURCE,
    endpoint: 'closed_positions',
  });

  const openPositions = paginated
    ? pagedOpenPositions
    : (legacyOpenQuery.data?.positions ?? EMPTY_POSITIONS);
  const closedPositions = paginated
    ? pagedClosedPositions
    : (legacyClosedQuery.data?.positions ?? EMPTY_POSITIONS);
  const isLoadingOpen = paginated
    ? openQuery.isLoading
    : legacyOpenQuery.isLoading;
  const isLoadingClosed = paginated
    ? closedQuery.isLoading
    : legacyClosedQuery.isLoading;
  const formattedOpenError = formatSocialQueryErrorMessage(openError);
  const formattedClosedError = formatSocialQueryErrorMessage(closedError);
  const combinedError = formattedOpenError ?? formattedClosedError;

  const {
    hasNextPage: hasNextOpenPage,
    isFetchingNextPage: isFetchingNextOpenPage,
    fetchNextPage: fetchNextOpenPage,
    refetch: refetchOpenPaged,
  } = openQuery;
  const {
    hasNextPage: hasNextClosedPage,
    isFetchingNextPage: isFetchingNextClosedPage,
    fetchNextPage: fetchNextClosedPage,
    refetch: refetchClosedPaged,
  } = closedQuery;

  // Scroll-end-drag and momentum-end can both fire before a re-render, and a
  // refresh may already be in flight; reuse that fetch instead of cancelling it.
  const loadMoreOpen = useCallback(() => {
    if (!paginated || !hasNextOpenPage || isFetchingNextOpenPage) {
      return;
    }
    fetchNextOpenPage({ cancelRefetch: false }).catch(() => undefined);
  }, [paginated, hasNextOpenPage, isFetchingNextOpenPage, fetchNextOpenPage]);

  const loadMoreClosed = useCallback(() => {
    if (!paginated || !hasNextClosedPage || isFetchingNextClosedPage) {
      return;
    }
    fetchNextClosedPage({ cancelRefetch: false }).catch(() => undefined);
  }, [
    paginated,
    hasNextClosedPage,
    isFetchingNextClosedPage,
    fetchNextClosedPage,
  ]);

  const { refetch: refetchLegacyOpen } = legacyOpenQuery;
  const { refetch: refetchLegacyClosed } = legacyClosedQuery;

  useEffect(() => {
    if (!paginated || !enabled || refetchInterval === undefined) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      // Same as the legacy poll: nothing in the background.
      if (!focusManager.isFocused()) {
        return;
      }
      pollFirstPositionsPage(queryClient, 'open', addressOrId);
      pollFirstPositionsPage(queryClient, 'closed', addressOrId);
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [paginated, enabled, refetchInterval, queryClient, addressOrId]);

  const refetch = useCallback(async () => {
    if (paginated) {
      // Pull-to-refresh starts over at page 1. Later pages reload on scroll.
      queryClient.setQueryData<TraderPositionsInfiniteData>(
        buildPaginatedOpenPositionsQueryKey(addressOrId),
        keepFirstTraderPositionsPage,
      );
      queryClient.setQueryData<TraderPositionsInfiniteData>(
        buildPaginatedClosedPositionsQueryKey(addressOrId),
        keepFirstTraderPositionsPage,
      );
    }

    const results = await Promise.allSettled(
      paginated
        ? [refetchOpenPaged(), refetchClosedPaged()]
        : [refetchLegacyOpen(), refetchLegacyClosed()],
    );
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (failures.length > 0) {
      failures.forEach(({ reason }) => {
        reportSocialServiceFailure(
          reason,
          {
            surface: 'trader_profile',
            operation: 'refetch_positions',
            extraMessage: 'Trader positions refetch failed',
            source: TRADER_POSITIONS_SOURCE,
          },
          { breadcrumb: false },
        );
      });
      throw failures[0].reason;
    }
  }, [
    paginated,
    addressOrId,
    queryClient,
    refetchOpenPaged,
    refetchClosedPaged,
    refetchLegacyOpen,
    refetchLegacyClosed,
  ]);

  return {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    error: combinedError,
    openError: formattedOpenError,
    closedError: formattedClosedError,
    refetch,
    hasMoreOpen: paginated && Boolean(hasNextOpenPage),
    hasMoreClosed: paginated && Boolean(hasNextClosedPage),
    isFetchingMoreOpen: paginated && isFetchingNextOpenPage,
    isFetchingMoreClosed: paginated && isFetchingNextClosedPage,
    loadMoreOpen,
    loadMoreClosed,
  };
};

export default useTraderPositions;
