/**
 * Tests for sections.config.tsx
 * Covers the getItemIdentifier functions added for analytics tracking.
 */

// Mock all heavy dependencies before importing SECTIONS_CONFIG
jest.mock('../../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    WALLET: {
      TRENDING_TOKENS_FULL_VIEW: 'TrendingTokensFullView',
      RWA_TOKENS_FULL_VIEW: 'RwaTokensFullView',
    },
    PERPS: {
      ROOT: 'PerpsRoot',
      MARKET_LIST: 'PerpsMarketList',
      MARKET_DETAILS: 'PerpsMarketDetails',
    },
    PREDICT: {
      ROOT: 'PredictRoot',
      MARKET_LIST: 'PredictMarketList',
    },
    SITES_FULL_VIEW: 'SitesFullView',
  },
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useContext: jest.fn(),
}));

jest.mock(
  '../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => () => null,
);
jest.mock(
  '../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => () => null,
);
jest.mock('../../UI/Perps/components/PerpsMarketRowItem', () => () => null);
jest.mock('../../UI/Perps/hooks', () => ({ usePerpsMarkets: jest.fn() }));
jest.mock('@metamask/perps-controller', () => ({
  filterMarketsByQuery: jest.fn((markets: unknown[]) => markets),
  PERPS_EVENT_VALUE: { SOURCE: { EXPLORE: 'explore' } },
}));
jest.mock('../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));
jest.mock('../../UI/Predict/components/PredictMarketRowItem', () => () => null);
jest.mock(
  '../../UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper',
  () => () => null,
);
jest.mock(
  '../../UI/Sites/components/SiteSkeleton/SiteSkeleton',
  () => () => null,
);
jest.mock('../../UI/Sites/hooks/useSiteData/useSitesData', () => ({
  useSitesData: jest.fn(),
}));
jest.mock(
  '../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch',
  () => ({ useTrendingSearch: jest.fn() }),
);
jest.mock('../../UI/Trending/hooks/useRwaTokens/useRwaTokens', () => ({
  useRwaTokens: jest.fn(),
}));
jest.mock('../../UI/Perps', () => ({ selectPerpsEnabledFlag: jest.fn() }));
jest.mock('../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionContext: {},
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock('../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock('./components/Sections/SectionTypes/SectionCard', () => () => null);
jest.mock(
  './components/Sections/SectionTypes/SectionCarrousel',
  () => () => null,
);
jest.mock(
  './components/Sections/SectionTypes/TilesSection/TileSection',
  () => () => null,
);
jest.mock(
  './components/Sections/SectionTypes/TilesSection/TileTypes/SiteRecentsTileRowItem',
  () => () => null,
);
jest.mock(
  './components/Sections/SectionTypes/TilesSection/TileTypes/SiteRecentsTileSkeleton',
  () => () => null,
);
jest.mock(
  '../../UI/Sites/hooks/useBrowserRecentsSites/useBrowserRecentsSites',
  () => ({
    useBrowserRecentsSites: jest.fn(() => ({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    })),
  }),
);
jest.mock(
  '../../UI/Sites/hooks/useBrowserFavoritesSites/useBrowserFavoritesSites',
  () => ({
    useBrowserFavoritesSites: jest.fn(() => ({ sites: [], isLoading: false })),
  }),
);
jest.mock(
  './components/Sections/SectionTypes/SectionPills/SectionPills',
  () => () => null,
);
jest.mock(
  './components/Sections/SectionTypes/SectionPills/SectionPillsSkeleton',
  () => () => null,
);
jest.mock(
  './components/Sections/SectionTypes/SectionPills/SectionPill',
  () => () => null,
);
jest.mock(
  '../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines',
  () => ({
    useHomepageSparklines: jest.fn(() => ({ sparklines: {} })),
  }),
);
jest.mock('../../UI/Perps/selectors/perpsController', () => ({
  selectPerpsWatchlistMarkets: jest.fn(),
}));
jest.mock('@metamask/utils', () => ({
  isCaipChainId: jest.fn(() => false),
}));
jest.mock('../../../selectors/networkController', () => ({
  selectNetworkConfigurationsByCaipChainId: jest.fn(),
}));
jest.mock('../../UI/Trending/components/TrendingTokenRowItem/utils', () => ({
  getPriceChangeFieldKey: jest.fn(() => 'priceChange24h'),
}));
jest.mock('../../UI/Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => ({ trackTokenClick: jest.fn() })) },
}));
jest.mock('../../hooks/useAddPopularNetwork', () => ({
  useAddPopularNetwork: jest.fn(() => ({ addPopularNetwork: jest.fn() })),
}));
jest.mock('../../../util/networks/customNetworks', () => ({
  PopularList: [],
}));
jest.mock('../../UI/TokenDetails/constants/constants', () => ({
  TokenDetailsSource: { Trending: 'trending' },
}));
jest.mock('../../UI/Predict/components/PredictMarket', () => () => null);
jest.mock(
  '../../UI/Predict/components/PredictMarketSkeleton',
  () => () => null,
);
jest.mock(
  '../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard',
  () => () => null,
);
jest.mock(
  '../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton',
  () => () => null,
);
jest.mock('fuse.js', () =>
  jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue([]),
  })),
);

import { SECTIONS_CONFIG, type SectionId } from './sections.config';

describe('SECTIONS_CONFIG getItemIdentifier', () => {
  // One row per section. Adding a new section => add a row OR rely on the
  // exhaustiveness check below to catch it.
  const cases: {
    section: SectionId;
    item: Record<string, unknown>;
    expected: string;
  }[] = [
    {
      section: 'tokens',
      item: { assetId: 'eip155:1/erc20:0xabc' },
      expected: 'eip155:1/erc20:0xabc',
    },
    {
      section: 'crypto_movers',
      item: { assetId: 'mover-1' },
      expected: 'mover-1',
    },
    { section: 'perps', item: { symbol: 'BTC-USD' }, expected: 'BTC-USD' },
    {
      section: 'rwa_perps',
      item: { symbol: 'AAPL-PERP' },
      expected: 'AAPL-PERP',
    },
    {
      section: 'macro_stocks_commodity_perps',
      item: { symbol: 'GOLD-PERP' },
      expected: 'GOLD-PERP',
    },
    {
      section: 'crypto_perps',
      item: { symbol: 'ETH-PERP' },
      expected: 'ETH-PERP',
    },
    {
      section: 'stocks',
      item: { assetId: 'stock-aapl' },
      expected: 'stock-aapl',
    },
    {
      section: 'predictions',
      item: { id: 'predict-1' },
      expected: 'predict-1',
    },
    {
      section: 'sports_predictions',
      item: { id: 'sport-1' },
      expected: 'sport-1',
    },
    {
      section: 'crypto_predictions',
      item: { id: 'crypto-1' },
      expected: 'crypto-1',
    },
    {
      section: 'politics_predictions',
      item: { id: 'pol-1' },
      expected: 'pol-1',
    },
    { section: 'all_sports', item: { id: 'all-1' }, expected: 'all-1' },
    {
      section: 'sites',
      item: { url: 'https://uniswap.org' },
      expected: 'https://uniswap.org',
    },
    {
      section: 'dapps_recents',
      item: { url: 'https://x.io' },
      expected: 'https://x.io',
    },
    {
      section: 'dapps_favorites',
      item: { url: 'https://y.io' },
      expected: 'https://y.io',
    },
    {
      section: 'dapps_networks',
      item: { url: 'https://z.io' },
      expected: 'https://z.io',
    },
  ];

  it.each(cases)(
    '$section.getItemIdentifier returns $expected',
    ({ section, item, expected }) => {
      expect(SECTIONS_CONFIG[section].getItemIdentifier(item)).toBe(expected);
    },
  );

  it('is defined for every section in SECTIONS_CONFIG', () => {
    for (const id of Object.keys(SECTIONS_CONFIG) as SectionId[]) {
      expect(SECTIONS_CONFIG[id].getItemIdentifier).toBeInstanceOf(Function);
    }
  });
});

// Perps `useSectionData` sorting behavior is tested in `sections/perps.sections.test.ts`,
// colocated with the source.
