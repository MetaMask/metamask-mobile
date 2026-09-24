import { useQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type SearchEventsResult,
} from '../queries/marketDataQueries';
import type { PredictVenueId } from '../types';

export const SEARCH_RESULT_LIMIT = 20;

/** Searches a Venue's browsable Events by text. Disabled for a blank query. */
export const useSearchEvents = (venueId: PredictVenueId, q: string) => {
  const trimmed = q.trim();
  return useQuery<SearchEventsResult>({
    queryKey: marketDataQueries.searchEvents(venueId, {
      q: trimmed,
      limit: SEARCH_RESULT_LIMIT,
    }).queryKey,
    enabled: trimmed.length > 0,
  });
};
