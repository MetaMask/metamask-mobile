import type { PerpsProvider, OrderParams, OrderResult, EditOrderParams, CancelOrderParams, CancelOrderResult, CancelOrdersParams, CancelOrdersResult, ClosePositionParams, ClosePositionsParams, ClosePositionsResult, Position, TrackingData, UpdatePositionTPSLParams, PerpsPlatformDependencies } from "../types/index.mjs";
import type { RewardsIntegrationService } from "./RewardsIntegrationService.mjs";
import type { ServiceContext } from "./ServiceContext.mjs";
/**
 * Controller-level dependencies for TradingService.
 * These are singletons that don't change per-call, injected once via setControllerDependencies().
 */
export type TradingServiceControllerDeps = {
    rewardsIntegrationService: RewardsIntegrationService;
};
/**
 * TradingService
 *
 * Handles trading operations with fee discount management.
 * Controller is responsible for analytics, state management, and tracing.
 *
 * Instance-based service with constructor injection of platform dependencies.
 * Controller-level dependencies (RewardsController, NetworkController, etc.)
 * are injected via setControllerDependencies() after construction.
 */
export declare class TradingService {
    #private;
    /**
     * Create a new TradingService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     */
    constructor(deps: PerpsPlatformDependencies);
    /**
     * Set controller-level dependencies for fee discount calculation.
     * Called by PerpsController after construction to inject singleton dependencies.
     *
     * @param controllerDeps - Controller-level dependencies (RewardsController, etc.)
     */
    setControllerDependencies(controllerDeps: TradingServiceControllerDeps): void;
    /**
     * Place a new order with full orchestration
     * Handles tracing, fee discounts, state management, analytics, and data lake reporting
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.reportOrderToDataLake - The report order to data lake value.
     * @returns The result of the operation.
     */
    placeOrder(options: {
        provider: PerpsProvider;
        params: OrderParams;
        context: ServiceContext;
        reportOrderToDataLake: (params: {
            action: 'open' | 'close';
            symbol: string;
            slPrice?: number;
            tpPrice?: number;
        }) => Promise<{
            success: boolean;
            error?: string;
        }>;
    }): Promise<OrderResult>;
    /**
     * Edit an existing order with full orchestration
     * Handles tracing, fee discounts, state management, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    editOrder(options: {
        provider: PerpsProvider;
        params: EditOrderParams;
        context: ServiceContext;
    }): Promise<OrderResult>;
    /**
     * Cancel a single order with full orchestration
     * Handles tracing, state management, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.bulkActionId - Optional batch correlation id.
     * @returns The result of the operation.
     */
    cancelOrder(options: {
        provider: PerpsProvider;
        params: CancelOrderParams;
        context: ServiceContext;
        bulkActionId?: string;
    }): Promise<CancelOrderResult>;
    /**
     * Cancel multiple orders with full orchestration
     * Handles tracing, stream pausing, filtering, batch operations, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.withStreamPause - The with stream pause value.
     * @returns The result of the operation.
     */
    cancelOrders(options: {
        provider: PerpsProvider;
        params: CancelOrdersParams;
        context: ServiceContext;
        withStreamPause: <TResult>(operation: () => Promise<TResult>, channels: string[]) => Promise<TResult>;
    }): Promise<CancelOrdersResult>;
    /**
     * Close a single position with full orchestration
     * Handles tracing, fee discounts, state management, analytics, and data lake reporting
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.reportOrderToDataLake - The report order to data lake value.
     * @param options.bulkActionId - Optional batch correlation id.
     * @returns The result of the operation.
     */
    closePosition(options: {
        provider: PerpsProvider;
        params: ClosePositionParams;
        context: ServiceContext;
        reportOrderToDataLake: (params: {
            action: 'open' | 'close';
            symbol: string;
        }) => Promise<{
            success: boolean;
            error?: string;
        }>;
        bulkActionId?: string;
    }): Promise<OrderResult>;
    /**
     * Close multiple positions with full orchestration
     * Handles tracing, fee discounts, batch operations, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    closePositions(options: {
        provider: PerpsProvider;
        params: ClosePositionsParams;
        context: ServiceContext;
    }): Promise<ClosePositionsResult>;
    /**
     * Update TP/SL for an existing position with full orchestration
     * Handles tracing, fee discounts, state management, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    updatePositionTPSL(options: {
        provider: PerpsProvider;
        params: UpdatePositionTPSLParams;
        context: ServiceContext;
    }): Promise<OrderResult>;
    /**
     * Update margin for an existing position (add or remove)
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.symbol - The trading pair symbol.
     * @param options.amount - The amount value.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    updateMargin(options: {
        provider: PerpsProvider;
        symbol: string;
        amount: string;
        context: ServiceContext;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Flip position (reverse direction while keeping size and leverage)
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.position - The position data.
     * @param options.trackingData - Optional tracking data for analytics events.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    flipPosition(options: {
        provider: PerpsProvider;
        position: Position;
        trackingData?: TrackingData;
        context: ServiceContext;
    }): Promise<OrderResult>;
}
//# sourceMappingURL=TradingService.d.mts.map