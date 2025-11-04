import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { createBuyNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';

export enum RampType {
  AGGREGATOR = 'aggregator',
  DEPOSIT = 'deposit',
}

/**
 * Navigates to the appropriate ramp flow based on the provided type.
 *
 * @param navigation - The navigation object from React Navigation
 * @param type - The type of ramp flow to navigate to (RampType.AGGREGATOR or RampType.DEPOSIT)
 */
export function goToRamps(
  navigation: NavigationProp<ParamListBase>,
  type: RampType,
): void {
  switch (type) {
    case RampType.AGGREGATOR:
      navigation.navigate(...createBuyNavigationDetails());
      break;
    case RampType.DEPOSIT:
      navigation.navigate(...createDepositNavigationDetails());
      break;
    default:
      // TypeScript should catch this, but adding runtime safety
      throw new Error(
        `Invalid ramp type: ${type}. Must be ${RampType.AGGREGATOR} or ${RampType.DEPOSIT}`,
      );
  }
}
