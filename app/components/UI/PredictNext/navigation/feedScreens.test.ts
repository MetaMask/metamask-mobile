import {
  PREDICT_SURFACE_FEED_KEYS,
  type PredictVenueCapabilities,
} from '../capabilities';
import type { PredictFeedId, PredictVenueId } from '../types';
import {
  FEED_SCREENS,
  NFL_FEED_SCREEN_ID,
  getFeedScreen,
  getFeedScreenTab,
  resolveFeedScreenTabs,
  type FeedScreenTab,
} from './feedScreens';

const readyCapabilities = (
  feeds: Record<string, string>,
): PredictVenueCapabilities => ({
  status: 'ready',
  descriptor: {
    venueId: 'test-venue' as PredictVenueId,
    displayName: 'Test Venue',
    actions: [],
    feeds: feeds as Record<string, PredictFeedId>,
    searchSupported: false,
  },
});

describe('feedScreens', () => {
  describe('getFeedScreen', () => {
    it('returns the matching Feed Screen definition', () => {
      const result = getFeedScreen(NFL_FEED_SCREEN_ID);

      expect(result).toBe(FEED_SCREENS[NFL_FEED_SCREEN_ID]);
    });

    it.each(['missing-feed-screen', 'toString'])(
      'returns undefined for the unknown Feed Screen ID %s',
      (feedScreenId) => {
        const result = getFeedScreen(feedScreenId);

        expect(result).toBeUndefined();
      },
    );
  });

  describe('resolveFeedScreenTabs', () => {
    it('gives every Feed Screen tab a Feed key in the surface table', () => {
      for (const [feedScreenId, definition] of Object.entries(FEED_SCREENS)) {
        const tabKeys =
          PREDICT_SURFACE_FEED_KEYS.nextFeedScreenTabs[
            feedScreenId as keyof typeof FEED_SCREENS
          ];

        expect(definition.tabs.map(({ id }) => id).sort()).toEqual(
          Object.keys(tabKeys).sort(),
        );
      }
    });

    it('resolves each supported tab to the Venue Feed ID in definition order', () => {
      const capabilities = readyCapabilities({
        'nfl-props': 'venue-nfl-props',
        'nfl-games': 'venue-nfl-games',
      });

      const result = resolveFeedScreenTabs(NFL_FEED_SCREEN_ID, capabilities);

      expect(result).toEqual([
        { id: 'games', label: 'Games', feedId: 'venue-nfl-games' },
        { id: 'props', label: 'Props', feedId: 'venue-nfl-props' },
      ]);
    });

    it('omits a tab whose Feed key the Venue lacks', () => {
      const capabilities = readyCapabilities({ 'nfl-props': 'venue-props' });

      const result = resolveFeedScreenTabs(NFL_FEED_SCREEN_ID, capabilities);

      expect(result).toEqual([
        { id: 'props', label: 'Props', feedId: 'venue-props' },
      ]);
    });

    it.each<PredictVenueCapabilities>([
      { status: 'loading' },
      { status: 'unavailable', reason: 'unknown_venue' },
      { status: 'unavailable', reason: 'invalid_catalog' },
      { status: 'unavailable', reason: 'error', retry: jest.fn() },
    ])('resolves no tabs while capabilities are $status', (capabilities) => {
      const result = resolveFeedScreenTabs(NFL_FEED_SCREEN_ID, capabilities);

      expect(result).toEqual([]);
    });

    it('resolves no tabs for an unknown Feed Screen', () => {
      const capabilities = readyCapabilities({ 'nfl-games': 'venue-games' });

      const result = resolveFeedScreenTabs('missing-feed-screen', capabilities);

      expect(result).toEqual([]);
    });
  });

  describe('getFeedScreenTab', () => {
    const tabs: FeedScreenTab[] = [
      { id: 'games', label: 'Games', feedId: 'nfl-games' as PredictFeedId },
      { id: 'props', label: 'Props', feedId: 'nfl-props' as PredictFeedId },
    ];

    it('returns the selected tab', () => {
      const result = getFeedScreenTab(tabs, 'props');

      expect(result).toBe(tabs[1]);
    });

    it.each([undefined, 'missing-tab'])(
      'returns the first tab when the selected tab is %s',
      (selectedTabId) => {
        const result = getFeedScreenTab(tabs, selectedTabId);

        expect(result).toBe(tabs[0]);
      },
    );

    it('returns undefined when no tab is supported', () => {
      const result = getFeedScreenTab([], 'games');

      expect(result).toBeUndefined();
    });
  });
});
