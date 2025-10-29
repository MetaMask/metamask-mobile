import { CoreUniversalLink } from './CoreUniversalLink';
import DeeplinkManager from '../DeeplinkManager';

/**
 * Handler context passed to all handlers
 */
export interface HandlerContext {
  deeplinkManager: DeeplinkManager;
  browserCallBack?: (url: string) => void;
  origin: string;
}

/**
 * Result returned by handlers
 */
export interface HandlerResult {
  handled: boolean;
  redirectUrl?: string;
  error?: Error;
}

/**
 * Base interface for all link handlers
 */
export interface UniversalLinkHandler {
  /**
   * Unique identifier for the handler
   */
  id: string;

  /**
   * Actions this handler can process
   */
  supportedActions: readonly string[];

  /**
   * Whether this handler requires authentication
   */
  requiresAuth: boolean;

  /**
   * Whether this handler should bypass the deep link modal
   */
  bypassModal?: boolean;

  /**
   * Handle the normalized link
   */
  handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> | HandlerResult;
}

/**
 * Configuration for route registration
 */
export interface RouteConfig {
  action: string;
  handler: UniversalLinkHandler;
  priority?: number; // Higher priority handlers are tried first
}

/**
 * Options for router execution
 */
export interface RouterOptions {
  skipAuth?: boolean;
  skipModal?: boolean;
  allowFallback?: boolean;
}
