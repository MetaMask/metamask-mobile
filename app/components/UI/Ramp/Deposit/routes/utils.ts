import { DepositNavigationParams } from '../types';
import Routes from '../../../../../constants/navigation/Routes';
// import useRampsUnifiedV1Enabled from '../../hooks/useRampsUnifiedV1Enabled';

export function createDepositNavigationDetails(
  params?: DepositNavigationParams,
) {
  // const isRampsUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  // // TODO: Use goToRamps hook for managing ramps navigation to the token selection screen
  // // https://consensyssoftware.atlassian.net/browse/TRAM-2813
  // if (isRampsUnifiedV1Enabled) {
  //   return [
  //     Routes.RAMP.TOKEN_SELECTION,
  //     {
  //       rampType: 'DEPOSIT',
  //     },
  //   ];
  // }

  const route = Routes.DEPOSIT.ID;
  if (!params) {
    return [route] as const;
  }

  return [route, { screen: route, params }] as const;
}
