import type { PredictVenueCapabilities } from '../../../capabilities';
import {
  getFeedScreen,
  type FeedScreenId,
} from '../../../navigation/feedScreens';
import type { PredictFeedKey } from '../../../types';
import { strings } from '../../../../../../../locales/i18n';

/** A Category chip the Active Venue can open. */
export interface HomeCategory {
  id: PredictFeedKey;
  label: string;
  /** The Feed Screen whose ID is the Category's Feed key. */
  feedScreenId: FeedScreenId;
  /** The tab showing the Category's Feed. Undefined opens the first tab. */
  tabId?: string;
}

/**
 * The Venue's Categories in catalog order whose Feed Screen, the catalog
 * screen with the Category's Feed key as its ID, has at least one tab the
 * Venue supports (PRED-1485, PRED-1526). A Category without that screen shows
 * no chip, so a screen removed on the server takes its chip with it. Empty
 * until capabilities are ready, and never another Venue's Feed Screen.
 */
export const resolveHomeCategories = (
  capabilities: PredictVenueCapabilities,
): HomeCategory[] => {
  if (capabilities.status !== 'ready') {
    return [];
  }
  const { categories, feeds } = capabilities.descriptor;
  return categories.flatMap((id) => {
    const feedScreen = getFeedScreen(id, capabilities);
    if (!feedScreen) {
      return [];
    }
    return [
      {
        id,
        label: strings(`predict_next.home_categories.${id}`, {
          defaultValue: feedScreen.title,
        }),
        feedScreenId: feedScreen.id,
        tabId: feedScreen.tabs.find(({ feedId }) => feedId === feeds[id])?.id,
      },
    ];
  });
};
