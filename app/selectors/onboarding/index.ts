import { RootState } from '../../reducers';
import { createSelector } from 'reselect';

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

export const selectOnboardingIosGoogleWarningSheetPrompted = createSelector(
  selectOnboarding,
  (onboardingState) => onboardingState.iosGoogleWarningSheetPrompted,
);
