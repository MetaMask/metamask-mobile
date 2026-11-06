import type { PredictImplementation } from '../implementation/types';
import type { PredictVenueAction } from '../types';

/** A funding action: moving money into or out of a Venue's balance. */
export type PredictFundingAction = Extract<
  PredictVenueAction,
  'deposit' | 'withdraw'
>;

/**
 * Why a funding action cannot be offered. `resolving`: the Active Venue is
 * not known yet. `unavailable`: Predict is not available for the Active Venue
 * (`selectPredictAvailability`). `notImplemented`: this client has no flow
 * for the action on the Active Venue's implementation, whatever its
 * descriptor says. `unsupported`: the Active Venue's descriptor does not list
 * the action, or its capabilities are not resolved.
 */
export type PredictFundingUnavailableReason =
  | 'resolving'
  | 'unavailable'
  | 'notImplemented'
  | 'unsupported';

/** Which implementation runs a funding action for the Active Venue, if any. */
export type PredictFundingResolution =
  | { status: 'ready'; implementation: PredictImplementation }
  | { status: 'unavailable'; reason: PredictFundingUnavailableReason };
