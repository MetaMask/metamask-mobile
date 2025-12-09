import { HandlerRegistry } from '../registry/HandlerRegistry';
import { CoreLinkNormalizer } from '../normalization/CoreLinkNormalizer';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { LegacyLinkAdapter } from '../normalization/LegacyLinkAdapter';
import { HandlerContext, HandlerResult } from '../types/UniversalLinkHandler';
import Logger from '../../../util/Logger';
import { MetaMetrics } from '../../Analytics';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import { NavigationHandler, SwapHandler, SendHandler } from '../handlers/v2';

/**
 * Universal Router for handling deep links
 *
 * This is the main entry point for the new handler-based routing system.
 * It normalizes URLs, finds appropriate handlers, and executes them in priority order.
 */
export class UniversalRouter {
  private static instance: UniversalRouter;
  private registry: HandlerRegistry;
  private isInitialized = false;

  private constructor() {
    this.registry = new HandlerRegistry();
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
   * Initialize the router with handlers
   */
  initialize(_context?: Partial<HandlerContext>): void {
    if (this.isInitialized) return;
    this.registry.clear();

    // Register built-in handlers
    try {
      // Core functionality handlers (priority 50)
      this.registry.register(new SwapHandler());
      this.registry.register(new SendHandler());

      // Navigation handlers (priority 10)
      this.registry.register(new NavigationHandler());

      Logger.log('✅ Universal Router initialized with handlers');

      // Only mark as initialized if all handlers registered successfully
      this.isInitialized = true;
    } catch (error) {
      Logger.error(error as Error, 'Failed to register handlers');
      // Rethrow to prevent silent failures - caller should handle initialization errors
      throw error;
    }
  }

  /**
   * Route a deep link to appropriate handler
   * @param url The deep link URL
   * @param source The source of the deep link
   * @param context Handler context
   * @returns Handler result
   */
  async route(
    url: string,
    source: string,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    try {
      // Normalize the URL
      const link = CoreLinkNormalizer.normalize(url, source);

      // Find handlers for this link
      const handlers = this.registry.findHandlers(link);

      if (handlers.length === 0) {
        return this.delegateToLegacy(link, context);
      }

      // Execute handlers in priority order
      for (const handler of handlers) {
        try {
          // Call lifecycle hook
          handler.beforeHandle?.(link);

          // Execute handler
          const result = await handler.handle(link, context);

          // Call lifecycle hook
          handler.afterHandle?.(link, result);

          if (result.handled) {
            // Track analytics
            this.trackHandlerSuccess(link, handler.constructor.name, result);

            return result;
          }

          if (result.fallbackToLegacy) {
            return this.delegateToLegacy(link, context);
          }
        } catch (error) {
          Logger.error(
            error as Error,
            `Handler ${handler.constructor.name} failed`,
          );
        }
      }

      // No handler succeeded, fallback to legacy
      return this.delegateToLegacy(link, context);
    } catch (error) {
      Logger.error(error as Error, 'Failed to route deep link');
      return {
        handled: false,
        error: error as Error,
      };
    }
  }

  /**
   * Delegate to legacy deep link handling
   */
  private async delegateToLegacy(
    link: CoreUniversalLink,
    _context: HandlerContext,
  ): Promise<HandlerResult> {
    try {
      // Convert to legacy format
      const legacyFormat = LegacyLinkAdapter.toLegacyFormat(link);
      const { params } = legacyFormat;

      // TODO: next PR Create legacy context when integration is implemented
      // LegacyLinkAdapter.createHandlerContext(link, { ... });
      // handleUniversalLink with legacy urlObject

      // For now, we just return success with metadata
      return {
        handled: true,
        metadata: {
          usedLegacy: true,
          action: link.action,
          params,
        },
      };
    } catch (error) {
      Logger.error(error as Error, 'Failed to delegate to legacy');
      return {
        handled: false,
        error: error as Error,
      };
    }
  }

  /**
   * Track successful handler execution for analytics
   */
  private trackHandlerSuccess(
    link: CoreUniversalLink,
    handlerName: string,
    result: HandlerResult,
  ): void {
    try {
      const metrics = MetaMetrics.getInstance();
      const eventBuilder = MetricsEventBuilder.createEventBuilder({
        category: 'DeepLink',
      });

      eventBuilder.addProperties({
        action: link.action,
        source: link.source,
        protocol: link.protocol,
        handler: handlerName,
        requiresAuth: link.requiresAuth,
        hasParams: Object.keys(link.params).length > 0,
        ...result.metadata,
      });

      metrics.trackEvent(eventBuilder.build());
    } catch (error) {
      Logger.error(error as Error, 'Failed to track analytics');
    }
  }

  /**
   * Get the handler registry
   */
  getRegistry(): HandlerRegistry {
    return this.registry;
  }

  /**
   * Reset the router (mainly for testing)
   */
  reset(): void {
    this.registry.clear();
    this.isInitialized = false;
  }
}
