import compareVersions from 'compare-versions';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import packageJson from '../../../../package.json';

const APP_VERSION = packageJson.version;

/**
 * Assets unify state feature flag
 */
export interface AssetsUnifyStateFeatureFlag {
  enabled: boolean;
  featureVersion: string | null;
  minimumVersion: string | null;
}

export const ASSETS_UNIFY_STATE_FLAG = 'assetsUnifyState';
export const ASSETS_UNIFY_STATE_FEATURE_VERSION_1 = '1';

/**
 * Checks if the assets unify state feature is enabled based on remote feature flags.
 *
 * @param flagValue - The feature flag value to check.
 * @param featureVersionToCheck - The version of the feature to check against.
 * @returns True if the assets unify state feature is enabled, false otherwise.
 */
export const isAssetsUnifyStateFeatureEnabled = (
  flagValue: unknown,
  featureVersionToCheck: string = ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
): boolean => {
  if (!flagValue || !APP_VERSION) {
    return false;
  }

  if (typeof flagValue !== 'object' || flagValue === null) {
    return false;
  }

  const flag = flagValue as AssetsUnifyStateFeatureFlag;
  const { enabled, featureVersion, minimumVersion } = flag;

  if (!enabled) {
    return false;
  }

  if (featureVersion !== featureVersionToCheck) {
    return false;
  }

  if (!minimumVersion) {
    return false;
  }

  try {
    return compareVersions.compare(minimumVersion, APP_VERSION, '<=');
  } catch {
    return false;
  }
};

/**
 * Selector to check if the assets unify state feature is enabled.
 * @returns Boolean indicating if the assets unify state feature is enabled.
 */
export const selectIsAssetsUnifyStateEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const flagValue = remoteFeatureFlags[ASSETS_UNIFY_STATE_FLAG];
    return isAssetsUnifyStateFeatureEnabled(flagValue);
  },
);
