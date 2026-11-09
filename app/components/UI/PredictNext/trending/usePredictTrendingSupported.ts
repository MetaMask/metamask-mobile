import { isVenueSearchSupported, useVenueCapabilities } from '../capabilities';
import { usePredictImplementation } from '../implementation';
import { NO_VENUE } from './internal/next/useNextTrendingFeed';
import type { PredictTrendingSurface } from './types';

/**
 * Whether the Active Venue has an Explore surface, so a caller leaves it out
 * instead of rendering it empty. The legacy lane has both. A next Venue has
 * `search` when its descriptor supports search, and never `allSports`: that
 * list's sports are Polymarket tags with no Feed key, and a missing key never
 * falls back to another Feed. Neither while the Active Venue resolves.
 * Predict availability is a separate gate.
 */
export const usePredictTrendingSupported = (
  surface: PredictTrendingSurface,
): boolean => {
  const resolution = usePredictImplementation();
  const searchVenueId =
    surface === 'search' &&
    resolution.status === 'ready' &&
    resolution.implementation === 'next'
      ? resolution.venueId
      : NO_VENUE;
  const capabilities = useVenueCapabilities(searchVenueId);

  if (resolution.status !== 'ready') return false;
  if (resolution.implementation === 'legacy') return true;
  return searchVenueId !== NO_VENUE && isVenueSearchSupported(capabilities);
};
