/**
 * AggregatedPerpsProvider - Multi-provider aggregation wrapper
 *
 * Implements PerpsProvider interface to enable seamless multi-provider support.
 * Aggregates read operations from all providers, routes write operations to specific
 * providers based on params.providerId or default provider.
 *
 * Phase 1 Implementation:
 * - Read operations: Aggregate from all providers using Promise.allSettled()
 * - Write operations: Route to params.providerId ?? defaultProvider
 * - Subscriptions: Multiplex via SubscriptionMultiplexer
 * - Lifecycle: Delegate to default provider
 *
 * All returned data includes providerId field for UI differentiation.
 */
import type { CaipAccountId } from "@metamask/utils";
import { ProviderRouter } from "../routing/ProviderRouter.cjs";
import { WebSocketConnectionState } from "../types/index.cjs";
import type { AccountState, AggregatedProviderConfig, AssetRoute, BatchCancelOrdersParams, CancelOrderParams, CancelOrderResult, CancelOrdersResult, ClosePositionParams, ClosePositionsParams, ClosePositionsResult, DepositParams, DisconnectResult, EditOrderParams, FeeCalculationParams, FeeCalculationResult, Funding, GetAccountStateParams, GetAvailableDexsParams, GetFundingParams, GetHistoricalPortfolioParams, GetMarketsParams, GetOrderFillsParams, GetOrdersParams, GetOrFetchFillsParams, GetPositionsParams, GetSupportedPathsParams, HistoricalPortfolioResult, InitializeResult, PerpsProvider, LiquidationPriceParams, LiveDataConfig, MaintenanceMarginParams, MarginResult, MarketInfo, Order, OrderFill, OrderParams, OrderResult, PerpsMarketData, PerpsPendingManualRecovery, PerpsRecoveredDispatch, PerpsProviderType, Position, ReadyToTradeResult, SubscribeAccountParams, SubscribeCandlesParams, SubscribeOICapsParams, SubscribeOrderBookParams, SubscribeOrderFillsParams, SubscribeOrdersParams, SubscribePositionsParams, SubscribePricesParams, ToggleTestnetResult, UpdateMarginParams, UpdatePositionTPSLParams, UserHistoryItem, WithdrawParams, WithdrawResult, RawLedgerUpdate, PerpsReadOptions, PerpsFeeResolution } from "../types/index.cjs";
/**
 * AggregatedPerpsProvider implements PerpsProvider by coordinating
 * multiple backend providers.
 *
 * Design principles:
 * 1. Read operations aggregate from all providers (parallel)
 * 2. Write operations route to specific provider (explicit > default)
 * 3. Lifecycle operations delegate to default provider
 * 4. All returned data includes providerId for UI differentiation
 *
 * @example
 * ```typescript
 * const aggregated = new AggregatedPerpsProvider({
 *   providers: new Map([
 *     ['hyperliquid', hlProvider],
 *     ['myx', myxProvider],
 *   ]),
 *   defaultProvider: 'hyperliquid',
 *   infrastructure: deps,
 * });
 *
 * // Read: returns positions from all providers
 * const positions = await aggregated.getPositions();
 *
 * // Write: routes to specific or default provider
 * await aggregated.placeOrder({ symbol: 'BTC', providerId: 'myx', ... });
 * ```
 */
export declare class AggregatedPerpsProvider implements PerpsProvider {
    #private;
    readonly protocolId = "aggregated";
    constructor(config: AggregatedProviderConfig);
    getDepositRoutes(params?: GetSupportedPathsParams): AssetRoute[];
    getWithdrawalRoutes(params?: GetSupportedPathsParams): AssetRoute[];
    getPositions(params?: GetPositionsParams): Promise<Position[]>;
    getAccountState(params?: GetAccountStateParams): Promise<AccountState>;
    getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]>;
    getMarketDataWithPrices(): Promise<PerpsMarketData[]>;
    getOrderFills(params?: GetOrderFillsParams, options?: PerpsReadOptions): Promise<OrderFill[]>;
    getOrFetchFills(params?: GetOrFetchFillsParams): Promise<OrderFill[]>;
    getOrders(params?: GetOrdersParams, options?: PerpsReadOptions): Promise<Order[]>;
    getOpenOrders(params?: GetOrdersParams): Promise<Order[]>;
    getFunding(params?: GetFundingParams, options?: PerpsReadOptions): Promise<Funding[]>;
    getHistoricalPortfolio(params?: GetHistoricalPortfolioParams): Promise<HistoricalPortfolioResult>;
    /**
     * Get user non-funding ledger updates from default provider.
     *
     * @param params - Optional parameters
     * @param params.accountId - Account ID to filter by
     * @param params.startTime - Start time filter
     * @param params.endTime - End time filter
     * @returns Raw ledger updates
     */
    getUserNonFundingLedgerUpdates(params?: {
        accountId?: string;
        startTime?: number;
        endTime?: number;
    }): Promise<RawLedgerUpdate[]>;
    /**
     * Resolve the currently selected CAIP account identifier. Accounts are
     * shared across sub-providers (same InternalAccountController), so the
     * default provider's view is authoritative.
     *
     * @returns Resolved CAIP account id from the default sub-provider.
     */
    getCurrentAccountId(): Promise<CaipAccountId>;
    /**
     * Get user history from all providers.
     *
     * @param params - Optional parameters
     * @param params.accountId - Account ID to filter by
     * @param params.startTime - Start time filter
     * @param params.endTime - End time filter
     * @returns Aggregated user history with providerId
     */
    getUserHistory(params?: {
        accountId?: CaipAccountId;
        startTime?: number;
        endTime?: number;
    }): Promise<UserHistoryItem[]>;
    placeOrder(params: OrderParams): Promise<OrderResult>;
    editOrder(params: EditOrderParams): Promise<OrderResult>;
    cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult>;
    cancelOrders(params: BatchCancelOrdersParams): Promise<CancelOrdersResult>;
    closePosition(params: ClosePositionParams): Promise<OrderResult>;
    closePositions(params: ClosePositionsParams): Promise<ClosePositionsResult>;
    updatePositionTPSL(params: UpdatePositionTPSLParams): Promise<OrderResult>;
    updateMargin(params: UpdateMarginParams): Promise<MarginResult>;
    withdraw(params: WithdrawParams): Promise<WithdrawResult>;
    /**
     * Aggregate parked manual TP/SL recoveries from every underlying
     * provider implementing the durable-settlement contract. Storage
     * errors PROPAGATE — a corrupt store degrading to "nothing pending"
     * would hide an under-protected position.
     *
     * @returns Pending manual-recovery entries across providers.
     */
    getPendingManualRecoveries(): Promise<PerpsPendingManualRecovery[]>;
    /**
     * Aggregate recovered-dispatch outcomes from every underlying provider
     * implementing the durable-settlement contract.
     *
     * @returns Pending recovered-dispatch outcomes across providers.
     */
    getRecoveredDispatches(): Promise<PerpsRecoveredDispatch[]>;
    /**
     * Acknowledge ONE recovered-dispatch outcome by its stable id on
     * whichever underlying provider owns it.
     *
     * @param recoveryId - Stable id from {@link getRecoveredDispatches}.
     */
    acknowledgeRecoveredDispatch(recoveryId: string): Promise<void>;
    validateDeposit(params: DepositParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    validateOrder(params: OrderParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    validateClosePosition(params: ClosePositionParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    validateWithdrawal(params: WithdrawParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    calculateLiquidationPrice(params: LiquidationPriceParams): Promise<string>;
    calculateMaintenanceMargin(params: MaintenanceMarginParams): Promise<number>;
    getMaxLeverage(asset: string): Promise<number>;
    calculateFees(params: FeeCalculationParams): Promise<FeeCalculationResult>;
    subscribeToPrices(params: SubscribePricesParams): () => void;
    subscribeToPositions(params: SubscribePositionsParams): () => void;
    subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void;
    subscribeToOrders(params: SubscribeOrdersParams): () => void;
    subscribeToAccount(params: SubscribeAccountParams): () => void;
    subscribeToOICaps(params: SubscribeOICapsParams): () => void;
    subscribeToCandles(params: SubscribeCandlesParams): () => void;
    subscribeToOrderBook(params: SubscribeOrderBookParams): () => void;
    setLiveDataConfig(config: Partial<LiveDataConfig>): void;
    setUserFeeDiscount(discountBips: number | undefined): void;
    setUserFeeResolution(resolution: PerpsFeeResolution | undefined): void;
    approveSubscriptionBuilderFee(): Promise<boolean>;
    toggleTestnet(): Promise<ToggleTestnetResult>;
    initialize(): Promise<InitializeResult>;
    isReadyToTrade(): Promise<ReadyToTradeResult>;
    disconnect(): Promise<DisconnectResult>;
    ping(timeoutMs?: number): Promise<void>;
    getWebSocketConnectionState(): WebSocketConnectionState;
    subscribeToConnectionState(listener: (state: WebSocketConnectionState, reconnectionAttempt: number) => void): () => void;
    reconnect(): Promise<void>;
    getBlockExplorerUrl(address?: string): string;
    getAvailableDexs(params?: GetAvailableDexsParams): Promise<string[]>;
    /**
     * Add a new provider to the aggregated provider.
     *
     * @param providerId - Unique identifier for the provider
     * @param provider - Provider instance
     */
    addProvider(providerId: PerpsProviderType, provider: PerpsProvider): void;
    /**
     * Remove a provider from the aggregated provider.
     *
     * @param providerId - Provider to remove
     * @returns true if removed, false if not found
     */
    removeProvider(providerId: PerpsProviderType): boolean;
    /**
     * Get list of all registered provider IDs.
     *
     * @returns The result of the operation.
     */
    getProviderIds(): PerpsProviderType[];
    /**
     * Check if a provider is registered.
     *
     * @param providerId - The provider id value.
     * @returns True if the condition is met.
     */
    hasProvider(providerId: PerpsProviderType): boolean;
    /**
     * Get the router instance for external configuration.
     *
     * @returns The result of the operation.
     */
    getRouter(): ProviderRouter;
}
//# sourceMappingURL=AggregatedPerpsProvider.d.cts.map