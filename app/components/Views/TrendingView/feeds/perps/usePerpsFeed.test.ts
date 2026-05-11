/**
 * usePerpsFeed — unit tests
 *
 * Focuses on the sorting/ordering logic that lives inside the useMemo:
 * 1. No-query path: items sorted by the variant's comparator.
 * 2. Query path (non-macro): Fuse.js relevance order is preserved.
 * 3. Query path (macro): sorted by volume even when a query is present.
 * 4. defaultSortOptionId matches PERPS_VARIANT_SORT_OPTION for each variant.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { usePerpsFeed, PERPS_VARIANT_SORT_OPTION } from './usePerpsFeed';

// ---------------------------------------------------------------------------
// Core dependency mocks
// ---------------------------------------------------------------------------

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => []),
}));

const mockMarkets: PerpsMarketData[] = [];
const mockRefetch = jest.fn();

jest.mock('../../../../UI/Perps/hooks', () => ({
  usePerpsMarkets: jest.fn(() => ({
    markets: mockMarkets,
    isLoading: false,
    refresh: mockRefetch,
    isRefreshing: false,
  })),
}));

jest.mock('../../../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionContext: { _currentValue: null },
}));

jest.mock('../../../../UI/Perps/selectors/perpsController', () => ({
  selectPerpsWatchlistMarkets: jest.fn(),
}));

jest.mock(
  '../../../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines',
  () => ({
    useHomepageSparklines: jest.fn(() => ({ sparklines: {} })),
  }),
);

jest.mock('../../hooks/useFeedRefresh', () => ({
  useFeedRefresh: jest.fn(),
}));

// ---------------------------------------------------------------------------
// fuseSearch mock — controllable so we can verify order is preserved
// ---------------------------------------------------------------------------

const mockFuseSearch = jest.fn();
jest.mock('../search-utils', () => ({
  fuseSearch: (...args: unknown[]) => mockFuseSearch(...args),
  PERPS_FUSE_OPTIONS: {},
}));

jest.mock('@metamask/perps-controller', () => ({
  filterMarketsByQuery: jest.fn((items: unknown[]) => items),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { usePerpsMarkets } from '../../../../UI/Perps/hooks';

const makeMarket = (
  symbol: string,
  change24hPercent: string,
  volumeNumber: number,
): PerpsMarketData =>
  ({
    symbol,
    name: symbol,
    change24hPercent,
    volumeNumber,
    marketType: 'equity',
    isHip3: false,
  }) as unknown as PerpsMarketData;

const renderFeed = (options: Parameters<typeof usePerpsFeed>[0] = {}) =>
  renderHook(() => usePerpsFeed(options));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePerpsFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: fuseSearch returns items as-is
    mockFuseSearch.mockImplementation((items: unknown[]) => items);
  });

  describe('no-query path', () => {
    it('sorts all/crypto/rwa variants by 24h price change descending', () => {
      const markets = [
        makeMarket('LOW', '1', 100),
        makeMarket('HIGH', '5', 50),
        makeMarket('MID', '3', 75),
      ];
      (usePerpsMarkets as jest.Mock).mockReturnValue({
        markets,
        isLoading: false,
        refresh: mockRefetch,
        isRefreshing: false,
      });

      for (const variant of ['all', 'crypto', 'rwa'] as const) {
        const { result } = renderFeed({ variant });
        const symbols = result.current.data.map((d) => d.market.symbol);
        expect(symbols).toEqual(['HIGH', 'MID', 'LOW']);
      }
    });

    it('sorts macro variant by volume descending', () => {
      const markets = [
        makeMarket('LOW_VOL', '5', 10),
        makeMarket('HIGH_VOL', '1', 200),
        makeMarket('MID_VOL', '3', 100),
      ].map((m) => ({ ...m, marketType: 'equity' as const }));

      (usePerpsMarkets as jest.Mock).mockReturnValue({
        markets,
        isLoading: false,
        refresh: mockRefetch,
        isRefreshing: false,
      });

      const { result } = renderFeed({ variant: 'macro' });
      const symbols = result.current.data.map((d) => d.market.symbol);
      expect(symbols).toEqual(['HIGH_VOL', 'MID_VOL', 'LOW_VOL']);
    });
  });

  describe('query path', () => {
    it('preserves Fuse.js relevance order for non-macro variants', () => {
      const markets = [
        makeMarket('BTC', '1', 100),
        makeMarket('ETH', '5', 50),
        makeMarket('SOL', '3', 75),
      ];
      (usePerpsMarkets as jest.Mock).mockReturnValue({
        markets,
        isLoading: false,
        refresh: mockRefetch,
        isRefreshing: false,
      });

      // Fuse returns a specific relevance order (SOL first, then ETH, then BTC)
      const fuseRelevanceOrder = [
        makeMarket('SOL', '3', 75),
        makeMarket('ETH', '5', 50),
        makeMarket('BTC', '1', 100),
      ];
      mockFuseSearch.mockReturnValue(fuseRelevanceOrder);

      for (const variant of ['all', 'crypto', 'rwa'] as const) {
        const { result } = renderFeed({ variant, query: 'S' });
        const symbols = result.current.data.map((d) => d.market.symbol);
        // Must match fuse order, NOT sorted by price change (which would be ETH→SOL→BTC)
        expect(symbols).toEqual(['SOL', 'ETH', 'BTC']);
      }
    });

    it('sorts macro fuse results by volume, overriding relevance order', () => {
      const markets = [
        makeMarket('AAPL', '1', 10),
        makeMarket('MSFT', '5', 200),
        makeMarket('NVDA', '3', 100),
      ].map((m) => ({ ...m, marketType: 'equity' as const }));

      (usePerpsMarkets as jest.Mock).mockReturnValue({
        markets,
        isLoading: false,
        refresh: mockRefetch,
        isRefreshing: false,
      });

      // Fuse returns relevance order: AAPL first
      mockFuseSearch.mockReturnValue([
        markets[0], // AAPL — low volume, but top relevance match
        markets[1], // MSFT
        markets[2], // NVDA
      ]);

      const { result } = renderFeed({ variant: 'macro', query: 'A' });
      const symbols = result.current.data.map((d) => d.market.symbol);
      // Must be sorted by volume desc, NOT fuse order
      expect(symbols).toEqual(['MSFT', 'NVDA', 'AAPL']);
    });
  });

  describe('defaultSortOptionId', () => {
    it.each([
      ['all', 'priceChange'],
      ['crypto', 'priceChange'],
      ['rwa', 'priceChange'],
      ['macro', 'volume'],
    ] as const)(
      'returns "%s" for variant "%s"',
      (variant, expectedSortOptionId) => {
        (usePerpsMarkets as jest.Mock).mockReturnValue({
          markets: [],
          isLoading: false,
          refresh: mockRefetch,
          isRefreshing: false,
        });

        const { result } = renderFeed({ variant });
        expect(result.current.defaultSortOptionId).toBe(expectedSortOptionId);
        // Also verify it matches the canonical map
        expect(result.current.defaultSortOptionId).toBe(
          PERPS_VARIANT_SORT_OPTION[variant],
        );
      },
    );
  });
});
