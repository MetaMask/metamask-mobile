import { renderHook, act } from '@testing-library/react-hooks';
import { useMoneyNavigation } from './useMoneyNavigation';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';

const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/NavigationService/NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

const { useSelector } = jest.requireMock('react-redux');

describe('useMoneyNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(NavigationService.navigation, { navigate: mockNavigate });
  });

  describe('navigateToMoneyHome', () => {
    it('navigates to onboarding when user has not seen onboarding', () => {
      useSelector.mockReturnValue(false);

      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
    });

    it('navigates to Money home when user has seen onboarding', () => {
      useSelector.mockReturnValue(true);

      const { result } = renderHook(() => useMoneyNavigation());

      act(() => result.current.navigateToMoneyHome());

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ROOT, {
        params: { screen: Routes.MONEY.HOME },
      });
    });
  });
});
