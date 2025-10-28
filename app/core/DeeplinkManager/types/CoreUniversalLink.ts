/**
 * Core type definitions for unified link handling
 * Supports metamask:// and https:// protocols
 */

export interface CoreLinkParams {
  // Essential params used by both formats
  channelId?: string;
  pubkey?: string;
  account?: string;
  redirect?: string;

  // SDK-specific params
  uri?: string;
  sdkVersion?: string;
  message?: string;
  scheme?: string;
  v?: string;
  rpc?: string;
  originatorInfo?: string;
  request?: string;
  comm?: string;

  // Action-specific params
  screen?: string; // perps, swap navigation
  symbol?: string; // perps asset
  from?: string; // swap source
  to?: string; // swap destination
  amount?: string; // swap amount
  referral?: string; // rewards
  tab?: string; // tab navigation

  // UTM tracking
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  // Other params
  hr?: string; // Hide Return to App (string '1' means true)
  attributionId?: string;

  // Generic extension for future params
  [key: string]: string | undefined;
}

export type LinkProtocol = 'metamask' | 'https';
export type LinkSource =
  | 'branch'
  | 'linking'
  | 'fcm'
  | 'direct'
  | 'notification';

export interface CoreUniversalLink {
  // Original and normalized URLs
  originalUrl: string;
  normalizedUrl: string;

  // Core properties
  protocol: LinkProtocol;
  action: string;
  hostname: string;
  pathname: string;

  // Extracted parameters
  params: CoreLinkParams;

  // Metadata
  metadata: {
    source: LinkSource | string;
    timestamp: number;
    needsAuth: boolean;
    isSDKAction: boolean;
  };
}

// Actions that require authentication
export const AUTH_REQUIRED_ACTIONS = [
  'swap',
  'perps',
  'send',
  'buy',
  'sell',
  'buy-crypto',
  'sell-crypto',
  'deposit',
  'rewards',
] as const;

// SDK-specific actions
export const SDK_ACTIONS = ['connect', 'mmsdk', 'android-sdk', 'bind'] as const;

// All supported actions
export const SUPPORTED_ACTIONS = [
  ...AUTH_REQUIRED_ACTIONS,
  ...SDK_ACTIONS,
  'home',
  'wc',
  'dapp',
  'create-account',
  'onboarding',
  'oauth-redirect',
] as const;

export type SupportedAction = (typeof SUPPORTED_ACTIONS)[number];
