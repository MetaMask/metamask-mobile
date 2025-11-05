import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
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
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';

export enum RampMode {
  AGGREGATOR = 'aggregator',
  DEPOSIT = 'deposit',
}

interface AggregatorParams {
  intent?: RampIntent;
  rampType?: AggregatorRampType;
}

/**
 * Hook that returns a function to navigate to the appropriate ramp flow.
 *
 * @returns An object containing the goToRamps function
 * - goToRamps: Function that navigates to the appropriate ramp flow based on mode and params
 */
export const useRampNavigation = () => {
  const navigation = useNavigation();
  const isRampsUnifiedV1Enabled = useRampsUnifiedV1Enabled();

  const goToRamps = useCallback(
    (mode: RampMode, params?: AggregatorParams | DepositNavigationParams) => {
      if (isRampsUnifiedV1Enabled) {
        // TODO: Implement smart routing hook
        return;
      }

      if (mode === RampMode.DEPOSIT) {
        navigation.navigate(
          ...createDepositNavigationDetails(params as DepositNavigationParams),
        );
      } else {
        const { intent, rampType = AggregatorRampType.BUY } = (params ||
          {}) as AggregatorParams;

        if (rampType === AggregatorRampType.BUY) {
          navigation.navigate(...createBuyNavigationDetails(intent));
        } else {
          navigation.navigate(...createSellNavigationDetails(intent));
        }
      }
    },
    [navigation, isRampsUnifiedV1Enabled],
  );

  return { goToRamps };
};
