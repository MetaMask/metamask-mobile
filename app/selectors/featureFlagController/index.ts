import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/RemoteFeatureFlagController/utils';

export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) => {
    if (isRemoteFeatureFlagOverrideActivated) {
      return {};
    }
    return remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {};
  },
);
