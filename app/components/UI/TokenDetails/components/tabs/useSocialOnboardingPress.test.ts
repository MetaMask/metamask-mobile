import { renderHook } from '@testing-library/react-native';
import { useSocialOnboardingPress } from './useSocialOnboardingPress';

let mockIsFocused = true;
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useIsFocused: () => mockIsFocused,
}));

const mockHasAcceptedSocialTerms = jest.fn(() => false);
const mockEnsureSocialTermsAccepted = jest.fn((_navigate: unknown) => false);
jest.mock(
  '../../../../Views/SocialLeaderboard/terms/socialTermsAcceptance',
  () => ({
    hasAcceptedSocialTerms: () => mockHasAcceptedSocialTerms(),
    ensureSocialTermsAccepted: (navigate: unknown) =>
      mockEnsureSocialTermsAccepted(navigate),
  }),
);

describe('useSocialOnboardingPress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
    mockHasAcceptedSocialTerms.mockReturnValue(false);
  });

  it('returns a handler that opens Social onboarding before terms are accepted', () => {
    const { result } = renderHook(() => useSocialOnboardingPress());

    result.current?.();

    expect(mockEnsureSocialTermsAccepted).toHaveBeenCalledWith(mockNavigate);
  });

  it('returns no handler once terms are accepted', () => {
    mockHasAcceptedSocialTerms.mockReturnValue(true);

    const { result } = renderHook(() => useSocialOnboardingPress());

    expect(result.current).toBeUndefined();
  });

  it('re-reads acceptance when the screen regains focus after onboarding', () => {
    const { result, rerender } = renderHook(() => useSocialOnboardingPress());
    expect(result.current).toBeDefined();

    // Onboarding pushes over token details, which blurs it.
    mockIsFocused = false;
    rerender({});
    mockHasAcceptedSocialTerms.mockReturnValue(true);
    mockIsFocused = true;
    rerender({});

    expect(result.current).toBeUndefined();
  });

  it('keeps the cached result while focus does not change', () => {
    const { result, rerender } = renderHook(() => useSocialOnboardingPress());
    mockHasAcceptedSocialTerms.mockReturnValue(true);

    rerender({});

    expect(result.current).toBeDefined();
  });
});
