"use strict";
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
var _AggregatedPerpsProvider_instances, _AggregatedPerpsProvider_providers, _AggregatedPerpsProvider_defaultProvider, _AggregatedPerpsProvider_aggregationMode, _AggregatedPerpsProvider_deps, _AggregatedPerpsProvider_router, _AggregatedPerpsProvider_subscriptionMux, _AggregatedPerpsProvider_getActiveProviders, _AggregatedPerpsProvider_getDefaultProvider, _AggregatedPerpsProvider_getProviderOrDefault, _AggregatedPerpsProvider_extractSuccessfulResults;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregatedPerpsProvider = void 0;
const SubscriptionMultiplexer_js_1 = require("../aggregation/SubscriptionMultiplexer.cjs");
const ProviderRouter_js_1 = require("../routing/ProviderRouter.cjs");
const index_js_1 = require("../types/index.cjs");
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
class AggregatedPerpsProvider {
    constructor(config) {
        _AggregatedPerpsProvider_instances.add(this);
        this.protocolId = 'aggregated';
        _AggregatedPerpsProvider_providers.set(this, void 0);
        _AggregatedPerpsProvider_defaultProvider.set(this, void 0);
        _AggregatedPerpsProvider_aggregationMode.set(this, void 0);
        _AggregatedPerpsProvider_deps.set(this, void 0);
        _AggregatedPerpsProvider_router.set(this, void 0);
        _AggregatedPerpsProvider_subscriptionMux.set(this, void 0);
        __classPrivateFieldSet(this, _AggregatedPerpsProvider_providers, config.providers, "f");
        __classPrivateFieldSet(this, _AggregatedPerpsProvider_defaultProvider, config.defaultProvider, "f");
        __classPrivateFieldSet(this, _AggregatedPerpsProvider_aggregationMode, config.aggregationMode ?? 'all', "f");
        __classPrivateFieldSet(this, _AggregatedPerpsProvider_deps, config.infrastructure, "f");
        // Initialize router with default provider
        __classPrivateFieldSet(this, _AggregatedPerpsProvider_router, new ProviderRouter_js_1.ProviderRouter({
            defaultProvider: __classPrivateFieldGet(this, _AggregatedPerpsProvider_defaultProvider, "f"),
        }), "f");
        // Initialize subscription multiplexer with logger for error reporting
        __classPrivateFieldSet(this, _AggregatedPerpsProvider_subscriptionMux, new SubscriptionMultiplexer_js_1.SubscriptionMultiplexer({
            logger: __classPrivateFieldGet(this, _AggregatedPerpsProvider_deps, "f").logger,
        }), "f");
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_deps, "f").debugLogger.log('[AggregatedPerpsProvider] Initialized', {
            providers: Array.from(__classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").keys()),
            defaultProvider: __classPrivateFieldGet(this, _AggregatedPerpsProvider_defaultProvider, "f"),
            aggregationMode: __classPrivateFieldGet(this, _AggregatedPerpsProvider_aggregationMode, "f"),
        });
    }
    // ============================================================================
    // Asset Routes (Synchronous - delegate to default provider)
    // ============================================================================
    getDepositRoutes(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).getDepositRoutes(params);
    }
    getWithdrawalRoutes(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).getWithdrawalRoutes(params);
    }
    // ============================================================================
    // Read Operations (Aggregate from all providers)
    // ============================================================================
    async getPositions(params) {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([id, provider]) => {
            const positions = await provider.getPositions(params);
            return positions.map((pos) => ({ ...pos, providerId: id }));
        }));
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getPositions').flat();
    }
    async getAccountState(params) {
        // Return account state from default provider with providerId injected
        const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this);
        const state = await provider.getAccountState(params);
        return { ...state, providerId: __classPrivateFieldGet(this, _AggregatedPerpsProvider_defaultProvider, "f") };
    }
    async getMarkets(params) {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([id, provider]) => {
            const markets = await provider.getMarkets(params);
            return markets.map((market) => ({ ...market, providerId: id }));
        }));
        const allMarkets = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getMarkets').flat();
        // Deduplicate markets by name (keep first occurrence)
        const seen = new Set();
        return allMarkets.filter((market) => {
            // Use providerId:name as unique key to allow same market from different providers
            const key = `${market.providerId}:${market.name}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    async getMarketDataWithPrices() {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([id, provider]) => {
            const data = await provider.getMarketDataWithPrices();
            return data.map((item) => ({ ...item, providerId: id }));
        }));
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getMarketDataWithPrices').flat();
    }
    async getOrderFills(params, options) {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([id, provider]) => {
            const fills = await provider.getOrderFills(params, options);
            return fills.map((fill) => ({ ...fill, providerId: id }));
        }));
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getOrderFills').flat();
    }
    async getOrFetchFills(params) {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([id, provider]) => {
            const fills = await provider.getOrFetchFills(params);
            return fills.map((fill) => ({ ...fill, providerId: id }));
        }));
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getOrFetchFills').flat();
    }
    async getOrders(params, options) {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([id, provider]) => {
            const orders = await provider.getOrders(params, options);
            return orders.map((order) => ({ ...order, providerId: id }));
        }));
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getOrders').flat();
    }
    async getOpenOrders(params) {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([id, provider]) => {
            const orders = await provider.getOpenOrders(params);
            return orders.map((order) => ({ ...order, providerId: id }));
        }));
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getOpenOrders').flat();
    }
    async getFunding(params, options) {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([_providerId, provider]) => {
            const funding = await provider.getFunding(params, options);
            // Funding type doesn't have providerId - we could add it if needed
            return funding;
        }));
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getFunding').flat();
    }
    async getHistoricalPortfolio(params) {
        // Delegate to default provider
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).getHistoricalPortfolio(params);
    }
    /**
     * Get user non-funding ledger updates from default provider.
     *
     * @param params - Optional parameters
     * @param params.accountId - Account ID to filter by
     * @param params.startTime - Start time filter
     * @param params.endTime - End time filter
     * @returns Raw ledger updates
     */
    async getUserNonFundingLedgerUpdates(params) {
        // Delegate to default provider (protocol-specific)
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).getUserNonFundingLedgerUpdates(params);
    }
    /**
     * Resolve the currently selected CAIP account identifier. Accounts are
     * shared across sub-providers (same InternalAccountController), so the
     * default provider's view is authoritative.
     *
     * @returns Resolved CAIP account id from the default sub-provider.
     */
    async getCurrentAccountId() {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).getCurrentAccountId();
    }
    /**
     * Get user history from all providers.
     *
     * @param params - Optional parameters
     * @param params.accountId - Account ID to filter by
     * @param params.startTime - Start time filter
     * @param params.endTime - End time filter
     * @returns Aggregated user history with providerId
     */
    async getUserHistory(params) {
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([id, provider]) => {
            const history = await provider.getUserHistory(params);
            return history.map((item) => ({ ...item, providerId: id }));
        }));
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_extractSuccessfulResults).call(this, results, 'getUserHistory').flat();
    }
    // ============================================================================
    // Write Operations (Route to specific provider)
    // ============================================================================
    async placeOrder(params) {
        const [providerId, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_deps, "f").debugLogger.log('[AggregatedPerpsProvider] placeOrder routing', {
            requestedProvider: params.providerId,
            actualProvider: providerId,
            symbol: params.symbol,
        });
        const result = await provider.placeOrder(params);
        return { ...result, providerId };
    }
    async editOrder(params) {
        // EditOrderParams contains OrderParams in newOrder which may have providerId
        const [providerId, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.newOrder.providerId);
        const result = await provider.editOrder(params);
        return { ...result, providerId };
    }
    async cancelOrder(params) {
        const [providerId, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        const result = await provider.cancelOrder(params);
        return { ...result, providerId };
    }
    async cancelOrders(params) {
        // Batch cancel delegates to default provider
        const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this);
        if (!provider.cancelOrders) {
            return {
                success: false,
                successCount: 0,
                failureCount: params.length,
                results: params.map((param) => ({
                    orderId: param.orderId,
                    symbol: param.symbol,
                    success: false,
                    error: 'Batch cancel not supported',
                })),
            };
        }
        return provider.cancelOrders(params);
    }
    async closePosition(params) {
        const [providerId, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        const result = await provider.closePosition(params);
        return { ...result, providerId };
    }
    async closePositions(params) {
        // Batch close delegates to default provider
        const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this);
        if (!provider.closePositions) {
            return {
                success: false,
                successCount: 0,
                failureCount: 0,
                results: [],
            };
        }
        return provider.closePositions(params);
    }
    async updatePositionTPSL(params) {
        const [providerId, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        const result = await provider.updatePositionTPSL(params);
        return { ...result, providerId };
    }
    async updateMargin(params) {
        const [, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        return provider.updateMargin(params);
    }
    async withdraw(params) {
        const [, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        return provider.withdraw(params);
    }
    /**
     * Aggregate parked manual TP/SL recoveries from every underlying
     * provider implementing the durable-settlement contract. Storage
     * errors PROPAGATE — a corrupt store degrading to "nothing pending"
     * would hide an under-protected position.
     *
     * @returns Pending manual-recovery entries across providers.
     */
    async getPendingManualRecoveries() {
        const results = await Promise.all(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([, provider]) => provider.getPendingManualRecoveries
            ? provider.getPendingManualRecoveries()
            : []));
        return results.flat();
    }
    /**
     * Aggregate recovered-dispatch outcomes from every underlying provider
     * implementing the durable-settlement contract.
     *
     * @returns Pending recovered-dispatch outcomes across providers.
     */
    async getRecoveredDispatches() {
        const results = await Promise.all(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(async ([, provider]) => provider.getRecoveredDispatches
            ? provider.getRecoveredDispatches()
            : []));
        return results.flat();
    }
    /**
     * Acknowledge ONE recovered-dispatch outcome by its stable id on
     * whichever underlying provider owns it.
     *
     * @param recoveryId - Stable id from {@link getRecoveredDispatches}.
     */
    async acknowledgeRecoveredDispatch(recoveryId) {
        const capable = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).filter(([, provider]) => typeof provider.acknowledgeRecoveredDispatch === 'function');
        if (capable.length === 0) {
            throw new Error('No perps provider has recovered dispatches to acknowledge');
        }
        let lastError = null;
        for (const [, provider] of capable) {
            try {
                await provider.acknowledgeRecoveredDispatch?.(recoveryId);
                return;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
            }
        }
        throw lastError;
    }
    // ============================================================================
    // Validation (Route to specific provider)
    // ============================================================================
    async validateDeposit(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).validateDeposit(params);
    }
    async validateOrder(params) {
        const [, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        return provider.validateOrder(params);
    }
    async validateClosePosition(params) {
        const [, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        return provider.validateClosePosition(params);
    }
    async validateWithdrawal(params) {
        const [, provider] = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getProviderOrDefault).call(this, params.providerId);
        return provider.validateWithdrawal(params);
    }
    // ============================================================================
    // Protocol Calculations (Delegate to default or route)
    // ============================================================================
    async calculateLiquidationPrice(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).calculateLiquidationPrice(params);
    }
    async calculateMaintenanceMargin(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).calculateMaintenanceMargin(params);
    }
    async getMaxLeverage(asset) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).getMaxLeverage(asset);
    }
    async calculateFees(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).calculateFees(params);
    }
    // ============================================================================
    // Subscriptions (Multiplex via SubscriptionMultiplexer)
    // ============================================================================
    subscribeToPrices(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_subscriptionMux, "f").subscribeToPrices({
            ...params,
            providers: __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this),
            aggregationMode: 'merge',
        });
    }
    subscribeToPositions(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_subscriptionMux, "f").subscribeToPositions({
            ...params,
            providers: __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this),
        });
    }
    subscribeToOrderFills(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_subscriptionMux, "f").subscribeToOrderFills({
            ...params,
            providers: __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this),
        });
    }
    subscribeToOrders(params) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_subscriptionMux, "f").subscribeToOrders({
            ...params,
            providers: __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this),
        });
    }
    subscribeToAccount(params) {
        // For account subscriptions, we emit as array for multi-provider
        // but the callback expects single AccountState
        // Delegate to default provider for now
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).subscribeToAccount(params);
    }
    subscribeToOICaps(params) {
        // Delegate to default provider
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).subscribeToOICaps(params);
    }
    subscribeToCandles(params) {
        // Delegate to default provider
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).subscribeToCandles(params);
    }
    subscribeToOrderBook(params) {
        // Delegate to default provider
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).subscribeToOrderBook(params);
    }
    // ============================================================================
    // Configuration
    // ============================================================================
    setLiveDataConfig(config) {
        // Apply config to all providers
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").forEach((provider) => {
            provider.setLiveDataConfig(config);
        });
    }
    setUserFeeDiscount(discountBips) {
        // Apply to all providers that support it
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").forEach((provider) => {
            if (provider.setUserFeeDiscount) {
                provider.setUserFeeDiscount(discountBips);
            }
        });
    }
    setUserFeeResolution(resolution) {
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").forEach((provider) => {
            if (provider.setUserFeeResolution) {
                provider.setUserFeeResolution(resolution);
            }
            else if (provider.setUserFeeDiscount) {
                provider.setUserFeeDiscount(resolution?.discountBips);
            }
        });
    }
    async approveSubscriptionBuilderFee() {
        const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").get('hyperliquid') ?? __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this);
        return provider.approveSubscriptionBuilderFee
            ? provider.approveSubscriptionBuilderFee()
            : false;
    }
    // ============================================================================
    // Lifecycle (Delegate to default provider)
    // ============================================================================
    async toggleTestnet() {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).toggleTestnet();
    }
    async initialize() {
        // Initialize default provider
        const result = await __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).initialize();
        // Optionally initialize other providers in background
        // For Phase 1, we only initialize default provider
        return result;
    }
    async isReadyToTrade() {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).isReadyToTrade();
    }
    async disconnect() {
        // Disconnect all providers
        const results = await Promise.allSettled(__classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getActiveProviders).call(this).map(([, provider]) => provider.disconnect()));
        // Clear subscription cache
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_subscriptionMux, "f").clearCache();
        // Return success if at least one succeeded
        const successCount = results.filter((res) => res.status === 'fulfilled' && res.value.success).length;
        return {
            success: successCount > 0,
        };
    }
    async ping(timeoutMs) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).ping(timeoutMs);
    }
    getWebSocketConnectionState() {
        const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this);
        if (provider.getWebSocketConnectionState) {
            return provider.getWebSocketConnectionState();
        }
        return index_js_1.WebSocketConnectionState.Disconnected;
    }
    subscribeToConnectionState(listener) {
        const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this);
        if (provider.subscribeToConnectionState) {
            return provider.subscribeToConnectionState(listener);
        }
        listener(index_js_1.WebSocketConnectionState.Disconnected, 0);
        return () => {
            /* noop */
        };
    }
    async reconnect() {
        const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this);
        if (provider.reconnect) {
            await provider.reconnect();
        }
    }
    // ============================================================================
    // Block Explorer
    // ============================================================================
    getBlockExplorerUrl(address) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this).getBlockExplorerUrl(address);
    }
    // ============================================================================
    // HIP-3 (Optional)
    // ============================================================================
    async getAvailableDexs(params) {
        const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this);
        if (!provider.getAvailableDexs) {
            return [];
        }
        return provider.getAvailableDexs(params);
    }
    // ============================================================================
    // Provider Management
    // ============================================================================
    /**
     * Add a new provider to the aggregated provider.
     *
     * @param providerId - Unique identifier for the provider
     * @param provider - Provider instance
     */
    addProvider(providerId, provider) {
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").set(providerId, provider);
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_deps, "f").debugLogger.log('[AggregatedPerpsProvider] Provider added', {
            providerId,
        });
    }
    /**
     * Remove a provider from the aggregated provider.
     *
     * @param providerId - Provider to remove
     * @returns true if removed, false if not found
     */
    removeProvider(providerId) {
        const removed = __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").delete(providerId);
        if (removed) {
            __classPrivateFieldGet(this, _AggregatedPerpsProvider_deps, "f").debugLogger.log('[AggregatedPerpsProvider] Provider removed', {
                providerId,
            });
        }
        return removed;
    }
    /**
     * Get list of all registered provider IDs.
     *
     * @returns The result of the operation.
     */
    getProviderIds() {
        return Array.from(__classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").keys());
    }
    /**
     * Check if a provider is registered.
     *
     * @param providerId - The provider id value.
     * @returns True if the condition is met.
     */
    hasProvider(providerId) {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").has(providerId);
    }
    /**
     * Get the router instance for external configuration.
     *
     * @returns The result of the operation.
     */
    getRouter() {
        return __classPrivateFieldGet(this, _AggregatedPerpsProvider_router, "f");
    }
}
exports.AggregatedPerpsProvider = AggregatedPerpsProvider;
_AggregatedPerpsProvider_providers = new WeakMap(), _AggregatedPerpsProvider_defaultProvider = new WeakMap(), _AggregatedPerpsProvider_aggregationMode = new WeakMap(), _AggregatedPerpsProvider_deps = new WeakMap(), _AggregatedPerpsProvider_router = new WeakMap(), _AggregatedPerpsProvider_subscriptionMux = new WeakMap(), _AggregatedPerpsProvider_instances = new WeakSet(), _AggregatedPerpsProvider_getActiveProviders = function _AggregatedPerpsProvider_getActiveProviders() {
    return Array.from(__classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").entries());
}, _AggregatedPerpsProvider_getDefaultProvider = function _AggregatedPerpsProvider_getDefaultProvider() {
    const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").get(__classPrivateFieldGet(this, _AggregatedPerpsProvider_defaultProvider, "f"));
    if (!provider) {
        throw new Error(`[AggregatedPerpsProvider] Default provider '${__classPrivateFieldGet(this, _AggregatedPerpsProvider_defaultProvider, "f")}' not available`);
    }
    return provider;
}, _AggregatedPerpsProvider_getProviderOrDefault = function _AggregatedPerpsProvider_getProviderOrDefault(providerId) {
    const id = providerId ?? __classPrivateFieldGet(this, _AggregatedPerpsProvider_defaultProvider, "f");
    const provider = __classPrivateFieldGet(this, _AggregatedPerpsProvider_providers, "f").get(id);
    if (!provider) {
        __classPrivateFieldGet(this, _AggregatedPerpsProvider_deps, "f").debugLogger.log(`[AggregatedPerpsProvider] Provider '${id}' not found, using default`);
        return [__classPrivateFieldGet(this, _AggregatedPerpsProvider_defaultProvider, "f"), __classPrivateFieldGet(this, _AggregatedPerpsProvider_instances, "m", _AggregatedPerpsProvider_getDefaultProvider).call(this)];
    }
    return [id, provider];
}, _AggregatedPerpsProvider_extractSuccessfulResults = function _AggregatedPerpsProvider_extractSuccessfulResults(results, context) {
    const successful = [];
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            successful.push(result.value);
        }
        else {
            __classPrivateFieldGet(this, _AggregatedPerpsProvider_deps, "f").debugLogger.log(`[AggregatedPerpsProvider] ${context} failed for provider ${index}`, { error: result.reason });
        }
    });
    return successful;
};
//# sourceMappingURL=AggregatedPerpsProvider.cjs.map