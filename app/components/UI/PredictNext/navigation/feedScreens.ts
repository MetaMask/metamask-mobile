import type { PredictFeedId } from '../types';

export const NFL_FEED_SCREEN_ID = 'sports-football-nfl';
export const NCAA_FEED_SCREEN_ID = 'sports-football-ncaa';

export const NFL_GAMES_FEED_ID = 'sports-football-nfl-games' as PredictFeedId;
export const NFL_WIN_TOTALS_FEED_ID =
  'sports-football-nfl-win-totals' as PredictFeedId;
export const NCAA_GAMES_FEED_ID = 'sports-football-ncaa-games' as PredictFeedId;
export const NCAA_WIN_TOTALS_FEED_ID =
  'sports-football-ncaa-win-totals' as PredictFeedId;

interface FeedScreenTabDefinition {
  id: string;
  label: string;
  feedId: PredictFeedId;
}

export interface FeedScreenDefinition {
  title: string;
  selectionLabel?: string;
  tabs: readonly FeedScreenTabDefinition[];
}

export const FEED_SCREENS = {
  [NFL_FEED_SCREEN_ID]: {
    title: 'Sports',
    selectionLabel: 'NFL',
    tabs: [
      {
        id: 'games',
        label: 'Games',
        feedId: NFL_GAMES_FEED_ID,
      },
      {
        id: 'props',
        label: 'Props',
        feedId: NFL_WIN_TOTALS_FEED_ID,
      },
    ],
  },
  [NCAA_FEED_SCREEN_ID]: {
    title: 'Sports',
    selectionLabel: 'NCAAF',
    tabs: [
      {
        id: 'games',
        label: 'Games',
        feedId: NCAA_GAMES_FEED_ID,
      },
      {
        id: 'props',
        label: 'Props',
        feedId: NCAA_WIN_TOTALS_FEED_ID,
      },
    ],
  },
} as const satisfies Record<string, FeedScreenDefinition>;

export type FeedScreenId = keyof typeof FEED_SCREENS;

export const getFeedScreen = (
  feedScreenId: string,
): FeedScreenDefinition | undefined =>
  FEED_SCREENS[feedScreenId as FeedScreenId];

export const getFeedScreenTab = (
  definition: FeedScreenDefinition,
  selectedTabId?: string,
): FeedScreenTabDefinition =>
  definition.tabs.find(({ id }) => id === selectedTabId) ?? definition.tabs[0];
