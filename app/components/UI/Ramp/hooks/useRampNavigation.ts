import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { DepositNavigationParams } from '../Deposit/types/navigationParams';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';

export enum RampMode {
  AGGREGATOR = 'AGGREGATOR',
  DEPOSIT = 'DEPOSIT',
}

interface AggregatorParams {
  intent?: RampIntent;
  rampType?: AggregatorRampType;
}

interface AggregatorGoToRampsParams {
  mode: RampMode.AGGREGATOR;
  params?: AggregatorParams;
  overrideUnifiedBuyFlag?: boolean;
}

interface DepositGoToRampsParams {
  mode: RampMode.DEPOSIT;
  params?: DepositNavigationParams;
  overrideUnifiedBuyFlag?: boolean;
}

type GoToRampsParams = AggregatorGoToRampsParams | DepositGoToRampsParams;

/**
 * Hook that returns a function to navigate to the appropriate ramp flow.
 *
 * @returns An object containing the goToRamps function
 * - goToRamps: Function that navigates to the appropriate ramp flow based on mode and params
 */
export const useRampNavigation = () => {
  const navigation = useNavigation();
  const isRampsUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);

  const goToRamps = useCallback(
    ({ mode, params, overrideUnifiedBuyFlag }: GoToRampsParams) => {
      if (
        (mode === RampMode.DEPOSIT ||
          params?.rampType === AggregatorRampType.BUY) &&
        isRampsUnifiedV1Enabled &&
        !overrideUnifiedBuyFlag
      ) {
        if (rampRoutingDecision === UnifiedRampRoutingType.DEPOSIT) {
          navigation.navigate(
            ...createDepositNavigationDetails(
              mode === RampMode.DEPOSIT ? params : undefined,
            ),
          );
        } else {
          const aggregatorParams =
            mode === RampMode.AGGREGATOR ? params : undefined;
          const { intent, rampType = AggregatorRampType.BUY } =
            aggregatorParams || {};

          navigation.navigate(...createRampNavigationDetails(rampType, intent));
        }
        return;
      }

      if (mode === RampMode.DEPOSIT) {
        navigation.navigate(...createDepositNavigationDetails(params));
      } else {
        const { intent, rampType = AggregatorRampType.BUY } = params || {};
        navigation.navigate(...createRampNavigationDetails(rampType, intent));
      }
    },
    [navigation, isRampsUnifiedV1Enabled, rampRoutingDecision],
  );

  return { goToRamps };
};
