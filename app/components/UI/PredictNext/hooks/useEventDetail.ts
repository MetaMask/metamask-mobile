import { useQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type GetEventResult,
} from '../queries/marketDataQueries';
import type { PredictEntityId, PredictVenueId } from '../types';

/** Reads one Event from a Venue. */
export const useEventDetail = (
  venueId: PredictVenueId,
  eventId: PredictEntityId,
) =>
  useQuery<GetEventResult>({
    queryKey: marketDataQueries.getEvent(venueId, eventId).queryKey,
  });
