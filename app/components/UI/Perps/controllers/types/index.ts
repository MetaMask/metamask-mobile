/* eslint-disable @typescript-eslint/consistent-type-definitions */
// ESLint override: BaseController requires 'type' for Json compatibility, not 'interface'

import type {
  CaipAccountId,
  CaipChainId,
  CaipAssetId,
  Hex,
} from '@metamask/utils';

// Export navigation types
export * from '../../types/navigation';

// Import adapter types
import type { RawHyperLiquidLedgerUpdate } from '../../utils/hyperLiquidAdapter';
import type { CandleData } from '../../types/perps-types';
import type { CandlePeriod, TimeDuration } from '../../constants/chartConfig';

// User history item for deposits and withdrawals
export interface UserHistoryItem {
  id: string;
  timestamp: number;
  type: 'deposit' | 'withdrawal';
  amount: string;
  asset: string;
  txHash: string;
  status: 'completed' | 'failed' | 'pending';
  details: {
    source: string;
    bridgeContract?: string;
    recipient?: string;
    blockNumber?: string;
    chainId?: string;
    synthetic?: boolean;
  };
}

// Parameters for getting user history
export interface GetUserHistoryParams {
  startTime?: number;
  endTime?: number;
  accountId?: CaipAccountId;
}

// Trade configuration saved per market per network
export interface TradeConfiguration {
  leverage?: number; // Last used leverage for this market
  // Pending trade configuration (temporary, expires after 5 minutes)
  pendingConfig?: {
    amount?: string; // Order size in USD
    leverage?: number; // Leverage
    takeProfitPrice?: string; // Take profit price
    stopLossPrice?: string; // Stop loss price
    limitPrice?: string; // Limit price (for limit orders)
    orderType?: OrderType; // Market vs limit
    timestamp: number; // When the config was saved (for expiration check)
  };
}

// Order type enumeration
export type OrderType = 'market' | 'limit';

// Market asset type classification (reusable across components)
export type MarketType = 'crypto' | 'equity' | 'commodity' | 'forex';

// Market type filter including 'all' option and combined 'stocks_and_commodities' for UI filtering
export type MarketTypeFilter = MarketType | 'all' | 'stocks_and_commodities';

// Input method for amount entry tracking
export type InputMethod =
  | 'default'
  | 'slider'
  | 'keypad'
  | 'percentage'
  | 'max';

// Unified tracking data interface for analytics events (never persisted in state)
// Note: Numeric values are already parsed by hooks (usePerpsOrderFees, etc.) from API responses
export interface TrackingData {
  // Common to all operations
  totalFee: number; // Total fee for the operation (parsed by hooks)
  marketPrice: number; // Market price at operation time (parsed by hooks)
  metamaskFee?: number; // MetaMask fee amount (parsed by hooks)
  metamaskFeeRate?: number; // MetaMask fee rate (parsed by hooks)
  feeDiscountPercentage?: number; // Fee discount percentage (parsed by hooks)
  estimatedPoints?: number; // Estimated reward points (parsed by hooks)

  // Order-specific (used for trade operations)
  marginUsed?: number; // Margin required for this order (calculated by hooks)
  inputMethod?: InputMethod; // How user set the amount

  // Close-specific (used for position close operations)
  receivedAmount?: number; // Amount user receives after close (calculated by hooks)
  realizedPnl?: number; // Realized P&L from close (calculated by hooks)
}

// TP/SL-specific tracking data for analytics events
export interface TPSLTrackingData {
  direction: 'long' | 'short'; // Position direction
  source: string; // Source of the TP/SL update (e.g., 'tp_sl_view', 'position_card')
  positionSize: number; // Unsigned position size for metrics
}

// MetaMask Perps API order parameters for PerpsController
export type OrderParams = {
  coin: string; // Asset symbol (e.g., 'ETH', 'BTC')
  isBuy: boolean; // true = BUY order, false = SELL order
  size: string; // Order size as string (derived for validation, provider recalculates from usdAmount)
  orderType: OrderType; // Order type
  price?: string; // Limit price (required for limit orders)
  reduceOnly?: boolean; // Reduce-only flag
  isFullClose?: boolean; // Indicates closing 100% of position (skips $10 minimum validation)
  timeInForce?: 'GTC' | 'IOC' | 'ALO'; // Time in force

  // USD as source of truth (hybrid approach)
  usdAmount?: string; // USD amount (primary source of truth, provider calculates size from this)
  priceAtCalculation?: number; // Price snapshot when size was calculated (for slippage validation)
  maxSlippageBps?: number; // Slippage tolerance in basis points (e.g., 100 = 1%, default if not provided)

  // Advanced order features
  takeProfitPrice?: string; // Take profit price
  stopLossPrice?: string; // Stop loss price
  clientOrderId?: string; // Optional client-provided order ID
  slippage?: number; // Slippage tolerance for market orders (default: ORDER_SLIPPAGE_CONFIG.DEFAULT_MARKET_SLIPPAGE_BPS / 10000 = 3%)
  grouping?: 'na' | 'normalTpsl' | 'positionTpsl'; // Override grouping (defaults: 'na' without TP/SL, 'normalTpsl' with TP/SL)
  currentPrice?: number; // Current market price (avoids extra API call if provided)
  leverage?: number; // Leverage to apply for the order (e.g., 10 for 10x leverage)
  existingPositionLeverage?: number; // Existing position leverage for validation (protocol constraint)

  // Optional tracking data for MetaMetrics events
  trackingData?: TrackingData;
};

export type OrderResult = {
  success?: boolean;
  orderId?: string; // Order ID from exchange
  error?: string;
  filledSize?: string; // Amount filled
  averagePrice?: string; // Average execution price
};

export type Position = {
  coin: string; // Asset symbol (e.g., 'ETH', 'BTC')
  size: string; // Signed position size (+ = LONG, - = SHORT)
  entryPrice: string; // Average entry price
  positionValue: string; // Total position value in USD
  unrealizedPnl: string; // Unrealized profit/loss
  marginUsed: string; // Margin currently used for this position
  leverage: {
    type: 'isolated' | 'cross'; // Margin type
    value: number; // Leverage multiplier
    rawUsd?: string; // USD amount (for isolated margin)
  };
  liquidationPrice: string | null; // Liquidation price (null if no risk)
  maxLeverage: number; // Maximum allowed leverage for this asset
  returnOnEquity: string; // ROE percentage
  cumulativeFunding: {
    // Funding payments history
    allTime: string; // Total funding since account opening
    sinceOpen: string; // Funding since position opened
    sinceChange: string; // Funding since last size change
  };
  takeProfitPrice?: string; // Take profit price (if set)
  stopLossPrice?: string; // Stop loss price (if set)
  takeProfitCount: number; // Take profit count, how many tps can affect the position
  stopLossCount: number; // Stop loss count, how many sls can affect the position
};

// Using 'type' instead of 'interface' for BaseController Json compatibility
export type AccountState = {
  availableBalance: string; // Based on HyperLiquid: withdrawable
  totalBalance: string; // Based on HyperLiquid: accountValue
  marginUsed: string; // Based on HyperLiquid: marginUsed
  unrealizedPnl: string; // Based on HyperLiquid: unrealizedPnl
  returnOnEquity: string; // Based on HyperLiquid: returnOnEquity adjusted for weighted margin
  /**
   * Per-sub-account balance breakdown (protocol-specific, optional)
   * Maps sub-account identifier to its balance details.
   *
   * Protocol examples:
   * - HyperLiquid HIP-3: '' or 'main' (main DEX), 'xyz' (HIP-3 builder DEX)
   * - dYdX: Sub-account numbers (e.g., '0', '1', '2')
   * - Other protocols: Vault IDs, pool IDs, margin account IDs, etc.
   *
   * Key: Sub-account identifier (protocol-specific string)
   * Value: Balance details for that sub-account
   */
  subAccountBreakdown?: Record<
    string,
    {
      availableBalance: string;
      totalBalance: string;
    }
  >;
};

export type ClosePositionParams = {
  coin: string; // Asset symbol to close
  size?: string; // Size to close (omit for full close)
  orderType?: OrderType; // Close order type (default: market)
  price?: string; // Limit price (required for limit close)
  currentPrice?: number; // Current market price for validation

  // USD as source of truth (hybrid approach - same as OrderParams)
  usdAmount?: string; // USD amount (primary source of truth, provider calculates size from this)
  priceAtCalculation?: number; // Price snapshot when size was calculated (for slippage validation)
  maxSlippageBps?: number; // Slippage tolerance in basis points (e.g., 100 = 1%, default if not provided)

  // Optional tracking data for MetaMetrics events
  trackingData?: TrackingData;
};

export type ClosePositionsParams = {
  coins?: string[]; // Optional: specific coins to close (omit or empty array to close all)
  closeAll?: boolean; // Explicitly close all positions
};

export type ClosePositionsResult = {
  success: boolean; // Overall success (true if at least one position closed)
  successCount: number; // Number of positions closed successfully
  failureCount: number; // Number of positions that failed to close
  results: {
    coin: string;
    success: boolean;
    error?: string;
  }[];
};

export type UpdateMarginParams = {
  coin: string; // Asset symbol (e.g., 'BTC', 'ETH')
  amount: string; // Amount to adjust as string (positive = add, negative = remove)
};

export type MarginResult = {
  success: boolean;
  error?: string;
};

export type FlipPositionParams = {
  coin: string; // Asset symbol to flip
  position: Position; // Current position to flip
};

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
  name: string; // HyperLiquid: universe name (asset symbol)
  szDecimals: number; // HyperLiquid: size decimals
  maxLeverage: number; // HyperLiquid: max leverage
  marginTableId: number; // HyperLiquid: margin requirements table ID
  onlyIsolated?: true; // HyperLiquid: isolated margin only (optional, only when true)
  isDelisted?: true; // HyperLiquid: delisted status (optional, only when true)
  minimumOrderSize?: number; // Minimum order size in USD (protocol-specific)
}

/**
 * Market data with prices for UI display
 * Protocol-agnostic interface for market information with formatted values
 */
export interface PerpsMarketData {
  /**
   * Token symbol (e.g., 'BTC', 'ETH')
   */
  symbol: string;
  /**
   * Full token name (e.g., 'Bitcoin', 'Ethereum')
   */
  name: string;
  /**
   * Maximum leverage available as formatted string (e.g., '40x', '25x')
   */
  maxLeverage: string;
  /**
   * Current price as formatted string (e.g., '$50,000.00')
   */
  price: string;
  /**
   * 24h price change as formatted string (e.g., '+$1,250.00', '-$850.50')
   */
  change24h: string;
  /**
   * 24h price change percentage as formatted string (e.g., '+2.5%', '-1.8%')
   */
  change24hPercent: string;
  /**
   * Trading volume as formatted string (e.g., '$1.2B', '$850M')
   */
  volume: string;
  /**
   * Open interest as formatted string (e.g., '$24.5M', '$1.2B')
   */
  openInterest?: string;
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific)
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific)
   */
  fundingIntervalHours?: number;
  /**
   * Current funding rate as decimal (optional, from predictedFundings API)
   */
  fundingRate?: number;
  /**
   * Market source DEX identifier (HIP-3 support)
   * - null or undefined: Main validator DEX
   * - "xyz", "abc", etc: HIP-3 builder-deployed DEX
   */
  marketSource?: string | null;
  /**
   * Market asset type classification (optional)
   * - crypto: Cryptocurrency (default for most markets)
   * - equity: Stock/equity markets (HIP-3)
   * - commodity: Commodity markets (HIP-3)
   * - forex: Foreign exchange pairs (HIP-3)
   */
  marketType?: MarketType;
}

export interface ToggleTestnetResult {
  success: boolean;
  isTestnet: boolean;
  error?: string;
}

export interface AssetRoute {
  assetId: CaipAssetId; // CAIP asset ID (e.g., "eip155:42161/erc20:0xaf88.../default")
  chainId: CaipChainId; // CAIP-2 chain ID where the bridge contract is located
  contractAddress: Hex; // Bridge contract address for deposits/withdrawals
  constraints?: {
    minAmount?: string; // Minimum deposit/withdrawal amount
    maxAmount?: string; // Maximum deposit/withdrawal amount
    estimatedTime?: string; // Estimated processing time
    fees?: {
      fixed?: number; // Fixed fee amount (e.g., 1 for 1 token)
      percentage?: number; // Percentage fee (e.g., 0.05 for 0.05%)
      token?: string; // Fee token symbol (e.g., 'USDC', 'ETH')
    };
  };
}

export interface SwitchProviderResult {
  success: boolean;
  providerId: string;
  error?: string;
}

export interface CancelOrderParams {
  orderId: string; // Order ID to cancel
  coin: string; // Asset symbol
}

export interface CancelOrderResult {
  success: boolean;
  orderId?: string; // Cancelled order ID
  error?: string;
}

export type BatchCancelOrdersParams = {
  orderId: string;
  coin: string;
}[];

export type CancelOrdersParams = {
  coins?: string[]; // Optional: specific coins (omit to cancel all orders)
  orderIds?: string[]; // Optional: specific order IDs (omit to cancel all orders for specified coins)
  cancelAll?: boolean; // Explicitly cancel all orders
};

export type CancelOrdersResult = {
  success: boolean; // Overall success (true if at least one order cancelled)
  successCount: number; // Number of orders cancelled successfully
  failureCount: number; // Number of orders that failed to cancel
  results: {
    orderId: string;
    coin: string;
    success: boolean;
    error?: string;
  }[];
};

export interface EditOrderParams {
  orderId: string | number; // Order ID or client order ID to modify
  newOrder: OrderParams; // New order parameters
}

export interface DepositParams {
  amount: string; // Amount to deposit
  assetId: CaipAssetId; // Asset to deposit (required for validation)
  fromChainId?: CaipChainId; // Source chain (defaults to current network)
  toChainId?: CaipChainId; // Destination chain (defaults to HyperLiquid Arbitrum)
  recipient?: Hex; // Recipient address (defaults to selected account)
}

export interface DepositResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Enhanced deposit flow state types for multi-step deposits
export type DepositStatus =
  | 'idle' // No deposit in progress
  | 'preparing' // Analyzing route & preparing transactions
  | 'swapping' // Converting token (e.g., ETH → USDC)
  | 'bridging' // Cross-chain transfer
  | 'depositing' // Final deposit to HyperLiquid
  | 'success' // Deposit completed successfully
  | 'error'; // Deposit failed at any step

export type DepositFlowType =
  | 'direct' // Same chain, same token (USDC on Arbitrum)
  | 'swap' // Same chain, different token (ETH → USDC)
  | 'bridge' // Different chain, same token (USDC on Ethereum → Arbitrum)
  | 'swap_bridge'; // Different chain, different token (ETH on Ethereum → USDC on Arbitrum)

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DepositStepInfo = {
  totalSteps: number; // Total number of steps in this flow
  currentStep: number; // Current step (0-based index)
  stepNames: string[]; // Human-readable step names
  stepTxHashes?: string[]; // Transaction hashes for each completed step
};

export interface WithdrawParams {
  amount: string; // Amount to withdraw
  destination?: Hex; // Destination address (optional, defaults to current account)
  assetId?: CaipAssetId; // Asset to withdraw (defaults to USDC)
}

export interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
  withdrawalId?: string; // Unique ID for tracking
  estimatedArrivalTime?: number; // Provider-specific arrival time
}

export interface TransferBetweenDexsParams {
  sourceDex: string; // Source DEX name ('' = main DEX, 'xyz' = HIP-3 DEX)
  destinationDex: string; // Destination DEX name ('' = main DEX, 'xyz' = HIP-3 DEX)
  amount: string; // USDC amount to transfer
}

export interface TransferBetweenDexsResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface GetHistoricalPortfolioParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
}

export interface HistoricalPortfolioResult {
  accountValue1dAgo: string;
  timestamp: number;
}

export interface LiveDataConfig {
  priceThrottleMs?: number; // ms between price updates (default: 2000)
  positionThrottleMs?: number; // ms between position updates (default: 5000)
  maxUpdatesPerSecond?: number; // hard limit to prevent UI blocking
}

export interface PerpsControllerConfig {
  /**
   * Fallback blocked regions to use when RemoteFeatureFlagController fails to fetch.
   * The fallback is set by default if defined and replaced with remote block list once available.
   */
  fallbackBlockedRegions?: string[];
  /**
   * Fallback HIP-3 equity perps master switch to use when RemoteFeatureFlagController fails to fetch.
   * Controls whether HIP-3 (builder-deployed) DEXs are enabled.
   * The fallback is set by default if defined and replaced with remote feature flag once available.
   */
  fallbackHip3Enabled?: boolean;
  /**
   * Fallback HIP-3 market allowlist to use when RemoteFeatureFlagController fails to fetch.
   * Empty array = enable all markets (discovery mode), non-empty = allowlist specific markets.
   * Supports wildcards: "xyz:*" (all xyz markets), "xyz" (shorthand for "xyz:*"), "BTC" (main DEX market).
   * Only applies when HIP-3 is enabled.
   * The fallback is set by default if defined and replaced with remote feature flag once available.
   */
  fallbackHip3AllowlistMarkets?: string[];
  /**
   * Fallback HIP-3 market blocklist to use when RemoteFeatureFlagController fails to fetch.
   * Empty array = no blocking, non-empty = block specific markets.
   * Supports wildcards: "xyz:*" (block all xyz markets), "xyz" (shorthand for "xyz:*"), "BTC" (block main DEX market).
   * Always applied regardless of HIP-3 enabled state.
   * The fallback is set by default if defined and replaced with remote feature flag once available.
   */
  fallbackHip3BlocklistMarkets?: string[];
}

export interface PriceUpdate {
  coin: string; // Asset symbol
  price: string; // Current mid price (average of best bid and ask)
  timestamp: number; // Update timestamp
  percentChange24h?: string; // 24h price change percentage
  // Order book data (only available when includeOrderBook is true)
  bestBid?: string; // Best bid price (highest price buyers are willing to pay)
  bestAsk?: string; // Best ask price (lowest price sellers are willing to accept)
  spread?: string; // Ask - Bid spread
  markPrice?: string; // Mark price from oracle (used for liquidations)
  // Market data (only available when includeMarketData is true)
  funding?: number; // Current funding rate
  openInterest?: number; // Open interest in USD
  volume24h?: number; // 24h trading volume in USD
}

export interface OrderFill {
  orderId: string; // Order ID that was filled
  symbol: string; // Asset symbol
  side: string; // Normalized order side ('buy' or 'sell')
  size: string; // Fill size
  price: string; // Fill price
  pnl: string; // PNL
  direction: string; // Direction of the fill
  fee: string; // Fee paid
  feeToken: string; // Fee token symbol
  timestamp: number; // Fill timestamp
  startPosition?: string; // Start position
  success?: boolean; // Whether the order was filled successfully
  liquidation?: {
    liquidatedUser: string; // Address of the liquidated user. liquidatedUser isn't always the current user. It can also mean the fill filled another user's liquidation.
    markPx: string; // Mark price at liquidation
    method: string; // Liquidation method (e.g., 'market')
  };
  orderType?: 'take_profit' | 'stop_loss' | 'liquidation' | 'regular';
  detailedOrderType?: string; // Original order type from exchange
}

// Parameter interfaces - all fully optional for better UX
export interface GetPositionsParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
  includeHistory?: boolean; // Optional: include historical positions
  skipCache?: boolean; // Optional: bypass WebSocket cache and force API call (default: false)
}

export interface GetAccountStateParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
  source?: string; // Optional: source of the call for tracing (e.g., 'health_check', 'initial_connection')
}

export interface GetOrderFillsParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
  user?: Hex; // Optional: user address (defaults to selected account)
  startTime?: number; // Optional: start timestamp (Unix milliseconds)
  endTime?: number; // Optional: end timestamp (Unix milliseconds)
  limit?: number; // Optional: max number of results for pagination
  aggregateByTime?: boolean; // Optional: aggregate by time
}

export interface GetOrdersParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
  startTime?: number; // Optional: start timestamp (Unix milliseconds)
  endTime?: number; // Optional: end timestamp (Unix milliseconds)
  limit?: number; // Optional: max number of results for pagination
  offset?: number; // Optional: offset for pagination
  skipCache?: boolean; // Optional: bypass WebSocket cache and force API call (default: false)
}

export interface GetFundingParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
  startTime?: number; // Optional: start timestamp (Unix milliseconds)
  endTime?: number; // Optional: end timestamp (Unix milliseconds)
  limit?: number; // Optional: max number of results for pagination
  offset?: number; // Optional: offset for pagination
}

export interface GetSupportedPathsParams {
  isTestnet?: boolean; // Optional: override current testnet state
  assetId?: CaipAssetId; // Optional: filter by specific asset
  symbol?: string; // Optional: filter by asset symbol (e.g., 'USDC')
  chainId?: CaipChainId; // Optional: filter by chain (CAIP-2 format)
}

export interface GetAvailableDexsParams {
  // Reserved for future extensibility (filters, pagination, etc.)
}

export interface GetMarketsParams {
  symbols?: string[]; // Optional symbol filter (e.g., ['BTC', 'xyz:XYZ100'])
  dex?: string; // HyperLiquid HIP-3: DEX name (empty string '' or undefined for main DEX). Other protocols: ignored.
  skipFilters?: boolean; // Skip market filtering (both allowlist and blocklist, default: false). When true, returns all markets without filtering.
}

export interface SubscribePricesParams {
  symbols: string[];
  callback: (prices: PriceUpdate[]) => void;
  throttleMs?: number; // Future: per-subscription throttling
  includeOrderBook?: boolean; // Optional: include bid/ask data from L2 book
  includeMarketData?: boolean; // Optional: include funding, open interest, volume data
}

export interface SubscribePositionsParams {
  callback: (positions: Position[]) => void;
  accountId?: CaipAccountId; // Optional: defaults to selected account
  includeHistory?: boolean; // Future: include historical data
}

export interface SubscribeOrderFillsParams {
  callback: (fills: OrderFill[], isSnapshot?: boolean) => void;
  accountId?: CaipAccountId; // Optional: defaults to selected account
  since?: number; // Future: only fills after timestamp
}

export interface SubscribeOrdersParams {
  callback: (orders: Order[]) => void;
  accountId?: CaipAccountId; // Optional: defaults to selected account
  includeHistory?: boolean; // Optional: include filled/canceled orders
}

export interface SubscribeAccountParams {
  callback: (account: AccountState) => void;
  accountId?: CaipAccountId; // Optional: defaults to selected account
}

export interface SubscribeOICapsParams {
  callback: (caps: string[]) => void;
  accountId?: CaipAccountId; // Optional: defaults to selected account
}

export interface SubscribeCandlesParams {
  coin: string;
  interval: CandlePeriod;
  duration?: TimeDuration;
  callback: (data: CandleData) => void;
  onError?: (error: Error) => void;
}

/**
 * Single price level in the order book
 */
export interface OrderBookLevel {
  /** Price at this level */
  price: string;
  /** Size at this level (in base asset) */
  size: string;
  /** Cumulative size up to and including this level */
  total: string;
  /** Notional value in USD */
  notional: string;
  /** Cumulative notional up to and including this level */
  totalNotional: string;
}

/**
 * Full order book data with multiple price levels
 */
export interface OrderBookData {
  /** Bid levels (buy orders) - highest price first */
  bids: OrderBookLevel[];
  /** Ask levels (sell orders) - lowest price first */
  asks: OrderBookLevel[];
  /** Spread between best bid and best ask */
  spread: string;
  /** Spread as a percentage of mid price */
  spreadPercentage: string;
  /** Mid price (average of best bid and best ask) */
  midPrice: string;
  /** Timestamp of last update */
  lastUpdated: number;
  /** Maximum total size across all levels (for scaling depth bars) */
  maxTotal: string;
}

export interface SubscribeOrderBookParams {
  /** Symbol to subscribe to (e.g., 'BTC', 'ETH') */
  symbol: string;
  /** Number of levels to return per side (default: 10) */
  levels?: number;
  /** Price aggregation significant figures (default: 5). Higher = finer granularity */
  nSigFigs?: number;
  /** Callback function receiving order book updates */
  callback: (orderBook: OrderBookData) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

export interface LiquidationPriceParams {
  entryPrice: number;
  leverage: number;
  direction: 'long' | 'short';
  positionSize?: number; // Optional: for more accurate calculations
  marginType?: 'isolated' | 'cross'; // Optional: defaults to isolated
  asset?: string; // Optional: for asset-specific maintenance margins
}

export interface MaintenanceMarginParams {
  asset: string;
  positionSize?: number; // Optional: for tiered margin systems
}

export interface FeeCalculationParams {
  orderType: 'market' | 'limit';
  isMaker?: boolean;
  amount?: string;
  coin: string; // Required: Asset symbol for HIP-3 fee calculation (e.g., 'BTC', 'xyz:TSLA')
}

export interface FeeCalculationResult {
  // Total fees (protocol + MetaMask)
  feeRate?: number; // Total fee rate as decimal (e.g., 0.00145 for 0.145%), undefined when unavailable
  feeAmount?: number; // Total fee amount in USD (when amount is provided)

  // Protocol-specific base fees
  protocolFeeRate?: number; // Protocol fee rate (e.g., 0.00045 for HyperLiquid taker), undefined when unavailable
  protocolFeeAmount?: number; // Protocol fee amount in USD

  // MetaMask builder/revenue fee
  metamaskFeeRate?: number; // MetaMask fee rate (e.g., 0.001 for 0.1%), undefined when unavailable
  metamaskFeeAmount?: number; // MetaMask fee amount in USD

  // Optional detailed breakdown for transparency
  breakdown?: {
    baseFeeRate: number;
    volumeTier?: string;
    volumeDiscount?: number;
    stakingDiscount?: number;
  };
}

export interface UpdatePositionTPSLParams {
  coin: string; // Asset symbol
  takeProfitPrice?: string; // Optional: undefined to remove
  stopLossPrice?: string; // Optional: undefined to remove
  // Optional tracking data for MetaMetrics events
  trackingData?: TPSLTrackingData;
}

export interface Order {
  orderId: string; // Order ID
  symbol: string; // Asset symbol (e.g., 'ETH', 'BTC')
  side: 'buy' | 'sell'; // Normalized order side
  orderType: OrderType; // Order type (market/limit)
  size: string; // Order size
  originalSize: string; // Original order size
  price: string; // Order price (for limit orders)
  filledSize: string; // Amount filled
  remainingSize: string; // Amount remaining
  status: 'open' | 'filled' | 'canceled' | 'rejected' | 'triggered' | 'queued'; // Normalized status
  timestamp: number; // Order timestamp
  lastUpdated?: number; // Last status update timestamp (optional - not provided by all APIs)
  // TODO: Consider creating separate type for OpenOrders (UI Orders) potentially if optional properties muddy up the original Order type
  takeProfitPrice?: string; // Take profit price (if set)
  stopLossPrice?: string; // Stop loss price (if set)
  stopLossOrderId?: string; // Stop loss order ID
  takeProfitOrderId?: string; // Take profit order ID
  detailedOrderType?: string; // Full order type from exchange (e.g., 'Take Profit Limit', 'Stop Market')
  isTrigger?: boolean; // Whether this is a trigger order (TP/SL)
  reduceOnly?: boolean; // Whether this is a reduce-only order
}

export interface Funding {
  symbol: string; // Asset symbol (e.g., 'ETH', 'BTC')
  amountUsd: string; // Funding amount in USD (positive = received, negative = paid)
  rate: string; // Funding rate applied
  timestamp: number; // Funding payment timestamp
  transactionHash?: string; // Optional transaction hash
}

export interface IPerpsProvider {
  readonly protocolId: string;

  // Unified asset and route information
  getDepositRoutes(params?: GetSupportedPathsParams): AssetRoute[]; // Assets and their deposit routes
  getWithdrawalRoutes(params?: GetSupportedPathsParams): AssetRoute[]; // Assets and their withdrawal routes

  // Trading operations → Redux (persisted, optimistic updates)
  placeOrder(params: OrderParams): Promise<OrderResult>;
  editOrder(params: EditOrderParams): Promise<OrderResult>;
  cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult>;
  cancelOrders?(params: BatchCancelOrdersParams): Promise<CancelOrdersResult>; // Optional: batch cancel for protocols that support it
  closePosition(params: ClosePositionParams): Promise<OrderResult>;
  closePositions?(params: ClosePositionsParams): Promise<ClosePositionsResult>; // Optional: batch close for protocols that support it
  updatePositionTPSL(params: UpdatePositionTPSLParams): Promise<OrderResult>;
  updateMargin(params: UpdateMarginParams): Promise<MarginResult>;
  getPositions(params?: GetPositionsParams): Promise<Position[]>;
  getAccountState(params?: GetAccountStateParams): Promise<AccountState>;
  getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]>;
  getMarketDataWithPrices(): Promise<PerpsMarketData[]>;
  withdraw(params: WithdrawParams): Promise<WithdrawResult>; // API operation - stays in provider
  // Note: deposit() is handled by PerpsController routing (blockchain operation)
  validateDeposit(
    params: DepositParams,
  ): Promise<{ isValid: boolean; error?: string }>; // Protocol-specific deposit validation
  validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }>; // Protocol-specific order validation
  validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }>; // Protocol-specific position close validation
  validateWithdrawal(
    params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }>; // Protocol-specific withdrawal validation

  // Historical data operations
  /**
   * Historical trade fills - actual executed trades with exact prices and fees.
   * Purpose: Track what actually happened when orders were executed.
   * Example: Market long 1 ETH @ $50,000 → OrderFill with exact execution price and fees
   */
  getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]>;

  /**
   * Get historical portfolio data
   * Purpose: Retrieve account value from previous periods for PnL tracking
   * Example: Get account value from yesterday to calculate 24h percentage change
   * @param params - Optional parameters for historical portfolio retrieval
   */
  getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult>;

  /**
   * Historical order lifecycle - order placement, modifications, and status changes.
   * Purpose: Track the complete journey of orders from request to completion.
   * Example: Limit buy 1 ETH @ $48,000 → Order with status 'open' → 'filled' when executed
   */
  getOrders(params?: GetOrdersParams): Promise<Order[]>;

  /**
   * Currently active open orders (real-time status).
   * Purpose: Show orders that are currently open/pending execution (not historical states).
   * Different from getOrders() which returns complete historical order lifecycle.
   * Example: Shows only orders that are actually open right now in the exchange.
   */
  getOpenOrders(params?: GetOrdersParams): Promise<Order[]>;

  /**
   * Historical funding payments - periodic costs/rewards for holding positions.
   * Purpose: Track ongoing expenses and income from position maintenance.
   * Example: Holding long ETH position → Funding payment of -$5.00 (you pay the funding)
   */
  getFunding(params?: GetFundingParams): Promise<Funding[]>;

  /**
   * Get user non-funding ledger updates (deposits, transfers, withdrawals)
   */
  getUserNonFundingLedgerUpdates(params?: {
    accountId?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<RawHyperLiquidLedgerUpdate[]>;

  /**
   * Get user history (deposits, withdrawals, transfers)
   */
  getUserHistory(params?: {
    accountId?: CaipAccountId;
    startTime?: number;
    endTime?: number;
  }): Promise<UserHistoryItem[]>;

  // Protocol-specific calculations
  calculateLiquidationPrice(params: LiquidationPriceParams): Promise<string>;
  calculateMaintenanceMargin(params: MaintenanceMarginParams): Promise<number>;
  getMaxLeverage(asset: string): Promise<number>;
  calculateFees(params: FeeCalculationParams): Promise<FeeCalculationResult>;

  // Live data subscriptions → Direct UI (NO Redux, maximum speed)
  subscribeToPrices(params: SubscribePricesParams): () => void;
  subscribeToPositions(params: SubscribePositionsParams): () => void;
  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void;
  subscribeToOrders(params: SubscribeOrdersParams): () => void;
  subscribeToAccount(params: SubscribeAccountParams): () => void;
  subscribeToOICaps(params: SubscribeOICapsParams): () => void;
  subscribeToCandles(params: SubscribeCandlesParams): () => void;
  subscribeToOrderBook(params: SubscribeOrderBookParams): () => void;

  // Live data configuration
  setLiveDataConfig(config: Partial<LiveDataConfig>): void;

  // Connection management
  toggleTestnet(): Promise<ToggleTestnetResult>;
  initialize(): Promise<InitializeResult>;
  isReadyToTrade(): Promise<ReadyToTradeResult>;
  disconnect(): Promise<DisconnectResult>;
  ping(timeoutMs?: number): Promise<void>; // Lightweight WebSocket health check with configurable timeout

  // Block explorer
  getBlockExplorerUrl(address?: string): string;

  // Fee discount context (optional - for MetaMask reward discounts)
  setUserFeeDiscount?(discountBips: number | undefined): void;

  // HIP-3 (Builder-deployed DEXs) operations - optional for backward compatibility
  /**
   * Get list of available HIP-3 builder-deployed DEXs
   * @param params - Optional parameters (reserved for future filters/pagination)
   * @returns Array of DEX names (empty string '' represents main DEX)
   */
  getAvailableDexs?(params?: GetAvailableDexsParams): Promise<string[]>;
}
