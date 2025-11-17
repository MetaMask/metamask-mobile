/**
 * mUSD Conversion Utility Functions for Earn namespace
 */

import { Hex } from '@metamask/utils';
import {
  STABLECOIN_SYMBOL_TO_ADDRESS_BY_CHAIN,
  CONVERTIBLE_STABLECOINS_BY_CHAIN,
  SUPPORTED_CONVERSION_CHAIN_IDS,
} from '../constants/musd';

/**
 * Converts a chain-to-symbol allowlist to a chain-to-address mapping.
 * Used to translate the feature flag format to the format used by isMusdConversionPaymentToken.
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
