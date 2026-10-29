import { useActivity } from '../../../hooks/useActivity';
import { PORTFOLIO_PAGE_LIMIT } from '../../../queries/portfolioQueries';
import type { PredictVenueId } from '../../../types';

/** Same params as the Portfolio screen, so both share one cached list. */
const NEXT_ACTIVITY_PARAMS = { limit: PORTFOLIO_PAGE_LIMIT };

/** Keys the disabled query while no next Venue is active. Never fetched. */
const NO_VENUE = '' as PredictVenueId;

/**
 * The Venue's canonical Activity query, shared by the Activity list and the
 * details lookup. Runs only for a Venue, so the legacy branch reads nothing.
 *
 * @param venueId - The active next Venue, or `undefined` to stay idle.
 * @param enabled - Whether to read.
 * @returns The infinite Activity query.
 */
export const useNextActivity = (
  venueId: PredictVenueId | undefined,
  enabled: boolean,
) =>
  useActivity(venueId ?? NO_VENUE, NEXT_ACTIVITY_PARAMS, {
    enabled: enabled && venueId !== undefined,
  });
