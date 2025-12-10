import { UniversalRouter } from './UniversalRouter';
import { HandlerContext } from '../types/UniversalLinkHandler';
import DeeplinkManager from '../DeeplinkManager';
import Logger from '../../../util/Logger';
import ReduxService from '../../redux';
import { selectRemoteFeatureFlags } from '../../../selectors/featureFlagController';

/**
 * Integration layer between UniversalRouter and existing deeplink system
 * This will be called from handleUniversalLink.ts in place of the switch-case
 */
export class UniversalRouterIntegration {
  /**
   * Check if the new router system should be used
   */
  static shouldUseNewRouter(): boolean {
    try {
      const state = ReduxService.store.getState();
      if (state) {
        const remoteFlags = selectRemoteFeatureFlags(state);
        return remoteFlags?.MM_UNIVERSAL_ROUTER === true;
      }
    } catch (error) {
      Logger.error(error as Error, 'Failed to check feature flag');
    }
    return false;
  }

  /**
   * Process a deep link using the new router system
   * @returns true if handled by new system, false to fallback to legacy
   */
  static async processWithNewRouter(
    url: string,
    source: string,
    instance: DeeplinkManager,
    browserCallBack?: (url: string) => void,
  ): Promise<boolean> {
    try {
      if (!this.shouldUseNewRouter()) {
        return false;
      }

      // Initialize router if needed
      const router = UniversalRouter.getInstance();
      router.initialize();

      // Create handler context
      const context: HandlerContext = {
        navigation: {
          navigate: (routeName: string, params?: Record<string, unknown>) => {
            instance.navigation.navigate(routeName, params);
          },
        },
        dispatch: instance.dispatch,
        instance,
        browserCallBack,
      };

      // Route the deep link
      const result = await router.route(url, source, context);

      return result.handled;
    } catch (error) {
      Logger.error(error as Error, 'UniversalRouter integration failed');
      return false;
    }
  }

  /**
   * Get router instance for testing
   */
  static getRouter(): UniversalRouter {
    const router = UniversalRouter.getInstance();
    router.initialize();
    return router;
  }
}
