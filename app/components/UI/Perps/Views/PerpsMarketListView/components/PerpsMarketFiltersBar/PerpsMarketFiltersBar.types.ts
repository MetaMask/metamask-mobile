import {
  type SortOptionId,
  type MarketTypeFilter,
} from '@metamask/perps-controller';

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
   * Show the 'new' category badge when new markets exist.
   * @default false
   */
  includeNew?: boolean;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
