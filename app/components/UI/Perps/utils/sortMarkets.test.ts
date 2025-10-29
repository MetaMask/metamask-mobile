import type { PerpsMarketData } from '../controllers/types';
import { parseVolume } from '../hooks/usePerpsMarkets';
import { sortMarkets, type SortDirection, type SortField } from './sortMarkets';

// Mock dependencies
jest.mock('../hooks/usePerpsMarkets', () => ({
  parseVolume: jest.fn(),
}));

const mockParseVolume = parseVolume as jest.MockedFunction<typeof parseVolume>;

describe('sortMarkets', () => {
  const createMockMarket = (
    overrides: Partial<PerpsMarketData> = {},
  ): PerpsMarketData =>
    ({
      symbol: 'BTC',
      volume: '$1M',
      change24hPercent: '+2.5%',
      fundingRate: 0.01,
      openInterest: '$500K',
      price: '$50000',
      ...overrides,
    }) as PerpsMarketData;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for parseVolume
    mockParseVolume.mockImplementation((value: string | undefined) => {
      if (!value) return -1;
      if (value === '$1M') return 1000000;
      if (value === '$2M') return 2000000;
      if (value === '$500K') return 500000;
      if (value === '$750K') return 750000;
      if (value === '$1B') return 1000000000;
      return 0;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('volume sorting', () => {
    it('sorts markets by volume in descending order by default', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', volume: '$1M' }),
        createMockMarket({ symbol: 'ETH', volume: '$2M' }),
        createMockMarket({ symbol: 'SOL', volume: '$500K' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'volume' as SortField,
      });

      expect(result[0].symbol).toBe('ETH');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('SOL');
      expect(mockParseVolume).toHaveBeenCalledWith('$2M');
      expect(mockParseVolume).toHaveBeenCalledWith('$1M');
      expect(mockParseVolume).toHaveBeenCalledWith('$500K');
    });

    it('sorts markets by volume in ascending order when specified', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', volume: '$1M' }),
        createMockMarket({ symbol: 'ETH', volume: '$2M' }),
        createMockMarket({ symbol: 'SOL', volume: '$500K' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'volume' as SortField,
        direction: 'asc' as SortDirection,
      });

      expect(result[0].symbol).toBe('SOL');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('ETH');
    });

    it('places markets with undefined volume at the end', () => {
      mockParseVolume.mockImplementation((value: string | undefined) => {
        if (!value) return -1;
        if (value === '$1M') return 1000000;
        return 0;
      });

      const markets = [
        createMockMarket({ symbol: 'BTC', volume: '$1M' }),
        createMockMarket({ symbol: 'ETH', volume: undefined }),
        createMockMarket({ symbol: 'SOL', volume: '$500K' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'volume' as SortField,
      });

      expect(result[2].symbol).toBe('ETH');
    });

    it('handles markets with zero volume', () => {
      mockParseVolume.mockImplementation((value: string | undefined) => {
        if (value === '$0') return 0;
        if (value === '$1M') return 1000000;
        return -1;
      });

      const markets = [
        createMockMarket({ symbol: 'BTC', volume: '$1M' }),
        createMockMarket({ symbol: 'ETH', volume: '$0' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'volume' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
    });
  });

  describe('price change sorting', () => {
    it('sorts markets by price change in descending order by default', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', change24hPercent: '+2.5%' }),
        createMockMarket({ symbol: 'ETH', change24hPercent: '+5.0%' }),
        createMockMarket({ symbol: 'SOL', change24hPercent: '-1.8%' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'priceChange' as SortField,
      });

      expect(result[0].symbol).toBe('ETH');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('SOL');
    });

    it('sorts markets by price change in ascending order when specified', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', change24hPercent: '+2.5%' }),
        createMockMarket({ symbol: 'ETH', change24hPercent: '+5.0%' }),
        createMockMarket({ symbol: 'SOL', change24hPercent: '-1.8%' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'priceChange' as SortField,
        direction: 'asc' as SortDirection,
      });

      expect(result[0].symbol).toBe('SOL');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('ETH');
    });

    it('handles negative price changes correctly', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', change24hPercent: '-2.5%' }),
        createMockMarket({ symbol: 'ETH', change24hPercent: '-5.0%' }),
        createMockMarket({ symbol: 'SOL', change24hPercent: '-1.8%' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'priceChange' as SortField,
      });

      expect(result[0].symbol).toBe('SOL');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('ETH');
    });

    it('handles markets with missing price change', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', change24hPercent: '+2.5%' }),
        createMockMarket({ symbol: 'ETH', change24hPercent: undefined }),
        createMockMarket({ symbol: 'SOL', change24hPercent: '-1.8%' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'priceChange' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
      expect(result[2].symbol).toBe('SOL');
    });

    it('removes + sign when parsing price change', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', change24hPercent: '+10.0%' }),
        createMockMarket({ symbol: 'ETH', change24hPercent: '5.0%' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'priceChange' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
    });

    it('handles zero price change', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', change24hPercent: '+2.5%' }),
        createMockMarket({ symbol: 'ETH', change24hPercent: '0%' }),
        createMockMarket({ symbol: 'SOL', change24hPercent: '-1.8%' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'priceChange' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
      expect(result[2].symbol).toBe('SOL');
    });
  });

  describe('funding rate sorting', () => {
    it('sorts markets by funding rate in descending order by default', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', fundingRate: 0.01 }),
        createMockMarket({ symbol: 'ETH', fundingRate: 0.05 }),
        createMockMarket({ symbol: 'SOL', fundingRate: -0.02 }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
      });

      expect(result[0].symbol).toBe('ETH');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('SOL');
    });

    it('sorts markets by funding rate in ascending order when specified', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', fundingRate: 0.01 }),
        createMockMarket({ symbol: 'ETH', fundingRate: 0.05 }),
        createMockMarket({ symbol: 'SOL', fundingRate: -0.02 }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
        direction: 'asc' as SortDirection,
      });

      expect(result[0].symbol).toBe('SOL');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('ETH');
    });

    it('handles negative funding rates correctly', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', fundingRate: -0.01 }),
        createMockMarket({ symbol: 'ETH', fundingRate: -0.05 }),
        createMockMarket({ symbol: 'SOL', fundingRate: -0.02 }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('SOL');
      expect(result[2].symbol).toBe('ETH');
    });

    it('handles markets with undefined funding rate as zero', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', fundingRate: 0.01 }),
        createMockMarket({ symbol: 'ETH', fundingRate: undefined }),
        createMockMarket({ symbol: 'SOL', fundingRate: -0.02 }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
      expect(result[2].symbol).toBe('SOL');
    });

    it('handles zero funding rate', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', fundingRate: 0.01 }),
        createMockMarket({ symbol: 'ETH', fundingRate: 0 }),
        createMockMarket({ symbol: 'SOL', fundingRate: -0.01 }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
      expect(result[2].symbol).toBe('SOL');
    });
  });

  describe('open interest sorting', () => {
    it('sorts markets by open interest in descending order by default', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', openInterest: '$1M' }),
        createMockMarket({ symbol: 'ETH', openInterest: '$2M' }),
        createMockMarket({ symbol: 'SOL', openInterest: '$500K' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'openInterest' as SortField,
      });

      expect(result[0].symbol).toBe('ETH');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('SOL');
      expect(mockParseVolume).toHaveBeenCalledWith('$2M');
      expect(mockParseVolume).toHaveBeenCalledWith('$1M');
      expect(mockParseVolume).toHaveBeenCalledWith('$500K');
    });

    it('sorts markets by open interest in ascending order when specified', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', openInterest: '$1M' }),
        createMockMarket({ symbol: 'ETH', openInterest: '$2M' }),
        createMockMarket({ symbol: 'SOL', openInterest: '$500K' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'openInterest' as SortField,
        direction: 'asc' as SortDirection,
      });

      expect(result[0].symbol).toBe('SOL');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('ETH');
    });

    it('handles markets with undefined open interest', () => {
      mockParseVolume.mockImplementation((value: string | undefined) => {
        if (!value) return -1;
        if (value === '$1M') return 1000000;
        return 0;
      });

      const markets = [
        createMockMarket({ symbol: 'BTC', openInterest: '$1M' }),
        createMockMarket({ symbol: 'ETH', openInterest: undefined }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'openInterest' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
    });

    it('handles large open interest values', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', openInterest: '$1B' }),
        createMockMarket({ symbol: 'ETH', openInterest: '$2M' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'openInterest' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
    });
  });

  describe('edge cases', () => {
    it('returns empty array when given empty array', () => {
      const result = sortMarkets({
        markets: [],
        sortBy: 'volume' as SortField,
      });

      expect(result).toEqual([]);
    });

    it('returns single market unchanged', () => {
      const markets = [createMockMarket({ symbol: 'BTC' })];

      const result = sortMarkets({
        markets,
        sortBy: 'volume' as SortField,
      });

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
    });

    it('maintains order when all values are equal', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', fundingRate: 0.01 }),
        createMockMarket({ symbol: 'ETH', fundingRate: 0.01 }),
        createMockMarket({ symbol: 'SOL', fundingRate: 0.01 }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
      });

      expect(result).toHaveLength(3);
      expect(result[0].fundingRate).toBe(0.01);
      expect(result[1].fundingRate).toBe(0.01);
      expect(result[2].fundingRate).toBe(0.01);
    });

    it('does not mutate original array', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', fundingRate: 0.01 }),
        createMockMarket({ symbol: 'ETH', fundingRate: 0.05 }),
      ];
      const originalOrder = markets.map((m) => m.symbol);

      sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
      });

      expect(markets.map((m) => m.symbol)).toEqual(originalOrder);
    });

    it('maintains original order for unsupported sort field', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC' }),
        createMockMarket({ symbol: 'ETH' }),
        createMockMarket({ symbol: 'SOL' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'unsupported' as SortField,
      });

      expect(result[0].symbol).toBe('BTC');
      expect(result[1].symbol).toBe('ETH');
      expect(result[2].symbol).toBe('SOL');
    });
  });

  describe('complex scenarios', () => {
    it('handles mixed positive and negative values for all sort types', () => {
      const markets = [
        createMockMarket({
          symbol: 'BTC',
          change24hPercent: '+5.0%',
          fundingRate: 0.01,
        }),
        createMockMarket({
          symbol: 'ETH',
          change24hPercent: '-3.0%',
          fundingRate: -0.02,
        }),
        createMockMarket({
          symbol: 'SOL',
          change24hPercent: '+2.0%',
          fundingRate: 0.03,
        }),
      ];

      const priceChangeResult = sortMarkets({
        markets,
        sortBy: 'priceChange' as SortField,
      });

      expect(priceChangeResult[0].symbol).toBe('BTC');
      expect(priceChangeResult[2].symbol).toBe('ETH');

      const fundingRateResult = sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
      });

      expect(fundingRateResult[0].symbol).toBe('SOL');
      expect(fundingRateResult[2].symbol).toBe('ETH');
    });

    it('handles very large numbers correctly', () => {
      mockParseVolume.mockImplementation((value: string | undefined) => {
        if (value === '$1B') return 1000000000;
        if (value === '$999M') return 999000000;
        if (value === '$1.001B') return 1001000000;
        return 0;
      });

      const markets = [
        createMockMarket({ symbol: 'BTC', volume: '$1B' }),
        createMockMarket({ symbol: 'ETH', volume: '$1.001B' }),
        createMockMarket({ symbol: 'SOL', volume: '$999M' }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'volume' as SortField,
      });

      expect(result[0].symbol).toBe('ETH');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('SOL');
    });

    it('handles very small decimal values for funding rate', () => {
      const markets = [
        createMockMarket({ symbol: 'BTC', fundingRate: 0.0001 }),
        createMockMarket({ symbol: 'ETH', fundingRate: 0.00001 }),
        createMockMarket({ symbol: 'SOL', fundingRate: 0.001 }),
      ];

      const result = sortMarkets({
        markets,
        sortBy: 'fundingRate' as SortField,
      });

      expect(result[0].symbol).toBe('SOL');
      expect(result[1].symbol).toBe('BTC');
      expect(result[2].symbol).toBe('ETH');
    });
  });
});
