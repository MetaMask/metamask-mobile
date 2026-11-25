import { strings } from '../../../../../../locales/i18n';
import type { PerpsCategory } from '../../hooks/usePerpsCategories';
import {
  EXPLORE_WATCHLIST_TAB_ID,
  type ExploreTab,
  type ExploreTabId,
} from './PerpsExploreSection.types';

/**
 * Categories that replace the stacked home market sections. Other categories
 * (Pre-IPO, Indices, ETFs, Memecoins, New) only appear when the products
 * flag is on, matching the products row they replace.
 */
const NEW_TAB_ID = 'new' satisfies ExploreTabId;

const MARKET_SECTION_TAB_IDS = new Set<ExploreTabId>([
  'crypto',
  'stock',
  'commodity',
  'forex',
]);

/**
 * Pills for the Explore section. The four market-section categories always
 * qualify. Other categories and New only qualify when the products flag is
 * on. Watchlist is first when that flag is on.
 */
export function buildExploreTabs({
  categories,
  isProductsEnabled,
  isWatchlistEnabled,
  hasNewMarkets,
}: {
  categories: PerpsCategory[];
  isProductsEnabled: boolean;
  isWatchlistEnabled: boolean;
  hasNewMarkets: boolean;
}): ExploreTab[] {
  const categoryTabs = (
    isProductsEnabled
      ? categories
      : categories.filter((category) => MARKET_SECTION_TAB_IDS.has(category.id))
  ).map(
    (category): ExploreTab => ({
      id: category.id,
      label: category.label,
    }),
  );

  if (
    isProductsEnabled &&
    hasNewMarkets &&
    !categoryTabs.some((tab) => tab.id === NEW_TAB_ID)
  ) {
    categoryTabs.push({
      id: NEW_TAB_ID,
      label: strings('perps.home.tabs.new'),
    });
  }

  if (isWatchlistEnabled) {
    categoryTabs.unshift({
      id: EXPLORE_WATCHLIST_TAB_ID,
      label: strings('perps.watchlist.filter_badge_label'),
      iconOnly: true,
    });
  }

  return categoryTabs;
}
