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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to trending view by default', () => {
    handleTrendingUrl({ actionPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });
});

describe('handleTrendingUrl - stocks deeplink (screen=stocks)', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
  const mockGetState = ReduxService.store.getState as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      description: 'navigates to stocks full view when user is not geo-blocked',
      location: 'AR',
      expectedRoute: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    },
    {
      description: 'navigates to trending view when user is geo-blocked',
      location: 'US',
      expectedRoute: Routes.TRENDING_VIEW,
    },
  ])('$description', ({ location, expectedRoute }) => {
    mockGetState.mockReturnValue({
      engine: {
        backgroundState: {
          GeolocationController: {
            location,
          },
        },
      },
    });

    handleTrendingUrl({ actionPath: '?screen=stocks' });

    expect(mockNavigate).toHaveBeenCalledWith(expectedRoute);
  });
});
