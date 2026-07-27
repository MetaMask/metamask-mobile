import handleRedirection from './handleRedirection';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import getRedirectPathsAndParams from '../utils/getRedirectPathAndParams';
import { RampType } from '../Aggregator/types';
import parseRampIntent from '../utils/parseRampIntent';
import { createSellNavigationDetails } from '../Aggregator/routes/utils';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../../core/NavigationService';
import ReduxService from '../../../../core/redux';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import {
  createBuildQuoteNavDetails,
  type BuildQuoteParams,
} from '../Views/BuildQuote';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import {
  selectCountries,
  selectTokens,
  selectUserRegion,
} from '../../../../selectors/rampsController';
import { selectGeolocationLocation } from '../../../../selectors/geolocationController';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isRampRegionDefinitivelyUnsupported } from '../utils/rampRegionEligibility';
import { isRampsServiceDisruptionActive } from '../utils/rampsServiceDisruption';
import { createRampsServiceDisruptionModalNavigationDetails } from '../components/RampsServiceDisruptionModal/RampsServiceDisruptionModal';
import { selectRampsServiceDisruptionRegions } from '../../../../selectors/featureFlagController/rampsServiceDisruption';
import { resolveRampControllerAssetId } from '../utils/resolveRampControllerAssetId';
import Engine from '../../../../core/Engine';

interface RampUrlOptions {
  rampPath: string;
  rampType: RampType;
}

function parseBuildQuoteAmount(amount?: string): number | undefined {
  const normalizedAmount = amount?.trim();

  if (!normalizedAmount) {
    return undefined;
  }

  const parsedAmount = Number(normalizedAmount);
  return Number.isFinite(parsedAmount) && parsedAmount > 0
    ? parsedAmount
    : undefined;
}

async function navigateUnifiedV2Buy(
  rampIntent?: ReturnType<typeof parseRampIntent>,
) {
  let state = ReduxService.store.getState();

  // Prefer the location already in state, only refreshing when unknown.
  let location: string | undefined = selectGeolocationLocation(state);

  if (!location || location === UNKNOWN_LOCATION) {
    location = await Promise.resolve(
      Engine.context.GeolocationController?.refreshGeolocation?.(),
    ).catch(() => undefined);
    // Geo refresh may hydrate RampsController; re-read store before eligibility.
    state = ReduxService.store.getState();
  }

  // Region service disruption kill-switch — takes precedence over the eligibility/unsupported
  // gating below so a service disruption region is surfaced even when geolocation is unknown.
  if (
    isRampsServiceDisruptionActive(
      selectRampsServiceDisruptionRegions(state),
      selectUserRegion(state),
      location,
    )
  ) {
    navigateWithDetails(
      NavigationService.navigation,
      createRampsServiceDisruptionModalNavigationDetails(),
    );
    return;
  }

  if (!location || location === UNKNOWN_LOCATION) {
    navigateWithDetails(
      NavigationService.navigation,
      createEligibilityFailedModalNavigationDetails(),
    );
    return;
  }

  // Non-blocking: only divert on a definitive negative signal.
  const userRegion = selectUserRegion(state);
  const countries = selectCountries(state).data;
  if (isRampRegionDefinitivelyUnsupported(userRegion, countries)) {
    navigateWithDetails(
      NavigationService.navigation,
      createRampUnsupportedModalNavigationDetails(),
    );
    return;
  }

  if (rampIntent?.assetId) {
    const allTokens = selectTokens(state).data?.allTokens ?? [];
    const controllerAssetId = resolveRampControllerAssetId(
      rampIntent.assetId,
      allTokens,
    );
    try {
      Engine.context.RampsController.setSelectedToken(controllerAssetId);
    } catch {
      // Token may not be in controller's list yet; navigate anyway
    }
    const buildQuoteParams: BuildQuoteParams = {
      assetId: controllerAssetId,
    };
    const amount = parseBuildQuoteAmount(rampIntent.amount);
    if (amount !== undefined) {
      buildQuoteParams.amount = amount;
    }
    navigateWithDetails(
      NavigationService.navigation,
      createBuildQuoteNavDetails(buildQuoteParams),
    );
    return;
  }

  navigateWithDetails(
    NavigationService.navigation,
    createTokenSelectionNavDetails(),
  );
}

export default function handleRampUrl({ rampPath, rampType }: RampUrlOptions) {
  try {
    const [redirectPaths, pathParams] = getRedirectPathsAndParams(rampPath);

    if (redirectPaths.length > 0) {
      return handleRedirection(redirectPaths, pathParams, rampType);
    }

    let rampIntent;
    if (pathParams) {
      rampIntent = parseRampIntent(pathParams);
    }

    switch (rampType) {
      case RampType.BUY:
        return navigateUnifiedV2Buy(rampIntent);
      case RampType.SELL:
        navigateWithDetails(
          NavigationService.navigation,
          createSellNavigationDetails(rampIntent),
        );
        break;
    }
  } catch (error) {
    Logger.error(
      error as Error,
      `Error in handleRampUrl. rampPath: ${rampPath}`,
    );
  }
}
