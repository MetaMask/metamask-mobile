import { createSelector } from 'reselect';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/remote-feature-flag-controller';
import { StateWithPartialEngine } from './types';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';

// Extended state type that includes mobile-specific properties
// These properties exist at runtime but are not in the base type definition
interface ExtendedRemoteFeatureFlagControllerState
  extends RemoteFeatureFlagControllerState {
  localOverrides?: Record<string, unknown>;
  rawProcessedRemoteFeatureFlags?: Record<string, unknown>;
}

// Access the controller state directly
export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

export const selectRawFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState: unknown) =>
    (remoteFeatureFlagControllerState as RemoteFeatureFlagControllerState)
      ?.remoteFeatureFlags ?? {},
);

export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState: unknown) => {
    if (isRemoteFeatureFlagOverrideActivated) {
      return {};
    }
    const state =
      remoteFeatureFlagControllerState as ExtendedRemoteFeatureFlagControllerState;
    const localOverrides = state?.localOverrides ?? {};
    const remoteFeatureFlags = state?.remoteFeatureFlags ?? {};
    return {
      ...remoteFeatureFlags,
      ...localOverrides,
    };
  },
);

export const selectLocalOverrides = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState: unknown) =>
    (
      remoteFeatureFlagControllerState as ExtendedRemoteFeatureFlagControllerState
    )?.localOverrides ?? {},
);

export const selectRawProcessedRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState: unknown) =>
    (
      remoteFeatureFlagControllerState as ExtendedRemoteFeatureFlagControllerState
    )?.rawProcessedRemoteFeatureFlags ?? {},
);
