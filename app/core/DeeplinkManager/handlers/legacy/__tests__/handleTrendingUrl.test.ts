import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { EXPLORE_TAB_INDEX } from '../../../../../constants/navigation/exploreTabIndices';
import {
  handleTrendingUrl,
  EXPLORE_SCREEN_DEEPLINK_PARAM,
  EXPLORE_TAB_DEEPLINK_PARAM,
} from '../handleTrendingUrl';

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

  it.each([[''], ['?screen=unknown'], ['?tab=unknown']])(
    'falls back to trending view for actionPath=%s',
    async (actionPath) => {
      await handleTrendingUrl({ actionPath });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
    },
  );
});

describe('handleTrendingUrl - explore tabs (tab=...)', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<[string, number]>([
    [EXPLORE_TAB_DEEPLINK_PARAM.NOW, EXPLORE_TAB_INDEX.NOW],
    [EXPLORE_TAB_DEEPLINK_PARAM.MACRO, EXPLORE_TAB_INDEX.MACRO],
    [EXPLORE_TAB_DEEPLINK_PARAM.RWAS, EXPLORE_TAB_INDEX.RWAS],
    [EXPLORE_TAB_DEEPLINK_PARAM.CRYPTO, EXPLORE_TAB_INDEX.CRYPTO],
    [EXPLORE_TAB_DEEPLINK_PARAM.SPORTS, EXPLORE_TAB_INDEX.SPORTS],
    [EXPLORE_TAB_DEEPLINK_PARAM.SITES, EXPLORE_TAB_INDEX.SITES],
    ['CRYPTO', EXPLORE_TAB_INDEX.CRYPTO],
  ])(
    'navigates to the Explore feed with tab=%s preselected',
    async (tabParam, expectedIndex) => {
      await handleTrendingUrl({ actionPath: `?tab=${tabParam}` });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW, {
        screen: Routes.TRENDING_FEED,
        params: {
          initialTab: expectedIndex,
          source: 'deeplink',
        },
      });
    },
  );
});

describe('handleTrendingUrl - full-screen views (screen=...)', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<[string, string, object | undefined]>([
    [
      EXPLORE_SCREEN_DEEPLINK_PARAM.STOCKS,
      Routes.WALLET.RWA_TOKENS_FULL_VIEW,
      undefined,
    ],
    ['STOCKS', Routes.WALLET.RWA_TOKENS_FULL_VIEW, undefined],
    [
      EXPLORE_SCREEN_DEEPLINK_PARAM.TRENDING_TOKENS,
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      undefined,
    ],
    [EXPLORE_SCREEN_DEEPLINK_PARAM.SITES, Routes.SITES_FULL_VIEW, undefined],
    [
      EXPLORE_SCREEN_DEEPLINK_PARAM.FAVORITE_SITES,
      Routes.SITES_FULL_VIEW,
      { mode: 'favorites' },
    ],
    [EXPLORE_SCREEN_DEEPLINK_PARAM.SEARCH, Routes.EXPLORE_SEARCH, undefined],
  ])(
    'activates Explore tab then navigates to the full view for screen=%s',
    async (screenParam, expectedRoute, expectedParams) => {
      await handleTrendingUrl({ actionPath: `?screen=${screenParam}` });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
      if (expectedParams) {
        expect(mockNavigate).toHaveBeenNthCalledWith(
          2,
          expectedRoute,
          expectedParams,
        );
      } else {
        expect(mockNavigate).toHaveBeenNthCalledWith(2, expectedRoute);
      }
    },
  );

  it('prioritizes screen over tab when both are provided', async () => {
    await handleTrendingUrl({ actionPath: '?tab=crypto&screen=stocks' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    );
  });
});
