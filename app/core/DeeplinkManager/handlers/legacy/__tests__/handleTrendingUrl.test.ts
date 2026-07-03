import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { EXPLORE_TAB_INDEX } from '../../../../../constants/navigation/exploreTabIndices';
import {
  handleTrendingUrl,
  EXPLORE_TAB_DEEPLINK_PARAM,
  type ExploreTabDeeplinkParam,
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

  it('navigates to trending view by default', async () => {
    await handleTrendingUrl({ actionPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  it('falls back to trending view for unknown screen param', async () => {
    await handleTrendingUrl({ actionPath: '?screen=unknown' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  it('falls back to trending view for unknown tab param', async () => {
    await handleTrendingUrl({ actionPath: '?tab=unknown' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });
});

describe('handleTrendingUrl - explore tabs (tab=...)', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each<[ExploreTabDeeplinkParam, number]>([
    [EXPLORE_TAB_DEEPLINK_PARAM.NOW, EXPLORE_TAB_INDEX.NOW],
    [EXPLORE_TAB_DEEPLINK_PARAM.MACRO, EXPLORE_TAB_INDEX.MACRO],
    [EXPLORE_TAB_DEEPLINK_PARAM.RWAS, EXPLORE_TAB_INDEX.RWAS],
    [EXPLORE_TAB_DEEPLINK_PARAM.CRYPTO, EXPLORE_TAB_INDEX.CRYPTO],
    [EXPLORE_TAB_DEEPLINK_PARAM.SPORTS, EXPLORE_TAB_INDEX.SPORTS],
    [EXPLORE_TAB_DEEPLINK_PARAM.SITES, EXPLORE_TAB_INDEX.SITES],
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

  it('accepts uppercase tab params', async () => {
    await handleTrendingUrl({ actionPath: '?tab=CRYPTO' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW, {
      screen: Routes.TRENDING_FEED,
      params: {
        initialTab: EXPLORE_TAB_INDEX.CRYPTO,
        source: 'deeplink',
      },
    });
  });
});

describe('handleTrendingUrl - full-screen views (screen=...)', () => {
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

  it('activates Explore tab then navigates to the trending tokens full view', async () => {
    await handleTrendingUrl({ actionPath: '?screen=trending-tokens' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
    );
  });

  it('activates Explore tab then navigates to the sites full view', async () => {
    await handleTrendingUrl({ actionPath: '?screen=sites' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.SITES_FULL_VIEW);
  });

  it('activates Explore tab then navigates to the sites full view in favorites mode', async () => {
    await handleTrendingUrl({ actionPath: '?screen=favorite-sites' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.SITES_FULL_VIEW, {
      mode: 'favorites',
    });
  });

  it('activates Explore tab then navigates to the explore search screen', async () => {
    await handleTrendingUrl({ actionPath: '?screen=search' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.EXPLORE_SEARCH);
  });

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
