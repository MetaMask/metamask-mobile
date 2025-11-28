/**
 * mUSD Conversion Utility Functions for Earn namespace
 */

import { Hex, isHexString } from '@metamask/utils';
import {
  MUSD_CONVERSION_STABLECOINS_BY_CHAIN_ID,
  CONVERTIBLE_STABLECOINS_BY_CHAIN,
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
    const chainMapping =
      MUSD_CONVERSION_STABLECOINS_BY_CHAIN_ID[chainId as Hex];
    if (!chainMapping) {
      console.warn(
        `[mUSD Allowlist] Unsupported chain ID "${chainId}" in allowlist. ` +
          `Supported chains: ${Object.keys(MUSD_CONVERSION_STABLECOINS_BY_CHAIN_ID).join(', ')}`,
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
 * Type guard to validate allowedPaymentTokens structure.
 * Checks if the value is a valid Record<Hex, Hex[]> mapping.
 * Validates that both keys (chain IDs) and values (token addresses) are hex strings.
 *
 * @param value - Value to validate
 * @returns true if valid, false otherwise
 */
export const areValidAllowedPaymentTokens = (
  value: unknown,
): value is Record<Hex, Hex[]> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([key, val]) =>
      isHexString(key) &&
      Array.isArray(val) &&
      val.every((addr) => isHexString(addr)),
  );
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
  allowlist: Record<Hex, Hex[]> = CONVERTIBLE_STABLECOINS_BY_CHAIN,
  chainId?: string,
): boolean => {
  if (!chainId) return false;

  const convertibleTokens = allowlist[chainId as Hex];
  if (!convertibleTokens) {
    return false;
  }

  return convertibleTokens
    .map((addr) => addr.toLowerCase())
    .includes(tokenAddress.toLowerCase());
};
