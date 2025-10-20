/**
 * Props for PerpsSearchBar component
 * Reusable search input UI component with no internal state
 */
export interface PerpsSearchBarProps {
  /**
   * Current search query value
   */
  value: string;
  /**
   * Callback when search text changes
   */
  onChangeText: (text: string) => void;
  /**
   * Optional placeholder text
   * @default 'perps.search_by_token_symbol'
   */
  placeholder?: string;
  /**
   * Whether to auto-focus the input on mount
   * @default false
   */
  autoFocus?: boolean;
  /**
   * Callback when clear button is pressed
   * If not provided, will call onChangeText('')
   */
  onClear?: () => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
