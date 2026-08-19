import { useInfiniteQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type FeedParams,
  type GetFeedResult,
} from '../queries/marketDataQueries';
import type { PredictFeedId, PredictVenueId } from '../types';

/** Reads a paginated Feed for a Venue. */
export const useFeed = (
  venueId: PredictVenueId,
  feedId: PredictFeedId,
  params: FeedParams,
) =>
  useInfiniteQuery<GetFeedResult>({
    queryKey: marketDataQueries.getFeed(venueId, feedId, params).queryKey,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
