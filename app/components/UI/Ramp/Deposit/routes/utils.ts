import { DepositNavigationParams } from '../types';
import Routes from '../../../../../constants/navigation/Routes';

interface DepositNestedParams {
  screen: typeof Routes.DEPOSIT.ROOT;
  params: DepositNavigationParams;
}

/**
 * Creates navigation details for the Deposit flow.
 * Returns a 2-element tuple that can be spread into navigate().
 */
export function createDepositNavigationDetails(
  intent?: DepositNavigationParams,
): readonly [typeof Routes.DEPOSIT.ID, DepositNestedParams | undefined] {
  if (!intent) {
    return [Routes.DEPOSIT.ID, undefined];
  }
  return [
    Routes.DEPOSIT.ID,
    {
      screen: Routes.DEPOSIT.ROOT,
      params: intent,
    },
  ];
}
