import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import {
  getWildcardTokenListFromConfig,
  WildcardTokenList,
} from '../../utils/wildcardTokenList';

export const selectPooledStakingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_POOLED_STAKING_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPooledStakingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED ===
      'true';
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  });

export const selectStablecoinLendingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const localFlag = process.env.MM_STABLECOIN_LENDING_UI_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectStablecoinLendingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  });

export const selectIsMusdConversionFlowEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MUSD_CONVERSION_FLOW_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionFlowEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectIsMusdCtaEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MUSD_CTA_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdCtaEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selects the tokens to have conversion CTAs (spotlight) from remote config or local fallback.
 * Returns a wildcard list mapping chain IDs (or "*") to token symbols (or ["*"]).
 *
 * Supports wildcards:
 * - "*" as chain key: applies to all chains
 * - "*" in symbol array: blocks all tokens on that chain
 *
 * Examples:
 * - { "*": ["USDC"] }           - Have conversion CTAs for USDC on ALL chains
 * - { "0x1": ["*"] }            - Have conversion CTAs for ALL tokens on Ethereum mainnet
 * - { "0xa4b1": ["USDT", "DAI"] } - Have conversion CTAs for specific tokens on specific chain
 *
 * Remote flag takes precedence over local env var.
 * If both are unavailable, returns {} (no conversion CTAs).
 */
export const selectMusdConversionCTATokens = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList =>
    getWildcardTokenListFromConfig(
      remoteFeatureFlags?.earnMusdConversionCtaTokens,
      'earnMusdConversionCtaTokens',
      process.env.MM_MUSD_CTA_TOKENS,
      'MM_MUSD_CTA_TOKENS',
    ),
);

/**
 * Selector for the mUSD Quick Convert feature flag.
 * This flag enables the Quick Convert Token List screen where users can
 * quickly convert their existing tokens to mUSD via Max or Edit flows.
 *
 * IMPORTANT: Both this flag AND selectIsMusdConversionFlowEnabledFlag must be
 * enabled to show the Quick Convert feature. Use selectIsMusdQuickConvertFullyEnabled
 * for convenience.
 */
// TODO: Reminder: create LaunchDarkly flag for quick convert feature.
export const selectMusdQuickConvertEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MUSD_QUICK_CONVERT_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdQuickConvertEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for the mUSD Quick Convert percentage.
 * Returns a number between 0 and 1 representing the percentage of balance to convert.
 *
 * - When `1.0`: Max mode (100% of balance, current behavior)
 * - When `< 1.0` (e.g., `0.90`): Percentage mode (90% of balance)
 *
 * This is a workaround for the Relay quote system using `EXPECTED_OUTPUT` trade type,
 * which adds fees on top of the requested amount causing insufficient funds for max conversions.
 * Using a percentage (e.g., 90%) leaves room for fees until Relay supports `EXACT_INPUT`.
 */
export const selectMusdQuickConvertPercentage = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): number => {
    const DEFAULT_PERCENTAGE = 1; // Max mode by default

    // Try remote flag first
    const remoteValue = remoteFeatureFlags?.earnMusdQuickConvertPercentage;
    if (
      typeof remoteValue === 'number' &&
      remoteValue > 0 &&
      remoteValue <= 1
    ) {
      return remoteValue;
    }

    // Fallback to local env variable
    const localValue = parseFloat(
      process.env.MM_MUSD_QUICK_CONVERT_PERCENTAGE ?? '',
    );
    if (!isNaN(localValue) && localValue > 0 && localValue <= 1) {
      return localValue;
    }

    return DEFAULT_PERCENTAGE;
  },
);

/**
 * Selects the allowed payment tokens for mUSD conversion from remote config or local fallback.
 * Returns a wildcard allowlist mapping chain IDs (or "*") to token symbols (or ["*"]).
 *
 * Supports wildcards:
 * - "*" as chain key: applies to all chains
 * - "*" in symbol array: allows all tokens on that chain
 *
 * Examples:
 * - { "*": ["USDC"] }           - Allow USDC on ALL chains
 * - { "0x1": ["*"] }            - Allow ALL tokens on Ethereum mainnet
 * - { "0x1": ["USDC", "USDT", "DAI"], "0xe708": ["USDC", "USDT"] } - Allow specific tokens on specific chains
 *
 * Remote flag takes precedence over local env var.
 * If both are unavailable, returns {} (empty allowlist = allow all tokens).
 */
export const selectMusdConversionPaymentTokensAllowlist = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList =>
    getWildcardTokenListFromConfig(
      remoteFeatureFlags?.earnMusdConvertibleTokensAllowlist,
      'earnMusdConvertibleTokensAllowlist',
      process.env.MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST,
      'MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST',
    ),
);

/**
 * Selects the blocked payment tokens for mUSD conversion from remote config or local fallback.
 * Returns a wildcard blocklist mapping chain IDs (or "*") to token symbols (or ["*"]).
 *
 * Supports wildcards:
 * - "*" as chain key: applies to all chains
 * - "*" in symbol array: blocks all tokens on that chain
 *
 * Examples:
 * - { "*": ["USDC"] }           - Block USDC on ALL chains
 * - { "0x1": ["*"] }            - Block ALL tokens on Ethereum mainnet
 * - { "0xa4b1": ["USDT", "DAI"] } - Block specific tokens on specific chain
 *
 * Remote flag takes precedence over local env var.
 * If both are unavailable, returns {} (no blocking).
 */
export const selectMusdConversionPaymentTokensBlocklist = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList =>
    getWildcardTokenListFromConfig(
      remoteFeatureFlags?.earnMusdConvertibleTokensBlocklist,
      'earnMusdConvertibleTokensBlocklist',
      process.env.MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST,
      'MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST',
    ),
);
