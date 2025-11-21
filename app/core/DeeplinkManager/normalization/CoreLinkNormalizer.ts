/**
 * CoreLinkNormalizer - Unified deep link normalization
 *
 * Converts various deep link formats into a standardized CoreUniversalLink format
 */
import { PROTOCOLS, ACTIONS } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import {
  CoreUniversalLink,
  CoreLinkParams,
  DEFAULT_ACTION,
  RAMP_ACTIONS,
  PERPS_ACTIONS,
  AUTH_REQUIRED_ACTIONS,
  SUPPORTED_PROTOCOLS,
} from '../types/CoreUniversalLink';

const { HTTPS, METAMASK, DAPP, HTTP } = PROTOCOLS;

export class CoreLinkNormalizer {
  private static readonly ACTION_PATH_MAP: Record<
    string,
    keyof CoreLinkParams
  > = {
    [ACTIONS.RAMP]: 'rampPath',
    [ACTIONS.PERPS]: 'perpsPath',
    [ACTIONS.SWAP]: 'swapPath',
    [ACTIONS.DAPP]: 'dappPath',
    [ACTIONS.SEND]: 'sendPath',
    [ACTIONS.REWARDS]: 'rewardsPath',
    [ACTIONS.HOME]: 'homePath',
    [ACTIONS.ONBOARDING]: 'onboardingPath',
    [ACTIONS.CREATE_ACCOUNT]: 'createAccountPath',
    [ACTIONS.DEPOSIT]: 'depositCashPath',
    [ACTIONS.PERPS_MARKETS]: 'perpsMarketsPath',
  };

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
      const urlObj = new URL(cleanedUrl);

      // Extract protocol
      const protocol = this.extractProtocol(urlObj);

      // Extract action and params from original URL
      const action = this.extractAction(urlObj, protocol);
      const params = this.extractParams(urlObj, action);

      // Convert metamask:// to https:// for normalizedUrl
      const processedUrl = this.convertToHttpsIfNeeded(cleanedUrl, urlObj);
      const processedUrlObj = new URL(processedUrl);

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
        requiresAuth: AUTH_REQUIRED_ACTIONS.includes(action),
      };
    } catch (_error) {
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
   * @param link - The CoreUniversalLinkv (object) to convert
   * @returns URL string with metamask:// protocol
   */
  static toMetaMaskProtocol(link: CoreUniversalLink): string {
    if (link.protocol === 'metamask') {
      return link.originalUrl;
    }

    const { action, params } = link;
    const queryParams = this.buildQueryString(params);

    return `${METAMASK}://${action}${queryParams ? '?' + queryParams : ''}`;
  }

  /**
   * Check if a URL is a supported deep link
   * @param url - The URL (string) to check
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
      return `${METAMASK}://${action}${queryString ? '?' + queryString : ''}`;
    }

    const host = AppConstants.MM_IO_UNIVERSAL_LINK_HOST;
    return `${HTTPS}://${host}/${action}${queryString ? '?' + queryString : ''}`;
  }

  /**
   * Private helper methods
   */

  private static cleanUrl(url: string): string {
    // Remove dapp protocol prefix handling
    return url
      .replace(`${DAPP}/${HTTPS}://`, `${DAPP}/`)
      .replace(`${DAPP}/${HTTP}://`, `${DAPP}/`);
  }

  private static extractProtocol(urlObj: URL): CoreUniversalLink['protocol'] {
    const protocol = urlObj.protocol.replace(':', '');
    const isSupportedProtocol = SUPPORTED_PROTOCOLS.includes(protocol);
    return isSupportedProtocol
      ? (protocol as CoreUniversalLink['protocol'])
      : 'https';
  }

  private static convertToHttpsIfNeeded(url: string, urlObj: URL): string {
    if (urlObj.protocol === `${METAMASK}:`) {
      return url.replace(
        `${METAMASK}://`,
        `${HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/`,
      );
    }
    return url;
  }

  private static extractAction(urlObj: URL, protocol: string): string {
    // For metamask:// URLs, the action is the hostname
    if (protocol === 'metamask' && urlObj.hostname) {
      return urlObj.hostname;
    }

    // For https:// URLs, extract from pathname
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    return pathSegments[0] || DEFAULT_ACTION;
  }

  private static extractParams(urlObj: URL, action: string): CoreLinkParams {
    // Parse query parameters
    const queryParams = this.parseQueryString(urlObj);

    // Extract action-specific path
    const actionPath = this.extractActionPath(urlObj, action);

    // Merge with action-specific paths
    const params: CoreLinkParams = {
      ...queryParams,
      ...this.getActionSpecificParams(action, actionPath),
    };

    params.hr = String(params.hr) === '1';

    // Clean up message parameter
    if (params.message) {
      params.message = params.message.replace(/ /g, '+');
    }

    return params;
  }

  private static removeFalsyParams(
    searchParams: URLSearchParams,
  ): Partial<CoreLinkParams> {
    const params: Partial<CoreLinkParams> = {};
    searchParams.forEach((value, key) => {
      // URLSearchParams values are always strings, so only check string falsy values
      switch (value) {
        case '':
        case 'null':
        case 'undefined':
          // Don't add to params object (effectively filtering it out)
          break;
        default:
          params[key] = value;
          break;
      }
    });
    return params;
  }

  private static parseQueryString(urlObj: URL): Partial<CoreLinkParams> {
    const { searchParams } = urlObj;
    const searchParamKeys = [...searchParams.keys()];
    if (searchParamKeys.length === 0) {
      return {};
    }

    try {
      // Filter out null/undefined values and convert to proper types
      const cleaned = this.removeFalsyParams(searchParams);

      return cleaned;
    } catch {
      return {};
    }
  }

  private static extractActionPath(urlObj: URL, action: string): string {
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    // Remove the action from path segments
    const actionIndex = pathSegments.indexOf(action);
    if (actionIndex >= 0) {
      pathSegments.splice(0, actionIndex + 1);
    }

    // Reconstruct path without action
    const path = pathSegments.join('/');
    const query = urlObj.search;

    let output = action;
    if (path) {
      output += `/${path}`;
    }
    if (query) {
      output += query;
    }
    return output;
  }

  private static getActionSpecificParams(
    action: string,
    actionPath: string,
  ): Partial<CoreLinkParams> {
    const params: Partial<CoreLinkParams> = {};

    // note that ramp and perps actions are special cases because they have
    // multiple actions associated with them
    if (RAMP_ACTIONS.includes(action)) {
      params.rampPath = actionPath;
    } else if (PERPS_ACTIONS.includes(action)) {
      params.perpsPath = actionPath;
    } else {
      const pathKey = this.ACTION_PATH_MAP[action];
      if (pathKey) {
        params[pathKey] = actionPath;
      }
    }

    return params;
  }

  private static buildQueryString(params: Partial<CoreLinkParams>): string {
    const filteredParams: Record<string, string> = {};

    const pathKeys = [...Object.values(this.ACTION_PATH_MAP)];
    // Filter out action-specific paths and empty values

    Object.entries(params).forEach(([key, value]) => {
      if (
        // exclude action-specific paths and empty values
        !pathKeys.includes(key) &&
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        if (key === 'hr' && typeof value === 'boolean') {
          // Only include hr parameter if it's true
          if (value) {
            filteredParams[key] = '1';
          }
          // If false, omit from URL entirely (default is false anyway)
        } else {
          filteredParams[key] = String(value);
        }
      }
    });

    // Use native URLSearchParams instead of qs
    if (Object.keys(filteredParams).length === 0) {
      return '';
    }

    const searchParams = new URLSearchParams(filteredParams);
    return searchParams.toString();
  }

  private static isSupportedAction(action: string): boolean {
    const allActions = Object.values(ACTIONS) as string[];
    return allActions.includes(action);
  }
}
