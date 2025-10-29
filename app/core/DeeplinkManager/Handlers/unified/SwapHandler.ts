import {
  HandlerContext,
  HandlerResult,
  UniversalLinkHandler,
} from '../../types/UniversalHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import { handleSwapUrl } from '../handleSwapUrl';

/**
 * Handler for swap/bridge deeplinks
 * Supports: metamask://swap, https://link.metamask.io/swap
 */
export class SwapHandler implements UniversalLinkHandler {
  id = 'swap-handler';
  supportedActions = ['swap'] as const;
  requiresAuth = true;
  bypassModal = false;

  async handle(
    link: CoreUniversalLink,
    _context: HandlerContext,
  ): Promise<HandlerResult> {
    try {
      // Extract path after 'swap'
      const pathSegments = link.pathname.split('/').filter(Boolean);
      const swapPath = pathSegments.slice(1).join('/');

      // Build query string from params
      let queryString = '';
      if (link.params && Object.keys(link.params).length > 0) {
        const filteredParams: Record<string, string> = {};

        // Filter out undefined values
        Object.entries(link.params).forEach(([key, value]) => {
          if (value !== undefined) {
            filteredParams[key] = value;
          }
        });

        if (Object.keys(filteredParams).length > 0) {
          queryString = '?' + new URLSearchParams(filteredParams).toString();
        }
      }

      const fullSwapPath = swapPath + queryString;

      // Use existing swap handler
      await handleSwapUrl({ swapPath: fullSwapPath });

      return {
        handled: true,
      };
    } catch (error) {
      return {
        handled: false,
        error: error as Error,
      };
    }
  }
}
