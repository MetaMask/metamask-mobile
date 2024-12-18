import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';

export const selectRemoteFeatureFlagControllerState = (state: StateWithPartialEngine) =>
  state.engine.backgroundState.RemoteFeatureFlagController;

export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {}
);
