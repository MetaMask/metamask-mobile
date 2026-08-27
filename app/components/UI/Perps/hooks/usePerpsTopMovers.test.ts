import { renderHook } from '@testing-library/react-native';
import { type PriceUpdate } from '@metamask/perps-controller';
import {
  isPerpsTopMoversSectionVisible,
  usePerpsTopMovers,
} from './usePerpsTopMovers';
import {
  usePerpsMarkets,
  type PerpsMarketDataWithVolumeNumber,
} from './usePerpsMarkets';
import { usePerpsLivePrices } from './stream';

jest.mock('./usePerpsMarkets', () => ({
  usePerpsMarkets: jest.fn(),
}));

jest.mock('./stream', () => ({
  usePerpsLivePrices: jest.fn(),
}));

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;
const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
  typeof usePerpsLivePrices
>;

const buildMarket = (
  symbol: string,
  change24hPercent: string,
  overrides: Partial<PerpsMarketDataWithVolumeNumber> = {},
): PerpsMarketDataWithVolumeNumber =>
  ({
    symbol,
    name: symbol,
    maxLeverage: '10x',
    price: '$100.00',
    change24h: `${change24hPercent}%`,
    change24hPercent,
    volume: '$1.0M',
    volumeNumber: 1_000_000,
    ...overrides,
  }) as PerpsMarketDataWithVolumeNumber;

const buildPrice = (
  symbol: string,
  percentChange24h: string,
): Record<string, PriceUpdate> => ({
  [symbol]: {
    symbol,
    price: '100',
    timestamp: Date.now(),
    percentChange24h,
  } as PriceUpdate,
});

const NO_LIVE_PRICES: Record<string, PriceUpdate> = {};

describe('usePerpsTopMovers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsMarkets.mockReturnValue({
      markets: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });
    mockUsePerpsLivePrices.mockReturnValue(NO_LIVE_PRICES);
  });

  describe('isLoading passthrough', () => {
    it('returns true when the market channel is loading', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when the market channel has finished loading', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [buildMarket('BTC', '2.5')],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('empty data', () => {
    it('returns an empty array when there are no markets', () => {
      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      expect(result.current.data).toEqual([]);
    });

    it('returns markets sorted by static change24hPercent when no live prices exist', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [
          buildMarket('BTC', '1.0'),
          buildMarket('ETH', '5.0'),
          buildMarket('SOL', '-2.0'),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      expect(result.current.data.map((m) => m.symbol)).toEqual([
        'ETH',
        'BTC',
        'SOL',
      ]);
    });
  });

  describe('gainers sort (desc)', () => {
    it('returns the top markets ordered from highest to lowest price change', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [
          buildMarket('BTC', '1.0'),
          buildMarket('ETH', '5.0'),
          buildMarket('SOL', '-2.0'),
          buildMarket('LINK', '3.0'),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      expect(result.current.data.map((m) => m.symbol)).toEqual([
        'ETH',
        'LINK',
        'BTC',
        'SOL',
      ]);
    });
  });

  describe('losers sort (asc)', () => {
    it('returns the top markets ordered from lowest to highest price change', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [
          buildMarket('BTC', '1.0'),
          buildMarket('ETH', '5.0'),
          buildMarket('SOL', '-2.0'),
          buildMarket('LINK', '-8.0'),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'asc' }),
      );

      expect(result.current.data.map((m) => m.symbol)).toEqual([
        'LINK',
        'SOL',
        'BTC',
        'ETH',
      ]);
    });
  });

  describe('slice to top 8', () => {
    it('returns at most 8 markets regardless of how many are in the universe', () => {
      const markets = Array.from({ length: 20 }, (_, i) =>
        buildMarket(`MKT${i}`, String(i * 0.5)),
      );
      mockUsePerpsMarkets.mockReturnValue({
        markets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      expect(result.current.data).toHaveLength(8);
    });
  });

  describe('enabled flag', () => {
    it('returns empty data and skips live price subscriptions when disabled', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [buildMarket('BTC', '1.0'), buildMarket('ETH', '2.0')],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc', enabled: false }),
      );

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: [] }),
      );
    });
  });

  describe('live price merge', () => {
    it('replaces change24hPercent with the live value when available', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [buildMarket('ETH', '1.0')],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });
      mockUsePerpsLivePrices.mockReturnValue(buildPrice('ETH', '7.5'));

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      // formatPercentage(7.5) = '+7.50%'
      expect(result.current.data[0].change24hPercent).toBe('+7.50%');
    });

    it('keeps the original change24hPercent when no live price is available for a symbol', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [buildMarket('ETH', '1.0'), buildMarket('BTC', '3.0')],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });
      // Only ETH has a live price
      mockUsePerpsLivePrices.mockReturnValue(buildPrice('ETH', '7.5'));

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      const btcEntry = result.current.data.find((m) => m.symbol === 'BTC');
      expect(btcEntry?.change24hPercent).toBe('3.0');
    });

    it('sorts using the merged live change24hPercent, not the stale snapshot value', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [buildMarket('BTC', '10.0'), buildMarket('ETH', '1.0')],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });
      // Live prices invert the ranking: ETH is now the top gainer
      mockUsePerpsLivePrices.mockReturnValue({
        ...buildPrice('BTC', '0.5'),
        ...buildPrice('ETH', '20.0'),
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      expect(result.current.data[0].symbol).toBe('ETH');
      expect(result.current.data[1].symbol).toBe('BTC');
    });

    it('ignores a live percentChange24h value that is not a valid number', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [buildMarket('ETH', '3.0')],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '100',
          timestamp: Date.now(),
          percentChange24h: 'invalid',
        } as PriceUpdate,
      });

      const { result } = renderHook(() =>
        usePerpsTopMovers({ direction: 'desc' }),
      );

      // Falls back to the original snapshot value
      expect(result.current.data[0].change24hPercent).toBe('3.0');
    });

    it('passes only the market symbols to usePerpsLivePrices', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [buildMarket('BTC', '1.0'), buildMarket('ETH', '2.0')],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderHook(() => usePerpsTopMovers({ direction: 'desc' }));

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: ['BTC', 'ETH'] }),
      );
    });

    it('passes the configured throttle value to usePerpsLivePrices', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [buildMarket('BTC', '1.0')],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderHook(() => usePerpsTopMovers({ direction: 'desc' }));

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({ throttleMs: 3000 }),
      );
    });
  });
});

describe('isPerpsTopMoversSectionVisible', () => {
  it('returns true while loading', () => {
    expect(isPerpsTopMoversSectionVisible({ isLoading: true, data: [] })).toBe(
      true,
    );
  });

  it('returns true when market data is available', () => {
    expect(
      isPerpsTopMoversSectionVisible({
        isLoading: false,
        data: [buildMarket('BTC', '1.0')],
      }),
    ).toBe(true);
  });

  it('returns false for an empty loaded feed', () => {
    expect(isPerpsTopMoversSectionVisible({ isLoading: false, data: [] })).toBe(
      false,
    );
  });
});
