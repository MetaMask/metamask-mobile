import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Assets unify state feature flag
 */
export interface AssetsUnifyStateFeatureFlag {
  enabled: boolean;
  featureVersion: string | null;
  minimumVersion?: string | null;
  deprecatedControllers?: string[];
  /**
   * When true (and the unify feature itself is enabled), AssetsController
   * emits Sentry traces via the controller `trace` callback.
   */
  tracesEnabled?: boolean;
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
  if (!flagValue || typeof flagValue !== 'object') {
    return false;
  }

  const parsedFlagValue = flagValue as AssetsUnifyStateFeatureFlag;

  return (
    Boolean(parsedFlagValue?.enabled) &&
    parsedFlagValue?.featureVersion === featureVersionToCheck
  );
};

/**
 * Returns true when AssetsController Sentry tracing should run.
 *
 * Requires the unify feature itself to be enabled for `featureVersion`, and
 * `tracesEnabled: true` on the resolved flag entry. Defaults to false when
 * the field is absent.
 *
 * @param flagValue - The assets-unify-state feature flag.
 * @param featureVersionToCheck - The feature version to check.
 * @returns Whether AssetsController tracing should run.
 */
export const isAssetsUnifyStateTracesEnabled = (
  flagValue: unknown,
  featureVersionToCheck: string = ASSETS_UNIFY_STATE_FEATURE_VERSION_1,
): boolean => {
  if (!isAssetsUnifyStateFeatureEnabled(flagValue, featureVersionToCheck)) {
    return false;
  }

  return (flagValue as AssetsUnifyStateFeatureFlag)?.tracesEnabled === true;
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
