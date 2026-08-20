import type { PredictFeedId } from '../types';

export const NFL_FEED_SCREEN_ID = 'sports-football-nfl';
export const NCAA_FEED_SCREEN_ID = 'sports-football-ncaa';

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
        feedId: 'sports-football-nfl-games' as PredictFeedId,
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
        feedId: 'sports-football-ncaa-games' as PredictFeedId,
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
