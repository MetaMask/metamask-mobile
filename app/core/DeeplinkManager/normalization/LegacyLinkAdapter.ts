/**
 * LegacyLinkAdapter - Bridge between the new CoreUniversalLink
 * and the legacy link handler input params (urlObj, params, instance, handled, browserCallback)
 *
 * This adapter provides bidirectional conversion between the new CoreUniversalLink
 * format and the legacy DeeplinkUrlParams format, enabling gradual migration
 * without breaking existing functionality.
 */

import UrlParser from 'url-parse';
import qs from 'qs';
import { ACTIONS } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import { CoreUniversalLink, CoreLinkParams } from '../types/CoreUniversalLink';
import { DeeplinkUrlParams } from '../utils/extractURLParams';
import { CoreLinkNormalizer } from './CoreLinkNormalizer';

/**
 * Handler context type used by legacy handlers
 */
interface LegacyHandlerContext {
  instance: unknown;
  handled(): void;
  urlObj: UrlParser<Record<string, unknown>>;
  params: DeeplinkUrlParams;
  browserCallback?: (url: string) => void;
}

export class LegacyLinkAdapter {
  /**
   * Actions that should use the new routing system
   * Expand this list gradually as confidence grows
   */
  private static readonly NEW_SYSTEM_ACTIONS = [
    // ACTIONS.HOME, // <------ enable here!
    // ACTIONS.SWAP, // <------ enable here!
  ];

  /**
   * Convert a CoreUniversalLink to legacy format
   * @param link - The CoreUniversalLink to convert
   * @returns Object containing URL object and DeeplinkUrlParams
   */
  static toLegacyFormat(link: CoreUniversalLink): {
    urlObj: UrlParser<Record<string, unknown>>;
    params: DeeplinkUrlParams;
  } {
    // Reconstruct URL for legacy URL parser
    // start from beginning (normalized) then
    // work our way back to original URL
    let reconstructedUrl = link.normalizedUrl;

    // if it was a metamask:// link
    // then restore that part
    if (link.protocol === 'metamask') {
      reconstructedUrl = link.originalUrl;
    }

    // this horrible type annotations are due to a mismatch between the standard URL type
    // and the url-parse library, cause `dapp://https://example.com` is not valid web URL
    const urlObj = new UrlParser(reconstructedUrl) as unknown as UrlParser<
      Record<string, unknown>
    >;

    // Convert CoreLinkParams to DeeplinkUrlParams
    // Start with required defaults
    const params: DeeplinkUrlParams = {
      uri: link.params.uri ?? '',
      redirect: link.params.redirect ?? '',
      channelId: link.params.channelId ?? '',
      comm: link.params.comm ?? '',
      pubkey: link.params.pubkey ?? '',
      hr: link.params.hr ?? false,
    } as DeeplinkUrlParams;

    // Add all other defined params
    Object.entries(link.params).forEach(([key, value]) => {
      if (value !== undefined && !(key in params)) {
        (params as unknown as Record<string, unknown>)[key] = value;
      }
    });
    return { urlObj, params };
  }

  /**
   * Convert legacy format to CoreUniversalLink
   * @param url - The URL string
   * @param source - The source of the deep link
   * @param additionalParams - Optional additional DeeplinkUrlParams
   * @returns CoreUniversalLink
   */
  static fromLegacyFormat(
    url: string,
    source: string,
    additionalParams?: Partial<DeeplinkUrlParams>,
  ): CoreUniversalLink {
    // Use CoreLinkNormalizer for base conversion
    const coreLink = CoreLinkNormalizer.normalize(url, source);

    // Merge additional params if provided
    if (additionalParams) {
      const mergedParams: CoreLinkParams = {
        ...coreLink.params,
      };

      // Map DeeplinkUrlParams to CoreLinkParams
      // Handle empty strings and defined values (but not null/undefined)
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          (mergedParams as unknown as Record<string, unknown>)[key] = value;
        }
      });

      return {
        ...coreLink,
        params: mergedParams,
      };
    }

    return coreLink;
  }

  /**
   * Check if an action should use the new routing system
   * @param action - The action to check
   * @returns true if the action should use the new system
   */
  static shouldUseNewSystem(action: string): boolean {
    // this `never` value will be changed when you enable some actions
    const shouldUseNewSystem = this.NEW_SYSTEM_ACTIONS.includes(
      action as never,
    );
    return shouldUseNewSystem;
  }

  /**
   * Wrap a legacy handler to accept CoreUniversalLink
   * @param handler - The legacy handler function
   * @returns Wrapped handler that accepts CoreUniversalLink
   */
  static wrapHandler(
    // TO legacy handler
    handler: (context: LegacyHandlerContext) => void | Promise<void>,
  ): (
    link: CoreUniversalLink,
    additionalContext: {
      instance: unknown;
      handled: () => void;
      browserCallback?: (url: string) => void;
    },
  ) => void | Promise<void> {
    return (link, additionalContext) => {
      const { urlObj, params } = this.toLegacyFormat(link);
      const context: LegacyHandlerContext = {
        urlObj,
        params,
        ...additionalContext,
      };
      return handler(context);
    };
  }

  /**
   * Extract action-specific parameters and paths
   * @param link - The CoreUniversalLink
   * @returns Object containing action path and filtered parameters
   */
  static extractActionParams(link: CoreUniversalLink): {
    actionPath: string;
    actionParams: Record<string, string>;
  } {
    // todo: consider having all actions use the same "path" key
    const actionPaths: Record<string, keyof CoreLinkParams> = {
      [ACTIONS.SWAP]: 'swapPath',
      [ACTIONS.RAMP]: 'rampPath',
      [ACTIONS.PERPS]: 'perpsPath',
      [ACTIONS.REWARDS]: 'rewardsPath',
      [ACTIONS.SEND]: 'sendPath',
      [ACTIONS.DAPP]: 'dappPath',
      [ACTIONS.HOME]: 'homePath',
      [ACTIONS.ONBOARDING]: 'onboardingPath',
      [ACTIONS.CREATE_ACCOUNT]: 'createAccountPath',
      [ACTIONS.DEPOSIT]: 'depositCashPath',
      [ACTIONS.PERPS_MARKETS]: 'perpsMarketsPath',
    };

    const pathKey = actionPaths[link.action];
    let actionPath = '';

    if (pathKey && link.params[pathKey]) {
      const path = link.params[pathKey] as string;
      // Remove the action prefix if it's repeated in the path
      // todo: enforce a better convention for link format
      // so we do not have to do this
      actionPath = path.startsWith(link.action)
        ? path.substring(link.action.length).replace(/^\//, '')
        : path;
    }

    // Parse query parameters from the path if any
    const actionParams: Record<string, string> = {};
    if (actionPath.includes('?')) {
      const [basePath, queryString] = actionPath.split('?');
      actionPath = basePath;

      const parsed = qs.parse(queryString);
      Object.keys(parsed).forEach((key) => {
        const value = parsed[key];
        if (typeof value === 'string') {
          actionParams[key] = value;
        }
      });
    }

    return { actionPath, actionParams };
  }

  /**
   * Convert CoreUniversalLink to a specific protocol URL
   * @param link - The CoreUniversalLink
   * @param targetProtocol - The target protocol
   * @returns The converted URL string
   */
  static toProtocolUrl(
    link: CoreUniversalLink,
    targetProtocol: 'metamask' | 'https' | 'ethereum' | 'dapp',
  ): string {
    // Handle ethereum protocol specially
    if (targetProtocol === 'ethereum') {
      if (link.action === ACTIONS.SEND || link.action === ACTIONS.APPROVE) {
        const to = link.params.to || '';
        const value = link.params.value || '';
        const data = link.params.data || '';

        let ethUrl = `ethereum:${to}`;
        const params: string[] = [];
        if (value) params.push(`value=${value}`);
        if (data) params.push(`data=${data}`);
        if (params.length > 0) {
          ethUrl += '?' + params.join('&');
        }
        return ethUrl;
      }
      throw new Error(
        `Unsupported action for ethereum protocol: ${link.action}`,
      );
    }

    // Handle dapp protocol
    if (targetProtocol === 'dapp') {
      const dappPath = link.params.dappPath || '';
      if (!dappPath) {
        throw new Error('dapp protocol requires dappPath parameter to be set');
      }
      return `dapp://${dappPath}`;
    }

    // Handle metamask and https protocols
    const baseUrl =
      targetProtocol === 'metamask'
        ? `metamask://${link.action}`
        : `https://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${link.action}`;

    // Add query parameters
    const queryParams = { ...link.params };
    // Remove action-specific paths from query params
    delete queryParams.swapPath;
    delete queryParams.rampPath;
    delete queryParams.perpsPath;
    delete queryParams.rewardsPath;
    delete queryParams.sendPath;
    delete queryParams.dappPath;
    delete queryParams.homePath;
    delete queryParams.onboardingPath;
    delete queryParams.createAccountPath;
    delete queryParams.depositCashPath;
    delete queryParams.perpsMarketsPath;

    const queryString = qs.stringify(queryParams);
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
}
