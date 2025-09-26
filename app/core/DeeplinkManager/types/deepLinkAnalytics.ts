/**
 * Type definitions for consolidated deep link analytics
 * Replaces multiple deep link modal events with single DEEP_LINK_USED event
 */

/**
 * Interstitial states for deep link modal
 */
export enum InterstitialState {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  NOT_SHOWN = 'not shown',
  SKIPPED = 'skipped',
}

/**
 * Signature validation status
 */
export enum SignatureStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  MISSING = 'missing',
}

/**
 * App installation status
 */
export enum AppInstallationStatus {
  INSTALLED = 'installed',
  NOT_INSTALLED = 'not_installed',
}

/**
 * Route types for deep links
 */
export enum DeepLinkRoute {
  HOME = 'home',
  SWAP = 'swap',
  PERPS = 'perps',
  DEPOSIT = 'deposit',
  TRANSACTION = 'transaction',
  BUY = 'buy',
  INVALID = 'invalid',
}

/**
 * Sensitive properties for different route types
 * These are the query parameters that should be included in analytics
 */
export interface SensitiveProperties {
  // Common properties
  from?: string;
  to?: string;
  amount?: string;
  asset?: string;

  // Swap-specific
  slippage?: string;

  // Perps-specific
  symbol?: string;
  screen?: string;
  tab?: string;

  // Deposit-specific
  provider?: string;
  payment_method?: string;
  sub_payment_method?: string;
  fiat_currency?: string;
  fiat_quantity?: string;

  // Transaction-specific
  gas?: string;
  gasPrice?: string;

  // Buy-specific
  crypto_currency?: string;
  crypto_amount?: string;

  // Any other route-specific parameters
  [key: string]: string | undefined;
}

/**
 * Main deep link analytics event properties
 */
export interface DeepLinkUsedEventProperties {
  /** Route provided by deeplink (e.g., "swap", "perps", "invalid") */
  route: string;

  /** True if MM was already installed, false if deferred deep link via Branch.io */
  was_app_installed: boolean;

  /** Signature validation status */
  signature: SignatureStatus;

  /** Interstitial modal state */
  interstitial: InterstitialState;

  /** Attribution ID query parameter */
  attribution_id?: string;

  /** UTM parameters */
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  /** Actual deeplink URL for invalid links (for debugging) */
  target?: string;

  /** Sensitive properties (route-specific query parameters) */
  sensitiveProperties?: SensitiveProperties;
}

/**
 * Branch.io parameters interface
 */
export interface BranchParams {
  '+is_first_session'?: boolean;
  '+clicked_branch_link'?: boolean;
  '+non_branch_link'?: string;
  BNCUpdateStateInstall?: number;
  '~channel'?: string;
  '~feature'?: string;
  '~campaign'?: string;
  '~stage'?: string;
  '~creation_source'?: string;
  '+referrer'?: string;
  '+phone_number'?: string;
  '+match_guaranteed'?: boolean;
  '+click_timestamp'?: number;
  [key: string]: unknown;
}

/**
 * Deep link analytics context
 * Contains all the information needed to generate the analytics event
 */
export interface DeepLinkAnalyticsContext {
  /** The deep link URL */
  url: string;

  /** Extracted route from the URL */
  route: DeepLinkRoute;

  /** Branch.io parameters for app installation detection */
  branchParams?: BranchParams;

  /** URL parameters */
  urlParams: Record<string, string>;

  /** Signature validation result */
  signatureStatus: SignatureStatus;

  /** Whether the interstitial was shown */
  interstitialShown: boolean;

  /** User's interstitial preference */
  interstitialDisabled: boolean;

  /** Interstitial user action */
  interstitialAction?: 'accepted' | 'rejected';
}
