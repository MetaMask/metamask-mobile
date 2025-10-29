import { UniversalRouter } from '../UniversalRouter';
import { HomeHandler } from './unified/HomeHandler';
import { BrowserHandler } from './unified/BrowserHandler';
import { RampHandler } from './unified/RampHandler';
import { SwapHandler } from './unified/SwapHandler';
import DevLogger from '../../SDKConnect/utils/DevLogger';

/**
 * Registry for all unified handlers
 * Initializes and registers handlers with the UniversalRouter
 */
class HandlerRegistry {
  private static initialized = false;

  /**
   * Initialize all handlers and register with the router
   */
  static initialize(): void {
    if (HandlerRegistry.initialized) {
      DevLogger.log('HandlerRegistry: Already initialized');
      return;
    }

    const router = UniversalRouter.getInstance();

    // Clear any existing routes for a clean slate
    router.clearRoutes();

    // Register all handlers
    const handlers = [
      new HomeHandler(),
      new BrowserHandler(),
      new RampHandler(),
      new SwapHandler(),
    ];

    handlers.forEach((handler) => {
      router.registerHandler(handler);
      DevLogger.log(
        `HandlerRegistry: Registered ${handler.id} for actions:`,
        handler.supportedActions,
      );
    });

    HandlerRegistry.initialized = true;
    DevLogger.log(
      'HandlerRegistry: Initialization complete. Registered actions:',
      router.getRegisteredActions(),
    );
  }

  /**
   * Reset the registry (useful for testing)
   */
  static reset(): void {
    UniversalRouter.getInstance().clearRoutes();
    HandlerRegistry.initialized = false;
  }

  /**
   * Check if a specific action is handled
   */
  static isActionHandled(action: string): boolean {
    return UniversalRouter.getInstance().hasHandler(action);
  }
}

export default HandlerRegistry;
