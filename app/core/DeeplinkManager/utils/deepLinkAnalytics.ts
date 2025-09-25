/**
 * Utility functions for consolidated deep link analytics
 * Implements app installation detection and property extraction
 */

import branch from 'react-native-branch';
import Logger from '../../../util/Logger';
import {
  DeepLinkUsedEventProperties,
  BranchParams,
  InterstitialState,
  SignatureStatus,
  DeepLinkRoute,
  SensitiveProperties,
  DeepLinkAnalyticsContext,
} from '../types/deepLinkAnalytics';
import extractURLParams from '../ParseManager/extractURLParams';
import { ACTIONS } from '../../../constants/deeplinks';


/**
 * Detect if the app was installed based on Branch.io parameters
 * Uses validated logic from our testing
 */
export const detectAppInstallation = async (): Promise<boolean> => {
  try {
    const latestParams = await branch.getLatestReferringParams();
    return determineAppInstallationStatus(latestParams);
  } catch (error) {
    Logger.error(
      error as Error,
      'DeepLinkAnalytics: Error accessing Branch.io parameters',
    );
    // Default to app installed if we can't access Branch.io parameters
    return true;
  }
};

/**
 * Determine app installation status from Branch.io parameters
 * This is the core logic we validated in testing
 */
export const determineAppInstallationStatus = (params: unknown): boolean => {
  try {
    if (!params) {
      Logger.log(
        'DeepLinkAnalytics: No Branch.io params available, defaulting to app installed',
      );
      return true; // Default to app installed if no params
    }

    // Type-safe access to Branch.io parameters
    const branchParams = params as Record<string, unknown>;
    const isFirstSession = branchParams['+is_first_session'] as
      | boolean
      | undefined;
    const clickedBranchLink = branchParams['+clicked_branch_link'] as
      | boolean
      | undefined;

    Logger.log(
      'DeepLinkAnalytics: Analyzing Branch.io parameters for app installation:',
      {
        isFirstSession,
        clickedBranchLink,
      },
    );

    // Logic based on Branch.io documentation:
    // - +is_first_session: true = install, false = open
    // - +clicked_branch_link: true = came from Branch link

    if (clickedBranchLink === true) {
      // User came from a Branch link
      if (isFirstSession === true) {
        // First session = app was installed via Branch.io (deferred deep link)
        Logger.log(
          'DeepLinkAnalytics: App was installed via Branch.io (deferred deep link)',
        );
        return false; // was_app_installed = false
      } else {
        // Not first session = app was already installed
        Logger.log(
          'DeepLinkAnalytics: App was already installed (returning user from Branch link)',
        );
        return true; // was_app_installed = true
      }
    } else {
      // User did not come from a Branch link (direct app launch)
      Logger.log('DeepLinkAnalytics: Direct app launch (not from Branch link)');
      return true; // was_app_installed = true
    }
  } catch (error) {
    Logger.error(
      error as Error,
      'DeepLinkAnalytics: Error determining app installation status',
    );
    return true; // Safe default: assume app was installed
  }
};

/**
 * Extract sensitive properties based on route type
 * Only includes relevant parameters for each route
 */
export const extractSensitiveProperties = (
  route: DeepLinkRoute,
  urlParams: Record<string, string>,
): SensitiveProperties => {
  try {
    const sensitiveProps: SensitiveProperties = {};

    // Note: Route-specific parameters like 'from', 'to', 'slippage', etc.
    // are not available in the current DeeplinkUrlParams interface.
    // This would need to be addressed in a separate refactoring.

    // For now, return empty object since route-specific parameters
    // are not available in the current DeeplinkUrlParams interface

    Logger.log(
      `DeepLinkAnalytics: Extracted sensitive properties for ${route}:`,
      sensitiveProps,
    );
    return sensitiveProps;
  } catch (error) {
    Logger.error(
      error as Error,
      'DeepLinkAnalytics: Error extracting sensitive properties',
    );
    return {}; // Return empty object on error
  }
};

/**
 * Determine interstitial state based on context
 */
export const determineInterstitialState = (
  context: DeepLinkAnalyticsContext,
): InterstitialState => {
  const { interstitialShown, interstitialDisabled, interstitialAction } =
    context;

  if (!interstitialShown) {
    // Interstitial was not shown
    if (
      context.branchParams?.['+clicked_branch_link'] &&
      context.branchParams?.['+is_first_session']
    ) {
      // Deferred deep link - app not installed
      return InterstitialState.NOT_SHOWN;
    } else {
      // Direct app launch or other scenario
      return InterstitialState.NOT_SHOWN;
    }
  }

  if (interstitialDisabled) {
    // User has disabled interstitials ("Don't remind me again")
    return InterstitialState.SKIPPED;
  }

  if (interstitialAction === 'accepted') {
    return InterstitialState.ACCEPTED;
  } else if (interstitialAction === 'rejected') {
    return InterstitialState.REJECTED;
  }

  // Default case
  return InterstitialState.NOT_SHOWN;
};

/**
 * Determine signature status from validation result
 */
export const determineSignatureStatus = (
  signatureResult: string,
): SignatureStatus => {
  switch (signatureResult) {
    case 'valid':
      return SignatureStatus.VALID;
    case 'invalid':
      return SignatureStatus.INVALID;
    case 'missing':
    default:
      return SignatureStatus.MISSING;
  }
};

/**
 * Map SUPPORTED_ACTIONS to DeepLinkRoute
 */
export const mapSupportedActionToRoute = (action: ACTIONS): DeepLinkRoute => {
  switch (action) {
    case ACTIONS.SWAP: // 'swap'
      return DeepLinkRoute.SWAP;
    case ACTIONS.PERPS: // 'perps'
    case ACTIONS.PERPS_MARKETS: // 'perps-markets'
    case ACTIONS.PERPS_ASSET: // 'perps-asset'
      return DeepLinkRoute.PERPS;
    case ACTIONS.DEPOSIT: // 'deposit'
      return DeepLinkRoute.DEPOSIT;
    case ACTIONS.SEND: // 'send'
      return DeepLinkRoute.TRANSACTION;
    case ACTIONS.BUY: // 'buy'
    case ACTIONS.BUY_CRYPTO: // 'buy-crypto'
      return DeepLinkRoute.BUY;
    case ACTIONS.HOME: // 'home'
      return DeepLinkRoute.HOME;
    default:
      return DeepLinkRoute.INVALID;
  }
};

/**
 * Extract route from URL path
 */
export const extractRouteFromUrl = (url: string): DeepLinkRoute => {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const route = pathSegments[0]?.toLowerCase();

    // Map URL paths to route enums
    switch (route) {
      case 'swap':
        return DeepLinkRoute.SWAP;
      case 'perps':
        return DeepLinkRoute.PERPS;
      case 'deposit':
        return DeepLinkRoute.DEPOSIT;
      case 'transaction':
        return DeepLinkRoute.TRANSACTION;
      case 'buy':
        return DeepLinkRoute.BUY;
      case 'home':
        return DeepLinkRoute.HOME;
      case undefined: // Empty path (no segments after filtering)
        return DeepLinkRoute.HOME;
      default:
        return DeepLinkRoute.INVALID;
    }
  } catch (error) {
    Logger.error(
      error as Error,
      'DeepLinkAnalytics: Error extracting route from URL',
    );
    return DeepLinkRoute.INVALID;
  }
};

/**
 * Create the consolidated deep link analytics event
 */
export const createDeepLinkUsedEvent = async (
  context: DeepLinkAnalyticsContext,
): Promise<DeepLinkUsedEventProperties> => {
  const { url, urlParams, signatureStatus, interstitialDisabled } = context;

  // Detect app installation status
  const wasAppInstalled = await detectAppInstallation();

  // Extract route
  const route = extractRouteFromUrl(url);

  // Extract sensitive properties
  const sensitiveProperties = extractSensitiveProperties(route, urlParams);

  // Determine interstitial state
  const interstitial = determineInterstitialState(context);

  // Build the event properties
  const eventProperties: DeepLinkUsedEventProperties = {
    route: route.toString(),
    was_app_installed: wasAppInstalled,
    signature: signatureStatus,
    interstitial,
    attribution_id: urlParams.attributionId,
    utm_source: urlParams.utm_source,
    utm_medium: urlParams.utm_medium,
    utm_campaign: urlParams.utm_campaign,
    utm_term: urlParams.utm_term,
    utm_content: urlParams.utm_content,
    target: route === DeepLinkRoute.INVALID ? url : undefined,
    sensitiveProperties,
  };

  Logger.log(
    'DeepLinkAnalytics: Created deep link used event:',
    eventProperties,
  );
  return eventProperties;
};
