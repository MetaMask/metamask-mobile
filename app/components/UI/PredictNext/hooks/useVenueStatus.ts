import { useQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type GetVenueStatusResult,
} from '../queries/marketDataQueries';
import type { PredictVenueId } from '../types';

export const useVenueStatus = (venueId: PredictVenueId) =>
  useQuery<GetVenueStatusResult>({
    queryKey: marketDataQueries.getVenueStatus(venueId).queryKey,
  });
