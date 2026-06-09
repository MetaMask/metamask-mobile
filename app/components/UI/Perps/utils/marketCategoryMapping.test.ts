import { MarketCategory } from '@metamask/perps-controller';
import {
  CATEGORY_DISPLAY_ORDER,
  getMarketTypeForFilter,
  getFilterForMarketType,
  normalizeFilterKey,
} from './marketCategoryMapping';

describe('marketCategoryMapping', () => {
  describe('getMarketTypeForFilter', () => {
    it.each([
      ['stock', MarketCategory.Stock],
      ['pre-ipo', MarketCategory.PreIpo],
      ['index', MarketCategory.Index],
      ['etf', MarketCategory.Etf],
      ['commodity', MarketCategory.Commodity],
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
      [MarketCategory.Stock, 'stock'],
      [MarketCategory.PreIpo, 'pre-ipo'],
      [MarketCategory.Index, 'index'],
      [MarketCategory.Etf, 'etf'],
      [MarketCategory.Commodity, 'commodity'],
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

  describe('normalizeFilterKey', () => {
    it.each([
      ['pre-ipo', 'pre_ipo'],
      ['stock', 'stock'],
      ['crypto', 'crypto'],
      ['a-b-c', 'a_b_c'],
    ])('normalizes "%s" → "%s"', (input, expected) => {
      expect(normalizeFilterKey(input)).toBe(expected);
    });

    it('returns empty string unchanged', () => {
      expect(normalizeFilterKey('')).toBe('');
    });
  });

  describe('CATEGORY_DISPLAY_ORDER', () => {
    it('has the expected order', () => {
      expect(CATEGORY_DISPLAY_ORDER).toEqual([
        'crypto',
        'stock',
        'pre-ipo',
        'forex',
        'commodity',
        'index',
        'etf',
      ]);
    });

    it('contains no duplicates', () => {
      expect(new Set(CATEGORY_DISPLAY_ORDER).size).toBe(
        CATEGORY_DISPLAY_ORDER.length,
      );
    });
  });

  describe('round-trip consistency', () => {
    it.each([
      ['stock', MarketCategory.Stock],
      ['pre-ipo', MarketCategory.PreIpo],
      ['index', MarketCategory.Index],
      ['etf', MarketCategory.Etf],
      ['commodity', MarketCategory.Commodity],
      ['forex', MarketCategory.Forex],
    ] as const)('filter "%s" round-trips through both maps', (filter, type) => {
      expect(getMarketTypeForFilter(filter)).toBe(type);
      expect(getFilterForMarketType(type)).toBe(filter);
    });
  });
});
