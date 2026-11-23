import { getVenueFeedId, type PredictVenueCapabilities } from '../capabilities';
import type { PredictFeedId } from '../types';
import { strings } from '../../../../../locales/i18n';

/**
 * Kalshi's Feed Screen IDs, for tests and fixtures. No surface opens a screen
 * by a hardcoded ID: Home's headers name theirs in the catalog's `home`
 * (PRED-1527), and the screens, their tabs and their order come from its
 * `screens` (PRED-1525).
 */
export const NFL_FEED_SCREEN_ID = 'sports-football-nfl';
export const NCAA_FEED_SCREEN_ID = 'sports-football-ncaa';
export const POLITICS_FEED_SCREEN_ID = 'politics';
export const SPORTS_FEED_SCREEN_ID = 'sports';

/** A Feed Screen ID: any kebab-case ID the Venue catalog serves. */
export type FeedScreenId = string;

/** A Feed Screen tab, labelled for display, on a Feed the Venue serves. */
export interface FeedScreenTab {
  id: string;
  label: string;
  feedId: PredictFeedId;
}

/** A Feed Screen from the Venue catalog, labelled for display. */
export interface FeedScreenDefinition {
  id: FeedScreenId;
  title: string;
  selectionLabel?: string;
  /** In catalog order; never empty. */
  tabs: readonly FeedScreenTab[];
}

/**
 * The app's copy for an ID it knows, else `fallback`: the server's title, so
 * a screen or tab added on the server reads sensibly without a release.
 */
const localized = (key: string, fallback: string): string => {
  const value: unknown = strings(`predict_next.feed_screens.${key}`, {
    defaultValue: fallback,
  });
  return typeof value === 'string' ? value : fallback;
};

/** The app's title for a Feed Screen ID it knows, else an empty string. */
export const getKnownFeedScreenTitle = (feedScreenId: FeedScreenId): string =>
  localized(`titles.${feedScreenId}`, '');

/**
 * The Venue's Feed Screen `feedScreenId`, labelled, with the tabs whose Feed
 * the Venue serves. Undefined unless capabilities are ready and the catalog
 * has the screen with at least one such tab.
 */
export const getFeedScreen = (
  feedScreenId: FeedScreenId,
  capabilities: PredictVenueCapabilities,
): FeedScreenDefinition | undefined => {
  if (capabilities.status !== 'ready') {
    return undefined;
  }
  const screen = capabilities.descriptor.screens.find(
    ({ id }) => id === feedScreenId,
  );
  if (!screen) {
    return undefined;
  }
  const tabs = screen.tabs.flatMap((tab) => {
    const feedId = getVenueFeedId(capabilities, tab.feed);
    return feedId
      ? [
          {
            id: tab.id,
            label: localized(`tabs.${screen.id}.${tab.id}`, tab.title),
            feedId,
          },
        ]
      : [];
  });
  if (tabs.length === 0) {
    return undefined;
  }
  return {
    id: screen.id,
    title: localized(`titles.${screen.id}`, screen.title),
    ...(screen.subtitle
      ? {
          selectionLabel: localized(`subtitles.${screen.id}`, screen.subtitle),
        }
      : {}),
    tabs,
  };
};

/** The selected tab, else the first. Undefined only when there are no tabs. */
export const getFeedScreenTab = (
  tabs: readonly FeedScreenTab[],
  selectedTabId?: string,
): FeedScreenTab | undefined =>
  tabs.find(({ id }) => id === selectedTabId) ?? tabs[0];
