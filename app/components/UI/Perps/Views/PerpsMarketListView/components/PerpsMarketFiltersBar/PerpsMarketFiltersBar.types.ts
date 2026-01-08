import type { SortOptionId } from '../../../../constants/perpsConfig';

/**
 * Props for PerpsMarketFiltersBar component
 */
export interface PerpsMarketFiltersBarProps {
  /**
   * Currently selected sort option ID
   */
  selectedOptionId: SortOptionId;

  /**
   * Callback when sort dropdown is pressed
   */
  onSortPress: () => void;

  /**
   * Whether to show stocks/commodities dropdown (only for Stocks tab)
   */
  showStocksCommoditiesDropdown?: boolean;

  /**
   * Selected stocks/commodities filter
   */
  stocksCommoditiesFilter?: 'all' | 'equity' | 'commodity';

  /**
   * Callback when stocks/commodities dropdown is pressed
   */
  onStocksCommoditiesPress?: () => void;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
