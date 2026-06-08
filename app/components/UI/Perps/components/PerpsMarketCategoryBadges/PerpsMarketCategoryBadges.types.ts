import { type MarketTypeFilter } from '@metamask/perps-controller';

export interface PerpsMarketCategoryBadgesProps {
  /**
   * Currently selected category filter ('all' means no category selected)
   */
  selectedCategory: MarketTypeFilter;
  /**
   * Callback when a category is selected
   */
  onCategorySelect: (category: MarketTypeFilter) => void;
  /**
   * Optional list of available categories to display (for hiding empty categories)
   * If not provided, all categories will be shown
   */
  availableCategories?: Exclude<MarketTypeFilter, 'all'>[];
  /**
   * Whether to show the watchlist (star) filter badge.
   * Should be true only when the user has at least one market on their watchlist.
   */
  showWatchlistBadge?: boolean;
  /**
   * Whether the watchlist filter is currently active
   */
  isWatchlistSelected?: boolean;
  /**
   * Callback when the watchlist badge is pressed
   */
  onWatchlistToggle?: () => void;
  /**
   * Optional test ID for E2E testing
   */
  testID?: string;
}

/**
 * Configuration for a category badge
 */
export interface CategoryBadgeConfig {
  category: Exclude<MarketTypeFilter, 'all'>;
  labelKey: string;
}
