/**
 * Global singleton cache for Perps signing operations
 *
 * This cache persists across provider reconnections to prevent repeated
 * signing requests for hardware wallets. Critical for preventing repeated
 * hardware wallet signing prompts.
 *
 * Cache is intentionally kept separate from provider instances because providers
 * are recreated on account/network changes, which would reset instance-level caches.
 *
 * Tracks three signing operations:
 * 1. Unified Account enablement (one-time, replaces deprecated DEX abstraction)
 * 2. Builder Fee approval (required for trading)
 * 3. Referral code setup (one-time per account)
 *
 * Cache Structure:
 * - Key: `network:userAddress` (e.g., "mainnet:0x123...")
 * - Value: { unifiedAccount, builderFee, referral, timestamp }
 *
 * Lifecycle:
 * - Cache persists throughout app session
 * - Individual entries can be cleared per user/network
 * - Full cache can be cleared on app restart or explicit user action
 */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _PerpsSigningCacheManager_instances, _a, _PerpsSigningCacheManager_instance, _PerpsSigningCacheManager_cache, _PerpsSigningCacheManager_inFlightOperations, _PerpsSigningCacheManager_getCacheKey, _PerpsSigningCacheManager_getOrCreateEntry;
class PerpsSigningCacheManager {
    // Singleton: use getInstance() instead of new
    constructor() {
        _PerpsSigningCacheManager_instances.add(this);
        _PerpsSigningCacheManager_cache.set(this, new Map());
        // Global in-flight locks to prevent concurrent signing attempts across providers
        // Key: operationType:network:userAddress, Value: Promise that resolves when operation completes
        _PerpsSigningCacheManager_inFlightOperations.set(this, new Map());
        // Protected constructor for singleton
    }
    static getInstance() {
        var _b;
        __classPrivateFieldSet(_b = _a, _a, __classPrivateFieldGet(_b, _a, "f", _PerpsSigningCacheManager_instance) ?? new _a(), "f", _PerpsSigningCacheManager_instance);
        return __classPrivateFieldGet(_a, _a, "f", _PerpsSigningCacheManager_instance);
    }
    // ===== In-Flight Lock Methods =====
    /**
     * Check if an operation is currently in-flight for this user/network
     *
     * @param operationType - The type of operation being performed.
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    isInFlight(operationType, network, userAddress) {
        const key = `${operationType}:${network}:${userAddress.toLowerCase()}`;
        return __classPrivateFieldGet(this, _PerpsSigningCacheManager_inFlightOperations, "f").get(key);
    }
    /**
     * Set an operation as in-flight
     * Returns a function to call when operation completes
     *
     * @param operationType - The type of operation being performed.
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    setInFlight(operationType, network, userAddress) {
        const key = `${operationType}:${network}:${userAddress.toLowerCase()}`;
        let resolvePromise;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        __classPrivateFieldGet(this, _PerpsSigningCacheManager_inFlightOperations, "f").set(key, promise);
        return () => {
            __classPrivateFieldGet(this, _PerpsSigningCacheManager_inFlightOperations, "f").delete(key);
            resolvePromise();
        };
    }
    // ===== Unified Account Methods =====
    /**
     * Get unified account cache entry (legacy compatibility)
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    get(network, userAddress) {
        const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").get(key);
        if (!entry) {
            return undefined;
        }
        return {
            attempted: entry.unifiedAccount.attempted,
            enabled: entry.unifiedAccount.success,
            reason: entry.unifiedAccount.reason,
            timestamp: entry.timestamp,
        };
    }
    /**
     * Set unified account cache entry (legacy compatibility)
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @param data - The transaction data payload.
     * @param data.attempted - Whether the operation was attempted.
     * @param data.enabled - Whether the feature is enabled.
     * @param data.reason - Optional discriminator explaining a non-success outcome.
     */
    set(network, userAddress, data) {
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getOrCreateEntry).call(this, network, userAddress);
        entry.unifiedAccount = {
            attempted: data.attempted,
            success: data.enabled,
            reason: data.reason,
        };
        entry.timestamp = Date.now();
    }
    // ===== Builder Fee Methods =====
    /**
     * Check if builder fee approval was attempted
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    getBuilderFee(network, userAddress) {
        const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").get(key);
        return entry?.builderFee;
    }
    /**
     * Set builder fee approval state
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @param state - The current state.
     */
    setBuilderFee(network, userAddress, state) {
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getOrCreateEntry).call(this, network, userAddress);
        entry.builderFee = state;
        entry.timestamp = Date.now();
    }
    // ===== Referral Methods =====
    /**
     * Check if referral setup was attempted
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    getReferral(network, userAddress) {
        const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").get(key);
        return entry?.referral;
    }
    /**
     * Set referral setup state
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @param state - The current state.
     */
    setReferral(network, userAddress, state) {
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getOrCreateEntry).call(this, network, userAddress);
        entry.referral = state;
        entry.timestamp = Date.now();
    }
    // ===== General Methods =====
    /**
     * Clear only unified account state for a specific network and user address
     * This preserves builder fee and referral states
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     */
    clearUnifiedAccount(network, userAddress) {
        const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").get(key);
        if (entry) {
            entry.unifiedAccount = { attempted: false, success: false };
            entry.timestamp = Date.now();
        }
    }
    // ===== Wallet Registration Methods =====
    /**
     * Read the wallet's Hyperliquid registration signal.
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The current signal, or undefined if no entry exists.
     */
    getWalletRegistered(network, userAddress) {
        const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
        return __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").get(key)?.walletRegistered;
    }
    /**
     * Record whether the wallet has been observed on Hyperliquid. Once
     * `registered=true` is set, it stays true for the session — the goal
     * is to skip doomed exchange writes for unfunded wallets, not to
     * gate them after they fund.
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @param registered - True once any evidence (clearinghouseState balance,
     * userFills, successful deposit, ...) confirms the wallet exists on HL.
     */
    setWalletRegistered(network, userAddress, registered) {
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getOrCreateEntry).call(this, network, userAddress);
        if (entry.walletRegistered.registered && !registered) {
            // Monotonic: once registered, never demote.
            return;
        }
        entry.walletRegistered = { known: true, registered };
        entry.timestamp = Date.now();
    }
    /**
     * Clear only builder fee state for a specific network and user address
     * This preserves unified account and referral states
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     */
    clearBuilderFee(network, userAddress) {
        const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").get(key);
        if (entry) {
            entry.builderFee = { attempted: false, success: false };
            entry.timestamp = Date.now();
        }
    }
    /**
     * Clear only referral state for a specific network and user address
     * This preserves unified account and builder fee states
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     */
    clearReferral(network, userAddress) {
        const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
        const entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").get(key);
        if (entry) {
            entry.referral = { attempted: false, success: false };
            entry.timestamp = Date.now();
        }
    }
    /**
     * Clear entire cache entry for a specific network and user address
     * WARNING: This clears ALL signing operation states (unifiedAccount, builderFee, referral)
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     */
    clear(network, userAddress) {
        const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
        __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").delete(key);
    }
    /**
     * Clear all cache entries
     * WARNING: This clears ALL signing operation states for ALL users
     */
    clearAll() {
        __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").clear();
    }
    /**
     * Get all cache entries (for debugging)
     *
     * @returns The result of the operation.
     */
    getAll() {
        return new Map(__classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f"));
    }
    /**
     * Get cache size (for debugging)
     *
     * @returns The resulting numeric value.
     */
    size() {
        return __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").size;
    }
    /**
     * Get full cache state for debugging
     *
     * @returns The resulting string value.
     */
    debugState() {
        const entries = [];
        __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").forEach((entry, key) => {
            entries.push(`${key}: unified=${entry.unifiedAccount.attempted}/${entry.unifiedAccount.success}, ` +
                `builder=${entry.builderFee.attempted}/${entry.builderFee.success}, ` +
                `referral=${entry.referral.attempted}/${entry.referral.success}, ` +
                `walletRegistered=${entry.walletRegistered.known}/${entry.walletRegistered.registered}`);
        });
        return entries.join('\n') || '(empty)';
    }
}
_a = PerpsSigningCacheManager, _PerpsSigningCacheManager_cache = new WeakMap(), _PerpsSigningCacheManager_inFlightOperations = new WeakMap(), _PerpsSigningCacheManager_instances = new WeakSet(), _PerpsSigningCacheManager_getCacheKey = function _PerpsSigningCacheManager_getCacheKey(network, userAddress) {
    return `${network}:${userAddress.toLowerCase()}`;
}, _PerpsSigningCacheManager_getOrCreateEntry = function _PerpsSigningCacheManager_getOrCreateEntry(network, userAddress) {
    const key = __classPrivateFieldGet(this, _PerpsSigningCacheManager_instances, "m", _PerpsSigningCacheManager_getCacheKey).call(this, network, userAddress);
    let entry = __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").get(key);
    if (!entry) {
        entry = {
            unifiedAccount: { attempted: false, success: false },
            builderFee: { attempted: false, success: false },
            referral: { attempted: false, success: false },
            walletRegistered: { known: false, registered: false },
            timestamp: Date.now(),
        };
        __classPrivateFieldGet(this, _PerpsSigningCacheManager_cache, "f").set(key, entry);
    }
    return entry;
};
_PerpsSigningCacheManager_instance = { value: void 0 };
// Export singleton instance with backward-compatible name
export const TradingReadinessCache = PerpsSigningCacheManager.getInstance();
// Export with new name for clarity
export const PerpsSigningCache = PerpsSigningCacheManager.getInstance();
//# sourceMappingURL=TradingReadinessCache.mjs.map