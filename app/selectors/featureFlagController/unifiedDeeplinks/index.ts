import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { getFeatureFlagValue } from '../env';

const DEFAULT_UNIFIED_DEEPLINKS_ENABLED = false;
export const FEATURE_FLAG_NAME = 'unifiedDeeplinksEnabled';

/**
 * Helper function to check if the feature is enabled via remote flag
 * @param remoteFeatureFlag - The remote feature flag value
 * @returns boolean indicating if the feature is enabled
 */
export function isUnifiedDeeplinksFeatureEnabled(
  remoteFeatureFlag: VersionGatedFeatureFlag | undefined,
): boolean {
  if (!remoteFeatureFlag) {
    return DEFAULT_UNIFIED_DEEPLINKS_ENABLED;
  }

  return (
    validatedVersionGatedFeatureFlag(remoteFeatureFlag) ??
    DEFAULT_UNIFIED_DEEPLINKS_ENABLED
  );
}

/**
 * Selector for the unified deeplinks feature flag
 * This flag controls whether to use the new unified deeplink service
 * or the legacy implementation
 */
export const selectUnifiedDeeplinksEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[
          FEATURE_FLAG_NAME
        ] as unknown as VersionGatedFeatureFlag)
      : undefined;

    const remoteValue = isUnifiedDeeplinksFeatureEnabled(remoteFlag);

    // Check for environment variable override (for testing)
    return getFeatureFlagValue(
      process.env.USE_UNIFIED_DEEPLINK_SERVICE,
      remoteValue,
    );
  },
);
