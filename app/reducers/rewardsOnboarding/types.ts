/**
 * Rewards onboarding step enumeration
 */
export enum OnboardingStep {
  STEP_1 = 'STEP_1',
  STEP_2 = 'STEP_2',
  STEP_3 = 'STEP_3',
  STEP_4 = 'STEP_4',
  STEP_5 = 'STEP_5',
}

/**
 * Rewards onboarding state interface
 */
export interface RewardsOnboardingState {
  activeStep: OnboardingStep;
}

/**
 * Action types for rewards onboarding
 */
export enum RewardsOnboardingActionType {
  SET_ACTIVE_STEP = 'SET_ACTIVE_STEP',
  RESET_ONBOARDING = 'RESET_ONBOARDING',
}

/**
 * Action interfaces
 */
export interface SetActiveStepAction {
  type: RewardsOnboardingActionType.SET_ACTIVE_STEP;
  payload: {
    step: OnboardingStep;
  };
}

export interface ResetOnboardingAction {
  type: RewardsOnboardingActionType.RESET_ONBOARDING;
}

/**
 * Union type for all rewards onboarding actions
 */
export type RewardsOnboardingAction =
  | SetActiveStepAction
  | ResetOnboardingAction;
