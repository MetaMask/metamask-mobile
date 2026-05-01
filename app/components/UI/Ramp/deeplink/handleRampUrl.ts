import handleRedirection from './handleRedirection';
import getRedirectPathsAndParams from '../utils/getRedirectPathAndParams';
import { RampType } from '../Aggregator/types';
import parseRampIntent from '../utils/parseRampIntent';
import { createSellNavigationDetails } from '../Aggregator/routes/utils';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../../core/NavigationService';
import ReduxService from '../../../../core/redux';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../reducers/fiatOrders';
import { createEligibilityFailedModalNavigationDetails } from '../components/EligibilityFailedModal/EligibilityFailedModal';
import { createRampUnsupportedModalNavigationDetails } from '../components/RampUnsupportedModal/RampUnsupportedModal';
import { createBuildQuoteNavDetails } from '../Views/BuildQuote';
import { createTokenSelectionNavDetails } from '../Views/TokenSelection/TokenSelection';
import { selectTokens } from '../../../../selectors/rampsController';
import { resolveRampControllerAssetId } from '../utils/resolveRampControllerAssetId';
import Engine from '../../../../core/Engine';

interface RampUrlOptions {
  rampPath: string;
  rampType: RampType;
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
          const routingDecision = getRampRoutingDecision(state);
          if (routingDecision === UnifiedRampRoutingType.ERROR) {
            NavigationService.navigation.navigate(
              ...createEligibilityFailedModalNavigationDetails(),
            );
            return;
          }
          if (routingDecision === UnifiedRampRoutingType.UNSUPPORTED) {
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
              Engine.context.RampsController.setSelectedToken(
                controllerAssetId,
              );
            } catch {
              // Token may not be in controller's list yet; navigate anyway
            }
            NavigationService.navigation.navigate(
              ...createBuildQuoteNavDetails({
                assetId: controllerAssetId,
              }),
            );
            return;
          }
          NavigationService.navigation.navigate(
            ...createTokenSelectionNavDetails(),
          );
          return;
        } catch {
          if (rampIntent?.assetId) {
            NavigationService.navigation.navigate(
              ...createBuildQuoteNavDetails({
                assetId: rampIntent.assetId,
              }),
            );
            return;
          }
          NavigationService.navigation.navigate(
            ...createTokenSelectionNavDetails(),
          );
        }
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
