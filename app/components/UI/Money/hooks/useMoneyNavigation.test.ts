import { renderHook, act } from '@testing-library/react-hooks';
import {
  useMoneyNavigation,
  useMoneyOnboardingNavigation,
} from './useMoneyNavigation';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import {
  selectMoneyOnboardingSeen,
  selectOnboardingStepperProgress,
} from '../../../../reducers/user/selectors';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { STEPPER_IDS } from './useOnboardingStep';

const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../reducers/user/selectors', () => ({
  selectMoneyOnboardingSeen: jest.fn(),
  selectOnboardingStepperProgress: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyOnboardingStepperAnimationEnabled: jest.fn(),
}));

jest.mock('../../../../core/NavigationService/NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

const { useSelector } = jest.requireMock('react-redux');

const setupSelectorMocks = ({
  hasSeenOnboarding = false,
  isOnboardingEnabled = true,
  isRecoveryVerificationPending = false,
}: {
  hasSeenOnboarding?: boolean;
  isOnboardingEnabled?: boolean;
  isRecoveryVerificationPending?: boolean;
} = {}) => {
  useSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneyOnboardingSeen) return hasSeenOnboarding;
    if (selector === selectOnboardingStepperProgress) {
      return {
        [STEPPER_IDS.MONEY_RECOVERY_VERIFICATION_PENDING]:
          isRecoveryVerificationPending ? 1 : 0,
      };
    }
    if (selector === selectMoneyOnboardingStepperAnimationEnabled)
      return isOnboardingEnabled;
    return undefined;
  });
};

describe('useMoneyNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(NavigationService.navigation, { navigate: mockNavigate });
    setupSelectorMocks();
  });

  describe('navigateToMoneyHome', () => {
    it('requires recovery verification before the first Money visit', () => {
      setupSelectorMocks({ isRecoveryVerificationPending: true });

      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
      expect(mockNavigate).toHaveBeenNthCalledWith(
        2,
        Routes.ONBOARDING.RECOVERY_PROTOTYPE,
        { initialStage: 'verifyMoney' },
      );
    });

    it('navigates to onboarding when user has not seen onboarding and flag is enabled', () => {
      setupSelectorMocks({
        hasSeenOnboarding: false,
        isOnboardingEnabled: true,
      });

      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
    });

    it('navigates to Money home when user has seen onboarding', () => {
      setupSelectorMocks({
        hasSeenOnboarding: true,
        isOnboardingEnabled: true,
      });

      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });

    it('navigates to Money home when onboarding flag is disabled even if onboarding not seen', () => {
      setupSelectorMocks({
        hasSeenOnboarding: false,
        isOnboardingEnabled: false,
      });

      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    });
  });
});

describe('useMoneyOnboardingNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(NavigationService.navigation, { navigate: mockNavigate });
    setupSelectorMocks();
  });

  it('redirects to onboarding with post-onboarding deposit params', () => {
    const params = {
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.DEPOSIT,
        preferredPaymentToken: {
          address: '0xabc' as const,
          chainId: '0x1' as const,
        },
      },
    };
    const { result } = renderHook(() => useMoneyOnboardingNavigation());

    const redirected = result.current.redirectToOnboardingIfNeeded(params);

    expect(redirected).toBe(true);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING, params);
  });

  it.each([
    [
      'onboarding was seen',
      { hasSeenOnboarding: true, isOnboardingEnabled: true },
    ],
    [
      'onboarding flag is disabled',
      { hasSeenOnboarding: false, isOnboardingEnabled: false },
    ],
  ])('returns false when %s', (_description, selectorOptions) => {
    setupSelectorMocks(selectorOptions);
    const { result } = renderHook(() => useMoneyOnboardingNavigation());

    const redirected = result.current.redirectToOnboardingIfNeeded();

    expect(redirected).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
