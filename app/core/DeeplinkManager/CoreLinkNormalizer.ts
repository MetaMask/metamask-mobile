import UrlParser from 'url-parse';
import qs from 'qs';
import AppConstants from '../AppConstants';
import {
  CoreUniversalLink,
  CoreLinkParams,
  LinkProtocol,
  LinkSource,
  AUTH_REQUIRED_ACTIONS,
  SDK_ACTIONS,
} from './types/CoreUniversalLink';
import { PROTOCOLS } from '../../constants/deeplinks';

/**
 * Normalizes deeplinks between metamask:// and https:// formats
 * Provides a unified interface for link handling
 */
export class CoreLinkNormalizer {
  private static readonly PROD_HOST = 'link.metamask.io';
  private static readonly TEST_HOST = 'link-test.metamask.io';
  private static readonly BRANCH_HOST = 'metamask.app.link';
  private static readonly BRANCH_TEST_HOST = 'metamask.test-app.link';

  /**
   * Get the appropriate universal link host based on environment
   */
  private static getUniversalHost(): string {
    // Use the host from AppConstants if available
    return AppConstants.MM_IO_UNIVERSAL_LINK_HOST || this.PROD_HOST;
  }

  /**
   * Normalize a deeplink to a unified format
   * @param url - The original deeplink URL
   * @param source - The source of the deeplink (branch, linking, etc.)
   * @returns Normalized link object
   */
  static normalize(
    url: string,
    source: LinkSource | string,
  ): CoreUniversalLink {
    try {
      const protocol = this.detectProtocol(url);
      const normalizedUrl = this.normalizeToUniversal(url);
      const urlObj = new UrlParser<Record<string, string | undefined>>(
        normalizedUrl,
      );
      const action = this.extractAction(urlObj);
      const params = this.extractParams(urlObj);

      return {
        originalUrl: url,
        normalizedUrl,
        protocol,
        action,
        hostname: urlObj.hostname || '',
        pathname: urlObj.pathname || '/',
        params,
        metadata: {
          source,
          timestamp: Date.now(),
          needsAuth: this.actionNeedsAuth(action),
          isSDKAction: this.isSDKAction(action),
        },
      };
    } catch (error) {
      // If normalization fails, return a minimal structure
      return {
        originalUrl: url,
        normalizedUrl: url,
        protocol: 'https',
        action: 'unknown',
        hostname: '',
        pathname: '/',
        params: {},
        metadata: {
          source,
          timestamp: Date.now(),
          needsAuth: false,
          isSDKAction: false,
        },
      };
    }
  }

  /**
   * Detect the protocol of the URL
   */
  private static detectProtocol(url: string): LinkProtocol {
    if (!url || typeof url !== 'string') {
      return 'https';
    }
    if (url.startsWith(`${PROTOCOLS.METAMASK}://`)) {
      return 'metamask';
    }
    return 'https';
  }

  /**
   * Convert any supported format to universal HTTPS format
   */
  private static normalizeToUniversal(url: string): string {
    if (!url || typeof url !== 'string') {
      return `${PROTOCOLS.HTTPS}://${this.getUniversalHost()}/`;
    }

    if (url.startsWith(`${PROTOCOLS.METAMASK}://`)) {
      // Convert metamask:// to https://
      const host = this.getUniversalHost();
      return url.replace(
        `${PROTOCOLS.METAMASK}://`,
        `${PROTOCOLS.HTTPS}://${host}/`,
      );
    }

    // Check if it's already a valid URL
    try {
      new URL(url);
      return url;
    } catch {
      // If not a valid URL, wrap it as a path
      return `${PROTOCOLS.HTTPS}://${this.getUniversalHost()}/${url}`;
    }
  }

  /**
   * Convert universal HTTPS format to metamask:// format
   */
  static toMetaMaskProtocol(url: string): string {
    const universalHosts = [
      this.PROD_HOST,
      this.TEST_HOST,
      this.BRANCH_HOST,
      this.BRANCH_TEST_HOST,
      AppConstants.MM_UNIVERSAL_LINK_HOST,
      AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
      AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST,
    ].filter(Boolean);

    for (const host of universalHosts) {
      if (url.includes(`${PROTOCOLS.HTTPS}://${host}/`)) {
        return url.replace(
          `${PROTOCOLS.HTTPS}://${host}/`,
          `${PROTOCOLS.METAMASK}://`,
        );
      }
    }

    return url;
  }

  /**
   * Extract the action from the URL
   */
  private static extractAction(
    urlObj: UrlParser<Record<string, string | undefined>>,
  ): string {
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    // First path segment is the action
    if (pathSegments.length > 0) {
      return pathSegments[0];
    }

    // Default to 'home' if no action specified
    return 'home';
  }

  /**
   * Extract and normalize parameters from the URL
   */
  private static extractParams(
    urlObj: UrlParser<Record<string, string | undefined>>,
  ): CoreLinkParams {
    const params: CoreLinkParams = {};

    // Handle query which could be string or object based on UrlParser implementation
    // UrlParser's query can be either string or the generic type passed
    const query = urlObj.query as
      | string
      | Record<string, string | undefined>
      | undefined;
    if (query && typeof query === 'string' && query.length > 0) {
      try {
        // Use qs for consistent parsing with existing code
        const parsedParams = qs.parse(query.substring(1), {
          arrayLimit: 99,
        });

        // Convert all values to strings and handle special cases
        Object.entries(parsedParams).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            // Handle arrays by taking first value
            if (Array.isArray(value)) {
              params[key] = String(value[0]);
            } else {
              params[key] = String(value);
            }
          }
        });

        // Special handling for 'hr' parameter (Hide Return to App)
        if (params.hr === '1') {
          params.hr = '1';
        }

        // Handle message parameter spaces
        if (params.message && typeof params.message === 'string') {
          params.message = params.message.replace(/ /g, '+');
        }
      } catch (e) {
        // If parsing fails, try basic URLSearchParams
        try {
          const searchParams = new URLSearchParams(query);
          searchParams.forEach((value, key) => {
            params[key] = value;
          });
        } catch {
          // Ignore parsing errors
        }
      }
    }

    return params;
  }

  /**
   * Check if an action requires authentication
   */
  private static actionNeedsAuth(action: string): boolean {
    return AUTH_REQUIRED_ACTIONS.includes(
      action as (typeof AUTH_REQUIRED_ACTIONS)[number],
    );
  }

  /**
   * Check if an action is SDK-specific
   */
  private static isSDKAction(action: string): boolean {
    return SDK_ACTIONS.includes(action as (typeof SDK_ACTIONS)[number]);
  }

  /**
   * Check if a URL is a supported deeplink format
   */
  static isSupportedDeeplink(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Check for metamask:// protocol
    if (url.startsWith(`${PROTOCOLS.METAMASK}://`)) {
      return true;
    }

    // Check for universal link hosts
    const universalHosts = [
      this.PROD_HOST,
      this.TEST_HOST,
      this.BRANCH_HOST,
      this.BRANCH_TEST_HOST,
      AppConstants.MM_UNIVERSAL_LINK_HOST,
      AppConstants.MM_IO_UNIVERSAL_LINK_HOST,
      AppConstants.MM_IO_UNIVERSAL_LINK_TEST_HOST,
    ].filter(Boolean);

    try {
      const urlObj = new UrlParser<Record<string, string | undefined>>(url);
      return universalHosts.includes(urlObj.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Build a deeplink URL from components
   */
  static buildDeeplink(
    action: string,
    params?: CoreLinkParams,
    useMetaMaskProtocol = false,
  ): string {
    // Filter out undefined values for qs.stringify
    let queryString = '';
    if (params) {
      const cleanParams: Record<string, string> = {};
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanParams[key] = value;
        }
      });

      if (Object.keys(cleanParams).length > 0) {
        queryString = '?' + qs.stringify(cleanParams);
      }
    }

    if (useMetaMaskProtocol) {
      return `${PROTOCOLS.METAMASK}://${action}${queryString}`;
    }

    const host = this.getUniversalHost();
    return `${PROTOCOLS.HTTPS}://${host}/${action}${queryString}`;
  }
}
