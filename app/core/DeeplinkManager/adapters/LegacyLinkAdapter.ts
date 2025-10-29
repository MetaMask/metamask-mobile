/**
 * LegacyLinkAdapter - Bridge between new CoreUniversalLink and legacy deep link handling
 *
 * This adapter provides backward compatibility, allowing the new system to work
 * with existing deep link handlers without breaking changes.
 */

import { URL as URLPolyfill } from 'react-native-url-polyfill';
import { ACTIONS } from '../../../constants/deeplinks';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { DeeplinkUrlParams } from '../ParseManager/extractURLParams';
import { CoreLinkNormalizer } from '../CoreLinkNormalizer';

/**
 * Legacy handler function type
 */
export type LegacyHandler = (
  instance: unknown,
  handled: () => void,
  params?: unknown,
) => void;

/**
 * Handler context for legacy functions
 */
export interface HandlerContext {
  instance: unknown;
  handled: () => void;
  urlObj?: URLPolyfill;
  browserCallBack?: (url: string) => void;
  wcURL?: string;
  origin?: string;
  params?: DeeplinkUrlParams;
  url?: string;
}

export class LegacyLinkAdapter {
  /**
   * Convert CoreUniversalLink to legacy format expected by existing handlers
   * @param link - The CoreUniversalLink to convert
   * @returns Legacy format with URL object and params
   */
  static toLegacyFormat(link: CoreUniversalLink): {
    urlObj: URLPolyfill;
    params: DeeplinkUrlParams;
  } {
    // Use the normalized URL for URL object
    const urlObj = new URLPolyfill(link.normalizedUrl);

    // Convert CoreLinkParams to DeeplinkUrlParams
    const params: DeeplinkUrlParams = {
      uri: link.params.uri || '',
      redirect: link.params.redirect || '',
      channelId: link.params.channelId || '',
      comm: link.params.comm || '',
      pubkey: link.params.pubkey || '',
      scheme: link.params.scheme,
      v: link.params.v,
      rpc: link.params.rpc,
      sdkVersion: link.params.sdkVersion,
      message: link.params.message,
      originatorInfo: link.params.originatorInfo,
      request: link.params.request,
      attributionId: link.params.attributionId,
      utm_source: link.params.utm_source,
      utm_medium: link.params.utm_medium,
      utm_campaign: link.params.utm_campaign,
      utm_term: link.params.utm_term,
      utm_content: link.params.utm_content,
      account: link.params.account,
      hr: link.params.hr || false,
    };

    // Include any additional parameters from CoreLinkParams
    Object.entries(link.params).forEach(([key, value]) => {
      if (!(key in params) && value !== undefined) {
        (params as unknown as Record<string, unknown>)[key] = value;
      }
    });

    return { urlObj, params };
  }

  /**
   * Convert legacy deep link format to CoreUniversalLink
   * @param url - The original URL string
   * @param source - The source of the deep link
   * @param params - Optional legacy params to merge
   * @returns CoreUniversalLink representation
   */
  static fromLegacyFormat(
    url: string,
    source: string,
    params?: Partial<DeeplinkUrlParams>,
  ): CoreUniversalLink {
    // Use CoreLinkNormalizer to handle the base conversion
    const normalizedLink = CoreLinkNormalizer.normalize(url, source);

    // If additional legacy params provided, merge them
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          normalizedLink.params[key] = value;
        }
      });
    }

    return normalizedLink;
  }

  /**
   * Check if a deep link should use the new system
   * @param action - The action to check
   * @returns boolean indicating if new system should be used
   */
  static shouldUseNewSystem(action: string): boolean {
    // Initially, we'll use the new system for non-critical actions
    // This can be expanded as we gain confidence
    const newSystemActions = [
      ACTIONS.HOME,
      ACTIONS.SWAP,
      // Add more actions as we migrate
    ];
    
    return newSystemActions.includes(action as ACTIONS);
  }

  /**
   * Wrap a legacy handler to work with CoreUniversalLink
   * @param handler - The legacy handler function
   * @returns Wrapped handler that accepts CoreUniversalLink
   */
  static wrapHandler(
    handler: (context: HandlerContext) => void,
  ): (link: CoreUniversalLink, context: Partial<HandlerContext>) => void {
    return (link: CoreUniversalLink, context: Partial<HandlerContext>) => {
      const { urlObj, params } = this.toLegacyFormat(link);

      handler({
        ...context,
        urlObj,
        params,
        origin: link.source,
        url: link.originalUrl,
      } as HandlerContext);
    };
  }

  /**
   * Extract action-specific parameters for legacy handlers
   * @param link - The CoreUniversalLink
   * @returns Action-specific path or parameters
   */
  static extractActionParams(link: CoreUniversalLink): {
    path: string;
    params: Record<string, unknown>;
  } {
    const { action, params } = link;

    // Extract the specific path based on action
    let path = '';

    if (params.rampPath) {
      path = params.rampPath;
    } else if (params.swapPath) {
      path = params.swapPath;
    } else if (params.dappPath) {
      path = params.dappPath;
    } else if (params.sendPath) {
      path = params.sendPath;
    } else if (params.perpsPath) {
      path = params.perpsPath;
    } else if (params.rewardsPath) {
      path = params.rewardsPath;
    } else if (params.homePath) {
      path = params.homePath;
    } else if (params.onboardingPath) {
      path = params.onboardingPath;
    } else if (params.createAccountPath) {
      path = params.createAccountPath;
    } else if (params.depositCashPath) {
      path = params.depositCashPath;
    }

    // Remove the action from the path if it's at the beginning
    if (path.startsWith(`${action}?`)) {
      // If path is just "action?params", remove the action part
      path = path.substring(action.length);
    } else if (path.startsWith(`${action}/`) || path === action) {
      // If path is "action/something" or just "action", remove it
      path = path.substring(action.length);
      if (path.startsWith('/')) {
        path = path.substring(1);
      }
    }

    // Filter out path-related params for the params object
    const filteredParams: Record<string, unknown> = {};
    const pathKeys = [
      'rampPath', 'swapPath', 'dappPath', 'sendPath',
      'perpsPath', 'rewardsPath', 'homePath', 'onboardingPath',
      'createAccountPath', 'depositCashPath',
    ];

    Object.entries(params).forEach(([key, value]) => {
      if (!pathKeys.includes(key) && value !== undefined) {
        filteredParams[key] = value;
      }
    });

    return {
      path: path || '',
      params: filteredParams,
    };
  }

  /**
   * Convert a CoreUniversalLink to a URL string for specific protocol
   * @param link - The CoreUniversalLink
   * @param targetProtocol - The target protocol to convert to
   * @returns URL string in the target protocol format
   */
  static toProtocolUrl(
    link: CoreUniversalLink,
    targetProtocol: 'metamask' | 'https' | 'ethereum' | 'dapp',
  ): string {
    const { action } = link;

    switch (targetProtocol) {
      case 'metamask':
        return CoreLinkNormalizer.toMetaMaskProtocol(link);

      case 'https':
        return link.normalizedUrl;

      case 'ethereum':
        // Handle ethereum: protocol URLs (for send/approve)
        if (action === ACTIONS.SEND || action === ACTIONS.APPROVE) {
          const { path, params } = this.extractActionParams(link);
          const address = path || params.to || '';
          const queryString = new URLSearchParams(params as Record<string, string>).toString();
          return `ethereum:${address}${queryString ? '?' + queryString : ''}`;
        }
        return link.originalUrl;

      case 'dapp':
        // Handle dapp: protocol URLs
        if (action === ACTIONS.DAPP) {
          const { path } = this.extractActionParams(link);
          return `dapp://${path}`;
        }
        return link.originalUrl;

      default:
        return link.originalUrl;
    }
  }

  /**
   * Check if a CoreUniversalLink matches legacy URL structure
   * @param link - The CoreUniversalLink to check
   * @param legacyUrl - The legacy URL to compare against
   * @returns boolean indicating if they represent the same deep link
   */
  static isEquivalentUrl(link: CoreUniversalLink, legacyUrl: string): boolean {
    try {
      // Normalize the legacy URL
      const normalizedLegacy = CoreLinkNormalizer.normalize(legacyUrl, 'comparison');

      // Compare action and key parameters
      if (link.action !== normalizedLegacy.action) {
        return false;
      }

      // Compare essential parameters
      const essentialParams = ['uri', 'to', 'from', 'amount', 'channelId', 'account'];

      for (const param of essentialParams) {
        if (link.params[param] !== normalizedLegacy.params[param]) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a handler context from CoreUniversalLink for legacy handlers
   * @param link - The CoreUniversalLink
   * @param additionalContext - Additional context properties
   * @returns Complete handler context for legacy handlers
   */
  static createHandlerContext(
    link: CoreUniversalLink,
    additionalContext: Partial<HandlerContext> = {},
  ): HandlerContext {
    const { urlObj, params } = this.toLegacyFormat(link);

    return {
      instance: additionalContext.instance,
      handled: additionalContext.handled || (() => {
        // Default empty handler
      }),
      urlObj,
      browserCallBack: additionalContext.browserCallBack,
      wcURL: link.params.uri || link.originalUrl,
      origin: link.source,
      params,
      url: link.originalUrl,
      ...additionalContext,
    };
  }
}
