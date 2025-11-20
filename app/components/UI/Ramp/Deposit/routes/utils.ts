import { DepositNavigationParams } from '../types';
import Routes from '../../../../../constants/navigation/Routes';

export function createDepositNavigationDetails(
  intent?: DepositNavigationParams,
) {
  const route = Routes.DEPOSIT.ID;
  if (!intent) {
    return [route] as const;
  }
  return [
    route,
    {
      screen: Routes.DEPOSIT.ROOT,
      params: intent,
    },
  ] as const;
}
