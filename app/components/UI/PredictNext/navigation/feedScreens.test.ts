import {
  FEED_SCREENS,
  NFL_FEED_SCREEN_ID,
  getFeedScreen,
  getFeedScreenTab,
} from './feedScreens';

describe('feedScreens', () => {
  describe('getFeedScreen', () => {
    it('returns the matching Feed Screen definition', () => {
      const result = getFeedScreen(NFL_FEED_SCREEN_ID);

      expect(result).toBe(FEED_SCREENS[NFL_FEED_SCREEN_ID]);
    });

    it('returns undefined for an unknown Feed Screen ID', () => {
      const result = getFeedScreen('missing-feed-screen');

      expect(result).toBeUndefined();
    });
  });

  describe('getFeedScreenTab', () => {
    const definition = {
      title: 'Sports',
      tabs: [
        { id: 'games', label: 'Games', feedId: 'nfl-games' },
        { id: 'props', label: 'Props', feedId: 'nfl-props' },
      ],
    } as const;

    it('returns the selected tab', () => {
      const result = getFeedScreenTab(definition, 'props');

      expect(result).toBe(definition.tabs[1]);
    });

    it.each([undefined, 'missing-tab'])(
      'returns the first tab when the selected tab is %s',
      (selectedTabId) => {
        const result = getFeedScreenTab(definition, selectedTabId);

        expect(result).toBe(definition.tabs[0]);
      },
    );
  });
});
