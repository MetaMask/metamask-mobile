import type { SortOptionId } from '../../../../constants/perpsConfig';

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
   * Whether watchlist-only filter is active
   */
  showWatchlistOnly: boolean;

  /**
   * Callback when watchlist filter is toggled
   */
  onWatchlistToggle: () => void;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
