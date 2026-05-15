import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useMoneyOnboardingStep } from './useMoneyOnboardingStep';
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

describe('useMoneyOnboardingStep', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
  });

  describe('currentStep', () => {
    it('defaults to 0 when onboardingStepperProgress is empty', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() => useMoneyOnboardingStep());

      expect(result.current.currentStep).toBe(0);
    });

    it('returns the stored step for the money stepper', () => {
      mockUseSelector.mockReturnValue({ money: 2 });

      const { result } = renderHook(() => useMoneyOnboardingStep());

      expect(result.current.currentStep).toBe(2);
    });

    it('returns 0 when money key is absent but other steppers exist', () => {
      mockUseSelector.mockReturnValue({ earn: 3 });

      const { result } = renderHook(() => useMoneyOnboardingStep());

      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('incrementStep', () => {
    it('dispatches setOnboardingStepperStep with money id and currentStep + 1', () => {
      mockUseSelector.mockReturnValue({ money: 1 });
      const mockAction = { type: 'SET_ONBOARDING_STEPPER_STEP' };
      mockSetOnboardingStepperStep.mockReturnValue(mockAction as never);

      const { result } = renderHook(() => useMoneyOnboardingStep());

      act(() => {
        result.current.incrementStep();
      });

      expect(mockSetOnboardingStepperStep).toHaveBeenCalledWith('money', 2);
      expect(mockDispatch).toHaveBeenCalledWith(mockAction);
    });
  });
});
