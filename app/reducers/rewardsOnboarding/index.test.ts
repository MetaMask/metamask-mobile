import rewardsOnboardingReducer, {
  initialRewardsOnboardingState,
  OnboardingStep,
} from './index';
import {
  setActiveStep,
  resetOnboarding,
} from '../../actions/rewardsOnboarding';
import { RewardsOnboardingAction } from './types';

describe('rewardsOnboardingReducer', () => {
  it('should return the initial state', () => {
    expect(
      rewardsOnboardingReducer(undefined, {} as RewardsOnboardingAction),
    ).toEqual(initialRewardsOnboardingState);
  });

  describe('SET_ACTIVE_STEP', () => {
    it('should set the active step', () => {
      const action = setActiveStep(OnboardingStep.STEP_3);
      const expectedState = {
        ...initialRewardsOnboardingState,
        activeStep: OnboardingStep.STEP_3,
      };

      expect(
        rewardsOnboardingReducer(initialRewardsOnboardingState, action),
      ).toEqual(expectedState);
    });
  });

  describe('RESET_ONBOARDING', () => {
    it('should reset to initial state', () => {
      const currentState = {
        activeStep: OnboardingStep.STEP_4,
        isOnboardingActive: false,
        completedSteps: [
          OnboardingStep.STEP_1,
          OnboardingStep.STEP_2,
          OnboardingStep.STEP_3,
        ],
      };
      const action = resetOnboarding();

      expect(rewardsOnboardingReducer(currentState, action)).toEqual(
        initialRewardsOnboardingState,
      );
    });
  });
});
