import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';

// Access the controller state directly
export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

export const selectRawFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (
    remoteFeatureFlagControllerState:
      | RemoteFeatureFlagControllerState
      | undefined,
  ) => remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {},
);

export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (
    remoteFeatureFlagControllerState:
      | RemoteFeatureFlagControllerState
      | undefined,
  ) => {
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

export const selectLocalOverrides = createSelector(
  selectRemoteFeatureFlagControllerState,
  (
    remoteFeatureFlagControllerState:
      | RemoteFeatureFlagControllerState
      | undefined,
  ) => remoteFeatureFlagControllerState?.localOverrides ?? {},
);

export const selectRawRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (
    remoteFeatureFlagControllerState:
      | RemoteFeatureFlagControllerState
      | undefined,
  ) => remoteFeatureFlagControllerState?.rawRemoteFeatureFlags ?? {},
);
