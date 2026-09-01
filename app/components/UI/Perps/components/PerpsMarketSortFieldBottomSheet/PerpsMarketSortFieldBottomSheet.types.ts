import {
  type SortField,
  type SortDirection,
  type SortOptionId,
} from '@metamask/perps-controller';

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
   * Currently selected option ID
   */
  selectedOptionId: SortOptionId;
  /**
   * Current sort direction (shown on the selected option; toggled in draft)
   */
  sortDirection: SortDirection;
  /**
   * Callback when Apply commits the draft sort (or Reset then Apply restores default)
   * @param optionId - The ID of the selected option
   * @param field - The sort field
   * @param direction - The sort direction
   */
  onOptionSelect: (
    optionId: SortOptionId,
    field: SortField,
    direction: SortDirection,
  ) => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
