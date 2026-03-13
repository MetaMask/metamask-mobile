import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import type { BuyFlowOrigin } from '../Views/BuildQuote/BuildQuote';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { useRampsTokens } from './useRampsTokens';
import { resolveRampControllerAssetId } from '../utils/resolveRampControllerAssetId';

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
  const isRampsUnifiedV2Enabled = useRampsUnifiedV2Enabled();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const { setSelectedToken, tokens: rampsTokens } = useRampsTokens();

  const goToBuy = useCallback(
    (
      intent?: RampIntent,
      options?: {
        mode?: RampMode;
        overrideUnifiedRouting?: boolean;
        buyFlowOrigin?: BuyFlowOrigin;
      },
    ) => {
      const { mode = RampMode.AGGREGATOR, overrideUnifiedRouting = false } =
        options || {};

      const isUnifiedRoutingEnabled =
        (isRampsUnifiedV1Enabled || isRampsUnifiedV2Enabled) &&
        !overrideUnifiedRouting;

      // Check error states first (applies to both V1 and V2)
      if (isUnifiedRoutingEnabled) {
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

      // V2: If assetId is provided and V2 is enabled, route to BuildQuote
      // TODO: Check for provider support for the token and pass params to BuildQuote to show an error modal
      if (
        isRampsUnifiedV2Enabled &&
        intent?.assetId &&
        !overrideUnifiedRouting
      ) {
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

      // V2: If no assetId and V2 is enabled, route to TokenSelection (matches handleRampUrl deeplink behavior)
      if (
        isRampsUnifiedV2Enabled &&
        !intent?.assetId &&
        !overrideUnifiedRouting
      ) {
        navigation.navigate(...createTokenSelectionNavDetails());
        return;
      }

      // V1 routing logic
      if (isRampsUnifiedV1Enabled && !overrideUnifiedRouting) {
        // If no assetId is provided, route to TokenSelection
        if (!intent?.assetId) {
          navigation.navigate(...createTokenSelectionNavDetails());
          return;
        }

        // If routing decision hasn't been determined yet, route to TokenSelection
        if (rampRoutingDecision === null) {
          navigation.navigate(...createTokenSelectionNavDetails());
          return;
        }

        // If assetId is provided, route based on rampRoutingDecision
        if (rampRoutingDecision === UnifiedRampRoutingType.DEPOSIT) {
          navigation.navigate(...createDepositNavigationDetails(intent));
        } else if (rampRoutingDecision === UnifiedRampRoutingType.AGGREGATOR) {
          navigation.navigate(
            ...createRampNavigationDetails(AggregatorRampType.BUY, intent),
          );
        }
        return;
      }

      // When overriding unified routing or when v1 is disabled
      if (mode === RampMode.DEPOSIT) {
        navigation.navigate(...createDepositNavigationDetails(intent));
      } else {
        navigation.navigate(
          ...createRampNavigationDetails(AggregatorRampType.BUY, intent),
        );
      }
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
        mode: RampMode.AGGREGATOR,
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
        mode: RampMode.DEPOSIT,
        overrideUnifiedRouting: true,
      });
    },
    [goToBuy],
  );

  return { goToBuy, goToAggregator, goToSell, goToDeposit };
};
