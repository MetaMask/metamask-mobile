"use strict";
/**
 * ProviderRouter - Simple routing logic for multi-provider order routing
 *
 * Phase 1 implementation: Uses simple routing strategy where:
 * - Explicit providerId always wins
 * - Falls back to default provider otherwise
 *
 * Advanced routing strategies (best_price, user_preference per market, lowest_fee)
 * are deferred to Phase 3.
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
var _ProviderRouter_defaultProvider, _ProviderRouter_strategy, _ProviderRouter_providerMarkets;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRouter = void 0;
/**
 * ProviderRouter handles routing decisions for write operations
 * in multi-provider scenarios.
 *
 * Phase 1 routing logic is simple:
 * 1. If explicit providerId is passed, use it
 * 2. Otherwise, use the default provider
 *
 * @example
 * ```typescript
 * const router = new ProviderRouter({ defaultProvider: 'hyperliquid' });
 *
 * // With explicit provider
 * router.selectProvider({ providerId: 'myx' }); // Returns 'myx'
 *
 * // Without explicit provider
 * router.selectProvider({ symbol: 'BTC' }); // Returns 'hyperliquid' (default)
 * ```
 */
class ProviderRouter {
    constructor(options) {
        /** Default provider to use when no explicit providerId is specified */
        _ProviderRouter_defaultProvider.set(this, void 0);
        /** Current routing strategy (Phase 1: only 'default_provider' supported) */
        _ProviderRouter_strategy.set(this, 'default_provider');
        /** Map of provider ID to the markets it supports */
        _ProviderRouter_providerMarkets.set(this, new Map());
        __classPrivateFieldSet(this, _ProviderRouter_defaultProvider, options.defaultProvider, "f");
        if (options.strategy) {
            __classPrivateFieldSet(this, _ProviderRouter_strategy, options.strategy, "f");
        }
    }
    /**
     * Select the provider to use for an operation.
     *
     * Phase 1 logic:
     * - Explicit providerId > defaultProvider
     *
     * @param params - Selection parameters
     * @returns The provider ID to use
     */
    selectProvider(params) {
        // Phase 1: explicit providerId always wins
        if (params.providerId) {
            return params.providerId;
        }
        // Fall back to default provider
        return __classPrivateFieldGet(this, _ProviderRouter_defaultProvider, "f");
    }
    /**
     * Get all providers that support a specific market.
     *
     * @param symbol - Market symbol (e.g., 'BTC', 'ETH')
     * @returns Array of provider IDs that support this market
     */
    getProvidersForMarket(symbol) {
        const providers = [];
        __classPrivateFieldGet(this, _ProviderRouter_providerMarkets, "f").forEach((markets, providerId) => {
            if (markets.has(symbol)) {
                providers.push(providerId);
            }
        });
        return providers;
    }
    /**
     * Update the markets supported by a provider.
     * Called during provider initialization or market refresh.
     *
     * @param providerId - Provider to update
     * @param markets - Array of market symbols the provider supports
     */
    updateProviderMarkets(providerId, markets) {
        __classPrivateFieldGet(this, _ProviderRouter_providerMarkets, "f").set(providerId, new Set(markets));
    }
    /**
     * Clear markets for a provider (e.g., on disconnect).
     *
     * @param providerId - Provider to clear
     */
    clearProviderMarkets(providerId) {
        __classPrivateFieldGet(this, _ProviderRouter_providerMarkets, "f").delete(providerId);
    }
    /**
     * Set the default provider for routing.
     *
     * @param providerId - New default provider
     */
    setDefaultProvider(providerId) {
        __classPrivateFieldSet(this, _ProviderRouter_defaultProvider, providerId, "f");
    }
    /**
     * Get the current default provider.
     *
     * @returns Current default provider ID
     */
    getDefaultProvider() {
        return __classPrivateFieldGet(this, _ProviderRouter_defaultProvider, "f");
    }
    /**
     * Get the current routing strategy.
     *
     * @returns Current routing strategy
     */
    getStrategy() {
        return __classPrivateFieldGet(this, _ProviderRouter_strategy, "f");
    }
    /**
     * Check if a provider supports a specific market.
     *
     * @param providerId - Provider to check
     * @param symbol - Market symbol
     * @returns true if provider supports the market
     */
    providerSupportsMarket(providerId, symbol) {
        const markets = __classPrivateFieldGet(this, _ProviderRouter_providerMarkets, "f").get(providerId);
        return markets?.has(symbol) ?? false;
    }
    /**
     * Get all registered provider IDs.
     *
     * @returns Array of all provider IDs with registered markets
     */
    getRegisteredProviders() {
        return Array.from(__classPrivateFieldGet(this, _ProviderRouter_providerMarkets, "f").keys());
    }
}
exports.ProviderRouter = ProviderRouter;
_ProviderRouter_defaultProvider = new WeakMap(), _ProviderRouter_strategy = new WeakMap(), _ProviderRouter_providerMarkets = new WeakMap();
//# sourceMappingURL=ProviderRouter.cjs.map