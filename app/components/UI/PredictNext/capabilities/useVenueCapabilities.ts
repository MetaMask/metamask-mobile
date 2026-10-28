import { useCallback, useMemo } from 'react';
import { useQuery } from '@metamask/react-data-query';
import {
  marketDataQueries,
  type GetVenueCatalogResult,
} from '../queries/marketDataQueries';
import type { PredictVenueId } from '../types';
import type { PredictVenueCapabilities } from './types';
import {
  getVenueCapabilitySource,
  resolveVenueCapabilities,
} from './venueCapabilities';

/**
 * Reads what a Venue supports. Bundled catalogs resolve synchronously; a
 * service catalog is cached by `PredictMarketDataService` for five minutes,
 * and the UI keeps the last valid catalog through a failed refresh. The result
 * is re-validated here, so malformed or mismatched data enables nothing.
 */
export const useVenueCapabilities = (
  venueId: PredictVenueId,
): PredictVenueCapabilities => {
  const isServiceSource =
    getVenueCapabilitySource(venueId)?.catalog.type === 'service';
  const { data, isError, refetch } = useQuery<GetVenueCatalogResult>({
    queryKey: marketDataQueries.getVenueCatalog(venueId).queryKey,
    enabled: isServiceSource,
  });
  const retry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  return useMemo(
    () => resolveVenueCapabilities(venueId, { data, isError, retry }),
    [venueId, data, isError, retry],
  );
};
