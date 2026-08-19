import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectOnboardingStepperProgress } from '../../../../reducers/user/selectors';
import { setOnboardingStepperStep } from '../../../../actions/user';

/**
 * Registry of stepper IDs used across products.
 * Add a new entry here when a new onboarding stepper is introduced.
 */
export const STEPPER_IDS = {
  MONEY: 'money-home-onboarding-stepper',
} as const;

/**
 * Generic hook for tracking onboarding stepper progress.
 *
 * Keyed by `stepperId` so multiple independent steppers can coexist
 * without adding new Redux fields per product. Pass `totalSteps` to
 * derive the `isVisible` flag (true while `currentStep < totalSteps`).
 */
export const useOnboardingStep = ({
  stepperId,
  totalSteps,
}: {
  stepperId: string;
  totalSteps?: number;
}) => {
  const dispatch = useDispatch();
  const progress = useSelector(selectOnboardingStepperProgress);
  const currentStep = progress[stepperId] ?? 0;

  const incrementStep = useCallback(() => {
    dispatch(setOnboardingStepperStep(stepperId, currentStep + 1));
  }, [dispatch, stepperId, currentStep]);

  const isVisible =
    totalSteps !== undefined ? currentStep < totalSteps : undefined;

  return { currentStep, incrementStep, isVisible };
};
