/**
 * Props for TrendingListHeader component
 */
export interface TrendingListHeaderProps {
  /**
   * Header title text
   * @default strings('trending.trending_tokens')
   */
  title?: string;

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
