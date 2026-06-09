/**
 * mUSD Conversion Constants for Earn namespace
 */

import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import MusdIcon from '../../../../images/musd-icon-2x.png';

export const MUSD_TOKEN = {
  symbol: 'mUSD',
  name: 'MetaMask USD',
  decimals: 6,
  imageSource: MusdIcon,
  /**
   * Remote image URL used when the token is not yet in the user's wallet token list
   * and a URI-based image source is needed (e.g. for AvatarToken in confirmation screens).
   * The address casing in the path matches the token address on all supported chains.
   */
  image:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
} as const;

/**
 * mUSD token decimals (derived from MUSD_TOKEN for single source of truth)
 */
export const MUSD_DECIMALS = MUSD_TOKEN.decimals;

export const MUSD_CONVERSION_DEFAULT_CHAIN_ID = CHAIN_IDS.MAINNET;

/**
 * mUSD token address (same on all supported chains)
 */
export const MUSD_TOKEN_ADDRESS: Hex =
  '0xaca92e438df0b2401ff60da7e4337b687a2435da';

export const MUSD_TOKEN_ADDRESS_BY_CHAIN: Record<Hex, Hex> = {
  [CHAIN_IDS.MAINNET]: MUSD_TOKEN_ADDRESS,
  [CHAIN_IDS.LINEA_MAINNET]: MUSD_TOKEN_ADDRESS,
  [CHAIN_IDS.BSC]: MUSD_TOKEN_ADDRESS,
  [CHAIN_IDS.MONAD]: MUSD_TOKEN_ADDRESS,
};

/**
 * Check if the given token address is mUSD.
 * mUSD has the same address on all supported chains.
 */
export const isMusdToken = (address?: string): boolean => {
  if (!address) return false;
  const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];
  return address.toLowerCase() === musdAddress.toLowerCase();
};

/**
 * Like {@link isMusdToken} but also requires `chainId` to be a chain where
 * mUSD is actually deployed. Prevents a same-address token on an unsupported
 * chain from being misclassified as mUSD.
 */
export const isMusdTokenOnChain = (
  address?: string,
  chainId?: Hex,
): boolean => {
  if (!address || !chainId) return false;
  const expected = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
  if (!expected) return false;
  return address.toLowerCase() === expected.toLowerCase();
};

/**
 * Chains where mUSD CTA should show (buy routes available).
 * BSC is excluded as buy routes are not yet available.
 */
export const MUSD_BUYABLE_CHAIN_IDS: Hex[] = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
  // CHAIN_IDS.BSC, // TODO: Uncomment once buy routes are available
];

/**
 * Chains where the Money Account surfaces mUSD activity. mUSD exists on
 * several chains for buy/convert flows, but Money Account currently only
 * tracks Monad — inbound mUSD on Mainnet/Linea/BSC is unrelated to it and
 * must not appear in Money activity.
 */
export const MUSD_MONEY_ACCOUNT_CHAIN_IDS: Hex[] = [CHAIN_IDS.MONAD];

/**
 * Like {@link isMusdTokenOnChain} but restricted to chains where the Money
 * Account is active (currently Monad only).
 */
export const isMusdOnMoneyAccountChain = (
  address?: string,
  chainId?: Hex,
): boolean => {
  if (!chainId || !MUSD_MONEY_ACCOUNT_CHAIN_IDS.includes(chainId)) return false;
  return isMusdTokenOnChain(address, chainId);
};

export const MUSD_TOKEN_ASSET_ID_BY_CHAIN: Record<Hex, string> = {
  [CHAIN_IDS.MAINNET]:
    'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  [CHAIN_IDS.LINEA_MAINNET]:
    'eip155:59144/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  [CHAIN_IDS.BSC]: 'eip155:56/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  [CHAIN_IDS.MONAD]:
    'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
};

export const MUSD_CURRENCY = 'MUSD';
export const MUSD_CONVERSION_APY = 3;

// Delay before cleaning up toast tracking entries after final transaction status
export const TOAST_TRACKING_CLEANUP_DELAY_MS = 5000;

/**
 * Default blocked countries for mUSD conversion when no remote or env config is available.
 * This is a safety fallback to ensure geo-blocking is always active.
 */
export const DEFAULT_MUSD_BLOCKED_COUNTRIES = ['GB'];
