import type { CandlePeriod } from "../constants/chartConfig.cjs";
import type { PerpsProvider, Position, GetPositionsParams, AccountState, GetAccountStateParams, HistoricalPortfolioResult, GetHistoricalPortfolioParams, OrderFill, GetOrderFillsParams, Funding, GetFundingParams, Order, GetOrdersParams, MarketInfo, GetMarketDataWithPricesParams, GetMarketsParams, GetAvailableDexsParams, LiquidationPriceParams, MaintenanceMarginParams, FeeCalculationParams, FeeCalculationResult, OrderParams, ClosePositionParams, AssetRoute, PerpsPlatformDependencies, PerpsMarketData } from "../types/index.cjs";
import type { CandleData } from "../types/perps-types.cjs";
import type { ServiceContext } from "./ServiceContext.cjs";
/**
 * MarketDataService
 *
 * Handles all read-only data-fetching operations for the Perps controller.
 * This service is stateless and delegates to the provider.
 * The controller is responsible for tracing and state management.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export declare class MarketDataService {
    #private;
    /**
     * Create a new MarketDataService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     */
    constructor(deps: PerpsPlatformDependencies);
    /**
     * Get current positions
     * Handles full orchestration: tracing, error logging, state management, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    getPositions(options: {
        provider: PerpsProvider;
        params?: GetPositionsParams;
        context: ServiceContext;
    }): Promise<Position[]>;
    /**
     * Get order fills for a specific user or order
     * Handles full orchestration: tracing, error logging, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.forceRefresh - Bypass the request-coalesce cache end-to-end
     * (user-initiated refresh).
     * @returns The result of the operation.
     */
    getOrderFills(options: {
        provider: PerpsProvider;
        params?: GetOrderFillsParams;
        context: ServiceContext;
        /**
         * Bypass the request-coalesce cache. Use for user-initiated refresh
         * (pull-to-refresh, polling tick) so the fetch runs fresh.
         */
        forceRefresh?: boolean;
    }): Promise<OrderFill[]>;
    /**
     * Get historical user orders (order lifecycle)
     * Handles full orchestration: tracing, error logging, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.forceRefresh - Bypass the request-coalesce cache end-to-end
     * (user-initiated refresh).
     * @returns The result of the operation.
     */
    getOrders(options: {
        provider: PerpsProvider;
        params?: GetOrdersParams;
        context: ServiceContext;
        /**
         * Bypass the request-coalesce cache. Use for user-initiated refresh.
         */
        forceRefresh?: boolean;
    }): Promise<Order[]>;
    /**
     * Get current open orders
     * Handles full orchestration: tracing, error logging, performance measurement, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    getOpenOrders(options: {
        provider: PerpsProvider;
        params?: GetOrdersParams;
        context: ServiceContext;
    }): Promise<Order[]>;
    /**
     * Get funding rates
     * Handles full orchestration: tracing, error logging, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.forceRefresh - Bypass the request-coalesce cache end-to-end
     * (user-initiated refresh).
     * @returns The result of the operation.
     */
    getFunding(options: {
        provider: PerpsProvider;
        params?: GetFundingParams;
        context: ServiceContext;
        /**
         * Bypass the request-coalesce cache. Use for user-initiated refresh.
         */
        forceRefresh?: boolean;
    }): Promise<Funding[]>;
    /**
     * Get account state
     * Handles full orchestration: tracing, error logging, state management, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    getAccountState(options: {
        provider: PerpsProvider;
        params?: GetAccountStateParams;
        context: ServiceContext;
    }): Promise<AccountState>;
    /**
     * Get historical portfolio data
     * Handles full orchestration: tracing, error logging, state management, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    getHistoricalPortfolio(options: {
        provider: PerpsProvider;
        params?: GetHistoricalPortfolioParams;
        context: ServiceContext;
    }): Promise<HistoricalPortfolioResult>;
    /**
     * Get available markets
     * Handles full orchestration: tracing, error logging, state management, and provider delegation.
     * When `useTerminalApi` is true, attempts the Terminal API first; on failure or empty
     * response, falls back silently to the HyperLiquid provider path.
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.isMarketAllowed - Optional filter callback applied to
     * Terminal API results so that allowlist/blocklist rules from the provider
     * layer are enforced even when the provider is bypassed. Skipped when
     * `params.skipFilters` is true.
     * @returns The result of the operation.
     */
    getMarkets(options: {
        provider: PerpsProvider;
        params?: GetMarketsParams;
        context: ServiceContext;
        isMarketAllowed?: (symbol: string) => boolean;
    }): Promise<MarketInfo[]>;
    /**
     * Get market data with prices (includes price, volume, 24h change).
     * Applies optional category filtering, sorting, and limit after fetching.
     * An explicitly configured global snapshot is the preferred complete source.
     * `useTerminalApi` controls only legacy metadata enrichment of provider data.
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - Optional filter/sort/limit params.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    getMarketDataWithPrices(options: {
        provider: PerpsProvider;
        params?: GetMarketDataWithPricesParams;
        context: ServiceContext;
    }): Promise<PerpsMarketData[]>;
    /**
     * Get available DEXs (HIP-3 support required)
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    getAvailableDexs(options: {
        provider: PerpsProvider;
        params?: GetAvailableDexsParams;
        context: ServiceContext;
    }): Promise<string[]>;
    /**
     * Fetch historical candle data for charting
     * Handles full orchestration: tracing, error logging, state management, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.symbol - The trading pair symbol.
     * @param options.interval - The candle interval period.
     * @param options.limit - Maximum number of items to fetch.
     * @param options.endTime - End timestamp in milliseconds.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    fetchHistoricalCandles(options: {
        provider: PerpsProvider;
        symbol: string;
        interval: CandlePeriod;
        limit?: number;
        endTime?: number;
        context: ServiceContext;
    }): Promise<CandleData>;
    /**
     * Calculate liquidation price for a position
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    calculateLiquidationPrice(options: {
        provider: PerpsProvider;
        params: LiquidationPriceParams;
        context: ServiceContext;
    }): Promise<string>;
    /**
     * Calculate maintenance margin for a position
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    calculateMaintenanceMargin(options: {
        provider: PerpsProvider;
        params: MaintenanceMarginParams;
        context: ServiceContext;
    }): Promise<number>;
    /**
     * Get maximum leverage for an asset
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.asset - The asset identifier.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    getMaxLeverage(options: {
        provider: PerpsProvider;
        asset: string;
        context: ServiceContext;
    }): Promise<number>;
    /**
     * Calculate fees for an order
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    calculateFees(options: {
        provider: PerpsProvider;
        params: FeeCalculationParams;
        context: ServiceContext;
    }): Promise<FeeCalculationResult>;
    /**
     * Validate an order before placement
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    validateOrder(options: {
        provider: PerpsProvider;
        params: OrderParams;
        context: ServiceContext;
    }): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Validate a position close request
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    validateClosePosition(options: {
        provider: PerpsProvider;
        params: ClosePositionParams;
        context: ServiceContext;
    }): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Get supported withdrawal routes (synchronous)
     * Note: This method doesn't log errors to avoid needing context for a synchronous getter
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @returns The result of the operation.
     */
    getWithdrawalRoutes(options: {
        provider: PerpsProvider;
    }): AssetRoute[];
    /**
     * Get block explorer URL (synchronous)
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.address - The wallet address.
     * @returns The result of the operation.
     */
    getBlockExplorerUrl(options: {
        provider: PerpsProvider;
        address?: string;
    }): string;
}
//# sourceMappingURL=MarketDataService.d.cts.map