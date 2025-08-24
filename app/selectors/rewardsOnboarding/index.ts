import { createSelector } from 'reselect';
import { RootState } from '../../reducers';

/**
 * Get the rewards onboarding state
 */
const getRewardsOnboardingState = (state: RootState) => state.rewardsOnboarding;

/**
 * Selector to get the active onboarding step
 */
export const selectActiveStep = createSelector(
  [getRewardsOnboardingState],
  (rewardsOnboarding) => rewardsOnboarding.activeStep,
);
