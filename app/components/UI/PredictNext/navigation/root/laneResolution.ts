import type { PredictConfiguredVenue } from '../../implementation';
import type {
  PredictMarketListRouteParams,
  PredictStackParamList,
} from '../../../Predict/types/navigation';

export const hasLegacyMarketListParams = (
  params?: PredictMarketListRouteParams,
): boolean =>
  Boolean(params?.feedId || params?.tab || params?.tabId || params?.query);

/**
 * Venue a market list stays on regardless of the Active Venue: legacy feed
 * and search parameters stay on Polymarket. `undefined` leaves it to the
 * Active Venue. PRED-1379 removes this pinning.
 */
export const resolvePinnedMarketListVenue = (
  params?: PredictMarketListRouteParams,
): PredictConfiguredVenue | undefined =>
  hasLegacyMarketListParams(params) ? 'polymarket' : undefined;

/**
 * Venue that a legacy root entry point stays on regardless of the Active
 * Venue: specific child routes and parameterized market lists. PRED-1379
 * removes this pinning.
 */
export const resolvePinnedVenue = (route?: {
  screen?: keyof PredictStackParamList;
  params?: PredictMarketListRouteParams;
}): PredictConfiguredVenue | undefined => {
  if (!route?.screen) {
    return undefined;
  }
  if (route.screen !== 'PredictMarketList') {
    return 'polymarket';
  }
  return resolvePinnedMarketListVenue(route.params);
};
