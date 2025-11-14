import { RampIntent, RampType } from '../types';
import Routes from '../../../../../constants/navigation/Routes';
// import useRampsUnifiedV1Enabled from '../../hooks/useRampsUnifiedV1Enabled';

export function createRampNavigationDetails(
  rampType: RampType,
  intent?: RampIntent,
) {
  const route = rampType === RampType.BUY ? Routes.RAMP.BUY : Routes.RAMP.SELL;
  if (!intent) {
    return [route] as const;
  }
  return [
    route,
    {
      screen: Routes.RAMP.GET_STARTED,
      params: {
        screen: Routes.RAMP.GET_STARTED,
        params: intent,
      },
    },
  ] as const;
}

export function createBuyNavigationDetails(intent?: RampIntent) {
  // TODO: Use goToRamps hook for managing ramps navigation
  // https://consensyssoftware.atlassian.net/browse/TRAM-2813
  // const isRampsUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  // if (isRampsUnifiedV1Enabled) {
  // return [
  //   Routes.RAMP.TOKEN_SELECTION,
  //   {
  //     rampType: 'BUY',
  //   },
  // ];
  // }
  return createRampNavigationDetails(RampType.BUY, intent);
}

export function createSellNavigationDetails(intent?: RampIntent) {
  return createRampNavigationDetails(RampType.SELL, intent);
}
