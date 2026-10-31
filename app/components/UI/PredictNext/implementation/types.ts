import type { PredictConfig } from '../config/predictConfig';
import type { PredictVenueId } from '../types';

/** A Venue known to rollout config. */
export type PredictConfiguredVenue = keyof PredictConfig['venues'];

/**
 * Which resolution step decided the Active Venue. `legacyLane`:
 * `predictConfig` is disabled or enables no Venue. `rollout`: exactly one
 * Venue is rolled out. `preference`: a valid Venue Selection Preference.
 * `geolocation`: this session's default from a known location.
 * `lastActiveVenue`: geolocation was unavailable, so the previous session's
 * Active Venue applies. `fallback`: geolocation was unavailable and nothing
 * was persisted.
 */
export type ActiveVenueSource =
  | 'legacyLane'
  | 'rollout'
  | 'preference'
  | SessionDefaultVenueSource;

/** How this session's regional default was decided. */
export type SessionDefaultVenueSource =
  | 'geolocation'
  | 'lastActiveVenue'
  | 'fallback';

// A type alias, not an interface: it is controller state, and `BaseController`
// needs the implicit index signature that interfaces do not get.
/**
 * The regional default latched once per app session. A later geolocation
 * result does not replace it; it applies from the next session.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SessionDefaultVenue = {
  venue: PredictConfiguredVenue;
  source: SessionDefaultVenueSource;
};

/** Why a stored Venue Selection Preference did not decide the Active Venue. */
export type IgnoredVenueSelectionPreferenceReason =
  | 'venueNotEnabled'
  | 'venueSelectionDisabled';

export interface IgnoredVenueSelectionPreference {
  venue: PredictConfiguredVenue;
  reason: IgnoredVenueSelectionPreferenceReason;
}

export type ActiveVenueResolution =
  | { status: 'resolving' }
  | {
      status: 'ready';
      venue: PredictConfiguredVenue;
      source: ActiveVenueSource;
      /** Present when a stored preference exists but was not honored. */
      ignoredPreference?: IgnoredVenueSelectionPreference;
    };

/** The code that serves a Venue: unchanged legacy Polymarket or venue-generic PredictNext. */
export type PredictImplementation = 'legacy' | 'next';

export type PredictImplementationResolution =
  | { status: 'resolving' }
  | { status: 'ready'; implementation: 'legacy' }
  | { status: 'ready'; implementation: 'next'; venueId: PredictVenueId };
