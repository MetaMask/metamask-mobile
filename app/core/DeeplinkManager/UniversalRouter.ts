import { CoreUniversalLink } from './types/CoreUniversalLink';
import {
  HandlerContext,
  HandlerResult,
  RouteConfig,
  RouterOptions,
  UniversalLinkHandler,
} from './types/UniversalHandler';
import { CoreLinkNormalizer } from './CoreLinkNormalizer';
import Logger from '../../util/Logger';
import DevLogger from '../SDKConnect/utils/DevLogger';

/**
 * Central router for all deeplink handling
 * Replaces multiple switch statements with a unified routing table
 */
export class UniversalRouter {
  private static instance: UniversalRouter;
  private routes: Map<string, UniversalLinkHandler[]> = new Map();
  private fallbackHandler?: UniversalLinkHandler;

  private constructor() {
    // Initialize with empty routes
    this.routes = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UniversalRouter {
    if (!UniversalRouter.instance) {
      UniversalRouter.instance = new UniversalRouter();
    }
    return UniversalRouter.instance;
  }

  /**
   * Register a handler for specific actions
   */
  registerHandler(handler: UniversalLinkHandler, priority = 0): void {
    DevLogger.log(
      `UniversalRouter: Registering handler ${handler.id} for actions:`,
      handler.supportedActions,
    );

    handler.supportedActions.forEach((action) => {
      const handlers = this.routes.get(action) || [];

      // Create handler with priority
      interface HandlerWithPriority extends UniversalLinkHandler {
        priority?: number;
      }
      const handlerWithPriority = handler as HandlerWithPriority;
      handlerWithPriority.priority = priority;

      // Insert handler based on priority (higher priority first)
      const insertIndex = handlers.findIndex(
        (h) => ((h as HandlerWithPriority).priority ?? 0) <= priority,
      );

      if (insertIndex === -1) {
        handlers.push(handlerWithPriority);
      } else {
        handlers.splice(insertIndex, 0, handlerWithPriority);
      }

      this.routes.set(action, handlers);
    });
  }

  /**
   * Register multiple handlers at once
   */
  registerHandlers(configs: RouteConfig[]): void {
    configs.forEach(({ handler, priority }) => {
      this.registerHandler(handler, priority);
    });
  }

  /**
   * Set a fallback handler for unmatched routes
   */
  setFallbackHandler(handler: UniversalLinkHandler): void {
    this.fallbackHandler = handler;
  }

  /**
   * Route a URL through the system
   */
  async route(
    url: string,
    context: HandlerContext,
    options: RouterOptions = {},
  ): Promise<HandlerResult> {
    try {
      DevLogger.log('UniversalRouter: Routing URL', url);

      // Normalize the link
      const normalizedLink = CoreLinkNormalizer.normalize(url, context.origin);
      DevLogger.log('UniversalRouter: Normalized link', {
        action: normalizedLink.action,
        params: normalizedLink.params,
        metadata: normalizedLink.metadata,
      });

      // Check auth requirements
      if (
        !options.skipAuth &&
        normalizedLink.metadata.needsAuth &&
        !(await this.checkAuth(context))
      ) {
        return {
          handled: false,
          error: new Error('Authentication required'),
        };
      }

      // Get handlers for this action
      const handlers = this.routes.get(normalizedLink.action) || [];

      if (handlers.length === 0) {
        DevLogger.log(
          `UniversalRouter: No handlers found for action ${normalizedLink.action}`,
        );

        // Try fallback handler if allowed
        if (options.allowFallback && this.fallbackHandler) {
          return this.fallbackHandler.handle(normalizedLink, context);
        }

        return {
          handled: false,
          error: new Error(`No handler for action: ${normalizedLink.action}`),
        };
      }

      // Try handlers in priority order
      for (const handler of handlers) {
        try {
          DevLogger.log(
            `UniversalRouter: Trying handler ${handler.id} for action ${normalizedLink.action}`,
          );

          const result = await handler.handle(normalizedLink, context);

          if (result.handled) {
            DevLogger.log(
              `UniversalRouter: Successfully handled by ${handler.id}`,
            );
            return result;
          }
        } catch (error) {
          Logger.error(
            error as Error,
            `UniversalRouter: Handler ${handler.id} threw error`,
          );
          // Continue to next handler
        }
      }

      // No handler successfully processed the link
      return {
        handled: false,
        error: new Error(
          `No handler could process action: ${normalizedLink.action}`,
        ),
      };
    } catch (error) {
      Logger.error(error as Error, 'UniversalRouter: Route error');
      return {
        handled: false,
        error: error as Error,
      };
    }
  }

  /**
   * Route a pre-normalized link
   */
  async routeNormalizedLink(
    link: CoreUniversalLink,
    context: HandlerContext,
    options: RouterOptions = {},
  ): Promise<HandlerResult> {
    // Get handlers for this action
    const handlers = this.routes.get(link.action) || [];

    if (
      handlers.length === 0 &&
      options.allowFallback &&
      this.fallbackHandler
    ) {
      return this.fallbackHandler.handle(link, context);
    }

    // Try handlers in order
    for (const handler of handlers) {
      try {
        const result = await handler.handle(link, context);
        if (result.handled) {
          return result;
        }
      } catch (error) {
        Logger.error(
          error as Error,
          `UniversalRouter: Handler ${handler.id} threw error`,
        );
      }
    }

    return {
      handled: false,
      error: new Error(`No handler could process action: ${link.action}`),
    };
  }

  /**
   * Check if user is authenticated
   */
  private async checkAuth(_context: HandlerContext): Promise<boolean> {
    // This would check if the user is logged in and the vault is unlocked
    // For now, we'll assume authentication is handled elsewhere
    // This is a placeholder for future implementation
    return true;
  }

  /**
   * Get all registered actions
   */
  getRegisteredActions(): string[] {
    return Array.from(this.routes.keys());
  }

  /**
   * Check if an action has a handler
   */
  hasHandler(action: string): boolean {
    const handlers = this.routes.get(action);
    return handlers !== undefined && handlers.length > 0;
  }

  /**
   * Clear all routes (useful for testing)
   */
  clearRoutes(): void {
    this.routes.clear();
    this.fallbackHandler = undefined;
  }
}
