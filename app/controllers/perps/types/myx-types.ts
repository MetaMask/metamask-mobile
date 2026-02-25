/**
 * MYX Protocol Type Definitions
 *
 * SDK types re-exported with MYX prefix for consistency.
 * Includes types for market display, positions, orders, and trading.
 */

import type { CaipChainId } from '@metamask/utils';

// ============================================================================
// Re-export SDK Types with MYX prefix for consistency
// ============================================================================

export type { PoolSymbolAllResponse as MYXPoolSymbol } from '@myx-trade/sdk';
export type { TickerDataItem as MYXTicker } from '@myx-trade/sdk';

// Position & order types from SDK
export type { PositionType as MYXPositionType } from '@myx-trade/sdk';
export type { HistoryOrderItem as MYXHistoryOrderItem } from '@myx-trade/sdk';
export type { PositionHistoryItem as MYXPositionHistoryItem } from '@myx-trade/sdk';
export type { TradeFlowItem as MYXTradeFlowItem } from '@myx-trade/sdk';
export type { KlineDataItemType as MYXKlineData } from '@myx-trade/sdk';
export type { KlineData as MYXKlineWsData } from '@myx-trade/sdk';
export type { KlineDataResponse as MYXKlineDataResponse } from '@myx-trade/sdk';

// SDK enums (re-exported as types since they're const objects in the SDK)
export {
  Direction as MYXDirection,
  OrderType as MYXOrderType,
  OperationType as MYXOperationType,
  TriggerType as MYXTriggerType,
  OrderStatus as MYXOrderStatus,
  TimeInForce as MYXTimeInForce,
} from '@myx-trade/sdk';

// History enums
export {
  DirectionEnum as MYXDirectionEnum,
  OrderTypeEnum as MYXOrderTypeEnum,
  OperationEnum as MYXOperationEnum,
  OrderStatusEnum as MYXOrderStatusEnum,
  ExecTypeEnum as MYXExecTypeEnum,
  TradeFlowTypeEnum as MYXTradeFlowTypeEnum,
} from '@myx-trade/sdk';

// Trading params types
export type { PlaceOrderParams as MYXPlaceOrderParams } from '@myx-trade/sdk';
export type { PositionTpSlOrderParams as MYXPositionTpSlOrderParams } from '@myx-trade/sdk';
export type { GetHistoryOrdersParams as MYXGetHistoryOrdersParams } from '@myx-trade/sdk';

// ============================================================================
// Network Configuration Types
// ============================================================================

/**
 * MYX Network type - mainnet or testnet
 */
export type MYXNetwork = 'mainnet' | 'testnet';

/**
 * MYX Endpoint configuration for a single network
 */
export type MYXEndpointConfig = {
  http: string;
  ws: string;
};

/**
 * MYX Endpoints for all networks
 */
export type MYXEndpoints = {
  mainnet: MYXEndpointConfig;
  testnet: MYXEndpointConfig;
};

/**
 * MYX Asset network configuration (token addresses per network)
 */
export type MYXAssetNetworkConfig = {
  chainId: CaipChainId;
  tokenAddress: string;
};

/**
 * MYX Asset configurations by network
 */
export type MYXAssetConfigs = {
  // USDT is the token symbol used as API key - not a variable name
  // eslint-disable-next-line @typescript-eslint/naming-convention
  USDT: {
    mainnet: MYXAssetNetworkConfig;
    testnet: MYXAssetNetworkConfig;
  };
};

// ============================================================================
// Market Overlap Configuration
// ============================================================================

/**
 * Markets that overlap with HyperLiquid
 * These are excluded from MYX display in v1.0 to avoid confusion
 * In Stage 7, we'll implement market collision handling
 */
export const MYX_HL_OVERLAPPING_MARKETS = [
  'BTC',
  'ETH',
  'BNB',
  'PUMP',
  'WLFI',
] as const;

export type MYXOverlappingMarket = (typeof MYX_HL_OVERLAPPING_MARKETS)[number];

// ============================================================================
// Auth Configuration (passed from init file via babel-transformed env vars)
// ============================================================================

/**
 * MYX auth credentials passed at construction time.
 * Eliminates runtime `process.env` lookups — values come from the init file
 * where `process.env.X` is babel-transformed at build time.
 */
export type MYXAuthConfig = {
  appId: string;
  apiSecret: string;
  brokerAddress: string;
};

// ============================================================================
// Client Service Types
// ============================================================================

/**
 * Price callback for REST polling
 */
export type MYXPriceCallback = (
  tickers: { symbol: string; price: string; change24h: number }[],
) => void;

/**
 * Error callback for client operations
 */
export type MYXErrorCallback = (error: Error) => void;
