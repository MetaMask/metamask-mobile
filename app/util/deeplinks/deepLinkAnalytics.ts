/**
 * Utility functions for consolidated deep link analytics
 * Implements app installation detection and property extraction
 */

import branch from 'react-native-branch';
import Logger from '../Logger';
import {
  DeepLinkUsedEventProperties,
  InterstitialState,
  SignatureStatus,
  DeepLinkRoute,
  SensitiveProperties,
  DeepLinkAnalyticsContext,
} from '../../core/DeeplinkManager/types/deepLinkAnalytics';
import { ACTIONS } from '../../constants/deeplinks';

/**
 * Determine app installation status from Branch.io parameters
 * This is the core logic we validated in testing
 * @param params - Branch.io parameters object
 * @returns boolean - true if app was already installed, false for deferred deep link
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
      }
      // Not first session = app was already installed
      Logger.log(
        'DeepLinkAnalytics: App was already installed (returning user from Branch link)',
      );
      return true; // was_app_installed = true
    }
    // User did not come from a Branch link (direct app launch)
    Logger.log('DeepLinkAnalytics: Direct app launch (not from Branch link)');
    return true; // was_app_installed = true
  } catch (error) {
    Logger.error(
      error as Error,
      'DeepLinkAnalytics: Error determining app installation status',
    );
    return true; // Safe default: assume app was installed
  }
};

/**
 * Detect if the app was installed based on Branch.io parameters
 * Uses validated logic from our testing
 * @returns Promise<boolean> - true if app was already installed, false for deferred deep link
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
 * Extract sensitive properties based on route type
 * Only includes relevant parameters for each route
 * @param route - The deep link route type
 * @param urlParams - URL parameters from the deep link
 * @returns SensitiveProperties - Route-specific sensitive parameters
 */
export const extractSensitiveProperties = (
  route: DeepLinkRoute,
  urlParams: Record<string, string>,
): SensitiveProperties => {
  try {
    const sensitiveProps: SensitiveProperties = {};

    // Extract route-specific properties based on route type
    switch (route) {
      case DeepLinkRoute.SWAP:
        // Extract common properties for swap
        if (urlParams.from) sensitiveProps.from = urlParams.from;
        if (urlParams.to) sensitiveProps.to = urlParams.to;
        if (urlParams.amount) sensitiveProps.amount = urlParams.amount;
        if (urlParams.asset) sensitiveProps.asset = urlParams.asset;
        if (urlParams.slippage) sensitiveProps.slippage = urlParams.slippage;
        break;

      case DeepLinkRoute.PERPS:
        // Extract common properties for perps
        if (urlParams.from) sensitiveProps.from = urlParams.from;
        if (urlParams.to) sensitiveProps.to = urlParams.to;
        if (urlParams.amount) sensitiveProps.amount = urlParams.amount;
        if (urlParams.asset) sensitiveProps.asset = urlParams.asset;
        if (urlParams.symbol) sensitiveProps.symbol = urlParams.symbol;
        if (urlParams.screen) sensitiveProps.screen = urlParams.screen;
        if (urlParams.tab) sensitiveProps.tab = urlParams.tab;
        break;

      case DeepLinkRoute.DEPOSIT:
        // Extract common properties for deposit
        if (urlParams.from) sensitiveProps.from = urlParams.from;
        if (urlParams.to) sensitiveProps.to = urlParams.to;
        if (urlParams.amount) sensitiveProps.amount = urlParams.amount;
        if (urlParams.asset) sensitiveProps.asset = urlParams.asset;
        if (urlParams.provider) sensitiveProps.provider = urlParams.provider;
        if (urlParams.payment_method) sensitiveProps.payment_method = urlParams.payment_method;
        if (urlParams.sub_payment_method) sensitiveProps.sub_payment_method = urlParams.sub_payment_method;
        if (urlParams.fiat_currency) sensitiveProps.fiat_currency = urlParams.fiat_currency;
        if (urlParams.fiat_quantity) sensitiveProps.fiat_quantity = urlParams.fiat_quantity;
        break;

      case DeepLinkRoute.TRANSACTION:
        // Extract common properties for transaction
        if (urlParams.from) sensitiveProps.from = urlParams.from;
        if (urlParams.to) sensitiveProps.to = urlParams.to;
        if (urlParams.amount) sensitiveProps.amount = urlParams.amount;
        if (urlParams.asset) sensitiveProps.asset = urlParams.asset;
        if (urlParams.gas) sensitiveProps.gas = urlParams.gas;
        if (urlParams.gasPrice) sensitiveProps.gasPrice = urlParams.gasPrice;
        break;

      case DeepLinkRoute.BUY:
        // Extract common properties for buy
        if (urlParams.from) sensitiveProps.from = urlParams.from;
        if (urlParams.to) sensitiveProps.to = urlParams.to;
        if (urlParams.amount) sensitiveProps.amount = urlParams.amount;
        if (urlParams.asset) sensitiveProps.asset = urlParams.asset;
        if (urlParams.crypto_currency) sensitiveProps.crypto_currency = urlParams.crypto_currency;
        if (urlParams.crypto_amount) sensitiveProps.crypto_amount = urlParams.crypto_amount;
        break;

      case DeepLinkRoute.HOME:
      case DeepLinkRoute.INVALID:
      default:
        // No properties for home or invalid routes
        break;
    }

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
 * @param context - Deep link analytics context
 * @returns InterstitialState - The determined interstitial state
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
    }
    // Direct app launch or other scenario
    return InterstitialState.NOT_SHOWN;
  }

  if (interstitialDisabled) {
    // User has disabled interstitials ("Don't remind me again")
    return InterstitialState.SKIPPED;
  }

  if (interstitialAction === InterstitialState.ACCEPTED) {
    return InterstitialState.ACCEPTED;
  }
  if (interstitialAction === InterstitialState.REJECTED) {
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
 * @param context - Deep link analytics context
 * @returns Promise<DeepLinkUsedEventProperties> - The consolidated analytics event properties
 */
export const createDeepLinkUsedEvent = async (
  context: DeepLinkAnalyticsContext,
): Promise<DeepLinkUsedEventProperties> => {
  const { url, urlParams, signatureStatus } = context;

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
