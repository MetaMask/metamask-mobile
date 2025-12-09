import {
  UniversalLinkHandler,
  HandlerContext,
  HandlerResult,
} from '../../types/UniversalLinkHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import Logger from '../../../../util/Logger';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../Engine';

/**
 * Base handler with common utilities for all deep link handlers
 * Provides authentication checks, navigation helpers, and error handling
 */
export abstract class BaseHandler extends UniversalLinkHandler {
  /**
   * Navigate to a specific route with optional params
   */
  protected navigate(
    context: HandlerContext,
    routeName: string,
    params?: Record<string, unknown>,
  ): void {
    try {
      context.navigation.navigate(routeName, params);
      Logger.log(`🔗 Navigated to ${routeName}`, params);
    } catch (error) {
      Logger.error(error as Error, `Failed to navigate to ${routeName}`);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  protected isAuthenticated(_context: HandlerContext): boolean {
    // Check if wallet is unlocked via Engine
    try {
      const { KeyringController } = Engine.context;
      return KeyringController.state.isUnlocked;
    } catch {
      return false;
    }
  }

  /**
   * Navigate to home screen
   */
  protected navigateToHome(context: HandlerContext): void {
    this.navigate(context, Routes.MODAL.ROOT_MODAL_FLOW);
  }

  /**
   * Track analytics event
   */
  protected trackEvent(
    eventName: string,
    properties?: Record<string, unknown>,
  ): void {
    try {
      // Analytics tracking would go here
      Logger.log(`📊 Track: ${eventName}`, properties);
    } catch (error) {
      Logger.error(error as Error, 'Analytics tracking failed');
    }
  }

  /**
   * Create error result with consistent format
   */
  protected createErrorResult(
    error: Error,
    fallbackToLegacy = true,
  ): HandlerResult {
    return {
      handled: false,
      fallbackToLegacy,
      error,
      metadata: {
        errorMessage: error.message,
        errorStack: error.stack,
      },
    };
  }

  /**
   * Create success result with metadata
   */
  protected createSuccessResult(
    metadata?: Record<string, unknown>,
  ): HandlerResult {
    return {
      handled: true,
      metadata: {
        handler: this.constructor.name,
        timestamp: Date.now(),
        ...metadata,
      },
    };
  }

  /**
   * Validate required parameters
   */
  protected validateParams(link: CoreUniversalLink, required: string[]): void {
    const missing = required.filter((key) => !link.params[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }
}
