import {
  CATEGORY_DISPLAY_ORDER,
  HIP3_FILTER_KEYS,
  isHip3Filter,
  normalizeFilterKey,
} from './marketCategoryMapping';

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
