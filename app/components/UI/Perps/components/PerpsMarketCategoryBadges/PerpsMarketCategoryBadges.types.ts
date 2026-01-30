import type { MarketTypeFilter } from '../../controllers/types';

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
