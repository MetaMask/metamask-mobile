import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createDepositNavigationDetails } from '../Deposit/routes/utils';
import { createTokenSelectionNavDetails } from '../components/TokenSelection/TokenSelection';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { useRampTokens, RampsToken } from './useRampTokens';

/**
 * Check if the assetId is in the list of supported ramp tokens
 * @param assetId - CAIP-19 asset ID (e.g., 'eip155:8453/erc20:0x...')
 * @param tokens - List of supported tokens from the API
 * @returns true if the token is found in the list, false otherwise
 */
const isAssetInTokenList = (
  assetId: string,
  tokens: RampsToken[] | null,
): boolean => {
  if (!tokens || tokens.length === 0) return false;

  // Normalize the assetId for case-insensitive comparison
  const normalizedAssetId = assetId.toLowerCase();

  return tokens.some(
    (token) => token.assetId.toLowerCase() === normalizedAssetId,
  );
};

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
  const { allTokens: depositTokens } = useRampTokens();

  // Memoized check for whether an asset is supported by the deposit flow
  const isDepositSupportedAsset = useMemo(
    () => (assetId: string) => isAssetInTokenList(assetId, depositTokens),
    [depositTokens],
  );

  const goToBuy = useCallback(
    (
      intent?: RampIntent,
      options?: {
        mode?: RampMode;
        overrideUnifiedRouting?: boolean;
      },
    ) => {
      const { mode = RampMode.AGGREGATOR, overrideUnifiedRouting = false } =
        options || {};

      if (isRampsUnifiedV1Enabled && !overrideUnifiedRouting) {
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
        // But first check if the asset is in the deposit token list
        if (rampRoutingDecision === UnifiedRampRoutingType.DEPOSIT) {
          // Only route to deposit if the token is supported by the deposit flow
          // Otherwise, fall back to aggregator for unsupported tokens/chains
          if (intent.assetId && !isDepositSupportedAsset(intent.assetId)) {
            navigation.navigate(
              ...createRampNavigationDetails(AggregatorRampType.BUY, intent),
            );
          } else {
            navigation.navigate(...createDepositNavigationDetails(intent));
          }
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
      navigation,
      isRampsUnifiedV1Enabled,
      rampRoutingDecision,
      isDepositSupportedAsset,
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
