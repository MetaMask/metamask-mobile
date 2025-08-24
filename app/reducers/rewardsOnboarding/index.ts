/* eslint-disable @typescript-eslint/default-param-last */

import {
  RewardsOnboardingAction,
  RewardsOnboardingActionType,
  RewardsOnboardingState,
  OnboardingStep,
} from './types';

export * from './types';

/**
 * Initial rewards onboarding state
 */
export const initialRewardsOnboardingState: RewardsOnboardingState = {
  activeStep: OnboardingStep.STEP_1,
};

/**
 * Rewards onboarding reducer
 * Manages the state of the rewards onboarding flow including active step tracking
 */
const rewardsOnboardingReducer = (
  state: RewardsOnboardingState = initialRewardsOnboardingState,
  action: RewardsOnboardingAction,
): RewardsOnboardingState => {
  switch (action.type) {
    case RewardsOnboardingActionType.SET_ACTIVE_STEP:
      return {
        ...state,
        activeStep: action.payload.step,
      };

    case RewardsOnboardingActionType.RESET_ONBOARDING:
      return {
        ...initialRewardsOnboardingState,
      };

    default:
      return state;
  }
};

export default rewardsOnboardingReducer;
