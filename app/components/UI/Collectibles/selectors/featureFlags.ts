import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';

export const selectCollectiblesEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.collectiblesEnabled as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
