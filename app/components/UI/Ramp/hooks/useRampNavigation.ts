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
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { useRampsTokens } from './useRampsTokens';
import { useRampsUserRegion } from './useRampsUserRegion';
import { useRampsCountries } from './useRampsCountries';
import { isRampRegionDefinitivelyUnsupported } from '../utils/rampRegionEligibility';
import { isRampsServiceDisruptionActive } from '../utils/rampsServiceDisruption';
import { createRampsServiceDisruptionModalNavigationDetails } from '../components/RampsServiceDisruptionModal/RampsServiceDisruptionModal';
import { selectRampsServiceDisruptionRegions } from '../../../../selectors/featureFlagController/rampsServiceDisruption';
import { resolveRampControllerAssetId } from '../utils/resolveRampControllerAssetId';
import Engine from '../../../../core/Engine';
import { selectGeolocationLocation } from '../../../../selectors/geolocationController';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

enum RampMode {
  AGGREGATOR = 'AGGREGATOR',
  DEPOSIT = 'DEPOSIT',
}

/**
 * Hook that returns functions to navigate to ramp flows.
 *
 * @returns An object containing navigation functions:
 * - goToBuy: Unified V2 routing gated by RampsController region/eligibility
 * - goToAggregator: deprecated Always navigates to aggregator BUY flow (bypasses smart routing)
 * - goToSell: Always navigates to aggregator SELL flow
 * - goToDeposit: deprecated Always navigates to deposit flow (bypasses smart routing)
 */
export const useRampNavigation = () => {
  const navigation = useNavigation();
  const isRampsUnifiedV2Enabled = useRampsUnifiedV2Enabled();
  const geolocationLocation = useSelector(selectGeolocationLocation);
  const rampsServiceDisruptionRegions = useSelector(
    selectRampsServiceDisruptionRegions,
  );
  const { userRegion } = useRampsUserRegion();
  const { countries } = useRampsCountries();
  const { setSelectedToken, tokens: rampsTokens } = useRampsTokens();

  const goToBuy = useCallback(
    async (
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
        isRampsUnifiedV2Enabled && !overrideUnifiedRouting;

      // Region service disruption kill-switch — applies to every buy entry point (including
      // the deprecated aggregator/reorder path) and takes precedence over the
      // eligibility/unsupported gating below.
      if (
        isRampsServiceDisruptionActive(
          rampsServiceDisruptionRegions,
          userRegion,
          geolocationLocation,
        )
      ) {
        navigation.navigate(
          ...createRampsServiceDisruptionModalNavigationDetails(),
        );
        return;
      }

      // Eligibility gate: region + support now come from RampsController
      // (selectUserRegion / selectCountries) plus GeolocationController,
      // replacing the legacy smart-routing decision.
      if (isUnifiedRoutingEnabled) {
        // Prefer the location already in state, only refreshing when unknown.
        let location: string | undefined = geolocationLocation;

        if (!location || location === UNKNOWN_LOCATION) {
          location = await Promise.resolve(
            Engine.context.GeolocationController?.refreshGeolocation?.(),
          ).catch(() => undefined);
        }

        // Unknown region: cannot determine eligibility → eligibility-failed.
        if (!location || location === UNKNOWN_LOCATION) {
          navigation.navigate(
            ...createEligibilityFailedModalNavigationDetails(),
          );
          return;
        }

        // Region known but definitively unsupported for buy → unsupported
        // modal. Non-blocking: we only divert on a definitive negative signal;
        // if region/countries data is still loading or support is
        // indeterminate, proceed to TokenSelection/BuildQuote.
        if (isRampRegionDefinitivelyUnsupported(userRegion, countries)) {
          navigation.navigate(...createRampUnsupportedModalNavigationDetails());
          return;
        }
      }

      // V2: If assetId is provided and V2 is enabled, route to BuildQuote
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

        // When tokens have loaded, divert unsupported tokens to the
        // dedicated modal so users see a clear message instead of landing
        // on BuildQuote with a missing token name.
        if (rampsTokens) {
          const matchedToken = rampsTokens.allTokens.find(
            (tok) => tok.assetId === controllerAssetId,
          );
          if (!matchedToken || !matchedToken.tokenSupported) {
            navigation.navigate(
              ...createRampUnsupportedModalNavigationDetails(),
            );
            return;
          }
        }

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

      // When overriding unified routing or when unified V2 is disabled
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
      isRampsUnifiedV2Enabled,
      userRegion,
      countries,
      rampsTokens,
      geolocationLocation,
      rampsServiceDisruptionRegions,
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
