import { CoreLinkNormalizer } from './CoreLinkNormalizer';
import { UniversalRouter } from './UniversalRouter';
import HandlerRegistry from './Handlers/HandlerRegistry';
import DeeplinkManager from './DeeplinkManager';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { HandlerContext } from './types/UniversalHandler';

/**
 * Integration layer between new UniversalRouter and existing deeplink system
 * Allows gradual migration without breaking existing functionality
 */
export class RouteIntegration {
  private static useNewRouter = false;
  private static initialized = false;

  /**
   * Initialize the integration
   */
  static initialize(enableNewRouter = false): void {
    if (RouteIntegration.initialized) {
      return;
    }

    // Initialize handler registry
    HandlerRegistry.initialize();

    // Set router preference
    RouteIntegration.useNewRouter = enableNewRouter;
    RouteIntegration.initialized = true;

    DevLogger.log(
      `RouteIntegration: Initialized with new router ${
        enableNewRouter ? 'enabled' : 'disabled'
      }`,
    );
  }

  /**
   * Enable or disable the new router
   */
  static setUseNewRouter(enabled: boolean): void {
    RouteIntegration.useNewRouter = enabled;
    DevLogger.log(
      `RouteIntegration: New router ${enabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Check if a URL should use the new router
   */
  static shouldUseNewRouter(url: string): boolean {
    if (!RouteIntegration.useNewRouter) {
      return false;
    }

    // Only use new router for supported deeplink formats
    if (!CoreLinkNormalizer.isSupportedDeeplink(url)) {
      return false;
    }

    // Check if we have a handler for this action
    try {
      const normalized = CoreLinkNormalizer.normalize(url, 'unknown');
      return HandlerRegistry.isActionHandled(normalized.action);
    } catch {
      return false;
    }
  }

  /**
   * Route a URL using the new system
   */
  static async routeWithNewSystem(
    url: string,
    deeplinkManager: DeeplinkManager,
    origin: string,
    browserCallBack?: (url: string) => void,
    onHandled?: () => void,
  ): Promise<boolean> {
    try {
      DevLogger.log('RouteIntegration: Routing with new system', url);

      const context: HandlerContext = {
        deeplinkManager,
        browserCallBack,
        origin,
      };

      const router = UniversalRouter.getInstance();
      const result = await router.route(url, context);

      if (result.handled) {
        DevLogger.log('RouteIntegration: Successfully handled by new router');
        if (onHandled) {
          onHandled();
        }
        return true;
      }

      DevLogger.log(
        'RouteIntegration: New router could not handle',
        result.error,
      );
      return false;
    } catch (error) {
      DevLogger.log('RouteIntegration: Error in new router', error);
      return false;
    }
  }

  /**
   * Get status of the integration
   */
  static getStatus(): {
    initialized: boolean;
    newRouterEnabled: boolean;
    registeredActions: string[];
  } {
    return {
      initialized: RouteIntegration.initialized,
      newRouterEnabled: RouteIntegration.useNewRouter,
      registeredActions: UniversalRouter.getInstance().getRegisteredActions(),
    };
  }
}
