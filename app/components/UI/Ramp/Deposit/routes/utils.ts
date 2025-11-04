import { DepositNavigationParams } from '../types';
import Routes from '../../../../../constants/navigation/Routes';

export function createDepositNavigationDetails(
  params?: DepositNavigationParams,
) {
  const route = Routes.DEPOSIT.ID;
  if (!params) {
    return [route] as const;
  }
  return [route, { screen: route, params }] as const;
}
