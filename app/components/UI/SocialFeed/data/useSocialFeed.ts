import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import {
  FEED_PAGE_LIMIT,
  buildSocialFeedQueryKey,
  fetchSocialFeedPage,
  getSocialFeedNextPageParam,
} from './socialFeedQueries';
import type { TraderFeedRow, SocialV1FeedPost } from '../types';
import { mapFeedItem } from '../utils/mapFeedItem';
import { toSocialFeedPosts } from '../utils/toSocialFeedPosts';
import {
  toSocialFeedRealtimeScope,
  toSocialFeedRequest,
  type SocialFeedRequest,
  type SocialFeedSource,
} from './socialFeedSource';
import {
  useSocialFeedRealtime,
  type SocialFeedRealtimeState,
} from './useSocialFeedRealtime';
import {
  measureSocialDataFetch,
  type SocialDataFetchTab,
} from '../../../../util/social/socialPerformance';

export interface UseSocialFeedOptions {
  /** Gate the query (defaults to enabled). Always additionally gated on unlock. */
  enabled?: boolean;
  /** Items per page. Part of the cache key. */
  pageSize?: number;
  /**
   * How long loaded pages stay fresh. Defaults to TanStack's, or to never
   * while realtime streams. A second observer of a streamed feed passes
   * `Infinity` so it does not reload the pages under the reader.
   */
  staleTime?: number;
  /**
   * Keeps only matching posts. With realtime, also drops non-matching new
   * posts before they are held or counted. Memoize it.
   */
  filterPost?: (post: SocialV1FeedPost) => boolean;
  /** Streams socket events in. Ignored for sources without a socket channel. */
  realtime?: boolean;
  /** Holds new posts behind `realtime.pendingNewCount`. */
  paused?: boolean;
  /** Whether the list is at the top. Holding also applies when false. */
  nearTop?: boolean;
  /** Holds new posts even at the top; catch-up refreshes still run there. */
  holdNewPosts?: boolean;
  /** Social V1-only tracing for the first real initial-page request. */
  performance?: Readonly<{ tab: SocialDataFetchTab }>;
}

export interface SocialFeedState {
  /** Loaded posts, newest first, in the card model `SocialFeedPostShell` renders. */
  posts: SocialV1FeedPost[];
  /** Server rows behind `posts`, before realtime merging and `filterPost`. */
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
  /** Present only while realtime streams this source. */
  realtime?: SocialFeedRealtimeState;
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
 * Social feed for any {@link SocialFeedSource}: a `fetchFeed` query (scope,
 * chains, assets, trader), or a legacy token, perp or trader route.
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
  const {
    enabled = true,
    pageSize = FEED_PAGE_LIMIT,
    staleTime,
    filterPost,
    realtime = false,
    paused = false,
    nearTop = true,
    holdNewPosts = false,
    performance,
  } = options;
  const isUnlocked = useSelector(selectIsUnlocked);
  const queryClient = useQueryClient();
  const initialRequestAccountedForRef = useRef(false);

  const request = useMemo(
    () => (source ? toSocialFeedRequest(source) : null),
    [source],
  );
  const realtimeScope = useMemo(
    () => (realtime ? toSocialFeedRealtimeScope(request) : null),
    [realtime, request],
  );
  const resolvedStaleTime = staleTime ?? (realtimeScope ? Infinity : undefined);
  const queryKey = useMemo(
    () =>
      request ? buildSocialFeedQueryKey(request, pageSize) : IDLE_QUERY_KEY,
    [pageSize, request],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      const fetchPage = () =>
        request
          ? fetchSocialFeedPage(request, pageSize, pageParam)
          : Promise.resolve(EMPTY_PAGE);

      if (
        pageParam !== undefined ||
        !performance ||
        initialRequestAccountedForRef.current
      ) {
        return fetchPage();
      }

      initialRequestAccountedForRef.current = true;
      return measureSocialDataFetch({
        tab: performance.tab,
        cacheState:
          queryClient.getQueryData<InfiniteData<FeedResponse>>(queryKey) ===
          undefined
            ? 'cold'
            : 'warm',
        request: fetchPage,
      });
    },
    getNextPageParam: getSocialFeedNextPageParam,
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(request) && enabled && isUnlocked,
    // ReactQueryService marks TanStack focused on foreground before React
    // commits enabled:false after auto-lock, so a focus or reconnect refetch
    // could run queryFn while the wallet is locked.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    // A stale refetch reloads every loaded page and moves rows under a reader
    // who scrolled down; realtime refreshes through its catch-up instead.
    ...(resolvedStaleTime !== undefined
      ? { staleTime: resolvedStaleTime }
      : {}),
  });

  useEffect(() => {
    if (
      performance &&
      query.data !== undefined &&
      !query.isFetching &&
      !initialRequestAccountedForRef.current
    ) {
      initialRequestAccountedForRef.current = true;
    }
  }, [query.data, query.isFetching, performance]);

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
    () => toSocialFeedPosts(rows, dataUpdatedAt ?? Date.now()),
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
      fetchNextPage().catch(() => undefined);
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

  const live = useSocialFeedRealtime(
    { rows, dataUpdatedAt, refresh },
    {
      realtimeScope,
      active: Boolean(request) && enabled && isUnlocked,
      paused,
      nearTop,
      holdNewPosts,
      filterPost,
    },
  );
  const filteredPosts = useMemo(
    () => (filterPost ? posts.filter(filterPost) : posts),
    [filterPost, posts],
  );

  const hasRequest = Boolean(request);
  return {
    posts: live ? live.posts : filteredPosts,
    rows,
    isLoading: hasRequest && query.isLoading,
    isFetchingNextPage: hasRequest && isFetchingNextPage,
    hasNextPage: hasRequest && hasNextPage === true && !isError,
    loadMore,
    error: hasRequest ? formatSocialQueryErrorMessage(error) : null,
    refresh,
    dataUpdatedAt,
    ...(live ? { realtime: live.realtime } : {}),
  };
};
