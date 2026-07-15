import { renderHook, act } from '@testing-library/react-hooks';
import { useMoneyNavigation } from './useMoneyNavigation';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';

const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../reducers/user/selectors', () => ({
  selectMoneyOnboardingSeen: jest.fn(),
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
}: {
  hasSeenOnboarding?: boolean;
  isOnboardingEnabled?: boolean;
} = {}) => {
  useSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneyOnboardingSeen) return hasSeenOnboarding;
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
