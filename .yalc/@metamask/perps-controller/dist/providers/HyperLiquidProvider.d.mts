import { CaipAccountId } from "@metamask/utils";
import type { ExchangeClient } from "@nktkas/hyperliquid";
import type { CandlePeriod } from "../constants/chartConfig.mjs";
import { WebSocketConnectionState } from "../services/HyperLiquidClientService.mjs";
import type { AccountState, AssetRoute, BatchCancelOrdersParams, CancelOrderParams, CancelOrderResult, CancelOrdersResult, CandleData, ClosePositionParams, ClosePositionsParams, ClosePositionsResult, DepositParams, DisconnectResult, EditOrderParams, FeeCalculationParams, FeeCalculationResult, Funding, GetAccountStateParams, GetAvailableDexsParams, GetFundingParams, GetHistoricalPortfolioParams, GetMarketsParams, GetOrderFillsParams, GetOrdersParams, GetOrFetchFillsParams, GetPositionsParams, GetSupportedPathsParams, GetUserDataSnapshotParams, HistoricalPortfolioResult, InitializeResult, PerpsPlatformDependencies, PerpsProvider, LiquidationPriceParams, LiveDataConfig, MaintenanceMarginParams, MarginResult, MarketInfo, Order, OrderFill, OrderParams, OrderResult, PerpsMarketData, Position, ReadyToTradeResult, SubscribeAccountParams, SubscribeCandlesParams, SubscribeOICapsParams, SubscribeOrderBookParams, SubscribeOrderFillsParams, SubscribeOrdersParams, SubscribePositionsParams, SubscribePricesParams, ToggleTestnetResult, TransferBetweenDexsParams, TransferBetweenDexsResult, UpdateMarginParams, UpdatePositionTPSLParams, UserHistoryItem, WithdrawParams, WithdrawResult, RawLedgerUpdate, PerpsReadOptions, PerpsUserDataSnapshot, PerpsFeeResolution } from "../types/index.mjs";
import type { PerpsControllerMessengerBase } from "../types/messenger.mjs";
/**
 * HyperLiquid provider implementation
 *
 * Implements the PerpsProvider interface for HyperLiquid protocol.
 * Uses the @nktkas/hyperliquid SDK for all operations.
 * Delegates to service classes for client management, wallet integration, and subscriptions.
 *
 * HIP-3 Balance Management:
 * Attempts to use HyperLiquid's native DEX abstraction for automatic collateral transfers.
 * If not supported, falls back to programmatic balance management using SDK's sendAsset.
 */
export declare class HyperLiquidProvider implements PerpsProvider {
    #private;
    readonly protocolId = "hyperliquid";
    constructor(options: {
        isTestnet?: boolean;
        hip3Enabled?: boolean;
        allowlistMarkets?: string[];
        blocklistMarkets?: string[];
        priceDeviationLimit?: number;
        useUnifiedAccount?: boolean;
        platformDependencies: PerpsPlatformDependencies;
        messenger: PerpsControllerMessengerBase;
        initialAssetMapping?: [string, number][];
        builderAddressTestnet?: string;
        builderAddressMainnet?: string;
        subscriptionBuilderAddressTestnet?: string;
        subscriptionBuilderAddressMainnet?: string;
    });
    /**
     * Get fills using WebSocket cache first, falling back to REST API
     * OPTIMIZATION: Uses cached fills when available (0 API weight), only calls REST on cache miss
     *
     * Cache limitation: WebSocket cache is limited to ~100 most recent fills.
     * For historical data (e.g., position-opening fills from months ago), use getOrderFills directly.
     *
     * @param params - Optional filter parameters (startTime, symbol)
     * @returns Array of order fills
     */
    getOrFetchFills(params?: GetOrFetchFillsParams): Promise<OrderFill[]>;
    /**
     * Set user fee discount context for next operations
     * Used by PerpsController to apply MetaMask reward discounts
     *
     * @param discountBips - The discount in basis points (e.g., 550 = 5.5%)
     */
    setUserFeeDiscount(discountBips: number | undefined): void;
    /**
     * Set the resolved fee and its attribution source for the next operation.
     *
     * @param resolution - Unified fee resolution, or undefined to clear it.
     */
    setUserFeeResolution(resolution: PerpsFeeResolution | undefined): void;
    /**
     * Get supported deposit routes with complete asset and routing information
     *
     * @param params - The operation parameters.
     * @returns The result of the operation.
     */
    getDepositRoutes(params?: GetSupportedPathsParams): AssetRoute[];
    /**
     * Get supported withdrawal routes with complete asset and routing information
     *
     * @param params - The operation parameters.
     * @returns The result of the operation.
     */
    getWithdrawalRoutes(params?: GetSupportedPathsParams): AssetRoute[];
    /**
     * Approve the dedicated subscription builder outside order submission.
     * Failure is non-blocking: order construction will use the ordinary builder
     * at the standard fee until a later approval succeeds.
     *
     * @returns Whether the builder is approved for the current account.
     */
    approveSubscriptionBuilderFee(): Promise<boolean>;
    /**
     * Place an order using direct wallet signing
     *
     * Refactored to use helper methods for better maintainability and reduced complexity.
     * Each helper method is focused on a single responsibility.
     *
     * @param params - Order parameters
     * @param retryCount - Internal retry counter to prevent infinite loops (default: 0)
     * @returns A promise that resolves to the result.
     */
    placeOrder(params: OrderParams, retryCount?: number): Promise<OrderResult>;
    /**
     * Edit an existing order (pending/unfilled order)
     *
     * Note: This modifies price/size of a pending order. It CANNOT add TP/SL to an existing order.
     * For adding TP/SL to an existing position, use updatePositionTPSL instead.
     *
     * @param params - The operation parameters.
     * @param params.orderId - The order ID to modify
     * @param params.newOrder - New order parameters (price, size, etc.)
     * @returns A promise that resolves to the result.
     */
    editOrder(params: EditOrderParams): Promise<OrderResult>;
    /**
     * Cancel an order
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult>;
    /**
     * Cancel multiple orders in a single batch API call
     * Optimized implementation that uses HyperLiquid's batch cancel endpoint
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    cancelOrders(params: BatchCancelOrdersParams): Promise<CancelOrdersResult>;
    closePositions(params: ClosePositionsParams): Promise<ClosePositionsResult>;
    /**
     * Update TP/SL for an existing position
     *
     * This creates new TP/SL orders for the position using 'positionTpsl' grouping.
     * These are separate orders that will close the position when triggered.
     *
     * Key differences from editOrder:
     * - editOrder: Modifies pending orders (before fill)
     * - updatePositionTPSL: Creates TP/SL orders for filled positions
     *
     * HyperLiquid supports two TP/SL types:
     * 1. 'normalTpsl' - Tied to a parent order (set when placing the order)
     * 2. 'positionTpsl' - Tied to a position (can be set/modified after fill)
     *
     * Partial TP/SL: when `takeProfitSize` or `stopLossSize` is supplied, the
     * orders cannot use 'positionTpsl' (which always covers the whole position and
     * requires size 0). They are submitted as standalone reduce-only trigger orders
     * with 'na' grouping and explicit sizes instead.
     *
     * Note that the pre-cancel sweep clears every standalone reduce-only trigger
     * on the symbol — whether this update is partial or whole-position — not only
     * the ones this method placed. A trigger the caller placed independently
     * through `placeOrder` (for example a manual reduce-only stop) is therefore
     * cancelled too. Only TP/SL children of another pending order are protected.
     *
     * @param params - The operation parameters.
     * @param params.symbol - Asset symbol of the position
     * @param params.takeProfitPrice - TP price (undefined to remove)
     * @param params.stopLossPrice - SL price (undefined to remove)
     * @param params.takeProfitSize - Partial TP size (undefined for the whole position)
     * @param params.stopLossSize - Partial SL size (undefined for the whole position)
     * @returns A promise that resolves to the result.
     */
    updatePositionTPSL(params: UpdatePositionTPSLParams): Promise<OrderResult>;
    /**
     * Close a position
     *
     * For HIP-3 positions, this method automatically transfers freed margin
     * back to the main DEX after successfully closing the position.
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    closePosition(params: ClosePositionParams): Promise<OrderResult>;
    /**
     * Update margin for an existing position (add or remove)
     *
     * @param params - Margin adjustment parameters
     * @param params.symbol - Asset symbol (e.g., 'BTC', 'ETH')
     * @param params.amount - Amount to adjust as string (positive = add, negative = remove)
     * @param params.providerId - Optional provider identifier (ignored, always uses HyperLiquid)
     * @returns Promise resolving to margin adjustment result
     *
     * Note: HyperLiquid uses micro-units (multiply by 1e6) for the ntli parameter.
     * The SDK's updateIsolatedMargin requires:
     * - asset: Asset ID (number)
     * - isBuy: Position direction (true for long, false for short)
     * - ntli: Amount in micro-units (amount * 1e6)
     */
    updateMargin(params: UpdateMarginParams): Promise<MarginResult>;
    /**
     * Fetch a complete standalone user-data bundle.
     *
     * Each DEX clearinghouse response is shared by position and account-state
     * mapping. Any required request failure rejects the entire bundle.
     *
     * @param params - User and captured controller identity.
     * @returns The complete user-data snapshot.
     */
    getUserDataSnapshot(params: GetUserDataSnapshotParams): Promise<PerpsUserDataSnapshot>;
    /**
     * Get current positions with TP/SL prices
     *
     * Note on TP/SL orders:
     * - normalTpsl: TP/SL tied to parent order, only placed after parent fills
     * - positionTpsl: TP/SL tied to position, placed immediately
     *
     * This means TP/SL prices may not appear immediately after placing an order
     * with TP/SL. They will only show up once the parent order is filled and
     * the child TP/SL orders are actually placed on the order book.
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    getPositions(params?: GetPositionsParams): Promise<Position[]>;
    /**
     * Get historical user fills (trade executions)
     *
     * @param params - The operation parameters.
     * @param options - Optional cache-control modifiers for this read.
     * @returns A promise that resolves to the result.
     */
    getOrderFills(params?: GetOrderFillsParams, options?: PerpsReadOptions): Promise<OrderFill[]>;
    /**
     * Get historical orders (order lifecycle)
     *
     * @param params - The operation parameters.
     * @param options - Optional cache-control modifiers for this read.
     * @returns A promise that resolves to the result.
     */
    getOrders(params?: GetOrdersParams, options?: PerpsReadOptions): Promise<Order[]>;
    /**
     * Get currently open orders (real-time status)
     * Uses frontendOpenOrders API to get only currently active orders
     * Aggregates orders from all enabled DEXs (main + HIP-3)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    getOpenOrders(params?: GetOrdersParams): Promise<Order[]>;
    /**
     * Get user funding history
     *
     * @param params - The operation parameters.
     * @param _options - Cache-control modifiers (unused — funding has no
     * provider-internal cache; coalescing happens at MarketDataService).
     * @returns A promise that resolves to the result.
     */
    getFunding(params?: GetFundingParams, _options?: PerpsReadOptions): Promise<Funding[]>;
    /**
     * Get user non-funding ledger updates (deposits, transfers, withdrawals)
     *
     * @param params - The operation parameters.
     * @param params.accountId - The CAIP account ID.
     * @param params.startTime - Start timestamp in milliseconds.
     * @param params.endTime - End timestamp in milliseconds.
     * @returns The result of the operation.
     */
    getUserNonFundingLedgerUpdates(params?: {
        accountId?: string;
        startTime?: number;
        endTime?: number;
    }): Promise<RawLedgerUpdate[]>;
    /**
     * Resolve the provider's currently active CAIP account identifier.
     * Used by the MarketDataService REST coalesce layer so cached payloads
     * are keyed by the actual resolved address rather than a shared
     * "default" sentinel — prevents one account's data from being served
     * after an account switch within the coalesce TTL window.
     *
     * @returns CAIP account id for the currently selected HyperLiquid account.
     */
    getCurrentAccountId(): Promise<CaipAccountId>;
    /**
     * Get user history (deposits, withdrawals, transfers)
     *
     * @param params - The operation parameters.
     * @param params.accountId - The CAIP account ID.
     * @param params.startTime - Start timestamp in milliseconds.
     * @param params.endTime - End timestamp in milliseconds.
     * @returns The result of the operation.
     */
    getUserHistory(params?: {
        accountId?: CaipAccountId;
        startTime?: number;
        endTime?: number;
    }): Promise<UserHistoryItem[]>;
    getHistoricalPortfolio(params?: GetHistoricalPortfolioParams): Promise<HistoricalPortfolioResult>;
    /**
     * Get account state
     * Aggregates balances across all enabled DEXs (main + HIP-3)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    getAccountState(params?: GetAccountStateParams): Promise<AccountState>;
    /**
     * Get available markets with multi-DEX aggregation support (HIP-3)
     * Handles three query patterns:
     * 1. Symbol filtering: Groups symbols by DEX, fetches in parallel
     * 2. Multi-DEX aggregation: Fetches from all enabled DEXs when no specific DEX requested
     * 3. Single DEX query: Fetches from main or specific DEX
     *
     * @param params - Optional parameters for filtering
     * @returns A promise that resolves to the result.
     */
    getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]>;
    /**
     * Get list of available HIP-3 DEXs that have markets
     * Useful for debugging and manual DEX selection
     *
     * @returns Array of DEX names (excluding main DEX)
     */
    getAvailableHip3Dexs(): Promise<string[]>;
    /**
     * Get market data with prices, volumes, and 24h changes
     * Aggregates data from all enabled DEXs (main + HIP-3) when equity is enabled
     *
     * Note: This is called once during initialization and cached by PerpsStreamManager.
     * Real-time price updates come from WebSocket subscriptions, not this method.
     *
     * @returns A promise that resolves to the combined market data from all enabled DEXs.
     */
    getMarketDataWithPrices(): Promise<PerpsMarketData[]>;
    /**
     * Validate deposit parameters according to HyperLiquid-specific rules
     * This method enforces protocol-specific requirements like minimum amounts
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    validateDeposit(params: DepositParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Validate order parameters according to HyperLiquid-specific rules
     * This includes minimum order sizes, leverage limits, and other protocol requirements
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    validateOrder(params: OrderParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Validate close position parameters according to HyperLiquid-specific rules
     * Note: Full validation including remaining position size requires position data
     * which should be passed from the UI layer
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    validateClosePosition(params: ClosePositionParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Validate withdrawal parameters - placeholder for future implementation
     *
     * @param _params - The unused operation parameters.
     * @returns A promise that resolves to the result.
     */
    validateWithdrawal(_params: WithdrawParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Withdraw funds from HyperLiquid trading account
     *
     * This initiates a withdrawal request via HyperLiquid's API (withdraw3 endpoint).
     *
     * HyperLiquid Bridge Process:
     * - Funds are immediately deducted from L1 balance on HyperLiquid
     * - Validators sign the withdrawal (2/3 of staking power required)
     * - Bridge contract on destination chain processes the withdrawal
     * - After dispute period, USDC is sent to destination address
     * - Total time: ~5 minutes
     * - Fee: 1 USDC (covers Arbitrum gas costs)
     * - No ETH required from user
     *
     * Note: Withdrawals won't appear as incoming transactions until the
     * finalization phase completes (~5 minutes after initiation)
     *
     * @param params Withdrawal parameters
     * @returns Result with txHash (HyperLiquid internal) and withdrawal ID
     */
    withdraw(params: WithdrawParams): Promise<WithdrawResult>;
    /**
     * Transfer USDC collateral between DEXs (main ↔ HIP-3)
     *
     * Verified working on mainnet via Phantom wallet testing (10/15/2025).
     * See docs/perps/HIP-3-IMPLEMENTATION.md for complete transaction flow.
     *
     * @param params - Transfer parameters
     * @param params.sourceDex - Source DEX name ('' = main, 'xyz' = HIP-3)
     * @param params.destinationDex - Destination DEX name ('' = main, 'xyz' = HIP-3)
     * @param params.amount - USDC amount to transfer
     * @returns Transfer result with success status and transaction hash
     * @example
     * // Transfer 10 USDC from main DEX to xyz HIP-3 DEX
     * await transferBetweenDexs({
     *   sourceDex: '',
     *   destinationDex: 'xyz',
     *   amount: '10'
     * });
     */
    transferBetweenDexs(params: TransferBetweenDexsParams): Promise<TransferBetweenDexsResult>;
    /**
     * Subscribe to live price updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToPrices(params: SubscribePricesParams): () => void;
    /**
     * Subscribe to live position updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToPositions(params: SubscribePositionsParams): () => void;
    /**
     * Subscribe to live order fill updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void;
    /**
     * Subscribe to live order updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrders(params: SubscribeOrdersParams): () => void;
    /**
     * Subscribe to live account updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToAccount(params: SubscribeAccountParams): () => void;
    /**
     * Subscribe to open interest cap updates
     * Zero additional overhead - data extracted from existing webData3 subscription
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOICaps(params: SubscribeOICapsParams): () => void;
    /**
     * Subscribe to full order book updates with multiple depth levels
     * Creates a dedicated L2Book subscription for real-time order book data
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrderBook(params: SubscribeOrderBookParams): () => void;
    /**
     * Subscribe to live candle updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToCandles(params: SubscribeCandlesParams): () => void;
    /**
     * Configure live data settings
     *
     * @param config - The configuration object.
     */
    setLiveDataConfig(config: Partial<LiveDataConfig>): void;
    /**
     * Toggle testnet mode
     *
     * @returns A promise that resolves to the result.
     */
    toggleTestnet(): Promise<ToggleTestnetResult>;
    /**
     * Initialize provider (ensures clients are ready)
     *
     * @returns A promise that resolves to the result.
     */
    initialize(): Promise<InitializeResult>;
    /**
     * Check if ready to trade
     *
     * @returns A promise that resolves to the result.
     */
    isReadyToTrade(): Promise<ReadyToTradeResult>;
    /**
     * Calculate liquidation price using HyperLiquid's formula
     * Formula: liq_price = price - side * margin_available / position_size / (1 - maintenanceMarginRatio * side)
     * where maintenanceMarginRatio = 1 / MAINTENANCE_LEVERAGE = 1 / (2 * max_leverage)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the string result.
     */
    calculateLiquidationPrice(params: LiquidationPriceParams): Promise<string>;
    /**
     * Calculate maintenance margin for a specific asset
     * According to HyperLiquid docs: maintenance_margin = 1 / (2 * max_leverage)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the numeric result.
     */
    calculateMaintenanceMargin(params: MaintenanceMarginParams): Promise<number>;
    /**
     * Get maximum leverage allowed for an asset
     *
     * @param asset - The asset identifier.
     * @returns A promise that resolves to the numeric result.
     */
    getMaxLeverage(asset: string): Promise<number>;
    /**
     * Calculate fees based on HyperLiquid's fee structure
     * Returns fee rate as decimal (e.g., 0.00045 for 0.045%)
     *
     * Uses the SDK's userFees API to get actual discounted rates when available,
     * falling back to base rates if the API is unavailable or user not connected.
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    calculateFees(params: FeeCalculationParams): Promise<FeeCalculationResult>;
    /**
     * Clear fee cache for a specific user or all users
     *
     * @param userAddress - Optional address to clear cache for
     */
    clearFeeCache(userAddress?: string): void;
    /**
     * Escape hatch for agentic validation flows and test harnesses that drive
     * HL mutations directly. NOT part of the PerpsProvider interface.
     * Production code paths must go through the provider's own methods.
     *
     * @returns A promise resolving to the underlying HyperLiquid SDK
     * ExchangeClient. Promise shape matches the existing agentic flows
     * (hl-provision-fixture) that chain `.then` on the result.
     */
    getExchangeClient(): Promise<ExchangeClient>;
    /**
     * Disconnect provider
     *
     * @returns A promise that resolves to the result.
     */
    disconnect(): Promise<DisconnectResult>;
    /**
     * Lightweight WebSocket health check using SDK's built-in ready() method
     * Checks if WebSocket connection is open without making expensive API calls
     *
     * @param timeoutMs - Optional timeout in milliseconds (defaults to WEBSOCKET_PING_TIMEOUT_MS)
     * @throws {Error} If WebSocket connection times out or fails
     */
    ping(timeoutMs?: number): Promise<void>;
    /**
     * Get the current WebSocket connection state from the client service.
     * Used by the UI to monitor connection health and show notifications.
     *
     * @returns The current WebSocket connection state
     */
    getWebSocketConnectionState(): WebSocketConnectionState;
    /**
     * Subscribe to WebSocket connection state changes.
     * The listener will be called immediately with the current state and whenever the state changes.
     *
     * @param listener - Callback function that receives the new connection state and reconnection attempt
     * @returns Unsubscribe function to remove the listener
     */
    subscribeToConnectionState(listener: (state: WebSocketConnectionState, reconnectionAttempt: number) => void): () => void;
    /**
     * Manually trigger a WebSocket reconnection attempt.
     * Used by the UI retry button when connection is lost.
     *
     * @returns A promise that resolves when the operation completes.
     */
    reconnect(): Promise<void>;
    /**
     * Get list of available HIP-3 builder-deployed DEXs
     *
     * @param _params - Optional parameters (reserved for future filters/pagination)
     * @returns Array of DEX names (empty string '' represents main DEX)
     */
    getAvailableDexs(_params?: GetAvailableDexsParams): Promise<string[]>;
    fetchHistoricalCandles(options: {
        symbol: string;
        interval: CandlePeriod;
        limit?: number;
        endTime?: number;
    }): Promise<CandleData>;
    /**
     * Get block explorer URL for an address or just the base URL
     *
     * @param address - Optional address to append to the base URL
     * @returns Block explorer URL
     */
    getBlockExplorerUrl(address?: string): string;
}
//# sourceMappingURL=HyperLiquidProvider.d.mts.map