import { RampIntent, RampType } from '../types';
import Routes from '../../../../constants/navigation/Routes';

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

export function createSecureNavigationDetails() {
  return [
    Routes.SET_PASSWORD_FLOW,
    {
      screen: Routes.ONBOARDING.MANUAL_BACKUP.STEP_1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: { backupFlow: true } as any,
    },
  ] as const;
}
