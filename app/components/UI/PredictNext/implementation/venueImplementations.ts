import type { PredictVenueId } from '../types';
import type {
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

export const getVenueImplementation = (
  venue: PredictConfiguredVenue,
): PredictImplementation => VENUE_IMPLEMENTATIONS[venue];

export const resolveVenueImplementation = (
  activeVenue:
    | { status: 'resolving' }
    | { status: 'ready'; venue: PredictConfiguredVenue },
): PredictImplementationResolution => {
  if (activeVenue.status === 'resolving') {
    return activeVenue;
  }
  return getVenueImplementation(activeVenue.venue) === 'legacy'
    ? { status: 'ready', implementation: 'legacy' }
    : {
        status: 'ready',
        implementation: 'next',
        venueId: activeVenue.venue as PredictVenueId,
      };
};
