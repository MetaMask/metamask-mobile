import { RampIntent, RampType } from '../types';
import Routes from '../../../../../constants/navigation/Routes';

function createRampNavigationDetails(rampType: RampType, intent?: RampIntent) {
  const route = rampType === RampType.BUY ? Routes.RAMP.BUY : Routes.RAMP.SELL;
  if (!intent) {
    return [route] as const;
  }
  return [route, { screen: Routes.RAMP.GET_STARTED, params: intent }] as const;
}

export function createBuyNavigationDetails(intent?: RampIntent) {
  return createRampNavigationDetails(RampType.BUY, intent);
}

export function createSellNavigationDetails(intent?: RampIntent) {
  return createRampNavigationDetails(RampType.SELL, intent);
}
