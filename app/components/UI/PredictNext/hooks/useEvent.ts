import { useQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type GetEventResult,
} from '../queries/marketDataQueries';
import type { PredictEntityId, PredictVenueId } from '../types';

export interface UseEventOptions {
  enabled?: boolean;
}

/** Reads one Event from a Venue. */
export const useEvent = (
  venueId: PredictVenueId,
  eventId: PredictEntityId,
  options?: UseEventOptions,
) =>
  useQuery<GetEventResult>({
    queryKey: marketDataQueries.getEvent(venueId, eventId).queryKey,
    enabled: options?.enabled,
  });
