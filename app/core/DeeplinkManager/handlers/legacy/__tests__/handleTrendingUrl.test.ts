import { InteractionManager } from 'react-native';
import NavigationService from '../../../../NavigationService';
import ReduxService from '../../../../redux';
import Routes from '../../../../../constants/navigation/Routes';
import { ONDO_RESTRICTED_COUNTRIES } from '../../../../../util/ondoGeoRestrictions';
import { handleTrendingUrl } from '../handleTrendingUrl';

// Mock Variable used for testing purposes only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedVar = any;

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
    jest
      .mocked(InteractionManager.runAfterInteractions)
      .mockImplementation((task) => {
        if (typeof task === 'function') {
          task();
        }
        return null as MockedVar;
      });
  });

  const geoBlockedCases = [...ONDO_RESTRICTED_COUNTRIES].map((location) => ({
    location,
  }));

  /** ISO codes known to be outside `ONDO_RESTRICTED_COUNTRIES` for stocks deeplink routing. */
  const notBlockedCases = [
    { location: 'AR' },
    { location: 'JP' },
    { location: 'MX' },
  ];

  it.each(geoBlockedCases)(
    'navigates to trending view for geo-blocked country $location',
    ({ location }) => {
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

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
    },
  );

  it.each(notBlockedCases)(
    'navigates to RWA tokens full view for non-geo-blocked country $location',
    ({ location }) => {
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

      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
      expect(mockNavigate).toHaveBeenNthCalledWith(
        2,
        Routes.WALLET.RWA_TOKENS_FULL_VIEW,
      );
    },
  );
});
