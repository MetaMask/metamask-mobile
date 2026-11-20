import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import { navigateToMoneyHomeRoute } from './navigateToMoneyHome';

const mockNavigate = jest.fn();

jest.mock('../../../../core/NavigationService');

describe('navigateToMoneyHomeRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;
  });

  it('navigates to Money Home with pop enabled by default', () => {
    navigateToMoneyHomeRoute();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      },
      { pop: true },
    );
  });

  it('forwards custom pop and analytics context options', () => {
    const analyticsContext = {
      id: 'balance-breakdown-navigation',
      attribution: 'homescreen_balance_breakdown' as const,
    };

    navigateToMoneyHomeRoute({
      pop: false,
      analyticsContext,
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      {
        screen: Routes.MONEY.ROOT,
        params: {
          screen: Routes.MONEY.HOME,
          params: { analyticsContext },
        },
      },
      { pop: false },
    );
  });

  it('propagates navigation errors', () => {
    const error = new Error('Navigation failed');
    mockNavigate.mockImplementationOnce(() => {
      throw error;
    });

    expect(() => navigateToMoneyHomeRoute()).toThrow(error);
  });
});
