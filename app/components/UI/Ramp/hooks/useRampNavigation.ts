import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { createRampNavigationDetails } from '../Aggregator/routes/utils';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import type { BuyFlowOrigin } from '../Views/BuildQuote/BuildQuote';
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
import { selectProviders } from '../../../../selectors/rampsController';

/**
 * Hook that returns functions to navigate to ramp flows.
 *
 * @returns An object containing navigation functions:
 * - goToBuy: Unified V2 routing gated by RampsController region/eligibility
 * - goToAggregator: deprecated Always navigates to aggregator BUY flow (bypasses smart routing)
 * - goToSell: Always navigates to aggregator SELL flow
 */
export const useRampNavigation = () => {
  const navigation = useNavigation();
  const geolocationLocation = useSelector(selectGeolocationLocation);
  const rampsServiceDisruptionRegions = useSelector(
    selectRampsServiceDisruptionRegions,
  );
  const { userRegion } = useRampsUserRegion();
  const { countries } = useRampsCountries();
  const {
    setSelectedToken,
    tokens: rampsTokens,
    isLoading: tokensLoading,
    error: tokensError,
  } = useRampsTokens();
  const {
    data: providers,
    isLoading: providersLoading,
    error: providersError,
  } = useSelector(selectProviders);

  const goToBuy = useCallback(
    async (
      intent?: RampIntent,
      options?: {
        overrideUnifiedRouting?: boolean;
        buyFlowOrigin?: BuyFlowOrigin;
      },
    ) => {
      const { overrideUnifiedRouting = false } = options || {};

      const isUnifiedRoutingEnabled = !overrideUnifiedRouting;

      // Resolve the best available geolocation; only the unified path refreshes.
      let location: string | undefined = geolocationLocation;
      if (
        isUnifiedRoutingEnabled &&
        (!location || location === UNKNOWN_LOCATION)
      ) {
        location = await Promise.resolve(
          Engine.context.GeolocationController?.refreshGeolocation?.(),
        ).catch(() => undefined);
      }

      // Region service disruption kill-switch — applies to every buy entry point (including
      // the deprecated aggregator/reorder path) and takes precedence over the
      // eligibility/unsupported gating below.
      if (
        isRampsServiceDisruptionActive(
          rampsServiceDisruptionRegions,
          userRegion,
          location,
        )
      ) {
        navigation.navigate(
          ...createRampsServiceDisruptionModalNavigationDetails(),
        );
        return;
      }

      // Treat a fully-loaded V2 catalog with no providers or no buyable tokens
      // as region-unavailable. Only fires once provider/token data has settled
      // (not loading, no error) so transient states don't trip the modal.
      const v2CatalogHasLoaded =
        !overrideUnifiedRouting &&
        !providersLoading &&
        !tokensLoading &&
        !providersError &&
        !tokensError;
      const v2CatalogHasNoProviders =
        v2CatalogHasLoaded && rampsTokens && providers.length === 0;
      const v2CatalogHasNoBuyableTokens =
        v2CatalogHasLoaded &&
        rampsTokens &&
        !rampsTokens.allTokens.some((token) => token.tokenSupported);
      const isV2CatalogUnsupported =
        v2CatalogHasNoProviders || v2CatalogHasNoBuyableTokens;

      if (isUnifiedRoutingEnabled) {
        if (!location || location === UNKNOWN_LOCATION) {
          navigation.navigate(
            ...createEligibilityFailedModalNavigationDetails(),
          );
          return;
        }

        if (isRampRegionDefinitivelyUnsupported(userRegion, countries)) {
          navigation.navigate(...createRampUnsupportedModalNavigationDetails());
          return;
        }

        if (isV2CatalogUnsupported) {
          navigation.navigate(...createRampUnsupportedModalNavigationDetails());
          return;
        }
      }

      if (intent?.assetId && !overrideUnifiedRouting) {
        const controllerAssetId = resolveRampControllerAssetId(
          intent.assetId,
          rampsTokens?.allTokens ?? [],
        );

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
        }
        navigation.navigate(
          ...createBuildQuoteNavDetails({
            assetId: controllerAssetId,
            buyFlowOrigin: options?.buyFlowOrigin,
          }),
        );
        return;
      }

      if (!intent?.assetId && !overrideUnifiedRouting) {
        navigation.navigate(...createTokenSelectionNavDetails());
        return;
      }

      navigation.navigate(
        ...createRampNavigationDetails(AggregatorRampType.BUY, intent),
      );
    },
    [
      setSelectedToken,
      navigation,
      userRegion,
      countries,
      rampsTokens,
      tokensLoading,
      tokensError,
      providers,
      providersLoading,
      providersError,
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
      goToBuy(intent, { overrideUnifiedRouting: true });
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

  return { goToBuy, goToAggregator, goToSell };
};
