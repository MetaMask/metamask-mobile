import { CoreUniversalLink } from './CoreUniversalLink';

/**
 * Context provided to handlers for processing deep links
 */
export interface HandlerContext {
  navigation: {
    navigate: (routeName: string, params?: Record<string, unknown>) => void;
  };
  dispatch: (action: Record<string, unknown>) => void;
  // linting issues due to legacy DeeplinkManager, which we will be replacing in subsequent PRs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: any; // DeeplinkManager instance
  featureFlags?: Record<string, boolean>;
  browserCallBack?: (url: string) => void;
}

/**
 * Result returned by *handlers* after processing
 */
export interface HandlerResult {
  handled: boolean;
  fallbackToLegacy?: boolean;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Abstract base class template for all link handlers
 */
export abstract class UniversalLinkHandler {
  /**
   * Actions this handler supports
   */
  abstract readonly supportedActions: string[];

  /**
   * Priority for handler execution (lower = higher priority)
   * For example auth is highest priority
   */
  abstract readonly priority: number;

  /**
   * Check if handler can handle the link
   */
  canHandle(link: CoreUniversalLink): boolean {
    return this.supportedActions.includes(link.action);
  }

  /**
   * Handle the deep link
   */
  abstract handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult>;

  /**
   * Optional lifecycle hooks
   */
  beforeHandle?(link: CoreUniversalLink): void;
  afterHandle?(link: CoreUniversalLink, result: HandlerResult): void;
}
