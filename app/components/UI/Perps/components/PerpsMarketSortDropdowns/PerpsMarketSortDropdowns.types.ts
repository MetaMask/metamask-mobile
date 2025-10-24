import type { SortOptionId } from '../../constants/perpsConfig';

/**
 * Props for PerpsMarketSortDropdowns component
 */
export interface PerpsMarketSortDropdownsProps {
  /**
   * Currently selected sort option ID
   */
  selectedOptionId: SortOptionId;
  /**
   * Callback when sort field button is pressed
   */
  onSortPress: () => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
