import { createSelector } from 'reselect';
import { RootState } from '../../reducers';

export const selectRemoteFeatureFlagControllerState = (state: RootState) =>
  state.engine.backgroundState.RemoteFeatureFlagController;

export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState.remoteFeatureFlags
);

export const selectRemoteFeatureFlagsCacheTimestamp = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) =>
    remoteFeatureFlagControllerState.cacheTimestamp
);

