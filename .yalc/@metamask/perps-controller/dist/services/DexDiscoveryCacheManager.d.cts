import type { DexDiscoveryState, ExtendedPerpDex } from "../types/perps-types.cjs";
type DexDiscoveryDeps = {
    isTestnetMode: () => boolean;
    debugLogger: {
        log: (...args: unknown[]) => void;
    };
    getAllowlistMarkets: () => string[];
};
/**
 * Manages the unified DEX discovery cache — single source of truth for all perpDexs() derivatives.
 *
 * Extracted from HyperLiquidProvider to isolate cache logic.
 * All writes go through update(); readers use .state.
 */
export declare class DexDiscoveryCacheManager {
    #private;
    /**
     * Unified DEX discovery state.
     * null = not yet fetched; object = raw + validated + timestamp.
     */
    state: DexDiscoveryState | null;
    constructor(deps: DexDiscoveryDeps);
    /**
     * Single atomic writer for DEX discovery state.
     * All code paths that fetch perpDexs() MUST call this — no direct field writes.
     *
     * @param allDexs - Raw perpDexs() API response array.
     * @returns The newly created unified discovery state.
     */
    update(allDexs: (ExtendedPerpDex | null)[]): DexDiscoveryState;
    /**
     * Reset state to null (used on disconnect/reconnect).
     */
    reset(): void;
    /**
     * Pure filtering of perpDexs() response into validated DEX names.
     * Encapsulates testnet/mainnet feature-flag logic.
     *
     * @param allDexs - Raw perpDexs() API response array.
     * @returns Filtered DEX name list (null = main DEX, strings = HIP-3 DEXs).
     */
    computeValidatedDexs(allDexs: (ExtendedPerpDex | null)[]): (string | null)[];
    /**
     * Extract unique DEX names from allowlist market patterns.
     * Patterns can be: "xyz:*" (wildcard), "xyz:TSLA" (exact), or "xyz" (DEX shorthand).
     *
     * @returns Array of unique DEX names from the allowlist.
     */
    extractDexsFromAllowlist(): string[];
}
export {};
//# sourceMappingURL=DexDiscoveryCacheManager.d.cts.map