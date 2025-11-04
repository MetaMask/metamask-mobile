import type { PerpsMarketData } from '../../controllers/types';

/**
 * Generic market data interface that can be implemented by any protocol
 * This allows providers to return their raw data in any format,
 * which then gets transformed to PerpsMarketData for UI consumption
 */
export interface ProtocolMarketData {
  // This is intentionally generic - each provider can extend this
  // with their own specific data structure
  [key: string]: unknown;
}

/**
 * Props for PerpsMarketListView component
 * Now configurable for different use cases (full view, minimal view)
 */
export interface PerpsMarketListViewProps {
  /**
   * Callback when a market row is selected
   */
  onMarketSelect?: (market: PerpsMarketData) => void;
  /**
   * Optional protocol identifier to filter markets
   * If not provided, uses the active protocol from PerpsController
   */
  protocolId?: string;
  /**
   * View variant
   * - 'full': Full market list view with balance actions, tutorial, bottom nav
   * - 'minimal': Minimal view for embedded use (e.g., trending markets)
   * @default 'full'
   */
  variant?: 'full' | 'minimal';
  /**
   * Optional custom title
   * If not provided, uses default 'perps.title'
   */
  title?: string;
  /**
   * Show balance actions component (deposit/withdraw)
   * Only applicable when search is not visible
   * @default true
   */
  showBalanceActions?: boolean;
  /**
   * Show bottom navigation bar
   * @default true
   */
  showBottomNav?: boolean;
  /**
   * Start with search bar visible
   * @default false
   */
  defaultSearchVisible?: boolean;
  /**
   * Start with watchlist filter enabled (show only watchlisted markets)
   * @default false
   */
  showWatchlistOnly?: boolean;
}
