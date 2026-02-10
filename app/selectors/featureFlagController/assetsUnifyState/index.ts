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
 * Asserts that the given value is a valid AssetsUnifyStateFeatureFlag.
 * @param value - The value to check.
 * @returns True if the value is a valid AssetsUnifyStateFeatureFlag, false otherwise.
 */
export const assertAssetsUnifyStateFeatureFlagType = (
  value: unknown,
): value is AssetsUnifyStateFeatureFlag =>
  typeof value === 'object' &&
  value !== null &&
  'enabled' in value &&
  typeof value.enabled === 'boolean' &&
  'featureVersion' in value &&
  (typeof value.featureVersion === 'string' || value.featureVersion === null) &&
  'minimumVersion' in value &&
  (typeof value.minimumVersion === 'string' || value.minimumVersion === null);

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

  if (!assertAssetsUnifyStateFeatureFlagType(flagValue)) {
    return false;
  }

  const { enabled, featureVersion, minimumVersion } = flagValue;

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
