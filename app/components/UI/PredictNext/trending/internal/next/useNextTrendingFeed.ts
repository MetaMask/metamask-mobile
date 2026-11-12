import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeedRefresh } from '../../../../../Views/TrendingView/hooks/useFeedRefresh';
import {
  PREDICT_SURFACE_FEED_KEYS,
  getVenueFeedId,
  isVenueSearchSupported,
  useVenueCapabilities,
} from '../../../capabilities';
import { useFeed } from '../../../hooks/useFeed';
import {
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_RESULT_LIMIT,
  useSearchEvents,
} from '../../../hooks/useSearchEvents';
import { marketDataQueries } from '../../../queries/marketDataQueries';
import type { PredictEvent, PredictVenueId } from '../../../types';
import type {
  PredictTrendingFeed,
  PredictTrendingTab,
  UsePredictTrendingFeedOptions,
} from '../../types';
import { toNextTrendingMarket } from '../nextMarkets';

/** Stands in for the Venue while the next branch is inactive: nothing reads. */
export const NO_VENUE = '' as PredictVenueId;

/** An Explore carousel shows at most six markets, so it reads no more. */
export const EXPLORE_FEED_LIMIT = 6;
const FEED_PARAMS = { limit: EXPLORE_FEED_LIMIT };
const NO_EVENTS: readonly PredictEvent[] = [];

interface UseNextTrendingFeedOptions
  extends Pick<UsePredictTrendingFeedOptions, 'query' | 'refresh'> {
  /** The next Venue to read, or undefined while the next branch is inactive. */
  venueId: PredictVenueId | undefined;
  tab: PredictTrendingTab;
  enabled: boolean;
}

/**
 * The next branch of `usePredictTrendingFeed`. A tab reads the Feed its key
 * maps to in the Venue's descriptor (`PREDICT_SURFACE_FEED_KEYS.exploreTabs`)
 * and nothing when the Venue lacks that key: the section is left out, never
 * filled from another Feed or Venue. A query searches with `useSearchEvents`
 * when the descriptor supports search; that search is unpaginated, so the
 * feed has no `fetchMore`. Inactive (no Venue, or disabled), it reads
 * nothing, not even the Venue catalog, and still records Explore refresh
 * triggers so becoming active never replays one.
 */
export const useNextTrendingFeed = ({
  venueId,
  tab,
  query,
  refresh,
  enabled,
}: UseNextTrendingFeedOptions): PredictTrendingFeed => {
  const queryClient = useQueryClient();
  const readVenueId = enabled && venueId !== undefined ? venueId : NO_VENUE;
  const isActive = readVenueId !== NO_VENUE;
  const capabilities = useVenueCapabilities(readVenueId);

  const trimmedQuery = query?.trim() ?? '';
  const isSearching = trimmedQuery.length > 0;
  // The backend rejects a longer query, so it reads nothing and finds nothing.
  const canSearch =
    isActive &&
    isSearching &&
    trimmedQuery.length <= SEARCH_QUERY_MAX_LENGTH &&
    isVenueSearchSupported(capabilities);
  const feedId =
    isActive && !isSearching
      ? getVenueFeedId(capabilities, PREDICT_SURFACE_FEED_KEYS.exploreTabs[tab])
      : undefined;

  const feed = useFeed(readVenueId, feedId, FEED_PARAMS);
  const search = useSearchEvents(readVenueId, canSearch ? trimmedQuery : '');

  const activeQueryKey = useMemo(() => {
    if (canSearch) {
      return marketDataQueries.searchEvents(readVenueId, {
        q: trimmedQuery,
        limit: SEARCH_RESULT_LIMIT,
      }).queryKey;
    }
    if (feedId !== undefined) {
      return marketDataQueries.getFeed(readVenueId, feedId, FEED_PARAMS)
        .queryKey;
    }
    return undefined;
  }, [canSearch, feedId, readVenueId, trimmedQuery]);

  /**
   * Invalidates through the data service, so an Explore refresh reads the
   * backend instead of the service's cache. Only the shown read refetches.
   */
  const refetch = useCallback(async () => {
    if (!activeQueryKey) return;
    await queryClient.invalidateQueries({
      queryKey: activeQueryKey,
      exact: true,
    });
  }, [activeQueryKey, queryClient]);

  useFeedRefresh(refresh, refetch, activeQueryKey !== undefined);

  const feedEvents = useMemo(
    () => feed.data?.pages.flatMap((page) => page.events),
    [feed.data],
  );
  let events: readonly PredictEvent[] | undefined;
  if (canSearch) {
    events = search.data?.events;
  } else if (feedId !== undefined) {
    events = feedEvents;
  }
  // Minted once per read, so a re-render hands Explore the same markets.
  const data = useMemo(
    () => (events ?? NO_EVENTS).map(toNextTrendingMarket),
    [events],
  );
  // A fresh key commits one frame as pending before its request starts, so
  // "no data and no error yet" is loading, not empty.
  const isError = canSearch ? search.isError : feed.isError;
  const isLoading =
    activeQueryKey !== undefined && events === undefined && !isError;

  return useMemo(
    () => ({
      data,
      isLoading,
      refetch,
      ...(isSearching ? { hasMore: false, total: data.length } : {}),
    }),
    [data, isLoading, isSearching, refetch],
  );
};
