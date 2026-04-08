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
jest.mock('../../UI/Predict/components/PredictMarket', () => () => null);
jest.mock(
  '../../UI/Predict/components/PredictMarketSkeleton',
  () => () => null,
);
jest.mock('fuse.js', () =>
  jest.fn().mockImplementation(() => ({
    search: jest.fn().mockReturnValue([]),
  })),
);

import { SECTIONS_CONFIG } from './sections.config';

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
