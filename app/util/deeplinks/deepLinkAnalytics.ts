/**
 * Utility functions for consolidated deep link analytics
 * Implements app installation detection and property extraction
 */

import branch from 'react-native-branch';
import Logger from '../Logger';
import {
  InterstitialState,
  SignatureStatus,
  DeepLinkRoute,
  DeepLinkAnalyticsContext,
} from '../../core/DeeplinkManager/types/deepLinkAnalytics.types';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { SUPPORTED_ACTIONS } from '../../core/DeeplinkManager/types/deepLink.types';

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
 * @returns Record<string, string> - Route-specific sensitive parameters
 */
export const extractSensitiveProperties = (
  route: DeepLinkRoute,
  urlParams: Record<string, string>,
): Record<string, string> => {
  try {
    const sensitiveProps: Record<string, string> = {};

    // Helper function to safely extract string values
    const getStringValue = (key: string): string | undefined => {
      const value = urlParams[key];
      return typeof value === 'string' && value.trim() !== ''
        ? value
        : undefined;
    };

    // Extract route-specific properties based on route type
    switch (route) {
      case DeepLinkRoute.SWAP:
        // Extract common properties for swap
        const swapFrom = getStringValue('from');
        const swapTo = getStringValue('to');
        const swapAmount = getStringValue('amount');
        const swapAsset = getStringValue('asset');
        const swapSlippage = getStringValue('slippage');

        if (swapFrom) sensitiveProps.from = swapFrom;
        if (swapTo) sensitiveProps.to = swapTo;
        if (swapAmount) sensitiveProps.amount = swapAmount;
        if (swapAsset) sensitiveProps.asset = swapAsset;
        if (swapSlippage) sensitiveProps.slippage = swapSlippage;
        break;

      case DeepLinkRoute.PERPS:
        // Extract common properties for perps
        const perpsFrom = getStringValue('from');
        const perpsTo = getStringValue('to');
        const perpsAmount = getStringValue('amount');
        const perpsAsset = getStringValue('asset');
        const perpsSymbol = getStringValue('symbol');
        const perpsScreen = getStringValue('screen');
        const perpsTab = getStringValue('tab');

        if (perpsFrom) sensitiveProps.from = perpsFrom;
        if (perpsTo) sensitiveProps.to = perpsTo;
        if (perpsAmount) sensitiveProps.amount = perpsAmount;
        if (perpsAsset) sensitiveProps.asset = perpsAsset;
        if (perpsSymbol) sensitiveProps.symbol = perpsSymbol;
        if (perpsScreen) sensitiveProps.screen = perpsScreen;
        if (perpsTab) sensitiveProps.tab = perpsTab;
        break;

      case DeepLinkRoute.DEPOSIT:
        // Extract common properties for deposit
        const depositFrom = getStringValue('from');
        const depositTo = getStringValue('to');
        const depositAmount = getStringValue('amount');
        const depositAsset = getStringValue('asset');
        const depositProvider = getStringValue('provider');
        const depositPaymentMethod = getStringValue('payment_method');
        const depositSubPaymentMethod = getStringValue('sub_payment_method');
        const depositFiatCurrency = getStringValue('fiat_currency');
        const depositFiatQuantity = getStringValue('fiat_quantity');

        if (depositFrom) sensitiveProps.from = depositFrom;
        if (depositTo) sensitiveProps.to = depositTo;
        if (depositAmount) sensitiveProps.amount = depositAmount;
        if (depositAsset) sensitiveProps.asset = depositAsset;
        if (depositProvider) sensitiveProps.provider = depositProvider;
        if (depositPaymentMethod)
          sensitiveProps.payment_method = depositPaymentMethod;
        if (depositSubPaymentMethod)
          sensitiveProps.sub_payment_method = depositSubPaymentMethod;
        if (depositFiatCurrency)
          sensitiveProps.fiat_currency = depositFiatCurrency;
        if (depositFiatQuantity)
          sensitiveProps.fiat_quantity = depositFiatQuantity;
        break;

      case DeepLinkRoute.TRANSACTION:
        // Extract common properties for transaction
        const txFrom = getStringValue('from');
        const txTo = getStringValue('to');
        const txAmount = getStringValue('amount');
        const txAsset = getStringValue('asset');
        const txGas = getStringValue('gas');
        const txGasPrice = getStringValue('gasPrice');

        if (txFrom) sensitiveProps.from = txFrom;
        if (txTo) sensitiveProps.to = txTo;
        if (txAmount) sensitiveProps.amount = txAmount;
        if (txAsset) sensitiveProps.asset = txAsset;
        if (txGas) sensitiveProps.gas = txGas;
        if (txGasPrice) sensitiveProps.gasPrice = txGasPrice;
        break;

      case DeepLinkRoute.BUY:
        // Extract common properties for buy
        const buyFrom = getStringValue('from');
        const buyTo = getStringValue('to');
        const buyAmount = getStringValue('amount');
        const buyAsset = getStringValue('asset');
        const buyCryptoCurrency = getStringValue('crypto_currency');
        const buyCryptoAmount = getStringValue('crypto_amount');

        if (buyFrom) sensitiveProps.from = buyFrom;
        if (buyTo) sensitiveProps.to = buyTo;
        if (buyAmount) sensitiveProps.amount = buyAmount;
        if (buyAsset) sensitiveProps.asset = buyAsset;
        if (buyCryptoCurrency)
          sensitiveProps.crypto_currency = buyCryptoCurrency;
        if (buyCryptoAmount) sensitiveProps.crypto_amount = buyCryptoAmount;
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
export const mapSupportedActionToRoute = (
  action: SUPPORTED_ACTIONS,
): DeepLinkRoute => {
  switch (action) {
    case SUPPORTED_ACTIONS.SWAP:
      return DeepLinkRoute.SWAP;
    case SUPPORTED_ACTIONS.PERPS:
    case SUPPORTED_ACTIONS.PERPS_MARKETS:
    case SUPPORTED_ACTIONS.PERPS_ASSET:
      return DeepLinkRoute.PERPS;
    case SUPPORTED_ACTIONS.DEPOSIT:
      return DeepLinkRoute.DEPOSIT;
    case SUPPORTED_ACTIONS.SEND:
      return DeepLinkRoute.TRANSACTION;
    case SUPPORTED_ACTIONS.BUY:
    case SUPPORTED_ACTIONS.BUY_CRYPTO:
      return DeepLinkRoute.BUY;
    case SUPPORTED_ACTIONS.HOME:
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
 * @returns Promise<MetricsEventBuilder> - The event builder ready for additional properties and tracking
 */
export const createDeepLinkUsedEventBuilder = async (
  context: DeepLinkAnalyticsContext,
): Promise<MetricsEventBuilder> => {
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
  const eventProperties = {
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
  };

  // Create the MetricsEventBuilder with all deep link properties
  const eventBuilder = MetricsEventBuilder.createEventBuilder(
    MetaMetricsEvents.DEEP_LINK_USED,
  )
    .addProperties(eventProperties)
    .addSensitiveProperties(sensitiveProperties);

  Logger.log('DeepLinkAnalytics: Created deep link event builder:', {
    properties: eventProperties,
    sensitiveProperties,
  });
  return eventBuilder;
};
