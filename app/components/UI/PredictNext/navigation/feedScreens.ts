import {
  PREDICT_SURFACE_FEED_KEYS,
  resolveSurfaceFeeds,
  type PredictVenueCapabilities,
} from '../capabilities';
import type { PredictFeedId } from '../types';

export const NFL_FEED_SCREEN_ID = 'sports-football-nfl';
export const NCAA_FEED_SCREEN_ID = 'sports-football-ncaa';

type FeedScreenTabKeys = typeof PREDICT_SURFACE_FEED_KEYS.nextFeedScreenTabs;

interface FeedScreenTabDefinition<TTabId extends string = string> {
  id: TTabId;
  label: string;
}

export interface FeedScreenDefinition {
  title: string;
  selectionLabel?: string;
  tabs: readonly FeedScreenTabDefinition[];
}

/** A Feed Screen tab whose Feed the Venue supports. */
export interface FeedScreenTab extends FeedScreenTabDefinition {
  feedId: PredictFeedId;
}

/** Feed Screen copy and tab order. Each tab's Feed key comes from
 * {@link PREDICT_SURFACE_FEED_KEYS}, so a tab exists only where it has one. */
export const FEED_SCREENS = {
  [NFL_FEED_SCREEN_ID]: {
    title: 'Sports',
    selectionLabel: 'NFL',
    tabs: [
      { id: 'games', label: 'Games' },
      { id: 'props', label: 'Props' },
    ],
  },
  [NCAA_FEED_SCREEN_ID]: {
    title: 'Sports',
    selectionLabel: 'NCAAF',
    tabs: [
      { id: 'games', label: 'Games' },
      { id: 'props', label: 'Props' },
    ],
  },
} as const satisfies {
  [TScreenId in keyof FeedScreenTabKeys]: FeedScreenDefinition & {
    tabs: readonly FeedScreenTabDefinition<
      keyof FeedScreenTabKeys[TScreenId] & string
    >[];
  };
};

export type FeedScreenId = keyof typeof FEED_SCREENS;

const isFeedScreenId = (feedScreenId: string): feedScreenId is FeedScreenId =>
  Object.prototype.hasOwnProperty.call(FEED_SCREENS, feedScreenId);

export const getFeedScreen = (
  feedScreenId: string,
): FeedScreenDefinition | undefined =>
  isFeedScreenId(feedScreenId) ? FEED_SCREENS[feedScreenId] : undefined;

/** The Feed Screen's tabs the Venue supports, in definition order. Empty
 * unless capabilities are ready, and for an unknown Feed Screen. */
export const resolveFeedScreenTabs = (
  feedScreenId: string,
  capabilities: PredictVenueCapabilities,
): FeedScreenTab[] => {
  if (!isFeedScreenId(feedScreenId)) {
    return [];
  }
  const feeds = resolveSurfaceFeeds<string>(
    capabilities,
    PREDICT_SURFACE_FEED_KEYS.nextFeedScreenTabs[feedScreenId],
  );
  return FEED_SCREENS[feedScreenId].tabs.flatMap((tab) => {
    const feed = feeds.find(({ sectionId }) => sectionId === tab.id);
    return feed ? [{ ...tab, feedId: feed.feedId }] : [];
  });
};

/** The selected tab, else the first. Undefined only when there are no tabs. */
export const getFeedScreenTab = (
  tabs: readonly FeedScreenTab[],
  selectedTabId?: string,
): FeedScreenTab | undefined =>
  tabs.find(({ id }) => id === selectedTabId) ?? tabs[0];
