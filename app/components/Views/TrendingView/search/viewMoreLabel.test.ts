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

    it('returns "view_all" when items equal MAX_ITEMS_PER_SECTION', () => {
      expect(getViewMoreLabel('perps', MAX_ITEMS_PER_SECTION, 'eth')).toBe(
        'trending.view_all',
      );
    });

    it('returns "view_all" when items are fewer than MAX_ITEMS_PER_SECTION', () => {
      expect(getViewMoreLabel('sites', MAX_ITEMS_PER_SECTION - 1, 'eth')).toBe(
        'trending.view_all',
      );
    });
  });

  describe('predictions (server total always provided; no local fallback)', () => {
    it('returns "view_x_more" using server total', () => {
      expect(getViewMoreLabel('predictions', 3, 'eth', 50)).toBe(
        `trending.view_x_more:{"count":47}`,
      );
    });

    it('returns "view_all" when total equals visible items', () => {
      expect(
        getViewMoreLabel(
          'predictions',
          MAX_ITEMS_PER_SECTION,
          'eth',
          MAX_ITEMS_PER_SECTION,
        ),
      ).toBe('trending.view_all');
    });

    it('falls back to "view_all" when no total is provided (should not normally occur)', () => {
      expect(
        getViewMoreLabel('predictions', MAX_ITEMS_PER_SECTION + 2, 'eth'),
      ).toBe('trending.view_all');
    });
  });

  describe('loading state — component passes 0 items and no serverTotal', () => {
    // When a section is loading, ExploreSearchResultsV2 passes visibleCount=0 and
    // serverTotal=undefined so that stale data from the previous query does not
    // produce a "View X more" count while skeletons are shown.
    it.each(['perps', 'stocks', 'sites', 'tokens', 'predictions'] as const)(
      '%s: returns "view_all" during loading (0 items, no serverTotal)',
      (feedId) => {
        expect(getViewMoreLabel(feedId, 0, 'eth', undefined)).toBe(
          'trending.view_all',
        );
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

    it('returns "view_all" when total equals MAX_ITEMS_PER_SECTION', () => {
      expect(
        getViewMoreLabel(
          'tokens',
          MAX_ITEMS_PER_SECTION,
          'eth',
          MAX_ITEMS_PER_SECTION,
        ),
      ).toBe('trending.view_all');
    });

    it('returns "view_all" when total is not greater than visible items', () => {
      expect(getViewMoreLabel('tokens', 3, 'eth', 2)).toBe('trending.view_all');
    });

    it('returns "view_all" when query is empty regardless of total', () => {
      expect(getViewMoreLabel('tokens', 20, '', 2101)).toBe(
        'trending.view_all',
      );
    });
  });
});
