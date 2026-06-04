import { MarketCategory } from '@metamask/perps-controller';
import {
  getMarketTypeForFilter,
  getFilterForMarketType,
} from './marketCategoryMapping';

describe('marketCategoryMapping', () => {
  describe('getMarketTypeForFilter', () => {
    it.each([
      ['stocks', MarketCategory.Stock],
      ['pre-ipo', MarketCategory.PreIpo],
      ['indices', MarketCategory.Index],
      ['etfs', MarketCategory.Etf],
      ['commodities', MarketCategory.Commodity],
      ['forex', MarketCategory.Forex],
    ] as const)('maps filter "%s" → MarketCategory %s', (filter, expected) => {
      expect(getMarketTypeForFilter(filter)).toBe(expected);
    });

    it.each(['all', 'crypto', 'new'] as const)(
      'returns undefined for UI-only filter "%s"',
      (filter) => {
        expect(getMarketTypeForFilter(filter)).toBeUndefined();
      },
    );
  });

  describe('getFilterForMarketType', () => {
    it.each([
      [MarketCategory.Stock, 'stocks'],
      [MarketCategory.PreIpo, 'pre-ipo'],
      [MarketCategory.Index, 'indices'],
      [MarketCategory.Etf, 'etfs'],
      [MarketCategory.Commodity, 'commodities'],
      [MarketCategory.Forex, 'forex'],
    ] as const)('maps MarketCategory %s → filter "%s"', (type, expected) => {
      expect(getFilterForMarketType(type)).toBe(expected);
    });

    it('returns undefined for MarketCategory.CryptoCurrency', () => {
      expect(
        getFilterForMarketType(MarketCategory.CryptoCurrency),
      ).toBeUndefined();
    });

    it('returns undefined for unknown market types', () => {
      expect(getFilterForMarketType('unknown-type')).toBeUndefined();
    });
  });

  describe('round-trip consistency', () => {
    it.each([
      ['stocks', MarketCategory.Stock],
      ['pre-ipo', MarketCategory.PreIpo],
      ['indices', MarketCategory.Index],
      ['etfs', MarketCategory.Etf],
      ['commodities', MarketCategory.Commodity],
      ['forex', MarketCategory.Forex],
    ] as const)('filter "%s" round-trips through both maps', (filter, type) => {
      expect(getMarketTypeForFilter(filter)).toBe(type);
      expect(getFilterForMarketType(type)).toBe(filter);
    });
  });
});
