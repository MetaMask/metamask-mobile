import type { MarketTypeFilter } from '../../controllers/types';

/**
 * Props for PerpsMarketTypeDropdown component
 */
export interface PerpsMarketTypeDropdownProps {
  /**
   * Currently selected market type filter
   */
  selectedFilter: MarketTypeFilter;
  /**
   * Callback when dropdown is pressed
   */
  onPress: () => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
