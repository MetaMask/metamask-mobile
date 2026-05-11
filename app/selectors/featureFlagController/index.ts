import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';
import { getResolvedRemoteFeatureFlags } from '../../util/remoteFeatureFlag';

// Access the controller state directly
export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

export const selectRawFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {},
);

export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  getResolvedRemoteFeatureFlags,
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
