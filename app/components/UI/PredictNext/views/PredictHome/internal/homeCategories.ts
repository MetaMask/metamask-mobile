import type { PredictVenueCapabilities } from '../../../capabilities';
import {
  POLITICS_FEED_SCREEN_ID,
  resolveFeedScreenTabs,
  type FeedScreenId,
} from '../../../navigation/feedScreens';
import { strings } from '../../../../../../../locales/i18n';

export type HomeCategoryId =
  | 'politics'
  | 'sports'
  | 'crypto'
  | 'esports'
  | 'weather'
  | 'finance'
  | 'tech';

interface HomeCategoryDefinition {
  id: HomeCategoryId;
  /** The Feed Screen the chip opens. Undefined while the Category has none. */
  feedScreenId?: FeedScreenId;
}

/** A Category chip the Active Venue can open. */
export interface HomeCategory {
  id: HomeCategoryId;
  label: string;
  feedScreenId: FeedScreenId;
}

/**
 * Home's Categories in display order (PRED-1485). The list is fixed on the
 * client until product decides who owns it. A Category without a Feed Screen
 * stays listed so its chip appears once its Feeds exist. Sports has no Sports
 * hub yet: the NFL and NCAAF Feed Screens cannot switch league, so it stays
 * unmapped rather than opening one league.
 */
export const HOME_CATEGORIES: readonly HomeCategoryDefinition[] = [
  { id: 'politics', feedScreenId: POLITICS_FEED_SCREEN_ID },
  { id: 'sports' },
  { id: 'crypto' },
  { id: 'esports' },
  { id: 'weather' },
  { id: 'finance' },
  { id: 'tech' },
];

/**
 * The Categories whose Feed Screen has at least one tab the Venue supports,
 * in display order. Empty until capabilities are ready, and never another
 * Venue's Feed Screen.
 */
export const resolveHomeCategories = (
  capabilities: PredictVenueCapabilities,
): HomeCategory[] =>
  HOME_CATEGORIES.flatMap(({ id, feedScreenId }) =>
    feedScreenId && resolveFeedScreenTabs(feedScreenId, capabilities).length > 0
      ? [
          {
            id,
            label: strings(`predict_next.home_categories.${id}`),
            feedScreenId,
          },
        ]
      : [],
  );
