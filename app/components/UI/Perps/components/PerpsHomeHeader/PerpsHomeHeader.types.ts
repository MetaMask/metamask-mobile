/**
 * Perps home header chrome.
 *
 * - **`segment: 'nav'`** (default): top bar — `HeaderStandard` or expanded search.
 * - **`segment: 'title'`**: scroll title row (Perps title + provider / testnet badges).
 */
export interface PerpsHomeHeaderProps {
  segment?: 'nav' | 'title';

  /**
   * Custom title when `segment` is `'title'`.
   * @default strings('perps.title')
   */
  screenTitle?: string;

  isSearchVisible?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onSearchClear?: () => void;
  onBack?: () => void;
  onSearchToggle?: () => void;
  testID?: string;
}
