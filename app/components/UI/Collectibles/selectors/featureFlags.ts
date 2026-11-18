import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

/** Collectibles entry points. Off unless the remote `collectiblesEnabled` flag is on. */
export const selectCollectiblesEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    validatedVersionGatedFeatureFlag(remoteFeatureFlags?.collectiblesEnabled) ??
    false,
);
