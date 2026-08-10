import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { EXPLORE_TAB_INDEX } from '../../../../../constants/navigation/exploreTabIndices';
import {
  handleTrendingUrl,
  EXPLORE_SCREEN_DEEPLINK_PARAM,
  EXPLORE_TAB_DEEPLINK_PARAM,
  EXPLORE_TIMEFRAME_DEEPLINK_PARAM,
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

describe('handleTrendingUrl - trending tokens chain filter (chainId=...)', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    {
      description: 'CAIP chain id',
      chainIdParam: 'eip155:4663',
      expectedCaipChainId: 'eip155:4663',
    },
    {
      description: 'hex chain id',
      chainIdParam: '0x2105',
      expectedCaipChainId: 'eip155:8453',
    },
    {
      description: 'decimal chain id',
      chainIdParam: '8453',
      expectedCaipChainId: 'eip155:8453',
    },
  ])(
    'opens the trending tokens view filtered by a $description',
    async ({ chainIdParam, expectedCaipChainId }) => {
      await handleTrendingUrl({
        actionPath: `?screen=trending-tokens&chainId=${chainIdParam}`,
      });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
      expect(mockNavigate).toHaveBeenNthCalledWith(
        2,
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        { initialNetwork: [expectedCaipChainId] },
      );
    },
  );

  it.each([
    { description: 'malformed value', chainIdParam: 'not-a-chain' },
    {
      description: 'chain unsupported by trending',
      chainIdParam: 'eip155:999999',
    },
    { description: 'zero chain id', chainIdParam: '0' },
  ])(
    'opens the unfiltered trending tokens view for a $description',
    async ({ chainIdParam }) => {
      await handleTrendingUrl({
        actionPath: `?screen=trending-tokens&chainId=${chainIdParam}`,
      });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(
        2,
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      );
    },
  );

  it('opens the filtered trending tokens view when only chainId is provided', async () => {
    await handleTrendingUrl({ actionPath: '?chainId=eip155:4663' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      { initialNetwork: ['eip155:4663'] },
    );
  });

  it('falls back to the Explore tab when only an invalid chainId is provided', async () => {
    await handleTrendingUrl({ actionPath: '?chainId=not-a-chain' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  it('prioritizes tab over an implied chain-filtered trending tokens view', async () => {
    await handleTrendingUrl({ actionPath: '?tab=crypto&chainId=eip155:1' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW, {
      screen: Routes.TRENDING_FEED,
      params: {
        initialTab: EXPLORE_TAB_INDEX.CRYPTO,
        source: 'deeplink',
      },
    });
  });

  it('ignores chainId on screens without a chain filter', async () => {
    await handleTrendingUrl({ actionPath: '?screen=stocks&chainId=eip155:1' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    );
  });
});

describe('handleTrendingUrl - trending tokens time filter (timeframe=...)', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(Object.values(EXPLORE_TIMEFRAME_DEEPLINK_PARAM))(
    'opens the trending tokens view with timeframe=%s preselected',
    async (timeframeParam) => {
      await handleTrendingUrl({
        actionPath: `?screen=trending-tokens&timeframe=${timeframeParam}`,
      });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(
        2,
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        { initialTimeOption: timeframeParam },
      );
    },
  );

  it('accepts an uppercase timeframe value', async () => {
    await handleTrendingUrl({
      actionPath: '?screen=trending-tokens&timeframe=24H',
    });

    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      { initialTimeOption: EXPLORE_TIMEFRAME_DEEPLINK_PARAM.TWENTY_FOUR_HOURS },
    );
  });

  it('ignores an unknown timeframe value', async () => {
    await handleTrendingUrl({
      actionPath: '?screen=trending-tokens&timeframe=2d',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
    );
  });

  it('falls back to the Explore tab when only a timeframe is provided', async () => {
    await handleTrendingUrl({ actionPath: '?timeframe=1h' });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
  });

  it('applies chain and time filters together', async () => {
    await handleTrendingUrl({
      actionPath: '?screen=trending-tokens&chainId=eip155:4663&timeframe=6h',
    });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      {
        initialNetwork: ['eip155:4663'],
        initialTimeOption: EXPLORE_TIMEFRAME_DEEPLINK_PARAM.SIX_HOURS,
      },
    );
  });
});
