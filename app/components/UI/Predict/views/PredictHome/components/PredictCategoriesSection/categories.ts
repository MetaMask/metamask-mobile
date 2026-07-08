import { IconName as LocalIconName } from '../../../../../../../component-library/components/Icons/Icon';
import {
  PREDICT_FEED_REGISTRY,
  type PredictFeedId,
} from '../../../../constants/feedConfig';

/**
 * A static destination tile in the Predict home "Categories" section.
 *
 * `id` is both the stable analytics identifier and the {@link PredictFeedId}
 * used to navigate to `PredictFeedView`. `titleKey` is derived from
 * {@link PREDICT_FEED_REGISTRY} so feed identity has a single source of truth.
 * `iconName` stays local — it targets the component-library `Icon`, which
 * includes custom icons (e.g. Trophy) not yet in a DS package release.
 */
export interface PredictHomeCategory {
  id: PredictFeedId;
  titleKey: string;
  iconName: LocalIconName;
}

const HOME_CATEGORY_FEED_IDS = [
  'politics',
  'sports',
  'crypto',
] as const satisfies readonly PredictFeedId[];

type HomeCategoryFeedId = (typeof HOME_CATEGORY_FEED_IDS)[number];

const CATEGORY_ICONS: Record<HomeCategoryFeedId, LocalIconName> = {
  politics: LocalIconName.Global,
  sports: LocalIconName.Trophy,
  crypto: LocalIconName.MoneyBag,
};

/**
 * Ordered, static category tiles for the Predict home page (Figma order:
 * Politics, Sports, Crypto). No market fetch — these are fixed destination
 * buttons into the generic feed.
 */
export const PREDICT_HOME_CATEGORIES: readonly PredictHomeCategory[] =
  HOME_CATEGORY_FEED_IDS.map((id) => ({
    id,
    titleKey: PREDICT_FEED_REGISTRY[id].titleKey,
    iconName: CATEGORY_ICONS[id],
  }));
