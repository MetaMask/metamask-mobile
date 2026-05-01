import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RampIntent } from '../Aggregator/types';
import { createSellNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import type { BuyFlowOrigin } from '../Views/BuildQuote/BuildQuote';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { useRampsTokens } from './useRampsTokens';
import { resolveRampControllerAssetId } from '../utils/resolveRampControllerAssetId';

/**
 * Hook that returns functions to navigate to ramp flows.
 *
 * @returns An object containing navigation functions:
 * - goToBuy: Navigates to the Unified Buy flow
 * - goToAggregator: deprecated Navigates to Unified Buy while bypassing routing guard modals
 * - goToSell: Always navigates to aggregator SELL flow
 * - goToDeposit: deprecated Always navigates to deposit flow (bypasses smart routing)
 */
export const useRampNavigation = () => {
  const navigation = useNavigation();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const { setSelectedToken, tokens: rampsTokens } = useRampsTokens();

  const goToBuy = useCallback(
    (
      intent?: RampIntent,
      options?: {
        overrideUnifiedRouting?: boolean;
        buyFlowOrigin?: BuyFlowOrigin;
      },
    ) => {
      const { overrideUnifiedRouting = false } = options || {};

      if (!overrideUnifiedRouting) {
        if (rampRoutingDecision === UnifiedRampRoutingType.ERROR) {
          navigation.navigate(
            ...createEligibilityFailedModalNavigationDetails(),
          );
          return;
        }

        if (rampRoutingDecision === UnifiedRampRoutingType.UNSUPPORTED) {
          navigation.navigate(...createRampUnsupportedModalNavigationDetails());
          return;
        }
      }

      // TODO: Check for provider support for the token and pass params to BuildQuote to show an error modal
      if (intent?.assetId) {
        // Resolve to the controller's canonical assetId format (lowercase)
        const controllerAssetId = resolveRampControllerAssetId(
          intent.assetId,
          rampsTokens?.allTokens ?? [],
        );
        try {
          setSelectedToken(controllerAssetId);
        } catch {
          // Token may not be in controller's list yet (still loading).
          // Navigate anyway — BuildQuote will handle the missing token.
        }
        navigation.navigate(
          ...createBuildQuoteNavDetails({
            assetId: controllerAssetId,
            buyFlowOrigin: options?.buyFlowOrigin,
          }),
        );
        return;
      }

      navigation.navigate(...createTokenSelectionNavDetails());
    },
    [
      setSelectedToken,
      navigation,
      rampRoutingDecision,
      rampsTokens?.allTokens,
    ],
  );

  /**
   * @deprecated Use goToBuy instead. This function bypasses routing guard modals.
   */
  const goToAggregator = useCallback(
    (intent?: RampIntent) => {
      goToBuy(intent, {
        overrideUnifiedRouting: true,
      });
    },
    [goToBuy],
  );

  const goToSell = useCallback(
    (intent?: RampIntent) => {
      navigation.navigate(...createSellNavigationDetails(intent));
    },
    [navigation],
  );

  /**
   * @deprecated Use goToBuy instead. This function always navigates to the deposit flow,
   * bypassing unified routing. Use goToBuy for smart routing that respects user preferences.
   */
  const goToDeposit = useCallback(
    (intent?: RampIntent) => {
      navigation.navigate(...createDepositNavigationDetails(intent));
    },
    [navigation],
  );

  return { goToBuy, goToAggregator, goToSell, goToDeposit };
};
