import { createSelector } from 'reselect';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/remote-feature-flag-controller';
import { StateWithPartialEngine } from './types';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';

// Access the controller state directly
export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState: unknown) => {
    if (isRemoteFeatureFlagOverrideActivated) {
      return {};
    }
    return (
      (
        remoteFeatureFlagControllerState as unknown as RemoteFeatureFlagControllerState
      )?.remoteFeatureFlags ?? {}
    );
  },
);

export const selectLocalOverrides = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState: unknown) =>
    (remoteFeatureFlagControllerState as RemoteFeatureFlagControllerState)
      ?.localOverrides ?? {},
);
