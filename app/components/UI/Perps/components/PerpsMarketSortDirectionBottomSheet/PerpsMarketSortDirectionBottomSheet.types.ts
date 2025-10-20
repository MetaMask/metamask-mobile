import type { SortDirection } from '../../utils/sortMarkets';

/**
 * Props for PerpsMarketSortDirectionBottomSheet component
 */
export interface PerpsMarketSortDirectionBottomSheetProps {
  /**
   * Whether the bottom sheet is visible
   */
  isVisible: boolean;
  /**
   * Callback when bottom sheet should close
   */
  onClose: () => void;
  /**
   * Currently selected sort direction
   */
  selectedDirection: SortDirection;
  /**
   * Callback when a sort direction is selected
   */
  onDirectionSelect: (direction: SortDirection) => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
