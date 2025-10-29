import {
  HandlerContext,
  HandlerResult,
  UniversalLinkHandler,
} from '../../types/UniversalHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';

/**
 * Handler for ramp (buy/sell/deposit) links
 * Supports multiple related actions for fiat on/off ramps
 */
export class RampHandler implements UniversalLinkHandler {
  id = 'ramp-handler';
  supportedActions = [
    'buy',
    'buy-crypto',
    'sell',
    'sell-crypto',
    'deposit',
  ] as const;
  requiresAuth = true;
  bypassModal = false;

  handle(link: CoreUniversalLink, context: HandlerContext): HandlerResult {
    // Extract path after the action
    const pathSegments = link.pathname.split('/').filter(Boolean);
    const rampPath = pathSegments.slice(1).join('/');

    // Build query string from params
    let queryString = '';
    if (link.params && Object.keys(link.params).length > 0) {
      queryString =
        '?' +
        new URLSearchParams(link.params as Record<string, string>).toString();
    }

    const fullPath = rampPath + queryString;

    // Route to appropriate handler based on action
    switch (link.action) {
      case 'buy':
      case 'buy-crypto':
        context.deeplinkManager._handleBuyCrypto(fullPath);
        break;

      case 'sell':
      case 'sell-crypto':
        context.deeplinkManager._handleSellCrypto(fullPath);
        break;

      case 'deposit':
        context.deeplinkManager._handleDepositCash(fullPath);
        break;

      default:
        return {
          handled: false,
          error: new Error(`Unsupported ramp action: ${link.action}`),
        };
    }

    return {
      handled: true,
    };
  }
}
