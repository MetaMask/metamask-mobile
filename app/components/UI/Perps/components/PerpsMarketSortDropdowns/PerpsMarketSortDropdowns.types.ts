/**
 * Props for PerpsMarketSortDropdowns component
 */
export interface PerpsMarketSortDropdownsProps {
  /**
   * Currently selected sort option ID (e.g., 'volume', 'priceChange-desc')
   */
  selectedOptionId: string;
  /**
   * Callback when sort field button is pressed
   */
  onSortPress: () => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
