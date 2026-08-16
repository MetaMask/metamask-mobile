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
var _DexDiscoveryCacheManager_deps;
import { MAINNET_HIP3_CONFIG, TESTNET_HIP3_CONFIG } from "../constants/hyperLiquidConfig.mjs";
/**
 * Manages the unified DEX discovery cache — single source of truth for all perpDexs() derivatives.
 *
 * Extracted from HyperLiquidProvider to isolate cache logic.
 * All writes go through update(); readers use .state.
 */
export class DexDiscoveryCacheManager {
    constructor(deps) {
        /**
         * Unified DEX discovery state.
         * null = not yet fetched; object = raw + validated + timestamp.
         */
        this.state = null;
        _DexDiscoveryCacheManager_deps.set(this, void 0);
        __classPrivateFieldSet(this, _DexDiscoveryCacheManager_deps, deps, "f");
    }
    /**
     * Single atomic writer for DEX discovery state.
     * All code paths that fetch perpDexs() MUST call this — no direct field writes.
     *
     * @param allDexs - Raw perpDexs() API response array.
     * @returns The newly created unified discovery state.
     */
    update(allDexs) {
        const validated = this.computeValidatedDexs(allDexs);
        const newState = {
            raw: allDexs,
            validated,
            timestamp: Date.now(),
        };
        this.state = newState;
        return newState;
    }
    /**
     * Reset state to null (used on disconnect/reconnect).
     */
    reset() {
        this.state = null;
    }
    /**
     * Pure filtering of perpDexs() response into validated DEX names.
     * Encapsulates testnet/mainnet feature-flag logic.
     *
     * @param allDexs - Raw perpDexs() API response array.
     * @returns Filtered DEX name list (null = main DEX, strings = HIP-3 DEXs).
     */
    computeValidatedDexs(allDexs) {
        const availableHip3Dexs = [];
        allDexs.forEach((dex) => {
            if (dex !== null) {
                availableHip3Dexs.push(dex.name);
            }
        });
        if (__classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").isTestnetMode()) {
            const { EnabledDexs, AutoDiscoverAll } = TESTNET_HIP3_CONFIG;
            if (!AutoDiscoverAll) {
                if (EnabledDexs.length === 0) {
                    __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").debugLogger.log('HyperLiquidProvider: Testnet - using main DEX only (HIP-3 DEXs filtered)', {
                        availableHip3Dexs: availableHip3Dexs.length,
                        reason: 'TESTNET_HIP3_CONFIG.EnabledDexs is empty',
                    });
                    return [null];
                }
                const filteredDexs = availableHip3Dexs.filter((dex) => EnabledDexs.includes(dex));
                __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").debugLogger.log('HyperLiquidProvider: Testnet - filtered to allowed DEXs', {
                    allowedDexs: EnabledDexs,
                    filteredDexs,
                    availableHip3Dexs: availableHip3Dexs.length,
                });
                return [null, ...filteredDexs];
            }
            __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").debugLogger.log('HyperLiquidProvider: Testnet - AUTO_DISCOVER_ALL enabled, using all DEXs', { totalDexCount: availableHip3Dexs.length + 1 });
        }
        else {
            const { AutoDiscoverAll } = MAINNET_HIP3_CONFIG;
            if (!AutoDiscoverAll) {
                const allowedDexsFromAllowlist = this.extractDexsFromAllowlist();
                if (allowedDexsFromAllowlist.length === 0) {
                    __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").debugLogger.log('HyperLiquidProvider: Mainnet - using main DEX only (no HIP-3 DEXs in allowlist)', {
                        availableHip3Dexs: availableHip3Dexs.length,
                        allowlistMarkets: __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").getAllowlistMarkets(),
                    });
                    return [null];
                }
                const filteredDexs = availableHip3Dexs.filter((dex) => allowedDexsFromAllowlist.includes(dex));
                __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").debugLogger.log('HyperLiquidProvider: Mainnet - filtered to allowlist DEXs', {
                    allowedDexsFromAllowlist,
                    filteredDexs,
                    availableHip3Dexs: availableHip3Dexs.length,
                });
                return [null, ...filteredDexs];
            }
            __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").debugLogger.log('HyperLiquidProvider: Mainnet - AUTO_DISCOVER_ALL enabled, using all DEXs', { totalDexCount: availableHip3Dexs.length + 1 });
        }
        __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").debugLogger.log('HyperLiquidProvider: All DEXs enabled (market filtering at data layer)', {
            mainDex: true,
            hip3Dexs: availableHip3Dexs,
            totalDexCount: availableHip3Dexs.length + 1,
        });
        return [null, ...availableHip3Dexs];
    }
    /**
     * Extract unique DEX names from allowlist market patterns.
     * Patterns can be: "xyz:*" (wildcard), "xyz:TSLA" (exact), or "xyz" (DEX shorthand).
     *
     * @returns Array of unique DEX names from the allowlist.
     */
    extractDexsFromAllowlist() {
        const allowlistMarkets = __classPrivateFieldGet(this, _DexDiscoveryCacheManager_deps, "f").getAllowlistMarkets();
        if (allowlistMarkets.length === 0) {
            return [];
        }
        const dexNames = new Set();
        for (const pattern of allowlistMarkets) {
            const colonIndex = pattern.indexOf(':');
            if (colonIndex > 0) {
                const dex = pattern.substring(0, colonIndex);
                dexNames.add(dex);
            }
            else if (pattern.length > 0 && !pattern.includes('*')) {
                if (/^[a-z][a-z0-9]*$/iu.test(pattern)) {
                    dexNames.add(pattern.toLowerCase());
                }
            }
        }
        return Array.from(dexNames);
    }
}
_DexDiscoveryCacheManager_deps = new WeakMap();
//# sourceMappingURL=DexDiscoveryCacheManager.mjs.map