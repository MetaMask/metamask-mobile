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
  WALLET_HOME_POST_ONBOARDING_AB_KEY,
  WALLET_HOME_POST_ONBOARDING_VARIANTS,
  WalletHomePostOnboardingVariant,
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

export const selectWalletHomePostOnboardingAbTest = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    resolveABTestAssignment(
      remoteFeatureFlags,
      WALLET_HOME_POST_ONBOARDING_AB_KEY,
      Object.keys(WALLET_HOME_POST_ONBOARDING_VARIANTS),
    ),
);

/**
 * Wallet home post-onboarding checklist (empty-balance multi-step tile).
 * Treatment: {@link WalletHomePostOnboardingVariant.PostOnboardingSteps}; control is off.
 */
export const selectWalletHomeOnboardingStepsEnabled = createSelector(
  selectWalletHomePostOnboardingAbTest,
  (assignment) => {
    if (!assignment.isActive) {
      return false;
    }
    return (
      WALLET_HOME_POST_ONBOARDING_VARIANTS[
        assignment.variantName as WalletHomePostOnboardingVariant
      ]?.stepsEnabled === true
    );
  },
);
