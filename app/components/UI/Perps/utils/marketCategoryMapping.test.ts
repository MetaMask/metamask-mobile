import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  CATEGORY_DISPLAY_ORDER,
  HIP3_FILTER_KEYS,
  filterMarketsByCategory,
  isHip3Filter,
  normalizeFilterKey,
} from './marketCategoryMapping';

type TestMarket = Pick<
  PerpsMarketData,
  'isHip3' | 'isNewMarket' | 'marketType'
> & { symbol: string };

const buildMarket = (overrides: Partial<TestMarket>): TestMarket => ({
  symbol: 'TEST',
  isHip3: false,
  isNewMarket: false,
  marketType: undefined,
  ...overrides,
});

describe('marketCategoryMapping', () => {
  describe('HIP3_FILTER_KEYS', () => {
    it('contains exactly the 6 HIP-3 filter keys', () => {
      expect([...HIP3_FILTER_KEYS].sort()).toEqual([
        'commodity',
        'etf',
        'forex',
        'index',
        'pre-ipo',
        'stock',
      ]);
    });

    it.each(['all', 'crypto', 'new'] as const)(
      'does not contain UI-only key "%s"',
      (key) => {
        expect(HIP3_FILTER_KEYS.has(key)).toBe(false);
      },
    );
  });

  describe('isHip3Filter', () => {
    it.each(['stock', 'pre-ipo', 'index', 'etf', 'commodity', 'forex'])(
      'returns true for "%s"',
      (key) => {
        expect(isHip3Filter(key)).toBe(true);
      },
    );

    it.each([undefined, '', 'crypto', 'all', 'new', 'unknown'])(
      'returns false for %s',
      (key) => {
        expect(isHip3Filter(key)).toBe(false);
      },
    );
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

  describe('filterMarketsByCategory', () => {
    const markets: TestMarket[] = [
      buildMarket({ symbol: 'BTC', isHip3: false }),
      buildMarket({ symbol: 'ETH', isHip3: false }),
      buildMarket({ symbol: 'AAPL', isHip3: true, marketType: 'stock' }),
      buildMarket({ symbol: 'GOLD', isHip3: true, marketType: 'commodity' }),
      buildMarket({
        symbol: 'NEW1',
        isHip3: true,
        isNewMarket: true,
        marketType: 'stock',
      }),
    ];

    it('returns all markets unchanged for "all"', () => {
      expect(filterMarketsByCategory(markets, 'all')).toEqual(markets);
    });

    it('returns only non-HIP3 markets for "crypto"', () => {
      expect(
        filterMarketsByCategory(markets, 'crypto').map((m) => m.symbol),
      ).toEqual(['BTC', 'ETH']);
    });

    it('returns only markets flagged as new for "new"', () => {
      expect(
        filterMarketsByCategory(markets, 'new').map((m) => m.symbol),
      ).toEqual(['NEW1']);
    });

    it('returns markets matching marketType for a HIP-3 category', () => {
      expect(
        filterMarketsByCategory(markets, 'stock').map((m) => m.symbol),
      ).toEqual(['AAPL', 'NEW1']);
      expect(
        filterMarketsByCategory(markets, 'commodity').map((m) => m.symbol),
      ).toEqual(['GOLD']);
    });

    it('returns an empty array when no market matches the category', () => {
      expect(filterMarketsByCategory(markets, 'forex')).toEqual([]);
    });

    it('preserves input order', () => {
      expect(
        filterMarketsByCategory(markets, 'crypto').map((m) => m.symbol),
      ).toEqual(['BTC', 'ETH']);
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
});
