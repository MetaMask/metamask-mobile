import type { AccountState, Order, PerpsMarketData, Position } from "../types/index.cjs";
/** Minimal disk cache interface required by persistence utilities. */
export type PerpsDiskCache = {
    getItem(key: string): Promise<string | null>;
    getItemSync?(key: string): string | null;
    setItem(key: string, value: string): Promise<void>;
};
/** Shape of a single market entry persisted to disk cache. */
export type DiskCacheMarketEntry = {
    providerNetworkKey: string;
    data: PerpsMarketData[];
    timestamp: number;
};
/** Shape of a single user-data entry persisted to disk cache. */
export type DiskCacheUserEntry = {
    providerNetworkKey: string;
    address: string;
    positions: Position[];
    orders: Order[];
    accountState: AccountState | null;
    timestamp: number;
    hip3ConfigVersion?: number;
    dexes?: string[];
};
/** Disk payload shape — either a single entry or a multi-provider wrapper. */
export type DiskCacheMarketPayload = DiskCacheMarketEntry | {
    entries: DiskCacheMarketEntry[];
};
export type DiskCacheUserPayload = DiskCacheUserEntry | {
    entries: DiskCacheUserEntry[];
};
/**
 * Build the disk-cache payload for market data.
 * In aggregated mode, groups markets by provider into separate entries.
 *
 * @param markets - Current market data snapshot.
 * @param activeProvider - The active provider id (may be "aggregated").
 * @param isTestnet - Global testnet flag.
 * @param now - Timestamp to stamp entries with.
 * @returns Payload ready for JSON serialization.
 */
export declare function buildMarketDataPayload(markets: PerpsMarketData[], activeProvider: string, isTestnet: boolean, now: number): DiskCacheMarketPayload;
/**
 * Build the disk-cache payload for user data (positions, orders, account).
 * In aggregated mode, groups entries by provider.
 *
 * @param positions - Current positions snapshot.
 * @param orders - Current orders snapshot.
 * @param accountState - Current account state snapshot.
 * @param address - EVM account address.
 * @param activeProvider - The active provider id (may be "aggregated").
 * @param isTestnet - Global testnet flag.
 * @param now - Timestamp to stamp entries with.
 * @returns Payload ready for JSON serialization.
 */
export declare function buildUserDataPayload(positions: Position[], orders: Order[], accountState: AccountState | null, address: string, activeProvider: string, isTestnet: boolean, now: number): DiskCacheUserPayload;
/**
 * Write market entries to disk (best-effort, non-blocking).
 *
 * @param diskCache - Disk cache instance from controller infrastructure.
 * @param entries - Pre-assembled market cache entries to persist.
 */
export declare function persistMarketEntriesToDisk(diskCache: PerpsDiskCache, entries: DiskCacheMarketEntry[]): void;
/**
 * Write user data entries to disk (best-effort, non-blocking).
 *
 * @param diskCache - Disk cache instance from controller infrastructure.
 * @param entries - Pre-assembled user cache entries to persist.
 */
export declare function persistUserEntriesToDisk(diskCache: PerpsDiskCache, entries: DiskCacheUserEntry[]): Promise<void>;
/** Computed updates returned by hydrateFromDiskSync. */
export type HydrateFromDiskResult = {
    marketUpdates: Record<string, {
        data: PerpsMarketData[];
        timestamp: number;
    }>;
    userUpdates: Record<string, {
        positions: Position[];
        orders: Order[];
        accountState: AccountState | null;
        timestamp: number;
        address: string;
        hip3ConfigVersion?: number;
        dexes?: string[];
    }>;
    stats: {
        marketCount: number;
        userPositions: number;
        userOrders: number;
        durationMs: number;
    };
};
/**
 * Read disk-persisted cache snapshots and compute the state updates to apply.
 * Returns plain objects rather than mutating state directly, so the caller
 * can apply all changes in a single batched this.update() call.
 *
 * All returned timestamps are capped at DISK_HYDRATION_STALENESS_FACTOR * staleGuardMs
 * in the past so the stream manager always overwrites disk data with fresh live data.
 *
 * @param diskCache - Disk cache instance from controller infrastructure.
 * @param currentMarketCache - Current cachedMarketDataByProvider state.
 * @param currentUserCache - Current cachedUserDataByProvider state.
 * @param staleGuardMs - preloadGuardMs constant from the controller.
 * @returns Updates to apply plus stats for debug logging.
 */
export declare function hydrateFromDiskSync(diskCache: PerpsDiskCache, currentMarketCache: Record<string, {
    timestamp: number;
}>, currentUserCache: Record<string, {
    timestamp: number;
}>, staleGuardMs: number): HydrateFromDiskResult;
//# sourceMappingURL=perpsDiskPersistence.d.cts.map