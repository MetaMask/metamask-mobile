import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { resolveABTestAssignment } from '../../../util/abTest';
import {
  HUB_PAGE_DISCOVERY_TABS_AB_KEY,
  HUB_PAGE_DISCOVERY_TABS_VARIANTS,
} from '../../../components/Views/Homepage/abTestConfig';

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

export const selectHubPageDiscoveryTabsABTest = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    resolveABTestAssignment(
      remoteFeatureFlags,
      HUB_PAGE_DISCOVERY_TABS_AB_KEY,
      Object.keys(HUB_PAGE_DISCOVERY_TABS_VARIANTS),
    ),
);
