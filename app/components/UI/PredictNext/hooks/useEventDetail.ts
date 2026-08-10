import { useQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type GetEventResult,
} from '../queries/marketDataQueries';
import type { PredictEntityId, PredictVenueId } from '../types';

export const useEventDetail = (
  venueId: PredictVenueId,
  eventId: PredictEntityId,
) =>
  useQuery<GetEventResult>({
    queryKey: marketDataQueries.getEvent(venueId, eventId).queryKey,
  });
