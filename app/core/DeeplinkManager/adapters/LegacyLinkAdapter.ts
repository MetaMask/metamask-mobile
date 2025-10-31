/**
 * LegacyLinkAdapter - Bridge between CoreUniversalLink and legacy deeplink format
 *
 * Provides compatibility layer for gradual migration from legacy deeplink handling
 * to the new unified CoreUniversalLink format
 */
import UrlParser from 'url-parse';
import qs from 'qs';
import { PROTOCOLS, ACTIONS } from '../../../constants/deeplinks';
import { CoreUniversalLink, CoreLinkParams } from '../types/CoreUniversalLink';
import { DeeplinkUrlParams } from '../ParseManager/extractURLParams';
import { CoreLinkNormalizer } from '../CoreLinkNormalizer';
import AppConstants from '../../AppConstants';

/**
 * Parameters for action-specific handlers
 */
export interface ActionParams {
  swapPath?: string;
  perpsPath?: string;
  rampPath?: string;
  dappPath?: string;
  sendPath?: string;
  homePath?: string;
  onboardingPath?: string;
  createAccountPath?: string;
  depositCashPath?: string;
  rewardsPath?: string;
  perpsMarketsPath?: string;
  perpsAssetPath?: string;
  buyPath?: string;
  sellPath?: string;
  buyCryptoPath?: string;
  sellCryptoPath?: string;
}

export class LegacyLinkAdapter {
  /**
   * Convert CoreUniversalLink to legacy format (DeeplinkUrlParams)
   * @param link - The CoreUniversalLink to convert
   * @returns Legacy format with urlObj and params
   */
  static toLegacyFormat(link: CoreUniversalLink): {
    urlObj: UrlParser<string>;
    params: DeeplinkUrlParams;
  } {
    // Build URL string from CoreUniversalLink
    const urlString = this.buildLegacyUrl(link);
    const urlObj = new UrlParser(urlString);

    // Map CoreLinkParams to DeeplinkUrlParams
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
      hr: link.params.hr === true,
    };

    return { urlObj, params };
  }

  /**
   * Convert legacy format to CoreUniversalLink
   * @param url - The original URL string
   * @param params - Legacy DeeplinkUrlParams
   * @param source - The source of the deeplink
   * @returns CoreUniversalLink object
   */
  static fromLegacyFormat(
    url: string,
    params: DeeplinkUrlParams,
    source: string,
  ): CoreUniversalLink {
    // Map legacy params to CoreLinkParams
    const coreParams: CoreLinkParams = {};

    // Map all parameters
    if (params.uri) coreParams.uri = params.uri;
    if (params.redirect) coreParams.redirect = params.redirect;
    if (params.channelId) coreParams.channelId = params.channelId;
    if (params.comm) coreParams.comm = params.comm;
    if (params.pubkey) coreParams.pubkey = params.pubkey;
    if (params.scheme) coreParams.scheme = params.scheme;
    if (params.v) coreParams.v = params.v;
    if (params.rpc) coreParams.rpc = params.rpc;
    if (params.sdkVersion) coreParams.sdkVersion = params.sdkVersion;
    if (params.message) coreParams.message = params.message;
    if (params.originatorInfo)
      coreParams.originatorInfo = params.originatorInfo;
    if (params.request) coreParams.request = params.request;
    if (params.attributionId) coreParams.attributionId = params.attributionId;
    if (params.utm_source) coreParams.utm_source = params.utm_source;
    if (params.utm_medium) coreParams.utm_medium = params.utm_medium;
    if (params.utm_campaign) coreParams.utm_campaign = params.utm_campaign;
    if (params.utm_term) coreParams.utm_term = params.utm_term;
    if (params.utm_content) coreParams.utm_content = params.utm_content;
    if (params.account) coreParams.account = params.account;

    // Convert hr from boolean to boolean (it's already boolean in DeeplinkUrlParams)
    coreParams.hr = params.hr;

    // Use normalizer to create a proper CoreUniversalLink, then override params
    const normalizedLink = CoreLinkNormalizer.normalize(url, source);

    // Merge the mapped params with normalized params
    return {
      ...normalizedLink,
      params: {
        ...normalizedLink.params,
        ...coreParams,
      },
    };
  }

  /**
   * Check if a link should use the new routing system
   * @param link - The CoreUniversalLink to check
   * @returns Whether to use the new system (default: false for backward compatibility)
   */
  static shouldUseNewSystem(_link: CoreUniversalLink): boolean {
    // Initially returns false to maintain legacy behavior
    // Can be modified to gradually enable new system per action type
    // Example future implementation:
    // if (featureFlag.isEnabled('new-routing-system')) {
    //   const enabledActions = ['home', 'swap'];
    //   return enabledActions.includes(link.action);
    // }

    // For now, always use legacy system
    return false;
  }

  /**
   * Wrap a legacy handler to work with CoreUniversalLink
   * @param handler - The legacy handler function
   * @param paramExtractor - Function to extract params for the handler
   * @returns Wrapped handler that accepts CoreUniversalLink
   */
  static wrapHandler<T extends Record<string, unknown>>(
    handler: (params: T) => void | Promise<void>,
    paramExtractor: (link: CoreUniversalLink) => T,
  ): (link: CoreUniversalLink) => void | Promise<void> {
    return async (link: CoreUniversalLink) => {
      const params = paramExtractor(link);
      return handler(params);
    };
  }

  /**
   * Extract action-specific parameters for handlers
   * @param link - The CoreUniversalLink
   * @returns Object with action-specific path parameters
   */
  static extractActionParams(link: CoreUniversalLink): ActionParams {
    const params: ActionParams = {};

    // Helper to ensure string type for paths
    const getStringParam = (
      value: string | boolean | undefined,
    ): string | undefined => {
      if (typeof value === 'string') return value;
      return undefined;
    };

    // Extract path based on action
    switch (link.action) {
      case ACTIONS.SWAP:
        params.swapPath = getStringParam(link.params.swapPath);
        break;
      case ACTIONS.PERPS:
      case ACTIONS.PERPS_MARKETS:
      case ACTIONS.PERPS_ASSET:
        params.perpsPath = getStringParam(link.params.perpsPath);
        params.perpsMarketsPath = getStringParam(link.params.perpsMarketsPath);
        params.perpsAssetPath = getStringParam(link.params.perpsAssetPath);
        break;
      case ACTIONS.BUY:
      case ACTIONS.SELL:
      case ACTIONS.BUY_CRYPTO:
      case ACTIONS.SELL_CRYPTO:
        params.rampPath = getStringParam(link.params.rampPath);
        params.buyPath = getStringParam(link.params.buyPath);
        params.sellPath = getStringParam(link.params.sellPath);
        params.buyCryptoPath = getStringParam(link.params.buyCryptoPath);
        params.sellCryptoPath = getStringParam(link.params.sellCryptoPath);
        break;
      case ACTIONS.DAPP:
        params.dappPath = getStringParam(link.params.dappPath);
        break;
      case ACTIONS.SEND:
        params.sendPath = getStringParam(link.params.sendPath);
        break;
      case ACTIONS.HOME:
        params.homePath = getStringParam(link.params.homePath);
        break;
      case ACTIONS.ONBOARDING:
        params.onboardingPath = getStringParam(link.params.onboardingPath);
        break;
      case ACTIONS.CREATE_ACCOUNT:
        params.createAccountPath = getStringParam(
          link.params.createAccountPath,
        );
        break;
      case ACTIONS.DEPOSIT:
        params.depositCashPath = getStringParam(link.params.depositCashPath);
        break;
      case ACTIONS.REWARDS:
        params.rewardsPath = getStringParam(link.params.rewardsPath);
        break;
      default:
        // No specific path for this action
        break;
    }

    return params;
  }

  /**
   * Build legacy URL format from CoreUniversalLink
   * @param link - The CoreUniversalLink
   * @returns URL string in legacy format
   */
  static buildLegacyUrl(link: CoreUniversalLink): string {
    let baseUrl: string;

    if (link.protocol === 'metamask') {
      baseUrl = `${PROTOCOLS.METAMASK}://${link.action}`;
    } else {
      const host = link.host || AppConstants.MM_IO_UNIVERSAL_LINK_HOST;
      baseUrl = `${PROTOCOLS.HTTPS}://${host}/${link.action}`;
    }

    // Build query string from params, excluding action-specific paths
    const queryParams: Record<string, string> = {};
    const pathKeys = [
      'swapPath',
      'perpsPath',
      'rampPath',
      'dappPath',
      'sendPath',
      'homePath',
      'onboardingPath',
      'createAccountPath',
      'depositCashPath',
      'rewardsPath',
      'perpsMarketsPath',
      'perpsAssetPath',
      'buyPath',
      'sellPath',
      'buyCryptoPath',
      'sellCryptoPath',
    ];

    Object.entries(link.params).forEach(([key, value]) => {
      if (
        !pathKeys.includes(key) &&
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        if (key === 'hr' && typeof value === 'boolean') {
          queryParams[key] = value ? '1' : '0';
        } else {
          queryParams[key] = String(value);
        }
      }
    });

    const queryString =
      Object.keys(queryParams).length > 0
        ? `?${qs.stringify(queryParams)}`
        : '';

    return `${baseUrl}${queryString}`;
  }

  /**
   * Extract path from URL based on action
   * Helper method for reconstructing action-specific paths
   * @param url - The URL to extract path from
   * @param action - The action name
   * @returns The extracted path with query parameters
   */
  static extractPathFromUrl(url: string, action: string): string {
    const urlObj = new UrlParser(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    // Find action index and get remaining path
    const actionIndex = pathSegments.indexOf(action);
    if (actionIndex >= 0) {
      pathSegments.splice(0, actionIndex + 1);
    }

    const remainingPath = pathSegments.join('/');
    const queryString = urlObj.query;

    let result = action;
    if (remainingPath) {
      result += `/${remainingPath}`;
    }
    if (queryString) {
      result += queryString;
    }

    return result;
  }
}
