/**
 * PerpsStocksCommoditiesDropdown component props
 */
export interface PerpsStocksCommoditiesDropdownProps {
  /**
   * Selected filter value
   */
  selectedFilter: 'all' | 'equity' | 'commodity';
  /**
   * Callback when dropdown is pressed
   */
  onPress: () => void;
  /**
   * Test ID for the component
   */
  testID?: string;
}
