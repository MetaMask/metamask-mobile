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
  // `remoteFeatureFlags` already has `localOverrides` applied, so consumers
  // receive the effective flag values with no app-side merge needed.
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {},
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

/**
 * Maps threshold feature flag names to their selected group name, which the
 * controller stores separately from the flag value for threshold and A/B flags.
 *
 * Respects the basic functionality gate (returns `{}` when disabled), mirroring
 * `selectRemoteFeatureFlags`, so A/B assignment stays off when the user has
 * turned basic functionality off.
 */
export const selectFeatureFlagThresholdGroups = createSelector(
  selectBasicFunctionalityEnabledForRemoteFlags,
  selectRemoteFeatureFlagControllerState,
  (isBasicFunctionalityEnabled, remoteFeatureFlagControllerState) => {
    if (!isBasicFunctionalityEnabled) {
      return {};
    }
    return remoteFeatureFlagControllerState?.featureFlagThresholdGroups ?? {};
  },
);
