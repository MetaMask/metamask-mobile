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
      const total = MAX_ITEMS_PER_SECTION + extra;
      expect(getViewMoreLabel('stocks', total, 'eth')).toBe(
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

  describe('predictions (local feed with hasMore fallback)', () => {
    it('returns "view_x_more" when items exceed MAX_ITEMS_PER_SECTION', () => {
      expect(
        getViewMoreLabel('predictions', MAX_ITEMS_PER_SECTION + 2, 'eth', true),
      ).toBe(`trending.view_x_more:{"count":2}`);
    });

    it('returns "view_more" when items fit preview but hasMore is true', () => {
      expect(
        getViewMoreLabel('predictions', MAX_ITEMS_PER_SECTION, 'eth', true),
      ).toBe('trending.view_more');
    });

    it('returns "view_all" when items fit preview and hasMore is false', () => {
      expect(
        getViewMoreLabel('predictions', MAX_ITEMS_PER_SECTION, 'eth', false),
      ).toBe('trending.view_all');
    });
  });

  describe('tokens feed (remote search with totalCount)', () => {
    it('returns "view_x_more" using totalCount when there are remaining results', () => {
      // totalCount: 2101, visible: 3 → extra = 2101 - 3 = 2098
      expect(getViewMoreLabel('tokens', 20, 'eth', true, 2101)).toBe(
        `trending.view_x_more:{"count":2098}`,
      );
    });

    it('caps visible items at MAX_ITEMS_PER_SECTION when computing extra', () => {
      // totalItems=20 is capped to MAX_ITEMS_PER_SECTION=3 → extra = 100 - 3 = 97
      expect(getViewMoreLabel('tokens', 20, 'eth', true, 100)).toBe(
        `trending.view_x_more:{"count":97}`,
      );
    });

    it('returns "view_all" when totalCount equals MAX_ITEMS_PER_SECTION', () => {
      expect(
        getViewMoreLabel(
          'tokens',
          MAX_ITEMS_PER_SECTION,
          'eth',
          false,
          MAX_ITEMS_PER_SECTION,
        ),
      ).toBe('trending.view_all');
    });

    it('returns "view_all" when totalCount is less than visible items', () => {
      expect(getViewMoreLabel('tokens', 3, 'eth', false, 2)).toBe(
        'trending.view_all',
      );
    });

    it('returns "view_all" when totalCount is undefined (no API response yet)', () => {
      expect(getViewMoreLabel('tokens', 0, 'eth', true, undefined)).toBe(
        'trending.view_all',
      );
    });

    it('returns "view_all" when query is empty regardless of totalCount', () => {
      expect(getViewMoreLabel('tokens', 20, '', true, 2101)).toBe(
        'trending.view_all',
      );
    });
  });
});
