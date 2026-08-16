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
import type { PerpsProviderType, RoutingStrategy } from "../types/index.cjs";
/**
 * Parameters for selecting a provider for an operation
 */
export type RouterSelectParams = {
    /** Asset identifier (e.g., 'BTC', 'ETH', 'xyz:TSLA') */
    symbol?: string;
    /** Explicit provider override - if provided, always used */
    providerId?: PerpsProviderType;
};
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
export declare class ProviderRouter {
    #private;
    constructor(options: {
        /** Default provider for operations without explicit providerId */
        defaultProvider: PerpsProviderType;
        /** Routing strategy (Phase 1: only 'default_provider' supported) */
        strategy?: RoutingStrategy;
    });
    /**
     * Select the provider to use for an operation.
     *
     * Phase 1 logic:
     * - Explicit providerId > defaultProvider
     *
     * @param params - Selection parameters
     * @returns The provider ID to use
     */
    selectProvider(params: RouterSelectParams): PerpsProviderType;
    /**
     * Get all providers that support a specific market.
     *
     * @param symbol - Market symbol (e.g., 'BTC', 'ETH')
     * @returns Array of provider IDs that support this market
     */
    getProvidersForMarket(symbol: string): PerpsProviderType[];
    /**
     * Update the markets supported by a provider.
     * Called during provider initialization or market refresh.
     *
     * @param providerId - Provider to update
     * @param markets - Array of market symbols the provider supports
     */
    updateProviderMarkets(providerId: PerpsProviderType, markets: string[]): void;
    /**
     * Clear markets for a provider (e.g., on disconnect).
     *
     * @param providerId - Provider to clear
     */
    clearProviderMarkets(providerId: PerpsProviderType): void;
    /**
     * Set the default provider for routing.
     *
     * @param providerId - New default provider
     */
    setDefaultProvider(providerId: PerpsProviderType): void;
    /**
     * Get the current default provider.
     *
     * @returns Current default provider ID
     */
    getDefaultProvider(): PerpsProviderType;
    /**
     * Get the current routing strategy.
     *
     * @returns Current routing strategy
     */
    getStrategy(): RoutingStrategy;
    /**
     * Check if a provider supports a specific market.
     *
     * @param providerId - Provider to check
     * @param symbol - Market symbol
     * @returns true if provider supports the market
     */
    providerSupportsMarket(providerId: PerpsProviderType, symbol: string): boolean;
    /**
     * Get all registered provider IDs.
     *
     * @returns Array of all provider IDs with registered markets
     */
    getRegisteredProviders(): PerpsProviderType[];
}
//# sourceMappingURL=ProviderRouter.d.cts.map