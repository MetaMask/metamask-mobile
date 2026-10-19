import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import type { CaipAssetType } from '@metamask/utils';
import { selectIsUnlocked } from '../../../../../../selectors/keyringController';
import {
  formatSocialQueryErrorMessage,
  useLogSocialQueryError,
} from '../../../../../../util/social/socialServiceTelemetry';
import type { TraderFeedRow } from '../../../../SocialFeed/types';
import { mapFeedItem } from '../../../../SocialFeed/utils/mapFeedItem';
import {
  TOKEN_HOLDERS_PAGE_LIMIT,
  buildTokenHoldersQueryKey,
  fetchTokenHoldersPage,
  getTokenHoldersNextPageParam,
  isTokenHoldersFixtureData,
} from './tokenHoldersQueries';

export interface UseTokenHoldersOptions {
  /** CAIP-19 id of the token whose holders are listed. */
  assetId: CaipAssetType;
  /**
   * Narrow to traders the viewer follows. The follow-scoped route returns the
   * same shape, so the later toggle on this tab is only this parameter.
   */
  followedByMe?: boolean;
  /** Gate the query (defaults to enabled). Always additionally gated on unlock. */
  enabled?: boolean;
  /** Rows per page. Part of the cache key. */
  pageSize?: number;
}

export interface TokenHoldersState {
  /** Loaded holders, each mapped item paired with its raw API row. */
  rows: TraderFeedRow[];
  /** True during the first fetch only. */
  isLoading: boolean;
  /** True while a follow-up page is being fetched. */
  isFetchingNextPage: boolean;
  /** True when another page can be requested. */
  hasNextPage: boolean;
  /** Request the next page; no-op if none remain, one is in flight, or errored. */
  loadMore: () => void;
  /** Normalised error message, or `null`. */
  error: string | null;
  /** Reset to the first page and refetch -- also the recovery path after an error. */
  refresh: () => Promise<void>;
  /** True while the rows are the dev fixture rather than API data. */
  isFixtureData: boolean;
}

const EMPTY_ROWS: TraderFeedRow[] = [];

/**
 * Holders of one token: the traders holding it, with their position size and
 * unrealized P&L.
 *
 * Modelled on `useSocialFeed` -- the holders routes return the same shape as a
 * feed response (a list of positions with the trader attached), so rows go
 * through the same `mapFeedItem`. Owns the whole data path: the unlock gate,
 * cursor pagination, refresh to the first page and Sentry telemetry.
 */
export const useTokenHolders = ({
  assetId,
  followedByMe = false,
  enabled = true,
  pageSize = TOKEN_HOLDERS_PAGE_LIMIT,
}: UseTokenHoldersOptions): TokenHoldersState => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => buildTokenHoldersQueryKey(assetId, { followedByMe, limit: pageSize }),
    [assetId, followedByMe, pageSize],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      fetchTokenHoldersPage(assetId, {
        followedByMe,
        limit: pageSize,
        olderThan: pageParam,
      }),
    getNextPageParam: getTokenHoldersNextPageParam,
    initialPageParam: undefined as string | undefined,
    enabled: enabled && isUnlocked,
    // ReactQueryService marks TanStack focused on foreground before React
    // commits enabled:false after auto-lock, so a focus or reconnect refetch
    // could run queryFn while the wallet is locked.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const pages = query.data?.pages;

  const rows = useMemo(() => {
    if (!pages || pages.length === 0) {
      return EMPTY_ROWS;
    }
    return (
      pages
        .flatMap((page) => page.items ?? [])
        // A holders list is current holdings: an exited position is not one.
        .filter((core) => core.isOpen === true)
        .map((core) => {
          const item = mapFeedItem(core);
          return item ? { item, core } : null;
        })
        .filter((row): row is TraderFeedRow => row !== null)
    );
    // Deliberately not sorted here. The route returns the list already sorted
    // by position value descending; sorting the loaded pages locally would
    // reorder rows across cursor boundaries and produce a wrong list.
  }, [pages]);

  const error = query.error ?? null;
  // No `token_details` surface exists in the shared telemetry enums, and they
  // live outside this module's ownership; `trader_feed` / `open_positions` are
  // the closest existing pair for a list of positions.
  useLogSocialQueryError(error, {
    surface: 'trader_feed',
    operation: followedByMe
      ? 'fetch_token_holders_followed_by_me'
      : 'fetch_token_holders',
    extraMessage: 'Token holders fetch failed',
    source: 'useTokenHolders',
    endpoint: 'open_positions',
    queryParams: { assetId, followedByMe },
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError, refetch } =
    query;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage]);

  const refresh = useCallback(async () => {
    // Refetch only the first page (the stale list stays visible meanwhile, so
    // no skeleton flash), dropping any older pages loaded via pagination.
    queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKey, (old) =>
      old
        ? {
            pages: old.pages.slice(0, 1),
            pageParams: old.pageParams.slice(0, 1),
          }
        : old,
    );
    await refetch();
  }, [queryClient, queryKey, refetch]);

  return {
    rows,
    isLoading: query.isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage === true && !isError,
    loadMore,
    error: formatSocialQueryErrorMessage(error),
    refresh,
    isFixtureData: isTokenHoldersFixtureData(),
  };
};
