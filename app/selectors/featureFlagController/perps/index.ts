import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

// Production-safe defaults: HIP-3 disabled in production, enabled in __DEV__ for testing
const DEFAULT_EQUITY_ENABLED = __DEV__; // Enable HIP-3 by default in dev mode
const DEFAULT_ENABLED_DEXS: string[] = []; // Auto-discovery when equity enabled

// Feature flag names
export const PERPS_EQUITY_FEATURE_FLAG_NAME = 'perpsEquityEnabled';
export const PERPS_ENABLED_DEXS_FLAG_NAME = 'perpsEnabledDexs';

/**
 * Selector for HIP-3 equity perps master switch
 * Controls whether HIP-3 (builder-deployed) DEXs are enabled
 *
 * @returns boolean - true = HIP-3 enabled, false = main DEX only (default)
 */
export const selectPerpsEquityEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, PERPS_EQUITY_FEATURE_FLAG_NAME)) {
      return DEFAULT_EQUITY_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      PERPS_EQUITY_FEATURE_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ?? DEFAULT_EQUITY_ENABLED
    );
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
    if (!hasProperty(remoteFeatureFlags, PERPS_ENABLED_DEXS_FLAG_NAME)) {
      return DEFAULT_ENABLED_DEXS;
    }
    const enabledDexs = remoteFeatureFlags[PERPS_ENABLED_DEXS_FLAG_NAME];

    // Validate it's an array of strings
    if (
      !Array.isArray(enabledDexs) ||
      !enabledDexs.every((item) => typeof item === 'string')
    ) {
      return DEFAULT_ENABLED_DEXS;
    }

    return enabledDexs as string[];
  },
);
