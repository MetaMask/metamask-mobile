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

  it.each([
    { description: 'default explore view', actionPath: '' },
    { description: 'unknown screen param', actionPath: '?screen=unknown' },
    { description: 'unknown tab param', actionPath: '?tab=unknown' },
  ])('falls back to trending view for $description', async ({ actionPath }) => {
    await handleTrendingUrl({ actionPath });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });
});

describe('handleTrendingUrl - explore tabs (tab=...)', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      tabParam: EXPLORE_TAB_DEEPLINK_PARAM.NOW,
      expectedIndex: EXPLORE_TAB_INDEX.NOW,
    },
    {
      tabParam: EXPLORE_TAB_DEEPLINK_PARAM.MACRO,
      expectedIndex: EXPLORE_TAB_INDEX.MACRO,
    },
    {
      tabParam: EXPLORE_TAB_DEEPLINK_PARAM.RWAS,
      expectedIndex: EXPLORE_TAB_INDEX.RWAS,
    },
    {
      tabParam: EXPLORE_TAB_DEEPLINK_PARAM.CRYPTO,
      expectedIndex: EXPLORE_TAB_INDEX.CRYPTO,
    },
    {
      tabParam: EXPLORE_TAB_DEEPLINK_PARAM.SPORTS,
      expectedIndex: EXPLORE_TAB_INDEX.SPORTS,
    },
    {
      tabParam: EXPLORE_TAB_DEEPLINK_PARAM.SITES,
      expectedIndex: EXPLORE_TAB_INDEX.SITES,
    },
    { tabParam: 'CRYPTO', expectedIndex: EXPLORE_TAB_INDEX.CRYPTO },
  ])(
    'navigates to the Explore feed with tab=$tabParam preselected',
    async ({ tabParam, expectedIndex }) => {
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

  it.each([
    {
      screenParam: EXPLORE_SCREEN_DEEPLINK_PARAM.STOCKS,
      expectedRoute: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    },
    {
      screenParam: 'STOCKS',
      expectedRoute: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    },
    {
      screenParam: EXPLORE_SCREEN_DEEPLINK_PARAM.TRENDING_TOKENS,
      expectedRoute: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
    },
    {
      screenParam: EXPLORE_SCREEN_DEEPLINK_PARAM.SITES,
      expectedRoute: Routes.SITES_FULL_VIEW,
    },
    {
      screenParam: EXPLORE_SCREEN_DEEPLINK_PARAM.FAVORITE_SITES,
      expectedRoute: Routes.SITES_FULL_VIEW,
      expectedParams: { mode: 'favorites' },
    },
    {
      screenParam: EXPLORE_SCREEN_DEEPLINK_PARAM.SEARCH,
      expectedRoute: Routes.EXPLORE_SEARCH,
    },
    {
      screenParam: EXPLORE_SCREEN_DEEPLINK_PARAM.SEARCH,
      actionPath: '?screen=search&q=ethereum',
      expectedRoute: Routes.EXPLORE_SEARCH,
      expectedParams: { initialQuery: 'ethereum' },
    },
    {
      screenParam: EXPLORE_SCREEN_DEEPLINK_PARAM.SEARCH,
      actionPath: '?screen=search&query=bitcoin',
      expectedRoute: Routes.EXPLORE_SEARCH,
      expectedParams: { initialQuery: 'bitcoin' },
    },
  ])(
    'activates Explore tab then navigates to the full view for screen=$screenParam',
    async ({ screenParam, actionPath, expectedRoute, expectedParams }) => {
      await handleTrendingUrl({
        actionPath: actionPath ?? `?screen=${screenParam}`,
      });

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
