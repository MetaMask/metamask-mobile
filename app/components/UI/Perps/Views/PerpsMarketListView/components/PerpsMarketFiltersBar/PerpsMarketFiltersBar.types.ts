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
   * Whether to show the watchlist (star) filter badge.
   */
  showWatchlistBadge?: boolean;

  /**
   * Whether the watchlist filter badge is currently active
   */
  isWatchlistSelected?: boolean;

  /**
   * Callback when the watchlist badge is pressed
   */
  onWatchlistToggle?: () => void;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
