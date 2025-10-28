import UrlParser from 'url-parse';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { CoreLinkNormalizer } from '../CoreLinkNormalizer';
import extractURLParams, {
  DeeplinkUrlParams,
} from '../ParseManager/extractURLParams';

/**
 * Adapter to bridge between new CoreUniversalLink format and legacy handlers
 * This allows gradual migration without breaking existing functionality
 */
export class LegacyLinkAdapter {
  /**
   * Convert a CoreUniversalLink to legacy format expected by existing handlers
   */
  static toLegacyFormat(
    link: CoreUniversalLink,
  ): ReturnType<typeof extractURLParams> {
    // Use the original extractURLParams for consistency
    return extractURLParams(link.originalUrl);
  }

  /**
   * Create a CoreUniversalLink from legacy components
   */
  static fromLegacyFormat(
    url: string,
    _urlObj: UrlParser<Record<string, string | undefined>>,
    params: DeeplinkUrlParams,
    source: string,
  ): CoreUniversalLink {
    // Use the normalizer but preserve legacy params structure
    const normalized = CoreLinkNormalizer.normalize(url, source);

    // Merge legacy params into normalized params
    const mergedParams = {
      ...normalized.params,
      ...this.convertLegacyParams(params),
    };

    return {
      ...normalized,
      params: mergedParams,
    };
  }

  /**
   * Convert legacy DeeplinkUrlParams to CoreLinkParams format
   */
  private static convertLegacyParams(
    params: DeeplinkUrlParams,
  ): Record<string, string | undefined> {
    const converted: Record<string, string | undefined> = {};

    // Convert all defined properties
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'boolean') {
          // Convert boolean to string (e.g., hr: true -> '1')
          converted[key] = value ? '1' : '0';
        } else {
          converted[key] = String(value);
        }
      }
    });

    return converted;
  }

  /**
   * Check if a URL should be handled by the new system
   * Start with metamask:// and universal links only
   */
  static shouldUseNewSystem(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Check if it's a supported deeplink format
    return CoreLinkNormalizer.isSupportedDeeplink(url);
  }

  /**
   * Wrap a legacy handler to use the new system
   */
  static wrapHandler<T>(
    legacyHandler: (params: T) => void | Promise<void>,
    paramExtractor: (link: CoreUniversalLink) => T,
  ): (link: CoreUniversalLink) => void | Promise<void> {
    return async (link: CoreUniversalLink) => {
      const params = paramExtractor(link);
      return legacyHandler(params);
    };
  }

  /**
   * Extract action-specific parameters for legacy handlers
   */
  static extractActionParams(link: CoreUniversalLink): Record<string, unknown> {
    switch (link.action) {
      case 'swap':
        return {
          swapPath:
            link.pathname.split('/').slice(1).join('/') +
            (link.params && Object.keys(link.params).length > 0
              ? '?' +
                new URLSearchParams(
                  link.params as Record<string, string>,
                ).toString()
              : ''),
        };

      case 'perps':
      case 'perps-markets':
      case 'perps-asset':
        return {
          perpsPath:
            link.pathname.split('/').slice(1).join('/') +
            (link.params && Object.keys(link.params).length > 0
              ? '?' +
                new URLSearchParams(
                  link.params as Record<string, string>,
                ).toString()
              : ''),
        };

      case 'rewards':
        return {
          rewardsPath:
            link.pathname.split('/').slice(1).join('/') +
            (link.params && Object.keys(link.params).length > 0
              ? '?' +
                new URLSearchParams(
                  link.params as Record<string, string>,
                ).toString()
              : ''),
        };

      case 'home':
        return {
          homePath:
            link.pathname.split('/').slice(1).join('/') +
            (link.params && Object.keys(link.params).length > 0
              ? '?' +
                new URLSearchParams(
                  link.params as Record<string, string>,
                ).toString()
              : ''),
        };

      case 'create-account':
        return {
          path:
            link.pathname.split('/').slice(1).join('/') +
            (link.params && Object.keys(link.params).length > 0
              ? '?' +
                new URLSearchParams(
                  link.params as Record<string, string>,
                ).toString()
              : ''),
        };

      default:
        // For unhandled actions, pass the full link params
        return {
          url: link.originalUrl,
          params: link.params,
          action: link.action,
        };
    }
  }
}
