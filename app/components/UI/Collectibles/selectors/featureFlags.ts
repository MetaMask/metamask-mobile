import { createSelector } from 'reselect';
import { isCollectiblesBuildEnabled } from '../../../../constants/featureFlags';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

export const selectCollectiblesEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    validatedVersionGatedFeatureFlag(remoteFeatureFlags?.collectiblesEnabled) ??
    (__DEV__ && isCollectiblesBuildEnabled()),
);
