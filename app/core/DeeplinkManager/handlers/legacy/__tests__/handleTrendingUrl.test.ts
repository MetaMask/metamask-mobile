import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { handleTrendingUrl } from '../handleTrendingUrl';

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

  it('navigates to trending view by default', async () => {
    await handleTrendingUrl({ actionPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });
});

describe('handleTrendingUrl - stocks deeplink (screen=stocks)', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('activates Explore tab then navigates to the RWA tokens full view', async () => {
    await handleTrendingUrl({ actionPath: '?screen=stocks' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    );
  });

  it('activates Explore tab then navigates to the RWA tokens full view with uppercase screen param', async () => {
    await handleTrendingUrl({ actionPath: '?screen=STOCKS' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    );
  });
});
