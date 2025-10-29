/**
 * CoreLinkNormalizer - Unified deep link normalization
 *
 * Converts various deep link formats into a standardized CoreUniversalLink format
 */

import { URL as URLPolyfill } from 'react-native-url-polyfill';
import qs from 'qs';
import { PROTOCOLS } from '../../constants/deeplinks';
import AppConstants from '../AppConstants';
import {
  CoreUniversalLink,
  CoreLinkParams,
  DEFAULT_ACTION,
  isSupportedProtocol,
  isAuthRequiredAction,
  isRampAction,
  isPerpsAction,
} from './types/CoreUniversalLink';

export class CoreLinkNormalizer {
  /**
   * Normalize a deep link URL into a CoreUniversalLink
   * @param url - The URL to normalize
   * @param source - The source of the deep link (e.g., 'qr-code', 'browser', etc.)
   * @returns Normalized CoreUniversalLink object
   */
  static normalize(url: string, source: string): CoreUniversalLink {
    const timestamp = Date.now();

    try {
      // Clean and validate URL
      const cleanedUrl = this.cleanUrl(url);
      const urlObj = new URLPolyfill(cleanedUrl);

      // Extract protocol
      const protocol = this.extractProtocol(urlObj);

      // Extract action and params from original URL
      const action = this.extractAction(urlObj, protocol);
      const params = this.extractParams(urlObj, action);

      // Convert metamask:// to https:// for normalizedUrl
      const processedUrl = this.convertToHttpsIfNeeded(cleanedUrl, urlObj);
      const processedUrlObj = new URLPolyfill(processedUrl);

      // Check if action is supported
      const isSupportedAction = this.isSupportedAction(action);

      // Build normalized representation
      return {
        protocol,
        host:
          protocol === 'metamask'
            ? undefined
            : processedUrlObj.hostname || undefined,
        action,
        params,
        source,
        timestamp,
        originalUrl: url,
        normalizedUrl: processedUrl,
        isValid: true,
        isSupportedAction,
        isPrivateLink: false, // Will be determined by signature verification
        requiresAuth: isAuthRequiredAction(action),
      };
    } catch (error) {
      // Return invalid link representation
      return {
        protocol: 'https',
        action: '',
        params: {},
        source,
        timestamp,
        originalUrl: url,
        normalizedUrl: url,
        isValid: false,
        isSupportedAction: false,
        isPrivateLink: false,
        requiresAuth: false,
      };
    }
  }

  /**
   * Convert a CoreUniversalLink to metamask:// protocol
   * @param link - The CoreUniversalLink to convert
   * @returns URL string with metamask:// protocol
   */
  static toMetaMaskProtocol(link: CoreUniversalLink): string {
    if (link.protocol === 'metamask') {
      return link.originalUrl;
    }

    const { action, params } = link;
    const queryParams = this.buildQueryString(params);

    return `${PROTOCOLS.METAMASK}://${action}${queryParams ? '?' + queryParams : ''}`;
  }

  /**
   * Check if a URL is a supported deep link
   * @param url - The URL to check
   * @returns boolean indicating if the link is supported
   */
  static isSupportedDeeplink(url: string): boolean {
    try {
      const normalizedLink = this.normalize(url, 'validation');
      return normalizedLink.isValid && normalizedLink.isSupportedAction;
    } catch {
      return false;
    }
  }

  /**
   * Build a deep link URL from parameters
   * @param protocol - The protocol to use
   * @param action - The action to perform
   * @param params - Optional parameters
   * @returns Constructed deep link URL
   */
  static buildDeeplink(
    protocol: CoreUniversalLink['protocol'],
    action: string,
    params?: Partial<CoreLinkParams>,
  ): string {
    const queryString = params ? this.buildQueryString(params) : '';

    if (protocol === 'metamask') {
      return `${PROTOCOLS.METAMASK}://${action}${queryString ? '?' + queryString : ''}`;
    }

    const host = AppConstants.MM_IO_UNIVERSAL_LINK_HOST;
    return `${PROTOCOLS.HTTPS}://${host}/${action}${queryString ? '?' + queryString : ''}`;
  }

  /**
   * Private helper methods
   */

  private static cleanUrl(url: string): string {
    // Remove dapp protocol prefix handling
    return url
      .replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTPS}://`, `${PROTOCOLS.DAPP}/`)
      .replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTP}://`, `${PROTOCOLS.DAPP}/`);
  }

  private static extractProtocol(urlObj: URLPolyfill): CoreUniversalLink['protocol'] {
    const protocol = urlObj.protocol.replace(':', '');
    return isSupportedProtocol(protocol) ? protocol : 'https';
  }

  private static convertToHttpsIfNeeded(url: string, urlObj: URLPolyfill): string {
    if (urlObj.protocol === `${PROTOCOLS.METAMASK}:`) {
      return url.replace(
        `${PROTOCOLS.METAMASK}://`,
        `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/`,
      );
    }
    return url;
  }

  private static extractAction(urlObj: URLPolyfill, protocol: string): string {
    // For metamask:// URLs, the action is the hostname
    if (protocol === 'metamask' && urlObj.hostname) {
      return urlObj.hostname;
    }

    // For https:// URLs, extract from pathname
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    return pathSegments[0] || DEFAULT_ACTION;
  }

  private static extractParams(urlObj: URLPolyfill, action: string): CoreLinkParams {
    // Parse query parameters
    const queryParams = this.parseQueryString(urlObj.search);

    // Extract action-specific path
    const actionPath = this.extractActionPath(urlObj, action);

    // Merge with action-specific paths
    const params: CoreLinkParams = {
      ...queryParams,
      ...this.getActionSpecificParams(action, actionPath),
    };

    // Convert hr parameter
    if ('hr' in params && params.hr !== undefined) {
      if (typeof params.hr === 'string') {
        params.hr = params.hr === '1' || params.hr === 'true';
      } else if (typeof params.hr === 'boolean') {
        // Already a boolean, keep as is
      } else {
        params.hr = false;
      }
    }

    // Clean up message parameter
    if (params.message) {
      params.message = params.message.replace(/ /g, '+');
    }

    return params;
  }

  private static parseQueryString(search: string): Partial<CoreLinkParams> {
    if (!search || search === '?') {
      return {};
    }

    try {
      const parsed = qs.parse(search.substring(1), { arrayLimit: 99 });

      // Filter out null/undefined values and convert to proper types
      const cleaned: Partial<CoreLinkParams> = {};

      Object.entries(parsed).forEach(([key, value]) => {
        if (
          value !== null &&
          value !== undefined &&
          value !== '' &&
          value !== 'null' &&
          value !== 'undefined'
        ) {
          cleaned[key] = value as string | boolean;
        }
      });

      return cleaned;
    } catch {
      return {};
    }
  }

  private static extractActionPath(urlObj: URLPolyfill, action: string): string {
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    // Remove the action from path segments
    const actionIndex = pathSegments.indexOf(action);
    if (actionIndex >= 0) {
      pathSegments.splice(0, actionIndex + 1);
    }

    // Reconstruct path without action
    const path = pathSegments.join('/');
    const query = urlObj.search;

    return path
      ? `${action}${path ? '/' + path : ''}${query}`
      : `${action}${query}`;
  }

  private static getActionSpecificParams(
    action: string,
    actionPath: string,
  ): Partial<CoreLinkParams> {
    const params: Partial<CoreLinkParams> = {};

    if (isRampAction(action)) {
      params.rampPath = actionPath;
    } else if (action === 'swap') {
      params.swapPath = actionPath;
    } else if (action === 'dapp') {
      params.dappPath = actionPath;
    } else if (action === 'send') {
      params.sendPath = actionPath;
    } else if (isPerpsAction(action)) {
      params.perpsPath = actionPath;
    } else if (action === 'rewards') {
      params.rewardsPath = actionPath;
    } else if (action === 'home') {
      params.homePath = actionPath;
    } else if (action === 'onboarding') {
      params.onboardingPath = actionPath;
    } else if (action === 'create-account') {
      params.createAccountPath = actionPath;
    } else if (action === 'deposit') {
      params.depositCashPath = actionPath;
    }

    return params;
  }

  private static buildQueryString(params: Partial<CoreLinkParams>): string {
    const filteredParams: Record<string, string> = {};

    // Filter out action-specific paths and empty values
    const pathKeys = [
      'rampPath',
      'swapPath',
      'dappPath',
      'sendPath',
      'perpsPath',
      'rewardsPath',
      'homePath',
      'onboardingPath',
      'createAccountPath',
      'depositCashPath',
    ];

    Object.entries(params).forEach(([key, value]) => {
      if (
        !pathKeys.includes(key) &&
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        if (key === 'hr' && typeof value === 'boolean') {
          filteredParams[key] = value ? '1' : '0';
        } else {
          filteredParams[key] = String(value);
        }
      }
    });

    return Object.keys(filteredParams).length > 0
      ? qs.stringify(filteredParams)
      : '';
  }

  private static isSupportedAction(action: string): boolean {
    // Check against all action constants
    // Import is done dynamically to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { ACTIONS } = require('../../constants/deeplinks');
    const allActions = Object.values(ACTIONS) as string[];
    return allActions.includes(action);
  }
}
