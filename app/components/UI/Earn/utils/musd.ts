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
 * Type guard to validate paymentTokenMap structure.
 * Checks if the value is a valid Record<Hex, Hex[]> mapping.
 * Validates that both keys (chain IDs) and values (token addresses) are hex strings.
 *
 * @param value - Value to validate
 * @returns true if valid, false otherwise
 */
export const isValidPaymentTokenMap = (
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
// TODO: Delete if no longer needed.
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

/**
 * Wildcard blocklist type for mUSD conversion.
 * Maps chain IDs (or "*" for all chains) to arrays of token symbols (or ["*"] for all tokens).
 *
 * @example
 * {
 *   "*": ["USDC"],           // Block USDC on ALL chains
 *   "0x1": ["*"],            // Block ALL tokens on Ethereum mainnet
 *   "0xa4b1": ["USDT", "DAI"] // Block specific tokens on specific chain
 * }
 */
// TODO: Rename to be more generic since we may use this wildcard list for other things.
export type WildcardBlocklist = Record<string, string[]>;

/**
 * Type guard to validate WildcardBlocklist structure.
 * Validates that the value is an object with string keys mapping to string arrays.
 *
 * @param value - Value to validate
 * @returns true if valid WildcardBlocklist, false otherwise
 */
// TODO: Rename to be more generic since we may use this wildcard list for other things.
export const isValidWildcardBlocklist = (
  value: unknown,
): value is WildcardBlocklist => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([key, val]) =>
      typeof key === 'string' &&
      Array.isArray(val) &&
      val.every((symbol) => typeof symbol === 'string'),
  );
};

/**
 * Checks if a token is blocked from being used for mUSD conversion.
 * Supports wildcard matching:
 * - "*" as chain key: applies to all chains
 * - "*" in symbol array: blocks all tokens on that chain
 *
 * @param tokenSymbol - The token symbol (case-insensitive)
 * @param blocklist - The wildcard blocklist to use
 * @param chainId - The chain ID where the token exists
 * @returns true if the token is blocked, false otherwise
 */
export const isMusdConversionPaymentTokenBlocked = (
  tokenSymbol: string,
  blocklist: WildcardBlocklist = {},
  chainId?: string,
): boolean => {
  if (!chainId || !tokenSymbol) return false;

  const normalizedSymbol = tokenSymbol.toUpperCase();

  // Check global wildcard: blocklist["*"] includes this symbol
  const globalBlockedSymbols = blocklist['*'];
  if (globalBlockedSymbols) {
    if (
      globalBlockedSymbols.includes('*') ||
      globalBlockedSymbols
        .map((symbol) => symbol.toUpperCase())
        .includes(normalizedSymbol)
    ) {
      return true;
    }
  }

  // Check chain-specific rules
  const chainBlockedSymbols = blocklist[chainId];
  if (chainBlockedSymbols) {
    // Chain wildcard: block all tokens on this chain
    if (chainBlockedSymbols.includes('*')) {
      return true;
    }
    // Specific symbol check
    if (
      chainBlockedSymbols
        .map((symbol) => symbol.toUpperCase())
        .includes(normalizedSymbol)
    ) {
      return true;
    }
  }

  return false;
};
