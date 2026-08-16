import type { MarketInfo, PerpsGlobalSnapshotRequest, PerpsGlobalSnapshotResult, PerpsPlatformDependencies, TerminalAssetMetadata } from "../types/index.cjs";
/**
 * TerminalMarketService
 *
 * Fetches structured market metadata from the MetaMask Terminal API.
 * Caches responses for {@link TERMINAL_API_CONFIG.CacheTtlMs} to avoid
 * redundant network calls across polling cycles.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export declare class TerminalMarketService {
    #private;
    constructor(deps: PerpsPlatformDependencies);
    /**
     * Fetch markets from the Terminal API.
     * Returns cached data when available and within TTL.
     *
     * @returns Object with mapped MarketInfo array and per-symbol metadata.
     */
    fetchMarkets(): Promise<{
        markets: MarketInfo[];
        metadata: Map<string, TerminalAssetMetadata>;
    }>;
    /**
     * Fetch, authenticate by exact identity, and map a schema-v2 atomic market
     * snapshot. Accepted entries remain inside the source freshness window;
     * rejected responses are never cached.
     *
     * @param request - Exact provider/network/DEX identity expected by the client.
     * @returns UI-ready market data and its source-bounded expiry.
     */
    fetchGlobalSnapshot(request: PerpsGlobalSnapshotRequest): Promise<PerpsGlobalSnapshotResult>;
    /**
     * Invalidate the internal cache so the next fetch hits the network.
     */
    clearCache(): void;
    /**
     * Log a Terminal API error to Sentry without surfacing it to the user.
     *
     * @param error - The caught error.
     * @param method - The calling method name for context.
     */
    logError(error: unknown, method: string): void;
}
//# sourceMappingURL=TerminalMarketService.d.cts.map