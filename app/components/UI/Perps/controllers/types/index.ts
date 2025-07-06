/* eslint-disable @typescript-eslint/consistent-type-definitions */
// ESLint override: BaseController requires 'type' for Json compatibility, not 'interface'

import type { CaipAccountId, CaipChainId, CaipAssetId, Hex } from '@metamask/utils';

// Import real HyperLiquid SDK types

// Human-readable order parameters for PerpsController API
export type OrderParams = {
  coin: string;                    // Asset symbol (e.g., 'ETH', 'BTC')
  isBuy: boolean;                  // true = BUY order, false = SELL order
  size: string;                    // Order size as string
  orderType: 'market' | 'limit';   // Order type
  price?: string;                  // Limit price (required for limit orders)
  reduceOnly?: boolean;            // Reduce-only flag
  timeInForce?: 'GTC' | 'IOC' | 'ALO'; // Time in force

  // Advanced order features
  takeProfitPrice?: string;        // Take profit price
  stopLossPrice?: string;          // Stop loss price
  clientOrderId?: string;          // Optional client-provided order ID
};

export type OrderResult = {
  success: boolean;
  orderId?: string;              // Order ID from exchange
  error?: string;
  filledSize?: string;           // Amount filled
  averagePrice?: string;         // Average execution price
};

export type Position = {
  coin: string;                    // Asset symbol (e.g., 'ETH', 'BTC')
  size: string;                    // Signed position size (+ = LONG, - = SHORT)
  entryPrice: string;              // Average entry price
  positionValue: string;           // Total position value in USD
  unrealizedPnl: string;           // Unrealized profit/loss
  marginUsed: string;              // Margin currently used for this position
  leverage: {
    type: 'isolated' | 'cross';    // Margin type
    value: number;                 // Leverage multiplier
    rawUsd?: string;               // USD amount (for isolated margin)
  };
  liquidationPrice: string | null; // Liquidation price (null if no risk)
  maxLeverage: number;             // Maximum allowed leverage for this asset
  returnOnEquity: string;          // ROE percentage
  cumulativeFunding: {             // Funding payments history
    allTime: string;               // Total funding since account opening
    sinceOpen: string;             // Funding since position opened
    sinceChange: string;           // Funding since last size change
  };
};

export type AccountState = {
  availableBalance: string;    // Based on HyperLiquid: withdrawable
  totalBalance: string;        // Based on HyperLiquid: accountValue
  marginUsed: string;          // Based on HyperLiquid: marginUsed
  unrealizedPnl: string;       // Based on HyperLiquid: unrealizedPnl
};

export type ClosePositionParams = {
  coin: string;                    // Asset symbol to close
  size?: string;                   // Size to close (omit for full close)
  orderType?: 'market' | 'limit';  // Close order type (default: market)
  price?: string;                  // Limit price (required for limit close)
}

export interface InitializeResult {
  success: boolean;
  error?: string;
  chainId?: string;
}

export interface ReadyToTradeResult {
  ready: boolean;
  error?: string;
  walletConnected?: boolean;
  networkSupported?: boolean;
}

export interface DisconnectResult {
  success: boolean;
  error?: string;
}

export interface MarketInfo {
  name: string;              // HyperLiquid: universe name (asset symbol)
  szDecimals: number;        // HyperLiquid: size decimals
  maxLeverage: number;       // HyperLiquid: max leverage
  marginTableId: number;     // HyperLiquid: margin requirements table ID
  onlyIsolated?: true;       // HyperLiquid: isolated margin only (optional, only when true)
  isDelisted?: true;         // HyperLiquid: delisted status (optional, only when true)
}

export interface ToggleTestnetResult {
  success: boolean;
  isTestnet: boolean;
  error?: string;
}

export interface SwitchProviderResult {
  success: boolean;
  providerId: string;
  error?: string;
}

export interface CancelOrderParams {
  orderId: string;                 // Order ID to cancel
  coin: string;                    // Asset symbol
}

export interface CancelOrderResult {
  success: boolean;
  orderId?: string;                // Cancelled order ID
  error?: string;
}

export interface DepositParams {
  amount: string;           // Amount to deposit
  assetId: CaipAssetId;     // Asset to deposit (required for validation)
  fromChainId?: CaipChainId; // Source chain (defaults to current network)
  toChainId?: CaipChainId;   // Destination chain (defaults to HyperLiquid Arbitrum)
  recipient?: Hex;          // Recipient address (defaults to selected account)
}

export interface DepositResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface WithdrawParams {
  amount: string;           // Amount to withdraw
  destination?: Hex;        // Destination address (optional, defaults to current account)
  assetId?: CaipAssetId;    // Asset to withdraw (defaults to USDC)
}

export interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface LiveDataConfig {
  priceThrottleMs?: number;    // ms between price updates (default: 2000)
  positionThrottleMs?: number; // ms between position updates (default: 5000)
  maxUpdatesPerSecond?: number; // hard limit to prevent UI blocking
}

export interface PriceUpdate {
  coin: string;                    // Asset symbol
  price: string;                   // Current price
  timestamp: number;               // Update timestamp
}

export interface OrderFill {
  orderId: string;                 // Order ID that was filled
  symbol: string;                  // Asset symbol
  side: string;                    // Order side (from SDK)
  size: string;                    // Fill size
  price: string;                   // Fill price
  fee: string;                     // Fee paid
  timestamp: number;               // Fill timestamp
}

// Parameter interfaces - all fully optional for better UX
export interface GetPositionsParams {
  accountId?: CaipAccountId;  // Optional: defaults to selected account
  includeHistory?: boolean;   // Optional: include historical positions
}

export interface GetAccountStateParams {
  accountId?: CaipAccountId;  // Optional: defaults to selected account
}

export interface GetSupportedPathsParams {
  isTestnet?: boolean;      // Optional: override current testnet state
  assetId?: CaipAssetId;    // Optional: filter by specific asset
  symbol?: string;          // Optional: filter by asset symbol (e.g., 'USDC')
  chainId?: CaipChainId;    // Optional: filter by chain (CAIP-2 format)
}

export interface SubscribePricesParams {
  symbols: string[];
  callback: (prices: PriceUpdate[]) => void;
  throttleMs?: number;  // Future: per-subscription throttling
}

export interface SubscribePositionsParams {
  callback: (positions: Position[]) => void;
  accountId?: CaipAccountId;  // Optional: defaults to selected account
  includeHistory?: boolean;   // Future: include historical data
}

export interface SubscribeOrderFillsParams {
  callback: (fills: OrderFill[]) => void;
  accountId?: CaipAccountId;  // Optional: defaults to selected account
  since?: number;  // Future: only fills after timestamp
}

export interface IPerpsProvider {
  readonly protocolId: string;

  // Dynamic path resolution based on testnet state
  getSupportedDepositPaths(params?: GetSupportedPathsParams): CaipAssetId[];  // Assets you can deposit
  getSupportedWithdrawalPaths(params?: GetSupportedPathsParams): CaipAssetId[];  // Assets you can withdraw

  // Trading operations → Redux (persisted, optimistic updates)
  placeOrder(params: OrderParams): Promise<OrderResult>;
  cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult>;
  closePosition(params: ClosePositionParams): Promise<OrderResult>;
  getPositions(params?: GetPositionsParams): Promise<Position[]>;
  getAccountState(params?: GetAccountStateParams): Promise<AccountState>;
  getMarkets(): Promise<MarketInfo[]>;
  withdraw(params: WithdrawParams): Promise<WithdrawResult>; // API operation - stays in provider
  // Note: deposit() is handled by PerpsController routing (blockchain operation)

  // Live data subscriptions → Direct UI (NO Redux, maximum speed)
  subscribeToPrices(params: SubscribePricesParams): () => void;
  subscribeToPositions(params: SubscribePositionsParams): () => void;
  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void;

  // Live data configuration
  setLiveDataConfig(config: Partial<LiveDataConfig>): void;

  // Connection management
  toggleTestnet(): Promise<ToggleTestnetResult>;
  initialize(): Promise<InitializeResult>;
  isReadyToTrade(): Promise<ReadyToTradeResult>;
  disconnect(): Promise<DisconnectResult>;
}

// Re-export real HyperLiquid SDK types for convenience
export type { AssetPosition as HLAssetPosition } from '@deeeed/hyperliquid-node20/esm/src/types/info/accounts';
export type { PerpsUniverse as HLMarketInfo } from '@deeeed/hyperliquid-node20/esm/src/types/info/assets';

