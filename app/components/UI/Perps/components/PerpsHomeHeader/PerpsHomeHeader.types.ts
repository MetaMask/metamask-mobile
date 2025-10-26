/**
 * Props for PerpsHomeHeader component
 */
export interface PerpsHomeHeaderProps {
  /**
   * Header title text
   * @default strings('perps.title')
   */
  title?: string;

  /**
   * Whether search bar is currently visible
   * @default false
   */
  isSearchVisible?: boolean;

  /**
   * Callback when back button is pressed
   * If not provided, uses default navigation.goBack()
   */
  onBack?: () => void;

  /**
   * Callback when search toggle button is pressed
   */
  onSearchToggle?: () => void;

  /**
   * Test ID for the header container
   */
  testID?: string;
}
