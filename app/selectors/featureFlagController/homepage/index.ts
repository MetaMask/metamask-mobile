import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const homepageSectionsV1Key = 'homepageSectionsV1';

export const selectHomepageSectionsV1Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags[
      homepageSectionsV1Key
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
