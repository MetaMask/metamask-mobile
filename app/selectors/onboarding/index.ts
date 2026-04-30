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

export const selectOnboardingIosGoogleWarningSheetLastDismissedAt =
  createSelector(
    selectOnboarding,
    (onboardingState) => onboardingState.iosGoogleWarningSheetLastDismissedAt,
  );
