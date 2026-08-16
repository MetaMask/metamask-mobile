/**
 * SubscriptionMultiplexer - Manages WebSocket subscriptions across multiple providers
 *
 * Responsibilities:
 * - Manage subscriptions to multiple providers simultaneously
 * - Tag all updates with providerId so UI can differentiate sources
 * - Support aggregation modes: 'merge' (all prices) or 'best_price' (best price per symbol)
 * - Cache latest updates per provider per symbol for aggregation
 */
import type { PerpsProviderType, PerpsProvider, PerpsLogger, PriceUpdate, Position, OrderFill, Order, AccountState } from "../types/index.cjs";
/**
 * Options for constructing SubscriptionMultiplexer
 */
export type SubscriptionMultiplexerOptions = {
    /** Optional logger for error reporting (e.g., Sentry) */
    logger?: PerpsLogger;
};
/**
 * Aggregation mode for price subscriptions
 */
export type PriceAggregationMode = 'merge' | 'best_price';
/**
 * Parameters for multiplexed price subscriptions
 */
export type MultiplexedPricesParams = {
    /** Symbols to subscribe to */
    symbols: string[];
    /** Provider instances to subscribe through */
    providers: [PerpsProviderType, PerpsProvider][];
    /** Callback to receive aggregated price updates */
    callback: (prices: PriceUpdate[]) => void;
    /** Aggregation mode: 'merge' returns all prices, 'best_price' returns best per symbol */
    aggregationMode?: PriceAggregationMode;
    /** Optional throttle in milliseconds */
    throttleMs?: number;
    /** Include order book data */
    includeOrderBook?: boolean;
    /** Include market data (funding, OI, volume) */
    includeMarketData?: boolean;
};
/**
 * Parameters for multiplexed position subscriptions
 */
export type MultiplexedPositionsParams = {
    /** Provider instances to subscribe through */
    providers: [PerpsProviderType, PerpsProvider][];
    /** Callback to receive aggregated position updates */
    callback: (positions: Position[]) => void;
};
/**
 * Parameters for multiplexed order fill subscriptions
 */
export type MultiplexedOrderFillsParams = {
    /** Provider instances to subscribe through */
    providers: [PerpsProviderType, PerpsProvider][];
    /** Callback to receive aggregated order fill updates */
    callback: (fills: OrderFill[], isSnapshot?: boolean) => void;
};
/**
 * Parameters for multiplexed order subscriptions
 */
export type MultiplexedOrdersParams = {
    /** Provider instances to subscribe through */
    providers: [PerpsProviderType, PerpsProvider][];
    /** Callback to receive aggregated order updates */
    callback: (orders: Order[]) => void;
};
/**
 * Parameters for multiplexed account subscriptions
 */
export type MultiplexedAccountParams = {
    /** Provider instances to subscribe through */
    providers: [PerpsProviderType, PerpsProvider][];
    /** Callback to receive account updates (one per provider) */
    callback: (accounts: AccountState[]) => void;
};
/**
 * SubscriptionMultiplexer manages real-time data subscriptions across
 * multiple perps providers.
 *
 * Key features:
 * - Subscribes to all providers simultaneously
 * - Tags all updates with source providerId
 * - Caches latest values for aggregation
 * - Supports different aggregation modes for prices
 *
 * @example
 * ```typescript
 * const mux = new SubscriptionMultiplexer();
 *
 * const unsubscribe = mux.subscribeToPrices({
 *   symbols: ['BTC', 'ETH'],
 *   providers: [
 *     ['hyperliquid', hlProvider],
 *     ['myx', myxProvider],
 *   ],
 *   callback: (prices) => {
 *     // prices have providerId injected
 *     prices.forEach(p => console.log(`${p.providerId}: ${p.symbol} = ${p.price}`));
 *   },
 *   aggregationMode: 'merge',
 * });
 *
 * // Later: clean up
 * unsubscribe();
 * ```
 */
export declare class SubscriptionMultiplexer {
    #private;
    /**
     * Create a new SubscriptionMultiplexer.
     *
     * @param options - Optional configuration including logger for error reporting
     */
    constructor(options?: SubscriptionMultiplexerOptions);
    /**
     * Subscribe to price updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToPrices(params: MultiplexedPricesParams): () => void;
    /**
     * Subscribe to position updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToPositions(params: MultiplexedPositionsParams): () => void;
    /**
     * Subscribe to order fill updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToOrderFills(params: MultiplexedOrderFillsParams): () => void;
    /**
     * Subscribe to order updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToOrders(params: MultiplexedOrdersParams): () => void;
    /**
     * Subscribe to account updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToAccount(params: MultiplexedAccountParams): () => void;
    /**
     * Clear all cached data.
     */
    clearCache(): void;
    /**
     * Get cached price for a symbol from a specific provider.
     *
     * @param symbol - Market symbol
     * @param providerId - Provider ID
     * @returns Cached price update or undefined
     */
    getCachedPrice(symbol: string, providerId: PerpsProviderType): PriceUpdate | undefined;
    /**
     * Get all cached prices for a symbol.
     *
     * @param symbol - Market symbol
     * @returns Map of provider ID to price update
     */
    getAllCachedPricesForSymbol(symbol: string): Map<PerpsProviderType, PriceUpdate> | undefined;
}
//# sourceMappingURL=SubscriptionMultiplexer.d.cts.map