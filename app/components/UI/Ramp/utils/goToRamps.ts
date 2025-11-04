import { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { DepositNavigationParams } from '../Deposit/types/navigationParams';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';

export enum RampMode {
  AGGREGATOR = 'aggregator',
  DEPOSIT = 'deposit',
}

interface AggregatorParams {
  intent?: RampIntent;
  rampType?: AggregatorRampType;
}

/**
 * Navigates to the appropriate ramp flow based on the provided mode.
 *
 * @param navigation - The navigation object from React Navigation
 * @param mode - The mode of ramp flow to navigate to (RampMode.AGGREGATOR or RampMode.DEPOSIT)
 * @param params - Optional parameters for the navigation
 * - For RampMode.AGGREGATOR: AggregatorParams (intent, rampType)
 * - For RampMode.DEPOSIT: DepositNavigationParams (assetId, amount)
 */
export default function goToRamps(
  navigation: NavigationProp<ParamListBase>,
  mode: RampMode,
  params?: AggregatorParams | DepositNavigationParams,
) {
  if (mode === RampMode.AGGREGATOR) {
    const { intent, rampType = AggregatorRampType.BUY } = (params ||
      {}) as AggregatorParams;

    if (rampType === AggregatorRampType.BUY) {
      navigation.navigate(...createBuyNavigationDetails(intent));
    } else if (rampType === AggregatorRampType.SELL) {
      navigation.navigate(...createSellNavigationDetails(intent));
    }
  } else if (mode === RampMode.DEPOSIT) {
    navigation.navigate(
      ...createDepositNavigationDetails(params as DepositNavigationParams),
    );
  } else {
    throw new Error(
      `Invalid ramp mode: ${mode}. Must be ${RampMode.AGGREGATOR} or ${RampMode.DEPOSIT}`,
    );
  }
}
