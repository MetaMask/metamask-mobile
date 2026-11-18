import { createSelector } from 'reselect';
import { selectPredictAvailability } from '../availability/selectPredictAvailability';
import { resolveVenueCapabilities } from '../capabilities/venueCapabilities';
import { getVenueFeatures } from '../config/predictConfig';
import type { PredictConfiguredVenue } from '../implementation/types';
import type { PredictVenueId } from '../types';
import { selectActiveVenue } from '../implementation/activeVenue';
import { selectPredictConfig } from '../selectors/predictConfig';
import { resolvePredictFunding } from './resolvePredictFunding';

/**
 * Bundled catalogs only. Every Venue the legacy implementation serves has a
 * bundled catalog (asserted in the tests), so this is exact for the legacy
 * deposit. A service catalog resolves as loading here, which offers nothing.
 */
const getBundledCapabilities = (venue: PredictConfiguredVenue) =>
  resolveVenueCapabilities(venue as PredictVenueId, {
    data: undefined,
    isError: false,
    retry: () => undefined,
  });

/**
 * Whether the Active Venue's deposit is the legacy Polymarket deposit, and it
 * may be offered: Predict is available, the descriptor lists `deposit`, and
 * the legacy implementation serves the Venue. False while Kalshi is active,
 * whatever `venues.kalshi.features?.deposit` says: the Kalshi deposit is a
 * different flow. Also unaffected by `venues.polymarket.features?.deposit`.
 */
export const selectPredictLegacyDepositAvailable = createSelector(
  selectPredictAvailability,
  selectActiveVenue,
  selectPredictConfig,
  (available, activeVenue, config): boolean => {
    const resolution = resolvePredictFunding('deposit', {
      available,
      activeVenue,
      getCapabilities: getBundledCapabilities,
      getVenueFeatures: (venue) => getVenueFeatures(config, venue),
    });
    return (
      resolution.status === 'ready' && resolution.implementation === 'legacy'
    );
  },
);
