/**
 * SubscriptionMultiplexer - Manages WebSocket subscriptions across multiple providers
 *
 * Responsibilities:
 * - Manage subscriptions to multiple providers simultaneously
 * - Tag all updates with providerId so UI can differentiate sources
 * - Support aggregation modes: 'merge' (all prices) or 'best_price' (best price per symbol)
 * - Cache latest updates per provider per symbol for aggregation
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SubscriptionMultiplexer_instances, _SubscriptionMultiplexer_logger, _SubscriptionMultiplexer_priceCache, _SubscriptionMultiplexer_positionCache, _SubscriptionMultiplexer_orderCache, _SubscriptionMultiplexer_accountCache, _SubscriptionMultiplexer_aggregatePrices, _SubscriptionMultiplexer_findBestPrice, _SubscriptionMultiplexer_aggregatePositions, _SubscriptionMultiplexer_aggregateOrders;
import { PERPS_CONSTANTS } from "../constants/perpsConfig.mjs";
import { ensureError } from "../utils/errorUtils.mjs";
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
export class SubscriptionMultiplexer {
    /**
     * Create a new SubscriptionMultiplexer.
     *
     * @param options - Optional configuration including logger for error reporting
     */
    constructor(options) {
        _SubscriptionMultiplexer_instances.add(this);
        /**
         * Optional logger for error reporting
         */
        _SubscriptionMultiplexer_logger.set(this, void 0);
        /**
         * Cache of latest prices per symbol per provider
         * Map<symbol, Map<providerId, PriceUpdate>>
         */
        _SubscriptionMultiplexer_priceCache.set(this, new Map());
        /**
         * Cache of latest positions per provider
         * Map<providerId, Position[]>
         */
        _SubscriptionMultiplexer_positionCache.set(this, new Map());
        /**
         * Cache of latest orders per provider
         * Map<providerId, Order[]>
         */
        _SubscriptionMultiplexer_orderCache.set(this, new Map());
        /**
         * Cache of latest account state per provider
         * Map<providerId, AccountState>
         */
        _SubscriptionMultiplexer_accountCache.set(this, new Map());
        __classPrivateFieldSet(this, _SubscriptionMultiplexer_logger, options?.logger, "f");
    }
    /**
     * Subscribe to price updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToPrices(params) {
        const { symbols, providers, callback, aggregationMode = 'merge', throttleMs, includeOrderBook, includeMarketData, } = params;
        const unsubscribers = [];
        // Subscribe to each provider with defensive error handling
        for (const [providerId, provider] of providers) {
            try {
                const subscribeParams = {
                    symbols,
                    callback: (updates) => {
                        // Tag and cache each update
                        updates.forEach((update) => {
                            const taggedUpdate = { ...update, providerId };
                            // Initialize symbol cache if needed
                            if (!__classPrivateFieldGet(this, _SubscriptionMultiplexer_priceCache, "f").has(update.symbol)) {
                                __classPrivateFieldGet(this, _SubscriptionMultiplexer_priceCache, "f").set(update.symbol, new Map());
                            }
                            const symbolCache = __classPrivateFieldGet(this, _SubscriptionMultiplexer_priceCache, "f").get(update.symbol);
                            if (symbolCache) {
                                symbolCache.set(providerId, taggedUpdate);
                            }
                        });
                        // Aggregate and emit based on mode
                        const aggregated = __classPrivateFieldGet(this, _SubscriptionMultiplexer_instances, "m", _SubscriptionMultiplexer_aggregatePrices).call(this, symbols, aggregationMode);
                        callback(aggregated);
                    },
                    throttleMs,
                    includeOrderBook,
                    includeMarketData,
                };
                const unsub = provider.subscribeToPrices(subscribeParams);
                unsubscribers.push(unsub);
            }
            catch (error) {
                // Log to Sentry before cleanup
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_logger, "f")?.error(ensureError(error, 'SubscriptionMultiplexer.subscribeToPrices'), {
                    tags: {
                        feature: PERPS_CONSTANTS.FeatureName,
                        provider: providerId,
                        method: 'subscribeToPrices',
                    },
                    context: {
                        name: 'SubscriptionMultiplexer',
                        data: { subscribedCount: unsubscribers.length },
                    },
                });
                // Clean up any subscriptions created before the failure
                unsubscribers.forEach((unsub) => unsub());
                throw error;
            }
        }
        // Return combined unsubscribe function
        return () => {
            unsubscribers.forEach((unsub) => unsub());
            // Optionally clear cache for these symbols
            symbols.forEach((symbol) => {
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_priceCache, "f").delete(symbol);
            });
        };
    }
    /**
     * Subscribe to position updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToPositions(params) {
        const { providers, callback } = params;
        const unsubscribers = [];
        for (const [providerId, provider] of providers) {
            try {
                const subscribeParams = {
                    callback: (positions) => {
                        // Tag positions with providerId and cache
                        const taggedPositions = positions.map((pos) => ({
                            ...pos,
                            providerId,
                        }));
                        __classPrivateFieldGet(this, _SubscriptionMultiplexer_positionCache, "f").set(providerId, taggedPositions);
                        // Emit aggregated positions from all providers
                        const allPositions = __classPrivateFieldGet(this, _SubscriptionMultiplexer_instances, "m", _SubscriptionMultiplexer_aggregatePositions).call(this);
                        callback(allPositions);
                    },
                };
                const unsub = provider.subscribeToPositions(subscribeParams);
                unsubscribers.push(unsub);
            }
            catch (error) {
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_logger, "f")?.error(ensureError(error, 'SubscriptionMultiplexer.subscribeToPositions'), {
                    tags: {
                        feature: PERPS_CONSTANTS.FeatureName,
                        provider: providerId,
                        method: 'subscribeToPositions',
                    },
                    context: {
                        name: 'SubscriptionMultiplexer',
                        data: { subscribedCount: unsubscribers.length },
                    },
                });
                unsubscribers.forEach((unsub) => unsub());
                throw error;
            }
        }
        return () => {
            unsubscribers.forEach((unsub) => unsub());
            // Clear position cache for these providers
            providers.forEach(([providerId]) => {
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_positionCache, "f").delete(providerId);
            });
        };
    }
    /**
     * Subscribe to order fill updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToOrderFills(params) {
        const { providers, callback } = params;
        const unsubscribers = [];
        for (const [providerId, provider] of providers) {
            try {
                const subscribeParams = {
                    callback: (fills, isSnapshot) => {
                        // Tag fills with providerId
                        const taggedFills = fills.map((fill) => ({
                            ...fill,
                            providerId,
                        }));
                        // For fills, we don't aggregate - emit immediately with tags
                        callback(taggedFills, isSnapshot);
                    },
                };
                const unsub = provider.subscribeToOrderFills(subscribeParams);
                unsubscribers.push(unsub);
            }
            catch (error) {
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_logger, "f")?.error(ensureError(error, 'SubscriptionMultiplexer.subscribeToOrderFills'), {
                    tags: {
                        feature: PERPS_CONSTANTS.FeatureName,
                        provider: providerId,
                        method: 'subscribeToOrderFills',
                    },
                    context: {
                        name: 'SubscriptionMultiplexer',
                        data: { subscribedCount: unsubscribers.length },
                    },
                });
                unsubscribers.forEach((unsub) => unsub());
                throw error;
            }
        }
        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }
    /**
     * Subscribe to order updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToOrders(params) {
        const { providers, callback } = params;
        const unsubscribers = [];
        for (const [providerId, provider] of providers) {
            try {
                const subscribeParams = {
                    callback: (orders) => {
                        // Tag orders with providerId and cache
                        const taggedOrders = orders.map((order) => ({
                            ...order,
                            providerId,
                        }));
                        __classPrivateFieldGet(this, _SubscriptionMultiplexer_orderCache, "f").set(providerId, taggedOrders);
                        // Emit aggregated orders from all providers
                        const allOrders = __classPrivateFieldGet(this, _SubscriptionMultiplexer_instances, "m", _SubscriptionMultiplexer_aggregateOrders).call(this);
                        callback(allOrders);
                    },
                };
                const unsub = provider.subscribeToOrders(subscribeParams);
                unsubscribers.push(unsub);
            }
            catch (error) {
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_logger, "f")?.error(ensureError(error, 'SubscriptionMultiplexer.subscribeToOrders'), {
                    tags: {
                        feature: PERPS_CONSTANTS.FeatureName,
                        provider: providerId,
                        method: 'subscribeToOrders',
                    },
                    context: {
                        name: 'SubscriptionMultiplexer',
                        data: { subscribedCount: unsubscribers.length },
                    },
                });
                unsubscribers.forEach((unsub) => unsub());
                throw error;
            }
        }
        return () => {
            unsubscribers.forEach((unsub) => unsub());
            providers.forEach(([providerId]) => {
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_orderCache, "f").delete(providerId);
            });
        };
    }
    /**
     * Subscribe to account updates from multiple providers.
     *
     * @param params - Subscription parameters
     * @returns Unsubscribe function
     */
    subscribeToAccount(params) {
        const { providers, callback } = params;
        const unsubscribers = [];
        for (const [providerId, provider] of providers) {
            try {
                const subscribeParams = {
                    callback: (account) => {
                        if (account === null) {
                            __classPrivateFieldGet(this, _SubscriptionMultiplexer_accountCache, "f").delete(providerId);
                        }
                        else {
                            // Tag account with providerId and cache
                            const taggedAccount = {
                                ...account,
                                providerId,
                            };
                            __classPrivateFieldGet(this, _SubscriptionMultiplexer_accountCache, "f").set(providerId, taggedAccount);
                        }
                        // Emit all cached account states
                        const allAccounts = Array.from(__classPrivateFieldGet(this, _SubscriptionMultiplexer_accountCache, "f").values());
                        callback(allAccounts);
                    },
                };
                const unsub = provider.subscribeToAccount(subscribeParams);
                unsubscribers.push(unsub);
            }
            catch (error) {
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_logger, "f")?.error(ensureError(error, 'SubscriptionMultiplexer.subscribeToAccount'), {
                    tags: {
                        feature: PERPS_CONSTANTS.FeatureName,
                        provider: providerId,
                        method: 'subscribeToAccount',
                    },
                    context: {
                        name: 'SubscriptionMultiplexer',
                        data: { subscribedCount: unsubscribers.length },
                    },
                });
                unsubscribers.forEach((unsub) => unsub());
                throw error;
            }
        }
        return () => {
            unsubscribers.forEach((unsub) => unsub());
            providers.forEach(([providerId]) => {
                __classPrivateFieldGet(this, _SubscriptionMultiplexer_accountCache, "f").delete(providerId);
            });
        };
    }
    /**
     * Clear all cached data.
     */
    clearCache() {
        __classPrivateFieldGet(this, _SubscriptionMultiplexer_priceCache, "f").clear();
        __classPrivateFieldGet(this, _SubscriptionMultiplexer_positionCache, "f").clear();
        __classPrivateFieldGet(this, _SubscriptionMultiplexer_orderCache, "f").clear();
        __classPrivateFieldGet(this, _SubscriptionMultiplexer_accountCache, "f").clear();
    }
    /**
     * Get cached price for a symbol from a specific provider.
     *
     * @param symbol - Market symbol
     * @param providerId - Provider ID
     * @returns Cached price update or undefined
     */
    getCachedPrice(symbol, providerId) {
        return __classPrivateFieldGet(this, _SubscriptionMultiplexer_priceCache, "f").get(symbol)?.get(providerId);
    }
    /**
     * Get all cached prices for a symbol.
     *
     * @param symbol - Market symbol
     * @returns Map of provider ID to price update
     */
    getAllCachedPricesForSymbol(symbol) {
        return __classPrivateFieldGet(this, _SubscriptionMultiplexer_priceCache, "f").get(symbol);
    }
}
_SubscriptionMultiplexer_logger = new WeakMap(), _SubscriptionMultiplexer_priceCache = new WeakMap(), _SubscriptionMultiplexer_positionCache = new WeakMap(), _SubscriptionMultiplexer_orderCache = new WeakMap(), _SubscriptionMultiplexer_accountCache = new WeakMap(), _SubscriptionMultiplexer_instances = new WeakSet(), _SubscriptionMultiplexer_aggregatePrices = function _SubscriptionMultiplexer_aggregatePrices(symbols, mode) {
    const result = [];
    symbols.forEach((symbol) => {
        const providerPrices = __classPrivateFieldGet(this, _SubscriptionMultiplexer_priceCache, "f").get(symbol);
        if (!providerPrices || providerPrices.size === 0) {
            return;
        }
        if (mode === 'merge') {
            // Return all prices (one per provider)
            providerPrices.forEach((price) => {
                result.push(price);
            });
        }
        else {
            // 'best_price': Return the best price across providers
            const best = __classPrivateFieldGet(this, _SubscriptionMultiplexer_instances, "m", _SubscriptionMultiplexer_findBestPrice).call(this, providerPrices);
            if (best) {
                result.push(best);
            }
        }
    });
    return result;
}, _SubscriptionMultiplexer_findBestPrice = function _SubscriptionMultiplexer_findBestPrice(providerPrices) {
    let bestPrice;
    let smallestSpread = Infinity;
    providerPrices.forEach((price) => {
        if (price.spread === undefined) {
            // No spread info - just use the first one
            bestPrice ?? (bestPrice = price);
        }
        else {
            // If spread is available, use it to determine best
            const spreadValue = parseFloat(price.spread);
            if (!isNaN(spreadValue) && spreadValue < smallestSpread) {
                smallestSpread = spreadValue;
                bestPrice = price;
            }
        }
    });
    return bestPrice;
}, _SubscriptionMultiplexer_aggregatePositions = function _SubscriptionMultiplexer_aggregatePositions() {
    const allPositions = [];
    __classPrivateFieldGet(this, _SubscriptionMultiplexer_positionCache, "f").forEach((positions) => {
        allPositions.push(...positions);
    });
    return allPositions;
}, _SubscriptionMultiplexer_aggregateOrders = function _SubscriptionMultiplexer_aggregateOrders() {
    const allOrders = [];
    __classPrivateFieldGet(this, _SubscriptionMultiplexer_orderCache, "f").forEach((orders) => {
        allOrders.push(...orders);
    });
    return allOrders;
};
//# sourceMappingURL=SubscriptionMultiplexer.mjs.map