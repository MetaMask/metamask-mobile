import { IconName } from '@metamask/design-system-react-native';
import type { PredictFeedId } from '../../../../constants/feedConfig';

/**
 * A static destination tile in the Predict home "Categories" section.
 *
 * `id` is the stable, analytics-friendly identifier for the tile. `feedId`
 * targets the generic `PredictFeedView` route (must be a valid
 * {@link PredictFeedId} registered in `feedConfig.ts`). `titleKey` is the i18n
 * key for the tile label. `iconName` is the design-system icon shown above the
 * label — the Figma trophy (Sports) and gem (Crypto) glyphs have no exact DS
 * equivalent yet, so these are the closest built-in icons; swap them for exact
 * assets later without touching the section component.
 */
export interface PredictHomeCategory {
  id: string;
  feedId: PredictFeedId;
  titleKey: string;
  iconName: IconName;
}

/**
 * Ordered, static category tiles for the Predict home page (Figma order:
 * Politics, Sports, Crypto). No market fetch — these are fixed destination
 * buttons into the generic feed.
 */
export const PREDICT_HOME_CATEGORIES: readonly PredictHomeCategory[] = [
  {
    id: 'politics',
    feedId: 'politics',
    titleKey: 'predict.category.politics',
    iconName: IconName.Global,
  },
  {
    id: 'sports',
    feedId: 'sports',
    titleKey: 'predict.category.sports',
    iconName: IconName.Speedometer,
  },
  {
    id: 'crypto',
    feedId: 'crypto',
    titleKey: 'predict.category.crypto',
    iconName: IconName.MoneyBag,
  },
] as const;
