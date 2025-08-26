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
}
