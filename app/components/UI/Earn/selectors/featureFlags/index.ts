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

/**
 * Selects the flag to determine if the "Get/Buy mUSD" CTA should be displayed.
 * Returns true if the mUSD conversion flow is enabled and the remote flag is enabled.
 * Returns false otherwise.
 */
export const selectIsMusdGetBuyCtaEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  selectIsMusdConversionFlowEnabledFlag,
  (remoteFeatureFlags, isMusdConversionFlowEnabled) => {
    const localFlag = process.env.MM_MUSD_CTA_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdCtaEnabled as unknown as VersionGatedFeatureFlag;

    // mUSD conversion flow must be enabled to show the mUSD CTA
    if (!isMusdConversionFlowEnabled) {
      return false;
    }

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selects the flag to determine if the asset overview CTA should be displayed.
 * Returns true if the mUSD conversion flow is enabled and the remote flag is enabled.
 * Returns false otherwise.
 */
export const selectIsMusdConversionAssetOverviewEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  selectIsMusdConversionFlowEnabledFlag,
  (remoteFeatureFlags, isMusdConversionFlowEnabled) => {
    const localFlag =
      process.env.MM_MUSD_CONVERSION_ASSET_OVERVIEW_CTA === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionAssetOverviewCtaEnabled as unknown as VersionGatedFeatureFlag;

    // mUSD conversion flow must be enabled to show the mUSD CTA
    if (!isMusdConversionFlowEnabled) {
      return false;
    }

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selects the flag to determine if the token list item CTA should be displayed.
 * Returns true if the mUSD conversion flow is enabled and the remote flag is enabled.
 * Returns false otherwise.
 */
export const selectIsMusdConversionTokenListItemCtaEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  selectIsMusdConversionFlowEnabledFlag,
  (remoteFeatureFlags, isMusdConversionFlowEnabled) => {
    const localFlag =
      process.env.MM_MUSD_CONVERSION_TOKEN_LIST_ITEM_CTA === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionTokenListItemCtaEnabled as unknown as VersionGatedFeatureFlag;

    // mUSD conversion flow must be enabled to show the mUSD CTA
    if (!isMusdConversionFlowEnabled) {
      return false;
    }

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

/**
 * Selects the flag to determine if the rewards UI elements should be displayed in mUSD conversion flow.
 * Returns true if the mUSD conversion flow is enabled and the remote flag is enabled.
 * Returns false otherwise.
 */
export const selectIsMusdConversionRewardsUiEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  selectIsMusdConversionFlowEnabledFlag,
  (remoteFeatureFlags, isMusdConversionFlowEnabled) => {
    if (!isMusdConversionFlowEnabled) {
      return false;
    }

    const localFlag =
      process.env.MM_MUSD_CONVERSION_REWARDS_UI_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionRewardsUiEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

const FALLBACK_MIN_ASSET_BALANCE_REQUIRED = 0.01; // 1 cent

export const selectMusdConversionMinAssetBalanceRequired = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localRaw = process.env.MM_MUSD_CONVERSION_MIN_ASSET_BALANCE_REQUIRED;
    const local =
      localRaw === undefined ? undefined : Number.parseFloat(localRaw);

    const remoteRaw =
      remoteFeatureFlags?.earnMusdConversionMinAssetBalanceRequired;
    const remote =
      typeof remoteRaw === 'number'
        ? remoteRaw
        : typeof remoteRaw === 'string'
          ? Number.parseFloat(remoteRaw)
          : undefined;

    const remoteValue = Number.isFinite(remote) ? remote : undefined;
    const localValue = Number.isFinite(local) ? local : undefined;

    return remoteValue ?? localValue ?? FALLBACK_MIN_ASSET_BALANCE_REQUIRED;
  },
);

/**
 * Selector for Merkl campaign claiming feature flag
 * Controls visibility of Merkl rewards claiming functionality in the UI
 *
 * @returns boolean - true if Merkl campaign claiming should be shown, false otherwise
 */
export const selectMerklCampaignClaimingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_EARN_MERKL_CAMPAIGN_CLAIMING === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnMerklCampaignClaiming as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
