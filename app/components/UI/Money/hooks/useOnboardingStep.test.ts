import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useOnboardingStep, STEPPER_IDS } from './useOnboardingStep';
import { setOnboardingStepperStep } from '../../../../actions/user';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../actions/user', () => ({
  setOnboardingStepperStep: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSetOnboardingStepperStep =
  setOnboardingStepperStep as jest.MockedFunction<
    typeof setOnboardingStepperStep
  >;

describe('useOnboardingStep', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
  });

  describe('STEPPER_IDS', () => {
    it('exports a MONEY stepper ID', () => {
      expect(STEPPER_IDS.MONEY).toBe('money-home-onboarding-stepper');
    });
  });

  describe('currentStep', () => {
    it('defaults to 0 when onboardingStepperProgress is empty', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() =>
        useOnboardingStep({ stepperId: STEPPER_IDS.MONEY }),
      );

      expect(result.current.currentStep).toBe(0);
    });

    it('returns the stored step for the given stepperId', () => {
      mockUseSelector.mockReturnValue({ [STEPPER_IDS.MONEY]: 2 });

      const { result } = renderHook(() =>
        useOnboardingStep({ stepperId: STEPPER_IDS.MONEY }),
      );

      expect(result.current.currentStep).toBe(2);
    });
  });

  describe('incrementStep', () => {
    it('dispatches setOnboardingStepperStep with stepperId and currentStep + 1', () => {
      mockUseSelector.mockReturnValue({ [STEPPER_IDS.MONEY]: 1 });
      const mockAction = { type: 'SET_ONBOARDING_STEPPER_STEP' };
      mockSetOnboardingStepperStep.mockReturnValue(mockAction as never);

      const { result } = renderHook(() =>
        useOnboardingStep({ stepperId: STEPPER_IDS.MONEY }),
      );

      act(() => {
        result.current.incrementStep();
      });

      expect(mockSetOnboardingStepperStep).toHaveBeenCalledWith(
        STEPPER_IDS.MONEY,
        2,
      );
      expect(mockDispatch).toHaveBeenCalledWith(mockAction);
    });
  });

  describe('isVisible', () => {
    it('returns undefined when totalSteps is not provided', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() =>
        useOnboardingStep({ stepperId: STEPPER_IDS.MONEY }),
      );

      expect(result.current.isVisible).toBeUndefined();
    });

    it('returns true when currentStep is less than totalSteps', () => {
      mockUseSelector.mockReturnValue({ [STEPPER_IDS.MONEY]: 0 });

      const { result } = renderHook(() =>
        useOnboardingStep({ stepperId: STEPPER_IDS.MONEY, totalSteps: 2 }),
      );

      expect(result.current.isVisible).toBe(true);
    });

    it('returns false when currentStep equals totalSteps', () => {
      mockUseSelector.mockReturnValue({ [STEPPER_IDS.MONEY]: 2 });

      const { result } = renderHook(() =>
        useOnboardingStep({ stepperId: STEPPER_IDS.MONEY, totalSteps: 2 }),
      );

      expect(result.current.isVisible).toBe(false);
    });

    it('returns false when currentStep exceeds totalSteps', () => {
      mockUseSelector.mockReturnValue({ [STEPPER_IDS.MONEY]: 5 });

      const { result } = renderHook(() =>
        useOnboardingStep({ stepperId: STEPPER_IDS.MONEY, totalSteps: 2 }),
      );

      expect(result.current.isVisible).toBe(false);
    });
  });
});
