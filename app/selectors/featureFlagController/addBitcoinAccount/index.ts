import { createSelector } from 'reselect';
import { isRemoteFeatureFlagOverrideActivated } from '../../../core/Engine/controllers/remote-feature-flag-controller';
import { StateWithPartialEngine } from '../types';

const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) => {
    if (isRemoteFeatureFlagOverrideActivated) {
      return {};
    }
    return remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {};
  },
);

/**
 * Selector to check if the addBitcoinAccount feature flag is enabled.
 * This flag controls whether Bitcoin provider is available for account creation.
 */
export const selectIsAddBitcoinAccountEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => Boolean(remoteFeatureFlags.addBitcoinAccount),
);
