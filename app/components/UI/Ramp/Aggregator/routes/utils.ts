import { RampIntent } from '../types';
import Routes from '../../../../../constants/navigation/Routes';

/**
 * Buy enters UNIFIED_BUY_2 token selection (TRAM-3674).
 * Kept in this lightweight module so SDK/deeplink/carousel callers do not
 * pull the TokenSelection React screen (and its Ramps selector graph).
 *
 * Asset-intent deep linking is handled by `useRampNavigation.goToBuy`.
 */
export function createBuyNavigationDetails(_intent?: RampIntent) {
  return [Routes.RAMP.TOKEN_SELECTION] as const;
}

export function createSellNavigationDetails(intent?: RampIntent) {
  if (!intent) {
    return [Routes.RAMP.SELL] as const;
  }
  return [
    Routes.RAMP.SELL,
    {
      screen: Routes.RAMP.ID,
      params: {
        screen: Routes.RAMP.BUILD_QUOTE,
        params: intent,
      },
    },
  ] as const;
}
