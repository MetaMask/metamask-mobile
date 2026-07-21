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
   * Number of markets currently shown in the list (reflects active filters).
   * Displayed on the left of the sort row.
   */
  marketCount: number;

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
   * Whether to render row 1 (category badges). Defaults to `true`.
   * Set `false` when the caller renders the category row separately
   * (e.g. above another section that must sit between the two rows).
   */
  showCategoryRow?: boolean;

  /**
   * Whether to render row 2 (market count + sort dropdown). Defaults to `true`.
   * Still hidden when `isWatchlistSelected` is `true`, regardless of this prop.
   */
  showSortRow?: boolean;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
