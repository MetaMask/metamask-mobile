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

    // Logic based on Branch.io documentation:
    // - +is_first_session: true = install, false = open
    // - +clicked_branch_link: true = came from Branch link

    if (clickedBranchLink === true) {
      // User came from a Branch link
      if (isFirstSession === true) {
        // First session = app was installed via Branch.io (deferred deep link)
        return false; // was_app_installed = false
      }
      // Not first session = app was already installed
      return true; // was_app_installed = true
    }
    // User did not come from a Branch link (direct app launch)
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
 * Helper function to safely extract string values from URL parameters
 * @param urlParams - URL parameters object
 * @param key - The key to extract
 * @returns string | undefined - The extracted value or undefined
 */
const getStringValue = (
  urlParams: Record<string, string>,
  key: string,
): string | undefined => {
  const value = urlParams[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
};

/**
 * Helper function to conditionally add properties to sensitive props object
 * @param sensitiveProps - The object to add properties to
 * @param key - The property key
 * @param value - The property value (only added if truthy)
 */
const addPropertyIfExists = (
  sensitiveProps: Record<string, string>,
  key: string,
  value: string | undefined,
): void => {
  if (value) {
    sensitiveProps[key] = value;
  }
};

/**
 * Extract properties for common fields (from, to, amount, asset)
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractCommonProperties = (
  urlParams: Record<string, string>,
  sensitiveProps: Record<string, string>,
): void => {
  addPropertyIfExists(
    sensitiveProps,
    'from',
    getStringValue(urlParams, 'from'),
  );
  addPropertyIfExists(sensitiveProps, 'to', getStringValue(urlParams, 'to'));
  addPropertyIfExists(
    sensitiveProps,
    'amount',
    getStringValue(urlParams, 'amount'),
  );
  addPropertyIfExists(
    sensitiveProps,
    'asset',
    getStringValue(urlParams, 'asset'),
  );
};

/**
 * Extract properties specific to SWAP route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractSwapProperties = (
  urlParams: Record<string, string>,
  sensitiveProps: Record<string, string>,
): void => {
  extractCommonProperties(urlParams, sensitiveProps);
  addPropertyIfExists(
    sensitiveProps,
    'slippage',
    getStringValue(urlParams, 'slippage'),
  );
};

/**
 * Extract properties specific to PERPS route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractPerpsProperties = (
  urlParams: Record<string, string>,
  sensitiveProps: Record<string, string>,
): void => {
  extractCommonProperties(urlParams, sensitiveProps);
  addPropertyIfExists(
    sensitiveProps,
    'symbol',
    getStringValue(urlParams, 'symbol'),
  );
  addPropertyIfExists(
    sensitiveProps,
    'screen',
    getStringValue(urlParams, 'screen'),
  );
  addPropertyIfExists(sensitiveProps, 'tab', getStringValue(urlParams, 'tab'));
};

/**
 * Extract properties specific to DEPOSIT route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractDepositProperties = (
  urlParams: Record<string, string>,
  sensitiveProps: Record<string, string>,
): void => {
  extractCommonProperties(urlParams, sensitiveProps);
  addPropertyIfExists(
    sensitiveProps,
    'provider',
    getStringValue(urlParams, 'provider'),
  );
  addPropertyIfExists(
    sensitiveProps,
    'payment_method',
    getStringValue(urlParams, 'payment_method'),
  );
  addPropertyIfExists(
    sensitiveProps,
    'sub_payment_method',
    getStringValue(urlParams, 'sub_payment_method'),
  );
  addPropertyIfExists(
    sensitiveProps,
    'fiat_currency',
    getStringValue(urlParams, 'fiat_currency'),
  );
  addPropertyIfExists(
    sensitiveProps,
    'fiat_quantity',
    getStringValue(urlParams, 'fiat_quantity'),
  );
};

/**
 * Extract properties specific to TRANSACTION route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractTransactionProperties = (
  urlParams: Record<string, string>,
  sensitiveProps: Record<string, string>,
): void => {
  extractCommonProperties(urlParams, sensitiveProps);
  addPropertyIfExists(sensitiveProps, 'gas', getStringValue(urlParams, 'gas'));
  addPropertyIfExists(
    sensitiveProps,
    'gasPrice',
    getStringValue(urlParams, 'gasPrice'),
  );
};

/**
 * Extract properties specific to BUY route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractBuyProperties = (
  urlParams: Record<string, string>,
  sensitiveProps: Record<string, string>,
): void => {
  extractCommonProperties(urlParams, sensitiveProps);
  addPropertyIfExists(
    sensitiveProps,
    'crypto_currency',
    getStringValue(urlParams, 'crypto_currency'),
  );
  addPropertyIfExists(
    sensitiveProps,
    'crypto_amount',
    getStringValue(urlParams, 'crypto_amount'),
  );
};

/**
 * Extract properties specific to HOME route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractHomeProperties = (
  urlParams: Record<string, string>,
  sensitiveProps: Record<string, string>,
): void => {
  // HOME route only extracts previewToken, not common transaction properties
  addPropertyIfExists(
    sensitiveProps,
    'previewToken',
    getStringValue(urlParams, 'previewToken'),
  );
};

/**
 * Extract properties for INVALID route (no properties to extract)
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractInvalidProperties = (
  urlParams: Record<string, string>,
  sensitiveProps: Record<string, string>,
): void => {
  // No properties to extract for invalid routes
};

/**
 * Route-specific property extractor functions mapping
 */
const routeExtractors: Record<
  DeepLinkRoute,
  (
    urlParams: Record<string, string>,
    sensitiveProps: Record<string, string>,
  ) => void
> = {
  [DeepLinkRoute.SWAP]: extractSwapProperties,
  [DeepLinkRoute.PERPS]: extractPerpsProperties,
  [DeepLinkRoute.DEPOSIT]: extractDepositProperties,
  [DeepLinkRoute.TRANSACTION]: extractTransactionProperties,
  [DeepLinkRoute.BUY]: extractBuyProperties,
  [DeepLinkRoute.HOME]: extractHomeProperties,
  [DeepLinkRoute.INVALID]: extractInvalidProperties,
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

    // Get the appropriate extractor function for the route
    const extractor =
      routeExtractors[route] || routeExtractors[DeepLinkRoute.INVALID];

    // Extract properties using the route-specific extractor
    extractor(urlParams, sensitiveProps);

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

  return eventBuilder;
};
