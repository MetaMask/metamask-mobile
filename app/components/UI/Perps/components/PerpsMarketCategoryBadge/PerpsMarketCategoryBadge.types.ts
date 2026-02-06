export interface PerpsMarketCategoryBadgeProps {
  /**
   * Display label for the badge
   */
  label: string;
  /**
   * Whether this badge is currently selected
   */
  isSelected: boolean;
  /**
   * Whether to show the dismiss "×" icon (typically when selected)
   */
  showDismiss?: boolean;
  /**
   * Callback when the badge is pressed
   */
  onPress: () => void;
  /**
   * Callback when the dismiss icon is pressed (only used when showDismiss is true)
   */
  onDismiss?: () => void;
  /**
   * Optional test ID for E2E testing
   */
  testID?: string;
}
