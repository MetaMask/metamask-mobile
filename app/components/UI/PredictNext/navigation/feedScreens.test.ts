import type { PredictVenueCapabilities } from '../capabilities';
import type {
  PredictFeedId,
  PredictVenueFeedScreen,
  PredictVenueId,
} from '../types';
import {
  NFL_FEED_SCREEN_ID,
  POLITICS_FEED_SCREEN_ID,
  SPORTS_FEED_SCREEN_ID,
  getFeedScreen,
  getFeedScreenTab,
  getKnownFeedScreenLabel,
  getKnownFeedScreenTitle,
  type FeedScreenTab,
} from './feedScreens';

const KALSHI_SCREENS: PredictVenueFeedScreen[] = [
  {
    id: 'sports-football-nfl',
    title: 'Sports',
    subtitle: 'NFL',
    tabs: [
      { id: 'games', title: 'Games', feed: 'nfl-games' },
      { id: 'props', title: 'Props', feed: 'nfl-props' },
    ],
  },
  {
    id: 'sports',
    title: 'Sports',
    tabs: [
      { id: 'nfl', title: 'NFL', feed: 'nfl-games' },
      { id: 'ncaaf', title: 'NCAAF', feed: 'college-football-games' },
    ],
  },
  {
    id: 'politics',
    title: 'Politics',
    tabs: [
      { id: 'trump', title: 'Trump', feed: 'politics-trump' },
      { id: 'congress', title: 'Congress', feed: 'politics-congress' },
      { id: 'iran', title: 'Iran', feed: 'politics-iran' },
    ],
  },
];

const readyCapabilities = (
  feeds: Record<string, string>,
  screens: PredictVenueFeedScreen[] = KALSHI_SCREENS,
): PredictVenueCapabilities => ({
  status: 'ready',
  descriptor: {
    venueId: 'test-venue' as PredictVenueId,
    displayName: 'Test Venue',
    actions: [],
    feeds: feeds as Record<string, PredictFeedId>,
    categories: [],
    searchSupported: false,
    screens,
  },
});

describe('feedScreens', () => {
  describe('getFeedScreen', () => {
    it('labels a known screen and its tabs, resolving each tab to the Venue Feed ID in catalog order', () => {
      const capabilities = readyCapabilities({
        'nfl-props': 'venue-nfl-props',
        'nfl-games': 'venue-nfl-games',
      });

      const result = getFeedScreen(NFL_FEED_SCREEN_ID, capabilities);

      expect(result).toEqual({
        id: NFL_FEED_SCREEN_ID,
        title: 'Sports',
        selectionLabel: 'NFL',
        tabs: [
          { id: 'games', label: 'Games', feedId: 'venue-nfl-games' },
          { id: 'props', label: 'Props', feedId: 'venue-nfl-props' },
        ],
      });
    });

    it('resolves the Politics topic tabs in Trump, Congress, Iran order', () => {
      const capabilities = readyCapabilities({
        'politics-iran': 'politics-iran',
        'politics-trump': 'politics-trump',
        'politics-congress': 'politics-congress',
      });

      const result = getFeedScreen(POLITICS_FEED_SCREEN_ID, capabilities);

      expect(result?.title).toBe('Politics');
      expect(result?.selectionLabel).toBeUndefined();
      expect(result?.tabs).toEqual([
        { id: 'trump', label: 'Trump', feedId: 'politics-trump' },
        { id: 'congress', label: 'Congress', feedId: 'politics-congress' },
        { id: 'iran', label: 'Iran', feedId: 'politics-iran' },
      ]);
    });

    it('shows a screen and tab added only on the server under their server titles', () => {
      const capabilities = readyCapabilities(
        { 'nba-games': 'venue-nba-games', 'nfl-games': 'venue-nfl-games' },
        [
          {
            id: 'sports-basketball-nba',
            title: 'Basketball',
            subtitle: 'NBA',
            tabs: [{ id: 'games', title: 'Matchups', feed: 'nba-games' }],
          },
          {
            id: 'sports',
            title: 'Sports',
            tabs: [
              { id: 'nfl', title: 'NFL', feed: 'nfl-games' },
              { id: 'nba', title: 'NBA', feed: 'nba-games' },
            ],
          },
        ],
      );

      expect(getFeedScreen('sports-basketball-nba', capabilities)).toEqual({
        id: 'sports-basketball-nba',
        title: 'Basketball',
        selectionLabel: 'NBA',
        tabs: [{ id: 'games', label: 'Matchups', feedId: 'venue-nba-games' }],
      });
      expect(getFeedScreen(SPORTS_FEED_SCREEN_ID, capabilities)?.tabs).toEqual([
        { id: 'nfl', label: 'NFL', feedId: 'venue-nfl-games' },
        { id: 'nba', label: 'NBA', feedId: 'venue-nba-games' },
      ]);
    });

    it('omits a tab whose Feed key the Venue lacks', () => {
      const capabilities = readyCapabilities({ 'nfl-props': 'venue-props' });

      const result = getFeedScreen(NFL_FEED_SCREEN_ID, capabilities);

      expect(result?.tabs).toEqual([
        { id: 'props', label: 'Props', feedId: 'venue-props' },
      ]);
    });

    it('returns undefined for a screen with no tab the Venue supports', () => {
      const capabilities = readyCapabilities({ trending: 'trending' });

      expect(
        getFeedScreen(SPORTS_FEED_SCREEN_ID, capabilities),
      ).toBeUndefined();
    });

    it.each(['missing-feed-screen', 'trending', 'toString', 'constructor'])(
      'returns undefined for the Feed Screen %s the catalog lacks',
      (feedScreenId) => {
        const capabilities = readyCapabilities({ 'nfl-games': 'venue-games' });

        expect(getFeedScreen(feedScreenId, capabilities)).toBeUndefined();
      },
    );

    it.each<PredictVenueCapabilities>([
      { status: 'loading' },
      { status: 'unavailable', reason: 'unknown_venue' },
      { status: 'unavailable', reason: 'invalid_catalog' },
      { status: 'unavailable', reason: 'error', retry: jest.fn() },
    ])('returns undefined while capabilities are $status', (capabilities) => {
      expect(getFeedScreen(NFL_FEED_SCREEN_ID, capabilities)).toBeUndefined();
    });
  });

  describe('getKnownFeedScreenTitle', () => {
    it('returns the localized title of a screen the app knows', () => {
      expect(getKnownFeedScreenTitle(POLITICS_FEED_SCREEN_ID)).toBe('Politics');
    });

    it('returns an empty title for a screen the app does not know', () => {
      expect(getKnownFeedScreenTitle('sports-basketball-nba')).toBe('');
    });
  });

  describe('getKnownFeedScreenLabel', () => {
    it.each([
      [NFL_FEED_SCREEN_ID, 'NFL'],
      ['sports-football-ncaa', 'NCAAF'],
      [POLITICS_FEED_SCREEN_ID, 'Politics'],
      ['sports-basketball-nba', ''],
    ])('labels %s as "%s"', (feedScreenId, label) => {
      expect(getKnownFeedScreenLabel(feedScreenId)).toBe(label);
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
