import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Assets unify state feature flag
 */
export interface AssetsUnifyStateFeatureFlag {
  enabled: boolean;
  featureVersion: string | null;
  deprecatedControllers?: string[];
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
 * Checks if a controller is deprecated based on the assets unify state feature flag.
 *
 * @param flagValue - The raw feature flag value.
 * @param controllerName - The name of the controller to check.
 * @returns True if the controller is listed in deprecatedControllers, false otherwise.
 */
export const getIsDeprecatedController = (
  flagValue: unknown,
  controllerName: string,
): boolean => {
  if (!flagValue || typeof flagValue !== 'object') return false;
  const parsed = flagValue as AssetsUnifyStateFeatureFlag;
  return parsed.deprecatedControllers?.includes(controllerName) ?? false;
};

/**
 * Selector factory to check if a specific controller is deprecated.
 *
 * @param controllerName - The name of the controller to check.
 * @returns A selector that returns true if the controller is deprecated.
 */
export const selectIsControllerDeprecated = (controllerName: string) =>
  createSelector(selectRemoteFeatureFlags, (flags) =>
    getIsDeprecatedController(flags[ASSETS_UNIFY_STATE_FLAG], controllerName),
  );

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
