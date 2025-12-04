import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const homepageRedesignV1Key = 'homepageRedesignV1';

export const selectHomepageRedesignV1Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags[
      homepageRedesignV1Key
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
