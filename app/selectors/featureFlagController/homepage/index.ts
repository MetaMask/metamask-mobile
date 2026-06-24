import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { resolveABTestAssignment } from '../../../util/abTest';
import {
  HUB_PAGE_DISCOVERY_TABS_AB_KEY,
  HUB_PAGE_DISCOVERY_TABS_VARIANTS,
  WALLET_HOME_POST_ONBOARDING_AB_KEY,
  WALLET_HOME_POST_ONBOARDING_VARIANTS,
  WalletHomePostOnboardingVariant,
} from '../../../components/Views/Homepage/abTestConfig';
import {
  ONBOARDING_CHECKLIST_STEPPER_AB_KEY,
  ONBOARDING_CHECKLIST_STEPPER_VARIANTS,
} from '../../../components/UI/WalletHomeOnboardingSteps/abTestConfig';

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

/**
 * Onboarding checklist stepper experiment (TMCU-828) assignment.
 *
 * Layered on top of the checklist gate — UI should read this via `useABTest`
 * so exposure only fires for users who already see the checklist. This selector
 * is provided for tests and non-React consumers; it does not gate the checklist.
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
