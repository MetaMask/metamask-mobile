/**
 * Props for ListHeaderWithSearch component
 */
export interface ListHeaderWithSearchProps {
  /**
   * Header title text
   */
  title?: string;

  /**
   * Default title to use if title prop is not provided
   */
  defaultTitle: string;

  /**
   * Whether search bar is currently visible
   * @default false
   */
  isSearchVisible?: boolean;

  /**
   * Search query value (required when isSearchVisible is true)
   */
  searchQuery?: string;

  /**
   * Search placeholder text
   */
  searchPlaceholder: string;

  /**
   * Cancel button text
   */
  cancelText: string;

  /**
   * Callback when search query changes
   */
  onSearchQueryChange?: (query: string) => void;

  /**
   * Callback when search clear button is pressed
   */
  onSearchClear?: () => void;

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
