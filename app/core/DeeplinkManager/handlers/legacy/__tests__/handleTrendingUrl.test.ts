import { InteractionManager } from 'react-native';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { handleTrendingUrl } from '../handleTrendingUrl';

// Mock Variable used for testing purposes only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockedVar = any;

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
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

  it('navigates to trending view and then RWA tokens full view', () => {
    handleTrendingUrl({ actionPath: '?screen=stocks' });

    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    );
  });

  it('navigates to trending view and then RWA tokens full view with uppercase screen param', () => {
    handleTrendingUrl({ actionPath: '?screen=STOCKS' });

    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    );
  });
});
