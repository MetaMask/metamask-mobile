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
import { DEFAULT_MUSD_BLOCKED_COUNTRIES } from '../../constants/musd';

// TEMPORARY: When GITHUB_ACTIONS (and not E2E) use build-time default from remote flags; E2E/Bitrise/.js.env use process.env. Remove once Bitrise is deprecated.
export const selectPooledStakingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnPooledStakingEnabled as boolean)
        : process.env.MM_POOLED_STAKING_ENABLED === 'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
  },
);

export const selectPooledStakingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.earnPooledStakingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnPooledStakingServiceInterruptionBannerEnabled as boolean)
        : process.env.MM_POOLED_STAKING_SERVICE_INTERRUPTION_BANNER_ENABLED ===
          'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
  });

export const selectStablecoinLendingEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnStablecoinLendingEnabled as boolean)
        : process.env.MM_STABLECOIN_LENDING_UI_ENABLED === 'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
  },
);

export const selectStablecoinLendingServiceInterruptionBannerEnabledFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.earnStablecoinLendingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnStablecoinLendingServiceInterruptionBannerEnabled as boolean)
        : process.env.MM_STABLE_COIN_SERVICE_INTERRUPTION_BANNER_ENABLED ===
          'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
  });

export const selectIsMusdConversionFlowEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionFlowEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnMusdConversionFlowEnabled as boolean)
        : process.env.MM_MUSD_CONVERSION_FLOW_ENABLED === 'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
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
    if (!isMusdConversionFlowEnabled) {
      return false;
    }
    const remoteFlag =
      remoteFeatureFlags?.earnMusdCtaEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnMusdCtaEnabled as boolean)
        : process.env.MM_MUSD_CTA_ENABLED === 'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
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
    if (!isMusdConversionFlowEnabled) {
      return false;
    }
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionAssetOverviewCtaEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnMusdConversionAssetOverviewCtaEnabled as boolean)
        : process.env.MM_MUSD_CONVERSION_ASSET_OVERVIEW_CTA === 'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
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
    if (!isMusdConversionFlowEnabled) {
      return false;
    }
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionTokenListItemCtaEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnMusdConversionTokenListItemCtaEnabled as boolean)
        : process.env.MM_MUSD_CONVERSION_TOKEN_LIST_ITEM_CTA === 'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
  },
);

/**
 * Selects the tokens to have conversion CTAs (spotlight) from remote config.
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
 * Build-time defaults are seeded into remoteFeatureFlags via builds.yml.
 * If unavailable, returns {} (no conversion CTAs).
 */
export const selectMusdConversionCTATokens = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList =>
    getWildcardTokenListFromConfig(
      remoteFeatureFlags?.earnMusdConversionCtaTokens,
      'earnMusdConversionCtaTokens',
      undefined,
      '', // No local env fallback - build-time defaults are seeded via builds.yml
    ),
);

/**
 * Selects the allowed payment tokens for mUSD conversion from remote config.
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
 * Build-time defaults are seeded into remoteFeatureFlags via builds.yml.
 * If unavailable, returns {} (empty allowlist = allow all tokens).
 */
export const selectMusdConversionPaymentTokensAllowlist = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList =>
    getWildcardTokenListFromConfig(
      remoteFeatureFlags?.earnMusdConvertibleTokensAllowlist,
      'earnMusdConvertibleTokensAllowlist',
      undefined,
      '', // No local env fallback - build-time defaults are seeded via builds.yml
    ),
);

/**
 * Selects the blocked payment tokens for mUSD conversion from remote config.
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
 * Build-time defaults are seeded into remoteFeatureFlags via builds.yml.
 * If unavailable, returns {} (no blocking).
 */
export const selectMusdConversionPaymentTokensBlocklist = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): WildcardTokenList =>
    getWildcardTokenListFromConfig(
      remoteFeatureFlags?.earnMusdConvertibleTokensBlocklist,
      'earnMusdConvertibleTokensBlocklist',
      undefined,
      '', // No local env fallback - build-time defaults are seeded via builds.yml
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

    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionRewardsUiEnabled as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnMusdConversionRewardsUiEnabled as boolean)
        : process.env.MM_MUSD_CONVERSION_REWARDS_UI_ENABLED === 'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
  },
);

/**
 * Parses a comma-separated string of country codes into an array.
 * Returns empty array if input is undefined/empty.
 *
 * @param envValue - Comma-separated country codes (e.g., "GB,US,FR")
 * @returns Array of country codes
 */
export const parseBlockedCountriesEnv = (envValue?: string): string[] => {
  if (!envValue || envValue.trim() === '') {
    return [];
  }
  return envValue
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0);
};

/**
 * Selects the geo-blocked countries for mUSD conversion from remote config.
 * Returns an array of ISO 3166-1 alpha-2 country codes (e.g., ['GB', 'US']).
 *
 * The Ramps geolocation API returns country codes like "GB" or "US-CA" (country-region).
 * Matching uses startsWith to handle both country-only and country-region formats.
 *
 * Build-time defaults are seeded into remoteFeatureFlags via builds.yml.
 *
 * Examples:
 * - Remote: { "blockedRegions": ["GB"] }      - Block users in Great Britain
 * - Remote: { "blockedRegions": ["GB", "US"] } - Block users in GB and US
 *
 * If remote flag is unavailable or invalid, defaults to blocking Great Britain.
 */
export const selectMusdConversionBlockedCountries = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionGeoBlockedCountries as
        | { blockedRegions?: string[] }
        | undefined;

    if (Array.isArray(remoteFlag?.blockedRegions)) {
      return remoteFlag.blockedRegions;
    }

    // Fallback to default blocked countries
    return DEFAULT_MUSD_BLOCKED_COUNTRIES;
  },
);

const FALLBACK_MIN_ASSET_BALANCE_REQUIRED = 0.01; // 1 cent

export const selectMusdConversionMinAssetBalanceRequired = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteRaw =
      remoteFeatureFlags?.earnMusdConversionMinAssetBalanceRequired;
    const remote =
      typeof remoteRaw === 'number'
        ? remoteRaw
        : typeof remoteRaw === 'string'
          ? Number.parseFloat(remoteRaw)
          : undefined;

    const remoteValue = Number.isFinite(remote) ? remote : undefined;

    // Build-time defaults are seeded into remoteFeatureFlags via builds.yml
    return remoteValue ?? FALLBACK_MIN_ASSET_BALANCE_REQUIRED;
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
    const remoteFlag =
      remoteFeatureFlags?.earnMerklCampaignClaiming as unknown as VersionGatedFeatureFlag;
    const fallback =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true'
        ? (remoteFeatureFlags?.earnMerklCampaignClaiming as boolean)
        : process.env.MM_EARN_MERKL_CAMPAIGN_CLAIMING === 'true';
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? fallback;
  },
);
