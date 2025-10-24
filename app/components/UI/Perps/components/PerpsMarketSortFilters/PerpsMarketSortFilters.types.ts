import type { SortField, SortDirection } from '../../utils/sortMarkets';

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
   * Test ID for E2E testing
   */
  testID?: string;
}
