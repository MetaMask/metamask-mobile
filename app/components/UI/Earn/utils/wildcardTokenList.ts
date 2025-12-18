/**
 * Wildcard Token List Utility Functions
 *
 * Generic utilities for working with chain-to-token mappings that support wildcards.
 * Used for mUSD conversion filtering, CTA visibility, and other token filtering needs.
 */

/**
 * Wildcard token list type for mUSD conversion.
 * Maps chain IDs (or "*" for all chains) to arrays of token symbols (or ["*"] for all tokens).
 *
 * @example
 * {
 *   "*": ["USDC"],           // Include USDC on all chains
 *   "0x1": ["*"],            // Include all tokens on Ethereum mainnet
 *   "0xa4b1": ["USDT", "DAI"] // Include USDT and DAI on Arbitrum
 * }
 */
export type WildcardTokenList = Record<string, string[]>;

/**
 * Type guard to validate WildcardTokenList structure.
 * Validates that the value is an object with string keys mapping to string arrays.
 *
 * @param value - Value to validate
 * @returns true if valid WildcardTokenList, false otherwise
 */
export const isValidWildcardTokenList = (
  value: unknown,
): value is WildcardTokenList => {
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
 * Checks if a token is in a wildcard token list.
 * Supports wildcard matching:
 * - "*" as chain key: applies to all chains
 * - "*" in symbol array: applies to all tokens on that chain
 *
 * @param tokenSymbol - The token symbol (case-insensitive)
 * @param wildcardTokenList - The wildcard token list to use
 * @param chainId - The chain ID where the token exists
 * @returns true if the token is in the wildcard token list, false otherwise
 */
export const isTokenInWildcardList = (
  tokenSymbol: string,
  wildcardTokenList: WildcardTokenList = {},
  chainId?: string,
): boolean => {
  if (!chainId || !tokenSymbol) return false;

  const normalizedSymbol = tokenSymbol.toUpperCase();

  // Check global wildcard: wildcardTokenList["*"] includes this symbol
  const globalTokenSymbols = wildcardTokenList['*'];
  if (globalTokenSymbols) {
    if (
      globalTokenSymbols.includes('*') ||
      globalTokenSymbols
        .map((symbol) => symbol.toUpperCase())
        .includes(normalizedSymbol)
    ) {
      return true;
    }
  }

  // Check chain-specific rules
  const chainTokenSymbols = wildcardTokenList[chainId];
  if (chainTokenSymbols) {
    // Chain wildcard: include all tokens on this chain
    if (chainTokenSymbols.includes('*')) {
      return true;
    }
    // Specific symbol check
    if (
      chainTokenSymbols
        .map((symbol) => symbol.toUpperCase())
        .includes(normalizedSymbol)
    ) {
      return true;
    }
  }

  return false;
};
