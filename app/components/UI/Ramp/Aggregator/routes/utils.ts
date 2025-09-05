import { RampIntent, RampType } from '../types';
import { RootParamList } from '../../../../../util/navigation';

function createRampNavigationDetails(rampType: RampType, intent?: RampIntent) {
  const route = rampType === RampType.BUY ? 'RampBuy' : 'RampSell';
  if (!intent) {
    return [route] as const;
  }
  const screen: keyof RootParamList = 'GetStarted';
  const params: RootParamList[typeof screen] = intent;
  return [route, { screen, params }] as const;
}

export function createBuyNavigationDetails(intent?: RampIntent) {
  return createRampNavigationDetails(RampType.BUY, intent);
}

export function createSellNavigationDetails(intent?: RampIntent) {
  return createRampNavigationDetails(RampType.SELL, intent);
}
