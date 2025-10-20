import type { SortField } from '../../utils/sortMarkets';

/**
 * Props for PerpsMarketSortFieldBottomSheet component
 */
export interface PerpsMarketSortFieldBottomSheetProps {
  /**
   * Whether the bottom sheet is visible
   */
  isVisible: boolean;
  /**
   * Callback when bottom sheet should close
   */
  onClose: () => void;
  /**
   * Currently selected sort field
   */
  selectedSort: SortField;
  /**
   * Callback when a sort field is selected
   */
  onSortSelect: (sort: SortField) => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
