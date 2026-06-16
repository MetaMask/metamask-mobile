import { IconName } from '@metamask/design-system-react-native';
import { IconName as LocalIconName } from '../../../../../../../component-library/components/Icons/Icon';
import type { PredictFeedId } from '../../../../constants/feedConfig';

/**
 * A static destination tile in the Predict home "Categories" section.
 *
 * `id` is the stable, analytics-friendly identifier for the tile. `feedId`
 * targets the generic `PredictFeedView` route (must be a valid
 * {@link PredictFeedId} registered in `feedConfig.ts`). `titleKey` is the i18n
 * key for the tile label. `iconName` is the design-system icon for standard
 * DS icons, or a local component-library icon for custom additions (e.g.
 * Trophy) not yet published in a DS package release.
 */
export interface PredictHomeCategory {
  id: string;
  feedId: PredictFeedId;
  titleKey: string;
  iconName: IconName | LocalIconName;
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
    iconName: LocalIconName.Trophy,
  },
  {
    id: 'crypto',
    feedId: 'crypto',
    titleKey: 'predict.category.crypto',
    iconName: IconName.MoneyBag,
  },
] as const;
