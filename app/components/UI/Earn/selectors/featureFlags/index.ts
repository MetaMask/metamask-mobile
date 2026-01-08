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
