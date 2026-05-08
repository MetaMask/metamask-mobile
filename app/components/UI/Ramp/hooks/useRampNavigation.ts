import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import {
  navigateToRampBuy,
  NavigateToRampBuyMode,
  type NavigateToRampBuyOptions,
} from '../utils/navigateToRampBuy';
import { getRampRoutingDecision } from '../../../../reducers/fiatOrders';
import { useRampsTokens } from './useRampsTokens';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';

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
  const isRampsUnifiedV2Enabled = useRampsUnifiedV2Enabled();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const { setSelectedToken, tokens: rampsTokens } = useRampsTokens();

  const goToBuy = useCallback(
    (intent?: RampIntent, options?: NavigateToRampBuyOptions) => {
      navigateToRampBuy(navigation, intent, options, {
        isRampsUnifiedV1Enabled,
        isRampsUnifiedV2Enabled,
        rampRoutingDecision,
        rampsTokensAll: rampsTokens?.allTokens ?? [],
        setSelectedToken,
      });
    },
    [
      setSelectedToken,
      navigation,
      isRampsUnifiedV1Enabled,
      isRampsUnifiedV2Enabled,
      rampRoutingDecision,
      rampsTokens?.allTokens,
    ],
  );

  /**
   * @deprecated Use goToBuy instead. This function always navigates to the aggregator BUY flow,
   * bypassing unified routing. Use goToBuy for smart routing that respects user preferences.
   */
  const goToAggregator = useCallback(
    (intent?: RampIntent) => {
      goToBuy(intent, {
        mode: NavigateToRampBuyMode.AGGREGATOR,
        overrideUnifiedRouting: true,
      });
    },
    [goToBuy],
  );

  const goToSell = useCallback(
    (intent?: RampIntent) => {
      navigation.navigate(
        ...createRampNavigationDetails(AggregatorRampType.SELL, intent),
      );
    },
    [navigation],
  );

  /**
   * @deprecated Use goToBuy instead. This function always navigates to the deposit flow,
   * bypassing unified routing. Use goToBuy for smart routing that respects user preferences.
   */
  const goToDeposit = useCallback(
    (intent?: RampIntent) => {
      goToBuy(intent, {
        mode: NavigateToRampBuyMode.DEPOSIT,
        overrideUnifiedRouting: true,
      });
    },
    [goToBuy],
  );

  // Deprecated entries remain part of the public hook API for existing callers.
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- backward-compatible exports
  return { goToBuy, goToAggregator, goToSell, goToDeposit };
};
