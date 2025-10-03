/**
 * Props for the BalanceEmptyState smart component
 */
export interface BalanceEmptyStateProps {
  /**
   * Optional callback function to override the default deposit navigation.
   * If not provided, will navigate to the deposit flow with tracking.
   */
  onAction?: () => void;
  /**
   * Test ID for component testing
   */
  testID?: string;
}
