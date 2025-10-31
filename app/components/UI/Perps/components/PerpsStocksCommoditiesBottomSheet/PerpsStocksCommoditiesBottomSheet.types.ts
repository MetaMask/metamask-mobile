/**
 * PerpsStocksCommoditiesBottomSheet component props
 */
export interface PerpsStocksCommoditiesBottomSheetProps {
  /**
   * Whether the bottom sheet is visible
   */
  isVisible: boolean;
  /**
   * Callback when sheet should be closed
   */
  onClose: () => void;
  /**
   * Currently selected filter
   */
  selectedFilter: 'all' | 'equity' | 'commodity';
  /**
   * Callback when a filter is selected
   */
  onFilterSelect: (filter: 'all' | 'equity' | 'commodity') => void;
  /**
   * Test ID for the component
   */
  testID?: string;
}
