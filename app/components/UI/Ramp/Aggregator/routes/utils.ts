import { RampIntent } from '../types';
import Routes from '../../../../../constants/navigation/Routes';

export function createSellNavigationDetails(intent?: RampIntent) {
  const route = Routes.RAMP.SELL;
  if (!intent) {
    return [route] as const;
  }
  return [
    route,
    {
      screen: Routes.RAMP.ID,
      params: {
        screen: Routes.RAMP.BUILD_QUOTE,
        params: intent,
      },
    },
  ] as const;
}

export function createBuyNavigationDetails(intent?: RampIntent) {
  if (!intent?.assetId) {
    return [Routes.RAMP.TOKEN_SELECTION] as const;
  }

  return [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION,
      params: {
        screen: Routes.RAMP.AMOUNT_INPUT,
        params: {
          assetId: intent.assetId,
        },
      },
    },
  ] as const;
}

