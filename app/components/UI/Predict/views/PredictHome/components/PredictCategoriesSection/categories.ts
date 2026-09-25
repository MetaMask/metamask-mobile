import { IconName as LocalIconName } from '../../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../../locales/i18n';
import {
  DEFAULT_PREDICT_HOME_CATEGORIES_FLAG,
  PREDICT_HOME_CATEGORY_FALLBACK_ICON_NAME,
  resolvePredictHomeCategoryCopy,
} from '../../../../constants/flags';
import type { PredictFeedId } from '../../../../constants/feedConfig';
import type {
  PredictHomeCategoriesConfig,
  PredictHomeCategoryConfig,
} from '../../../../types/flags';

/**
 * A render-ready destination tile in the Predict home "Categories" section.
 *
 * `id` is both the stable analytics identifier and the {@link PredictFeedId}
 * used to navigate to `PredictFeedView`. `iconName` targets the
 * component-library `Icon`, which includes custom icons (e.g. Trophy) not yet
 * in a DS package release.
 */
export interface PredictHomeCategory {
  id: PredictFeedId;
  /** Present when the tile should translate on each render (locale changes). */
  titleKey?: string;
  /** Remote `label`, or the last-resolved / raw-id fallback. */
  title: string;
  iconName: LocalIconName;
}

const LOCAL_ICON_NAMES = new Set<string>(Object.values(LocalIconName));

const FALLBACK_ICON_NAME = LocalIconName[
  PREDICT_HOME_CATEGORY_FALLBACK_ICON_NAME as keyof typeof LocalIconName
] as LocalIconName;

/**
 * Maps a remote `iconName` onto the component-library icon allowlist, falling
 * back to a default icon so an unknown/misspelled name never crashes a tile.
 */
export const resolvePredictHomeCategoryIcon = (
  iconName?: string,
): LocalIconName =>
  iconName && LOCAL_ICON_NAMES.has(iconName)
    ? (iconName as LocalIconName)
    : FALLBACK_ICON_NAME;

/**
 * Tile label: remote `label` wins; otherwise remote/locale-bank `titleKey`;
 * finally the raw id. Shipped ids live in `predict.category.*` so LD can omit copy.
 */
export const resolvePredictHomeCategoryTitle = (
  category: PredictHomeCategoryConfig,
): string => {
  const { label, titleKey } = resolvePredictHomeCategoryCopy(category);
  if (label) {
    return label;
  }
  if (titleKey) {
    return strings(titleKey, { defaultValue: category.id });
  }
  return category.id;
};

/**
 * Live tile / a11y label. `titleKey` is translated here so a locale change
 * updates the rail without remounting; `title` is the label or raw-id fallback.
 */
export const resolvePredictHomeCategoryDisplayTitle = (
  category: PredictHomeCategory,
): string =>
  category.titleKey
    ? strings(category.titleKey, { defaultValue: category.id })
    : category.title;

/**
 * Resolves the LaunchDarkly-driven rail into ordered, render-ready tiles:
 * array order is display order, disabled entries are dropped, and duplicate
 * ids keep their first occurrence. The bundled default is used when no config
 * is supplied.
 */
export const resolvePredictHomeCategories = (
  config: PredictHomeCategoriesConfig = DEFAULT_PREDICT_HOME_CATEGORIES_FLAG,
): PredictHomeCategory[] => {
  const seen = new Set<string>();
  const categories: PredictHomeCategory[] = [];

  for (const category of config.categories) {
    if (category.enabled === false || seen.has(category.id)) {
      continue;
    }
    seen.add(category.id);
    const { titleKey } = resolvePredictHomeCategoryCopy(category);
    categories.push({
      id: category.id,
      titleKey,
      title: resolvePredictHomeCategoryTitle(category),
      iconName: resolvePredictHomeCategoryIcon(category.iconName),
    });
  }

  return categories;
};

/**
 * Bundled category tiles (Politics, Sports, Crypto, Esports, Culture, Finance,
 * Tech). Rendered when the remote flag is missing or invalid.
 */
export const PREDICT_HOME_CATEGORIES: readonly PredictHomeCategory[] =
  resolvePredictHomeCategories();
