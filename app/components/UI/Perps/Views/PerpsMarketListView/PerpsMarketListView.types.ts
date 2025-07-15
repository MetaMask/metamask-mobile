// Import HyperLiquid SDK types
import type {
  PerpsUniverse,
  PerpsAssetCtx,
  AllMids,
} from '@deeeed/hyperliquid-node20';

/**
 * Market data for perps trading (UI-friendly format)
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
 * Raw market data from HyperLiquid SDK
 */
export interface HyperLiquidMarketData {
  universe: PerpsUniverse[];
  assetCtxs: PerpsAssetCtx[];
  allMids: AllMids;
}

/**
 * Props for PerpsMarketListView component
 */
export interface PerpsMarketListViewProps {
  /**
   * Callback when a market row is selected
   */
  onMarketSelect?: (market: PerpsMarketData) => void;
}
