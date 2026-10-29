import type { PredictConfig } from '../config/predictConfig';
import type { PredictVenueId } from '../types';

/** A Venue known to rollout config. */
export type PredictConfiguredVenue = keyof PredictConfig['venues'];

export type ActiveVenueResolution =
  | { status: 'resolving' }
  | { status: 'ready'; venue: PredictConfiguredVenue };

/** The code that serves a Venue: unchanged legacy Polymarket or venue-generic PredictNext. */
export type PredictImplementation = 'legacy' | 'next';

export type PredictImplementationResolution =
  | { status: 'resolving' }
  | { status: 'ready'; implementation: 'legacy' }
  | { status: 'ready'; implementation: 'next'; venueId: PredictVenueId };
