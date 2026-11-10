import type { PredictVenueCapabilities } from '../../../capabilities';
import {
  NFL_FEED_SCREEN_ID,
  POLITICS_FEED_SCREEN_ID,
  resolveFeedScreenTabs,
  type FeedScreenId,
} from '../../../navigation/feedScreens';
import type { PredictFeedKey } from '../../../types';
import { strings } from '../../../../../../../locales/i18n';

/**
 * The Feed Screen each Category opens, by the Category's Feed key. The Venue
 * catalog decides which Categories exist and their order; this only says
 * where a chip goes. A Category missing here shows no chip. Sports opens the
 * NFL Feed Screen until Sports has a league switch.
 */
const CATEGORY_FEED_SCREENS: Partial<Record<PredictFeedKey, FeedScreenId>> = {
  sports: NFL_FEED_SCREEN_ID,
  politics: POLITICS_FEED_SCREEN_ID,
};

/** A Category chip the Active Venue can open. */
export interface HomeCategory {
  id: PredictFeedKey;
  label: string;
  feedScreenId: FeedScreenId;
  /** The tab showing the Category's Feed. Undefined opens the first tab. */
  tabId?: string;
}

/**
 * The Venue's Categories in catalog order whose Feed Screen has at least one
 * tab the Venue supports (PRED-1485). Empty until capabilities are ready, and
 * never another Venue's Feed Screen.
 */
export const resolveHomeCategories = (
  capabilities: PredictVenueCapabilities,
): HomeCategory[] => {
  if (capabilities.status !== 'ready') {
    return [];
  }
  const { categories, feeds } = capabilities.descriptor;
  return categories.flatMap((id) => {
    const feedScreenId = CATEGORY_FEED_SCREENS[id];
    if (!feedScreenId) {
      return [];
    }
    const tabs = resolveFeedScreenTabs(feedScreenId, capabilities);
    if (tabs.length === 0) {
      return [];
    }
    return [
      {
        id,
        label: strings(`predict_next.home_categories.${id}`),
        feedScreenId,
        tabId: tabs.find(({ feedId }) => feedId === feeds[id])?.id,
      },
    ];
  });
};
