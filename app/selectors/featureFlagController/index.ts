import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/RemoteFeatureFlagController/utils';

/*
 * RemoteFeatureFlagController state selector
 *
 * Selects the controller state out of redux store
 */
export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

/*
 * Remote feature flags root selector serves specific domain selectors
 * with all feature flag values.
 *
 * When feature flag override is activated, an empty object is returned
 */
export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) => {
    if (isRemoteFeatureFlagOverrideActivated) {
      return {};
    }
    return remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {};
  },
);

// DOMAIN SPECIFIC FEATURE FLAGS GO IN THEIR OWN SUBDIRECTORY.
