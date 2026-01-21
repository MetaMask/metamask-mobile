/**
 * MYX Protocol Type Definitions
 *
 * Re-exports SDK types and defines adapter-only types.
 * Following HyperLiquid pattern: import SDK types, only define what's missing.
 */

import type { CaipAssetId, CaipChainId, Hex } from '@metamask/utils';

// ============================================================================
// Re-export SDK Enums/Constants with MYX prefix for consistency
// ============================================================================

export {
  OrderType as MYXOrderType,
  TriggerType as MYXTriggerType,
  OperationType as MYXOperationType,
  Direction as MYXDirection,
  TimeInForce as MYXTimeInForce,
  OrderStatus as MYXOrderStatus,
  ChainId as MYXChainId,
  OracleType as MYXOracleType,
} from '@myx-trade/sdk';

// ============================================================================
// Re-export SDK Types with MYX prefix
// ============================================================================

export type {
  Position as MYXPosition,
  Order as MYXOrder,
  PlaceOrderParams as MYXPlaceOrderParams,
  PositionTpSlOrderParams as MYXPositionTpSlParams,
  TickerDataItem as MYXTicker,
  MarketDetailResponse as MYXMarketDetail,
  PoolSymbolAllResponse,
  MarketPool,
  MyxClient,
  MyxClientConfig,
  OnOrderCallback,
  OnPositionCallback,
  OnTickersCallback,
  OnKlineCallback,
  KlineResolution as MYXKlineResolution,
  // WebSocket Response Types
  TickersDataResponse as MYXTickersDataResponse,
  KlineDataResponse as MYXKlineDataResponse,
  KlineDataItemType as MYXKlineDataItem,
  // Pool Config
  PoolLevelConfig as MYXPoolLevelConfig,
  LevelConfig as MYXLevelConfig,
} from '@myx-trade/sdk';

// ============================================================================
// Extract Nested Types (following HyperLiquid pattern)
// ============================================================================

// Note: MYXPoolSymbol is the same as PoolSymbolAllResponse in SDK
// Re-export with alias for clarity
export type { PoolSymbolAllResponse as MYXPoolSymbol } from '@myx-trade/sdk';

// ============================================================================
// Types SDK Doesn't Export (our config/utility types)
// ============================================================================

/**
 * MYX Network type
 */
export type MYXNetwork = 'mainnet' | 'testnet';

/**
 * MYX Endpoint configuration
 */
export interface MYXEndpointConfig {
  http: string;
  ws: string;
}

/**
 * MYX Endpoints for different networks
 */
export interface MYXEndpoints {
  mainnet: MYXEndpointConfig;
  testnet: MYXEndpointConfig;
}

/**
 * MYX Asset network configuration
 */
export interface MYXAssetNetworkConfig {
  mainnet: CaipAssetId;
  testnet: CaipAssetId;
}

/**
 * MYX Asset configurations
 */
export interface MYXAssetConfigs {
  USDT: MYXAssetNetworkConfig;
}

/**
 * Bridge contract configuration
 */
export interface BridgeContractConfig {
  chainId: CaipChainId;
  contractAddress: Hex;
}

/**
 * MYX Bridge contracts for different networks
 */
export interface MYXBridgeContracts {
  mainnet: BridgeContractConfig;
  testnet: BridgeContractConfig;
}

// ============================================================================
// Transport Configuration Types
// ============================================================================

export interface MYXTransportReconnectConfig {
  maxRetries: number;
  connectionTimeout: number;
  reconnectInterval: number;
}

export interface MYXTransportKeepAliveConfig {
  interval: number;
}

export interface MYXTransportConfig {
  timeout: number;
  keepAlive: MYXTransportKeepAliveConfig;
  reconnect: MYXTransportReconnectConfig;
}

// ============================================================================
// Trading Configuration Types (shared with HyperLiquid)
// ============================================================================

export interface TradingAmountConfig {
  mainnet: number;
  testnet: number;
}

export interface TradingDefaultsConfig {
  leverage: number;
  marginPercent: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  amount: TradingAmountConfig;
}

export interface FeeRatesConfig {
  taker: number;
  maker: number;
}

// ============================================================================
// Account Types (SDK doesn't export complete account type)
// ============================================================================

/**
 * MYX Account Info (per-pool)
 */
export interface MYXAccountInfo {
  poolId: string;
  chainId: number;
  address: string;
  freeMargin: string;
  lockedMargin: string;
  quoteProfit: string;
  totalEquity?: string;
  totalMarginUsed?: string;
  unrealizedPnl?: string;
}

// ============================================================================
// WebSocket Types (SDK types re-exported above, these are aliases for convenience)
// ============================================================================

/**
 * MYX WebSocket Ticker Response - alias for SDK's TickersDataResponse
 */
export type MYXTickerWsResponse = import('@myx-trade/sdk').TickersDataResponse;

/**
 * MYX WebSocket Kline Response - alias for SDK's KlineDataResponse
 */
export type MYXKlineWsResponse = import('@myx-trade/sdk').KlineDataResponse;

// ============================================================================
// Trade Flow Types (for history adapter)
// ============================================================================

/**
 * MYX Trade Flow Entry
 */
export interface MYXTradeFlow {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'funding' | 'liquidation';
  poolId: string;
  amount: string;
  fee?: string;
  timestamp: number;
  txHash?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Utility Types for Adapter Layer
// ============================================================================

/**
 * Pool ID to Symbol mapping for quick lookups
 */
export type PoolSymbolMap = Map<string, string>;

/**
 * Symbol to Pool IDs mapping (one symbol can have multiple pools in MPM)
 */
export type SymbolPoolsMap = Map<string, string[]>;

/**
 * Pool metadata cache entry
 */
export interface MYXPoolCacheEntry {
  pool: import('@myx-trade/sdk').PoolSymbolAllResponse;
  detail?: import('@myx-trade/sdk').MarketDetailResponse;
  ticker?: import('@myx-trade/sdk').TickerDataItem;
  lastUpdated: number;
}
