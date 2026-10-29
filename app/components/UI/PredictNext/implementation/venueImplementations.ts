import type { PredictVenueId } from '../types';
import type {
  ActiveVenueResolution,
  PredictConfiguredVenue,
  PredictImplementation,
  PredictImplementationResolution,
} from './types';

/** The one place that maps each Venue to its implementation. PRED-1356 moves Polymarket to `next`. */
const VENUE_IMPLEMENTATIONS: Record<
  PredictConfiguredVenue,
  PredictImplementation
> = {
  polymarket: 'legacy',
  kalshi: 'next',
};

export const resolveVenueImplementation = (
  activeVenue: ActiveVenueResolution,
): PredictImplementationResolution => {
  if (activeVenue.status === 'resolving') {
    return activeVenue;
  }
  return VENUE_IMPLEMENTATIONS[activeVenue.venue] === 'legacy'
    ? { status: 'ready', implementation: 'legacy' }
    : {
        status: 'ready',
        implementation: 'next',
        venueId: activeVenue.venue as PredictVenueId,
      };
};
