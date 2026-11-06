import { canPerformVenueAction } from '../capabilities/venueCapabilities';
import type { PredictVenueCapabilities } from '../capabilities/types';
import type {
  ActiveVenueResolution,
  PredictConfiguredVenue,
  PredictImplementation,
} from '../implementation/types';
import { getVenueImplementation } from '../implementation/venueImplementations';
import { PREDICT_FUNDING_IMPLEMENTATIONS } from './fundingImplementations';
import type { PredictFundingAction, PredictFundingResolution } from './types';

export interface PredictFundingInput {
  /** `selectPredictAvailability`: D1's availability for the Active Venue. */
  available: boolean;
  activeVenue: ActiveVenueResolution;
  /** The Venue's resolved capabilities: A3's descriptor. */
  getCapabilities: (venue: PredictConfiguredVenue) => PredictVenueCapabilities;
}

/**
 * Resolves which implementation runs a funding action for the Active Venue.
 * Ready only when Predict is available, the Active Venue's implementation has
 * a client flow for the action, and the Venue's descriptor lists it. Every
 * other case is unavailable, and a surface renders no entry point for it.
 */
export const resolvePredictFunding = (
  action: PredictFundingAction,
  { available, activeVenue, getCapabilities }: PredictFundingInput,
  implementations: Readonly<
    Record<PredictImplementation, readonly PredictFundingAction[]>
  > = PREDICT_FUNDING_IMPLEMENTATIONS,
): PredictFundingResolution => {
  if (activeVenue.status !== 'ready') {
    return { status: 'unavailable', reason: 'resolving' };
  }
  if (!available) {
    return { status: 'unavailable', reason: 'unavailable' };
  }
  const implementation = getVenueImplementation(activeVenue.venue);
  if (!implementations[implementation].includes(action)) {
    return { status: 'unavailable', reason: 'notImplemented' };
  }
  if (!canPerformVenueAction(getCapabilities(activeVenue.venue), action)) {
    return { status: 'unavailable', reason: 'unsupported' };
  }
  return { status: 'ready', implementation };
};
