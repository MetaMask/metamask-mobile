import {
  HandlerContext,
  HandlerResult,
  UniversalLinkHandler,
} from '../../types/UniversalHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import handleBrowserUrl from '../handleBrowserUrl';

/**
 * Handler for browser/dapp navigation links
 * Supports: metamask://dapp/..., https://link.metamask.io/dapp/...
 */
export class BrowserHandler implements UniversalLinkHandler {
  id = 'browser-handler';
  supportedActions = ['dapp'] as const;
  requiresAuth = false;
  bypassModal = false;

  handle(link: CoreUniversalLink, context: HandlerContext): HandlerResult {
    // Extract the URL after 'dapp/'
    const pathSegments = link.pathname.split('/').filter(Boolean);
    const dappPath = pathSegments.slice(1).join('/');

    // Reconstruct the full URL
    let targetUrl = '';
    if (dappPath) {
      // Check if it already has a protocol
      if (dappPath.startsWith('http://') || dappPath.startsWith('https://')) {
        targetUrl = dappPath;
      } else {
        targetUrl = `https://${dappPath}`;
      }

      // Add query params if any
      if (link.params && Object.keys(link.params).length > 0) {
        const queryString = new URLSearchParams(
          link.params as Record<string, string>,
        ).toString();
        targetUrl += `?${queryString}`;
      }
    }

    if (!targetUrl) {
      return {
        handled: false,
        error: new Error('No target URL specified for dapp action'),
      };
    }

    // Use existing browser URL handler
    handleBrowserUrl({
      deeplinkManager: context.deeplinkManager,
      url: targetUrl,
      callback: context.browserCallBack,
    });

    return {
      handled: true,
      redirectUrl: targetUrl,
    };
  }
}
