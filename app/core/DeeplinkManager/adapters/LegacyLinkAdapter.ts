/**
 * LegacyLinkAdapter - Bridge between new CoreUniversalLink and legacy DeeplinkUrlParams
 *
 * Provides compatibility layer for gradual migration from legacy deep link handling
 * to the new unified routing system.
 */

import { CoreUniversalLink } from '../types/CoreUniversalLink';
import { CoreLinkNormalizer } from '../CoreLinkNormalizer';
import { DeeplinkUrlParams } from '../ParseManager/extractURLParams';
import { ACTIONS } from '../../../constants/deeplinks';

/**
 * Adapter to bridge new and legacy deep link systems
 */
export class LegacyLinkAdapter {
  /**
   * Convert CoreUniversalLink to legacy DeeplinkUrlParams format
   * Maintains backward compatibility with existing handlers
   *
   * @param link - CoreUniversalLink to convert
   * @returns DeeplinkUrlParams in legacy format
   */
  static toLegacyFormat(link: CoreUniversalLink): DeeplinkUrlParams {
    const params: DeeplinkUrlParams = {
      // Core parameters
      uri: link.originalUrl,
      redirect: '',

      // SDK parameters
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

      // Attribution parameters
      attributionId: link.params.attributionId,
      utm_source: link.params.utm_source,
      utm_medium: link.params.utm_medium,
      utm_campaign: link.params.utm_campaign,
      utm_term: link.params.utm_term,
      utm_content: link.params.utm_content,

      // Account and UI parameters
      account: link.params.account,
      hr: link.params.hr || false,
    };

    // Set redirect based on action and params
    if (link.action === ACTIONS.CONNECT && link.params.redirect) {
      params.redirect = link.params.redirect;
    }

    // Convert message parameter back to legacy format if needed
    if (params.message) {
      // Legacy format uses + for spaces
      params.message = params.message.replace(/%20/g, '+');
    }

    return params;
  }

  /**
   * Convert legacy params back to CoreUniversalLink format
   *
   * @param params - Legacy DeeplinkUrlParams
   * @param url - Original URL string
   * @param source - Source of the deep link
   * @returns CoreUniversalLink
   */
  static fromLegacyFormat(
    params: DeeplinkUrlParams,
    url: string,
    source = 'legacy',
  ): CoreUniversalLink {
    // Use normalizer to get base structure
    const normalized = CoreLinkNormalizer.normalize(url, source);

    // Merge legacy params, filtering out empty strings
    const cleanedParams = this.convertLegacyParams(params);

    normalized.params = {
      ...normalized.params,
      ...cleanedParams,
    };

    return normalized;
  }

  /**
   * Helper to convert and clean legacy param types
   *
   * @param params - Legacy parameters to convert
   * @returns Cleaned parameters object
   */
  private static convertLegacyParams(
    params: DeeplinkUrlParams,
  ): Record<string, string | boolean | undefined> {
    const converted: Record<string, string | boolean | undefined> = {};

    Object.entries(params).forEach(([key, value]) => {
      // Skip empty strings and null values from legacy format
      if (
        value !== '' &&
        value !== undefined &&
        value !== null &&
        key !== 'uri' // Don't include uri in params
      ) {
        // Handle specific conversions
        if (key === 'hr') {
          converted[key] = Boolean(value);
        } else if (key === 'message' && typeof value === 'string') {
          // Convert + back to spaces for internal use
          converted[key] = value.replace(/\+/g, ' ');
        } else {
          converted[key] = value as string | undefined;
        }
      }
    });

    return converted;
  }

  /**
   * Check if a link should use the new routing system
   * Used for gradual rollout via feature flags
   *
   * @param link - CoreUniversalLink to check
   * @returns true if should use new system
   */
  static shouldUseNewSystem(link: CoreUniversalLink): boolean {
    // Start with a whitelist approach for gradual rollout
    const whitelistedActions: string[] = [
      ACTIONS.HOME,
      ACTIONS.SWAP,
      ACTIONS.SEND,
      ACTIONS.DAPP,
      ACTIONS.RAMP,
    ];

    // Check if action is whitelisted
    if (!whitelistedActions.includes(link.action)) {
      return false;
    }

    // Additional checks can be added here:
    // - Feature flag checks
    // - A/B testing logic
    // - Protocol-specific decisions

    return true;
  }

  /**
   * Wrap a legacy handler to work with CoreUniversalLink
   * Allows existing handlers to work with new link format
   *
   * @param legacyHandler - Original handler that expects DeeplinkUrlParams
   * @returns Wrapped handler that accepts CoreUniversalLink
   */
  static wrapHandler(
    legacyHandler: (params: DeeplinkUrlParams) => void | Promise<void>,
  ): (link: CoreUniversalLink) => void | Promise<void> {
    return async (link: CoreUniversalLink) => {
      try {
        const legacyParams = this.toLegacyFormat(link);
        return await legacyHandler(legacyParams);
      } catch (error) {
        // Log error but don't throw to maintain stability
        console.error('Error in wrapped legacy handler:', error);
        throw error;
      }
    };
  }

  /**
   * Extract action-specific parameters for legacy handlers
   * Provides convenient access to parameters based on action type
   *
   * @param link - CoreUniversalLink containing parameters
   * @returns Object with action-specific parameters
   */
  static extractActionParams(
    link: CoreUniversalLink,
  ): Record<string, string | boolean | undefined> {
    const { action, params } = link;

    switch (action) {
      case ACTIONS.SWAP:
        return {
          from: params.from,
          to: params.to,
          amount: params.amount,
          slippage: params.slippage,
          sourceToken: params.sourceToken,
          destinationToken: params.destinationToken,
        };

      case ACTIONS.SEND:
        return {
          to: params.to,
          value: params.value,
          data: params.data,
          gasLimit: params.gasLimit,
          gasPrice: params.gasPrice,
          from: params.from,
        };

      case ACTIONS.DAPP: {
        // Extract URL from dappPath
        const dappUrl = params.dappPath?.replace(/^dapp\//, '').split('?')[0];
        return {
          url: dappUrl,
          chain: params.chain,
          chainId: params.chainId,
        };
      }

      case ACTIONS.BUY:
      case ACTIONS.BUY_CRYPTO:
      case ACTIONS.SELL:
      case ACTIONS.SELL_CRYPTO:
        return {
          amount: params.amount,
          currency: params.currency,
          fiatCurrency: params.fiatCurrency,
          chainId: params.chainId,
          address: params.address,
        };

      case ACTIONS.CONNECT:
      case ACTIONS.MMSDK:
        return {
          channelId: params.channelId,
          pubkey: params.pubkey,
          comm: params.comm,
          redirect: params.redirect,
          v: params.v,
          sdkVersion: params.sdkVersion,
          originatorInfo: params.originatorInfo,
        };

      case ACTIONS.WC:
        return {
          uri: params.uri,
          redirect: params.redirect,
        };

      case ACTIONS.ONBOARDING:
      case ACTIONS.CREATE_ACCOUNT:
        return {
          // These actions typically don't have specific params
          name: params.name,
        };

      default:
        // Return all params for unknown actions
        return { ...params };
    }
  }

  /**
   * Check if legacy parameters indicate a private/authenticated link
   *
   * @param params - Legacy parameters to check
   * @returns true if link requires authentication
   */
  static isPrivateLink(params: DeeplinkUrlParams): boolean {
    // Check for SDK/connect parameters that indicate authenticated access
    return Boolean(
      params.channelId ||
        params.pubkey ||
        params.originatorInfo ||
        params.request,
    );
  }

  /**
   * Convert action-specific paths back to legacy URL format
   *
   * @param link - CoreUniversalLink with action paths
   * @returns URL string in legacy format
   */
  static getActionUrl(link: CoreUniversalLink): string {
    const { action, params } = link;

    // Check for action-specific path parameters
    const pathParams: Record<string, string | undefined> = {
      swapPath: params.swapPath,
      sendPath: params.sendPath,
      dappPath: params.dappPath,
      rampPath: params.rampPath,
      perpsPath: params.perpsPath,
      rewardsPath: params.rewardsPath,
      homePath: params.homePath,
      onboardingPath: params.onboardingPath,
      createAccountPath: params.createAccountPath,
      depositCashPath: params.depositCashPath,
    };

    // Find the relevant path for this action
    for (const [, value] of Object.entries(pathParams)) {
      if (value?.startsWith(action)) {
        // Extract the path after the action
        const pathAfterAction = value.substring(action.length);
        return `${link.protocol}://${action}${pathAfterAction}`;
      }
    }

    // Default: reconstruct from action and params
    return link.originalUrl;
  }
}
