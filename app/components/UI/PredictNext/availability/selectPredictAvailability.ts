import { createSelector } from 'reselect';
import { selectPredictEnabledFlag } from '../../Predict/selectors/featureFlags';
import { selectActiveVenue } from '../implementation/activeVenue';
import { getRolloutVenues } from '../implementation/resolveActiveVenue';
import type { PredictConfiguredVenue } from '../implementation/types';
import { getVenueImplementation } from '../implementation/venueImplementations';
import { selectPredictConfig } from '../selectors/predictConfig';

/**
 * A Venue's availability by implementation. The legacy lane keeps today's
 * rule, `predictTradingEnabled`. A `next` Venue's kill switch is its
 * `predictConfig` rollout flag, which has already made it a candidate.
 */
const isVenueAvailable = (
  venue: PredictConfiguredVenue,
  legacyAvailable: boolean,
): boolean =>
  getVenueImplementation(venue) === 'legacy' ? legacyAvailable : true;

/**
 * Whether Predict entry points show for the Active Venue. While Polymarket is
 * active it equals `selectPredictEnabledFlag`. While the Active Venue is
 * resolving it is true only if every candidate is available, so an entry
 * point never appears and then disappears.
 *
 * Availability only: Account Readiness and eligibility gate actions, not
 * browsing; Venue Status covers degraded browsing and Venue Capabilities
 * cover feature support, each as its own projection.
 */
export const selectPredictAvailability = createSelector(
  selectPredictEnabledFlag,
  selectPredictConfig,
  selectActiveVenue,
  (legacyAvailable, config, activeVenue): boolean => {
    const venues =
      activeVenue.status === 'ready'
        ? [activeVenue.venue]
        : getRolloutVenues(config);
    return venues.every((venue) => isVenueAvailable(venue, legacyAvailable));
  },
);
