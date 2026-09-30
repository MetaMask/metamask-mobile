import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import {
  formatSocialQueryErrorMessage,
  useLogSocialQueryError,
} from '../../../../util/social/socialServiceTelemetry';
import { FEED_PAGE_LIMIT } from '../FeedView/hooks/traderFeedQueries';
import type { TraderFeedRow } from '../FeedView/hooks/useTraderFeed';
import { mapFeedItem } from '../FeedView/utils/mapFeedItem';
import { wrapLiveFeedPosts } from '../SocialV1View/feed/mocks/wrapLiveFeedPosts';
import type { SocialV1FeedPost } from '../SocialV1View/feed/types';
import {
  buildSocialFeedQueryKey,
  fetchSocialFeedPage,
  getSocialFeedNextPageParam,
} from './socialFeedQueries';
import {
  toSocialFeedRequest,
  type SocialFeedRequest,
  type SocialFeedSource,
} from './socialFeedSource';

export interface UseSocialFeedOptions {
  /** Gate the query (defaults to enabled). Always additionally gated on unlock. */
  enabled?: boolean;
  /** Items per page. Part of the cache key. */
  pageSize?: number;
}

export interface SocialFeedState {
  /** Loaded posts, newest first, in the card model `SocialFeedPostShell` renders. */
  posts: SocialV1FeedPost[];
  /** The same posts' mapped items, each paired with its raw API row. */
  rows: TraderFeedRow[];
  /** True during the first fetch only (never for a disabled or unsupported source). */
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
  /** When the loaded pages were fetched, or `undefined` before the first success. */
  dataUpdatedAt: number | undefined;
}

const IDLE_QUERY_KEY = ['SocialFeed', 'idle'] as const;

const EMPTY_ROWS: TraderFeedRow[] = [];

const EMPTY_PAGE: FeedResponse = {
  items: [],
  pagination: { olderCursor: null, newerCursor: null },
};

const TELEMETRY_OPERATION: Record<SocialFeedRequest['action'], string> = {
  'SocialService:fetchFeed': 'fetch_feed',
  'SocialService:fetchTokenFeed': 'fetch_token_feed',
  'SocialService:fetchTraderFeed': 'fetch_trader_feed',
};

const toTelemetryQueryParams = (
  request: SocialFeedRequest | null,
): Record<string, string | boolean> | undefined => {
  if (!request) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(request.options).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(',') : (value as string | boolean),
    ]),
  );
};

/** Newest event first. Stable for equal timestamps (preserves API order). */
const byTimestampDesc = (a: TraderFeedRow, b: TraderFeedRow): number =>
  b.item.timestamp - a.item.timestamp;

/**
 * Social feed for any {@link SocialFeedSource}: every trader, one token, one
 * perp market, or one trader.
 *
 * Owns the whole data path so a surface only has to say which feed it wants:
 * identifier normalisation, the unlock gate, cursor pagination, refresh to the
 * first page, Sentry telemetry, and mapping rows into feed posts. A `null`
 * source, or one with no feed (unsupported chain, native asset), stays idle
 * and reports an empty, non-loading feed.
 */
export const useSocialFeed = (
  source: SocialFeedSource | null,
  options: UseSocialFeedOptions = {},
): SocialFeedState => {
  const { enabled = true, pageSize = FEED_PAGE_LIMIT } = options;
  const isUnlocked = useSelector(selectIsUnlocked);
  const queryClient = useQueryClient();

  const request = useMemo(
    () => (source ? toSocialFeedRequest(source) : null),
    [source],
  );
  const queryKey = useMemo(
    () =>
      request ? buildSocialFeedQueryKey(request, pageSize) : IDLE_QUERY_KEY,
    [pageSize, request],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      request
        ? fetchSocialFeedPage(request, pageSize, pageParam)
        : Promise.resolve(EMPTY_PAGE),
    getNextPageParam: getSocialFeedNextPageParam,
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(request) && enabled && isUnlocked,
    // ReactQueryService marks TanStack focused on foreground before React
    // commits enabled:false after auto-lock, so a focus or reconnect refetch
    // could run queryFn while the wallet is locked.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const pages = query.data?.pages;
  const isGlobalFeed = request?.action === 'SocialService:fetchFeed';

  const rows = useMemo(() => {
    if (!request || !pages || pages.length === 0) {
      return EMPTY_ROWS;
    }
    const mapped = pages
      .flatMap((page) => page.items ?? [])
      .map((core) => {
        const item = mapFeedItem(core);
        return item ? { item, core } : null;
      })
      .filter((row): row is TraderFeedRow => row !== null);
    // The global feed splices notable positions in out of chronological
    // order, and its cursor is only the last item's timestamp, so a later page
    // can hold newer events. The scoped routes are already newest first.
    return isGlobalFeed ? mapped.sort(byTimestampDesc) : mapped;
  }, [isGlobalFeed, pages, request]);

  const dataUpdatedAt = query.dataUpdatedAt || undefined;
  const posts = useMemo(
    () => wrapLiveFeedPosts(rows, dataUpdatedAt ?? Date.now()),
    [dataUpdatedAt, rows],
  );

  const error = query.error ?? null;
  useLogSocialQueryError(error, {
    surface: 'trader_feed',
    operation: request ? TELEMETRY_OPERATION[request.action] : 'fetch_feed',
    extraMessage: 'Social feed fetch failed',
    source: 'useSocialFeed',
    endpoint: 'feed',
    queryParams: toTelemetryQueryParams(request),
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError, refetch } =
    query;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage]);

  const refresh = useCallback(async () => {
    if (!request) {
      return;
    }
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
  }, [queryClient, queryKey, refetch, request]);

  const hasRequest = Boolean(request);
  return {
    posts,
    rows,
    isLoading: hasRequest && query.isLoading,
    isFetchingNextPage: hasRequest && isFetchingNextPage,
    hasNextPage: hasRequest && hasNextPage === true && !isError,
    loadMore,
    error: hasRequest ? formatSocialQueryErrorMessage(error) : null,
    refresh,
    dataUpdatedAt,
  };
};
