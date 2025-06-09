import { RootState } from '../../reducers';
import { createSelector } from 'reselect';

const selectOnboarding = (state: RootState) => state.onboarding;

export const selectCompletedOnboarding = createSelector(
  selectOnboarding,
  (onboardingState) => onboardingState.completedOnboarding,
);
