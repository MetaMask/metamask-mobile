import type { SortField, SortDirection } from '../../utils/sortMarkets';

/**
 * Props for PerpsMarketSortDropdowns component
 */
export interface PerpsMarketSortDropdownsProps {
  /**
   * Current sort field selection
   */
  sortBy: SortField;
  /**
   * Current sort direction
   */
  direction: SortDirection;
  /**
   * Callback when sort field button is pressed
   */
  onSortPress: () => void;
  /**
   * Callback when direction button is pressed
   */
  onDirectionPress: () => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
