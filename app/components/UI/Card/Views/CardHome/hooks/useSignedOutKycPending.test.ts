import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectIsCardAuthenticated } from '../../../../../../selectors/cardController';
import { selectOnboardingId } from '../../../../../../core/redux/slices/card';
import { useCardSDK } from '../../../sdk';
import { useSignedOutKycPending } from './useSignedOutKycPending';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseCardSDK = jest.mocked(useCardSDK);

const setup = ({
  isAuthenticated = false,
  onboardingId = null as string | null,
  verificationState = undefined as string | undefined,
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsCardAuthenticated) return isAuthenticated;
    if (selector === selectOnboardingId) return onboardingId;
    return undefined;
  });
  mockUseCardSDK.mockReturnValue({
    user: verificationState ? { verificationState } : null,
  } as unknown as ReturnType<typeof useCardSDK>);
};

describe('useSignedOutKycPending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is true when signed out and opened from the pending route', () => {
    setup();

    const { result } = renderHook(() => useSignedOutKycPending(true));

    expect(result.current).toBe(true);
  });

  it('is true when signed out and the onboarding session is still pending', () => {
    setup({ onboardingId: 'onboarding-1', verificationState: 'PENDING' });

    const { result } = renderHook(() => useSignedOutKycPending());

    expect(result.current).toBe(true);
  });

  it('is false for a signed-in user, who gets the banner from account data', () => {
    setup({
      isAuthenticated: true,
      onboardingId: 'onboarding-1',
      verificationState: 'PENDING',
    });

    const { result } = renderHook(() => useSignedOutKycPending(true));

    expect(result.current).toBe(false);
  });

  it('is false when signed out with no onboarding session', () => {
    setup({ verificationState: 'PENDING' });

    const { result } = renderHook(() => useSignedOutKycPending());

    expect(result.current).toBe(false);
  });

  it.each(['VERIFIED', 'REJECTED', 'UNVERIFIED'])(
    'is false when the onboarding session is %s',
    (verificationState) => {
      setup({ onboardingId: 'onboarding-1', verificationState });

      const { result } = renderHook(() => useSignedOutKycPending());

      expect(result.current).toBe(false);
    },
  );
});
