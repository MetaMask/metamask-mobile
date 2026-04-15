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
const walletHomeOnboardingStepsKey = 'walletHomeOnboardingSteps';

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

/**
 * Remote flag for the wallet home post-onboarding steps (multi-step empty-balance tile).
 * Defaults to false when absent so rollout is opt-in via remote config.
 */
export const selectWalletHomeOnboardingStepsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags[
      walletHomeOnboardingStepsKey
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
