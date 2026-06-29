import handleRedirection from './handleRedirection';
import getRedirectPathsAndParams from '../utils/getRedirectPathAndParams';
import { RampType } from '../Aggregator/types';
import parseRampIntent from '../utils/parseRampIntent';
import {
  createBuyNavigationDetails,
  createSellNavigationDetails,
} from '../Aggregator/routes/utils';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../../core/NavigationService';
import ReduxService from '../../../../core/redux';
import { isRampsUnifiedV2Enabled } from '../utils/isRampsUnifiedV2Enabled';
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

  if (!location || location === UNKNOWN_LOCATION) {
    NavigationService.navigation.navigate(
      ...createEligibilityFailedModalNavigationDetails(),
    );
    return;
  }

  // Non-blocking: only divert on a definitive negative signal.
  const userRegion = selectUserRegion(state);
  const countries = selectCountries(state).data;
  if (isRampRegionDefinitivelyUnsupported(userRegion, countries)) {
    NavigationService.navigation.navigate(
      ...createRampUnsupportedModalNavigationDetails(),
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
    NavigationService.navigation.navigate(
      ...createBuildQuoteNavDetails(buildQuoteParams),
    );
    return;
  }

  NavigationService.navigation.navigate(...createTokenSelectionNavDetails());
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
      case RampType.BUY: {
        try {
          const state = ReduxService.store.getState();
          if (isRampsUnifiedV2Enabled(state)) {
            return navigateUnifiedV2Buy(rampIntent);
          }
        } catch {
          // Store may not be ready; fall through to legacy behavior
        }
        NavigationService.navigation.navigate(
          ...createBuyNavigationDetails(rampIntent),
        );
        break;
      }
      case RampType.SELL:
        NavigationService.navigation.navigate(
          ...createSellNavigationDetails(rampIntent),
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
