/**
 * General type definitions for deep link functionality
 */

import { ACTIONS } from '../../../constants/deeplinks';

/**
 * Deep link URL parameters interface
 * Contains all possible parameters that can be extracted from deep link URLs
 */
export interface DeeplinkUrlParams {
  uri: string;
  redirect: string;
  channelId: string;
  comm: string;
  pubkey: string;
  scheme?: string;
  v?: string;
  rpc?: string;
  sdkVersion?: string;
  message?: string;
  originatorInfo?: string;
  request?: string;
  attributionId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  account?: string; // This is the format => "address@chainId"
  hr: boolean; // Hide Return to App

  // Route-specific parameters for analytics
  // Common parameters
  from?: string;
  to?: string;
  amount?: string;
  asset?: string;

  // Swap-specific parameters
  slippage?: string;

  // Perps-specific parameters
  symbol?: string;
  screen?: string;
  tab?: string;

  // Deposit-specific parameters
  provider?: string;
  payment_method?: string;
  sub_payment_method?: string;
  fiat_currency?: string;
  fiat_quantity?: string;
  assetId?: string;

  // Transaction-specific parameters
  gas?: string;
  gasPrice?: string;

  // Buy-specific parameters
  crypto_currency?: string;
  crypto_amount?: string;

  // Note: All properties are explicitly defined above
}

/**
 * Deep link modal link types
 */
export enum DeepLinkModalLinkType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  INVALID = 'invalid',
}

/**
 * Handler parameter interfaces for deep link URL processing
 */
export interface HandleRewardsUrlParams {
  rewardsPath: string;
}

export interface HandlePerpsUrlParams {
  perpsPath: string;
}

export interface HandleSwapUrlParams {
  swapPath: string;
}

/**
 * Navigation parameter interfaces for deep link routing
 */
export interface RewardsNavigationParams {
  referral?: string;
}

export interface PerpsNavigationParams {
  screen?: 'tabs' | 'markets' | 'asset' | 'tutorial';
  symbol?: string;
  tab?: string; // For future tab selection within wallet home
  // Future extensibility - add new parameters here:
  // portfolio?: boolean;
  // position?: string;
  // timeframe?: string;
}

/**
 * Supported actions for universal links
 * Subset of ACTIONS that are allowed via universal links for security
 */
export enum SUPPORTED_ACTIONS {
  DAPP = ACTIONS.DAPP,
  BUY = ACTIONS.BUY,
  BUY_CRYPTO = ACTIONS.BUY_CRYPTO,
  SELL = ACTIONS.SELL,
  SELL_CRYPTO = ACTIONS.SELL_CRYPTO,
  DEPOSIT = ACTIONS.DEPOSIT,
  HOME = ACTIONS.HOME,
  SWAP = ACTIONS.SWAP,
  SEND = ACTIONS.SEND,
  CREATE_ACCOUNT = ACTIONS.CREATE_ACCOUNT,
  PERPS = ACTIONS.PERPS,
  PERPS_MARKETS = ACTIONS.PERPS_MARKETS,
  PERPS_ASSET = ACTIONS.PERPS_ASSET,
  REWARDS = ACTIONS.REWARDS,
  WC = ACTIONS.WC,
}
