import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { NavigationRoute } from '../../../Carousel/types';
import { RampIntent, RampType } from '../types';

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

export function createSmartAccountNavigationDetails(): NavigationRoute {
  if (Engine.context.PreferencesController.state.smartAccountOptIn === true) {
    return [Routes.CONFIRMATION_SWITCH_ACCOUNT_TYPE];
  }
  return [Routes.SMART_ACCOUNT_OPT_IN];
}
