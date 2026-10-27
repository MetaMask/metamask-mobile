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
 * not support the Feed's key) reads nothing and stays idle.
 */
export const useFeed = (
  venueId: PredictVenueId,
  feedId: PredictFeedId | undefined,
  params: FeedParams,
) =>
  useInfiniteQuery<GetFeedResult>({
    queryKey: marketDataQueries.getFeed(venueId, feedId ?? NO_FEED_ID, params)
      .queryKey,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: feedId !== undefined,
  });
