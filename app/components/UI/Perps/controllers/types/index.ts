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

// Order type enumeration
export type OrderType = 'market' | 'limit';

// MetaMask Perps API order parameters for PerpsController
export type OrderParams = {
  coin: string; // Asset symbol (e.g., 'ETH', 'BTC')
  isBuy: boolean; // true = BUY order, false = SELL order
  size: string; // Order size as string
  orderType: OrderType; // Order type
  price?: string; // Limit price (required for limit orders)
  reduceOnly?: boolean; // Reduce-only flag
  timeInForce?: 'GTC' | 'IOC' | 'ALO'; // Time in force

  // Advanced order features
  takeProfitPrice?: string; // Take profit price
  stopLossPrice?: string; // Stop loss price
  clientOrderId?: string; // Optional client-provided order ID
  slippage?: number; // Slippage tolerance for market orders (e.g., 0.01 = 1%)
  grouping?: 'na' | 'normalTpsl' | 'positionTpsl'; // Override grouping (defaults: 'na' without TP/SL, 'normalTpsl' with TP/SL)
  currentPrice?: number; // Current market price (avoids extra API call if provided)
  leverage?: number; // Leverage to apply for the order (e.g., 10 for 10x leverage)
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
  takeProfitCount?: number; // Take profit count, how many tps can affect the position
  stopLossCount?: number; // Stop loss count, how many sls can affect the position
};

export type AccountState = {
  availableBalance: string; // Based on HyperLiquid: withdrawable
  totalBalance: string; // Based on HyperLiquid: accountValue
  marginUsed: string; // Based on HyperLiquid: marginUsed
  unrealizedPnl: string; // Based on HyperLiquid: unrealizedPnl
  returnOnEquity: string; // Based on HyperLiquid: returnOnEquity adjusted for weighted margin
  totalValue: string; // Based on HyperLiquid: accountValue
};

export type ClosePositionParams = {
  coin: string; // Asset symbol to close
  size?: string; // Size to close (omit for full close)
  orderType?: OrderType; // Close order type (default: market)
  price?: string; // Limit price (required for limit close)
  currentPrice?: number; // Current market price for validation
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
}

// Parameter interfaces - all fully optional for better UX
export interface GetPositionsParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
  includeHistory?: boolean; // Optional: include historical positions
}

export interface GetAccountStateParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
}

export interface GetOrderFillsParams {
  accountId?: CaipAccountId; // Optional: defaults to selected account
  user: Hex; // Optional: user address
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
  callback: (fills: OrderFill[]) => void;
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
}

export interface FeeCalculationResult {
  // Total fees (protocol + MetaMask)
  feeRate: number; // Total fee rate as decimal (e.g., 0.00145 for 0.145%)
  feeAmount?: number; // Total fee amount in USD (when amount is provided)

  // Protocol-specific base fees
  protocolFeeRate: number; // Protocol fee rate (e.g., 0.00045 for HyperLiquid taker)
  protocolFeeAmount?: number; // Protocol fee amount in USD

  // MetaMask builder/revenue fee
  metamaskFeeRate: number; // MetaMask fee rate (e.g., 0.001 for 0.1%)
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
  closePosition(params: ClosePositionParams): Promise<OrderResult>;
  updatePositionTPSL(params: UpdatePositionTPSLParams): Promise<OrderResult>;
  getPositions(params?: GetPositionsParams): Promise<Position[]>;
  getAccountState(params?: GetAccountStateParams): Promise<AccountState>;
  getMarkets(): Promise<MarketInfo[]>;
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

  // Live data configuration
  setLiveDataConfig(config: Partial<LiveDataConfig>): void;

  // Connection management
  toggleTestnet(): Promise<ToggleTestnetResult>;
  initialize(): Promise<InitializeResult>;
  isReadyToTrade(): Promise<ReadyToTradeResult>;
  disconnect(): Promise<DisconnectResult>;

  // Block explorer
  getBlockExplorerUrl(address?: string): string;
}
