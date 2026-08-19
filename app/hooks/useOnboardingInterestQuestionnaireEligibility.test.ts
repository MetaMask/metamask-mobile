import { renderHook } from '@testing-library/react-native';
import { useOnboardingInterestQuestionnaireEligibility } from './useOnboardingInterestQuestionnaireEligibility';
import { useABTest } from './useABTest';
import {
  ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY,
  ONBOARDING_INTEREST_QUESTIONNAIRE_AB_TEST_EXPOSURE_OPTIONS,
  ONBOARDING_INTEREST_QUESTIONNAIRE_VARIANTS,
} from '../components/Views/OnboardingInterestQuestionnaire/abTestConfig';

jest.mock('./useABTest');

const mockUseABTest = jest.mocked(useABTest);

describe('useOnboardingInterestQuestionnaireEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns shouldShowQuestionnaire=false when variant is control', () => {
    mockUseABTest.mockReturnValue({
      variant: { showQuestionnaire: false },
      variantName: 'control',
      isActive: false,
    });

    const { result } = renderHook(() =>
      useOnboardingInterestQuestionnaireEligibility(),
    );

    expect(result.current.shouldShowQuestionnaire).toBe(false);
    expect(result.current.variantName).toBe('control');
    expect(result.current.isActive).toBe(false);
  });

  it('returns shouldShowQuestionnaire=true when variant is treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: { showQuestionnaire: true },
      variantName: 'treatment',
      isActive: true,
    });

    const { result } = renderHook(() =>
      useOnboardingInterestQuestionnaireEligibility(),
    );

    expect(result.current.shouldShowQuestionnaire).toBe(true);
    expect(result.current.variantName).toBe('treatment');
    expect(result.current.isActive).toBe(true);
  });

  it('falls back to control (no questionnaire) when flag is missing', () => {
    mockUseABTest.mockReturnValue({
      variant: { showQuestionnaire: false },
      variantName: 'control',
      isActive: false,
    });

    const { result } = renderHook(() =>
      useOnboardingInterestQuestionnaireEligibility(),
    );

    expect(result.current.shouldShowQuestionnaire).toBe(false);
    expect(result.current.isActive).toBe(false);
  });

  it('passes the correct flag key, variants, and exposure options to useABTest', () => {
    mockUseABTest.mockReturnValue({
      variant: { showQuestionnaire: false },
      variantName: 'control',
      isActive: false,
    });

    renderHook(() => useOnboardingInterestQuestionnaireEligibility());

    expect(mockUseABTest).toHaveBeenCalledWith(
      ONBOARDING_INTEREST_QUESTIONNAIRE_AB_KEY,
      ONBOARDING_INTEREST_QUESTIONNAIRE_VARIANTS,
      ONBOARDING_INTEREST_QUESTIONNAIRE_AB_TEST_EXPOSURE_OPTIONS,
    );
  });
});
