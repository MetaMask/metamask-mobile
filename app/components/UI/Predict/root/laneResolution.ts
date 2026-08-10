import type { PredictConfig } from '../../PredictNext/config/predictConfig';
import type {
  PredictMarketListRouteParams,
  PredictStackParamList,
} from '../types/navigation';

export type PredictLane = 'polymarket' | 'kalshi';

export const resolveActiveVenue = (config: PredictConfig): PredictLane => {
  if (!config.enabled) {
    return 'polymarket';
  }
  return config.venues.kalshi.enabled && !config.venues.polymarket.enabled
    ? 'kalshi'
    : 'polymarket';
};

export const hasLegacyMarketListParams = (
  params?: PredictMarketListRouteParams,
): boolean =>
  Boolean(
    params?.feedId ||
      params?.tab ||
      params?.tabId ||
      params?.query ||
      params?.transactionActiveAbTests,
  );

export const resolvePredictMarketListLane = (
  config: PredictConfig,
  params?: PredictMarketListRouteParams,
): PredictLane =>
  hasLegacyMarketListParams(params) ? 'polymarket' : resolveActiveVenue(config);

export const resolvePredictRootLane = (
  config: PredictConfig,
  route?: {
    screen?: keyof PredictStackParamList;
    params?: PredictMarketListRouteParams;
  },
): PredictLane => {
  if (!route?.screen) {
    return resolveActiveVenue(config);
  }
  return route.screen === 'PredictMarketList'
    ? resolvePredictMarketListLane(config, route.params)
    : 'polymarket';
};
