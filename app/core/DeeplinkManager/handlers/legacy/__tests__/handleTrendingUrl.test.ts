import NavigationService from '../../../../NavigationService';
import ReduxService from '../../../../redux';
import Routes from '../../../../../constants/navigation/Routes';
import { handleTrendingUrl } from '../handleTrendingUrl';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));

describe('handleTrendingUrl', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
  const mockGetState = ReduxService.store.getState as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to trending view by default', () => {
    handleTrendingUrl({ actionPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  it('navigates to stocks full view when screen=stocks and user is not geo-blocked', () => {
    mockGetState.mockReturnValue({
      engine: {
        backgroundState: {
          GeolocationController: {
            location: 'AR',
          },
        },
      },
    });

    handleTrendingUrl({ actionPath: '?screen=stocks' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.RWA_TOKENS_FULL_VIEW);
  });

  it('navigates to trending view when screen=stocks and user is geo-blocked', () => {
    mockGetState.mockReturnValue({
      engine: {
        backgroundState: {
          GeolocationController: {
            location: 'US',
          },
        },
      },
    });

    handleTrendingUrl({ actionPath: '?screen=stocks' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });
});
