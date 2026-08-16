import type { AssetCtxsWsEvent } from "@nktkas/hyperliquid";
import type { HyperLiquidAbstractionMode } from "../types/hyperliquid-types.cjs";
import type { Position, OrderFill, Order, SubscribePricesParams, SubscribePositionsParams, SubscribeOrderFillsParams, SubscribeOrdersParams, SubscribeAccountParams, SubscribeOICapsParams, SubscribeOrderBookParams, PerpsPlatformDependencies } from "../types/index.cjs";
import type { HyperLiquidClientService } from "./HyperLiquidClientService.cjs";
import type { HyperLiquidWalletService } from "./HyperLiquidWalletService.cjs";
/**
 * Service for managing HyperLiquid WebSocket subscriptions
 * Implements singleton subscription architecture with reference counting
 */
export declare class HyperLiquidSubscriptionService {
    #private;
    constructor(clientService: HyperLiquidClientService, walletService: HyperLiquidWalletService, platformDependencies: PerpsPlatformDependencies, hip3Enabled?: boolean, enabledDexs?: string[], allowlistMarkets?: string[], blocklistMarkets?: string[], priceDeviationLimit?: number, discoverEnabledDexs?: () => Promise<string[]>);
    /**
     * Populate DEX meta cache with pre-fetched meta data
     * Called by Provider after buildAssetMapping to share cached meta,
     * avoiding redundant metaAndAssetCtxs/meta API calls during subscription setup
     *
     * @param dex - DEX key ('' for main DEX, 'xyz'/'flx'/etc for HIP-3)
     * @param meta - Meta response containing universe data
     * @param meta.universe - The array of asset universe entries from the meta response.
     */
    setDexMetaCache(dex: string, meta: {
        universe: {
            name: string;
            szDecimals: number;
            maxLeverage: number;
        }[];
    }): void;
    /**
     * Cache asset contexts for a specific DEX from API response
     * This allows buildAssetMapping() to populate cache for getMarketDataWithPrices() to use
     *
     * @param dex - DEX name ('' for main perps)
     * @param assetCtxs - Asset contexts from metaAndAssetCtxs response
     */
    setDexAssetCtxsCache(dex: string, assetCtxs: AssetCtxsWsEvent['ctxs']): void;
    /**
     * Get cached assetCtxs for a DEX
     * Returns the cached asset contexts from WebSocket subscription if available
     *
     * @param dex - DEX key ('' for main DEX, 'xyz'/'flx'/etc for HIP-3)
     * @returns Array of asset contexts or undefined if not cached
     */
    getDexAssetCtxsCache(dex: string): AssetCtxsWsEvent['ctxs'] | undefined;
    /**
     * Update feature flags for HIP-3 support
     * Called when provider configuration changes at runtime
     * Note: Market filtering is NOT applied in subscription service - only in Provider
     *
     * @param hip3Enabled - Whether HIP-3 multi-DEX support is enabled.
     * @param enabledDexs - The array of enabled DEX identifiers.
     * @param allowlistMarkets - The array of allowed market patterns.
     * @param blocklistMarkets - The array of blocked market patterns.
     */
    updateFeatureFlags(hip3Enabled: boolean, enabledDexs: string[], allowlistMarkets: string[], blocklistMarkets: string[]): Promise<void>;
    /**
     * Return the cached HL abstraction mode for the given user address.
     *
     * @param userAddress - The EVM address to look up.
     * @returns Cached abstraction mode, or null when unresolved.
     */
    getCachedAbstractionMode(userAddress: string): HyperLiquidAbstractionMode | null;
    /**
     * Record a user's resolved abstraction mode and immediately re-aggregate.
     * Call after the provider has confirmed the on-chain mode (already-enabled
     * or just-migrated) so the WS-driven aggregator picks up the correct fold
     * decision on the next tick.
     *
     * @param userAddress - The EVM address whose mode is being recorded.
     * @param mode - The current abstraction mode for this user.
     */
    setUserAbstractionMode(userAddress: string, mode: HyperLiquidAbstractionMode): void;
    /**
     * Subscribe to live price updates with singleton subscription architecture
     * Uses allMids for fast price updates and predictedFundings for accurate funding rates
     *
     * @param params - The subscription parameters including symbols and callbacks.
     * @returns A cleanup function to unsubscribe from price updates.
     */
    subscribeToPrices(params: SubscribePricesParams): Promise<() => void>;
    /**
     * Subscribe to live position updates with TP/SL data
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from position updates.
     */
    subscribeToPositions(params: SubscribePositionsParams): () => void;
    /**
     * Subscribe to open interest cap updates
     * OI caps are extracted from the shared webData3 subscription (zero additional overhead)
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from OI cap updates.
     */
    subscribeToOICaps(params: SubscribeOICapsParams): () => void;
    /**
     * Check if OI caps cache has been initialized
     * Useful for preventing UI flashing before first data arrives
     *
     * @returns True if the condition is met.
     */
    isOICapsCacheInitialized(): boolean;
    /**
     * Subscribe to live order fill updates
     * Shares subscriptions per accountId to avoid duplicate WebSocket connections
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from order fill updates.
     */
    subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void;
    /**
     * Subscribe to live order updates
     * Uses the shared per-DEX subscriptions to avoid duplicate connections
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from order updates.
     */
    subscribeToOrders(params: SubscribeOrdersParams): () => void;
    /**
     * Subscribe to live account updates
     * Uses the shared per-DEX subscriptions to avoid duplicate connections
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from account updates.
     */
    subscribeToAccount(params: SubscribeAccountParams): () => void;
    /**
     * Check if orders cache has been initialized from WebSocket
     *
     * @returns true if WebSocket has sent at least one update, false otherwise
     */
    isOrdersCacheInitialized(): boolean;
    /**
     * Check if positions cache has been initialized from WebSocket
     *
     * @returns true if WebSocket has sent at least one update, false otherwise
     */
    isPositionsCacheInitialized(): boolean;
    /**
     * Get the cached positions for one DEX, or null when that DEX has published
     * none this session.
     *
     * A DEX only enters this map once its `clearinghouseState` subscription has
     * published, so `null` means the absence of a symbol proves nothing about
     * whether a position exists there.
     *
     * Prefer this over `getCachedPositions()` when a decision depends on whether a
     * specific symbol is absent. The aggregate is only rebuilt once *every*
     * expected DEX has published (`#aggregateAndNotifySubscribers`), so after a
     * reconnect — which resets `#initializedDexs` without clearing these caches —
     * the aggregate can sit frozen at its pre-reconnect contents while this map
     * keeps receiving per-DEX updates. Deciding "covered" from this map and then
     * reading the symbol from the aggregate would mix a fresh answer with stale
     * data.
     *
     * @param dexName - DEX identifier, or '' for the main DEX.
     * @returns That DEX's cached positions, or null if it has not published.
     */
    getCachedPositionsForDex(dexName: string): Position[] | null;
    /**
     * Get cached positions from WebSocket subscription
     *
     * @returns Cached positions array, or null if not initialized
     */
    getCachedPositions(): Position[] | null;
    /**
     * Get cached orders from WebSocket subscription
     *
     * @returns Cached orders array, or null if not initialized
     */
    getCachedOrders(): Order[] | null;
    /**
     * Atomically get cached orders if initialized
     * Prevents race condition between checking initialization and getting data
     *
     * @returns Cached orders array if initialized, null otherwise
     */
    getOrdersCacheIfInitialized(): Order[] | null;
    /**
     * Get cached price for a symbol from WebSocket allMids subscription
     * OPTIMIZATION: Use this instead of REST infoClient.allMids() to avoid rate limiting
     *
     * @param symbol - Asset symbol (e.g., 'BTC', 'ETH', 'xyz:TSLA')
     * @returns Price string, or undefined if not cached
     */
    getCachedPrice(symbol: string): string | undefined;
    getLastAllMidsSnapshot(dex?: string): Record<string, string> | null;
    /**
     * Get cached fills from WebSocket userFills subscription
     * OPTIMIZATION: Use this instead of REST userFills() to avoid rate limiting
     *
     * @returns Copy of cached fills array, or null if not cached
     */
    getCachedFills(): OrderFill[] | null;
    /**
     * Get cached fills only if the cache has been initialized from WebSocket
     * OPTIMIZATION: Distinguishes between "not initialized" (null) and "initialized but empty" ([])
     * - Returns null if cache hasn't received WebSocket snapshot yet (caller should use REST)
     * - Returns empty array [] if cache is initialized but user has no fills (caller can skip REST)
     * - Returns fills array if cache has data
     *
     * @returns Fills array or empty array if initialized, null if not yet initialized
     */
    getFillsCacheIfInitialized(): OrderFill[] | null;
    /**
     * Subscribe to full order book updates with multiple depth levels
     * Creates a dedicated L2Book subscription for the requested symbol
     * and processes data into OrderBookData format for UI consumption
     *
     * @param params - Subscription parameters
     * @returns Cleanup function to unsubscribe
     */
    subscribeToOrderBook(params: SubscribeOrderBookParams): () => void;
    /**
     * Restore all active subscriptions after WebSocket reconnection
     * Re-establishes WebSocket subscriptions for all active subscribers
     *
     * IMPORTANT: This method verifies transport readiness before attempting
     * any subscriptions to prevent "subscribe error: undefined" errors.
     */
    restoreSubscriptions(): Promise<void>;
    /**
     * Clear all subscriptions and cached data (multi-DEX support)
     */
    clearAll(): void;
}
//# sourceMappingURL=HyperLiquidSubscriptionService.d.cts.map