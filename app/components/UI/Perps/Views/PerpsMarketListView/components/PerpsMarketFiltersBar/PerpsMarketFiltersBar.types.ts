import type { SortOptionId } from '@metamask/perps-controller/constants/perpsConfig';
import type { MarketTypeFilter } from '@metamask/perps-controller/types';

/**
 * Props for PerpsMarketFiltersBar component
 */
export interface PerpsMarketFiltersBarProps {
  /**
   * Currently selected sort option ID
   */
  selectedOptionId: SortOptionId;

  /**
   * Callback when sort dropdown is pressed
   */
  onSortPress: () => void;

  /**
   * Selected market type filter
   */
  marketTypeFilter: MarketTypeFilter;

  /**
   * Callback when a category is selected
   */
  onCategorySelect: (category: MarketTypeFilter) => void;

  /**
   * Optional list of available categories (for hiding empty categories)
   */
  availableCategories?: Exclude<MarketTypeFilter, 'all'>[];

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
