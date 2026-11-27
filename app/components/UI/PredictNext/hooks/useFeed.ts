import { useInfiniteQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type FeedParams,
  type GetFeedResult,
} from '../queries/marketDataQueries';
import type { PredictFeedId, PredictVenueId } from '../types';

/** Placeholder key for an absent Feed; the query is disabled and never runs. */
const NO_FEED_ID = '' as PredictFeedId;

/**
 * Reads a paginated Feed for a Venue. An undefined `feedId` (the Venue does
 * not support the Feed's key) reads nothing and stays idle. `enabled: false`
 * pauses the read but keeps any cached pages. `refetchInterval` reads the
 * Feed again on that period while the app is active; React Query pauses it
 * in the background.
 */
export const useFeed = (
  venueId: PredictVenueId,
  feedId: PredictFeedId | undefined,
  params: FeedParams,
  {
    enabled = true,
    refetchInterval = false,
  }: { enabled?: boolean; refetchInterval?: number | false } = {},
) =>
  useInfiniteQuery<GetFeedResult>({
    queryKey: marketDataQueries.getFeed(venueId, feedId ?? NO_FEED_ID, params)
      .queryKey,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: enabled && feedId !== undefined,
    refetchInterval,
  });
