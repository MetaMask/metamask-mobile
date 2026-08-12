import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';

// Access the controller state directly
export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

const selectBasicFunctionalityEnabledForRemoteFlags = (
  state: StateWithPartialEngine,
): boolean => {
  if ('settings' in state && state.settings != null) {
    return Boolean(state.settings.basicFunctionalityEnabled);
  }
  return true;
};

export const selectRawFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {},
);

const selectRemoteFeatureFlagsMerged = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) => {
    const localOverrides =
      remoteFeatureFlagControllerState?.localOverrides ?? {};
    const remoteFeatureFlags =
      remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {};
    return {
      ...remoteFeatureFlags,
      ...localOverrides,
    };
  },
);

/**
 * Merged remote + local override flags, ignoring the basic functionality gate.
 * Use for dev override UI only.
 */
export const selectRemoteFeatureFlagsUnfiltered =
  selectRemoteFeatureFlagsMerged;

/**
 * Primary selector for remote feature flags.
 * Returns an empty object when basic functionality is disabled.
 */
export const selectRemoteFeatureFlags = createSelector(
  selectBasicFunctionalityEnabledForRemoteFlags,
  selectRemoteFeatureFlagsMerged,
  (isBasicFunctionalityEnabled, remoteFeatureFlags) => {
    if (!isBasicFunctionalityEnabled) {
      return {};
    }
    return remoteFeatureFlags;
  },
);

export const selectLocalOverrides = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.localOverrides ?? {},
);

export const selectRawRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.rawRemoteFeatureFlags ?? {},
);
