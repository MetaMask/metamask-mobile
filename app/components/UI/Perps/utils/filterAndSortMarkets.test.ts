import {
  PERPS_CONSTANTS,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { filterAndSortMarkets } from './filterAndSortMarkets';

const createMarket = (
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '40x',
  price: '$50,000.00',
  change24h: '+2.5%',
  change24hPercent: '2.5',
  volume: '$1M',
  ...overrides,
});

describe('filterAndSortMarkets', () => {
  describe('sorting', () => {
    it('sorts markets by volume descending', () => {
      const markets = [
        createMarket({ symbol: 'A', volume: '$100K' }),
        createMarket({ symbol: 'B', volume: '$1.5B' }),
        createMarket({ symbol: 'C', volume: '$500M' }),
      ];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: true,
      });

      expect(result.map((m) => m.symbol)).toEqual(['B', 'C', 'A']);
    });

    it('adds volumeNumber to each market', () => {
      const markets = [createMarket({ symbol: 'BTC', volume: '$1M' })];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: true,
      });

      expect(result[0].volumeNumber).toBe(1000000);
    });
  });

  describe('filtering with showZeroVolume=false', () => {
    it('filters out markets with FallbackPriceDisplay volume', () => {
      const markets = [
        createMarket({ symbol: 'A', volume: '$1M' }),
        createMarket({
          symbol: 'B',
          volume: PERPS_CONSTANTS.FallbackPriceDisplay,
        }),
      ];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('A');
    });

    it('filters out markets with FallbackDataDisplay volume', () => {
      const markets = [
        createMarket({ symbol: 'A', volume: '$1M' }),
        createMarket({
          symbol: 'B',
          volume: PERPS_CONSTANTS.FallbackDataDisplay,
        }),
      ];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('A');
    });

    it('filters out markets with ZeroAmountDisplay volume', () => {
      const markets = [
        createMarket({ symbol: 'A', volume: '$1M' }),
        createMarket({
          symbol: 'B',
          volume: PERPS_CONSTANTS.ZeroAmountDisplay,
        }),
      ];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('A');
    });

    it('filters out markets with ZeroAmountDetailedDisplay volume', () => {
      const markets = [
        createMarket({ symbol: 'A', volume: '$1M' }),
        createMarket({
          symbol: 'B',
          volume: PERPS_CONSTANTS.ZeroAmountDetailedDisplay,
        }),
      ];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('A');
    });

    it('filters out markets with falsy volume', () => {
      const markets = [
        createMarket({ symbol: 'A', volume: '$1M' }),
        createMarket({ symbol: 'B', volume: '' }),
        createMarket({ symbol: 'C', volume: undefined }),
      ];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('A');
    });

    it('keeps markets with valid small volume', () => {
      const markets = [
        createMarket({ symbol: 'A', volume: '$1M' }),
        createMarket({ symbol: 'B', volume: '$<1' }),
      ];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: false,
      });

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.symbol)).toEqual(['A', 'B']);
    });
  });

  describe('filtering with showZeroVolume=true', () => {
    it('includes all markets regardless of volume', () => {
      const markets = [
        createMarket({ symbol: 'A', volume: '$1M' }),
        createMarket({
          symbol: 'B',
          volume: PERPS_CONSTANTS.FallbackDataDisplay,
        }),
        createMarket({
          symbol: 'C',
          volume: PERPS_CONSTANTS.ZeroAmountDisplay,
        }),
        createMarket({ symbol: 'D', volume: '' }),
      ];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: true,
      });

      expect(result).toHaveLength(4);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      const result = filterAndSortMarkets({
        marketData: [],
        showZeroVolume: false,
      });

      expect(result).toEqual([]);
    });

    it('handles single market', () => {
      const markets = [createMarket({ symbol: 'BTC', volume: '$50B' })];

      const result = filterAndSortMarkets({
        marketData: markets,
        showZeroVolume: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('BTC');
      expect(result[0].volumeNumber).toBe(50000000000);
    });

    it('does not mutate the original array', () => {
      const markets = [
        createMarket({ symbol: 'B', volume: '$500K' }),
        createMarket({ symbol: 'A', volume: '$1M' }),
      ];
      const originalSymbols = markets.map((m) => m.symbol);

      filterAndSortMarkets({ marketData: markets, showZeroVolume: false });

      expect(markets.map((m) => m.symbol)).toEqual(originalSymbols);
    });
  });
});
