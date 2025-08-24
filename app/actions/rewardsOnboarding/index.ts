import {
  RewardsOnboardingActionType,
  OnboardingStep,
  SetActiveStepAction,
  ResetOnboardingAction,
} from '../../reducers/rewardsOnboarding/types';

/**
 * Action creator to set the active onboarding step
 * @param step - The step to set as active
 * @returns Action to set active step
 */
export const setActiveStep = (step: OnboardingStep): SetActiveStepAction => ({
  type: RewardsOnboardingActionType.SET_ACTIVE_STEP,
  payload: {
    step,
  },
});

/**
 * Action creator to reset the onboarding state
 * @returns Action to reset onboarding
 */
export const resetOnboarding = (): ResetOnboardingAction => ({
  type: RewardsOnboardingActionType.RESET_ONBOARDING,
});
