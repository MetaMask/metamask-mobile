import { createSelector } from 'reselect';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/remote-feature-flag-controller';
import { StateWithPartialEngine } from './types';
import { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';

// Access the controller state directly - the runtime state includes localOverrides and abTestRawFlags
// even if the type definitions in some nested packages are outdated
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
    // Access localOverrides directly from the runtime state
    // The actual controller state includes localOverrides even if types are outdated
     (
      (
        remoteFeatureFlagControllerState as unknown as RemoteFeatureFlagControllerState & {
          localOverrides?: Record<string, unknown>;
        }
      )?.localOverrides ?? {}
    )
  ,
);
