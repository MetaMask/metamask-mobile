import type { SortField, SortDirection } from '../../utils/sortMarkets';

/**
 * Sort option configuration
 */
export interface SortOption {
  field: SortField;
  labelKey: string;
}

/**
 * Props for PerpsMarketSortFilters component
 * Reusable sort chips + direction toggle UI (no internal state)
 */
export interface PerpsMarketSortFiltersProps {
  /**
   * Currently selected sort field
   */
  sortBy: SortField;
  /**
   * Current sort direction ('asc' | 'desc')
   */
  direction: SortDirection;
  /**
   * Callback when sort field changes
   */
  onSortChange: (field: SortField) => void;
  /**
   * Callback when direction toggle is pressed
   */
  onDirectionToggle: () => void;
  /**
   * Optional custom sort options
   * If not provided, uses MARKET_SORTING_CONFIG.SORT_BUTTON_PRESETS
   */
  sortOptions?: SortOption[];
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
