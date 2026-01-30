/**
 * Utility functions for consolidated deep link analytics
 * Implements app installation detection and property extraction
 */

import branch from 'react-native-branch';
import Logger from '../../../../util/Logger';
import {
  InterstitialState,
  SignatureStatus,
  DeepLinkRoute,
  DeepLinkAnalyticsContext,
  BranchParams,
} from '../../types/deepLinkAnalytics.types';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';
import { MetaMetricsEvents } from '../../../Analytics/MetaMetrics.events';
import { SupportedAction } from '../../types/deepLink.types';
import { ACTIONS } from '../../../../constants/deeplinks';

/**
 * Type for URL parameters that can contain string or boolean values
 */
type UrlParamValues = Record<string, string | boolean>;

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
 * @param branchParams - Optional Branch.io parameters to reuse (avoids duplicate API calls)
 * @returns Promise<boolean> - true if app was already installed, false for deferred deep link
 */
export const detectAppInstallation = async (
  branchParams?: BranchParams,
): Promise<boolean> => {
  // Use provided params if available, otherwise fetch
  if (branchParams) {
    return determineAppInstallationStatus(branchParams);
  }

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
  urlParams: UrlParamValues,
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
  urlParams: UrlParamValues,
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
  urlParams: UrlParamValues,
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
  urlParams: UrlParamValues,
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
  urlParams: UrlParamValues,
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
  urlParams: UrlParamValues,
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
  urlParams: UrlParamValues,
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
 * Extract properties specific to SELL route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractSellProperties = (
  urlParams: UrlParamValues,
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
  urlParams: UrlParamValues,
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
 * Extract properties specific to ASSET route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractAssetProperties = (
  urlParams: UrlParamValues,
  sensitiveProps: Record<string, string>,
): void => {
  const assetValue =
    getStringValue(urlParams, 'asset') ?? getStringValue(urlParams, 'assetId');
  addPropertyIfExists(sensitiveProps, 'asset', assetValue);
};

/**
 * Extract properties for DAPP route
 * DAPP routes may contain sensitive URLs, so we don't extract them
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractDappProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // DAPP URLs may contain sensitive information, so we don't extract them
  // to prevent leaking full URLs in analytics
};

/**
 * Extract properties for WC route
 * WC routes contain sensitive WalletConnect session URIs, so we don't extract them
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractWcProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // WC URIs contain sensitive WalletConnect session information
  // We don't extract them to prevent leaking session URIs in analytics
};

/**
 * Extract properties for REWARDS route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractRewardsProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // REWARDS route may have referral or other non-sensitive parameters
  // Currently no specific properties to extract
};

/**
 * Extract properties for CREATE_ACCOUNT route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractCreateAccountProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // CREATE_ACCOUNT route doesn't have sensitive parameters to extract
};

/**
 * Extract properties for ONBOARDING route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractOnboardingProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // ONBOARDING route doesn't have sensitive parameters to extract
};

/**
 * Extract properties for PREDICT route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractPredictProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // PREDICT route doesn't have sensitive parameters to extract
};

/**
 * Extract properties for TRENDING route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractTrendingProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // TRENDING route doesn't have sensitive parameters to extract
};

/**
 * Extract properties for ENABLE_CARD_BUTTON route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractEnableCardButtonProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // ENABLE_CARD_BUTTON route doesn't have sensitive parameters to extract
};

/**
 * Extract properties for CARD_ONBOARDING route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractCardOnboardingProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // CARD_ONBOARDING route doesn't have sensitive parameters to extract
};

/**
 * Extract properties for CARD_HOME route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractCardHomeProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // CARD_HOME route doesn't have sensitive parameters to extract
};

/**
 * Extract properties for SHIELD route
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractShieldProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // SHIELD route doesn't have sensitive parameters to extract
};

/**
 * Extract properties for INVALID route
 * No properties to extract, this function is a placeholder
 * to satisfy the type checker
 * @param urlParams - URL parameters
 * @param sensitiveProps - Object to add properties to
 */
const extractInvalidProperties = (
  _urlParams: UrlParamValues,
  _sensitiveProps: Record<string, string>,
): void => {
  // No properties to extract for invalid routes
};

/**
 * Route-specific property extractor functions mapping
 */
const routeExtractors: Record<
  DeepLinkRoute,
  (urlParams: UrlParamValues, sensitiveProps: Record<string, string>) => void
> = {
  [DeepLinkRoute.SWAP]: extractSwapProperties,
  [DeepLinkRoute.PERPS]: extractPerpsProperties,
  [DeepLinkRoute.DEPOSIT]: extractDepositProperties,
  [DeepLinkRoute.TRANSACTION]: extractTransactionProperties,
  [DeepLinkRoute.BUY]: extractBuyProperties,
  [DeepLinkRoute.SELL]: extractSellProperties,
  [DeepLinkRoute.HOME]: extractHomeProperties,
  [DeepLinkRoute.ASSET]: extractAssetProperties,
  [DeepLinkRoute.DAPP]: extractDappProperties,
  [DeepLinkRoute.WC]: extractWcProperties,
  [DeepLinkRoute.REWARDS]: extractRewardsProperties,
  [DeepLinkRoute.CREATE_ACCOUNT]: extractCreateAccountProperties,
  [DeepLinkRoute.ONBOARDING]: extractOnboardingProperties,
  [DeepLinkRoute.PREDICT]: extractPredictProperties,
  [DeepLinkRoute.SHIELD]: extractShieldProperties,
  [DeepLinkRoute.TRENDING]: extractTrendingProperties,
  [DeepLinkRoute.ENABLE_CARD_BUTTON]: extractEnableCardButtonProperties,
  [DeepLinkRoute.CARD_ONBOARDING]: extractCardOnboardingProperties,
  [DeepLinkRoute.CARD_HOME]: extractCardHomeProperties,
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
  urlParams: UrlParamValues,
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
  const { interstitialShown, interstitialAction } = context;

  // Check user action first - if user took action, report it
  if (interstitialAction === InterstitialState.ACCEPTED) {
    return InterstitialState.ACCEPTED;
  }
  if (interstitialAction === InterstitialState.REJECTED) {
    return InterstitialState.REJECTED;
  }

  // No action taken - check visibility
  if (!interstitialShown) {
    // Check for deferred deep link scenario
    if (
      context.branchParams?.['+clicked_branch_link'] &&
      context.branchParams?.['+is_first_session']
    ) {
      return InterstitialState.NOT_SHOWN;
    }
    return InterstitialState.NOT_SHOWN;
  }

  // Modal shown but no action (edge case)
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
 * Map SupportedAction to DeepLinkRoute
 */
export const mapSupportedActionToRoute = (
  action: SupportedAction,
): DeepLinkRoute => {
  switch (action) {
    case ACTIONS.SWAP:
      return DeepLinkRoute.SWAP;
    case ACTIONS.PERPS:
    case ACTIONS.PERPS_MARKETS:
    case ACTIONS.PERPS_ASSET:
      return DeepLinkRoute.PERPS;
    case ACTIONS.DEPOSIT:
      return DeepLinkRoute.DEPOSIT;
    case ACTIONS.SEND:
      return DeepLinkRoute.TRANSACTION;
    case ACTIONS.BUY:
    case ACTIONS.BUY_CRYPTO:
      return DeepLinkRoute.BUY;
    case ACTIONS.SELL:
    case ACTIONS.SELL_CRYPTO:
      return DeepLinkRoute.SELL;
    case ACTIONS.HOME:
      return DeepLinkRoute.HOME;
    case ACTIONS.ASSET:
      return DeepLinkRoute.ASSET;
    case ACTIONS.DAPP:
      return DeepLinkRoute.DAPP;
    case ACTIONS.WC:
      return DeepLinkRoute.WC;
    case ACTIONS.REWARDS:
      return DeepLinkRoute.REWARDS;
    case ACTIONS.CREATE_ACCOUNT:
      return DeepLinkRoute.CREATE_ACCOUNT;
    case ACTIONS.ONBOARDING:
      return DeepLinkRoute.ONBOARDING;
    case ACTIONS.PREDICT:
      return DeepLinkRoute.PREDICT;
    case ACTIONS.SHIELD:
      return DeepLinkRoute.SHIELD;
    case ACTIONS.TRENDING:
      return DeepLinkRoute.TRENDING;
    case ACTIONS.ENABLE_CARD_BUTTON:
      return DeepLinkRoute.ENABLE_CARD_BUTTON;
    case ACTIONS.CARD_ONBOARDING:
      return DeepLinkRoute.CARD_ONBOARDING;
    case ACTIONS.CARD_HOME:
      return DeepLinkRoute.CARD_HOME;
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
      case 'sell':
        return DeepLinkRoute.SELL;
      case 'home':
        return DeepLinkRoute.HOME;
      case 'asset':
        return DeepLinkRoute.ASSET;
      case 'dapp':
        return DeepLinkRoute.DAPP;
      case 'wc':
        return DeepLinkRoute.WC;
      case 'rewards':
        return DeepLinkRoute.REWARDS;
      case 'create-account':
        return DeepLinkRoute.CREATE_ACCOUNT;
      case 'onboarding':
        return DeepLinkRoute.ONBOARDING;
      case 'predict':
        return DeepLinkRoute.PREDICT;
      case 'shield':
        return DeepLinkRoute.SHIELD;
      case 'trending':
        return DeepLinkRoute.TRENDING;
      case 'enable-card-button':
        return DeepLinkRoute.ENABLE_CARD_BUTTON;
      case 'card-onboarding':
        return DeepLinkRoute.CARD_ONBOARDING;
      case 'card-home':
        return DeepLinkRoute.CARD_HOME;
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
 * @returns Promise<ReturnType<typeof AnalyticsEventBuilder.createEventBuilder>> - The event builder ready for additional properties and tracking
 */
export const createDeepLinkUsedEventBuilder = async (
  context: DeepLinkAnalyticsContext,
): Promise<ReturnType<typeof AnalyticsEventBuilder.createEventBuilder>> => {
  const { url, route, signatureStatus } = context;

  // Pass branchParams to avoid duplicate fetch
  const wasAppInstalled = await detectAppInstallation(context.branchParams);

  // Extract sensitive properties
  const sensitiveProperties = extractSensitiveProperties(
    route,
    context.urlParams,
  );

  // Determine interstitial state
  const interstitial = determineInterstitialState(context);

  // Build the event properties, filtering out undefined values
  const eventProperties = Object.fromEntries(
    Object.entries({
      route: route.toString(),
      was_app_installed: wasAppInstalled,
      signature: signatureStatus,
      interstitial,
      attribution_id: context.urlParams.attributionId,
      utm_source: context.urlParams.utm_source,
      utm_medium: context.urlParams.utm_medium,
      utm_campaign: context.urlParams.utm_campaign,
      utm_term: context.urlParams.utm_term,
      utm_content: context.urlParams.utm_content,
      target: route === DeepLinkRoute.INVALID ? url : undefined,
    }).filter(([_, value]) => value !== undefined),
  ) as AnalyticsEventProperties;

  // Create the AnalyticsEventBuilder with all deep link properties
  const eventBuilder = AnalyticsEventBuilder.createEventBuilder(
    MetaMetricsEvents.DEEP_LINK_USED,
  )
    .addProperties(eventProperties)
    .addSensitiveProperties(sensitiveProperties);

  return eventBuilder;
};
