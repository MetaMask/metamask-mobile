import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import { hasProperty } from '@metamask/utils';

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
    const localFlag = process.env.MM_PERPS_EQUITY_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsEquityEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for HIP-3 DEX whitelist
 * Controls which specific HIP-3 DEXs are shown to users
 *
 * Only applies when perpsEquityEnabled === true
 *
 * @returns string[] - Empty array = auto-discover all DEXs, non-empty = whitelist
 */
export const selectPerpsEnabledDexs = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    // Parse local fallback (comma-separated list or empty string)
    const localFallback = process.env.MM_PERPS_ENABLED_DEXS
      ? process.env.MM_PERPS_ENABLED_DEXS.split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    if (!hasProperty(remoteFeatureFlags, 'perpsEnabledDexs')) {
      return localFallback;
    }

    const enabledDexs = remoteFeatureFlags.perpsEnabledDexs;

    // Validate it's an array of non-empty strings
    if (
      !Array.isArray(enabledDexs) ||
      !enabledDexs.every((item) => typeof item === 'string' && item.length > 0)
    ) {
      return localFallback;
    }

    return enabledDexs as string[];
  },
);
