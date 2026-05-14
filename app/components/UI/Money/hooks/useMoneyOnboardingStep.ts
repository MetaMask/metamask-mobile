import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectOnboardingStepperProgress } from '../../../../reducers/user/selectors';
import { setOnboardingStepperStep } from '../../../../actions/user';

const MONEY_STEPPER_ID = 'money';

/**
 * Money-scoped hook for tracking onboarding stepper progress.
 *
 * Wraps the generic `onboardingStepperProgress` Redux state with the
 * `'money'` stepper ID. When the stepper is refactored into a shared
 * component, other products create their own hook with a different ID —
 * no new Redux fields needed.
 */
export const useMoneyOnboardingStep = () => {
  const dispatch = useDispatch();
  const progress = useSelector(selectOnboardingStepperProgress);
  const currentStep = progress[MONEY_STEPPER_ID] ?? 0;

  const incrementStep = useCallback(() => {
    dispatch(setOnboardingStepperStep(MONEY_STEPPER_ID, currentStep + 1));
  }, [dispatch, currentStep]);

  return { currentStep, incrementStep };
};
