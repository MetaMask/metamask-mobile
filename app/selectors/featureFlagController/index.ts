import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/remote-feature-flag-controller';

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

/*
 *
 * This file is intended to include only this feature flag root selector
 *
 * Please follow the contributor docs when adding your remote feature flag selector
 * https://github.com/MetaMask/contributor-docs/blob/main/docs/remote-feature-flags.md#mobile
 *
 */
