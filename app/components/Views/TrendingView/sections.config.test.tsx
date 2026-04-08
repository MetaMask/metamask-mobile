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
  './components/Sections/SectionTypes/SectionHorizontalScroll',
  () => () => null,
);
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
jest.mock('../../UI/Perps/selectors/perpsController', () => ({
  selectPerpsWatchlistMarkets: jest.fn(),
}));
jest.mock(
  '../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines',
  () => ({
    useHomepageSparklines: jest.fn(() => ({ sparklines: {} })),
  }),
);
jest.mock('fuse.js', () =>
  jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue([]),
  })),
);

import { SECTIONS_CONFIG } from './sections.config';
import SectionHorizontalScroll from './components/Sections/SectionTypes/SectionHorizontalScroll';
import { renderHook } from '@testing-library/react-native';
import { usePerpsMarkets } from '../../UI/Perps/hooks';

describe('SECTIONS_CONFIG getItemIdentifier', () => {
  describe('tokens section', () => {
    it('extracts assetId from a token item', () => {
      const item = { assetId: 'token-abc-123', symbol: 'BTC', name: 'Bitcoin' };

      const result = SECTIONS_CONFIG.tokens.getItemIdentifier(item);

      expect(result).toBe('token-abc-123');
    });

    it('extracts assetId with special characters', () => {
      const item = { assetId: 'eip155:1/erc20:0xabc', symbol: 'USDC' };

      const result = SECTIONS_CONFIG.tokens.getItemIdentifier(item);

      expect(result).toBe('eip155:1/erc20:0xabc');
    });
  });

  describe('perps section', () => {
    it('extracts symbol from a perps market item', () => {
      const item = { symbol: 'BTC-USD', name: 'Bitcoin', price: 50000 };

      const result = SECTIONS_CONFIG.perps.getItemIdentifier(item);

      expect(result).toBe('BTC-USD');
    });

    it('extracts symbol with various market pairs', () => {
      const item = { symbol: 'ETH-PERP', name: 'Ethereum Perpetual' };

      const result = SECTIONS_CONFIG.perps.getItemIdentifier(item);

      expect(result).toBe('ETH-PERP');
    });
  });

  describe('stocks section', () => {
    it('extracts assetId from a stocks item', () => {
      const item = { assetId: 'stock-aapl-456', symbol: 'AAPL', name: 'Apple' };

      const result = SECTIONS_CONFIG.stocks.getItemIdentifier(item);

      expect(result).toBe('stock-aapl-456');
    });
  });

  describe('predictions section', () => {
    it('extracts id from a prediction market item', () => {
      const item = { id: 'predict-market-789', title: 'Will BTC reach 100k?' };

      const result = SECTIONS_CONFIG.predictions.getItemIdentifier(item);

      expect(result).toBe('predict-market-789');
    });

    it('extracts id when item has additional fields', () => {
      const item = {
        id: 'market-42',
        title: 'Election outcome',
        description: 'Who will win?',
        volume: 1000,
      };

      const result = SECTIONS_CONFIG.predictions.getItemIdentifier(item);

      expect(result).toBe('market-42');
    });
  });

  describe('sites section', () => {
    it('extracts url from a site item', () => {
      const item = {
        url: 'https://uniswap.org',
        name: 'Uniswap',
        displayUrl: 'uniswap.org',
      };

      const result = SECTIONS_CONFIG.sites.getItemIdentifier(item);

      expect(result).toBe('https://uniswap.org');
    });

    it('extracts url with path components', () => {
      const item = {
        url: 'https://app.aave.com/markets',
        name: 'Aave Markets',
      };

      const result = SECTIONS_CONFIG.sites.getItemIdentifier(item);

      expect(result).toBe('https://app.aave.com/markets');
    });
  });

  describe('getItemIdentifier presence', () => {
    it('is defined for all sections', () => {
      const sectionIds = Object.keys(
        SECTIONS_CONFIG,
      ) as (keyof typeof SECTIONS_CONFIG)[];

      sectionIds.forEach((sectionId) => {
        expect(SECTIONS_CONFIG[sectionId].getItemIdentifier).toBeDefined();
      });
    });
  });
});

describe('SECTIONS_CONFIG perps useSectionData sorting', () => {
  const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
    typeof usePerpsMarkets
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sorts markets by change24hPercent descending when no search query', () => {
    const unsortedMarkets = [
      { symbol: 'ETH', change24hPercent: '2.5' },
      { symbol: 'BTC', change24hPercent: '10.0' },
      { symbol: 'SOL', change24hPercent: '-3.0' },
      { symbol: 'DOGE', change24hPercent: '5.0' },
    ];

    mockUsePerpsMarkets.mockReturnValue({
      markets: unsortedMarkets,
      isLoading: false,
      refresh: jest.fn(),
      isRefreshing: false,
    } as never);

    const { result } = renderHook(() => SECTIONS_CONFIG.perps.useSectionData());

    const symbols = result.current.data.map(
      (m: unknown) => (m as { symbol: string }).symbol,
    );
    expect(symbols).toEqual(['BTC', 'DOGE', 'ETH', 'SOL']);
  });

  it('places markets with invalid change24hPercent at the end', () => {
    const markets = [
      { symbol: 'ETH', change24hPercent: '5.0' },
      { symbol: 'BAD', change24hPercent: 'invalid' },
      { symbol: 'BTC', change24hPercent: '10.0' },
    ];

    mockUsePerpsMarkets.mockReturnValue({
      markets,
      isLoading: false,
      refresh: jest.fn(),
      isRefreshing: false,
    } as never);

    const { result } = renderHook(() => SECTIONS_CONFIG.perps.useSectionData());

    const symbols = result.current.data.map(
      (m: unknown) => (m as { symbol: string }).symbol,
    );
    expect(symbols).toEqual(['BTC', 'ETH', 'BAD']);
  });

  it('does not sort when search query is provided (delegates to fuse)', () => {
    const markets = [
      { symbol: 'ETH', change24hPercent: '2.5' },
      { symbol: 'BTC', change24hPercent: '10.0' },
    ];

    mockUsePerpsMarkets.mockReturnValue({
      markets,
      isLoading: false,
      refresh: jest.fn(),
      isRefreshing: false,
    } as never);

    const { result } = renderHook(() =>
      SECTIONS_CONFIG.perps.useSectionData('btc'),
    );

    // fuse.search is mocked to return [], verifying search path is taken
    expect(result.current.data).toEqual([]);
  });
});
