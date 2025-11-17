import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavigationDetails } from '../components/TokenSelection/TokenSelection';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';

enum RampMode {
  AGGREGATOR = 'AGGREGATOR',
  DEPOSIT = 'DEPOSIT',
}

/**
 * Hook that returns functions to navigate to ramp flows.
 *
 * @returns An object containing navigation functions:
 * - goToRamps: Smart routing based on unified V1 settings and routing decision
 * - goToBuy: Always navigates to aggregator BUY flow
 * - goToSell: Always navigates to aggregator SELL flow
 * - goToDeposit: Always navigates to deposit flow
 */
export const useRampNavigation = () => {
  const navigation = useNavigation();
  const isRampsUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);

  const goToRamps = useCallback(
    (
      intent?: RampIntent,
      options?: {
        rampType?: AggregatorRampType;
        mode?: RampMode;
        overrideUnifiedRouting?: boolean;
      },
    ) => {
      const {
        rampType = AggregatorRampType.BUY,
        mode = RampMode.AGGREGATOR,
        overrideUnifiedRouting = false,
      } = options || {};

      if (isRampsUnifiedV1Enabled && !overrideUnifiedRouting) {
        // If no assetId is provided, route to TokenSelection
        if (!intent?.assetId) {
          navigation.navigate(
            ...createTokenSelectionNavigationDetails({
              selectedCryptoAssetId: undefined,
            }),
          );
          return;
        }

        // If assetId is provided, route based on rampRoutingDecision
        if (rampRoutingDecision === UnifiedRampRoutingType.DEPOSIT) {
          navigation.navigate(...createDepositNavigationDetails(intent));
        } else {
          navigation.navigate(...createRampNavigationDetails(rampType, intent));
        }
        return;
      }

      // When overriding unified routing or when v1 is disabled
      if (mode === RampMode.DEPOSIT) {
        navigation.navigate(...createDepositNavigationDetails(intent));
      } else {
        navigation.navigate(...createRampNavigationDetails(rampType, intent));
      }
    },
    [navigation, isRampsUnifiedV1Enabled, rampRoutingDecision],
  );

  const goToBuy = useCallback(
    (intent?: RampIntent) => {
      goToRamps(intent, {
        rampType: AggregatorRampType.BUY,
        mode: RampMode.AGGREGATOR,
        overrideUnifiedRouting: true,
      });
    },
    [goToRamps],
  );

  const goToSell = useCallback(
    (intent?: RampIntent) => {
      goToRamps(intent, {
        rampType: AggregatorRampType.SELL,
        mode: RampMode.AGGREGATOR,
        overrideUnifiedRouting: true,
      });
    },
    [goToRamps],
  );

  const goToDeposit = useCallback(
    (intent?: RampIntent) => {
      goToRamps(intent, {
        mode: RampMode.DEPOSIT,
        overrideUnifiedRouting: true,
      });
    },
    [goToRamps],
  );

  return { goToRamps, goToBuy, goToSell, goToDeposit };
};
