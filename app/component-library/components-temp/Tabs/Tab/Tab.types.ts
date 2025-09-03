/**
 * Tab component props
 */
export interface TabProps {
  /**
   * The label text for the tab
   */
  label: string;
  /**
   * Whether the tab is currently active
   */
  isActive: boolean;
  /**
   * Whether the tab is disabled (locked)
   */
  disabled?: boolean;
  /**
   * Callback when tab is pressed
   */
  onPress: () => void;
  /**
   * Test ID for testing
   */
  testID?: string;
}

