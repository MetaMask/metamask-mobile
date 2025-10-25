// URL is available globally in React Native
import qs from 'qs';
import { ACTIONS, PROTOCOLS, PREFIXES } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { DeeplinkUrlParams } from '../ParseManager/extractURLParams';

const {
  MM_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_TEST_HOST,
} = AppConstants;

export interface ParsedDeeplink {
  action: string;
  path: string;
  params: DeeplinkUrlParams;
  signature?: string;
  originalUrl: string;
  scheme: string;
  hostname?: string;
  isUniversalLink: boolean;
  isSupportedDomain: boolean;
}

/**
 * DeeplinkParser unifies parsing logic for both traditional and universal deeplinks
 */
export class DeeplinkParser {
  private static instance: DeeplinkParser;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): DeeplinkParser {
    if (!DeeplinkParser.instance) {
      DeeplinkParser.instance = new DeeplinkParser();
    }
    return DeeplinkParser.instance;
  }

  /**
   * Parse any deeplink URL into a unified format
   */
  parse(url: string): ParsedDeeplink {
    DevLogger.log('DeeplinkParser: Parsing URL:', url);

    try {
      // Clean up the URL for proper parsing
      const cleanedUrl = this.cleanUrl(url);
      const urlObj = new URL(cleanedUrl);

      const scheme = urlObj.protocol;
      const isUniversalLink = this.isUniversalLink(scheme);

      // Extract action based on URL type
      const action = isUniversalLink
        ? this.extractUniversalLinkAction(urlObj)
        : this.extractTraditionalDeeplinkAction(urlObj, url);

      // Extract parameters
      const params = this.extractParams(urlObj);

      // Extract path (what comes after the action)
      const path = isUniversalLink
        ? this.extractUniversalLinkPath(urlObj, action)
        : this.extractTraditionalDeeplinkPath(url, action);

      // Check signature
      const signature = params.sig as string | undefined;

      // Check if it's a supported domain for universal links
      const isSupportedDomain = isUniversalLink
        ? this.isSupportedDomain(urlObj.hostname)
        : true; // Traditional deeplinks don't have domain restrictions

      const result: ParsedDeeplink = {
        action,
        path,
        params,
        signature,
        originalUrl: url,
        scheme,
        hostname: urlObj.hostname || undefined,
        isUniversalLink,
        isSupportedDomain,
      };

      DevLogger.log('DeeplinkParser: Parsed result:', result);
      return result;
    } catch (error) {
      DevLogger.log('DeeplinkParser: Error parsing URL:', error);
      throw new Error(`Failed to parse deeplink: ${error}`);
    }
  }

  /**
   * Clean up URL for proper parsing
   */
  private cleanUrl(url: string): string {
    // Handle dapp protocol special case
    return url
      .replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTPS}://`, `${PROTOCOLS.DAPP}/`)
      .replace(`${PROTOCOLS.DAPP}/${PROTOCOLS.HTTP}://`, `${PROTOCOLS.DAPP}/`);
  }

  /**
   * Check if URL is a universal link (https/http)
   */
  private isUniversalLink(scheme: string): boolean {
    const cleanScheme = scheme.replace(':', '');
    return cleanScheme === PROTOCOLS.HTTP || cleanScheme === PROTOCOLS.HTTPS;
  }

  /**
   * Check if hostname is supported for universal links
   */
  private isSupportedDomain(hostname: string | null): boolean {
    if (!hostname) return false;
    return (
      hostname === MM_UNIVERSAL_LINK_HOST ||
      hostname === MM_IO_UNIVERSAL_LINK_HOST ||
      hostname === MM_IO_UNIVERSAL_LINK_TEST_HOST
    );
  }

  /**
   * Extract action from universal link URL
   */
  private extractUniversalLinkAction(urlObj: URL): string {
    // Action is the first path segment
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    return pathSegments[0] || '';
  }

  /**
   * Extract action from traditional deeplink URL
   */
  private extractTraditionalDeeplinkAction(
    urlObj: URL,
    originalUrl: string,
  ): string {
    const protocol = urlObj.protocol.replace(':', '');

    // Special handling for different protocols
    switch (protocol) {
      case PROTOCOLS.WC:
        return ACTIONS.WC;
      case PROTOCOLS.ETHEREUM:
        return PROTOCOLS.ETHEREUM;
      case PROTOCOLS.DAPP:
        return ACTIONS.DAPP;
      case PROTOCOLS.METAMASK:
        // For metamask:// URLs, extract the action from the path
        return this.extractMetaMaskAction(originalUrl);
      default:
        return protocol;
    }
  }

  /**
   * Extract action from metamask:// URLs
   */
  private extractMetaMaskAction(url: string): string {
    // Remove the metamask:// prefix
    const withoutPrefix = url.replace(PREFIXES.METAMASK, '');

    // Sort actions by length (descending) to match longer actions first
    // This prevents 'sell' from matching before 'sell-crypto'
    const sortedActions = Object.entries(ACTIONS).sort(
      (a, b) => b[1].length - a[1].length,
    );

    // Find the first matching action
    for (const [, value] of sortedActions) {
      if (withoutPrefix.startsWith(value)) {
        return value;
      }
    }

    // If no specific action found, return empty (will be handled as default)
    return '';
  }

  /**
   * Extract path from universal link
   */
  private extractUniversalLinkPath(urlObj: URL, action: string): string {
    if (!action) return '';

    // Remove the action from pathname to get the remaining path
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    pathSegments.shift(); // Remove the action
    return pathSegments.join('/');
  }

  /**
   * Extract path from traditional deeplink
   */
  private extractTraditionalDeeplinkPath(url: string, action: string): string {
    if (!action) return '';

    // For metamask:// URLs, extract what comes after the action
    if (url.startsWith(PREFIXES.METAMASK)) {
      const withoutPrefix = url.replace(PREFIXES.METAMASK, '');
      const withoutAction = withoutPrefix.replace(action, '');
      // Remove query string if present
      return withoutAction.split('?')[0];
    }

    return '';
  }

  /**
   * Extract and parse URL parameters
   */
  private extractParams(urlObj: URL): DeeplinkUrlParams {
    const defaultParams: DeeplinkUrlParams = {
      pubkey: '',
      uri: '',
      redirect: '',
      v: '',
      sdkVersion: '',
      rpc: '',
      originatorInfo: '',
      channelId: '',
      comm: '',
      message: '',
      request: '',
      scheme: '',
      attributionId: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
      account: '',
      hr: false,
    };

    if (!urlObj.search) {
      return defaultParams;
    }

    try {
      // Parse query parameters
      const parsedParams = qs.parse(urlObj.search.substring(1), {
        arrayLimit: 99,
      });

      // Merge with defaults
      const params = { ...defaultParams, ...parsedParams };

      // Special handling for certain parameters
      params.hr = parsedParams.hr === '1';
      if (params.message) {
        params.message = (params.message as string).replace(/ /g, '+');
      }

      return params;
    } catch (error) {
      DevLogger.log('DeeplinkParser: Error parsing parameters:', error);
      return defaultParams;
    }
  }

  /**
   * Validate a parsed deeplink
   */
  validate(parsed: ParsedDeeplink): {
    isValid: boolean;
    reason?: string;
  } {
    // Check if action is present for metamask:// URLs
    if (parsed.scheme === `${PROTOCOLS.METAMASK}:` && !parsed.action) {
      return {
        isValid: false,
        reason: 'No action specified for metamask:// URL',
      };
    }

    // Check for malformed hostnames first
    if (
      parsed.hostname &&
      (parsed.hostname.includes('?') || parsed.hostname.includes('&'))
    ) {
      return {
        isValid: false,
        reason: 'Invalid hostname',
      };
    }

    // Check domain for universal links
    if (parsed.isUniversalLink && !parsed.isSupportedDomain) {
      return {
        isValid: false,
        reason: 'Unsupported domain for universal link',
      };
    }

    return { isValid: true };
  }
}

export default DeeplinkParser.getInstance();
