import type { PerpsWatchlistMarkets } from "@metamask/authenticated-user-storage";
import { BaseController, ControllerGetStateAction, ControllerStateChangedEvent, ControllerStateChangeEvent } from "@metamask/base-controller";
import type { Messenger } from "@metamask/messenger";
import type { Json } from "@metamask/utils";
import { CandlePeriod } from "./constants/chartConfig.cjs";
import type { SortOptionId, ProLayoutPreferences, PerpsMode } from "./constants/perpsConfig.cjs";
import type { PerpsControllerMethodActions } from "./PerpsController-method-action-types.cjs";
import { WebSocketConnectionState } from "./types/index.cjs";
import type { AccountState, AssetRoute, CancelOrderParams, CancelOrderResult, CancelOrdersParams, CancelOrdersResult, ClosePositionParams, ClosePositionsParams, ClosePositionsResult, DepositWithConfirmationParams, EditOrderParams, FeeCalculationParams, FeeCalculationResult, FlipPositionParams, Funding, GetAccountStateParams, GetAvailableDexsParams, GetFundingParams, GetMarketDataWithPricesParams, GetMarketsParams, GetOrderFillsParams, GetOrdersParams, GetPositionsParams, PerpsProvider, LiquidationPriceParams, LiveDataConfig, MaintenanceMarginParams, MarginResult, MarketInfo, Order, OrderFill, OrderParams, OrderResult, PerpsControllerConfig, PerpsMarketData, PerpsPendingManualRecovery, PerpsRecoveredDispatch, Position, SubscribeAccountParams, SubscribeCandlesParams, SubscribeOICapsParams, SubscribeOrderBookParams, SubscribeOrderFillsParams, SubscribeOrdersParams, SubscribePositionsParams, SubscribePricesParams, SwitchProviderResult, ToggleTestnetResult, UpdateMarginParams, UpdatePositionTPSLParams, WithdrawParams, WithdrawResult, GetHistoricalPortfolioParams, HistoricalPortfolioResult, OrderType, PerpsPlatformDependencies, PerpsActiveProviderMode, PerpsAnalyticsProperties, PerpsAttributionContext, PerpsProviderType, PerpsUserDataSnapshot, PerpsSelectedPaymentToken, PerpsRemoteFeatureFlagState, MarketTypeFilter, MYXCredentials } from "./types/index.cjs";
import type { SortDirection } from "./types/index.cjs";
import type { LighterAuthConfig, LighterSignerBridge } from "./types/lighter-types.cjs";
import type { PerpsControllerAllowedActions, PerpsControllerAllowedEvents } from "./types/messenger.cjs";
import type { CandleData } from "./types/perps-types.cjs";
import { LastTransactionResult, TransactionStatus } from "./types/transactionTypes.cjs";
/**
 * Returns the first non-empty string from the given values.
 * Env vars default to '' (not null/undefined), so ?? wouldn't fall through.
 *
 * @param vals - String values to check in order.
 * @returns The first non-empty string, or '' if all are empty/undefined.
 */
export declare function firstNonEmpty(...vals: (string | undefined)[]): string;
/**
 * Maps an active provider mode to the corresponding exchange key used in the
 * AUS {@link PerpsWatchlistMarkets} schema.
 *
 * Returns `null` for modes that are not yet represented in the AUS schema
 * (e.g. `'aggregated'`), which signals callers to skip remote sync and fall
 * back to local state only.  Add new entries here as additional DEX providers
 * gain AUS watchlist support.
 *
 * @param activeProvider - The current active provider mode from controller state.
 * @returns The matching `PerpsWatchlistMarkets` key, or `null` if unsupported.
 */
export declare function resolveWatchlistExchangeKey(activeProvider: PerpsActiveProviderMode): keyof PerpsWatchlistMarkets | null;
/**
 * Resolves MYX auth config from provider credentials, handling
 * testnet/mainnet fallback logic.
 *
 * @param myx - MYX provider credentials.
 * @param isTestnet - Whether the controller is in testnet mode.
 * @returns Resolved appId, apiSecret, and brokerAddress.
 */
export declare function resolveMyxAuthConfig(myx: MYXCredentials, isTestnet: boolean): {
    appId: string;
    apiSecret: string;
    brokerAddress: string;
};
/**
 * Minimal payment token stored in PerpsController state.
 * Only required fields for identification, Perps balance detection, and analytics.
 */
export type SelectedPaymentTokenSnapshot = {
    description?: string;
    address: string;
    chainId: string;
    symbol?: string;
};
export { PERPS_ERROR_CODES, type PerpsErrorCode } from "./perpsErrorCodes.cjs";
/**
 * Initialization state enum for state machine tracking
 */
export declare enum InitializationState {
    Uninitialized = "uninitialized",
    Initializing = "initializing",
    Initialized = "initialized",
    Failed = "failed"
}
export { PerpsMode, DEFAULT_PERPS_MODE, DEFAULT_PRO_LAYOUT_PREFERENCES, } from "./constants/perpsConfig.cjs";
export type { ProLayoutPreferences, ProOrdersSideFilter, ProOrdersSortDirection, ProOrdersSortField, ProPositionsSideFilter, ProPositionsSortDirection, ProPositionsSortField, } from "./constants/perpsConfig.cjs";
/**
 * State shape for PerpsController
 */
export type PerpsControllerState = {
    activeProvider: PerpsActiveProviderMode;
    isTestnet: boolean;
    initializationState: InitializationState;
    initializationError: string | null;
    initializationAttempts: number;
    accountState: AccountState | null;
    perpsBalances: {
        [provider: string]: {
            totalBalance: string;
            unrealizedPnl: string;
            accountValue1dAgo: string;
            lastUpdated: number;
        };
    };
    depositInProgress: boolean;
    lastDepositTransactionId: string | null;
    lastDepositResult: LastTransactionResult | null;
    withdrawInProgress: boolean;
    lastWithdrawResult: LastTransactionResult | null;
    lastCompletedWithdrawalTimestamp: number | null;
    lastCompletedWithdrawalTxHashes: string[];
    withdrawalRequests: {
        id: string;
        amount: string;
        asset: string;
        accountAddress: string;
        txHash?: string;
        timestamp: number;
        success: boolean;
        status: TransactionStatus;
        destination?: string;
        source?: string;
        transactionId?: string;
        withdrawalId?: string;
        depositId?: string;
    }[];
    withdrawalProgress: {
        progress: number;
        lastUpdated: number;
        activeWithdrawalId: string | null;
    };
    depositRequests: {
        id: string;
        amount: string;
        asset: string;
        accountAddress: string;
        txHash?: string;
        timestamp: number;
        success: boolean;
        status: TransactionStatus;
        destination?: string;
        source?: string;
        transactionId?: string;
        withdrawalId?: string;
        depositId?: string;
    }[];
    isEligible: boolean;
    isFirstTimeUser: {
        testnet: boolean;
        mainnet: boolean;
    };
    hasPlacedFirstOrder: {
        testnet: boolean;
        mainnet: boolean;
    };
    watchlistMarkets: {
        testnet: string[];
        mainnet: string[];
    };
    recentlyViewedMarkets: {
        testnet: {
            symbol: string;
            viewedAt: number;
        }[];
        mainnet: {
            symbol: string;
            viewedAt: number;
        }[];
    };
    tradeConfigurations: {
        testnet: {
            [marketSymbol: string]: {
                leverage?: number;
                orderBookGrouping?: number;
                pendingConfig?: {
                    amount?: string;
                    leverage?: number;
                    takeProfitPrice?: string;
                    stopLossPrice?: string;
                    limitPrice?: string;
                    orderType?: OrderType;
                    timestamp: number;
                };
            };
        };
        mainnet: {
            [marketSymbol: string]: {
                leverage?: number;
                orderBookGrouping?: number;
                pendingConfig?: {
                    amount?: string;
                    leverage?: number;
                    takeProfitPrice?: string;
                    stopLossPrice?: string;
                    limitPrice?: string;
                    orderType?: OrderType;
                    timestamp: number;
                };
            };
        };
    };
    maxSlippageBps?: number;
    marketFilterPreferences: {
        optionId: SortOptionId;
        direction: SortDirection;
    };
    proLayoutPreferences: ProLayoutPreferences;
    mode: PerpsMode;
    lastError: string | null;
    lastUpdateTimestamp: number;
    hip3ConfigVersion: number;
    selectedPaymentToken: Json | null;
    cachedMarketDataByProvider: Record<string, {
        data: PerpsMarketData[];
        timestamp: number;
        sourceExpiresAt?: number;
        hip3ConfigVersion?: number;
        dexes?: string[];
    }>;
    cachedUserDataByProvider: Record<string, {
        positions: Position[];
        orders: Order[];
        accountState: AccountState | null;
        timestamp: number;
        address: string;
        hip3ConfigVersion?: number;
        dexes?: string[];
    }>;
};
/**
 * Get default PerpsController state
 *
 * To change the active provider, modify the `activeProvider` value below:
 * - 'hyperliquid': HyperLiquid provider (default, production)
 * - 'aggregated': Multi-provider aggregation mode
 * - 'myx': MYX provider (future implementation)
 *
 * @returns The default perps controller state.
 */
export declare const getDefaultPerpsControllerState: () => PerpsControllerState;
/**
 * PerpsController events
 */
export type PerpsControllerEvents = ControllerStateChangeEvent<'PerpsController', PerpsControllerState> | ControllerStateChangedEvent<'PerpsController', PerpsControllerState>;
/**
 * The action which can be used to retrieve the state of the
 * {@link PerpsController}.
 */
export type PerpsControllerGetStateAction = ControllerGetStateAction<'PerpsController', PerpsControllerState>;
/**
 * PerpsController actions
 */
export type PerpsControllerActions = PerpsControllerGetStateAction | PerpsControllerMethodActions;
/**
 * PerpsController messenger constraints.
 * Includes both PerpsController's own actions/events and
 * allowed actions/events from external controllers.
 */
export type PerpsControllerMessenger = Messenger<'PerpsController', PerpsControllerActions | PerpsControllerAllowedActions, PerpsControllerEvents | PerpsControllerAllowedEvents>;
/**
 * PerpsController options
 */
export type PerpsControllerOptions = {
    messenger: PerpsControllerMessenger;
    state?: Partial<PerpsControllerState>;
    clientConfig?: PerpsControllerConfig;
    /**
     * Platform-specific dependencies (required)
     * Provides logging, metrics, tracing, stream management, and rewards.
     * Cross-controller communication uses the messenger pattern.
     * Must be provided by the platform (mobile/extension) at instantiation time.
     */
    infrastructure: PerpsPlatformDependencies;
    /**
     * When true, defers the initial eligibility (geolocation) check until
     * `startEligibilityMonitoring()` is called. This prevents the eager
     * geolocation fetch from firing during wallet onboarding (privacy compliance).
     */
    deferEligibilityCheck?: boolean;
};
type BlockedRegionList = {
    list: string[];
    source: 'remote' | 'fallback';
};
/**
 * PerpsController - Protocol-agnostic perpetuals trading controller
 *
 * Provides a unified interface for perpetual futures trading across multiple protocols.
 * Features dual data flow architecture:
 * - Trading actions use Redux for persistence and optimistic updates
 * - Live data uses direct callbacks for maximum performance
 */
export declare class PerpsController extends BaseController<'PerpsController', PerpsControllerState, PerpsControllerMessenger> {
    #private;
    protected providers: Map<PerpsProviderType, PerpsProvider>;
    protected isInitialized: boolean;
    protected blockedRegionList: BlockedRegionList;
    /**
     * Active provider instance for routing operations.
     * When activeProvider is 'hyperliquid' or 'myx': points to specific provider directly
     * When activeProvider is 'aggregated': points to AggregatedPerpsProvider wrapper
     */
    protected activeProviderInstance: PerpsProvider | null;
    constructor({ messenger, state, clientConfig, infrastructure, deferEligibilityCheck, }: PerpsControllerOptions);
    /**
     * Read cached market data for the currently active provider (or aggregated).
     * Returns null when no valid cache exists or when cache has expired.
     *
     * @param options - Optional settings.
     * @param options.skipTTL - When true, bypass the 5-minute TTL check.
     * Used during initial render so disk-hydrated structural data (with
     * placeholder prices) is returned regardless of age.
     * @returns The cached market data array, or null if no valid cache.
     */
    getCachedMarketDataForActiveProvider(options?: {
        skipTTL?: boolean;
    }): PerpsMarketData[] | null;
    /**
     * Read cached user data for the currently active provider (or aggregated).
     * Returns null when no valid cache exists, cache has expired, or address
     * does not match the currently selected EVM account.
     *
     * @param options - Optional settings.
     * @param options.skipTTL - When true, bypass the 60s staleness check.
     * Used during initial render so disk-hydrated user data (positions/orders)
     * is returned regardless of age, avoiding a skeleton flash.
     * @returns The cached user data, or null if no valid cache.
     */
    getCachedUserDataForActiveProvider(options?: {
        skipTTL?: boolean;
    }): {
        positions: Position[];
        orders: Order[];
        accountState: AccountState | null;
    } | null;
    /**
     * Fetch, validate, and atomically cache a complete user-data snapshot.
     * This remains callable after mount so consumers can seed their live channel
     * from one coherent positions/orders/account result.
     *
     * @returns The accepted user-data snapshot.
     */
    getUserDataSnapshot(): Promise<PerpsUserDataSnapshot>;
    /**
     * Test-observable accessor for whether a standalone provider is cached.
     *
     * @returns True if a standalone provider instance exists.
     */
    protected hasStandaloneProvider(): boolean;
    protected setBlockedRegionList(list: string[], source: 'remote' | 'fallback'): void;
    /**
     * Respond to RemoteFeatureFlagController state changes
     * Refreshes user eligibility based on geo-blocked regions defined in remote feature flag.
     * Uses fallback configuration when remote feature flag is undefined.
     * Note: Initial eligibility is set in the constructor if fallback regions are provided.
     *
     * @param remoteFeatureFlagControllerState - State from RemoteFeatureFlagController.
     */
    protected refreshEligibilityOnFeatureFlagChange(remoteFeatureFlagControllerState: PerpsRemoteFeatureFlagState): void;
    /**
     * Initialize the PerpsController providers
     * Must be called before using any other methods
     * Prevents double initialization with promise caching
     *
     * @returns A promise that resolves when the operation completes.
     */
    init(): Promise<void>;
    /**
     * Registers the MYX provider after dynamic import resolves.
     *
     * Extracted from the import().then() callback so it can be tested directly
     * (Jest cannot resolve dynamic imports without --experimental-vm-modules).
     *
     * @param MYXProvider - Constructor class for the MYX provider.
     */
    protected registerMYXProvider(MYXProvider: new (opts: {
        isTestnet: boolean;
        platformDependencies: PerpsPlatformDependencies;
        messenger: PerpsControllerMessenger;
        myxAuthConfig: ReturnType<typeof resolveMyxAuthConfig>;
    }) => PerpsProvider): void;
    /**
     * Handles errors from the MYX dynamic import.
     *
     * Module-not-found errors are expected (extension doesn't ship MYX) → debug log.
     * Other errors indicate constructor/config problems → Sentry via logError.
     *
     * @param error - The caught error from the dynamic import or constructor.
     */
    protected handleMYXImportError(error: unknown): void;
    /**
     * Registers the Lighter provider after dynamic import resolves.
     *
     * Extracted from the import().then() callback so it can be tested directly
     * (Jest cannot resolve dynamic imports without --experimental-vm-modules).
     *
     * @param LighterProviderClass - Constructor class for the Lighter provider.
     */
    protected registerLighterProvider(LighterProviderClass: new (opts: {
        isTestnet: boolean;
        platformDependencies: PerpsPlatformDependencies;
        messenger: PerpsControllerMessenger;
        lighterAuthConfig: LighterAuthConfig;
        signerBridge?: LighterSignerBridge;
    }) => PerpsProvider): void;
    /**
     * Handles errors from the Lighter dynamic import.
     *
     * Module-not-found errors are expected (clients may not ship Lighter) →
     * debug log. Other errors indicate constructor/config problems → Sentry.
     *
     * @param error - The caught error from the dynamic import or constructor.
     */
    protected handleLighterImportError(error: unknown): void;
    /**
     * Get the currently active provider.
     * In aggregated mode, returns AggregatedPerpsProvider which routes to underlying providers.
     * In single provider mode, returns HyperLiquidProvider directly.
     *
     * @returns The active provider (aggregated wrapper or direct provider based on mode)
     * @throws Error if provider is not initialized or reinitializing
     */
    getActiveProvider(): PerpsProvider;
    /**
     * Get the currently active provider, returning null if not available
     * Use this method when the caller can gracefully handle a missing provider
     * (e.g., UI components during initialization or reconnection)
     *
     * @returns The active provider, or null if not initialized/reinitializing
     */
    getActiveProviderOrNull(): PerpsProvider | null;
    /**
     * Place a new order
     * Thin delegation to TradingService
     *
     * @param params - The operation parameters.
     * @returns The order result with order ID and status.
     */
    placeOrder(params: OrderParams): Promise<OrderResult>;
    /**
     * Edit an existing order
     * Thin delegation to TradingService
     *
     * @param params - The operation parameters.
     * @returns The updated order result with order ID and status.
     */
    editOrder(params: EditOrderParams): Promise<OrderResult>;
    /**
     * Cancel an existing order
     *
     * @param params - The operation parameters.
     * @returns The cancellation result with status.
     */
    cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult>;
    /**
     * Cancel multiple orders in parallel
     * Batch version of cancelOrder() that cancels multiple orders simultaneously
     *
     * @param params - The operation parameters.
     * @returns The batch cancellation results for each order.
     */
    cancelOrders(params: CancelOrdersParams): Promise<CancelOrdersResult>;
    /**
     * Close a position (partial or full)
     * Thin delegation to TradingService
     *
     * @param params - The operation parameters.
     * @returns The order result from the close position request.
     */
    closePosition(params: ClosePositionParams): Promise<OrderResult>;
    /**
     * Close multiple positions in parallel
     * Batch version of closePosition() that closes multiple positions simultaneously
     *
     * @param params - The operation parameters.
     * @returns The batch close results for each position.
     */
    closePositions(params: ClosePositionsParams): Promise<ClosePositionsResult>;
    /**
     * Update TP/SL for an existing position
     *
     * @param params - The operation parameters.
     * @returns The order result from the TP/SL update.
     */
    updatePositionTPSL(params: UpdatePositionTPSLParams): Promise<OrderResult>;
    /**
     * Update margin for an existing position (add or remove)
     *
     * @param params - The operation parameters.
     * @returns The margin update result.
     */
    updateMargin(params: UpdateMarginParams): Promise<MarginResult>;
    /**
     * Flip position (reverse direction while keeping size and leverage)
     *
     * @param params - The operation parameters.
     * @returns The order result from the position flip.
     */
    flipPosition(params: FlipPositionParams): Promise<OrderResult>;
    /**
     * Simplified deposit method that prepares transaction for confirmation screen
     * No complex state tracking - just sets a loading flag
     *
     * @param params - Parameters for the deposit flow
     * @param params.amount - Optional deposit amount
     * @param params.placeOrder - If true, uses addTransaction instead of submit to avoid navigation
     * @returns An object containing a promise that resolves to the transaction hash.
     */
    depositWithConfirmation(params?: DepositWithConfirmationParams): Promise<{
        result: Promise<string>;
    }>;
    /**
     * Same as depositWithConfirmation - prepares transaction for confirmation screen.
     *
     * @returns A promise that resolves to the string result.
     */
    depositWithOrder(): Promise<{
        result: Promise<string>;
    }>;
    /**
     * Clear the last deposit result after it has been shown to the user
     */
    clearDepositResult(): void;
    clearWithdrawResult(): void;
    /**
     * Update withdrawal request status when it completes, or remove it on failure.
     * This is called when a withdrawal is matched with a completed withdrawal from the API.
     * When status is `failed`, the request is removed from the queue (not retained).
     *
     * @param withdrawalId - The withdrawal transaction ID.
     * @param status - The current status.
     * @param txHash - The transaction hash.
     */
    updateWithdrawalStatus(withdrawalId: string, status: 'completed' | 'failed', txHash?: string): void;
    /**
     * Complete a specific withdrawal detected via transaction history polling (FIFO queue).
     * Called when a completed withdrawal appears in the transaction history matching a pending request.
     *
     * Uses FIFO matching: oldest pending withdrawal is matched with first completed withdrawal
     * in history that happened after its submission time.
     *
     * @param withdrawalRequestId - The ID of the pending withdrawal request to mark as complete.
     * @param completedWithdrawal - The completed withdrawal data from the history API.
     * @param completedWithdrawal.txHash - The on-chain transaction hash.
     * @param completedWithdrawal.amount - The withdrawal amount.
     * @param completedWithdrawal.timestamp - The completion timestamp from the history API.
     * @param completedWithdrawal.asset - The asset symbol (e.g. USDC).
     */
    completeWithdrawalFromHistory(withdrawalRequestId: string, completedWithdrawal: {
        txHash: string;
        amount: string;
        timestamp: number;
        asset?: string;
    }): void;
    /**
     * Update withdrawal progress (persistent across navigation)
     *
     * @param progress - The progress indicator.
     * @param activeWithdrawalId - The active withdrawal ID.
     */
    updateWithdrawalProgress(progress: number, activeWithdrawalId?: string | null): void;
    /**
     * Get current withdrawal progress
     *
     * @returns The withdrawal progress, last update timestamp, and active withdrawal ID.
     */
    getWithdrawalProgress(): {
        progress: number;
        lastUpdated: number;
        activeWithdrawalId: string | null;
    };
    /**
     * Withdraw funds from trading account
     *
     * The withdrawal process varies by provider and may involve:
     * - Direct on-chain transfers
     * - Bridge operations
     * - Multi-step validation processes
     *
     * Check the specific provider documentation for detailed withdrawal flows.
     *
     * @param params Withdrawal parameters
     * @returns WithdrawResult with withdrawal ID and tracking info
     */
    withdraw(params: WithdrawParams): Promise<WithdrawResult>;
    /**
     * Get current positions
     * Thin delegation to MarketDataService
     *
     * For standalone mode, bypasses getActiveProvider() to allow position queries
     * without full perps initialization (e.g., for showing positions on token details page)
     *
     * @param params - The operation parameters.
     * @returns Array of open positions for the active provider.
     */
    getPositions(params?: GetPositionsParams): Promise<Position[]>;
    /**
     * Get historical user fills (trade executions)
     * Thin delegation to MarketDataService
     *
     * @param params - The operation parameters.
     * @param options - Optional call modifiers.
     * @param options.forceRefresh - Bypass the request-coalesce cache
     * end-to-end (user-initiated refresh).
     * @returns Array of historical trade executions (fills).
     */
    getOrderFills(params?: GetOrderFillsParams, options?: {
        forceRefresh?: boolean;
    }): Promise<OrderFill[]>;
    /**
     * List TP/SL protection changes the active provider parked for
     * explicit manual re-establishment. Providers without durable
     * settlement state return an empty list.
     *
     * @returns Pending manual-recovery entries.
     */
    getPendingManualRecoveries(): Promise<PerpsPendingManualRecovery[]>;
    /**
     * READ-ONLY list of the active provider's recovered-dispatch outcomes
     * (previously ambiguous submissions later resolved). Providers without
     * durable dispatch state return an empty list.
     *
     * @returns Pending recovered-dispatch outcomes.
     */
    getRecoveredDispatches(): Promise<PerpsRecoveredDispatch[]>;
    /**
     * Acknowledge ONE recovered-dispatch outcome by its stable id, after
     * refreshing venue state. Throws when the active provider has no
     * durable dispatch state or the id no longer matches.
     *
     * @param recoveryId - Stable id from {@link getRecoveredDispatches}.
     * @returns Resolves when the outcome is acknowledged.
     */
    acknowledgeRecoveredDispatch(recoveryId: string): Promise<void>;
    /**
     * Get historical user orders (order lifecycle)
     * Thin delegation to MarketDataService
     *
     * @param params - The operation parameters.
     * @param options - Optional call modifiers.
     * @param options.forceRefresh - Bypass the request-coalesce cache
     * end-to-end (user-initiated refresh).
     * @returns Array of historical orders.
     */
    getOrders(params?: GetOrdersParams, options?: {
        forceRefresh?: boolean;
    }): Promise<Order[]>;
    /**
     * Get currently open orders (real-time status)
     * Thin delegation to MarketDataService
     *
     * For standalone mode, bypasses getActiveProvider() to allow open order queries
     * without full perps initialization (e.g., for background preloading)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    getOpenOrders(params?: GetOrdersParams): Promise<Order[]>;
    /**
     * Get historical user funding history (funding payments)
     * Thin delegation to MarketDataService
     *
     * @param params - The operation parameters.
     * @param options - Optional call modifiers.
     * @param options.forceRefresh - Bypass the request-coalesce cache
     * end-to-end (user-initiated refresh).
     * @returns Array of historical funding payments.
     */
    getFunding(params?: GetFundingParams, options?: {
        forceRefresh?: boolean;
    }): Promise<Funding[]>;
    /**
     * Get account state (balances, etc.)
     * Thin delegation to MarketDataService
     *
     * For standalone mode, bypasses getActiveProvider() to allow account state queries
     * without full perps initialization (e.g., for checking if user has perps funds)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    getAccountState(params?: GetAccountStateParams): Promise<AccountState>;
    /**
     * Get historical portfolio data
     * Thin delegation to MarketDataService
     *
     * @param params - The operation parameters.
     * @returns The historical portfolio data points.
     */
    getHistoricalPortfolio(params?: GetHistoricalPortfolioParams): Promise<HistoricalPortfolioResult>;
    /**
     * Get available markets with optional filtering
     * Thin delegation to MarketDataService
     *
     * For standalone mode, bypasses getActiveProvider() to allow market discovery
     * without full perps initialization (e.g., for discovery banners on spot screens)
     *
     * @param params - The operation parameters.
     * @returns Array of available markets matching the filter criteria.
     */
    getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]>;
    /**
     * Get market data with prices (includes price, volume, 24h change).
     * Optionally filter by category, sort, and limit the results.
     *
     * For standalone mode, bypasses getActiveProvider() to allow market data queries
     * without full perps initialization (e.g., for background preloading on app start)
     *
     * @param params - The operation parameters.
     * @param params.standalone - Whether to use standalone mode.
     * @param params.categories - Filter to markets matching any of these categories.
     * @param params.sortBy - Sort results by this field.
     * @param params.direction - Sort direction (default: desc).
     * @param params.limit - Maximum number of results to return.
     * @returns A promise that resolves to the market data.
     */
    getMarketDataWithPrices(params?: GetMarketDataWithPricesParams): Promise<PerpsMarketData[]>;
    /**
     * Start background market data preloading.
     * Fetches market data immediately and refreshes every 5 minutes.
     * Watches for isTestnet and hip3ConfigVersion changes to re-preload.
     */
    startMarketDataPreload(): void;
    /**
     * Stop background market data preloading.
     */
    stopMarketDataPreload(): void;
    /**
     * Get list of available HIP-3 builder-deployed DEXs
     *
     * @param params - Optional parameters for filtering
     * @returns Array of DEX names
     */
    getAvailableDexs(params?: GetAvailableDexsParams): Promise<string[]>;
    /**
     * Fetch historical candle data
     * Thin delegation to MarketDataService
     *
     * @param options - The configuration options.
     * @param options.symbol - The trading pair symbol.
     * @param options.interval - The candle interval period.
     * @param options.limit - Maximum number of items to fetch.
     * @param options.endTime - End timestamp in milliseconds.
     * @returns The historical candle data for the requested symbol and interval.
     */
    fetchHistoricalCandles(options: {
        symbol: string;
        interval: CandlePeriod;
        limit?: number;
        endTime?: number;
    }): Promise<CandleData>;
    /**
     * Calculate liquidation price for a position
     * Uses provider-specific formulas based on protocol rules
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the string result.
     */
    calculateLiquidationPrice(params: LiquidationPriceParams): Promise<string>;
    /**
     * Calculate maintenance margin for a specific asset
     * Returns a percentage (e.g., 0.0125 for 1.25%)
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
     * Validate order parameters according to protocol-specific rules
     *
     * @param params - The operation parameters.
     * @returns True if the condition is met.
     */
    validateOrder(params: OrderParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Validate close position parameters according to protocol-specific rules
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    validateClosePosition(params: ClosePositionParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Validate withdrawal parameters according to protocol-specific rules
     *
     * @param params - The operation parameters.
     * @returns True if the condition is met.
     */
    validateWithdrawal(params: WithdrawParams): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Get supported withdrawal routes - returns complete asset and routing information
     *
     * @returns Array of supported asset routes for withdrawals.
     */
    getWithdrawalRoutes(): AssetRoute[];
    /**
     * Set the transient UTM / discovery attribution context.
     * Replaces any previously set context. Held in-memory only — not persisted.
     *
     * @param context - The attribution context (UTM fields) to store.
     */
    setAttributionContext(context: PerpsAttributionContext): void;
    /**
     * Get a copy of the current attribution context.
     *
     * @returns A shallow copy of the stored attribution context.
     */
    getAttributionContext(): PerpsAttributionContext;
    /**
     * Clear the stored attribution context.
     */
    clearAttributionContext(): void;
    /**
     * Merge the stored UTM attribution context into a set of analytics event
     * properties. Only defined UTM fields are added, mapped
     * to their canonical PERPS_EVENT_PROPERTY keys. Provided properties take
     * precedence and are never overwritten.
     *
     * @param properties - Base event properties to merge attribution into.
     * @returns A new properties object including any defined UTM keys.
     */
    mergeAttributionContext(properties?: PerpsAnalyticsProperties): PerpsAnalyticsProperties;
    /**
     * Toggle between testnet and mainnet
     *
     * @returns The toggle result with success status and current network mode.
     */
    toggleTestnet(): Promise<ToggleTestnetResult>;
    /**
     * Switch to a different provider
     * Uses a full reinit approach: disconnect() → update state → init()
     * This ensures complete state reset including WebSocket connections and caches.
     *
     * @param providerId - The provider identifier.
     * @returns The switch result with success status and active provider.
     */
    switchProvider(providerId: PerpsActiveProviderMode): Promise<SwitchProviderResult>;
    /**
     * Get current network (mainnet/testnet)
     *
     * @returns Either 'mainnet' or 'testnet' based on the current configuration.
     */
    getCurrentNetwork(): 'mainnet' | 'testnet';
    /**
     * Get the ordered list of all market categories for HIP-3 markets.
     * Returns a stable, explicitly ordered array so the UI can render
     * category filter tabs without deriving order from config insertion.
     *
     * @returns Ordered array of {@link MarketTypeFilter} values. Does not include the 'all' or 'new' sentinels — those are separate UI controls.
     */
    getMarketCategories(): MarketTypeFilter[];
    /**
     * Get the current WebSocket connection state from the active provider.
     * Used by the UI to monitor connection health and show notifications.
     *
     * @returns The current WebSocket connection state, or DISCONNECTED if not supported
     */
    getWebSocketConnectionState(): WebSocketConnectionState;
    /**
     * Subscribe to WebSocket connection state changes from the active provider.
     * The listener will be called immediately with the current state and whenever the state changes.
     *
     * @param listener - Callback function that receives the new connection state and reconnection attempt
     * @returns Unsubscribe function to remove the listener, or no-op if not supported
     */
    subscribeToConnectionState(listener: (state: WebSocketConnectionState, reconnectionAttempt: number) => void): () => void;
    /**
     * Manually trigger a WebSocket reconnection attempt.
     * Used by the UI retry button when connection is lost.
     */
    reconnect(): Promise<void>;
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
     * Subscribe to live account updates.
     * Updates controller state (Redux) when new account data arrives so consumers
     * like usePerpsBalanceTokenFilter (PayWithModal) see the latest balance.
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToAccount(params: SubscribeAccountParams): () => void;
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
     * Subscribe to open interest cap updates
     * Zero additional network overhead - data comes from existing webData3 subscription
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOICaps(params: SubscribeOICapsParams): () => void;
    /**
     * Configure live data throttling
     *
     * @param config - The configuration object.
     */
    setLiveDataConfig(config: Partial<LiveDataConfig>): void;
    /**
     * Calculate trading fees for the active provider
     * Each provider implements its own fee structure
     *
     * @param params - The operation parameters.
     * @returns The fee calculation result for the trade.
     */
    calculateFees(params: FeeCalculationParams): Promise<FeeCalculationResult>;
    /**
     * Approve the dedicated subscription builder outside order submission.
     * Until this succeeds, subscription waivers fall back to the ordinary
     * builder at the standard fee.
     *
     * @returns Whether the subscription builder is approved.
     */
    approveSubscriptionBuilderFee(): Promise<boolean>;
    /**
     * Drop the cached subscription benefits snapshot.
     *
     * Call this when the identity behind the benefits changes — sign-out, or a
     * profile switch. The snapshot carries no profile identity of its own, so
     * without this it keeps answering for the previous profile until the next
     * successful refresh. The next fee resolution reports the waiver as
     * unavailable, so it is withheld until preview or lifecycle hydration.
     */
    invalidateSubscriptionBenefits(): void;
    /**
     * Disconnect provider and cleanup subscriptions
     * Call this when navigating away from Perps screens to prevent battery drain
     */
    disconnect(): Promise<void>;
    /**
     * Eligibility (Geo-Blocking)
     */
    /**
     * Fetch geo location
     *
     * Returned in Country or Country-Region format
     * Example: FR, DE, US-MI, CA-ON
     */
    /**
     * Refresh eligibility status
     */
    /**
     * Resume eligibility monitoring after onboarding completes.
     * Clears the deferred flag and triggers an immediate eligibility check
     * using the current remote feature flag state.
     */
    startEligibilityMonitoring(): void;
    /**
     * Stops geo-blocking eligibility monitoring.
     * Call this when the user disables basic functionality (e.g. useExternalServices becomes false).
     * Prevents geolocation calls until startEligibilityMonitoring() is called again.
     * Safe to call multiple times.
     */
    stopEligibilityMonitoring(): void;
    refreshEligibility(): Promise<void>;
    /**
     * Get block explorer URL for an address or just the base URL
     *
     * @param address - Optional address to append to the base URL
     * @returns Block explorer URL
     */
    getBlockExplorerUrl(address?: string): string;
    /**
     * Check if user is first-time for the current network
     *
     * @returns True if the condition is met.
     */
    isFirstTimeUserOnCurrentNetwork(): boolean;
    /**
     * Mark that the user has completed the tutorial/onboarding
     * This prevents the tutorial from showing again
     */
    markTutorialCompleted(): void;
    markFirstOrderCompleted(): void;
    /**
     * Reset first-time user state for both networks
     * This is useful for testing the tutorial flow
     * Called by Reset Account feature in settings
     */
    resetFirstTimeUserState(): void;
    /**
     * Clear pending/bridging withdrawal and deposit requests
     * This is useful when users want to clear stuck pending indicators
     * Called by Reset Account feature in settings
     */
    clearPendingTransactionRequests(): void;
    /**
     * Get saved trade configuration for a market
     *
     * @param symbol - The trading pair symbol.
     * @returns The resulting string value.
     */
    getTradeConfiguration(symbol: string): {
        leverage?: number;
    } | undefined;
    /**
     * Save trade configuration for a market
     *
     * @param symbol - Market symbol
     * @param leverage - Leverage value
     */
    saveTradeConfiguration(symbol: string, leverage: number): void;
    /**
     * Save pending trade configuration for a market
     * This is a temporary configuration that expires after 5 minutes
     *
     * @param symbol - Market symbol
     * @param config - Pending trade configuration (includes optional selected payment token from Pay row)
     * @param config.amount - The amount value.
     * @param config.leverage - The leverage multiplier.
     * @param config.takeProfitPrice - The take profit price.
     * @param config.stopLossPrice - The stop loss price.
     * @param config.limitPrice - The limit price.
     * @param config.orderType - The order type.
     * @param config.selectedPaymentToken - The selected payment token.
     */
    savePendingTradeConfiguration(symbol: string, config: {
        amount?: string;
        leverage?: number;
        takeProfitPrice?: string;
        stopLossPrice?: string;
        limitPrice?: string;
        orderType?: OrderType;
        /** When user used pay-with-token in PerpsPayRow: minimal token shape to restore selection */
        selectedPaymentToken?: PerpsSelectedPaymentToken | null;
    }): void;
    /**
     * Get pending trade configuration for a market
     * Returns undefined if config doesn't exist or has expired (more than 5 minutes old)
     *
     * @param symbol - Market symbol
     * @returns Pending trade configuration or undefined
     */
    getPendingTradeConfiguration(symbol: string): {
        amount?: string;
        leverage?: number;
        takeProfitPrice?: string;
        stopLossPrice?: string;
        limitPrice?: string;
        orderType?: OrderType;
        selectedPaymentToken?: PerpsSelectedPaymentToken | null;
    } | undefined;
    /**
     * Clear pending trade configuration for a market
     *
     * @param symbol - Market symbol
     */
    clearPendingTradeConfiguration(symbol: string): void;
    /**
     * Get saved market filter preferences
     * Handles backward compatibility with legacy string format
     *
     * @returns The saved sort option ID and direction.
     */
    getMarketFilterPreferences(): {
        optionId: SortOptionId;
        direction: SortDirection;
    };
    /**
     * Save market filter preferences
     *
     * @param optionId - Sort/filter option ID
     * @param direction - Sort direction ('asc' or 'desc')
     */
    saveMarketFilterPreferences(optionId: SortOptionId, direction: SortDirection): void;
    /**
     * Get the user's max slippage tolerance in basis points.
     *
     * @returns The configured max slippage bps, or undefined if never set (callers should default to 300 bps / 3%).
     */
    getMaxSlippage(): number | undefined;
    /**
     * Set the user's max slippage tolerance in basis points.
     *
     * @param bps - Max slippage in basis points (e.g. 300 = 3%). Clamped to 10–1000, snapped to step of 10.
     */
    setMaxSlippage(bps: number): void;
    /**
     * Get the user's pro-mode layout preferences (network-independent).
     *
     * @returns The current pro-mode layout preferences.
     */
    getProLayoutPreferences(): ProLayoutPreferences;
    /**
     * Update the user's pro-mode layout preferences.
     *
     * Patch-style setter: only the provided fields are updated, the rest are
     * preserved. This keeps the signature stable as new layout fields are added.
     *
     * @param patch - Partial set of pro-mode layout preferences to update.
     */
    setProLayoutPreferences(patch: Partial<ProLayoutPreferences>): void;
    /**
     * Set the Perps interface mode (lite/pro).
     *
     * @param mode - The mode to switch to.
     */
    setPerpsMode(mode: PerpsMode): void;
    /**
     * Set the selected payment token for the Perps order/deposit flow.
     * Pass null or a token with description PERPS_CONSTANTS.PerpsBalanceTokenDescription to select Perps balance.
     * Only required fields (address, chainId) are stored in state; description and symbol are optional.
     *
     * @param token - The token identifier.
     */
    setSelectedPaymentToken(token: PerpsSelectedPaymentToken | null): void;
    /**
     * Reset the selected payment token to Perps balance (null).
     * Call when leaving the Perps order view so the next visit defaults to Perps balance.
     */
    resetSelectedPaymentToken(): void;
    /**
     * Get saved order book grouping for a market
     *
     * @param symbol - Market symbol
     * @returns The saved grouping value or undefined if not set
     */
    getOrderBookGrouping(symbol: string): number | undefined;
    /**
     * Save order book grouping for a market
     *
     * @param symbol - Market symbol
     * @param grouping - Price grouping value
     */
    saveOrderBookGrouping(symbol: string, grouping: number): void;
    /**
     * Toggle watchlist status for a market.
     *
     * Updates local state immediately (optimistic UI) and then syncs the new
     * watchlist to AuthenticatedUserStorageService.  If the remote write fails,
     * the local state is reverted so it stays consistent with AUS.
     *
     * When the user is unauthenticated, or the active provider is not yet
     * supported by the AUS schema, the controller continues operating with
     * local-persisted state only — no error is surfaced to the caller.
     *
     * Watchlist markets are stored per network (testnet/mainnet).
     *
     * @param symbol - The trading pair symbol.
     */
    toggleWatchlistMarket(symbol: string): Promise<void>;
    /**
     * Check if a market is in the watchlist on the current network
     *
     * @param symbol - The trading pair symbol.
     * @returns True if the condition is met.
     */
    isWatchlistMarket(symbol: string): boolean;
    /**
     * Get all watchlist markets for the current network
     *
     * @returns The resulting string value.
     */
    getWatchlistMarkets(): string[];
    /**
     * Record that the user viewed a market.
     *
     * The symbol is prepended to the per-network recently-viewed list (newest-first).
     * Any existing entry for the same symbol is removed first so there are no
     * duplicates. The list is then capped at PERPS_CONSTANTS.RecentlyViewedMarketsLimit.
     *
     * @param symbol - The trading pair symbol (e.g. 'BTC', 'ETH', 'xyz:TSLA').
     */
    recordMarketViewed(symbol: string): void;
    /**
     * Get recently viewed markets for the current network.
     *
     * Returns up to PERPS_CONSTANTS.RecentlyViewedMarketsLimit symbols, ordered
     * newest-first, filtered to entries within the last
     * PERPS_CONSTANTS.RecentlyViewedMarketsTtlMs (24 hours). Returns an empty
     * array when no qualifying entries exist.
     *
     * @returns Ordered array of market symbols.
     */
    getRecentlyViewedMarkets(): string[];
    /**
     * Report order events to data lake API with retry (non-blocking)
     * Thin delegation to DataLakeService
     *
     * @param params - The operation parameters.
     * @param params.action - The order action.
     * @param params.symbol - The trading pair symbol.
     * @param params.slPrice - The stop loss price.
     * @param params.tpPrice - The take profit price.
     * @param params.retryCount - Internal retry counter.
     * @param params._traceId - Internal trace ID.
     * @returns Whether the report was sent successfully, with an optional error message.
     */
    protected reportOrderToDataLake(params: {
        action: 'open' | 'close';
        symbol: string;
        slPrice?: number;
        tpPrice?: number;
        retryCount?: number;
        _traceId?: string;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Check if the controller is currently reinitializing
     *
     * @returns true if providers are being reinitialized
     */
    isCurrentlyReinitializing(): boolean;
}
//# sourceMappingURL=PerpsController.d.cts.map