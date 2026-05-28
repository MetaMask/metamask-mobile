import { getViewMoreLabel, MAX_ITEMS_PER_SECTION } from './viewMoreLabel';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  }),
}));

describe('getViewMoreLabel', () => {
  describe('no query (empty or whitespace)', () => {
    it.each(['', '  '])('returns "view_all" when searchQuery is %p', (q) => {
      expect(getViewMoreLabel('tokens', 10, q)).toBe('trending.view_all');
      expect(getViewMoreLabel('stocks', 10, q)).toBe('trending.view_all');
    });
  });

  describe('local-search feeds (perps, stocks, sites)', () => {
    it('returns "view_x_more" when items exceed MAX_ITEMS_PER_SECTION', () => {
      const extra = 5;
      const visibleCount = MAX_ITEMS_PER_SECTION + extra;
      expect(getViewMoreLabel('stocks', visibleCount, 'eth')).toBe(
        `trending.view_x_more:{"count":${extra}}`,
      );
    });

    it('returns null when items equal MAX_ITEMS_PER_SECTION (nothing hidden)', () => {
      expect(
        getViewMoreLabel('perps', MAX_ITEMS_PER_SECTION, 'eth'),
      ).toBeNull();
    });

    it('returns null when items are fewer than MAX_ITEMS_PER_SECTION', () => {
      expect(
        getViewMoreLabel('sites', MAX_ITEMS_PER_SECTION - 1, 'eth'),
      ).toBeNull();
    });
  });

  describe('predictions (server total always provided; no local fallback)', () => {
    it('returns "view_x_more" using server total', () => {
      expect(getViewMoreLabel('predictions', 3, 'eth', 50)).toBe(
        `trending.view_x_more:{"count":47}`,
      );
    });

    it('returns null when total equals MAX_ITEMS_PER_SECTION (nothing hidden)', () => {
      expect(
        getViewMoreLabel(
          'predictions',
          MAX_ITEMS_PER_SECTION,
          'eth',
          MAX_ITEMS_PER_SECTION,
        ),
      ).toBeNull();
    });

    it('falls back to "view_all" when no total is provided and items exceed cap', () => {
      expect(
        getViewMoreLabel('predictions', MAX_ITEMS_PER_SECTION + 2, 'eth'),
      ).toBe('trending.view_all');
    });
  });

  describe('loading state — component skips getViewMoreLabel entirely (section.isLoading guard)', () => {
    // ExploreSearchResultsV2 now returns null directly when section.isLoading is true
    // without calling getViewMoreLabel. These tests verify that if it were called with
    // 0 items and no serverTotal, it would correctly return null (nothing to show).
    it.each(['perps', 'stocks', 'sites', 'tokens', 'predictions'] as const)(
      '%s: returns null with 0 items and no serverTotal',
      (feedId) => {
        expect(getViewMoreLabel(feedId, 0, 'eth', undefined)).toBeNull();
      },
    );
  });

  describe('server total provided (tokens and predictions with API count)', () => {
    it('returns "view_x_more" using total when there are remaining results', () => {
      // total: 2101, visible: 3 → extra = 2101 - 3 = 2098
      expect(getViewMoreLabel('tokens', 3, 'eth', 2101)).toBe(
        `trending.view_x_more:{"count":2098}`,
      );
    });

    it('caps visibleCount at MAX_ITEMS_PER_SECTION when computing hidden', () => {
      // visibleCount=20 is capped to MAX_ITEMS_PER_SECTION=3 → hidden = 100 - 3 = 97
      expect(getViewMoreLabel('tokens', 20, 'eth', 100)).toBe(
        `trending.view_x_more:{"count":97}`,
      );
    });

    it('returns null when total equals MAX_ITEMS_PER_SECTION (nothing hidden)', () => {
      expect(
        getViewMoreLabel(
          'tokens',
          MAX_ITEMS_PER_SECTION,
          'eth',
          MAX_ITEMS_PER_SECTION,
        ),
      ).toBeNull();
    });

    it('returns null when total is less than or equal to MAX_ITEMS_PER_SECTION', () => {
      expect(getViewMoreLabel('tokens', 3, 'eth', 2)).toBeNull();
    });

    it('returns "view_all" when query is empty regardless of total', () => {
      expect(getViewMoreLabel('tokens', 20, '', 2101)).toBe(
        'trending.view_all',
      );
    });
  });
});
