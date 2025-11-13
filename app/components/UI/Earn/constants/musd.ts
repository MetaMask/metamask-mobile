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

export const STABLECOIN_SYMBOL_TO_ADDRESS_BY_CHAIN: Record<
  Hex,
  Record<string, Hex>
> = {
  [NETWORKS_CHAIN_ID.MAINNET]: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  [NETWORKS_CHAIN_ID.ARBITRUM]: {
    USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    DAI: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
  },
  [NETWORKS_CHAIN_ID.LINEA_MAINNET]: {
    USDC: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    USDT: '0xa219439258ca9da29e9cc4ce5596924745e12b93',
  },
  [NETWORKS_CHAIN_ID.BASE]: {
    USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  },
};

/**
 * Converts a chain-to-symbol allowlist to a chain-to-address mapping.
 * Used to translate the feature flag format to the format used by isConvertibleToken.
 *
 * @param allowlistBySymbol - Object mapping chain IDs to arrays of token symbols
 * @returns Object mapping chain IDs to arrays of token addresses
 */
export const convertSymbolAllowlistToAddresses = (
  allowlistBySymbol: Record<string, string[]>,
): Record<Hex, Hex[]> => {
  const result: Record<Hex, Hex[]> = {};

  for (const [chainId, symbols] of Object.entries(allowlistBySymbol)) {
    const chainMapping = STABLECOIN_SYMBOL_TO_ADDRESS_BY_CHAIN[chainId as Hex];
    if (!chainMapping) {
      console.warn(
        `[mUSD Allowlist] Unsupported chain ID "${chainId}" in allowlist. ` +
          `Supported chains: ${Object.keys(STABLECOIN_SYMBOL_TO_ADDRESS_BY_CHAIN).join(', ')}`,
      );
      continue;
    }

    const addresses: Hex[] = [];
    const invalidSymbols: string[] = [];

    for (const symbol of symbols) {
      const address = chainMapping[symbol];
      if (address) {
        addresses.push(address);
      } else {
        invalidSymbols.push(symbol);
      }
    }

    if (invalidSymbols.length > 0) {
      console.warn(
        `[mUSD Allowlist] Invalid token symbols for chain ${chainId}: ${invalidSymbols.join(', ')}. ` +
          `Supported tokens: ${Object.keys(chainMapping).join(', ')}`,
      );
    }

    if (addresses.length > 0) {
      result[chainId as Hex] = addresses;
    }
  }

  return result;
};

// Stablecoins by chain ID
export const CONVERTIBLE_STABLECOINS_BY_CHAIN: Record<Hex, Hex[]> = {
  [NETWORKS_CHAIN_ID.MAINNET]: [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  ],
  [NETWORKS_CHAIN_ID.ARBITRUM]: [
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
  ],
  [NETWORKS_CHAIN_ID.LINEA_MAINNET]: [
    '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // USDC
    '0xa219439258ca9da29e9cc4ce5596924745e12b93', // USDT
  ],
  [NETWORKS_CHAIN_ID.BASE]: [
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
  ],
};

/**
 * Checks if a token is eligible for mUSD conversion based on its address and chain ID.
 * Centralizes the logic for determining which tokens on which chains can show the "Convert" CTA.
 *
 * @param tokenAddress - The token contract address (case-insensitive)
 * @param chainId - The chain ID where the token exists
 * @param allowlist - Optional allowlist to use instead of default CONVERTIBLE_STABLECOINS_BY_CHAIN
 * @returns true if the token is convertible to mUSD, false otherwise
 */
export const isConvertibleToken = (
  tokenAddress: string,
  chainId: string,
  allowlist: Record<Hex, Hex[]> = CONVERTIBLE_STABLECOINS_BY_CHAIN,
): boolean => {
  // Check if the chain is supported
  if (!SUPPORTED_CONVERSION_CHAIN_IDS.includes(chainId as Hex)) {
    return false;
  }

  // Get the list of convertible stablecoins for this chain from the allowlist
  const convertibleTokens = allowlist[chainId as Hex];
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
