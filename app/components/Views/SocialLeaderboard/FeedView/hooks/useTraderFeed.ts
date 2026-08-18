import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import type {
  FeedResponse,
  FetchFeedOptions,
} from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import {
  formatSocialQueryErrorMessage,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import { formatTradeDayLabel } from '../../utils/formatters';
import { FEED_CAIP2_CHAINS } from '../feed-constants';
import { mapFeedItem } from '../utils/mapFeedItem';
import type {
  FeedAudience,
  FeedItem,
  FeedSection,
  FeedTypeFilter,
} from '../types';

/** Feed scope the social API expects, derived from the audience toggle. */
type FeedScope = NonNullable<FetchFeedOptions['scope']>;

/** Page size requested per feed page. */
const FEED_PAGE_LIMIT = 30;

export interface UseTraderFeedOptions {
  /**
   * Audience filter. `all` maps to the generic `leaderboard` scope, `following`
   * to the per-user `following` scope.
   */
  audience?: FeedAudience;
  /**
   * Client-side type filter. `tokens` shows spot rows, `perps` shows perp
   * rows, `all` shows everything. Does not affect the fetch query key.
   */
  typeFilter?: FeedTypeFilter;
  /** Gate the query (defaults to enabled). Always additionally gated on unlock. */
  enabled?: boolean;
}

export interface UseTraderFeedResult {
  /** Feed items grouped by calendar day, newest first. */
  sections: FeedSection[];
  /** Flat list of items (ungrouped), newest first. */
  items: FeedItem[];
  /** True when the unfiltered loaded page set has at least one item. */
  hasLoadedItems: boolean;
  /** True during the initial fetch (never for a disabled or background query). */
  isLoading: boolean;
  /** True while a follow-up page is being fetched. */
  isFetchingNextPage: boolean;
  /** True when another page can be requested. */
  hasNextPage: boolean;
  /** Request the next page; no-op if none remain, one is in flight, or errored. */
  loadMore: () => void;
  /** Normalised error message, or `null`. */
  error: string | null;
  /** Reset to the first page and refetch the newest activity. */
  refresh: () => Promise<void>;
}

const EMPTY_ITEMS: FeedItem[] = [];

/** Maps the UI type filter to the `FeedItem.type` discriminant. */
const matchesTypeFilter = (
  item: FeedItem,
  typeFilter: FeedTypeFilter,
): boolean => {
  if (typeFilter === 'all') {
    return true;
  }
  if (typeFilter === 'tokens') {
    return item.type === 'spot';
  }
  return item.type === 'perps';
};

/** Groups feed items into day sections, newest day first. */
const groupByDay = (items: FeedItem[]): FeedSection[] => {
  const sections: FeedSection[] = [];

  items.forEach((item) => {
    const dateLabel = formatTradeDayLabel(item.timestamp);
    const last = sections[sections.length - 1];
    if (last && last.dateLabel === dateLabel) {
      last.data.push(item);
    } else {
      sections.push({ dateLabel, data: [item] });
    }
  });

  return sections;
};

/**
 * Trader activity feed data source backed by `SocialService:fetchFeed`.
 *
 * Uses `useInfiniteQuery` for cursor pagination: each page passes the previous
 * page's `olderCursor` as `olderThan`. The messenger is called directly (rather
 * than via `@metamask/react-data-query`) because `fetchFeed` takes a single
 * options object into which the cursor must be merged. The presentation layer
 * consumes only the derived `sections` / `items` plus the load/pagination
 * flags, keeping the API surface swap isolated to this hook.
 */
export const useTraderFeed = (
  options: UseTraderFeedOptions = {},
): UseTraderFeedResult => {
  const { audience = 'all', typeFilter = 'all', enabled = true } = options;
  const isUnlocked = useSelector(selectIsUnlocked);

  const scope: FeedScope =
    audience === 'following' ? 'following' : 'leaderboard';

  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['SocialService:fetchFeed', { scope, chains: FEED_CAIP2_CHAINS }],
    [scope],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      // Call as a member expression so the messenger keeps its `this` binding;
      // aliasing `.call` into a local detaches it and breaks action lookup.
      const messenger = Engine.controllerMessenger as unknown as {
        call: (
          action: 'SocialService:fetchFeed',
          fetchOptions: FetchFeedOptions,
        ) => Promise<FeedResponse>;
      };
      return messenger.call('SocialService:fetchFeed', {
        scope,
        limit: FEED_PAGE_LIMIT,
        chains: [...FEED_CAIP2_CHAINS],
        ...(pageParam ? { olderThan: pageParam } : {}),
      });
    },
    // react-query only stops paginating on `undefined`; guard the empty cursor
    // so an exhausted feed doesn't loop back to the first page.
    getNextPageParam: (lastPage: FeedResponse) =>
      lastPage.pagination?.olderCursor ?? undefined,
    enabled: enabled && isUnlocked,
    retry: false,
  } as unknown as UseInfiniteQueryOptions<FeedResponse, Error>);

  const pages = query.data?.pages ?? undefined;

  const loadedItems = useMemo(() => {
    if (!pages || pages.length === 0) {
      return EMPTY_ITEMS;
    }
    return pages
      .flatMap((page) => page.items ?? [])
      .map(mapFeedItem)
      .filter((item): item is FeedItem => item !== null);
  }, [pages]);

  const hasLoadedItems = loadedItems.length > 0;

  const items = useMemo(() => {
    if (typeFilter === 'all') {
      return loadedItems;
    }
    return loadedItems.filter((item) => matchesTypeFilter(item, typeFilter));
  }, [loadedItems, typeFilter]);

  const sections = useMemo(() => groupByDay(items), [items]);

  const error = query.error ?? null;
  useLogSocialQueryError(error, {
    surface: 'trader_feed',
    operation: 'fetch_feed',
    extraMessage: 'Trader feed fetch failed',
    source: 'useTraderFeed',
    endpoint: 'feed',
    queryParams: { scope, chains: FEED_CAIP2_CHAINS.join(',') },
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError, refetch } =
    query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

  const refresh = useCallback(async () => {
    // Reset to the newest activity from the top. Refetch only the first page
    // (the stale list stays visible meanwhile, so no skeleton flash), then drop
    // any older pages that were loaded via pagination.
    await refetch({
      refetchPage: (_page: FeedResponse, index: number) => index === 0,
    } as Parameters<typeof refetch>[0]);
    queryClient.setQueryData<InfiniteData<FeedResponse>>(queryKey, (old) =>
      old
        ? {
            pages: old.pages.slice(0, 1),
            pageParams: old.pageParams.slice(0, 1),
          }
        : old,
    );
  }, [queryClient, queryKey, refetch]);

  return {
    sections,
    items,
    hasLoadedItems,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the skeleton.
    isLoading: query.isInitialLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage === true && !isError,
    loadMore,
    error: formatSocialQueryErrorMessage(error),
    refresh,
  };
};
