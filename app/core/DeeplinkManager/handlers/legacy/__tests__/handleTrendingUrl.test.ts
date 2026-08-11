import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import { EXPLORE_TAB_INDEX } from '../../../../../constants/navigation/exploreTabIndices';
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

  it.each([
    { description: 'default explore view', actionPath: '' },
    { description: 'unknown screen param', actionPath: '?screen=unknown' },
    { description: 'unknown tab param', actionPath: '?tab=unknown' },
    { description: 'uppercase screen param', actionPath: '?screen=STOCKS' },
    { description: 'uppercase tab param', actionPath: '?tab=CRYPTO' },
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
    { tabParam: 'now', expectedIndex: EXPLORE_TAB_INDEX.NOW },
    { tabParam: 'macro', expectedIndex: EXPLORE_TAB_INDEX.MACRO },
    { tabParam: 'rwas', expectedIndex: EXPLORE_TAB_INDEX.RWAS },
    { tabParam: 'crypto', expectedIndex: EXPLORE_TAB_INDEX.CRYPTO },
    { tabParam: 'sports', expectedIndex: EXPLORE_TAB_INDEX.SPORTS },
    { tabParam: 'sites', expectedIndex: EXPLORE_TAB_INDEX.SITES },
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
      screenParam: 'stocks',
      expectedRoute: Routes.WALLET.RWA_TOKENS_FULL_VIEW,
    },
    {
      screenParam: 'trending-tokens',
      expectedRoute: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
    },
    {
      screenParam: 'sites',
      expectedRoute: Routes.SITES_FULL_VIEW,
    },
    {
      screenParam: 'favorite-sites',
      expectedRoute: Routes.SITES_FULL_VIEW,
      expectedParams: { mode: 'favorites' },
    },
    {
      screenParam: 'search',
      expectedRoute: Routes.EXPLORE_SEARCH,
    },
    {
      screenParam: 'search',
      actionPath: '?screen=search&q=ethereum',
      expectedRoute: Routes.EXPLORE_SEARCH,
      expectedParams: { initialQuery: 'ethereum' },
    },
    {
      screenParam: 'search',
      actionPath: '?screen=search&q=%20ethereum%20',
      expectedRoute: Routes.EXPLORE_SEARCH,
      expectedParams: { initialQuery: 'ethereum' },
    },
    {
      screenParam: 'search',
      actionPath: '?screen=search&query=bitcoin',
      expectedRoute: Routes.EXPLORE_SEARCH,
      expectedParams: { initialQuery: 'bitcoin' },
    },
    {
      screenParam: 'search',
      actionPath: '?screen=search&q=&query=bitcoin',
      expectedRoute: Routes.EXPLORE_SEARCH,
      expectedParams: { initialQuery: 'bitcoin' },
    },
    {
      screenParam: 'search',
      actionPath: '?screen=search&q=%20%20',
      expectedRoute: Routes.EXPLORE_SEARCH,
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
    { description: 'EVM CAIP chain id', chainIdParam: 'eip155:4663' },
    {
      description: 'Solana CAIP chain id',
      chainIdParam: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
  ])(
    'opens the trending tokens view filtered by an $description',
    async ({ chainIdParam }) => {
      await handleTrendingUrl({
        actionPath: `?screen=trending-tokens&chainId=${chainIdParam}`,
      });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.TRENDING_VIEW);
      expect(mockNavigate).toHaveBeenNthCalledWith(
        2,
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        { initialNetwork: [chainIdParam] },
      );
    },
  );

  it.each([
    { description: 'malformed value', chainIdParam: 'not-a-chain' },
    { description: 'hex chain id (not CAIP)', chainIdParam: '0x2105' },
    { description: 'decimal chain id (not CAIP)', chainIdParam: '8453' },
  ])(
    'drops the chain filter for a $description and opens the unfiltered view',
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

  it('trims a padded chain id', async () => {
    await handleTrendingUrl({
      actionPath: '?screen=trending-tokens&chainId=%20eip155%3A4663%20',
    });

    expect(mockNavigate).toHaveBeenNthCalledWith(
      2,
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      { initialNetwork: ['eip155:4663'] },
    );
  });

  it.each([
    { description: 'a valid', chainIdParam: 'eip155:4663' },
    { description: 'an invalid', chainIdParam: '8453' },
  ])(
    'falls back to the Explore tab when only $description chainId is provided',
    async ({ chainIdParam }) => {
      await handleTrendingUrl({ actionPath: `?chainId=${chainIdParam}` });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW);
    },
  );

  it('ignores chainId when a tab is named', async () => {
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

  it.each(['5m', '1h', '6h', '24h'])(
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

  it.each([
    { description: 'an unknown', timeframeParam: '2d' },
    { description: 'an uppercase', timeframeParam: '24H' },
  ])('ignores $description timeframe value', async ({ timeframeParam }) => {
    await handleTrendingUrl({
      actionPath: `?screen=trending-tokens&timeframe=${timeframeParam}`,
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
        initialTimeOption: '6h',
      },
    );
  });
});
