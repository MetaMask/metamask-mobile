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

// Plain (non-memoized) composition: a module-load `createSelector(...)` would
// dereference these imported selectors at evaluation time, and this module is
// eagerly pulled in via `app/reducers/index.ts`. Any suite that builds a store
// while partially mocking `featureFlagController/homepage` would then hit
// reselect's "input-selectors must be functions" assertion at require time and
// take down the whole file. Composing at call time keeps it mock/cycle-safe;
// the body is a trivial boolean AND over already-memoized selectors, so there
// is nothing to memoize.
export const selectInWalletHomeOnboardingFlow = (state: RootState): boolean =>
  selectHomepageSectionsV1Enabled(state) &&
  selectWalletHomeOnboardingStepsEnabled(state) &&
  selectShouldShowWalletHomeOnboardingSteps(state);
