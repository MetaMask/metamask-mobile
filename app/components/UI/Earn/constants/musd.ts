/**
 * mUSD Conversion Constants for Earn namespace
 */

import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';

// mUSD token address on Ethereum mainnet (6 decimals)
export const MUSD_ADDRESS_ETHEREUM =
  '0xaca92e438df0b2401ff60da7e4337b687a2435da';

// Ethereum mainnet chain ID
export const ETHEREUM_MAINNET_CHAIN_ID = '0x1';

// Supported chains for token conversion
export const SUPPORTED_CONVERSION_CHAIN_IDS: Hex[] = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.ARBITRUM,
  NETWORKS_CHAIN_ID.BASE,
  NETWORKS_CHAIN_ID.LINEA_MAINNET,
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
  [NETWORKS_CHAIN_ID.LINEA_MAINNET]: {
    USDC: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    USDT: '0xa219439258ca9da29e9cc4ce5596924745e12b93',
  },
  [NETWORKS_CHAIN_ID.BSC]: {
    USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    USDT: '0x55d398326f99059ff775485246999027b3197955',
  },
};

/**
 * Converts a chain-to-symbol allowlist to a chain-to-address mapping.
 * Used to translate the feature flag format to the format used by isConvertibleToken.
 *
 * @param allowlistBySymbol - Object mapping chain IDs to arrays of token symbols
 * @returns Object mapping chain IDs to arrays of token addresses
 * @example
 * convertSymbolAllowlistToAddresses({
 *   '0x1': ['USDC', 'USDT', 'DAI'],
 *   '0xa4b1': ['USDC', 'USDT'],
 * });
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
        continue;
      }
      invalidSymbols.push(symbol);
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

export const CONVERTIBLE_STABLECOINS_BY_CHAIN: Record<Hex, Hex[]> = (() => {
  const result: Record<Hex, Hex[]> = {};
  for (const [chainId, symbolMap] of Object.entries(
    STABLECOIN_SYMBOL_TO_ADDRESS_BY_CHAIN,
  )) {
    result[chainId as Hex] = Object.values(symbolMap);
  }
  return result;
})();

/**
 * Checks if a token is an allowed payment token for mUSD conversion based on its address and chain ID.
 * Centralizes the logic for determining which tokens on which chains can show the "Convert" CTA.
 *
 * @param tokenAddress - The token contract address (case-insensitive)
 * @param chainId - The chain ID where the token exists
 * @param allowlist - Optional allowlist to use instead of default CONVERTIBLE_STABLECOINS_BY_CHAIN
 * @returns true if the token is an allowed payment token for mUSD conversion, false otherwise
 */
export const isMusdConversionPaymentToken = (
  tokenAddress: string,
  chainId: string,
  allowlist: Record<Hex, Hex[]> = CONVERTIBLE_STABLECOINS_BY_CHAIN,
): boolean => {
  if (!SUPPORTED_CONVERSION_CHAIN_IDS.includes(chainId as Hex)) {
    return false;
  }

  const convertibleTokens = allowlist[chainId as Hex];
  if (!convertibleTokens) {
    return false;
  }

  return convertibleTokens
    .map((addr) => addr.toLowerCase())
    .includes(tokenAddress.toLowerCase());
};

// TODO: Remove this once we add to TransactionType. Requires updating transaction-controller package.
// Similar to a swap except that output token is predetermined (e.g. mUSD) and the user cannot change it.
export const EVM_TOKEN_CONVERSION_TRANSACTION_TYPE =
  'evmTokenConversion' as TransactionType;
