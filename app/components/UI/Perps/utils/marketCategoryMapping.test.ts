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
  'isHip3' | 'isNewMarket' | 'marketType' | 'tags'
> & { symbol: string };

const buildMarket = (overrides: Partial<TestMarket>): TestMarket => ({
  symbol: 'TEST',
  isHip3: false,
  isNewMarket: false,
  marketType: undefined,
  tags: undefined,
  ...overrides,
});

describe('marketCategoryMapping', () => {
  describe('HIP3_FILTER_KEYS', () => {
    it('contains only real HIP-3 marketType keys (excludes crypto and derived memecoin)', () => {
      expect([...HIP3_FILTER_KEYS].sort()).toEqual([
        'commodity',
        'etf',
        'forex',
        'index',
        'pre-ipo',
        'stock',
      ]);
    });

    it.each(['all', 'crypto', 'new', 'memecoin'] as const)(
      'does not contain UI-only or derived key "%s"',
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

    it.each([undefined, '', 'crypto', 'all', 'new', 'memecoin', 'unknown'])(
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
      buildMarket({
        symbol: 'DOGE',
        isHip3: false,
        tags: ['memecoin'],
      }),
      buildMarket({
        symbol: 'PEPE',
        isHip3: false,
        tags: ['memecoin', 'top-100'],
      }),
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

    it('returns only non-HIP3 markets for "crypto" (memecoins still included)', () => {
      expect(
        filterMarketsByCategory(markets, 'crypto').map((m) => m.symbol),
      ).toEqual(['BTC', 'ETH', 'DOGE', 'PEPE']);
    });

    it('returns only non-HIP3 markets carrying the memecoin tag for "memecoin"', () => {
      expect(
        filterMarketsByCategory(markets, 'memecoin').map((m) => m.symbol),
      ).toEqual(['DOGE', 'PEPE']);
    });

    it('does not include HIP-3 markets carrying the memecoin tag under "memecoin"', () => {
      const withHip3Meme: TestMarket[] = [
        ...markets,
        buildMarket({
          symbol: 'FAKE',
          isHip3: true,
          marketType: 'stock',
          tags: ['memecoin'],
        }),
      ];
      expect(
        filterMarketsByCategory(withHip3Meme, 'memecoin').map((m) => m.symbol),
      ).toEqual(['DOGE', 'PEPE']);
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
      ).toEqual(['BTC', 'ETH', 'DOGE', 'PEPE']);
    });
  });

  describe('CATEGORY_DISPLAY_ORDER', () => {
    it('has the expected order', () => {
      expect(CATEGORY_DISPLAY_ORDER).toEqual([
        'crypto',
        'memecoin',
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
