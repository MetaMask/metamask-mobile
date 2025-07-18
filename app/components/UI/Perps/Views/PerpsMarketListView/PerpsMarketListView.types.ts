/**
 * Market data for perps trading (UI-friendly format)
 * Protocol-agnostic interface that works with any perpetual futures provider
 */
export interface PerpsMarketData {
  /**
   * Token symbol (e.g., 'BTC', 'ETH')
   */
  symbol: string;
  /**
   * Full token name
   */
  name: string;
  /**
   * Maximum leverage available (e.g., '40x', '25x')
   */
  maxLeverage: string;
  /**
   * Current price as formatted string
   */
  price: string;
  /**
   * 24h price change as formatted string
   */
  change24h: string;
  /**
   * 24h price change percentage
   */
  change24hPercent: string;
  /**
   * Trading volume as formatted string
   */
  volume: string;
}

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
