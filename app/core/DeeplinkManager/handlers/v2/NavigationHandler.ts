import { BaseHandler } from './BaseHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import {
  HandlerContext,
  HandlerResult,
} from '../../types/UniversalLinkHandler';
import Routes from '../../../../constants/navigation/Routes';
import { ACTIONS } from '../../../../constants/deeplinks';
import Logger from '../../../../util/Logger';

/**
 * Handles simple navigation deep links (home, settings, activity, etc.)
 */
export class NavigationHandler extends BaseHandler {
  readonly supportedActions = [
    ACTIONS.HOME,
    ACTIONS.CREATE_ACCOUNT,
    ACTIONS.REWARDS,
    ACTIONS.PREDICT,
    ACTIONS.PERPS,
    ACTIONS.PERPS_MARKETS,
    ACTIONS.PERPS_ASSET,
  ];

  readonly priority = 10; // Standard priority

  async handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    try {
      Logger.log(`📍 NavigationHandler processing: ${link.action}`);

      // Map actions to routes
      switch (link.action) {
        case ACTIONS.HOME:
          this.navigateToHome(context);
          break;

        case ACTIONS.CREATE_ACCOUNT:
          // todo: implement create account to match handleCreateAccountUrl.ts
          this.navigate(context, Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.MODAL.MODAL_CONFIRMATION,
          });
          break;

        case ACTIONS.REWARDS:
          // todo: implement rewards to match handlRewardsUrl.ts
          this.navigate(context, Routes.REWARDS_VIEW, link.params);
          break;

        case ACTIONS.PREDICT:
          // todo: implement predict to match handlePredictUrl.ts
          this.navigate(context, Routes.PREDICT.ROOT, link.params);
          break;

        case ACTIONS.PERPS:
        case ACTIONS.PERPS_MARKETS:
        case ACTIONS.PERPS_ASSET: {
          // todo: implement perps to match handlePerpsUrl.ts
          const perpsPath = link.params.perpsPath || '/markets';
          this.navigate(context, Routes.PERPS.ROOT, { path: perpsPath });
          break;
        }

        default:
          // Should not happen as canHandle filters these
          return this.createErrorResult(
            new Error(`Unsupported navigation action: ${link.action}`),
          );
      }

      this.trackEvent('navigation_deeplink', {
        action: link.action,
        source: link.source,
      });

      return this.createSuccessResult({
        action: link.action,
        navigated: true,
      });
    } catch (error) {
      Logger.error(error as Error, 'NavigationHandler failed');
      return this.createErrorResult(error as Error);
    }
  }
}
