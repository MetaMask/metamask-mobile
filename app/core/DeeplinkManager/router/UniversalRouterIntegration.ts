import { UniversalRouter } from './UniversalRouter';
import { HandlerContext } from '../types/UniversalLinkHandler';
import DeeplinkManager from '../DeeplinkManager';
import Logger from '../../../util/Logger';
import ReduxService from '../../redux';
import { selectRemoteFeatureFlags } from '../../../selectors/featureFlagController';
import { CoreLinkNormalizer } from '../normalization/CoreLinkNormalizer';

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
      const remoteFeatureFlags = selectRemoteFeatureFlags(state);
      return remoteFeatureFlags.platformNewLinkHandlerSystemEnabled === true;
    } catch (error) {
      Logger.error(error as Error, 'Failed to check feature flag');
      return false;
    }
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
      Logger.log('🔗 UniversalRouterIntegration:processWithNewRouter url', url);

      const state = ReduxService.store.getState();
      const remoteFeatureFlags = selectRemoteFeatureFlags(state);
      const isSystemEnabled =
        remoteFeatureFlags.platformNewLinkHandlerSystemEnabled === true;
      Logger.log(
        '🔗 UniversalRouterIntegration:processWithNewRouter isSystemEnabled',
        isSystemEnabled,
      );
      // Check system flag
      if (!isSystemEnabled) {
        Logger.log('System not enabled');
        return false; // Legacy handles it
      }

      // Parse URL to get action
      const link = CoreLinkNormalizer.normalize(url, source);

      // Check action-specific flag
      const actions = remoteFeatureFlags.platformNewLinkHandlerActions ?? {};
      const isActionEnabled =
        actions[link.action as keyof typeof actions] === true;
      Logger.log(
        '🔗 UniversalRouterIntegration:processWithNewRouter isActionEnabled',
        isActionEnabled,
      );
      if (!isActionEnabled) {
        Logger.log(`Action '${link.action}' not enabled by feature flag`);
        return false; // Legacy handles it
      }

      // Both flags enabled - proceed with new router
      const router = UniversalRouter.getInstance();
      router.initialize();

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
