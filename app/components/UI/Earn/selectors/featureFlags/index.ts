import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  parseBlockedCountriesEnv,
  VersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import { DEFAULT_MUSD_BLOCKED_COUNTRIES } from '../../constants/musd';
import { CHAIN_IDS } from '@metamask/transaction-controller';

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

/**
 * Selects the geo-blocked countries for mUSD conversion from remote config or local fallback.
 * Returns an array of ISO 3166-1 alpha-2 country codes (e.g., ['GB', 'US']).
 *
 * The Ramps geolocation API returns country codes like "GB" or "US-CA" (country-region).
 * Matching uses startsWith to handle both country-only and country-region formats.
 *
 * Remote flag takes precedence over local env var.
 *
 * Examples:
 * - Remote: { "blockedRegions": ["GB"] }      - Block users in Great Britain
 * - Remote: { "blockedRegions": ["GB", "US"] } - Block users in GB and US
 * - Local env: "GB,US,FR"                        - Block users in GB, US, and FR
 *
 * If both remote and local are unavailable or invalid, defaults to blocking Great Britain.
 */
export const selectMusdConversionBlockedCountries = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    // Try remote flag first (takes precedence)
    const remoteFlag =
      remoteFeatureFlags?.earnMusdConversionGeoBlockedCountries as
        | { blockedRegions?: string[] }
        | undefined;

    if (Array.isArray(remoteFlag?.blockedRegions)) {
      return remoteFlag.blockedRegions;
    }

    // Fallback to local env var
    const envBlockedCountries = parseBlockedCountriesEnv(
      process.env.MM_MUSD_CONVERSION_GEO_BLOCKED_COUNTRIES,
    );

    // If env var is also empty, use default blocked countries
    return envBlockedCountries.length > 0
      ? envBlockedCountries
      : DEFAULT_MUSD_BLOCKED_COUNTRIES;
  },
);

/**
 * The chain IDs on which mUSD token registration is attempted at app mount.
 * Used as the fallback when the remote flag is unavailable.
 */
export const MUSD_TOKEN_REGISTRATION_CHAIN_IDS_FALLBACK = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
  CHAIN_IDS.MONAD,
];

/**
 * Selects the chain IDs on which the mUSD token should be eagerly registered
 * in TokensController at app mount (via useEnsureMusdTokenRegistered).
 *
 * Remote flag takes precedence over the local fallback.
 * An empty remote array is honoured (disabling registration); the fallback is
 * only used when the remote flag is absent or structurally invalid (i.e.
 * `chainIds` is missing or not an array).
 */
export const selectMusdTokenRegistrationChainIds = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    const remoteFlag = remoteFeatureFlags?.earnMusdTokenRegistrationChainIds as
      | { chainIds?: string[] }
      | undefined;

    if (Array.isArray(remoteFlag?.chainIds)) {
      return remoteFlag.chainIds;
    }

    return MUSD_TOKEN_REGISTRATION_CHAIN_IDS_FALLBACK;
  },
);

export const MUSD_BALANCE_CHAIN_IDS_FALLBACK = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
  CHAIN_IDS.MONAD,
];

/**
 * Selects the chain IDs on which mUSD token balance is tracked in useMusdBalance
 */
export const selectMusdBalanceChainIds = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    const remoteFlag = remoteFeatureFlags?.earnMusdBalanceChainIds as
      | { chainIds?: string[] }
      | undefined;

    if (Array.isArray(remoteFlag?.chainIds)) {
      return remoteFlag.chainIds;
    }

    return MUSD_BALANCE_CHAIN_IDS_FALLBACK;
  },
);

/**
 * Selects whether the static Earn section is shown on Wallet Home.
 */
export const selectEarnHomeSectionEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_EARN_HOME_SECTION_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.earnHomeSectionEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);
