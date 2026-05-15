import { RootState } from '../../reducers';
import { createSelector } from 'reselect';
import { WALLET_HOME_ONBOARDING_STEPS_INITIAL } from '../../constants/walletHomeOnboardingSteps';
import {
  selectHomepageSectionsV1Enabled,
  selectWalletHomeOnboardingStepsEnabled,
} from '../featureFlagController/homepage';

const selectOnboarding = (state: RootState) => state.onboarding;

export const selectCompletedOnboarding = createSelector(
  selectOnboarding,
  (onboardingState) => onboardingState.completedOnboarding,
);

export const selectOnboardingAccountType = createSelector(
  selectOnboarding,
  (onboardingState) => onboardingState.accountType,
);

export const selectPendingSocialLoginMarketingConsentBackfill = createSelector(
  selectOnboarding,
  (onboardingState) =>
    onboardingState?.pendingSocialLoginMarketingConsentBackfill ?? null,
);

export const selectOnboardingIosGoogleWarningSheetLastDismissedAt =
  createSelector(
    selectOnboarding,
    (onboardingState) => onboardingState.iosGoogleWarningSheetLastDismissedAt,
  );

export const selectWalletHomeOnboardingStepsEligible = createSelector(
  selectOnboarding,
  (onboardingState) =>
    onboardingState?.walletHomeOnboardingStepsEligible === true,
);

export const selectWalletHomeOnboardingSkipInitialBalanceWait = createSelector(
  selectOnboarding,
  (onboardingState) =>
    onboardingState?.walletHomeOnboardingSkipInitialBalanceWait === true,
);

export const selectWalletHomeOnboardingSteps = createSelector(
  selectOnboarding,
  (onboardingState) =>
    onboardingState?.walletHomeOnboardingSteps ??
    WALLET_HOME_ONBOARDING_STEPS_INITIAL,
);

export const selectShouldShowWalletHomeOnboardingSteps = createSelector(
  selectWalletHomeOnboardingStepsEligible,
  selectWalletHomeOnboardingSteps,
  (eligible, steps) => eligible && steps?.suppressedReason === null,
);

export const selectInWalletHomeOnboardingFlow = createSelector(
  selectHomepageSectionsV1Enabled,
  selectWalletHomeOnboardingStepsEnabled,
  selectShouldShowWalletHomeOnboardingSteps,
  (sectionsV1, stepsEnabled, shouldShow) =>
    sectionsV1 && stepsEnabled && shouldShow,
);
