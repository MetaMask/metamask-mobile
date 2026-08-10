import { useInfiniteQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type EventListParams,
  type GetEventsResult,
} from '../queries/marketDataQueries';
import type { PredictVenueId } from '../types';

export const useEventList = (
  venueId: PredictVenueId,
  params: EventListParams,
) =>
  useInfiniteQuery<GetEventsResult>({
    queryKey: marketDataQueries.getEvents(venueId, params).queryKey,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
