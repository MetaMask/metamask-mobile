import { useQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type GetVenueStatusResult,
} from '../queries/marketDataQueries';
import type { PredictVenueId } from '../types';

export interface UseVenueStatusOptions {
  enabled?: boolean;
}

/** Reads cached availability for a Venue. */
export const useVenueStatus = (
  venueId: PredictVenueId,
  options?: UseVenueStatusOptions,
) =>
  useQuery<GetVenueStatusResult>({
    queryKey: marketDataQueries.getVenueStatus(venueId).queryKey,
    enabled: options?.enabled,
  });
