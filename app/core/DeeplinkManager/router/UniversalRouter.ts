import { HandlerRegistry } from './HandlerRegistry';
import { CoreLinkNormalizer } from '../CoreLinkNormalizer';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { LegacyLinkAdapter } from '../adapters/LegacyLinkAdapter';
import {
  HandlerContext,
  HandlerResult,
} from './interfaces/UniversalLinkHandler';
import Logger from '../../../util/Logger';
import { MetaMetrics } from '../../Analytics';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
import ReduxService from '../../redux';
import { selectRemoteFeatureFlags } from '../../../selectors/featureFlagController';

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

  /**
   * Feature flag key for enabling the universal router
   */
  private static readonly FEATURE_FLAG_KEY = 'MM_UNIVERSAL_ROUTER';

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
    if (this.isInitialized) {
      Logger.log('🔗 UniversalRouter already initialized');
      return;
    }

    Logger.log('🔗 Initializing UniversalRouter');

    // Register built-in handlers
    try {
      // TODO: Register handlers here in subsequent PRs
      // Example:
      // const { NavigationHandler } = require('./handlers/NavigationHandler');
      // this.registry.register(new NavigationHandler());

      Logger.log(
        '🔗 Registered handlers:',
        this.registry.getRegisteredActions(),
      );
    } catch (error) {
      Logger.error(error as Error, 'Failed to register handlers');
    }

    this.isInitialized = true;
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

      Logger.log('🔗 Routing deep link:', {
        action: link.action,
        source: link.source,
        protocol: link.protocol,
      });

      // Check feature flag
      if (!this.shouldUseNewSystem(link, context)) {
        Logger.log('🔗 Feature flag disabled, delegating to legacy');
        return this.delegateToLegacy(link, context);
      }

      // Find handlers for this link
      const handlers = this.registry.findHandlers(link);

      if (handlers.length === 0) {
        Logger.log('🔗 No handlers found, delegating to legacy');
        return this.delegateToLegacy(link, context);
      }

      // Execute handlers in priority order
      for (const handler of handlers) {
        try {
          Logger.log(`🔗 Trying handler: ${handler.constructor.name}`);

          // Call lifecycle hook
          handler.beforeHandle?.(link);

          // Execute handler
          const result = await handler.handle(link, context);

          // Call lifecycle hook
          handler.afterHandle?.(link, result);

          if (result.handled) {
            Logger.log(`🔗 Handler succeeded: ${handler.constructor.name}`);

            // Track analytics
            this.trackHandlerSuccess(link, handler.constructor.name, result);

            return result;
          }

          if (result.fallbackToLegacy) {
            Logger.log('🔗 Handler requested legacy fallback');
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
      Logger.log('🔗 All handlers failed, delegating to legacy');
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
   * Check if the new system should be used
   */
  private shouldUseNewSystem(
    _link: CoreUniversalLink,
    context: HandlerContext,
  ): boolean {
    try {
      // Check remote feature flag
      const state = ReduxService.store.getState();
      const remoteFlags = selectRemoteFeatureFlags(state);

      if (remoteFlags?.[UniversalRouter.FEATURE_FLAG_KEY]) {
        return true;
      }

      // Check context feature flags
      if (context.featureFlags?.[UniversalRouter.FEATURE_FLAG_KEY]) {
        return true;
      }

      // Check environment variable (for development)
      if (process.env[UniversalRouter.FEATURE_FLAG_KEY] === 'true') {
        return true;
      }

      return false;
    } catch (error) {
      Logger.error(error as Error, 'Failed to check feature flag');
      return false;
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
      Logger.log('🔗 Delegating to legacy system');

      // Convert to legacy format
      const legacyFormat = LegacyLinkAdapter.toLegacyFormat(link);
      const { params } = legacyFormat;

      // TODO: Create legacy context when integration is implemented
      // LegacyLinkAdapter.createHandlerContext(link, { ... });

      // The actual legacy handler execution would happen in the parseDeeplink integration
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
