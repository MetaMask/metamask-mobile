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
  SWAP = 'swap',
  PERPS = 'perps',
  DEPOSIT = 'deposit',
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
  ENABLE_CARD_BUTTON = 'enable-card-button',
  CARD_ONBOARDING = 'card-onboarding',
  CARD_HOME = 'card-home',
  NFT = 'nft',
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
