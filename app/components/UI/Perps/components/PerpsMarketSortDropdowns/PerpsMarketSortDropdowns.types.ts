import {
  type SortDirection,
  type SortOptionId,
} from '@metamask/perps-controller';

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
   * Active sort direction. Controls whether the accessory shows an up or down arrow.
   */
  sortDirection?: SortDirection;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
