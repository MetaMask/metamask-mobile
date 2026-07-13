import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { resolveABTestAssignment } from '../../../util/abTest';
import {
  HUB_PAGE_DISCOVERY_TABS_AB_KEY,
  HUB_PAGE_DISCOVERY_TABS_VARIANTS,
} from '../../../components/Views/Homepage/abTestConfig';
import {
  ONBOARDING_CHECKLIST_STEPPER_AB_KEY,
  ONBOARDING_CHECKLIST_STEPPER_VARIANTS,
} from '../../../components/UI/WalletHomeOnboardingSteps/abTestConfig';

const homepageBalanceBreakdownKey = 'homepageBalanceBreakdownEnabled';

export const selectHomepageBalanceBreakdownEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => true //{
  //   const remoteFlag = remoteFeatureFlags[
  //     homepageBalanceBreakdownKey
  //   ] as unknown as VersionGatedFeatureFlag;
  //   return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  // },
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
 * Onboarding checklist stepper experiment (TMCU-828) assignment.
 *
 * Layered on top of eligible checklist users (`selectShouldShowWalletHomeOnboardingSteps`).
 * UI should read this via `useABTest` so exposure only fires for users who already see
 * the checklist. This selector is provided for tests and non-React consumers; it does not
 * gate the checklist.
 */
export const selectOnboardingChecklistStepperAbTest = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    resolveABTestAssignment(
      remoteFeatureFlags,
      ONBOARDING_CHECKLIST_STEPPER_AB_KEY,
      Object.keys(ONBOARDING_CHECKLIST_STEPPER_VARIANTS),
    ),
);
