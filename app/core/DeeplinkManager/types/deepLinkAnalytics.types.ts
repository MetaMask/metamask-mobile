/**
 * Type definitions for consolidated deep link analytics
 * Replaces multiple deep link modal events with single DEEP_LINK_USED event
 */

import { DeeplinkUrlParams } from './deepLink.types';

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
  ASSET = 'asset',
  SWAP = 'swap',
  BATCH_SELL = 'batch-sell',
  PERPS = 'perps',
  TRANSACTION = 'transaction',
  BUY = 'buy',
  SELL = 'sell',
  DAPP = 'dapp',
  WC = 'wc',
  REWARDS = 'rewards',
  CREATE_ACCOUNT = 'create-account',
  ONBOARDING = 'onboarding',
  PREDICT = 'predict',
  SHIELD = 'shield',
  TRENDING = 'trending',
  WHATS_HAPPENING = 'whats-happening',
  TOP_TRADERS = 'top-traders',
  SOCIAL_TRADER_POSITION = 'social-trader-position',
  CARD_ONBOARDING = 'card-onboarding',
  CARD_HOME = 'card-home',
  NFT = 'nft',
  // MetaMask Connect (MMC) over the Mobile Wallet Protocol — the current
  // `@metamask/connect` product, internally still named "SDKConnectV2".
  // Its `connect/mwp` deeplinks are intercepted earlier (see handleDeeplink.ts)
  // and tracked here; this is a separate surface from the MetaMask SDK routes
  // below.
  MMC_MWP = 'mmc-mwp',
  AGENTIC_CLI = 'agentic-cli',
  // MetaMask SDK deeplinks (`@metamask/sdk` / sdk-communication-layer) — the
  // older SDK, sometimes called "SDKv1". `connect` and `bind` (ANDROID_SDK) are
  // the same connect surface. `sdk-` (not `mm-`/`mmc-`) keeps this distinct from
  // MMC_MWP above: MetaMask Connect (a.k.a. "SDKv2") is a different product and
  // does NOT map here.
  SDK_CONNECT = 'sdk-connect',
  // MetaMask SDK `mmsdk` deeplinks (the SDK's RPC message channel).
  SDK_MMSDK = 'sdk-mmsdk',
  MONEY = 'money',
  INVALID = 'invalid',
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

  /**
   * Fire-and-forget Branch.io fetch started by `handleUniversalLink` so the
   * interstitial / handler flow isn't blocked on it. Awaited later by
   * `createDeepLinkUsedEventBuilder` when building the analytics event
   */
  branchParamsPromise?: Promise<BranchParams | undefined>;

  /** URL parameters */
  urlParams: Partial<DeeplinkUrlParams>;

  /** Signature validation result */
  signatureStatus: SignatureStatus;

  /** Whether the interstitial was shown */
  interstitialShown: boolean;

  /** User's interstitial preference */
  interstitialDisabled: boolean;

  /** Interstitial user action */
  interstitialAction?: InterstitialState;
}
