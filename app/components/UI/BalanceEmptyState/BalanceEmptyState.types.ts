/**
 * Props for the BalanceEmptyState component
 */
export interface BalanceEmptyStateProps {
  /**
   * Callback function triggered when the action button is pressed
   */
  onAction?: () => void;
  /**
   * Test ID for component testing
   */
  testID?: string;
  /**
   * Title text to display (defaults to "Fund your wallet")
   */
  title?: string;
  /**
   * Subtitle text to display (defaults to "Buy tokens to get started")
   */
  subtitle?: string;
  /**
   * Action button text (defaults to "Buy crypto")
   */
  actionText?: string;
}
