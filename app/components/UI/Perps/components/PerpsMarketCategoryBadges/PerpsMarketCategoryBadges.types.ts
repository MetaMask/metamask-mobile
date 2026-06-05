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
   * Optional list of available categories to display (for hiding empty categories).
   * If not provided, all categories derived from market data will be shown.
   */
  availableCategories?: Exclude<MarketTypeFilter, 'all'>[];
  /**
   * Append the 'new' sentinel category (not a data-model category).
   * @default false
   */
  includeNew?: boolean;
  /**
   * Optional test ID for E2E testing
   */
  testID?: string;
}
