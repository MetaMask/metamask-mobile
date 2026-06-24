import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  RampIntent,
  RampType as AggregatorRampType,
} from '../Aggregator/types';
import { createSellNavigationDetails } from '../Aggregator/routes/utils';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import type { BuyFlowOrigin } from '../Views/BuildQuote/BuildQuote';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { useRampsTokens } from './useRampsTokens';
import { useRampsUserRegion } from './useRampsUserRegion';
import { useRampsCountries } from './useRampsCountries';
import { isRampRegionDefinitivelyUnsupported } from '../utils/rampRegionEligibility';
import { resolveRampControllerAssetId } from '../utils/resolveRampControllerAssetId';
import Engine from '../../../../core/Engine';
import { selectGeolocationLocation } from '../../../../selectors/geolocationController';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';

/**
 * Hook that returns functions to navigate to ramp flows.
 *
 * @returns An object containing navigation functions:
 * - goToBuy: Unified buy flow gated by RampsController region/eligibility
 * - goToSell: Aggregator sell flow
 */
export const useRampNavigation = () => {
  const navigation = useNavigation();
  const geolocationLocation = useSelector(selectGeolocationLocation);
  const { userRegion } = useRampsUserRegion();
  const { countries } = useRampsCountries();
  const { setSelectedToken, tokens: rampsTokens } = useRampsTokens();

  const goToBuy = useCallback(
    async (
      intent?: RampIntent,
      options?: {
        buyFlowOrigin?: BuyFlowOrigin;
      },
    ) => {
      let location: string | undefined = geolocationLocation;

      if (!location || location === UNKNOWN_LOCATION) {
        location = await Promise.resolve(
          Engine.context.GeolocationController?.refreshGeolocation?.(),
        ).catch(() => undefined);
      }

      if (!location || location === UNKNOWN_LOCATION) {
        navigation.navigate(...createEligibilityFailedModalNavigationDetails());
        return;
      }

      if (isRampRegionDefinitivelyUnsupported(userRegion, countries)) {
        navigation.navigate(...createRampUnsupportedModalNavigationDetails());
        return;
      }

      if (intent?.assetId) {
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

      navigation.navigate(...createTokenSelectionNavDetails());
    },
    [
      setSelectedToken,
      navigation,
      userRegion,
      countries,
      rampsTokens,
      geolocationLocation,
    ],
  );

  const goToSell = useCallback(
    (intent?: RampIntent) => {
      navigation.navigate(...createSellNavigationDetails(intent));
    },
    [navigation],
  );

  return { goToBuy, goToSell };
};
