import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
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
import { mapFeedItem } from '../utils/mapFeedItem';
import type { FeedAudience, FeedItem, FeedSection } from '../types';

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
  /** Gate the query (defaults to enabled). Always additionally gated on unlock. */
  enabled?: boolean;
}

export interface UseTraderFeedResult {
  /** Feed items grouped by calendar day, newest first. */
  sections: FeedSection[];
  /** Flat list of items (ungrouped), newest first. */
  items: FeedItem[];
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
  /** Refetch from the first page. */
  refresh: () => void;
}

const EMPTY_ITEMS: FeedItem[] = [];

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
  const { audience = 'all', enabled = true } = options;
  const isUnlocked = useSelector(selectIsUnlocked);

  const scope: FeedScope =
    audience === 'following' ? 'following' : 'leaderboard';

  const query = useInfiniteQuery({
    queryKey: ['SocialService:fetchFeed', { scope }],
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

  const items = useMemo(() => {
    if (!pages || pages.length === 0) {
      return EMPTY_ITEMS;
    }
    return pages
      .flatMap((page) => page.items ?? [])
      .map(mapFeedItem)
      .filter((item): item is FeedItem => item !== null);
  }, [pages]);

  const sections = useMemo(() => groupByDay(items), [items]);

  const error = query.error ?? null;
  useLogSocialQueryError(error, {
    surface: 'trader_feed',
    operation: 'fetch_feed',
    extraMessage: 'Trader feed fetch failed',
    source: 'useTraderFeed',
    endpoint: 'feed',
    queryParams: { scope },
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError } = query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

  return {
    sections,
    items,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the skeleton.
    isLoading: query.isInitialLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage === true && !isError,
    loadMore,
    error: formatSocialQueryErrorMessage(error),
    refresh: query.refetch,
  };
};
