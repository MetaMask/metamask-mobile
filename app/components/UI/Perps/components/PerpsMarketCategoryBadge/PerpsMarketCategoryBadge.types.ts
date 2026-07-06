import { IconName } from '@metamask/design-system-react-native';

export interface PerpsMarketCategoryBadgeProps {
  /**
   * Display label for the badge. Mutually exclusive with `icon` — provide one or the other.
   */
  label?: string;
  /**
   * Icon to render inside the badge (icon-only mode). Takes precedence over `label`.
   */
  icon?: IconName;
  /**
   * Accessibility label — required when using icon-only mode so screen readers can
   * still announce the badge's purpose.
   */
  accessibilityLabel: string;
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
