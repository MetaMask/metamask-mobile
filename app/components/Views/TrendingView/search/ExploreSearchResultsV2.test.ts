/**
 * ExploreSearchResultsV2 — unit tests for getViewMoreLabel and LOCAL_SEARCH_FEEDS
 *
 * Tests the pure label-derivation logic that determines what text the
 * "View all / View X more" button shows for each feed section.
 */

import { getViewMoreLabel, LOCAL_SEARCH_FEEDS } from './viewMoreLabel';
import type { SearchFeedId } from './useExploreSearch';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'trending.view_x_more') return `View ${params?.count} more`;
    if (key === 'trending.view_all') return 'View all';
    return key;
  }),
}));

describe('LOCAL_SEARCH_FEEDS', () => {
  it('includes perps, stocks, and sites', () => {
    expect(LOCAL_SEARCH_FEEDS.has('perps')).toBe(true);
    expect(LOCAL_SEARCH_FEEDS.has('stocks')).toBe(true);
    expect(LOCAL_SEARCH_FEEDS.has('sites')).toBe(true);
  });

  it('does not include tokens or predictions (they use server total)', () => {
    expect(LOCAL_SEARCH_FEEDS.has('tokens')).toBe(false);
    expect(LOCAL_SEARCH_FEEDS.has('predictions')).toBe(false);
  });
});

describe('getViewMoreLabel', () => {
  describe('tokens — falls back to "View all" without a server total', () => {
    it('returns "View all" even with many results and an active query', () => {
      expect(getViewMoreLabel('tokens', 10, 'eth')).toBe('View all');
    });

    it('returns "View all" with no query', () => {
      expect(getViewMoreLabel('tokens', 10, '')).toBe('View all');
    });
  });

  describe('local search feeds with active query and extra items', () => {
    it.each([
      ['perps', 5, 'eth', 'View 2 more'],
      ['stocks', 7, 'bit', 'View 4 more'],
      ['sites', 4, 'meta', 'View 1 more'],
    ] as [SearchFeedId, number, string, string][])(
      '%s: %d items → "%s"',
      (feedId, totalItems, query, expected) => {
        expect(getViewMoreLabel(feedId, totalItems, query)).toBe(expected);
      },
    );
  });

  describe('local search feeds with active query but no extra items', () => {
    it.each([
      ['perps', 3, 'eth'],
      ['stocks', 2, 'bit'],
      ['sites', 1, 'meta'],
      ['perps', 0, 'eth'],
    ] as [SearchFeedId, number, string][])(
      '%s: %d items → "View all" (no hidden items)',
      (feedId, totalItems, query) => {
        expect(getViewMoreLabel(feedId, totalItems, query)).toBe('View all');
      },
    );
  });

  describe('server total provided (tokens and predictions)', () => {
    it('returns "View X more" for predictions when server total exceeds visible', () => {
      expect(getViewMoreLabel('predictions', 3, 'eth', 50)).toBe(
        'View 47 more',
      );
    });

    it('returns "View X more" for tokens when server total exceeds visible', () => {
      expect(getViewMoreLabel('tokens', 3, 'eth', 2101)).toBe('View 2098 more');
    });

    it('returns "View all" when server total equals visible items', () => {
      expect(getViewMoreLabel('predictions', 3, 'nba', 3)).toBe('View all');
    });

    it('returns "View all" when server total is less than visible items', () => {
      expect(getViewMoreLabel('tokens', 3, 'eth', 2)).toBe('View all');
    });
  });

  describe('no active query — always "View all" regardless of item count', () => {
    it.each([
      ['perps', 10, ''],
      ['stocks', 10, '   '],
      ['sites', 10, ''],
      ['predictions', 10, ''],
      ['tokens', 10, ''],
    ] as [SearchFeedId, number, string][])(
      '%s: %d items, query "%s" → "View all"',
      (feedId, totalItems, query) => {
        expect(getViewMoreLabel(feedId, totalItems, query)).toBe('View all');
      },
    );
  });
});
