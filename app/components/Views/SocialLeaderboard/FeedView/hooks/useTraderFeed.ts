import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import type {
  FeedItem as CoreFeedItem,
  FeedResponse,
} from '@metamask/social-controllers';
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
import {
  buildTraderFeedQueryKey,
  fetchTraderFeedPage,
  getTraderFeedNextPageParam,
  toFeedScope,
} from './traderFeedQueries';

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

/**
 * A mapped feed item paired with the raw API row it came from.
 *
 * `FeedItem` deliberately drops the fill history, so consumers that need to
 * derive figures it does not carry -- an average entry from `costBasis`, an
 * exit from the closing fill, a hold time from the first and last timestamps --
 * would otherwise have to re-fetch the position. Pairing them here keeps that
 * derivation on the page the feed already loaded.
 */
export interface TraderFeedRow {
  item: FeedItem;
  core: CoreFeedItem;
}

export interface UseTraderFeedResult {
  /** Feed items grouped by calendar day, newest first. */
  sections: FeedSection[];
  /** Flat list of items (ungrouped), newest first. */
  items: FeedItem[];
  /** `items`, each paired with its raw API row. Same order and filtering. */
  rows: TraderFeedRow[];
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
  /**
   * Instant the loaded snapshot was fetched, or `undefined` before the first
   * success. Advances on every successful fetch — including a refetch whose
   * payload is deeply equal to the cached one, which React Query would
   * otherwise hide behind structural sharing.
   */
  dataUpdatedAt: number | undefined;
}

const EMPTY_ROWS: TraderFeedRow[] = [];

/** Newest event first. Stable for equal timestamps (preserves API order). */
const byTimestampDesc = (a: TraderFeedRow, b: TraderFeedRow): number =>
  b.item.timestamp - a.item.timestamp;

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

/**
 * Groups a newest-first list into day sections. Consecutive items that share
 * a local calendar day share a header — which holds only after a global
 * timestamp sort of every loaded item.
 */
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

  const scope = toFeedScope(audience);

  const queryClient = useQueryClient();
  const queryKey = useMemo(() => buildTraderFeedQueryKey(scope), [scope]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      fetchTraderFeedPage(scope, pageParam),
    getNextPageParam: getTraderFeedNextPageParam,
    initialPageParam: undefined as string | undefined,
    enabled: enabled && isUnlocked,
    retry: false,
    // UI QueryClient owns this snapshot (same windows as ReactQueryService
    // defaults). SocialService.fetchFeed still uses staleTime: 0, so each
    // queryFn run is a network fetch.
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const pages = query.data?.pages ?? undefined;

  const loadedRows = useMemo(() => {
    if (!pages || pages.length === 0) {
      return EMPTY_ROWS;
    }
    // The feed splices notable positions in out of chronological order, while
    // the `olderThan` cursor is only the last item's timestamp — so a later
    // page can hold events newer than those spliced-in rows. Sort the whole
    // loaded set to keep one header per day.
    return pages
      .flatMap((page) => page.items ?? [])
      .map((core) => {
        const item = mapFeedItem(core);
        return item ? { item, core } : null;
      })
      .filter((row): row is TraderFeedRow => row !== null)
      .sort(byTimestampDesc);
  }, [pages]);

  const hasLoadedItems = loadedRows.length > 0;

  const rows = useMemo(() => {
    if (typeFilter === 'all') {
      return loadedRows;
    }
    return loadedRows.filter((row) => matchesTypeFilter(row.item, typeFilter));
  }, [loadedRows, typeFilter]);

  const items = useMemo(() => rows.map((row) => row.item), [rows]);

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
    sections,
    items,
    rows,
    hasLoadedItems,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the skeleton.
    isLoading: query.isInitialLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage === true && !isError,
    loadMore,
    error: formatSocialQueryErrorMessage(error),
    refresh,
    // React Query reports `0` until the first success; normalise to `undefined`
    // so consumers fall back to their own render-time clock.
    dataUpdatedAt: query.dataUpdatedAt || undefined,
  };
};
