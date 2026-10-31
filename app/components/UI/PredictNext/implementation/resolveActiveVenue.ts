import {
  UNKNOWN_LOCATION,
  type GeolocationControllerState,
} from '@metamask/geolocation-controller';
import { isUsaGeolocationLocation } from '../../../../util/region/isUsaGeolocationLocation';
import type { PredictConfig } from '../config/predictConfig';
import type {
  ActiveVenueResolution,
  IgnoredVenueSelectionPreference,
  PredictConfiguredVenue,
  SessionDefaultVenue,
} from './types';

/**
 * How long the Active Venue waits for the Engine-start geolocation fetch
 * before falling back. Matched to the Home skeleton: the skeleton covers the
 * wait, and a slow location never holds Predict behind it for longer.
 */
export const ACTIVE_VENUE_GEOLOCATION_WAIT_MS = 3_000;

/**
 * The Venue the legacy lane serves, and the default when no location and no
 * history are known.
 */
export const LEGACY_LANE_VENUE: PredictConfiguredVenue = 'polymarket';

/** The regional default for a known location. Unlisted regions get the legacy lane's Venue. */
const resolveRegionalVenue = (location: string): PredictConfiguredVenue =>
  isUsaGeolocationLocation(location) ? 'kalshi' : LEGACY_LANE_VENUE;

/**
 * Venues `predictConfig` makes candidates for the Active Venue. When
 * `predictConfig.enabled` is false there are none: the legacy lane serves
 * Predict, which is not a kill switch.
 */
export const getRolloutVenues = (
  config: PredictConfig,
): PredictConfiguredVenue[] =>
  config.enabled
    ? (Object.keys(config.venues) as PredictConfiguredVenue[]).filter(
        (venue) => config.venues[venue].enabled,
      )
    : [];

/**
 * Venues a Venue Selection Preference may name. Empty unless there is a real
 * choice: venue selection is enabled and more than one Venue is rolled out.
 */
export const getSelectableVenues = (
  config: PredictConfig,
): PredictConfiguredVenue[] => {
  const candidates = getRolloutVenues(config);
  return config.venueSelection.enabled && candidates.length > 1
    ? candidates
    : [];
};

const isKnownLocation = (location: string): boolean =>
  location !== '' && location !== UNKNOWN_LOCATION;

export interface SessionDefaultVenueInputs {
  geolocation: Pick<GeolocationControllerState, 'location' | 'status'>;
  lastActiveVenue: PredictConfiguredVenue | null;
  /** True once {@link ACTIVE_VENUE_GEOLOCATION_WAIT_MS} has elapsed. */
  waitExpired: boolean;
}

/**
 * Resolution steps 3 to 5: the regional default from a known location, else
 * nothing while geolocation may still arrive, else the last Active Venue,
 * else the legacy lane's Venue. Returns `undefined` while it should wait.
 */
export const resolveSessionDefaultVenue = ({
  geolocation,
  lastActiveVenue,
  waitExpired,
}: SessionDefaultVenueInputs): SessionDefaultVenue | undefined => {
  if (isKnownLocation(geolocation.location)) {
    return {
      venue: resolveRegionalVenue(geolocation.location),
      source: 'geolocation',
    };
  }
  const geolocationSettled =
    geolocation.status === 'complete' || geolocation.status === 'error';
  if (!geolocationSettled && !waitExpired) {
    return undefined;
  }
  return lastActiveVenue
    ? { venue: lastActiveVenue, source: 'lastActiveVenue' }
    : { venue: LEGACY_LANE_VENUE, source: 'fallback' };
};

export interface ActiveVenueInputs {
  config: PredictConfig;
  venueSelectionPreference: PredictConfiguredVenue | null;
  /** This session's latched regional default; `null` until it is decided. */
  sessionDefault: SessionDefaultVenue | null;
}

const findIgnoredPreference = (
  config: PredictConfig,
  candidates: PredictConfiguredVenue[],
  preference: PredictConfiguredVenue | null,
): IgnoredVenueSelectionPreference | undefined => {
  if (!preference) {
    return undefined;
  }
  if (!candidates.includes(preference)) {
    return { venue: preference, reason: 'venueNotEnabled' };
  }
  if (!config.venueSelection.enabled) {
    return { venue: preference, reason: 'venueSelectionDisabled' };
  }
  return undefined;
};

/**
 * The one Active Venue rule. In order: (1) only rollout-enabled Venues are
 * candidates, none means the legacy lane and exactly one wins; (2) a Venue
 * Selection Preference naming a candidate, while venue selection is enabled;
 * (3–5) this session's regional default ({@link resolveSessionDefaultVenue}),
 * `resolving` until it is latched.
 */
export const resolveActiveVenue = ({
  config,
  venueSelectionPreference,
  sessionDefault,
}: ActiveVenueInputs): ActiveVenueResolution => {
  const candidates = getRolloutVenues(config);
  const ignoredPreference = findIgnoredPreference(
    config,
    candidates,
    venueSelectionPreference,
  );
  const ready = (
    venue: PredictConfiguredVenue,
    source: Extract<ActiveVenueResolution, { status: 'ready' }>['source'],
  ): ActiveVenueResolution =>
    ignoredPreference
      ? { status: 'ready', venue, source, ignoredPreference }
      : { status: 'ready', venue, source };

  if (candidates.length === 0) {
    return ready(LEGACY_LANE_VENUE, 'legacyLane');
  }
  if (candidates.length === 1) {
    return ready(candidates[0], 'rollout');
  }
  if (venueSelectionPreference && !ignoredPreference) {
    return ready(venueSelectionPreference, 'preference');
  }
  if (!sessionDefault) {
    return { status: 'resolving' };
  }
  return ready(sessionDefault.venue, sessionDefault.source);
};
