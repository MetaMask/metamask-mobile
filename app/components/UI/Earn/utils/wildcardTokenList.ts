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

/**
 * Gets a WildcardTokenList from remote feature flag or local env var configuration.
 * Remote value takes precedence. Returns empty object if both are invalid/unavailable.
 *
 * @param remoteValue - The remote feature flag value (string or object)
 * @param remoteFlagName - Name of the remote flag (for error messages)
 * @param localEnvValue - The local environment variable value
 * @param localEnvName - Name of the local env var (for error messages)
 * @returns WildcardTokenList from config or empty object
 */
export const getWildcardTokenListFromConfig = (
  remoteValue: unknown,
  remoteFlagName: string,
  localEnvValue: string | undefined,
  localEnvName: string,
): WildcardTokenList => {
  const expectedFormat =
    'Expected format: {"*":["USDC"],"0x1":["*"],"0xa4b1":["USDT","DAI"]}';

  // Try remote value first (takes precedence)
  if (remoteValue) {
    try {
      const parsed =
        typeof remoteValue === 'string' ? JSON.parse(remoteValue) : remoteValue;

      if (isValidWildcardTokenList(parsed)) {
        return parsed;
      }
      console.warn(
        `Remote ${remoteFlagName} produced invalid structure. ${expectedFormat}`,
      );
    } catch (error) {
      console.warn(`Failed to parse remote ${remoteFlagName}:`, error);
    }
  }

  // Fallback to local env var
  if (localEnvValue) {
    try {
      const parsed = JSON.parse(localEnvValue);
      if (isValidWildcardTokenList(parsed)) {
        return parsed;
      }
      console.warn(
        `Local ${localEnvName} produced invalid structure. ${expectedFormat}`,
      );
    } catch (error) {
      console.warn(`Failed to parse ${localEnvName}:`, error);
    }
  }

  return {};
};

/**
 * Checks if a token is allowed based on combined allowlist and blocklist rules.
 *
 * Logic:
 * 1. If allowlist is non-empty, token MUST be in allowlist
 * 2. If blocklist is non-empty, token must NOT be in blocklist
 * 3. Both conditions must pass for the token to be allowed
 *
 * @param tokenSymbol - The token symbol (case-insensitive)
 * @param allowlist - Tokens to allow (empty = allow all)
 * @param blocklist - Tokens to block (empty = block none)
 * @param chainId - The chain ID where the token exists
 * @returns true if the token is allowed, false otherwise
 *
 * @example Allowlist only (specific tokens)
 * isTokenAllowed("USDC", { "0x1": ["USDC", "USDT"] }, {}, "0x1") // → true
 * isTokenAllowed("DAI", { "0x1": ["USDC", "USDT"] }, {}, "0x1") // → false
 *
 * @example Blocklist only (all except certain tokens)
 * isTokenAllowed("USDC", {}, { "*": ["TUSD"] }, "0x1") // → true
 * isTokenAllowed("TUSD", {}, { "*": ["TUSD"] }, "0x1") // → false
 *
 * @example Combined (allowlist + blocklist override)
 * isTokenAllowed("USDT", { "0x1": ["USDC", "USDT"] }, { "*": ["USDT"] }, "0x1") // → false
 */
export const isTokenAllowed = (
  tokenSymbol: string,
  allowlist: WildcardTokenList = {},
  blocklist: WildcardTokenList = {},
  chainId?: string,
): boolean => {
  if (!chainId || !tokenSymbol) return false;

  // Step 1: If allowlist is non-empty, token must be in it
  const hasAllowlist = Object.keys(allowlist).length > 0;
  if (hasAllowlist) {
    const isInAllowlist = isTokenInWildcardList(
      tokenSymbol,
      allowlist,
      chainId,
    );
    if (!isInAllowlist) {
      return false;
    }
  }

  // Step 2: If blocklist is non-empty, token must NOT be in it
  const hasBlocklist = Object.keys(blocklist).length > 0;
  if (hasBlocklist) {
    const isInBlocklist = isTokenInWildcardList(
      tokenSymbol,
      blocklist,
      chainId,
    );
    if (isInBlocklist) {
      return false;
    }
  }

  return true;
};
