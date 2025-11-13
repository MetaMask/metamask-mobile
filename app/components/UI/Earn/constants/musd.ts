/**
 * mUSD Conversion Constants for Earn namespace
 */

import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';

// mUSD token address on Ethereum mainnet (6 decimals)
export const MUSD_ADDRESS_ETHEREUM =
  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

// Ethereum mainnet chain ID
export const ETHEREUM_MAINNET_CHAIN_ID = '0x1';

// Supported chains for token conversion
export const SUPPORTED_CONVERSION_CHAIN_IDS: Hex[] = [
  NETWORKS_CHAIN_ID.MAINNET, // 0x1
  NETWORKS_CHAIN_ID.ARBITRUM, // 0xa4b1
  NETWORKS_CHAIN_ID.BASE, // 0x2105
  NETWORKS_CHAIN_ID.LINEA_MAINNET, // 0xe708
];

// Stablecoins by chain ID
export const CONVERTIBLE_STABLECOINS_BY_CHAIN: Record<Hex, Hex[]> = {
  [NETWORKS_CHAIN_ID.MAINNET]: [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  ],
  [NETWORKS_CHAIN_ID.ARBITRUM]: [
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
    '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI
  ],
  [NETWORKS_CHAIN_ID.LINEA_MAINNET]: [
    '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', // USDC
    '0xA219439258ca9da29E9Cc4cE5596924745e12B93', // USDT
  ],
  [NETWORKS_CHAIN_ID.BASE]: [
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  ],
};

// Keep backward compatibility - stablecoins eligible for mUSD conversion on Ethereum mainnet
export const MUSD_CONVERTIBLE_STABLECOINS_ETHEREUM: Hex[] =
  CONVERTIBLE_STABLECOINS_BY_CHAIN[NETWORKS_CHAIN_ID.MAINNET];

/**
 * Checks if a token is eligible for mUSD conversion based on its address and chain ID.
 * Centralizes the logic for determining which tokens on which chains can show the "Convert" CTA.
 *
 * @param tokenAddress - The token contract address (case-insensitive)
 * @param chainId - The chain ID where the token exists
 * @returns true if the token is convertible to mUSD, false otherwise
 */
export const isConvertibleToken = (
  tokenAddress: string,
  chainId: string,
): boolean => {
  // Check if the chain is supported
  if (!SUPPORTED_CONVERSION_CHAIN_IDS.includes(chainId as Hex)) {
    return false;
  }

  // Get the list of convertible stablecoins for this chain
  const convertibleTokens = CONVERTIBLE_STABLECOINS_BY_CHAIN[chainId as Hex];
  if (!convertibleTokens) {
    return false;
  }

  // Check if the token address is in the convertible list (case-insensitive)
  return convertibleTokens
    .map((addr) => addr.toLowerCase())
    .includes(tokenAddress.toLowerCase());
};

// TODO: Remove this once we have the type for musdConversion in TransactionType. Requires updating transaction-controller package.
export const MUSD_CONVERSION_TRANSACTION_TYPE =
  'musdConversion' as TransactionType;
