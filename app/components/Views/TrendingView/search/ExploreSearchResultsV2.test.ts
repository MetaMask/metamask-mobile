/**
 * ExploreSearchResultsV2 — unit tests for getViewMoreLabel and LOCAL_SEARCH_FEEDS
 *
 * Tests the pure label-derivation logic that determines what text the
 * "View X more" button shows for each feed section, or null when the button
 * should not be shown.
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
  describe('no active query — always "View all" regardless of item count', () => {
    it.each([
      ['perps', 10, ''],
      ['stocks', 10, '   '],
      ['sites', 10, ''],
      ['predictions', 10, ''],
      ['tokens', 10, ''],
      ['tokens', 1, ''],
    ] as [SearchFeedId, number, string][])(
      '%s: %d items, query "%s" → "View all"',
      (feedId, totalItems, query) => {
        expect(getViewMoreLabel(feedId, totalItems, query)).toBe('View all');
      },
    );
  });

  describe('active query — returns null when results fit within the cap (≤ 3)', () => {
    it.each([
      ['perps', 0, 'eth'],
      ['perps', 1, 'eth'],
      ['perps', 3, 'eth'],
      ['stocks', 2, 'bit'],
      ['sites', 1, 'meta'],
      ['tokens', 3, 'eth'],
    ] as [SearchFeedId, number, string][])(
      '%s: %d items → null',
      (feedId, totalItems, query) => {
        expect(getViewMoreLabel(feedId, totalItems, query)).toBeNull();
      },
    );
  });

  describe('active query — local feeds return "View X more" when items exceed cap', () => {
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

  describe('active query — non-local feeds (tokens) without server total fall back to "View all"', () => {
    it('returns "View all" for tokens with many results but no server total', () => {
      expect(getViewMoreLabel('tokens', 10, 'eth')).toBe('View all');
    });
  });

  describe('active query — server total provided (tokens and predictions)', () => {
    it('returns null when server total fits within the cap (≤ 3)', () => {
      expect(getViewMoreLabel('predictions', 3, 'eth', 3)).toBeNull();
      expect(getViewMoreLabel('tokens', 3, 'eth', 2)).toBeNull();
    });

    it('returns "View X more" when server total exceeds the cap', () => {
      expect(getViewMoreLabel('predictions', 3, 'eth', 50)).toBe(
        'View 47 more',
      );
      expect(getViewMoreLabel('tokens', 3, 'eth', 2101)).toBe('View 2098 more');
    });

    it('returns "View all" when server total exceeds cap but all are already shown', () => {
      expect(getViewMoreLabel('predictions', 3, 'nba', 4)).toBe('View 1 more');
      expect(getViewMoreLabel('tokens', 3, 'eth', 4)).toBe('View 1 more');
    });
  });
});
