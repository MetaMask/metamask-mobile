import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import type {
  FeedResponse,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import {
  formatSocialQueryErrorMessage,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import { formatTradeDayLabel } from '../../../../UI/SocialFeed/utils/formatters';
import { FEED_CAIP2_CHAINS } from '../../../../UI/SocialFeed/data/feed-constants';
import { mapFeedItem } from '../../../../UI/SocialFeed/utils/mapFeedItem';
import type {
  FeedAudience,
  FeedItem,
  TraderFeedRow as BaseTraderFeedRow,
} from '../../../../UI/SocialFeed/types';
import type { FeedSection, FeedTypeFilter } from '../types';
import {
  buildTraderFeedQueryKey,
  fetchTraderFeedPage,
  getTraderFeedNextPageParam,
} from './traderFeedQueries';
import { toFeedScope } from '../../../../UI/SocialFeed/data/socialFeedSource';

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
export interface TraderFeedRow extends BaseTraderFeedRow {
  realtimeEventId?: string;
  realtimeFeedItemId?: string;
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
  /** Marks a realtime row's entrance animation as complete. */
  markRealtimeEventAnimated: (eventId: string) => void;
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
  const realtimeService = Engine.context.SocialRealtimeService;
  const [realtimeRows, setRealtimeRows] = useState<TraderFeedRow[]>([]);

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

  const handleRealtimeEvent = useCallback((event: SocialFeedEvent) => {
    const item = mapFeedItem(event.data);
    if (!item) {
      return;
    }

    setRealtimeRows((currentRows) => [
      {
        item,
        core: event.data,
        realtimeEventId: event.eventId,
        realtimeFeedItemId: event.feedItemId,
      },
      ...currentRows.filter(
        (row) =>
          row.item.id !== item.id &&
          row.realtimeFeedItemId !== event.feedItemId,
      ),
    ]);
  }, []);

  const allRows = useMemo(() => {
    const rowsByItemId = new Map(loadedRows.map((row) => [row.item.id, row]));

    realtimeRows.forEach((row) => rowsByItemId.set(row.item.id, row));

    return [...rowsByItemId.values()].sort(byTimestampDesc);
  }, [loadedRows, realtimeRows]);

  const hasLoadedItems = allRows.length > 0;

  const rows = useMemo(() => {
    if (typeFilter === 'all') {
      return allRows;
    }
    return allRows.filter((row) => matchesTypeFilter(row.item, typeFilter));
  }, [allRows, typeFilter]);

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

  const markRealtimeEventAnimated = useCallback((eventId: string) => {
    setRealtimeRows((currentRows) =>
      currentRows.map((row) =>
        row.realtimeEventId === eventId
          ? { ...row, realtimeEventId: undefined }
          : row,
      ),
    );
  }, []);

  const realtimeActive = enabled && isUnlocked && audience === 'all';

  useEffect(() => {
    const deactivate = () => {
      void realtimeService.setActive(false).catch(() => undefined);
    };

    if (!realtimeActive) {
      setRealtimeRows([]);
      deactivate();
      return undefined;
    }

    const removeFeedListener = realtimeService.addListener(handleRealtimeEvent);
    const removeReconnectListener = realtimeService.addReconnectListener(() => {
      void refresh().catch(() => undefined);
    });

    void realtimeService.setActive(true).catch(() => undefined);

    return () => {
      removeFeedListener();
      removeReconnectListener();
      setRealtimeRows([]);
      deactivate();
    };
  }, [
    audience,
    enabled,
    handleRealtimeEvent,
    isUnlocked,
    realtimeActive,
    realtimeService,
    refresh,
  ]);

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
    markRealtimeEventAnimated,
    // React Query reports `0` until the first success; normalise to `undefined`
    // so consumers fall back to their own render-time clock.
    dataUpdatedAt: query.dataUpdatedAt || undefined,
  };
};
