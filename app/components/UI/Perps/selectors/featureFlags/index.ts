import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import { hasProperty } from '@metamask/utils';
import type { RootState } from '../../../../../reducers';
import { parseCommaSeparatedString } from '../../utils/stringParseUtils';

export const selectPerpsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPerpsServiceInterruptionBannerEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPerpsGtmOnboardingModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_GTM_MODAL_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpGtmOnboardingModalEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for HIP-3 equity perps master switch
 * Controls whether HIP-3 (builder-deployed) DEXs are enabled
 *
 * @returns boolean - true = HIP-3 enabled, false = main DEX only
 */
export const selectPerpsEquityEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_HIP3_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsEquityEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for HIP-3 market whitelist
 * Controls which specific markets are shown to users
 *
 * Only applies when perpsEquityEnabled === true
 *
 * Supports wildcards: "xyz:*" (all xyz markets), "xyz" (shorthand for "xyz:*")
 * Supports specific markets: "xyz:XYZ100", "BTC" (main DEX)
 *
 * @returns string[] - Empty array = enable all markets (discovery mode), non-empty = whitelist
 */
export const selectPerpsEnabledMarkets = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    // Parse local fallback (comma-separated list or empty string)
    const localFallback = process.env.MM_PERPS_HIP3_ENABLED_MARKETS
      ? process.env.MM_PERPS_HIP3_ENABLED_MARKETS.split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    if (!hasProperty(remoteFeatureFlags, 'perpsEnabledMarkets')) {
      return localFallback;
    }

    const enabledMarkets = remoteFeatureFlags.perpsEnabledMarkets;

    // LaunchDarkly always returns comma-separated strings for list values
    if (typeof enabledMarkets === 'string') {
      // Remote empty string intentionally returns [] (discovery mode = allow all)
      return parseCommaSeparatedString(enabledMarkets);
    }

    // Invalid format - use fallback
    return localFallback;
  },
);

/**
 * Selector for HIP-3 market blacklist
 * Controls which specific markets are blocked from being shown
 *
 * Always applied regardless of perpsEquityEnabled state
 *
 * Supports wildcards: "xyz:*" (block all xyz markets), "xyz" (shorthand for "xyz:*")
 * Supports specific markets: "xyz:XYZ100", "BTC" (main DEX)
 *
 * @returns string[] - Empty array = no blocking, non-empty = blacklist
 */
export const selectPerpsBlockedMarkets = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    // Parse local fallback (comma-separated list or empty string)
    const localFallback = process.env.MM_PERPS_HIP3_BLOCKED_MARKETS
      ? process.env.MM_PERPS_HIP3_BLOCKED_MARKETS.split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    if (!hasProperty(remoteFeatureFlags, 'perpsBlockedMarkets')) {
      return localFallback;
    }

    const blockedMarkets = remoteFeatureFlags.perpsBlockedMarkets;

    // LaunchDarkly always returns comma-separated strings for list values
    if (typeof blockedMarkets === 'string') {
      // Remote empty string intentionally returns [] (block nothing)
      return parseCommaSeparatedString(blockedMarkets);
    }

    // Invalid format - use fallback
    return localFallback;
  },
);

/**
 * Selector for HIP-3 configuration version
 * Used by ConnectionManager to detect when HIP-3 config changes and trigger reconnection
 *
 * @param state - Redux root state
 * @returns number - Version increments when HIP-3 config changes
 */
export const selectHip3ConfigVersion = (state: RootState): number =>
  state?.engine?.backgroundState?.PerpsController?.hip3ConfigVersion ?? 0;
