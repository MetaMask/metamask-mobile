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
 * - goToBuy: Smart routing based on unified V1 settings and routing decision
 * - goToAggregator: deprecated Always navigates to aggregator BUY flow (bypasses smart routing)
 * - goToSell: Always navigates to aggregator SELL flow
 * - goToDeposit: deprecated Always navigates to deposit flow (bypasses smart routing)
 */
export const useRampNavigation = () => {
  const navigation = useNavigation();
  const isRampsUnifiedV1Enabled = useRampsUnifiedV1Enabled();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);

  const goToBuy = useCallback(
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

  /**
   * @deprecated Use goToBuy instead. This function always navigates to the aggregator BUY flow,
   * bypassing unified routing. Use goToBuy for smart routing that respects user preferences.
   */
  const goToAggregator = useCallback(
    (intent?: RampIntent) => {
      goToBuy(intent, {
        rampType: AggregatorRampType.BUY,
        mode: RampMode.AGGREGATOR,
        overrideUnifiedRouting: true,
      });
    },
    [goToBuy],
  );

  const goToSell = useCallback(
    (intent?: RampIntent) => {
      goToBuy(intent, {
        rampType: AggregatorRampType.SELL,
        mode: RampMode.AGGREGATOR,
        overrideUnifiedRouting: true,
      });
    },
    [goToBuy],
  );

  /**
   * @deprecated Use goToBuy instead. This function always navigates to the deposit flow,
   * bypassing unified routing. Use goToBuy for smart routing that respects user preferences.
   */
  const goToDeposit = useCallback(
    (intent?: RampIntent) => {
      goToBuy(intent, {
        mode: RampMode.DEPOSIT,
        overrideUnifiedRouting: true,
      });
    },
    [goToBuy],
  );

  return { goToBuy, goToAggregator, goToSell, goToDeposit };
};
