import {
  resolveActiveVenue,
  type PredictConfiguredVenue,
} from '../../implementation';
import type { PredictConfig } from '../../config/predictConfig';
import type {
  PredictMarketListRouteParams,
  PredictStackParamList,
} from '../../../Predict/types/navigation';

export const hasLegacyMarketListParams = (
  params?: PredictMarketListRouteParams,
): boolean =>
  Boolean(params?.feedId || params?.tab || params?.tabId || params?.query);

export const resolvePredictMarketListLane = (
  config: PredictConfig,
  params?: PredictMarketListRouteParams,
): PredictConfiguredVenue =>
  hasLegacyMarketListParams(params) ? 'polymarket' : resolveActiveVenue(config);

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
  return hasLegacyMarketListParams(route.params) ? 'polymarket' : undefined;
};
