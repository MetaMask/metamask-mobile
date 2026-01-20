import { RampIntent, RampType } from '../types';
import Routes from '../../../../../constants/navigation/Routes';

interface RampNestedParams {
  screen: typeof Routes.RAMP.ID;
  params: {
    screen: typeof Routes.RAMP.BUILD_QUOTE;
    params: RampIntent;
  };
}

/**
 * @deprecated Internal use only. Use createBuyNavigationDetails or createSellNavigationDetails instead.
 */
export function createRampNavigationDetails(
  rampType: RampType,
  intent?: RampIntent,
) {
  const route = rampType === RampType.BUY ? Routes.RAMP.BUY : Routes.RAMP.SELL;
  if (!intent) {
    return [route, undefined] as const;
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

/**
 * Creates navigation details for the Buy flow.
 * Returns a 2-element tuple that can be spread into navigate().
 */
export function createBuyNavigationDetails(
  intent?: RampIntent,
): readonly [typeof Routes.RAMP.BUY, RampNestedParams | undefined] {
  if (!intent) {
    return [Routes.RAMP.BUY, undefined];
  }
  return [
    Routes.RAMP.BUY,
    {
      screen: Routes.RAMP.ID,
      params: {
        screen: Routes.RAMP.BUILD_QUOTE,
        params: intent,
      },
    },
  ];
}

/**
 * Creates navigation details for the Sell flow.
 * Returns a 2-element tuple that can be spread into navigate().
 */
export function createSellNavigationDetails(
  intent?: RampIntent,
): readonly [typeof Routes.RAMP.SELL, RampNestedParams | undefined] {
  if (!intent) {
    return [Routes.RAMP.SELL, undefined];
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
  ];
}
