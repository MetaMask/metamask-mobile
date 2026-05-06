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
   * Callback when the badge is pressed
   */
  onPress: () => void;
  /**
   * Optional test ID for E2E testing
   */
  testID?: string;
}
