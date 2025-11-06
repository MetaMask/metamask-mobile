/**
 * Core types and interfaces for unified deep link handling
 */

import { ACTIONS } from '../../../constants/deeplinks';

/**
 * Parameters that can be extracted from deep links
 */
export interface CoreLinkParams {
  // Navigation params
  uri?: string;
  redirect?: string;

  // SDK params
  channelId?: string;
  comm?: string;
  pubkey?: string;
  scheme?: string;
  v?: string;
  rpc?: string;
  sdkVersion?: string;
  message?: string;
  originatorInfo?: string;
  request?: string;

  // Attribution params
  attributionId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  // Account params
  account?: string; // Format: "address@chainId"

  // UI control params
  hr?: boolean; // Hide Return to App button

  // Action-specific paths (populated by normalizer)
  rampPath?: string;
  swapPath?: string;
  dappPath?: string;
  sendPath?: string;
  perpsPath?: string;
  rewardsPath?: string;
  homePath?: string;
  onboardingPath?: string;
  createAccountPath?: string;
  depositCashPath?: string;
  perpsMarketsPath?: string;

  // Additional dynamic params
  [key: string]: string | boolean | undefined;
}

/**
 * Normalized representation of a universal link
 */
export interface CoreUniversalLink {
  // Core properties
  protocol: 'metamask' | 'https' | 'http' | 'wc' | 'ethereum' | 'dapp';
  host?: string;
  action: string;
  params: CoreLinkParams;

  // Metadata
  source: string;
  timestamp: number;
  originalUrl: string;
  normalizedUrl: string;

  // Validation
  isValid: boolean;
  isSupportedAction: boolean;
  isPrivateLink: boolean;
  requiresAuth: boolean;
}

/**
 * Actions that require authentication/signature verification
 */
export const AUTH_REQUIRED_ACTIONS: string[] = [
  ACTIONS.SEND,
  ACTIONS.APPROVE,
  ACTIONS.PAYMENT,
  ACTIONS.CREATE_ACCOUNT,
] as const;

/**
 * MetaMask SDK specific actions
 */
export const SDK_ACTIONS: string[] = [
  ACTIONS.ANDROID_SDK,
  ACTIONS.CONNECT,
  ACTIONS.MMSDK,
] as const;

/**
 * Actions that should bypass the deep link modal
 */
export const WHITELISTED_ACTIONS: string[] = [ACTIONS.WC] as const;

/**
 * Ramp-related actions
 */
export const RAMP_ACTIONS: string[] = [
  ACTIONS.BUY,
  ACTIONS.BUY_CRYPTO,
  ACTIONS.SELL,
  ACTIONS.SELL_CRYPTO,
  ACTIONS.DEPOSIT,
  ACTIONS.RAMP,
] as const;

/**
 * Perpetuals-related actions
 */
export const PERPS_ACTIONS: string[] = [
  ACTIONS.PERPS,
  ACTIONS.PERPS_MARKETS,
  ACTIONS.PERPS_ASSET,
] as const;

/**
 * Supported protocol types
 */
export const SUPPORTED_PROTOCOLS: string[] = [
  'metamask',
  'https',
  'http',
  'wc',
  'ethereum',
  'dapp',
] as const;

/**
 * Default action when none is specified
 */
export const DEFAULT_ACTION: string = ACTIONS.HOME;
