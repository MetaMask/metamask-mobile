import {
  HandlerContext,
  HandlerResult,
  UniversalLinkHandler,
} from '../../types/UniversalHandler';
import { CoreUniversalLink } from '../../types/CoreUniversalLink';
import { navigateToHomeUrl } from '../handleHomeUrl';

/**
 * Handler for home navigation links
 * Supports: metamask://home, https://link.metamask.io/home
 */
export class HomeHandler implements UniversalLinkHandler {
  id = 'home-handler';
  supportedActions = ['home'] as const;
  requiresAuth = false;
  bypassModal = true;

  handle(link: CoreUniversalLink, _context: HandlerContext): HandlerResult {
    // Extract the path after 'home'
    const pathSegments = link.pathname.split('/').filter(Boolean);
    const homePath = pathSegments.slice(1).join('/');

    // Build the full path with query params if any
    let fullPath = homePath;
    if (link.params && Object.keys(link.params).length > 0) {
      const queryString = new URLSearchParams(
        link.params as Record<string, string>,
      ).toString();
      fullPath = homePath ? `${homePath}?${queryString}` : `?${queryString}`;
    }

    // Use existing navigation logic
    navigateToHomeUrl({ homePath: fullPath });

    return {
      handled: true,
    };
  }
}
