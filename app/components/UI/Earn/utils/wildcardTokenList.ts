/**
 * Wildcard Token List Utility Functions
 *
 * Generic utilities for working with chain-to-token mappings that support wildcards.
 * Used to parse remote token catalogs, such as the Money account no-fee deposit list.
 */

/**
 * Wildcard token list type.
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
