import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

export const selectCollectiblesEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    validatedVersionGatedFeatureFlag(remoteFeatureFlags?.collectiblesEnabled) ??
    false,
);
