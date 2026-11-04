import type { PredictConfiguredVenue } from '../../implementation';
import type { PredictMarketListRouteParams } from '../../../Predict/types/navigation';
import type { PredictRootScreenParamList } from '../appRoutes';
import { PredictNextRoutes } from '../routes';

const PREDICT_NEXT_SCREENS: ReadonlySet<string> = new Set(
  Object.values(PredictNextRoutes),
);

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
 * Venue: specific legacy child routes and parameterized market lists.
 * PredictNext routes, which intents open for the Active Venue, are never
 * pinned. PRED-1379 removes this pinning.
 */
export const resolvePinnedVenue = (route?: {
  screen?: keyof PredictRootScreenParamList;
  params?: object;
}): PredictConfiguredVenue | undefined => {
  if (!route?.screen || PREDICT_NEXT_SCREENS.has(route.screen)) {
    return undefined;
  }
  if (route.screen !== 'PredictMarketList') {
    return 'polymarket';
  }
  return resolvePinnedMarketListVenue(
    route.params as PredictMarketListRouteParams | undefined,
  );
};
