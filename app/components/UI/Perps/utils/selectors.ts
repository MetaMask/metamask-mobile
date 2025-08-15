import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';

/**
 * Selector for perps enabled feature flag
 * Simple boolean flag from remote feature flags
 */
export const selectPerpsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => Boolean(remoteFeatureFlags?.perpsEnabled),
);
