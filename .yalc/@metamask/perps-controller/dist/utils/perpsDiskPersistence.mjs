import { buildProviderCacheKey, PERPS_CONSTANTS, PERPS_DISK_CACHE_MARKETS, PERPS_DISK_CACHE_USER_DATA, PROVIDER_CONFIG } from "../constants/perpsConfig.mjs";
/**
 * Multiplier applied to staleGuardMs (preloadGuardMs, currently 30s) to compute
 * the staleness cap for disk-hydrated timestamps. A factor of 10 ensures hydrated
 * data is always TTL-expired so the stream manager overwrites it with live data,
 * while still being recent enough for a useful first paint.
 */
const DISK_HYDRATION_STALENESS_FACTOR = 10;
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
export function buildMarketDataPayload(markets, activeProvider, isTestnet, now) {
    if (activeProvider === 'aggregated') {
        const entriesByKey = new Map();
        for (const market of markets) {
            const providerId = market.providerId ?? PROVIDER_CONFIG.DefaultProvider;
            const key = buildProviderCacheKey(providerId, isTestnet);
            const existing = entriesByKey.get(key);
            if (existing) {
                existing.data.push(market);
            }
            else {
                entriesByKey.set(key, {
                    providerNetworkKey: key,
                    data: [market],
                    timestamp: now,
                });
            }
        }
        const entries = Array.from(entriesByKey.values());
        return entries.length === 1 ? entries[0] : { entries };
    }
    return {
        providerNetworkKey: buildProviderCacheKey(activeProvider ?? PROVIDER_CONFIG.DefaultProvider, isTestnet),
        data: markets,
        timestamp: now,
    };
}
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
export function buildUserDataPayload(positions, orders, accountState, address, activeProvider, isTestnet, now) {
    if (activeProvider === 'aggregated') {
        const entriesByKey = new Map();
        const ensureEntry = (providerId) => {
            const key = buildProviderCacheKey(providerId, isTestnet);
            let entry = entriesByKey.get(key);
            if (!entry) {
                entry = {
                    providerNetworkKey: key,
                    address,
                    positions: [],
                    orders: [],
                    accountState: null,
                    timestamp: now,
                };
                entriesByKey.set(key, entry);
            }
            return entry;
        };
        for (const position of positions) {
            ensureEntry(position.providerId ?? PROVIDER_CONFIG.DefaultProvider).positions.push(position);
        }
        for (const order of orders) {
            ensureEntry(order.providerId ?? PROVIDER_CONFIG.DefaultProvider).orders.push(order);
        }
        if (accountState) {
            ensureEntry(accountState.providerId ?? PROVIDER_CONFIG.DefaultProvider).accountState = accountState;
        }
        const entries = Array.from(entriesByKey.values()).filter((entry) => entry.positions.length > 0 ||
            entry.orders.length > 0 ||
            entry.accountState !== null);
        return entries.length === 1 ? entries[0] : { entries };
    }
    return {
        providerNetworkKey: buildProviderCacheKey(activeProvider ?? PROVIDER_CONFIG.DefaultProvider, isTestnet),
        address,
        positions,
        orders,
        accountState,
        timestamp: now,
    };
}
/**
 * Write market entries to disk (best-effort, non-blocking).
 *
 * @param diskCache - Disk cache instance from controller infrastructure.
 * @param entries - Pre-assembled market cache entries to persist.
 */
export function persistMarketEntriesToDisk(diskCache, entries) {
    if (entries.length === 0) {
        return;
    }
    const payload = entries.length === 1 ? entries[0] : { entries };
    diskCache
        .setItem(PERPS_DISK_CACHE_MARKETS, JSON.stringify(payload))
        .catch(() => {
        // Disk persistence is best-effort and must never block preload.
    });
}
/**
 * Write user data entries to disk (best-effort, non-blocking).
 *
 * @param diskCache - Disk cache instance from controller infrastructure.
 * @param entries - Pre-assembled user cache entries to persist.
 */
export async function persistUserEntriesToDisk(diskCache, entries) {
    if (entries.length === 0) {
        return;
    }
    const payload = entries.length === 1 ? entries[0] : { entries };
    await diskCache.setItem(PERPS_DISK_CACHE_USER_DATA, JSON.stringify(payload));
}
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
export function hydrateFromDiskSync(diskCache, currentMarketCache, currentUserCache, staleGuardMs) {
    const hydrateT0 = Date.now();
    const marketUpdates = {};
    const userUpdates = {};
    let marketCount = 0;
    let userPositions = 0;
    let userOrders = 0;
    if (!diskCache.getItemSync) {
        return {
            marketUpdates,
            userUpdates,
            stats: { marketCount, userPositions, userOrders, durationMs: 0 },
        };
    }
    const staleHydratedTimestamp = Date.now() - staleGuardMs * DISK_HYDRATION_STALENESS_FACTOR - 1;
    try {
        const marketsRaw = diskCache.getItemSync(PERPS_DISK_CACHE_MARKETS);
        const userRaw = diskCache.getItemSync(PERPS_DISK_CACHE_USER_DATA);
        if (marketsRaw) {
            try {
                const parsed = JSON.parse(marketsRaw);
                const entries = Array.isArray(parsed.entries)
                    ? parsed.entries
                    : [parsed];
                for (const entry of entries) {
                    if (entry.providerNetworkKey && Array.isArray(entry.data)) {
                        const existing = currentMarketCache[entry.providerNetworkKey];
                        if (!existing || existing.timestamp < entry.timestamp) {
                            const strippedData = entry.data.map((market) => {
                                const structuralMarket = { ...market };
                                if (structuralMarket.dataSource ===
                                    'terminal-global-snapshot-mark') {
                                    delete structuralMarket.trend;
                                }
                                delete structuralMarket.dataSource;
                                delete structuralMarket.sourceExpiresAt;
                                return {
                                    ...structuralMarket,
                                    price: PERPS_CONSTANTS.FallbackPriceDisplay,
                                    change24h: PERPS_CONSTANTS.FallbackDataDisplay,
                                    change24hPercent: PERPS_CONSTANTS.FallbackPercentageDisplay,
                                };
                            });
                            marketUpdates[entry.providerNetworkKey] = {
                                data: strippedData,
                                // Disk-hydrated market snapshots are only for structural
                                // first paint. Keep them TTL-stale so the stream manager
                                // still fetches fresh prices on connect.
                                timestamp: Math.min(entry.timestamp, staleHydratedTimestamp),
                            };
                            marketCount += strippedData.length;
                        }
                    }
                }
            }
            catch {
                // Corrupt JSON — silently ignore
            }
        }
        if (userRaw) {
            try {
                const parsed = JSON.parse(userRaw);
                const entries = Array.isArray(parsed.entries)
                    ? parsed.entries
                    : [parsed];
                for (const entry of entries) {
                    if (entry.providerNetworkKey && entry.address) {
                        // Skip address check here — accounts may not be loaded yet at
                        // constructor time. getCachedUserDataForActiveProvider validates
                        // the address at read time, so stale-account data is never served.
                        const existing = currentUserCache[entry.providerNetworkKey];
                        if (!existing || existing.timestamp < entry.timestamp) {
                            userUpdates[entry.providerNetworkKey] = {
                                positions: entry.positions,
                                orders: entry.orders,
                                accountState: entry.accountState,
                                timestamp: Math.min(entry.timestamp, staleHydratedTimestamp),
                                address: entry.address,
                                hip3ConfigVersion: entry.hip3ConfigVersion,
                                dexes: entry.dexes,
                            };
                            userPositions += entry.positions.length;
                            userOrders += entry.orders.length;
                        }
                    }
                }
            }
            catch {
                // Corrupt JSON — silently ignore
            }
        }
    }
    catch {
        // Disk read failure — non-critical
    }
    return {
        marketUpdates,
        userUpdates,
        stats: {
            marketCount,
            userPositions,
            userOrders,
            durationMs: Date.now() - hydrateT0,
        },
    };
}
//# sourceMappingURL=perpsDiskPersistence.mjs.map