"use strict";
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
var _HyperLiquidSubscriptionService_instances, _a, _HyperLiquidSubscriptionService_clientService, _HyperLiquidSubscriptionService_walletService, _HyperLiquidSubscriptionService_hip3Enabled, _HyperLiquidSubscriptionService_enabledDexs, _HyperLiquidSubscriptionService_allowlistMarkets, _HyperLiquidSubscriptionService_blocklistMarkets, _HyperLiquidSubscriptionService_priceDeviationLimit, _HyperLiquidSubscriptionService_discoverEnabledDexs, _HyperLiquidSubscriptionService_discoveredDexNames, _HyperLiquidSubscriptionService_dexDiscoveryPromise, _HyperLiquidSubscriptionService_dexDiscoveryResolver, _HyperLiquidSubscriptionService_expectedDexs, _HyperLiquidSubscriptionService_initializedDexs, _HyperLiquidSubscriptionService_priceSubscribers, _HyperLiquidSubscriptionService_positionSubscribers, _HyperLiquidSubscriptionService_orderFillSubscribers, _HyperLiquidSubscriptionService_orderSubscribers, _HyperLiquidSubscriptionService_accountSubscribers, _HyperLiquidSubscriptionService_marketDataSubscribers, _HyperLiquidSubscriptionService_orderBookSubscribers, _HyperLiquidSubscriptionService_globalAllMidsSubscription, _HyperLiquidSubscriptionService_globalAllMidsPromise, _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription, _HyperLiquidSubscriptionService_globalFastAssetCtxsPromise, _HyperLiquidSubscriptionService_fastAssetCtxsCoins, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, _HyperLiquidSubscriptionService_globalBboSubscriptions, _HyperLiquidSubscriptionService_pendingBboPromises, _HyperLiquidSubscriptionService_orderFillSubscriptions, _HyperLiquidSubscriptionService_spotStateSubscriptions, _HyperLiquidSubscriptionService_spotStateSubscriptionPromises, _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration, _HyperLiquidSubscriptionService_symbolSubscriberCounts, _HyperLiquidSubscriptionService_dexSubscriberCounts, _HyperLiquidSubscriptionService_webData3Subscriptions, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, _HyperLiquidSubscriptionService_positionSubscriberCount, _HyperLiquidSubscriptionService_orderSubscriberCount, _HyperLiquidSubscriptionService_accountSubscriberCount, _HyperLiquidSubscriptionService_oiCapSubscriberCount, _HyperLiquidSubscriptionService_dexPositionsCache, _HyperLiquidSubscriptionService_dexOrdersCache, _HyperLiquidSubscriptionService_dexAccountCache, _HyperLiquidSubscriptionService_cachedSpotState, _HyperLiquidSubscriptionService_abstractionModeByUser, _HyperLiquidSubscriptionService_abstractionModeLastWsRefreshAtByUser, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, _HyperLiquidSubscriptionService_cachedSpotStateUserAddress, _HyperLiquidSubscriptionService_spotStatePromise, _HyperLiquidSubscriptionService_spotStatePromiseUserAddress, _HyperLiquidSubscriptionService_spotStateGeneration, _HyperLiquidSubscriptionService_cachedPositions, _HyperLiquidSubscriptionService_cachedOrders, _HyperLiquidSubscriptionService_cachedAccount, _HyperLiquidSubscriptionService_ordersCacheInitialized, _HyperLiquidSubscriptionService_positionsCacheInitialized, _HyperLiquidSubscriptionService_oiCapSubscribers, _HyperLiquidSubscriptionService_cachedOICaps, _HyperLiquidSubscriptionService_cachedOICapsHash, _HyperLiquidSubscriptionService_oiCapsCacheInitialized, _HyperLiquidSubscriptionService_cachedPriceData, _HyperLiquidSubscriptionService_allMidsSnapshots, _HyperLiquidSubscriptionService_cachedFills, _HyperLiquidSubscriptionService_fillsCacheInitialized, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, _HyperLiquidSubscriptionService_dexAssetCtxsCache, _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, _HyperLiquidSubscriptionService_openOrdersSubscriptions, _HyperLiquidSubscriptionService_pendingClearinghouseSubscriptions, _HyperLiquidSubscriptionService_pendingOpenOrdersSubscriptions, _HyperLiquidSubscriptionService_dexMetaCache, _HyperLiquidSubscriptionService_orderBookCache, _HyperLiquidSubscriptionService_marketDataCache, _HyperLiquidSubscriptionService_activeAssetCtxPriceTtlMs, _HyperLiquidSubscriptionService_isClearing, _HyperLiquidSubscriptionService_restoreRetryTimeouts, _HyperLiquidSubscriptionService_deps, _HyperLiquidSubscriptionService_logErrorUnlessClearing, _HyperLiquidSubscriptionService_isTransientSdkError, _HyperLiquidSubscriptionService_scheduleRestoreRetry, _HyperLiquidSubscriptionService_getErrorContext, _HyperLiquidSubscriptionService_isDexEnabled, _HyperLiquidSubscriptionService_waitForDexDiscovery, _HyperLiquidSubscriptionService_hashPositions, _HyperLiquidSubscriptionService_hashOrders, _HyperLiquidSubscriptionService_hashAccountState, _HyperLiquidSubscriptionService_cachedPositionsHash, _HyperLiquidSubscriptionService_cachedOrdersHash, _HyperLiquidSubscriptionService_cachedAccountHash, _HyperLiquidSubscriptionService_extractTPSLFromOrders, _HyperLiquidSubscriptionService_mergeTPSLIntoPositions, _HyperLiquidSubscriptionService_aggregateAccountStates, _HyperLiquidSubscriptionService_getAbstractionModeForUser, _HyperLiquidSubscriptionService_getSpotBalanceOptions, _HyperLiquidSubscriptionService_refreshAbstractionModeThrottled, _HyperLiquidSubscriptionService_ensureSpotState, _HyperLiquidSubscriptionService_refreshSpotState, _HyperLiquidSubscriptionService_ensureSpotStateSubscription, _HyperLiquidSubscriptionService_ensureSharedWebData3Subscription, _HyperLiquidSubscriptionService_createUserDataSubscription, _HyperLiquidSubscriptionService_ensureClearinghouseStateSubscription, _HyperLiquidSubscriptionService_createClearinghouseSubscription, _HyperLiquidSubscriptionService_ensureOpenOrdersSubscription, _HyperLiquidSubscriptionService_createOpenOrdersSubscription, _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers, _HyperLiquidSubscriptionService_cleanupSharedWebData3ISubscription, _HyperLiquidSubscriptionService_ensureOrderFillISubscription, _HyperLiquidSubscriptionService_createSubscription, _HyperLiquidSubscriptionService_createPriceUpdate, _HyperLiquidSubscriptionService_getFreshActiveAssetCtxPrice, _HyperLiquidSubscriptionService_projectPriceUpdate, _HyperLiquidSubscriptionService_ensureGlobalAllMidsSubscription, _HyperLiquidSubscriptionService_ensureGlobalFastAssetCtxsSubscription, _HyperLiquidSubscriptionService_ensureActiveAssetSubscription, _HyperLiquidSubscriptionService_cleanupActiveAssetSubscription, _HyperLiquidSubscriptionService_ensureAssetCtxsSubscription, _HyperLiquidSubscriptionService_ensureDexAllMidsSubscription, _HyperLiquidSubscriptionService_createDexAllMidsSubscription, _HyperLiquidSubscriptionService_createAssetCtxsSubscription, _HyperLiquidSubscriptionService_cleanupAssetCtxsSubscription, _HyperLiquidSubscriptionService_ensureBboSubscription, _HyperLiquidSubscriptionService_cleanupBboSubscription, _HyperLiquidSubscriptionService_processOrderBookData, _HyperLiquidSubscriptionService_notifyAllPriceSubscribers;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperLiquidSubscriptionService = void 0;
const utils_1 = require("@metamask/utils");
const hyperLiquidConfig_js_1 = require("../constants/hyperLiquidConfig.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const hyperliquid_types_js_1 = require("../types/hyperliquid-types.cjs");
const index_js_1 = require("../types/index.cjs");
const accountUtils_js_1 = require("../utils/accountUtils.cjs");
const errorUtils_js_1 = require("../utils/errorUtils.cjs");
const hyperLiquidAdapter_js_1 = require("../utils/hyperLiquidAdapter.cjs");
const hyperLiquidOrderBookProcessor_js_1 = require("../utils/hyperLiquidOrderBookProcessor.cjs");
const marketDataTransform_js_1 = require("../utils/marketDataTransform.cjs");
const orderTypes_js_1 = require("../utils/orderTypes.cjs");
/**
 * Service for managing HyperLiquid WebSocket subscriptions
 * Implements singleton subscription architecture with reference counting
 */
class HyperLiquidSubscriptionService {
    constructor(clientService, walletService, platformDependencies, hip3Enabled, enabledDexs, allowlistMarkets, blocklistMarkets, priceDeviationLimit, discoverEnabledDexs) {
        _HyperLiquidSubscriptionService_instances.add(this);
        // Service dependencies
        _HyperLiquidSubscriptionService_clientService.set(this, void 0);
        _HyperLiquidSubscriptionService_walletService.set(this, void 0);
        // HIP-3 feature flag support
        _HyperLiquidSubscriptionService_hip3Enabled.set(this, void 0);
        _HyperLiquidSubscriptionService_enabledDexs.set(this, void 0); // DEX identification (maps webData3 indices to DEX names)
        _HyperLiquidSubscriptionService_allowlistMarkets.set(this, void 0); // Market filtering (allowlist)
        _HyperLiquidSubscriptionService_blocklistMarkets.set(this, void 0); // Market filtering (blocklist)
        // Max market-vs-oracle price deviation before a market is reported untradable
        _HyperLiquidSubscriptionService_priceDeviationLimit.set(this, void 0);
        _HyperLiquidSubscriptionService_discoverEnabledDexs.set(this, void 0);
        _HyperLiquidSubscriptionService_discoveredDexNames.set(this, []); // DEX order for mapping webData3 perpDexStates indices
        // DEX discovery synchronization - allows subscriptions to wait for HIP-3 DEX discovery
        _HyperLiquidSubscriptionService_dexDiscoveryPromise.set(this, null);
        _HyperLiquidSubscriptionService_dexDiscoveryResolver.set(this, null);
        // Track DEXs for synchronized position notifications
        // Ensures all DEXs send initial data before notifying subscribers
        _HyperLiquidSubscriptionService_expectedDexs.set(this, new Set());
        _HyperLiquidSubscriptionService_initializedDexs.set(this, new Set());
        // Subscriber collections
        _HyperLiquidSubscriptionService_priceSubscribers.set(this, new Map());
        _HyperLiquidSubscriptionService_positionSubscribers.set(this, new Set());
        // Order fill subscribers keyed by accountId (normalized: undefined -> 'default')
        _HyperLiquidSubscriptionService_orderFillSubscribers.set(this, new Map());
        _HyperLiquidSubscriptionService_orderSubscribers.set(this, new Set());
        _HyperLiquidSubscriptionService_accountSubscribers.set(this, new Set());
        // Track which subscribers want market data
        _HyperLiquidSubscriptionService_marketDataSubscribers.set(this, new Map());
        // Track which subscribers want top-of-book (best bid/ask) data
        _HyperLiquidSubscriptionService_orderBookSubscribers.set(this, new Map());
        // Global singleton subscriptions
        _HyperLiquidSubscriptionService_globalAllMidsSubscription.set(this, void 0);
        _HyperLiquidSubscriptionService_globalAllMidsPromise.set(this, void 0); // Track in-progress subscription
        // fastAssetCtxs (TAT-3387): single global feed (no per-DEX param) that owns
        // the latency-sensitive mark/mid price path at HyperLiquid's fast (~5s)
        // cadence, now that the public assetCtxs feed has been slowed down.
        _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription.set(this, void 0);
        _HyperLiquidSubscriptionService_globalFastAssetCtxsPromise.set(this, void 0); // Track in-progress subscription
        // Coins with a usable price (midPx/markPx) from any fastAssetCtxs event
        // (snapshot or diff). Once a coin appears here, the per-DEX assetCtxs
        // handler stops writing its price into #cachedPriceData, since
        // fastAssetCtxs is the fresher/authoritative source for that coin going
        // forward. A coin is only added once fastAssetCtxs has actually supplied a
        // usable price for it (not merely appeared in a message with a null/absent
        // price), so ownership is never claimed without a fast price backing it —
        // otherwise assetCtxs, the coin's only remaining price source, would be
        // suppressed with nothing to fall back on. Cleared on clearAll() and when
        // the fastAssetCtxs subscription is re-established after a reconnect, so
        // assetCtxs can serve prices again until a fresh snapshot arrives.
        _HyperLiquidSubscriptionService_fastAssetCtxsCoins.set(this, new Set());
        _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions.set(this, new Map());
        // Track in-progress activeAssetCtx subscription promises to prevent leaks
        // when cleanup fires before the async subscription resolves (#28141)
        _HyperLiquidSubscriptionService_pendingActiveAssetPromises.set(this, new Map());
        _HyperLiquidSubscriptionService_globalBboSubscriptions.set(this, new Map());
        // Track in-progress BBO subscription promises to prevent leaks (#28141)
        _HyperLiquidSubscriptionService_pendingBboPromises.set(this, new Map());
        // Order fill subscriptions keyed by accountId (normalized: undefined -> 'default')
        _HyperLiquidSubscriptionService_orderFillSubscriptions.set(this, new Map());
        _HyperLiquidSubscriptionService_spotStateSubscriptions.set(this, new Map());
        _HyperLiquidSubscriptionService_spotStateSubscriptionPromises.set(this, new Map());
        // Bumped on cleanup so in-flight #ensureSpotStateSubscription
        // continuations discard their subscription instead of rehydrating
        // #spotStateSubscriptions after clearAll/cleanupSharedWebData3.
        _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration.set(this, 0);
        _HyperLiquidSubscriptionService_symbolSubscriberCounts.set(this, new Map());
        _HyperLiquidSubscriptionService_dexSubscriberCounts.set(this, new Map()); // Track subscribers per DEX for assetCtxs
        // Multi-DEX webData3 subscription for all user data (positions, orders, account, OI caps)
        _HyperLiquidSubscriptionService_webData3Subscriptions.set(this, new Map()); // Key: dex name ('' for main)
        _HyperLiquidSubscriptionService_webData3SubscriptionPromise.set(this, void 0);
        _HyperLiquidSubscriptionService_positionSubscriberCount.set(this, 0);
        _HyperLiquidSubscriptionService_orderSubscriberCount.set(this, 0);
        _HyperLiquidSubscriptionService_accountSubscriberCount.set(this, 0);
        _HyperLiquidSubscriptionService_oiCapSubscriberCount.set(this, 0);
        // Multi-DEX data caches
        _HyperLiquidSubscriptionService_dexPositionsCache.set(this, new Map()); // Per-DEX positions
        _HyperLiquidSubscriptionService_dexOrdersCache.set(this, new Map()); // Per-DEX orders
        _HyperLiquidSubscriptionService_dexAccountCache.set(this, new Map()); // Per-DEX account state
        _HyperLiquidSubscriptionService_cachedSpotState.set(this, null);
        // HL abstraction mode (Unified / Standard / Portfolio / DEX-abstraction).
        // Gates spot→perps folding in addSpotBalanceToAccountState. Keyed by user
        // address so an in-flight refresh or late response for one wallet cannot
        // overwrite another wallet's fold semantics after an account switch.
        _HyperLiquidSubscriptionService_abstractionModeByUser.set(this, new Map());
        // Timestamp of the last successful WS-driven userAbstraction refresh per
        // user. This throttle intentionally does not count the initial bootstrap
        // fetch so the first spot tick after app launch can still detect an HL-web
        // mode flip immediately.
        _HyperLiquidSubscriptionService_abstractionModeLastWsRefreshAtByUser.set(this, new Map());
        // In-flight promises for WS-triggered refreshes, keyed by user so concurrent
        // ticks for the same wallet share one fetch while account switches can start
        // their own refresh immediately.
        _HyperLiquidSubscriptionService_abstractionModeInflightByUser.set(this, new Map());
        _HyperLiquidSubscriptionService_cachedSpotStateUserAddress.set(this, null);
        _HyperLiquidSubscriptionService_spotStatePromise.set(this, void 0);
        _HyperLiquidSubscriptionService_spotStatePromiseUserAddress.set(this, void 0);
        // Monotonic token bumped on cleanUp/clearAll and on each new fetch.
        // Any in-flight #refreshSpotState that resolves with a stale token
        // discards its result, preventing cross-account cache contamination
        // when accounts are switched mid-fetch.
        _HyperLiquidSubscriptionService_spotStateGeneration.set(this, 0);
        _HyperLiquidSubscriptionService_cachedPositions.set(this, null); // Aggregated positions
        _HyperLiquidSubscriptionService_cachedOrders.set(this, null); // Aggregated orders
        _HyperLiquidSubscriptionService_cachedAccount.set(this, null); // Aggregated account
        _HyperLiquidSubscriptionService_ordersCacheInitialized.set(this, false); // Track if orders cache has received WebSocket data
        _HyperLiquidSubscriptionService_positionsCacheInitialized.set(this, false); // Track if positions cache has received WebSocket data
        // OI Cap tracking (from webData3.perpDexStates[].perpsAtOpenInterestCap)
        _HyperLiquidSubscriptionService_oiCapSubscribers.set(this, new Set());
        _HyperLiquidSubscriptionService_cachedOICaps.set(this, []);
        _HyperLiquidSubscriptionService_cachedOICapsHash.set(this, '');
        _HyperLiquidSubscriptionService_oiCapsCacheInitialized.set(this, false);
        // Global price data cache
        _HyperLiquidSubscriptionService_cachedPriceData.set(this, null);
        // Raw allMids WS snapshots keyed by DEX ('' for main DEX)
        _HyperLiquidSubscriptionService_allMidsSnapshots.set(this, new Map());
        // Fills cache for cache-first pattern (similar to price caching)
        _HyperLiquidSubscriptionService_cachedFills.set(this, null);
        _HyperLiquidSubscriptionService_fillsCacheInitialized.set(this, false);
        // HIP-3: assetCtxs subscriptions for multi-DEX market data
        _HyperLiquidSubscriptionService_assetCtxsSubscriptions.set(this, new Map()); // Key: dex name ('' for main)
        _HyperLiquidSubscriptionService_dexAssetCtxsCache.set(this, new Map()); // Per-DEX asset contexts
        _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises.set(this, new Map()); // Track in-progress subscriptions
        _HyperLiquidSubscriptionService_dexAllMidsSubscriptions.set(this, new Map());
        _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises.set(this, new Map());
        _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions.set(this, new Map()); // Key: dex name ('' for main)
        _HyperLiquidSubscriptionService_openOrdersSubscriptions.set(this, new Map()); // Key: dex name ('' for main)
        // Pending subscription promises to prevent race conditions
        // When multiple calls to ensure*Subscription happen concurrently, this ensures
        // only one subscription is created per DEX (others wait for the pending promise)
        _HyperLiquidSubscriptionService_pendingClearinghouseSubscriptions.set(this, new Map());
        _HyperLiquidSubscriptionService_pendingOpenOrdersSubscriptions.set(this, new Map());
        // Meta cache per DEX - populated by metaAndAssetCtxs, used by createAssetCtxsSubscription
        // This avoids redundant meta() API calls since metaAndAssetCtxs already returns meta data
        _HyperLiquidSubscriptionService_dexMetaCache.set(this, new Map());
        // Order book data cache
        _HyperLiquidSubscriptionService_orderBookCache.set(this, new Map());
        // Market data caching for multi-channel consolidation
        _HyperLiquidSubscriptionService_marketDataCache.set(this, new Map());
        // Flag to suppress error logging during intentional disconnect
        // Set in clearAll() and never reset (service instance is discarded after disconnect)
        _HyperLiquidSubscriptionService_isClearing.set(this, false);
        _HyperLiquidSubscriptionService_restoreRetryTimeouts.set(this, new Map());
        // Platform dependencies for logging
        _HyperLiquidSubscriptionService_deps.set(this, void 0);
        // Cache hashes to avoid recomputation
        _HyperLiquidSubscriptionService_cachedPositionsHash.set(this, '');
        _HyperLiquidSubscriptionService_cachedOrdersHash.set(this, '');
        _HyperLiquidSubscriptionService_cachedAccountHash.set(this, '');
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_clientService, clientService, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_walletService, walletService, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_deps, platformDependencies, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_hip3Enabled, hip3Enabled ?? false, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_enabledDexs, enabledDexs ?? [], "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_discoveredDexNames, enabledDexs ?? [], "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_allowlistMarkets, allowlistMarkets ?? [], "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_blocklistMarkets, blocklistMarkets ?? [], "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_priceDeviationLimit, priceDeviationLimit ?? hyperLiquidConfig_js_1.HYPERLIQUID_CONFIG.OraclePriceDeviationLimit, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_discoverEnabledDexs, discoverEnabledDexs, "f");
    }
    /**
     * Populate DEX meta cache with pre-fetched meta data
     * Called by Provider after buildAssetMapping to share cached meta,
     * avoiding redundant metaAndAssetCtxs/meta API calls during subscription setup
     *
     * @param dex - DEX key ('' for main DEX, 'xyz'/'flx'/etc for HIP-3)
     * @param meta - Meta response containing universe data
     * @param meta.universe - The array of asset universe entries from the meta response.
     */
    setDexMetaCache(dex, meta) {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexMetaCache, "f").set(dex, meta);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('[SubscriptionService] DEX meta cache populated', {
            dex: dex || 'main',
            universeSize: meta.universe.length,
        });
    }
    /**
     * Cache asset contexts for a specific DEX from API response
     * This allows buildAssetMapping() to populate cache for getMarketDataWithPrices() to use
     *
     * @param dex - DEX name ('' for main perps)
     * @param assetCtxs - Asset contexts from metaAndAssetCtxs response
     */
    setDexAssetCtxsCache(dex, assetCtxs) {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAssetCtxsCache, "f").set(dex, assetCtxs);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('[SubscriptionService] DEX assetCtxs cache populated', {
            dex: dex || 'main',
            ctxsCount: assetCtxs.length,
        });
    }
    /**
     * Get cached assetCtxs for a DEX
     * Returns the cached asset contexts from WebSocket subscription if available
     *
     * @param dex - DEX key ('' for main DEX, 'xyz'/'flx'/etc for HIP-3)
     * @returns Array of asset contexts or undefined if not cached
     */
    getDexAssetCtxsCache(dex) {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAssetCtxsCache, "f").get(dex);
    }
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
    async updateFeatureFlags(hip3Enabled, enabledDexs, allowlistMarkets, blocklistMarkets) {
        const previousEnabledDexs = [...__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_enabledDexs, "f")];
        const previousAllowlistMarkets = [...__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_allowlistMarkets, "f")];
        const previousBlocklistMarkets = [...__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_blocklistMarkets, "f")];
        const previousHip3Enabled = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_hip3Enabled, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_hip3Enabled, hip3Enabled, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_enabledDexs, enabledDexs, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_allowlistMarkets, allowlistMarkets, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_blocklistMarkets, blocklistMarkets, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_discoveredDexNames, enabledDexs, "f"); // Store DEX order for webData3 index mapping
        // Resolve any pending DEX discovery wait now that DEXs are available
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexDiscoveryResolver, "f") && enabledDexs.length > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexDiscoveryResolver, "f").call(this);
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_dexDiscoveryPromise, null, "f");
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_dexDiscoveryResolver, null, "f");
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('Feature flags updated:', {
            previousHip3Enabled,
            hip3Enabled,
            previousEnabledDexs,
            enabledDexs,
            previousAllowlistMarkets,
            allowlistMarkets,
            previousBlocklistMarkets,
            blocklistMarkets,
        });
        // If equity was just enabled or new DEXs were added
        const newDexs = enabledDexs.filter((dex) => !previousEnabledDexs.includes(dex));
        if ((!previousHip3Enabled && hip3Enabled && enabledDexs.length > 0) ||
            newDexs.length > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('Establishing subscriptions for new DEXs:', newDexs);
            // Establish assetCtxs subscriptions for new DEXs (for market data)
            const hasMarketDataSubscribers = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").size > 0;
            if (hasMarketDataSubscribers) {
                await Promise.all(newDexs.map(async (dex) => {
                    try {
                        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureAssetCtxsSubscription).call(this, dex);
                    }
                    catch (error) {
                        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.updateFeatureFlags'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'updateFeatureFlags.ensureAssetCtxsSubscription', {
                            dex,
                        }));
                    }
                }));
            }
            // Establish clearinghouseState/openOrders subscriptions for new DEXs
            // (needed for positions, orders, and account data when using individual subscriptions)
            const hasUserDataSubscribers = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, "f") > 0 ||
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscriberCount, "f") > 0 ||
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscriberCount, "f") > 0;
            if (hasUserDataSubscribers && __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_hip3Enabled, "f")) {
                try {
                    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").getUserAddressWithDefault();
                    await Promise.all(newDexs.map(async (dex) => {
                        try {
                            await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureClearinghouseStateSubscription).call(this, userAddress, dex);
                            await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureOpenOrdersSubscription).call(this, userAddress, dex);
                            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`Established user data subscriptions for new DEX: ${dex}`);
                        }
                        catch (error) {
                            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.updateFeatureFlags'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'updateFeatureFlags.ensureUserDataSubscription', { dex }));
                        }
                    }));
                }
                catch (error) {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.updateFeatureFlags'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'updateFeatureFlags.getUserAddress'));
                }
            }
        }
    }
    /**
     * Return the cached HL abstraction mode for the given user address.
     *
     * @param userAddress - The EVM address to look up.
     * @returns Cached abstraction mode, or null when unresolved.
     */
    getCachedAbstractionMode(userAddress) {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getAbstractionModeForUser).call(this, userAddress);
    }
    /**
     * Record a user's resolved abstraction mode and immediately re-aggregate.
     * Call after the provider has confirmed the on-chain mode (already-enabled
     * or just-migrated) so the WS-driven aggregator picks up the correct fold
     * decision on the next tick.
     *
     * @param userAddress - The EVM address whose mode is being recorded.
     * @param mode - The current abstraction mode for this user.
     */
    setUserAbstractionMode(userAddress, mode) {
        const lower = userAddress.toLowerCase();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeByUser, "f").set(lower, mode);
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers).call(this);
        }
    }
    /**
     * Subscribe to live price updates with singleton subscription architecture
     * Uses allMids for fast price updates and predictedFundings for accurate funding rates
     *
     * @param params - The subscription parameters including symbols and callbacks.
     * @returns A cleanup function to unsubscribe from price updates.
     */
    async subscribeToPrices(params) {
        const { symbols, callback, includeOrderBook = false, includeMarketData = false, } = params;
        const unsubscribers = [];
        symbols.forEach((symbol) => {
            unsubscribers.push(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createSubscription).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_priceSubscribers, "f"), callback, symbol));
            // Track market data subscribers separately
            if (includeMarketData) {
                unsubscribers.push(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createSubscription).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f"), callback, symbol));
            }
            // Track order book subscribers separately
            if (includeOrderBook) {
                unsubscribers.push(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createSubscription).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookSubscribers, "f"), callback, symbol));
            }
        });
        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
        const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
        if (!subscriptionClient) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('SubscriptionClient not available for price subscription');
            return () => unsubscribers.forEach((fn) => fn());
        }
        // Ensure global subscriptions are established
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureGlobalAllMidsSubscription).call(this);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureGlobalFastAssetCtxsSubscription).call(this);
        // Extract unique DEXs from requested symbols
        const dexsNeeded = new Set();
        symbols.forEach((symbol) => {
            const { dex } = (0, hyperLiquidAdapter_js_1.parseAssetName)(symbol);
            dexsNeeded.add(dex);
        });
        // Always ensure assetCtxs subscriptions (1 per DEX, lightweight).
        // Provides prevDayPx for percentChange24h even without includeMarketData
        // (e.g., prewarm after reconnection). Uses incrementRefCount: false when
        // not explicitly requested so lifecycle is managed by component subscriptions.
        dexsNeeded.forEach((dex) => {
            const dexName = dex ?? '';
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureAssetCtxsSubscription).call(this, dexName, {
                incrementRefCount: includeMarketData,
            }).catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToPrices'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToPrices.ensureAssetCtxsSubscription', { dex: dexName }));
            });
        });
        // dexAllMids and activeAssetCtx only when market data explicitly requested
        if (includeMarketData) {
            dexsNeeded.forEach((dex) => {
                const dexName = dex ?? '';
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureDexAllMidsSubscription).call(this, dexName).catch((error) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToPrices'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToPrices.ensureDexAllMidsSubscription', { dex: dexName }));
                });
            });
        }
        // Note: Funding rates are now cached via assetCtxs WebSocket subscription
        // (ensureAssetCtxsSubscription above), eliminating the need for a separate
        // metaAndAssetCtxs API call here. The WebSocket callback in createAssetCtxsSubscription
        // populates marketDataCache with funding rates as they arrive.
        symbols.forEach((symbol) => {
            // Subscribe to activeAssetCtx only when market data is requested
            if (includeMarketData) {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureActiveAssetSubscription).call(this, symbol);
            }
            if (includeOrderBook) {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureBboSubscription).call(this, symbol);
            }
        });
        // Send cached data immediately if available, projecting the fast-stream
        // price for focused subscribers and falling back to the allMids baseline
        // for list subscribers.
        symbols.forEach((symbol) => {
            const cachedPrice = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f")?.get(symbol);
            if (cachedPrice) {
                const projected = includeMarketData
                    ? __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_projectPriceUpdate).call(this, symbol, cachedPrice)
                    : cachedPrice;
                callback([projected]);
            }
            else if (includeMarketData) {
                // No allMids baseline yet; if a fresh fast-stream price is cached,
                // send it immediately so focused screens are not blank on first render.
                const fastPrice = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getFreshActiveAssetCtxPrice).call(this, symbol);
                if (fastPrice !== undefined) {
                    callback([__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createPriceUpdate).call(this, symbol, fastPrice)]);
                }
            }
        });
        // Return cleanup function
        return () => {
            unsubscribers.forEach((fn) => fn());
            // Cleanup subscriptions with reference counting
            symbols.forEach((symbol) => {
                if (includeMarketData) {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_cleanupActiveAssetSubscription).call(this, symbol);
                }
                if (includeOrderBook) {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_cleanupBboSubscription).call(this, symbol);
                }
            });
            // Cleanup DEX-level assetCtxs subscriptions
            if (includeMarketData) {
                dexsNeeded.forEach((dex) => {
                    const dexName = dex ?? '';
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_cleanupAssetCtxsSubscription).call(this, dexName);
                });
            }
        };
    }
    /**
     * Subscribe to live position updates with TP/SL data
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from position updates.
     */
    subscribeToPositions(params) {
        const { callback, accountId } = params;
        const unsubscribe = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createSubscription).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscribers, "f"), callback);
        // Increment position subscriber count
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, "f") + 1, "f");
        // Immediately provide cached data if available
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPositions, "f")) {
            callback(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPositions, "f"));
        }
        // Ensure shared subscription is active
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureSharedWebData3Subscription).call(this, accountId).catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToPositions'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToPositions'));
        });
        return () => {
            unsubscribe();
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, "f") - 1, "f");
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_cleanupSharedWebData3ISubscription).call(this);
        };
    }
    /**
     * Subscribe to open interest cap updates
     * OI caps are extracted from the shared webData3 subscription (zero additional overhead)
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from OI cap updates.
     */
    subscribeToOICaps(params) {
        const { callback, accountId } = params;
        // Create subscription
        const unsubscribe = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createSubscription).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_oiCapSubscribers, "f"), callback);
        // Increment OI cap subscriber count
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_oiCapSubscriberCount, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_oiCapSubscriberCount, "f") + 1, "f");
        // Immediately provide cached data if available
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOICaps, "f")) {
            callback(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOICaps, "f"));
        }
        // Ensure webData3 subscription is active (OI caps come from webData3)
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureSharedWebData3Subscription).call(this, accountId).catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToOICaps'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToOICaps'));
        });
        return () => {
            unsubscribe();
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_oiCapSubscriberCount, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_oiCapSubscriberCount, "f") - 1, "f");
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_cleanupSharedWebData3ISubscription).call(this);
        };
    }
    /**
     * Check if OI caps cache has been initialized
     * Useful for preventing UI flashing before first data arrives
     *
     * @returns True if the condition is met.
     */
    isOICapsCacheInitialized() {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_oiCapsCacheInitialized, "f");
    }
    /**
     * Subscribe to live order fill updates
     * Shares subscriptions per accountId to avoid duplicate WebSocket connections
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from order fill updates.
     */
    subscribeToOrderFills(params) {
        const { callback, accountId } = params;
        // Normalize accountId: undefined -> 'default' for Map key
        const normalizedAccountId = accountId ?? 'default';
        const unsubscribe = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createSubscription).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscribers, "f"), callback, normalizedAccountId);
        // Ensure subscription is established for this accountId
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureOrderFillISubscription).call(this, accountId).catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToOrderFills'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToOrderFills'));
        });
        return () => {
            unsubscribe();
            // If no more subscribers for this accountId, clean up subscription
            const subscribers = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscribers, "f").get(normalizedAccountId);
            if (!subscribers || subscribers.size === 0) {
                const subscription = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscriptions, "f").get(normalizedAccountId);
                if (subscription) {
                    subscription.unsubscribe().catch((error) => {
                        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToOrderFills'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToOrderFills.unsubscribe'));
                    });
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscriptions, "f").delete(normalizedAccountId);
                }
            }
        };
    }
    /**
     * Subscribe to live order updates
     * Uses the shared per-DEX subscriptions to avoid duplicate connections
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from order updates.
     */
    subscribeToOrders(params) {
        const { callback, accountId } = params;
        const unsubscribe = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createSubscription).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscribers, "f"), callback);
        // Increment order subscriber count
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_orderSubscriberCount, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscriberCount, "f") + 1, "f");
        // Immediately provide cached data if available
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOrders, "f")) {
            callback(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOrders, "f"));
        }
        // Ensure shared subscription is active
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureSharedWebData3Subscription).call(this, accountId).catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToOrders'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToOrders'));
        });
        return () => {
            unsubscribe();
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_orderSubscriberCount, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscriberCount, "f") - 1, "f");
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_cleanupSharedWebData3ISubscription).call(this);
        };
    }
    /**
     * Subscribe to live account updates
     * Uses the shared per-DEX subscriptions to avoid duplicate connections
     *
     * @param params - The subscription parameters including callback and account ID.
     * @returns A cleanup function to unsubscribe from account updates.
     */
    subscribeToAccount(params) {
        const { callback, accountId } = params;
        const unsubscribe = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createSubscription).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscribers, "f"), callback);
        // Increment account subscriber count
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_accountSubscriberCount, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscriberCount, "f") + 1, "f");
        // Immediately provide cached data if available. May be spot-less if the
        // spot fetch has not resolved yet (or permanently failed) — subscribers
        // prefer stale-but-present data over silent starvation; the next
        // aggregation after #ensureSpotState / next WebSocket update pushes the
        // spot-inclusive value.
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedAccount, "f")) {
            callback(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedAccount, "f"));
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureSpotState).call(this, accountId).catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToAccount'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToAccount.ensureSpotState'));
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureSpotStateSubscription).call(this, accountId).catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToAccount'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToAccount.ensureSpotStateSubscription'));
        });
        // Ensure shared subscription is active (reuses existing connection)
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureSharedWebData3Subscription).call(this, accountId).catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToAccount'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToAccount'));
        });
        return () => {
            unsubscribe();
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_accountSubscriberCount, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscriberCount, "f") - 1, "f");
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_cleanupSharedWebData3ISubscription).call(this);
        };
    }
    /**
     * Check if orders cache has been initialized from WebSocket
     *
     * @returns true if WebSocket has sent at least one update, false otherwise
     */
    isOrdersCacheInitialized() {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_ordersCacheInitialized, "f");
    }
    /**
     * Check if positions cache has been initialized from WebSocket
     *
     * @returns true if WebSocket has sent at least one update, false otherwise
     */
    isPositionsCacheInitialized() {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionsCacheInitialized, "f");
    }
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
    getCachedPositionsForDex(dexName) {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").get(dexName) ?? null;
    }
    /**
     * Get cached positions from WebSocket subscription
     *
     * @returns Cached positions array, or null if not initialized
     */
    getCachedPositions() {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPositions, "f");
    }
    /**
     * Get cached orders from WebSocket subscription
     *
     * @returns Cached orders array, or null if not initialized
     */
    getCachedOrders() {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOrders, "f");
    }
    /**
     * Atomically get cached orders if initialized
     * Prevents race condition between checking initialization and getting data
     *
     * @returns Cached orders array if initialized, null otherwise
     */
    getOrdersCacheIfInitialized() {
        if (!__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_ordersCacheInitialized, "f")) {
            return null;
        }
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOrders, "f") ? [...__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOrders, "f")] : [];
    }
    /**
     * Get cached price for a symbol from WebSocket allMids subscription
     * OPTIMIZATION: Use this instead of REST infoClient.allMids() to avoid rate limiting
     *
     * @param symbol - Asset symbol (e.g., 'BTC', 'ETH', 'xyz:TSLA')
     * @returns Price string, or undefined if not cached
     */
    getCachedPrice(symbol) {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f")?.get(symbol)?.price;
    }
    getLastAllMidsSnapshot(dex) {
        const dexKey = dex ?? '';
        const snapshot = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_allMidsSnapshots, "f").get(dexKey);
        if (!snapshot) {
            return null;
        }
        return { ...snapshot };
    }
    /**
     * Get cached fills from WebSocket userFills subscription
     * OPTIMIZATION: Use this instead of REST userFills() to avoid rate limiting
     *
     * @returns Copy of cached fills array, or null if not cached
     */
    getCachedFills() {
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedFills, "f") ? [...__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedFills, "f")] : null;
    }
    /**
     * Get cached fills only if the cache has been initialized from WebSocket
     * OPTIMIZATION: Distinguishes between "not initialized" (null) and "initialized but empty" ([])
     * - Returns null if cache hasn't received WebSocket snapshot yet (caller should use REST)
     * - Returns empty array [] if cache is initialized but user has no fills (caller can skip REST)
     * - Returns fills array if cache has data
     *
     * @returns Fills array or empty array if initialized, null if not yet initialized
     */
    getFillsCacheIfInitialized() {
        if (!__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_fillsCacheInitialized, "f")) {
            return null;
        }
        return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedFills, "f") ? [...__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedFills, "f")] : [];
    }
    /**
     * Subscribe to full order book updates with multiple depth levels
     * Creates a dedicated L2Book subscription for the requested symbol
     * and processes data into OrderBookData format for UI consumption
     *
     * @param params - Subscription parameters
     * @returns Cleanup function to unsubscribe
     */
    subscribeToOrderBook(params) {
        const { symbol, levels = 10, nSigFigs = 5, mantissa, fast, callback, onError, } = params;
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f")
            .ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter())
            .catch(() => {
            // Handled by getSubscriptionClient check below
        });
        const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
        if (!subscriptionClient) {
            const error = new Error('Subscription client not available');
            onError?.(error);
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('subscribeToOrderBook: Subscription client not available');
            return () => {
                // No-op cleanup
            };
        }
        let subscription;
        let cancelled = false;
        subscriptionClient
            .l2Book({ coin: symbol, nSigFigs, mantissa, fast }, (data) => {
            if (cancelled || data?.coin !== symbol || !data?.levels) {
                return;
            }
            const orderBookData = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_processOrderBookData).call(this, data, levels);
            callback(orderBookData);
        })
            .then(async (sub) => {
            if (cancelled) {
                try {
                    await sub.unsubscribe();
                }
                catch (unsubError) {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(unsubError, 'HyperLiquidSubscriptionService.subscribeToOrderBook'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToOrderBook.cleanup', { symbol }));
                }
                return undefined;
            }
            subscription = sub;
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`HyperLiquid: Order book subscription established for ${symbol}`);
            return undefined;
        })
            .catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToOrderBook'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToOrderBook', { symbol }));
            onError?.((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToOrderBook'));
        });
        return () => {
            cancelled = true;
            if (subscription) {
                subscription.unsubscribe().catch((error) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.subscribeToOrderBook'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'subscribeToOrderBook.unsubscribe', {
                        symbol,
                    }));
                });
            }
        };
    }
    /**
     * Restore all active subscriptions after WebSocket reconnection
     * Re-establishes WebSocket subscriptions for all active subscribers
     *
     * IMPORTANT: This method verifies transport readiness before attempting
     * any subscriptions to prevent "subscribe error: undefined" errors.
     */
    async restoreSubscriptions() {
        // CRITICAL: Verify transport is ready before attempting any subscriptions
        // This prevents race conditions where subscriptions are attempted while
        // the WebSocket is still in CONNECTING state
        try {
            await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureTransportReady({ timeoutMs: 5000 });
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('Transport not ready during subscription restore, will retry on next reconnect', { error: error instanceof Error ? error.message : String(error) });
            return;
        }
        // Re-establish global allMids subscription if there are price subscribers
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_priceSubscribers, "f").size > 0) {
            // Clear existing subscription reference (it's dead after reconnection)
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalAllMidsSubscription, undefined, "f");
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalAllMidsPromise, undefined, "f");
            // Re-establish the subscription
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureGlobalAllMidsSubscription).call(this);
            // Re-establish the fastAssetCtxs subscription alongside allMids (TAT-3387).
            // Clear fastAssetCtxsCoins so assetCtxs can serve prices in the gap
            // until the fresh post-reconnect snapshot re-establishes coverage.
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription, undefined, "f");
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsPromise, undefined, "f");
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_fastAssetCtxsCoins, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureGlobalFastAssetCtxsSubscription).call(this);
        }
        // Re-establish order fill subscriptions if there are fill subscribers
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscribers, "f").size > 0) {
            // Clear existing subscription references (they're dead after reconnection)
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscriptions, "f").clear();
            // Re-establish subscriptions for all accountIds with subscribers
            // Note: normalizedAccountId is 'default' for undefined, need to convert back
            const normalizedAccountIds = Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscribers, "f").keys());
            await Promise.all(normalizedAccountIds.map((normalizedAccountId) => {
                // Convert normalized key back to original accountId (undefined if 'default')
                const accountId = normalizedAccountId === 'default'
                    ? undefined
                    : normalizedAccountId;
                return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureOrderFillISubscription).call(this, accountId).catch(() => {
                    // Ignore errors during order fill subscription restoration
                });
            }));
        }
        // Re-establish user data subscriptions if there are user data subscribers
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscribers, "f").size > 0 ||
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscribers, "f").size > 0 ||
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscribers, "f").size > 0 ||
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_oiCapSubscribers, "f").size > 0) {
            // Clear existing subscription references (they're dead after reconnection)
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").clear();
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, undefined, "f");
            // Clear individual subscriptions (clearinghouseState + openOrders)
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").clear();
            // Re-establish the subscription (will use current account)
            // This sets up per-DEX clearinghouseState + openOrders subscriptions plus webData3 (OI caps only)
            await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureSharedWebData3Subscription).call(this);
        }
        // Re-establish activeAsset subscriptions if there are market data subscribers
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").size > 0) {
            // Clear existing subscriptions (they're dead after reconnection)
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").clear();
            // Clear reference counts to prevent double-counting after reconnection
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_symbolSubscriberCounts, "f").clear();
            // Re-establish subscriptions for all symbols with market data subscribers
            const symbolsNeedingMarketData = Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").keys());
            symbolsNeedingMarketData.forEach((symbol) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureActiveAssetSubscription).call(this, symbol);
            });
        }
        // Re-establish BBO subscriptions if there are order book subscribers
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookSubscribers, "f").size > 0) {
            // Clear existing subscriptions (they're dead after reconnection)
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").clear();
            // Re-establish subscriptions for all symbols with order book subscribers
            const symbolsNeedingOrderBook = Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookSubscribers, "f").keys());
            symbolsNeedingOrderBook.forEach((symbol) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureBboSubscription).call(this, symbol);
            });
        }
        // Re-establish assetCtxs subscriptions if there are market data subscribers
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").size > 0) {
            // Clear existing subscriptions (they're dead after reconnection)
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises, "f").clear();
            // Re-establish subscriptions for all DEXs with market data subscribers
            const dexsNeeded = new Set();
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").forEach((_subscribers, symbol) => {
                const { dex } = (0, hyperLiquidAdapter_js_1.parseAssetName)(symbol);
                if (dex) {
                    dexsNeeded.add(dex);
                }
            });
            // Add main DEX if any main DEX symbols have subscribers
            const hasMainDexSubscribers = Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").keys()).some((symbol) => {
                const { dex } = (0, hyperLiquidAdapter_js_1.parseAssetName)(symbol);
                return !dex;
            });
            if (hasMainDexSubscribers) {
                dexsNeeded.add('');
            }
            const marketDataRestoreOperations = Array.from(dexsNeeded).flatMap((dex) => {
                const operations = [
                    {
                        dex,
                        kind: 'assetCtxs',
                        promise: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureAssetCtxsSubscription).call(this, dex, {
                            incrementRefCount: false,
                        }),
                    },
                ];
                if (dex) {
                    operations.push({
                        dex,
                        kind: 'allMids',
                        promise: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureDexAllMidsSubscription).call(this, dex),
                    });
                }
                return operations;
            });
            const marketDataRestoreResults = await Promise.allSettled(marketDataRestoreOperations.map(({ promise }) => promise));
            const marketDataRestoreFailures = marketDataRestoreResults.flatMap((result, index) => {
                if (result.status === 'fulfilled') {
                    return [];
                }
                const operation = marketDataRestoreOperations[index];
                return [
                    {
                        ...operation,
                        error: (0, errorUtils_js_1.ensureError)(result.reason, 'HyperLiquidSubscriptionService.restoreSubscriptions'),
                    },
                ];
            });
            if (marketDataRestoreFailures.length > 0) {
                marketDataRestoreFailures.forEach(({ dex, kind }) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_scheduleRestoreRetry).call(this, dex, kind);
                });
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, new Error(`Failed to restore ${marketDataRestoreFailures.length} market data subscriptions`), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'restoreSubscriptions.marketData', {
                    failures: marketDataRestoreFailures.map(({ dex, kind, error }) => `${kind}:${dex || 'main'}:${error.message}`),
                }));
            }
        }
    }
    /**
     * Clear all subscriptions and cached data (multi-DEX support)
     */
    clearAll() {
        // Suppress error logging for pending unsubscribe requests during intentional disconnect.
        // The WebSocket will be closed after this, causing pending unsubscribe promises to reject
        // with WebSocketRequestError - these are expected and should not be logged to Sentry.
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_isClearing, true, "f");
        // Clear all local subscriber collections
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_priceSubscribers, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscribers, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscribers, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscribers, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscribers, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookSubscribers, "f").clear();
        // Clear order fill subscriptions
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscriptions, "f").forEach((subscription) => {
            subscription.unsubscribe().catch(() => {
                // Ignore errors during cleanup
            });
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscriptions, "f").clear();
        // Clear spotState subscriptions. Bump generation + drop in-flight
        // promises so any racing #ensureSpotStateSubscription continuation
        // unsubscribes its fresh sub instead of rehydrating the cleared map.
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration, "f") + 1, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionPromises, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptions, "f").forEach((subscription) => {
            subscription.unsubscribe().catch(() => {
                // Ignore errors during cleanup
            });
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptions, "f").clear();
        // Clear cached data
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPriceData, null, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_allMidsSnapshots, "f").clear();
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPositions, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedOrders, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedAccount, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedFills, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_ordersCacheInitialized, false, "f"); // Reset cache initialization flag
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_positionsCacheInitialized, false, "f"); // Reset cache initialization flag
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_fillsCacheInitialized, false, "f"); // Reset fills cache initialization flag
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataCache, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookCache, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_symbolSubscriberCounts, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").clear();
        // Clear hash caches
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPositionsHash, '', "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedOrdersHash, '', "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedAccountHash, '', "f");
        // Clear multi-DEX caches
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('HyperLiquidSubscriptionService: Clearing per-DEX caches', {
            dexPositionsCacheSize: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").size,
            dexOrdersCacheSize: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexOrdersCache, "f").size,
            dexAccountCacheSize: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").size,
            dexAssetCtxsCacheSize: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAssetCtxsCache, "f").size,
            dexPositionsCacheKeys: Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").keys()),
            dexAssetCtxsCacheKeys: Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAssetCtxsCache, "f").keys()),
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexOrdersCache, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").clear();
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedSpotState, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedSpotStateUserAddress, null, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeByUser, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeLastWsRefreshAtByUser, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").clear();
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStateGeneration, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateGeneration, "f") + 1, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStatePromise, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStatePromiseUserAddress, undefined, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAssetCtxsCache, "f").clear();
        // Unsubscribe all active subscriptions before clearing references.
        // Without this, orphaned subscriptions try to send unsubscribe frames
        // on the closing WebSocket, causing SOCKET_NOT_CONNECTED errors.
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalAllMidsSubscription, "f")) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalAllMidsSubscription, "f").unsubscribe().catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.globalAllMids'));
            });
        }
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalAllMidsSubscription, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalAllMidsPromise, undefined, "f");
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription, "f")) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription, "f")
                .unsubscribe()
                .catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.globalFastAssetCtxs'));
            });
        }
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsPromise, undefined, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_fastAssetCtxsCoins, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").forEach((sub, symbol) => {
            sub.unsubscribe().catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.activeAsset', { symbol }));
            });
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").forEach((sub, symbol) => {
            sub.unsubscribe().catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.bbo', { symbol }));
            });
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").forEach((sub, dexName) => {
            sub.unsubscribe().catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.webData3', { dex: dexName }));
            });
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").clear();
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, undefined, "f");
        // HIP-3: Clear assetCtxs subscriptions
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, "f").forEach((sub, dexName) => {
            sub.unsubscribe().catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.assetCtxs', { dex: dexName }));
            });
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises, "f").clear();
        // HIP-3: Clear per-DEX allMids subscriptions
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, "f").forEach((sub, dexName) => {
            sub.unsubscribe().catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.dexAllMids', { dex: dexName }));
            });
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_restoreRetryTimeouts, "f").forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_restoreRetryTimeouts, "f").clear();
        // Cleanup individual subscriptions (clearinghouseState + openOrders)
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").forEach((subscription, dexName) => {
                subscription.unsubscribe().catch((error) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.clearinghouseState', {
                        dex: dexName,
                    }));
                });
            });
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").clear();
        }
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").forEach((subscription, dexName) => {
                subscription.unsubscribe().catch((error) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.clearAll'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'clearAll.openOrders', {
                        dex: dexName,
                    }));
                });
            });
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").clear();
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('HyperLiquid: Subscription service cleared (multi-DEX with individual subscriptions)', {
            timestamp: new Date().toISOString(),
        });
    }
}
exports.HyperLiquidSubscriptionService = HyperLiquidSubscriptionService;
_a = HyperLiquidSubscriptionService, _HyperLiquidSubscriptionService_clientService = new WeakMap(), _HyperLiquidSubscriptionService_walletService = new WeakMap(), _HyperLiquidSubscriptionService_hip3Enabled = new WeakMap(), _HyperLiquidSubscriptionService_enabledDexs = new WeakMap(), _HyperLiquidSubscriptionService_allowlistMarkets = new WeakMap(), _HyperLiquidSubscriptionService_blocklistMarkets = new WeakMap(), _HyperLiquidSubscriptionService_priceDeviationLimit = new WeakMap(), _HyperLiquidSubscriptionService_discoverEnabledDexs = new WeakMap(), _HyperLiquidSubscriptionService_discoveredDexNames = new WeakMap(), _HyperLiquidSubscriptionService_dexDiscoveryPromise = new WeakMap(), _HyperLiquidSubscriptionService_dexDiscoveryResolver = new WeakMap(), _HyperLiquidSubscriptionService_expectedDexs = new WeakMap(), _HyperLiquidSubscriptionService_initializedDexs = new WeakMap(), _HyperLiquidSubscriptionService_priceSubscribers = new WeakMap(), _HyperLiquidSubscriptionService_positionSubscribers = new WeakMap(), _HyperLiquidSubscriptionService_orderFillSubscribers = new WeakMap(), _HyperLiquidSubscriptionService_orderSubscribers = new WeakMap(), _HyperLiquidSubscriptionService_accountSubscribers = new WeakMap(), _HyperLiquidSubscriptionService_marketDataSubscribers = new WeakMap(), _HyperLiquidSubscriptionService_orderBookSubscribers = new WeakMap(), _HyperLiquidSubscriptionService_globalAllMidsSubscription = new WeakMap(), _HyperLiquidSubscriptionService_globalAllMidsPromise = new WeakMap(), _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription = new WeakMap(), _HyperLiquidSubscriptionService_globalFastAssetCtxsPromise = new WeakMap(), _HyperLiquidSubscriptionService_fastAssetCtxsCoins = new WeakMap(), _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_pendingActiveAssetPromises = new WeakMap(), _HyperLiquidSubscriptionService_globalBboSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_pendingBboPromises = new WeakMap(), _HyperLiquidSubscriptionService_orderFillSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_spotStateSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_spotStateSubscriptionPromises = new WeakMap(), _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration = new WeakMap(), _HyperLiquidSubscriptionService_symbolSubscriberCounts = new WeakMap(), _HyperLiquidSubscriptionService_dexSubscriberCounts = new WeakMap(), _HyperLiquidSubscriptionService_webData3Subscriptions = new WeakMap(), _HyperLiquidSubscriptionService_webData3SubscriptionPromise = new WeakMap(), _HyperLiquidSubscriptionService_positionSubscriberCount = new WeakMap(), _HyperLiquidSubscriptionService_orderSubscriberCount = new WeakMap(), _HyperLiquidSubscriptionService_accountSubscriberCount = new WeakMap(), _HyperLiquidSubscriptionService_oiCapSubscriberCount = new WeakMap(), _HyperLiquidSubscriptionService_dexPositionsCache = new WeakMap(), _HyperLiquidSubscriptionService_dexOrdersCache = new WeakMap(), _HyperLiquidSubscriptionService_dexAccountCache = new WeakMap(), _HyperLiquidSubscriptionService_cachedSpotState = new WeakMap(), _HyperLiquidSubscriptionService_abstractionModeByUser = new WeakMap(), _HyperLiquidSubscriptionService_abstractionModeLastWsRefreshAtByUser = new WeakMap(), _HyperLiquidSubscriptionService_abstractionModeInflightByUser = new WeakMap(), _HyperLiquidSubscriptionService_cachedSpotStateUserAddress = new WeakMap(), _HyperLiquidSubscriptionService_spotStatePromise = new WeakMap(), _HyperLiquidSubscriptionService_spotStatePromiseUserAddress = new WeakMap(), _HyperLiquidSubscriptionService_spotStateGeneration = new WeakMap(), _HyperLiquidSubscriptionService_cachedPositions = new WeakMap(), _HyperLiquidSubscriptionService_cachedOrders = new WeakMap(), _HyperLiquidSubscriptionService_cachedAccount = new WeakMap(), _HyperLiquidSubscriptionService_ordersCacheInitialized = new WeakMap(), _HyperLiquidSubscriptionService_positionsCacheInitialized = new WeakMap(), _HyperLiquidSubscriptionService_oiCapSubscribers = new WeakMap(), _HyperLiquidSubscriptionService_cachedOICaps = new WeakMap(), _HyperLiquidSubscriptionService_cachedOICapsHash = new WeakMap(), _HyperLiquidSubscriptionService_oiCapsCacheInitialized = new WeakMap(), _HyperLiquidSubscriptionService_cachedPriceData = new WeakMap(), _HyperLiquidSubscriptionService_allMidsSnapshots = new WeakMap(), _HyperLiquidSubscriptionService_cachedFills = new WeakMap(), _HyperLiquidSubscriptionService_fillsCacheInitialized = new WeakMap(), _HyperLiquidSubscriptionService_assetCtxsSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_dexAssetCtxsCache = new WeakMap(), _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises = new WeakMap(), _HyperLiquidSubscriptionService_dexAllMidsSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises = new WeakMap(), _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_openOrdersSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_pendingClearinghouseSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_pendingOpenOrdersSubscriptions = new WeakMap(), _HyperLiquidSubscriptionService_dexMetaCache = new WeakMap(), _HyperLiquidSubscriptionService_orderBookCache = new WeakMap(), _HyperLiquidSubscriptionService_marketDataCache = new WeakMap(), _HyperLiquidSubscriptionService_isClearing = new WeakMap(), _HyperLiquidSubscriptionService_restoreRetryTimeouts = new WeakMap(), _HyperLiquidSubscriptionService_deps = new WeakMap(), _HyperLiquidSubscriptionService_cachedPositionsHash = new WeakMap(), _HyperLiquidSubscriptionService_cachedOrdersHash = new WeakMap(), _HyperLiquidSubscriptionService_cachedAccountHash = new WeakMap(), _HyperLiquidSubscriptionService_instances = new WeakSet(), _HyperLiquidSubscriptionService_logErrorUnlessClearing = function _HyperLiquidSubscriptionService_logErrorUnlessClearing(error, context) {
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_isClearing, "f")) {
        return;
    }
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_isTransientSdkError).call(this, error)) {
        // Expected SDK lifecycle: reconnect churn, intentional terminations, or
        // request-side aborts. Forwarding these to Sentry pollutes the error
        // budget with handled events the SDK already recovers from. Keep them
        // visible locally via debugLogger for diagnosis.
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`[Perps transient SDK error] ${context?.context?.data?.method ?? 'unknown'}: ${error.message}`);
        return;
    }
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").logger.error(error, context);
}, _HyperLiquidSubscriptionService_isTransientSdkError = function _HyperLiquidSubscriptionService_isTransientSdkError(error) {
    const ensuredError = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.isTransientSdkError');
    const connectionState = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getConnectionState?.();
    const messageParts = [
        ensuredError.message,
        error instanceof Error ? error.name : '',
        typeof error === 'string' ? error : '',
        String(error),
    ]
        .join(' ')
        .toLowerCase();
    const isReconnectChurn = connectionState === index_js_1.WebSocketConnectionState.Connecting ||
        connectionState === index_js_1.WebSocketConnectionState.Disconnected;
    return (messageParts.includes('websocketrequesterror') ||
        messageParts.includes('unknown error while making a websocket request') ||
        messageParts.includes('reconnectingwebsocketerror') ||
        (messageParts.includes('timeouterror') &&
            messageParts.includes('signal timed out')) ||
        (isReconnectChurn &&
            (messageParts.includes('unknown error (no details provided)') ||
                messageParts.includes('undefined'))));
}, _HyperLiquidSubscriptionService_scheduleRestoreRetry = function _HyperLiquidSubscriptionService_scheduleRestoreRetry(dex, kind) {
    const retryKey = `${kind}:${dex}`;
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_isClearing, "f") || __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_restoreRetryTimeouts, "f").has(retryKey)) {
        return;
    }
    const timeoutId = setTimeout(() => {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_restoreRetryTimeouts, "f").delete(retryKey);
        const retryPromise = kind === 'assetCtxs'
            ? __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureAssetCtxsSubscription).call(this, dex, {
                incrementRefCount: false,
            })
            : __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureDexAllMidsSubscription).call(this, dex);
        retryPromise.catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.restoreSubscriptions.retry'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'restoreSubscriptions.retry', {
                dex,
                kind,
            }));
        });
    }, 1000);
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_restoreRetryTimeouts, "f").set(retryKey, timeoutId);
}, _HyperLiquidSubscriptionService_getErrorContext = function _HyperLiquidSubscriptionService_getErrorContext(method, extra) {
    return {
        tags: {
            feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
            provider: 'hyperliquid',
            network: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").isTestnetMode() ? 'testnet' : 'mainnet',
        },
        context: {
            name: 'HyperLiquidSubscriptionService',
            data: {
                method,
                ...extra,
            },
        },
    };
}, _HyperLiquidSubscriptionService_isDexEnabled = function _HyperLiquidSubscriptionService_isDexEnabled(dex) {
    if (dex === null) {
        return true; // Main DEX always enabled
    }
    if (!__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_hip3Enabled, "f")) {
        return false; // HIP-3 disabled entirely
    }
    return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_enabledDexs, "f").includes(dex);
}, _HyperLiquidSubscriptionService_waitForDexDiscovery = 
/**
 * Wait for DEX discovery to complete (with timeout)
 * Used when HIP-3 is enabled but enabledDexs hasn't been populated yet.
 * This allows subscriptions to wait for DEX discovery before creating per-DEX subscriptions.
 *
 * @param timeoutMs - The maximum time in milliseconds to wait for DEX discovery.
 */
async function _HyperLiquidSubscriptionService_waitForDexDiscovery(timeoutMs = 5000) {
    // Already have DEXs, no need to wait
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_enabledDexs, "f").length > 0) {
        return;
    }
    // Create promise if not exists
    if (!__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexDiscoveryPromise, "f")) {
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_dexDiscoveryPromise, new Promise((resolve) => {
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_dexDiscoveryResolver, resolve, "f");
        }), "f");
    }
    const discovery = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_discoverEnabledDexs, "f")
        ? __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_discoverEnabledDexs, "f").call(this)
            .then((enabledDexs) => {
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_enabledDexs, enabledDexs, "f");
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_discoveredDexNames, enabledDexs, "f");
            return undefined;
        })
            .catch(() => __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexDiscoveryPromise, "f") ?? Promise.resolve())
        : __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexDiscoveryPromise, "f");
    // Wait with timeout
    let timeoutId;
    const timeoutPromise = new Promise((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('DEX discovery timeout')), timeoutMs);
    });
    try {
        await Promise.race([discovery, timeoutPromise]);
    }
    catch {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('DEX discovery wait timed out, proceeding with main DEX only');
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}, _HyperLiquidSubscriptionService_hashPositions = function _HyperLiquidSubscriptionService_hashPositions(positions) {
    if (!positions || positions.length === 0) {
        return '0';
    }
    return positions
        .map((pos) => `${pos.symbol}:${pos.size}:${pos.entryPrice}:${pos.leverage.value}:${pos.takeProfitPrice ?? ''}:${pos.stopLossPrice ?? ''}:${pos.takeProfitCount}:${pos.stopLossCount}:${pos.unrealizedPnl}:${pos.returnOnEquity}:${pos.liquidationPrice ?? ''}:${pos.marginUsed || ''}:${
    // Trigger arrays are part of the emitted shape, so a standalone or
    // partial trigger appearing/disappearing has to change the hash —
    // otherwise subscribers never receive the updated arrays.
    (0, orderTypes_js_1.hashTriggerOrders)(pos.takeProfitOrders)}:${(0, orderTypes_js_1.hashTriggerOrders)(pos.stopLossOrders)}`)
        .join('|');
}, _HyperLiquidSubscriptionService_hashOrders = function _HyperLiquidSubscriptionService_hashOrders(orders) {
    if (!orders || orders.length === 0) {
        return '0';
    }
    return orders
        .map((ord) => `${ord.symbol}:${ord.side}:${ord.size}:${ord.price}:${ord.orderType}`)
        .join('|');
}, _HyperLiquidSubscriptionService_hashAccountState = function _HyperLiquidSubscriptionService_hashAccountState(account) {
    return `${account.spendableBalance}:${account.withdrawableBalance}:${account.totalBalance}:${account.marginUsed}:${account.unrealizedPnl}`;
}, _HyperLiquidSubscriptionService_extractTPSLFromOrders = function _HyperLiquidSubscriptionService_extractTPSLFromOrders(orders, positions, cachedProcessedOrders) {
    const tpslMap = new Map();
    const tpslCountMap = new Map();
    // Complete per-symbol trigger order view, including quantity-scoped (partial)
    // TP/SL orders that the scalar tpslMap prices cannot represent.
    const triggerOrderMap = new Map();
    const addTriggerOrder = (symbol, triggerOrder) => {
        if (!triggerOrder) {
            return;
        }
        const existing = triggerOrderMap.get(symbol) ?? {
            takeProfitOrders: [],
            stopLossOrders: [],
        };
        if (triggerOrder.direction === 'take_profit') {
            existing.takeProfitOrders.push(triggerOrder);
        }
        else {
            existing.stopLossOrders.push(triggerOrder);
        }
        triggerOrderMap.set(symbol, existing);
    };
    // If cached processed orders provided, extract TP/SL from them directly
    if (cachedProcessedOrders) {
        // Hoisted out of the per-order loop: this runs on every order-update tick.
        const positionsBySymbol = new Map(positions.map((position) => [position.symbol, position]));
        cachedProcessedOrders.forEach((order) => {
            // Use triggerPrice for TP/SL (trigger condition price), falling back to price
            // This ensures consistency with raw SDK order processing which uses triggerPx
            const tpslPrice = order.triggerPrice ?? order.price;
            // Collected before the position-bound filter below: partial TP/SL orders
            // are standalone (not position-bound) and still belong to this view.
            // A trigger that is another order's child does not — same rule as the
            // REST path in HyperLiquidProvider.getPositions.
            if (order.isTrigger && order.reduceOnly && !order.parentOrderId) {
                addTriggerOrder(order.symbol, (0, orderTypes_js_1.buildPositionTriggerOrderFromOrder)({
                    order,
                    positionSize: positionsBySymbol.get(order.symbol)?.size ?? '0',
                    entryPrice: positionsBySymbol.get(order.symbol)?.entryPrice,
                }));
            }
            if (order.isTrigger && tpslPrice) {
                // When UsePositionBoundTpsl is enabled, only position-bound TP/SL orders
                // should be shown on positions — skip normalTpsl children of limit orders
                if (perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl &&
                    order.isPositionTpsl !== true) {
                    return;
                }
                const isTakeProfit = order.detailedOrderType?.includes('Take Profit');
                const isStop = order.detailedOrderType?.includes('Stop');
                const matchingPosition = positions.find((pos) => pos.symbol === order.symbol);
                // Determine TP vs SL classification for count and price updates
                // Use order type first, fallback to price-based detection for ambiguous 'Trigger' types
                let classifiedAsTakeProfit = isTakeProfit;
                let classifiedAsStop = isStop;
                if (!isTakeProfit && !isStop && matchingPosition) {
                    // Fallback: determine based on trigger price vs entry price
                    // This handles orders with ambiguous type 'Trigger'
                    const triggerPrice = parseFloat(tpslPrice);
                    const entryPrice = parseFloat(matchingPosition.entryPrice || '0');
                    const isLong = parseFloat(matchingPosition.size) > 0;
                    if (isLong) {
                        if (triggerPrice > entryPrice) {
                            classifiedAsTakeProfit = true;
                        }
                        else {
                            classifiedAsStop = true;
                        }
                    }
                    else if (triggerPrice < entryPrice) {
                        classifiedAsTakeProfit = true;
                    }
                    else {
                        classifiedAsStop = true;
                    }
                }
                const currentTakeProfitCount = tpslCountMap.get(order.symbol)?.takeProfitCount ?? 0;
                const currentStopLossCount = tpslCountMap.get(order.symbol)?.stopLossCount ?? 0;
                tpslCountMap.set(order.symbol, {
                    takeProfitCount: classifiedAsTakeProfit
                        ? currentTakeProfitCount + 1
                        : currentTakeProfitCount,
                    stopLossCount: classifiedAsStop
                        ? currentStopLossCount + 1
                        : currentStopLossCount,
                });
                if (matchingPosition) {
                    const existing = tpslMap.get(order.symbol) ?? {};
                    if (classifiedAsTakeProfit) {
                        existing.takeProfitPrice = tpslPrice;
                    }
                    else if (classifiedAsStop) {
                        existing.stopLossPrice = tpslPrice;
                    }
                    tpslMap.set(order.symbol, existing);
                }
            }
        });
        return {
            tpslMap,
            tpslCountMap,
            triggerOrderMap,
            processedOrders: cachedProcessedOrders,
        };
    }
    // Process raw SDK orders
    const processedOrders = [];
    // TP/SL children of a pending parent order are listed both nested under the
    // parent and as top-level entries. Map each child back to its parent so the
    // converted order carries the link and the position trigger view can exclude
    // them: they protect that order, not a position.
    const parentIdByChildId = new Map();
    orders.forEach((order) => {
        order.children?.forEach((child) => {
            parentIdByChildId.set(child.oid, order.oid);
        });
    });
    orders.forEach((order) => {
        let position;
        let positionForCoin;
        const matchPositionToTpsl = (pos) => {
            if (perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl) {
                return (pos.symbol === order.coin &&
                    order.reduceOnly &&
                    order.isPositionTpsl);
            }
            return (pos.symbol === order.coin &&
                Math.abs(parseFloat(order.sz)) >= Math.abs(parseFloat(pos.size)));
        };
        const matchPositionToCoin = (pos) => pos.symbol === order.coin;
        // Process trigger orders for TP/SL extraction
        if (order.triggerPx) {
            const isTakeProfit = order.orderType?.includes('Take Profit');
            const isStop = order.orderType?.includes('Stop');
            const { coin } = order;
            position = positions.find(matchPositionToTpsl);
            positionForCoin = positions.find(matchPositionToCoin);
            // Determine TP vs SL classification for count and price updates
            // Use order type first, fallback to price-based detection for ambiguous 'Trigger' types
            // This matches the cached order processing logic for consistency
            let classifiedAsTakeProfit = isTakeProfit;
            let classifiedAsStop = isStop;
            if (!isTakeProfit && !isStop && position) {
                // Fallback: determine based on trigger price vs entry price
                // This handles orders with ambiguous type 'Trigger'
                const triggerPrice = parseFloat(order.triggerPx);
                const entryPrice = parseFloat(position.entryPrice || '0');
                const isLong = parseFloat(position.size) > 0;
                if (isLong) {
                    if (triggerPrice > entryPrice) {
                        classifiedAsTakeProfit = true;
                    }
                    else {
                        classifiedAsStop = true;
                    }
                }
                else if (triggerPrice < entryPrice) {
                    classifiedAsTakeProfit = true;
                }
                else {
                    classifiedAsStop = true;
                }
            }
            const currentTakeProfitCount = tpslCountMap.get(coin)?.takeProfitCount ?? 0;
            const currentStopLossCount = tpslCountMap.get(coin)?.stopLossCount ?? 0;
            tpslCountMap.set(coin, {
                takeProfitCount: classifiedAsTakeProfit
                    ? currentTakeProfitCount + 1
                    : currentTakeProfitCount,
                stopLossCount: classifiedAsStop
                    ? currentStopLossCount + 1
                    : currentStopLossCount,
            });
            if (position) {
                const existing = tpslMap.get(coin) ?? {};
                // Use classified values for price assignment (consistent with count logic)
                if (classifiedAsTakeProfit) {
                    existing.takeProfitPrice = order.triggerPx;
                }
                else if (classifiedAsStop) {
                    existing.stopLossPrice = order.triggerPx;
                }
                tpslMap.set(coin, existing);
            }
        }
        // Convert ALL open orders to Order format
        const convertedOrder = (0, hyperLiquidAdapter_js_1.adaptOrderFromSDK)(order, position ?? positionForCoin);
        const parentOrderId = parentIdByChildId.get(order.oid);
        if (parentOrderId !== undefined) {
            convertedOrder.parentOrderId = parentOrderId.toString();
        }
        processedOrders.push(convertedOrder);
        if (convertedOrder.isTrigger &&
            convertedOrder.reduceOnly &&
            !convertedOrder.parentOrderId) {
            addTriggerOrder(convertedOrder.symbol, (0, orderTypes_js_1.buildPositionTriggerOrderFromOrder)({
                order: convertedOrder,
                positionSize: (position ?? positionForCoin)?.size ?? '0',
                entryPrice: (position ?? positionForCoin)?.entryPrice,
            }));
        }
    });
    return { tpslMap, tpslCountMap, triggerOrderMap, processedOrders };
}, _HyperLiquidSubscriptionService_mergeTPSLIntoPositions = function _HyperLiquidSubscriptionService_mergeTPSLIntoPositions(positions, tpslMap, tpslCountMap, triggerOrderMap) {
    return positions.map((position) => {
        const tpsl = tpslMap.get(position.symbol) ?? {};
        const tpslCount = tpslCountMap.get(position.symbol) ?? {};
        const triggerOrders = triggerOrderMap?.get(position.symbol);
        const takeProfitOrders = triggerOrders?.takeProfitOrders ?? [];
        const stopLossOrders = triggerOrders?.stopLossOrders ?? [];
        return {
            ...position,
            takeProfitPrice: tpsl.takeProfitPrice ?? undefined,
            stopLossPrice: tpsl.stopLossPrice ?? undefined,
            // Counts come from the same arrays as the REST path, so both transports
            // report one definition. Orders whose placement type the exchange did
            // not name (HyperLiquid's ambiguous 'Trigger') are absent from both,
            // where the legacy count included them.
            // Keyed on the map, not on this symbol's entry: a symbol with no
            // entry has no triggers, and falling back to the legacy count there
            // would report a count beside an empty array.
            takeProfitCount: triggerOrderMap
                ? takeProfitOrders.length
                : (tpslCount.takeProfitCount ?? 0),
            stopLossCount: triggerOrderMap
                ? stopLossOrders.length
                : (tpslCount.stopLossCount ?? 0),
            takeProfitOrders,
            stopLossOrders,
        };
    });
}, _HyperLiquidSubscriptionService_aggregateAccountStates = function _HyperLiquidSubscriptionService_aggregateAccountStates() {
    const subAccountBreakdown = {};
    let totalSpendableBalance = 0;
    let totalWithdrawableBalance = 0;
    let totalBalance = 0;
    let totalMarginUsed = 0;
    let totalUnrealizedPnl = 0;
    // Collect account states for weighted ROE calculation
    const accountStatesForROE = [];
    // Aggregate all cached account states
    Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").entries()).forEach(([currentDex, state]) => {
        const dexKey = currentDex === '' ? 'main' : currentDex;
        subAccountBreakdown[dexKey] = {
            spendableBalance: state.spendableBalance,
            withdrawableBalance: state.withdrawableBalance,
            totalBalance: state.totalBalance,
        };
        totalSpendableBalance += parseFloat(state.spendableBalance);
        totalWithdrawableBalance += parseFloat(state.withdrawableBalance);
        totalBalance += parseFloat(state.totalBalance);
        totalMarginUsed += parseFloat(state.marginUsed);
        totalUnrealizedPnl += parseFloat(state.unrealizedPnl);
        // Collect data for weighted ROE calculation
        accountStatesForROE.push({
            unrealizedPnl: state.unrealizedPnl,
            returnOnEquity: state.returnOnEquity,
        });
    });
    // Use first DEX's account state as base and override aggregated values
    const firstDexAccount = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").values().next().value ?? {};
    // Calculate weighted returnOnEquity across all DEXs
    const returnOnEquity = (0, accountUtils_js_1.calculateWeightedReturnOnEquity)(accountStatesForROE);
    return (0, accountUtils_js_1.addSpotBalanceToAccountState)({
        ...firstDexAccount,
        spendableBalance: totalSpendableBalance.toString(),
        withdrawableBalance: totalWithdrawableBalance.toString(),
        totalBalance: totalBalance.toString(),
        marginUsed: totalMarginUsed.toString(),
        unrealizedPnl: totalUnrealizedPnl.toString(),
        subAccountBreakdown,
        returnOnEquity,
    }, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedSpotState, "f"), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getSpotBalanceOptions).call(this));
}, _HyperLiquidSubscriptionService_getAbstractionModeForUser = function _HyperLiquidSubscriptionService_getAbstractionModeForUser(userAddress) {
    if (!userAddress) {
        return null;
    }
    return __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeByUser, "f").get(userAddress.toLowerCase()) ?? null;
}, _HyperLiquidSubscriptionService_getSpotBalanceOptions = function _HyperLiquidSubscriptionService_getSpotBalanceOptions() {
    return {
        foldIntoCollateral: (0, hyperliquid_types_js_1.hyperLiquidModeFoldsSpot)(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getAbstractionModeForUser).call(this, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedSpotStateUserAddress, "f"))),
    };
}, _HyperLiquidSubscriptionService_refreshAbstractionModeThrottled = 
/**
 * Fetch userAbstraction and update the cache, throttled so the long-lived
 * spotState WebSocket can trigger a background refresh on every tick
 * without burning REST quota. Handles HL-web mode flips propagating back
 * to mobile without requiring a restart or account switch.
 *
 * Concurrent callers share the same in-flight promise so an in-flight
 * fetch (especially a slow-failing one) doesn't ratchet the throttle
 * forward on every WS tick and leave mode stale during a network hang.
 *
 * @param userAddress - Current user address to refresh the cache for.
 * @returns Promise that resolves once the refresh completes (or immediately when throttled).
 */
async function _HyperLiquidSubscriptionService_refreshAbstractionModeThrottled(userAddress) {
    const normalizedUser = userAddress.toLowerCase();
    const existing = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").get(normalizedUser);
    if (existing) {
        await existing;
        return undefined;
    }
    const now = Date.now();
    const lastWsRefreshAt = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeLastWsRefreshAtByUser, "f").get(normalizedUser) ?? 0;
    if (now - lastWsRefreshAt < perpsConfig_js_1.ABSTRACTION_MODE_REFRESH_THROTTLE_MS) {
        return undefined;
    }
    const inflight = (async () => {
        try {
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getInfoClient();
            const mode = await infoClient.userAbstraction({ user: userAddress });
            const previousMode = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeByUser, "f").get(normalizedUser) ?? null;
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeByUser, "f").set(normalizedUser, mode);
            // Set timestamp only on success; a hanging/failed fetch must not
            // ratchet the throttle window forward (which would silence every
            // subsequent spot WS tick for the full throttle duration).
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeLastWsRefreshAtByUser, "f").set(normalizedUser, Date.now());
            // If the fold semantics actually changed for this user, trigger a
            // re-aggregation so balance-dependent UI (withdraw cap, order-entry
            // validation) picks up the new mode immediately — otherwise a
            // Unified→Standard flip can stay folded with old semantics until the
            // next spot/account event happens to arrive.
            const foldChanged = (0, hyperliquid_types_js_1.hyperLiquidModeFoldsSpot)(previousMode) !==
                (0, hyperliquid_types_js_1.hyperLiquidModeFoldsSpot)(mode);
            if (foldChanged && __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").size > 0) {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers).call(this);
            }
        }
        catch (error) {
            // Non-fatal — preserve the last known mode for this user. Leave
            // timestamp at its previous value so a genuine retry on the next
            // WS tick is allowed (no forward ratchet on slow failures). Route
            // through the shared Sentry helper so repeated failures become
            // visible on the perps ops dashboard (consistent with other async
            // boundary errors in this file, e.g. #refreshSpotState).
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.refreshAbstractionModeThrottled'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'refreshAbstractionModeThrottled', {
                user: normalizedUser,
            }));
        }
    })();
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").set(normalizedUser, inflight);
    try {
        await inflight;
    }
    finally {
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").get(normalizedUser) === inflight) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").delete(normalizedUser);
        }
    }
    return undefined;
}, _HyperLiquidSubscriptionService_ensureSpotState = async function _HyperLiquidSubscriptionService_ensureSpotState(accountId) {
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").getUserAddressWithDefault(accountId);
    const lowerUserAddress = userAddress.toLowerCase();
    // Fast-path only when we have spot for this user AND a resolved
    // abstraction mode. Without the mode, `#getSpotBalanceOptions` would
    // fall back to fail-closed (no fold), under-reporting Unified /
    // Portfolio Margin balances — force a refresh instead.
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedSpotState, "f") &&
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedSpotStateUserAddress, "f") === lowerUserAddress &&
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeByUser, "f").has(lowerUserAddress)) {
        return;
    }
    // Share an in-flight fetch only if it targets the same user.
    // A pending fetch for a different user is stale after an account switch —
    // start a fresh fetch; the stale one will self-discard via generation check.
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStatePromise, "f") &&
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStatePromiseUserAddress, "f") === userAddress) {
        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStatePromise, "f");
        return;
    }
    __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStateGeneration, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateGeneration, "f") + 1, "f");
    const generation = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateGeneration, "f");
    const promise = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_refreshSpotState).call(this, userAddress, generation);
    __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStatePromise, promise, "f");
    __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStatePromiseUserAddress, userAddress, "f");
    try {
        await promise;
    }
    finally {
        // Only clear tracker if we're still the latest in-flight fetch.
        // A newer fetch may have already replaced us.
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStatePromise, "f") === promise) {
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStatePromise, undefined, "f");
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStatePromiseUserAddress, undefined, "f");
        }
    }
}, _HyperLiquidSubscriptionService_refreshSpotState = async function _HyperLiquidSubscriptionService_refreshSpotState(userAddress, generation) {
    try {
        // Cold-start safety: getInfoClient() throws until the SDK has been
        // initialized via ensureSubscriptionClient. On a fresh service
        // instance subscribeToAccount can race ahead of the webData3 path,
        // so initialize here first — subsequent calls are no-ops.
        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
        // Don't bail here even if generation has bumped (e.g. WS spot snapshot
        // arrived while we awaited the subscription client). We still need to
        // resolve `userAbstraction` for this user — the mode is user-keyed,
        // independent of the spot generation, and the post-fetch path below
        // correctly handles the generation-changed case (seal + re-aggregate
        // instead of overwriting WS spot).
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getInfoClient({ useHttp: true });
        const lowerUserAddress = userAddress.toLowerCase();
        // Fetch spot state + abstraction mode in parallel — mode decides
        // whether the spot fold applies in addSpotBalanceToAccountState.
        // Register the userAbstraction call in `#abstractionModeInflightByUser`
        // so a concurrent WS-driven `#refreshAbstractionModeThrottled` awaits
        // this fetch instead of duplicating the REST round-trip.
        const abstractionFetch = infoClient.userAbstraction({
            user: userAddress,
        });
        const trackedAbstraction = abstractionFetch.then(() => undefined, () => undefined);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").set(lowerUserAddress, trackedAbstraction);
        const [spotResult, abstractionResult] = await Promise.allSettled([
            infoClient.spotClearinghouseState({ user: userAddress }),
            abstractionFetch,
        ]);
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").get(lowerUserAddress) ===
            trackedAbstraction) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").delete(lowerUserAddress);
        }
        // Record the abstraction mode regardless of generation. The mode is
        // user-keyed (independent of the spot snapshot generation) so a WS
        // push that bumped generation while we awaited cannot make this
        // result wrong for this user. Discarding it would strand
        // Unified / Portfolio Margin users at fail-closed until another
        // subscribe runs — exactly the race the WS-vs-REST guard creates.
        if (abstractionResult.status === 'fulfilled') {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeByUser, "f").set(lowerUserAddress, abstractionResult.value);
        }
        else {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('User abstraction fetch failed during spot refresh; spot fold disabled until the mode resolves', {
                error: (0, errorUtils_js_1.ensureError)(abstractionResult.reason, 'HyperLiquidSubscriptionService.refreshSpotState.abstraction').message,
            });
        }
        if (generation !== __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateGeneration, "f")) {
            // A WS push superseded our spot snapshot. The earlier WS-driven
            // aggregation ran with a null mode (fail-closed), so subscribers
            // may currently be under-reported. If we just resolved the mode
            // for the user whose spot is cached (strict match — null cache
            // owner could mean cleanUp ran for a different user), re-aggregate
            // now so the active subscribers immediately see the correct fold.
            if (abstractionResult.status === 'fulfilled' &&
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedSpotState, "f") &&
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedSpotStateUserAddress, "f") === lowerUserAddress) {
                if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").size > 0) {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers).call(this);
                }
            }
            return;
        }
        if (spotResult.status === 'rejected') {
            throw spotResult.reason;
        }
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedSpotState, spotResult.value, "f");
        // Always record the spot owner so subsequent #ensureSpotState calls
        // and recovery branches can identify whose data is cached. Fast-path
        // eligibility is gated separately by #abstractionModeByUser.has(...);
        // a transient abstraction failure leaves the user out of the map and
        // the next #ensureSpotState retries both fetches.
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedSpotStateUserAddress, lowerUserAddress, "f");
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers).call(this);
        }
    }
    catch (error) {
        if (generation !== __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateGeneration, "f")) {
            return;
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.refreshSpotState'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'refreshSpotState'));
    }
}, _HyperLiquidSubscriptionService_ensureSpotStateSubscription = async function _HyperLiquidSubscriptionService_ensureSpotStateSubscription(accountId) {
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").getUserAddressWithDefault(accountId);
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptions, "f").has(userAddress)) {
        return;
    }
    const inFlight = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionPromises, "f").get(userAddress);
    if (inFlight) {
        await inFlight;
        return;
    }
    const startGeneration = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration, "f");
    const promise = (async () => {
        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
        const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
        if (!subscriptionClient) {
            throw new Error('SubscriptionClient not available');
        }
        const subscription = await subscriptionClient.spotState({ user: userAddress }, (event) => {
            try {
                if (event.user.toLowerCase() !== userAddress.toLowerCase()) {
                    return;
                }
                // Invalidate any in-flight REST refreshSpotState so it drops
                // its result instead of overwriting this fresher WS snapshot.
                __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStateGeneration, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateGeneration, "f") + 1, "f");
                __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedSpotState, event.spotState, "f");
                // Always record the spot owner so subsequent generation guards
                // and recovery branches can identify whose data is cached.
                // Fast-path eligibility is gated separately in #ensureSpotState
                // by checking #abstractionModeByUser.has(...).
                __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedSpotStateUserAddress, userAddress.toLowerCase(), "f");
                // Kick a throttled userAbstraction refresh so HL-web mode
                // flips (Unified → Standard or vice versa) propagate back to
                // mobile while the app stays open. Fire-and-forget: the
                // refresh updates the per-user abstraction-mode cache and the next
                // fold picks up the new value.
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_refreshAbstractionModeThrottled).call(this, event.user.toLowerCase()).catch(() => {
                    // Errors are logged inside the throttled refresh helper.
                });
                if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").size > 0) {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers).call(this);
                }
            }
            catch (error) {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.ensureSpotStateSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'spotState callback error', {
                    user: userAddress,
                }));
            }
        });
        // Discard if cleanup ran while we were awaiting the subscription
        // handshake; rehydrating #spotStateSubscriptions here would leave
        // a stale entry that short-circuits future resubscribe attempts.
        if (startGeneration !== __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration, "f")) {
            await subscription.unsubscribe().catch(() => undefined);
            return;
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptions, "f").set(userAddress, subscription);
    })();
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionPromises, "f").set(userAddress, promise);
    try {
        await promise;
    }
    finally {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionPromises, "f").delete(userAddress);
    }
}, _HyperLiquidSubscriptionService_ensureSharedWebData3Subscription = 
/**
 * Ensure shared webData3 subscription is active (singleton pattern with multi-DEX support)
 * webData3 provides data for all DEXs (main + HIP-3) in a single subscription
 *
 * @param accountId - Optional CAIP account ID to subscribe for.
 */
async function _HyperLiquidSubscriptionService_ensureSharedWebData3Subscription(accountId) {
    // Establish webData3 subscription (if not exists)
    if (!__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").has('')) {
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, "f")) {
            await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, "f");
        }
        else {
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createUserDataSubscription).call(this, accountId), "f");
            try {
                await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, "f");
            }
            catch (error) {
                __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, undefined, "f");
                throw error;
            }
        }
    }
    // Note: webData3 includes all DEX data, so no separate HIP-3 subscriptions needed
}, _HyperLiquidSubscriptionService_createUserDataSubscription = 
/**
 * Create WebSocket subscription for user data (positions, orders, account).
 *
 * Positions, orders, and account/spot balance are always delivered via
 * per-DEX `clearinghouseState` + `openOrders` subscriptions (sub-second
 * updates). webData3 is used only for OI caps extraction (not
 * latency-sensitive). The deprecated webData2 snapshot channel is no longer
 * used (TAT-3332).
 *
 * - HIP-3 disabled: subscribe to the main DEX only (`dexsToSubscribe = ['']`).
 * - HIP-3 enabled: subscribe to the main DEX plus each enabled HIP-3 DEX.
 *
 * webData3 provides perpDexStates[] array containing OI caps for all DEXs:
 * - Index 0: Main DEX (dexName = '')
 * - Index 1+: HIP-3 DEXs in order of enabledDexs array
 *
 * @param accountId - Optional CAIP account ID to subscribe for.
 * @returns A promise that resolves when the operation completes.
 */
async function _HyperLiquidSubscriptionService_createUserDataSubscription(accountId) {
    await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        throw new Error('Subscription client not initialized');
    }
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").getUserAddressWithDefault(accountId);
    const dexName = ''; // Use empty string as key for single subscription
    // Skip if subscription already exists
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").has(dexName)) {
        return undefined;
    }
    // Wait for DEX discovery if HIP-3 is enabled but DEXs haven't been discovered yet
    // This ensures HIP-3 subscriptions are created together with main DEX
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_hip3Enabled, "f") && __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_enabledDexs, "f").length === 0) {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('Waiting for DEX discovery before creating subscriptions...');
        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_waitForDexDiscovery).call(this);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('DEX discovery complete, proceeding with subscriptions', {
            enabledDexs: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_enabledDexs, "f"),
        });
    }
    return new Promise((resolve, reject) => {
        // Use per-DEX clearinghouseState + openOrders subscriptions for
        // positions/orders/account on every path. webData3 is used only for OI
        // caps extraction. The deprecated webData2 channel is no longer used.
        // Determine which DEXs to subscribe to:
        // - HIP-3 enabled: main DEX + each enabled HIP-3 DEX.
        // - HIP-3 disabled: main DEX only.
        const dexsToSubscribe = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_hip3Enabled, "f")
            ? [
                '',
                ...__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_enabledDexs, "f").filter((dexId) => __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_isDexEnabled).call(this, dexId)),
            ]
            : [''];
        // Track expected DEXs for synchronized notifications
        // Clear previous tracking and set new expected DEXs
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_expectedDexs, new Set(dexsToSubscribe), "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_initializedDexs, new Set(), "f");
        // Set up individual subscriptions for each DEX
        const subscriptionPromises = [];
        for (const currentDexName of dexsToSubscribe) {
            // Set up clearinghouseState subscription for positions + account
            subscriptionPromises.push(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureClearinghouseStateSubscription).call(this, userAddress, currentDexName));
            // Set up openOrders subscription for orders
            subscriptionPromises.push(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureOpenOrdersSubscription).call(this, userAddress, currentDexName));
        }
        // Also set up webData3 for OI caps only
        const webData3Promise = subscriptionClient
            .webData3({ user: userAddress }, (data) => {
            try {
                // webData3 is ONLY used for OI caps extraction
                // Positions, orders, and account data come from individual subscriptions
                const allOICaps = [];
                data.perpDexStates.forEach((dexState, index) => {
                    // Map webData3 index to DEX name
                    // Index 0 = main DEX (null), Index 1+ = HIP-3 DEXs from discoveredDexNames
                    const dexIdentifier = index === 0 ? null : __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_discoveredDexNames, "f")[index - 1];
                    // Skip unknown DEXs (not in discoveredDexNames) to prevent main DEX cache corruption
                    if (index > 0 && dexIdentifier === undefined) {
                        return; // Unknown DEX - skip to prevent misidentifying as main DEX
                    }
                    // Only process DEXs we care about (skip others silently)
                    if (!__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_isDexEnabled).call(this, dexIdentifier ?? null)) {
                        return; // Skip this DEX - not enabled in our configuration
                    }
                    const currentDexName = dexIdentifier ?? '';
                    const oiCaps = dexState.perpsAtOpenInterestCap ?? [];
                    // Add DEX prefix for HIP-3 symbols (e.g., "xyz:TSLA")
                    if (currentDexName) {
                        allOICaps.push(...oiCaps.map((symbol) => `${currentDexName}:${symbol}`));
                    }
                    else {
                        // Main DEX - no prefix needed
                        allOICaps.push(...oiCaps);
                    }
                });
                // Update OI caps cache and notify if changed
                const oiCapsHash = [...allOICaps]
                    .sort((a, b) => a.localeCompare(b))
                    .join(',');
                if (oiCapsHash !== __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOICapsHash, "f")) {
                    __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedOICaps, allOICaps, "f");
                    __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedOICapsHash, oiCapsHash, "f");
                    __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_oiCapsCacheInitialized, true, "f");
                    // Notify all subscribers
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_oiCapSubscribers, "f").forEach((callback) => callback(allOICaps));
                }
            }
            catch (error) {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createUserDataSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'webData3 callback error', {
                    user: userAddress,
                    hasPerpDexStates: data?.perpDexStates !== undefined,
                    perpDexStatesLength: data?.perpDexStates?.length ?? 0,
                }));
            }
        })
            .then((sub) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").set(dexName, sub);
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`webData3 subscription established for OI caps (main + HIP-3)`);
            return undefined;
        })
            .catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createUserDataSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'createUserDataSubscription (webData3)', {
                dex: dexName,
            }));
            throw error;
        });
        subscriptionPromises.push(webData3Promise);
        // Wait for all subscriptions to be established
        Promise.all(subscriptionPromises)
            .then(() => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`User data subscriptions established for ${dexsToSubscribe.length} DEX(s)`);
            resolve();
            return undefined;
        })
            .catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createUserDataSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'createUserDataSubscription', {
                dexs: dexsToSubscribe,
            }));
            reject((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createUserDataSubscription'));
        });
    });
}, _HyperLiquidSubscriptionService_ensureClearinghouseStateSubscription = 
/**
 * Ensure clearinghouseState subscription exists for a DEX
 * Uses pending promise tracking to prevent race conditions where multiple
 * concurrent calls could create duplicate subscriptions
 *
 * @param userAddress - The user's wallet address.
 * @param dexName - The DEX identifier (empty string for main DEX).
 * @returns A promise that resolves when the subscription is established.
 */
async function _HyperLiquidSubscriptionService_ensureClearinghouseStateSubscription(userAddress, dexName) {
    // Already subscribed
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").has(dexName)) {
        return;
    }
    // Another call is already in progress - wait for it instead of creating duplicate
    const pending = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingClearinghouseSubscriptions, "f").get(dexName);
    if (pending) {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`[ensureClearinghouseStateSubscription] Waiting for pending subscription for DEX: ${dexName || 'main'}`);
        await pending;
        return;
    }
    // Create subscription promise and track it
    const subscriptionPromise = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createClearinghouseSubscription).call(this, userAddress, dexName);
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingClearinghouseSubscriptions, "f").set(dexName, subscriptionPromise);
    try {
        await subscriptionPromise;
    }
    finally {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingClearinghouseSubscriptions, "f").delete(dexName);
    }
}, _HyperLiquidSubscriptionService_createClearinghouseSubscription = 
/**
 * Create the actual clearinghouseState subscription
 * Separated from ensureClearinghouseStateSubscription to enable promise deduplication
 *
 * @param userAddress - The user's wallet address.
 * @param dexName - The DEX identifier (empty string for main DEX).
 */
async function _HyperLiquidSubscriptionService_createClearinghouseSubscription(userAddress, dexName) {
    await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        throw new Error('Subscription client not available');
    }
    try {
        const subscription = await subscriptionClient.clearinghouseState({
            user: userAddress,
            dex: dexName || undefined, // Empty string -> undefined for main DEX
        }, (data) => {
            const cacheKey = data.dex || '';
            // Update caches and notify subscribers if we have positions/account subscribers
            if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, "f") > 0 ||
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscriberCount, "f") > 0) {
                // Process positions from clearinghouse state
                const positions = data.clearinghouseState.assetPositions
                    .filter((assetPos) => assetPos.position.szi !== '0')
                    .map((assetPos) => (0, hyperLiquidAdapter_js_1.adaptPositionFromSDK)(assetPos));
                // Get cached orders to preserve TP/SL data (prevents flickering)
                // Orders are cached by openOrders subscription
                const cachedOrders = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexOrdersCache, "f").get(cacheKey) ?? [];
                // Re-extract TP/SL from cached orders for the new positions
                // This ensures TP/SL data persists across clearinghouseState updates
                // Default the trigger arrays so "no triggers" and "not streamed yet"
                // look the same to consumers as they do on the REST path.
                let positionsWithTPSL = positions.map((position) => ({
                    ...position,
                    takeProfitOrders: position.takeProfitOrders ?? [],
                    stopLossOrders: position.stopLossOrders ?? [],
                }));
                if (cachedOrders.length > 0) {
                    const { tpslMap, tpslCountMap, triggerOrderMap } = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_extractTPSLFromOrders).call(this, [], positions, cachedOrders);
                    positionsWithTPSL = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_mergeTPSLIntoPositions).call(this, positions, tpslMap, tpslCountMap, triggerOrderMap);
                }
                // Update account state
                const accountState = (0, hyperLiquidAdapter_js_1.adaptAccountStateFromSDK)(data.clearinghouseState);
                // Update caches
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").set(cacheKey, positionsWithTPSL);
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").set(cacheKey, accountState);
                // Mark this DEX as initialized (has sent first data)
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_initializedDexs, "f").add(cacheKey);
                // Trigger aggregation and notify subscribers
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers).call(this);
            }
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").set(dexName, subscription);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`clearinghouseState subscription established for DEX: ${dexName || 'main'}`);
    }
    catch (error) {
        // Remove this DEX from expected set so it doesn't block notifications for other DEXs
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_expectedDexs, "f").delete(dexName);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createClearinghouseSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'ensureClearinghouseStateSubscription', {
            dex: dexName,
        }));
        throw error;
    }
}, _HyperLiquidSubscriptionService_ensureOpenOrdersSubscription = 
/**
 * Ensure openOrders subscription exists for a DEX
 * Uses pending promise tracking to prevent race conditions where multiple
 * concurrent calls could create duplicate subscriptions
 *
 * @param userAddress - The user's wallet address.
 * @param dexName - The DEX identifier (empty string for main DEX).
 * @returns A promise that resolves when the subscription is established.
 */
async function _HyperLiquidSubscriptionService_ensureOpenOrdersSubscription(userAddress, dexName) {
    // Already subscribed
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").has(dexName)) {
        return;
    }
    // Another call is already in progress - wait for it instead of creating duplicate
    const pending = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingOpenOrdersSubscriptions, "f").get(dexName);
    if (pending) {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`[ensureOpenOrdersSubscription] Waiting for pending subscription for DEX: ${dexName || 'main'}`);
        await pending;
        return;
    }
    // Create subscription promise and track it
    const subscriptionPromise = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createOpenOrdersSubscription).call(this, userAddress, dexName);
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingOpenOrdersSubscriptions, "f").set(dexName, subscriptionPromise);
    try {
        await subscriptionPromise;
    }
    finally {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingOpenOrdersSubscriptions, "f").delete(dexName);
    }
}, _HyperLiquidSubscriptionService_createOpenOrdersSubscription = 
/**
 * Create the actual openOrders subscription
 * Separated from ensureOpenOrdersSubscription to enable promise deduplication
 *
 * @param userAddress - The user's wallet address.
 * @param dexName - The DEX identifier (empty string for main DEX).
 */
async function _HyperLiquidSubscriptionService_createOpenOrdersSubscription(userAddress, dexName) {
    await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        throw new Error('Subscription client not available');
    }
    try {
        const subscription = await subscriptionClient.openOrders({
            user: userAddress,
            dex: dexName || undefined, // Empty string -> undefined for main DEX
        }, (data) => {
            const cacheKey = data.dex || '';
            // Update caches and notify subscribers if we have order subscribers
            if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscriberCount, "f") > 0 ||
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, "f") > 0) {
                // Get cached positions for TP/SL processing
                const cachedPositions = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").get(cacheKey) ?? [];
                // Extract TP/SL and process orders
                const { tpslMap, tpslCountMap, triggerOrderMap, processedOrders: orders, } = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_extractTPSLFromOrders).call(this, data.orders, cachedPositions);
                // Update orders cache with processed orders
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexOrdersCache, "f").set(cacheKey, orders);
                // Update positions with TP/SL if we have positions
                if (cachedPositions.length > 0) {
                    const positionsWithTPSL = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_mergeTPSLIntoPositions).call(this, cachedPositions, tpslMap, tpslCountMap, triggerOrderMap);
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").set(cacheKey, positionsWithTPSL);
                }
                // Mark this DEX as initialized (has sent first data)
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_initializedDexs, "f").add(cacheKey);
                // Trigger aggregation and notify subscribers
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers).call(this);
            }
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").set(dexName, subscription);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`openOrders subscription established for DEX: ${dexName || 'main'}`);
    }
    catch (error) {
        // Remove this DEX from expected set so it doesn't block notifications for other DEXs
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_expectedDexs, "f").delete(dexName);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createOpenOrdersSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'ensureOpenOrdersSubscription', {
            dex: dexName,
        }));
        throw error;
    }
}, _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers = function _HyperLiquidSubscriptionService_aggregateAndNotifySubscribers() {
    // Wait for all expected DEXs to send initial data before notifying
    // This ensures positions from all DEXs appear simultaneously
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_expectedDexs, "f").size > 0) {
        const allDexsInitialized = Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_expectedDexs, "f")).every((dex) => __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_initializedDexs, "f").has(dex));
        if (!allDexsInitialized) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('Waiting for all DEXs to send initial data', {
                expected: Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_expectedDexs, "f")),
                initialized: Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_initializedDexs, "f")),
            });
            return; // Don't notify yet - waiting for more DEXs
        }
    }
    // Aggregate data from all DEX caches
    // Order: Main DEX (crypto perps) first, then HIP-3 DEXs
    const mainDexPositions = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").get('') ?? [];
    const hip3DexPositions = Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").entries())
        .filter(([key]) => key !== '')
        .flatMap(([, positions]) => positions);
    const aggregatedPositions = [...mainDexPositions, ...hip3DexPositions];
    const mainDexOrders = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexOrdersCache, "f").get('') ?? [];
    const hip3DexOrders = Array.from(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexOrdersCache, "f").entries())
        .filter(([key]) => key !== '')
        .flatMap(([, orders]) => orders);
    const aggregatedOrders = [...mainDexOrders, ...hip3DexOrders];
    const aggregatedAccount = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_aggregateAccountStates).call(this);
    // Check if aggregated data changed using fast hash comparison
    const positionsHash = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_hashPositions).call(this, aggregatedPositions);
    const ordersHash = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_hashOrders).call(this, aggregatedOrders);
    const accountHash = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_hashAccountState).call(this, aggregatedAccount);
    const positionsChanged = positionsHash !== __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPositionsHash, "f");
    const ordersChanged = ordersHash !== __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOrdersHash, "f");
    const accountChanged = accountHash !== __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedAccountHash, "f");
    // Only notify subscribers if aggregated data changed
    if (positionsChanged) {
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPositions, aggregatedPositions, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPositionsHash, positionsHash, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_positionsCacheInitialized, true, "f"); // Mark cache as initialized
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscribers, "f").forEach((callback) => {
            callback(aggregatedPositions);
        });
    }
    if (ordersChanged) {
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedOrders, aggregatedOrders, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedOrdersHash, ordersHash, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_ordersCacheInitialized, true, "f"); // Mark cache as initialized
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscribers, "f").forEach((callback) => {
            callback(aggregatedOrders);
        });
    }
    if (accountChanged) {
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedAccount, aggregatedAccount, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedAccountHash, accountHash, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscribers, "f").forEach((callback) => {
            callback(aggregatedAccount);
        });
    }
}, _HyperLiquidSubscriptionService_cleanupSharedWebData3ISubscription = function _HyperLiquidSubscriptionService_cleanupSharedWebData3ISubscription() {
    const totalSubscribers = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, "f") +
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderSubscriberCount, "f") +
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_accountSubscriberCount, "f") +
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_oiCapSubscriberCount, "f");
    if (totalSubscribers <= 0) {
        // Cleanup webData3 subscription (covers all DEXs)
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").forEach((subscription, dexName) => {
                subscription.unsubscribe().catch((error) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.cleanupSharedWebData3ISubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'cleanupSharedWebData3ISubscription.webData3', {
                        dex: dexName,
                    }));
                });
            });
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_webData3Subscriptions, "f").clear();
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_webData3SubscriptionPromise, undefined, "f");
        }
        // Cleanup spotState subscriptions (per-user). Bump generation +
        // drop in-flight promises so a racing #ensureSpotStateSubscription
        // continuation discards its subscription rather than rehydrating
        // #spotStateSubscriptions after this clear.
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionGeneration, "f") + 1, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptionPromises, "f").clear();
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptions, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptions, "f").forEach((subscription, user) => {
                subscription.unsubscribe().catch((error) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.cleanupSharedWebData3ISubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'cleanupSharedWebData3ISubscription.spotState', { user }));
                });
            });
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateSubscriptions, "f").clear();
        }
        // Cleanup individual subscriptions (clearinghouseState + openOrders)
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").forEach((subscription, dexName) => {
                subscription.unsubscribe().catch((error) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.cleanupSharedWebData3ISubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'cleanupSharedWebData3ISubscription.clearinghouseState', {
                        dex: dexName,
                    }));
                });
            });
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clearinghouseStateSubscriptions, "f").clear();
        }
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").forEach((subscription, dexName) => {
                subscription.unsubscribe().catch((error) => {
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.cleanupSharedWebData3ISubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'cleanupSharedWebData3ISubscription.openOrders', {
                        dex: dexName,
                    }));
                });
            });
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_openOrdersSubscriptions, "f").clear();
        }
        // Clear pending subscription promises (race condition prevention)
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingClearinghouseSubscriptions, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingOpenOrdersSubscriptions, "f").clear();
        // Clear subscriber counts
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_positionSubscriberCount, 0, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_orderSubscriberCount, 0, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_accountSubscriberCount, 0, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_oiCapSubscriberCount, 0, "f");
        // Clear per-DEX caches
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexPositionsCache, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexOrdersCache, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAccountCache, "f").clear();
        // Clear DEX tracking for synchronized notifications
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_expectedDexs, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_initializedDexs, "f").clear();
        // Clear aggregated caches
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPositions, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedOrders, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedAccount, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedSpotState, null, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedSpotStateUserAddress, null, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeByUser, "f").clear();
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeLastWsRefreshAtByUser, "f").clear();
        // Drop in-flight refresh handles so stale hanging userAbstraction
        // requests from the prior connection can't be awaited by future calls.
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_abstractionModeInflightByUser, "f").clear();
        // Bump generation so any in-flight spot fetch from a prior user discards
        // its result instead of re-populating the cache post-cleanup.
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStateGeneration, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_spotStateGeneration, "f") + 1, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStatePromise, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_spotStatePromiseUserAddress, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_ordersCacheInitialized, false, "f"); // Reset cache initialization flag
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_positionsCacheInitialized, false, "f"); // Reset cache initialization flag
        // Clear hash caches
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPositionsHash, '', "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedOrdersHash, '', "f");
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedAccountHash, '', "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('All multi-DEX subscriptions cleaned up (webData3 + individual subscriptions)');
    }
}, _HyperLiquidSubscriptionService_ensureOrderFillISubscription = 
/**
 * Ensure order fill subscription is active for the given accountId
 * Shares subscription across all callbacks for the same accountId
 *
 * @param accountId - Optional CAIP account ID to subscribe for.
 * @returns A promise that resolves when the subscription is established.
 */
async function _HyperLiquidSubscriptionService_ensureOrderFillISubscription(accountId) {
    // Normalize accountId: undefined -> 'default' for Map key
    const normalizedAccountId = accountId ?? 'default';
    // If subscription already exists, no need to create another
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscriptions, "f").has(normalizedAccountId)) {
        return;
    }
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
        const client = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
        if (!client) {
            throw new Error('SubscriptionClient not available');
        }
        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_ensureOrderFillISubscription).call(this, accountId);
        return;
    }
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").getUserAddressWithDefault(accountId);
    // userFills returns a Promise<ISubscription>, need to await it
    const subscription = await subscriptionClient.userFills({ user: userAddress }, (data) => {
        // Build a Map for O(1) lookup instead of O(n) find per fill
        const orderMap = new Map();
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOrders, "f")) {
            for (const order of __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedOrders, "f")) {
                if (order.detailedOrderType) {
                    orderMap.set(order.orderId, order.detailedOrderType);
                }
            }
        }
        const orderFills = data.fills.map((fill) => {
            const oid = fill.oid.toString();
            return {
                orderId: oid,
                symbol: fill.coin,
                side: fill.side,
                size: fill.sz,
                price: fill.px,
                fee: fill.fee,
                timestamp: fill.time,
                pnl: fill.closedPnl,
                direction: fill.dir,
                feeToken: fill.feeToken,
                startPosition: fill.startPosition,
                liquidation: fill.liquidation
                    ? {
                        liquidatedUser: fill.liquidation.liquidatedUser,
                        markPx: fill.liquidation.markPx,
                        method: fill.liquidation.method,
                    }
                    : undefined,
                detailedOrderType: orderMap.get(oid),
            };
        });
        // Cache fills for cache-first pattern (similar to price caching)
        // This allows getOrFetchFills() to return cached data without REST API calls
        if (data.isSnapshot) {
            // Snapshot: replace cache with initial historical data, sorted newest first
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedFills, [...orderFills]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 100), "f");
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_fillsCacheInitialized, true, "f");
        }
        else {
            // Streaming: prepend new fills to existing (newest first)
            __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedFills, [
                ...orderFills,
                ...(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedFills, "f") ?? []),
            ].slice(0, 100), "f");
        }
        // Distribute to all callbacks for this accountId
        const subscribers = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscribers, "f").get(normalizedAccountId);
        if (subscribers) {
            subscribers.forEach((callback) => {
                callback(orderFills, data.isSnapshot);
            });
        }
    });
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderFillSubscriptions, "f").set(normalizedAccountId, subscription);
}, _HyperLiquidSubscriptionService_createSubscription = function _HyperLiquidSubscriptionService_createSubscription(subscribers, callback, key) {
    if (subscribers instanceof Map && key) {
        if (!subscribers.has(key)) {
            subscribers.set(key, new Set());
        }
        subscribers.get(key)?.add(callback);
    }
    else if (subscribers instanceof Set) {
        subscribers.add(callback);
    }
    return () => {
        if (subscribers instanceof Map && key) {
            const set = subscribers.get(key);
            set?.delete(callback);
            if (set?.size === 0) {
                subscribers.delete(key);
            }
        }
        else if (subscribers instanceof Set) {
            subscribers.delete(callback);
        }
    };
}, _HyperLiquidSubscriptionService_createPriceUpdate = function _HyperLiquidSubscriptionService_createPriceUpdate(symbol, price) {
    const marketData = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataCache, "f").get(symbol);
    const orderBookData = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookCache, "f").get(symbol);
    const currentPrice = parseFloat(price);
    let percentChange24h;
    if (marketData?.prevDayPx !== undefined) {
        const change = ((currentPrice - marketData.prevDayPx) / marketData.prevDayPx) * 100;
        percentChange24h = change.toFixed(2);
    }
    // Check if any subscriber for this symbol wants market data
    const hasMarketDataSubscribers = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").has(symbol) &&
        (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").get(symbol)?.size ?? 0) > 0;
    const priceUpdate = {
        symbol,
        price,
        timestamp: Date.now(),
        percentChange24h,
        // Add mark price from activeAssetCtx
        markPrice: marketData?.oraclePrice
            ? marketData.oraclePrice.toString()
            : undefined,
        // Add order book data if available
        bestBid: orderBookData?.bestBid,
        bestAsk: orderBookData?.bestAsk,
        spread: orderBookData?.spread,
        // Always include funding when available (don't default to 0, preserve undefined)
        funding: marketData?.funding,
        // Add market data only if requested by at least one subscriber
        openInterest: hasMarketDataSubscribers
            ? marketData?.openInterest
            : undefined,
        volume24h: hasMarketDataSubscribers ? marketData?.volume24h : undefined,
        // Flag markets that are currently untradable because the mid price has drifted
        // too far from the oracle price (HyperLiquid rejects such orders). Lets clients
        // warn the user before they attempt an order that would fail. Defaults to tradable
        // when the oracle price isn't yet cached.
        isTradable: (0, marketDataTransform_js_1.isMarketTradable)({
            midPrice: currentPrice,
            oraclePrice: marketData?.oraclePrice,
            deviationLimit: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_priceDeviationLimit, "f"),
        }),
    };
    return priceUpdate;
}, _HyperLiquidSubscriptionService_getFreshActiveAssetCtxPrice = function _HyperLiquidSubscriptionService_getFreshActiveAssetCtxPrice(symbol) {
    const marketData = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataCache, "f").get(symbol);
    if (marketData?.activeAssetCtxPrice === undefined ||
        marketData.priceLastUpdated === undefined) {
        return undefined;
    }
    if (Date.now() - marketData.priceLastUpdated >
        __classPrivateFieldGet(_a, _a, "f", _HyperLiquidSubscriptionService_activeAssetCtxPriceTtlMs)) {
        return undefined;
    }
    return marketData.activeAssetCtxPrice.toString();
}, _HyperLiquidSubscriptionService_projectPriceUpdate = function _HyperLiquidSubscriptionService_projectPriceUpdate(symbol, base) {
    const fastPrice = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getFreshActiveAssetCtxPrice).call(this, symbol);
    if (fastPrice === undefined) {
        return base;
    }
    return {
        ...base,
        price: fastPrice,
        timestamp: Date.now(),
    };
}, _HyperLiquidSubscriptionService_ensureGlobalAllMidsSubscription = function _HyperLiquidSubscriptionService_ensureGlobalAllMidsSubscription() {
    // Check both the subscription AND the promise to prevent race conditions
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalAllMidsSubscription, "f") ?? __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalAllMidsPromise, "f")) {
        return;
    }
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        return;
    }
    // Track WebSocket metrics
    const wsMetrics = {
        messagesReceived: 0,
        lastMessageTime: Date.now(),
        reconnectCount: 0,
        startTime: Date.now(),
    };
    // Store the promise immediately to prevent duplicate calls
    __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalAllMidsPromise, subscriptionClient
        .allMids((data) => {
        wsMetrics.messagesReceived += 1;
        wsMetrics.lastMessageTime = Date.now();
        // Initialize cache if needed
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPriceData, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f") ?? new Map(), "f");
        // Store raw snapshot for the main DEX so market fetches can reuse it without REST.
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_allMidsSnapshots, "f").set('', data.mids);
        const subscribedSymbols = new Set();
        // Collect all symbols that have subscribers
        for (const [symbol, subscriberSet,] of __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_priceSubscribers, "f").entries()) {
            if (subscriberSet.size > 0) {
                subscribedSymbols.add(symbol);
            }
        }
        // Track which subscribed symbols actually changed price, so
        // notification can be scoped to just those symbols
        const changedSymbols = new Set();
        // Only process symbols that are actually subscribed to
        for (const symbol in data.mids) {
            // Skip if nobody is subscribed to this symbol
            if (!subscribedSymbols.has(symbol)) {
                continue;
            }
            const price = data.mids[symbol].toString();
            const cachedPrice = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f").get(symbol);
            // Skip if price hasn't changed
            if (cachedPrice?.price === price) {
                continue;
            }
            // Price changed or new symbol - update cache
            const priceUpdate = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createPriceUpdate).call(this, symbol, price);
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f").set(symbol, priceUpdate);
            changedSymbols.add(symbol);
        }
        // Only notify subscribers of symbols whose price actually changed
        // This prevents unnecessary React re-renders when prices haven't changed
        if (changedSymbols.size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_notifyAllPriceSubscribers).call(this, changedSymbols);
        }
    })
        .then((sub) => {
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalAllMidsSubscription, sub, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('HyperLiquid: Global allMids subscription established');
        // Notify existing subscribers with any cached data now that subscription is established
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f") && __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f").size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_notifyAllPriceSubscribers).call(this);
        }
        return undefined;
    })
        .catch((error) => {
        // Clear the promise on error so it can be retried
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalAllMidsPromise, undefined, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.ensureGlobalAllMidsSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'ensureGlobalAllMidsSubscription'));
    }), "f");
}, _HyperLiquidSubscriptionService_ensureGlobalFastAssetCtxsSubscription = function _HyperLiquidSubscriptionService_ensureGlobalFastAssetCtxsSubscription() {
    // Check both the subscription AND the promise to prevent race conditions
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription, "f") ??
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsPromise, "f")) {
        return;
    }
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        return;
    }
    const handleFastAssetCtxsUpdate = (data) => {
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPriceData, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f") ?? new Map(), "f");
        // Track which subscribed symbols actually changed price, so
        // notification can be scoped to just those symbols
        const changedSymbols = new Set();
        for (const coin in data) {
            if (!(0, utils_1.hasProperty)(data, coin)) {
                continue;
            }
            const ctx = data[coin];
            const priceRaw = ctx.midPx ?? ctx.markPx;
            if (priceRaw === undefined || priceRaw === null) {
                // No usable price for this coin in this message — don't claim
                // ownership. Otherwise a coin with no usable price here would be
                // marked as fastAssetCtxs-owned while never having a fast price
                // cached, suppressing assetCtxs (its only remaining price source)
                // for that coin indefinitely.
                continue;
            }
            // Mark this coin as covered by fastAssetCtxs now that a usable
            // price backs that ownership (regardless of whether there's
            // currently a subscriber), so the slower per-DEX assetCtxs handler
            // knows to defer to this feed for the coin's price.
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_fastAssetCtxsCoins, "f").add(coin);
            const price = priceRaw.toString();
            const cachedPrice = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f").get(coin);
            // Skip if price hasn't changed
            if (cachedPrice?.price === price) {
                continue;
            }
            const priceUpdate = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createPriceUpdate).call(this, coin, price);
            // Cache every valid price, even for coins nobody is subscribed to
            // yet (snapshot messages include every asset on the exchange), so
            // a later subscriber gets an immediate baseline via the
            // subscribe-time cached-price replay instead of an assetCtxs feed
            // that's been suppressed with no fastAssetCtxs price to fall back
            // on.
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f").set(coin, priceUpdate);
            // Scope notification to coins with an active subscriber; snapshot
            // messages cover the full exchange and most coins have none.
            if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_priceSubscribers, "f").get(coin)?.size) {
                changedSymbols.add(coin);
            }
        }
        // Only notify subscribers of symbols whose price actually changed
        if (changedSymbols.size > 0) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_notifyAllPriceSubscribers).call(this, changedSymbols);
        }
    };
    const subscribeWithRetry = async () => {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await subscriptionClient.fastAssetCtxs(handleFastAssetCtxsUpdate);
            }
            catch (error) {
                const ensuredError = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.ensureGlobalFastAssetCtxsSubscription');
                const isLastAttempt = attempt === maxAttempts;
                if (isLastAttempt || !__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_isTransientSdkError).call(this, ensuredError)) {
                    throw ensuredError;
                }
                const retryDelayMs = attempt * 500;
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('Transient fastAssetCtxs subscription failure during reconnect, retrying', {
                    attempt,
                    retryDelayMs,
                    error: ensuredError.message,
                });
                await new Promise((_resolve) => setTimeout(_resolve, retryDelayMs));
            }
        }
        throw new Error('Failed to establish fastAssetCtxs subscription');
    };
    // Store the promise immediately to prevent duplicate calls
    __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsPromise, subscribeWithRetry()
        .then((sub) => {
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsSubscription, sub, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('HyperLiquid: Global fastAssetCtxs subscription established');
        return undefined;
    })
        .catch((error) => {
        // Clear the promise on error so it can be retried
        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_globalFastAssetCtxsPromise, undefined, "f");
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.ensureGlobalFastAssetCtxsSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'ensureGlobalFastAssetCtxsSubscription'));
    }), "f");
}, _HyperLiquidSubscriptionService_ensureActiveAssetSubscription = function _HyperLiquidSubscriptionService_ensureActiveAssetSubscription(symbol) {
    // Increment subscriber count
    const currentCount = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_symbolSubscriberCounts, "f").get(symbol) ?? 0;
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_symbolSubscriberCounts, "f").set(symbol, currentCount + 1);
    // If subscription already exists or is being created, just return
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").has(symbol) ||
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").has(symbol)) {
        return;
    }
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        return;
    }
    // Track metrics for this subscription
    const subscriptionMetrics = {
        messagesReceived: 0,
        startTime: Date.now(),
    };
    const promise = subscriptionClient
        .activeAssetCtx({ coin: symbol }, (data) => {
        subscriptionMetrics.messagesReceived += 1;
        if (data.coin === symbol && data.ctx) {
            // Type guard using SDK types: check if this is perps (has funding) or spot (no funding)
            const isPerpsContext = (event) => (0, utils_1.hasProperty)(event.ctx, 'funding') &&
                (0, utils_1.hasProperty)(event.ctx, 'openInterest') &&
                (0, utils_1.hasProperty)(event.ctx, 'oraclePx');
            const { ctx } = data;
            // Cache market data for consolidation with price updates
            const ctxPrice = ctx.midPx ?? ctx.markPx;
            const now = Date.now();
            const openInterestUSD = isPerpsContext(data) && ctxPrice
                ? (0, marketDataTransform_js_1.calculateOpenInterestUSD)(data.ctx.openInterest, ctxPrice)
                : NaN;
            const marketData = {
                prevDayPx: ctx.prevDayPx
                    ? parseFloat(ctx.prevDayPx.toString())
                    : undefined,
                // Cache funding rate from activeAssetCtx for real-time updates
                // SDK defines funding as string (not nullable) in ActiveAssetCtxEvent
                funding: isPerpsContext(data)
                    ? parseFloat(data.ctx.funding.toString())
                    : undefined,
                openInterest: isNaN(openInterestUSD)
                    ? undefined
                    : openInterestUSD,
                volume24h: ctx.dayNtlVlm
                    ? parseFloat(ctx.dayNtlVlm.toString())
                    : undefined,
                oraclePrice: isPerpsContext(data)
                    ? parseFloat(data.ctx.oraclePx.toString())
                    : undefined,
                lastUpdated: now,
                // Store fast-stream price for per-subscriber projection in
                // #notifyAllPriceSubscribers. Used only for focused subscribers.
                activeAssetCtxPrice: ctxPrice
                    ? parseFloat(ctxPrice.toString())
                    : undefined,
                priceLastUpdated: ctxPrice ? now : undefined,
            };
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataCache, "f").set(symbol, marketData);
            // Rebuild the allMids baseline so derived fields (isTradable,
            // funding, openInterest, volume24h, markPrice, percentChange24h)
            // pick up the new activeAssetCtx data. Only rebuild when a baseline
            // already exists to preserve the startup zero-price guard: we never
            // want to synthesize a baseline from a '0' / absent allMids price.
            const priceCache = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f");
            const existingBaseline = priceCache?.get(symbol);
            if (priceCache && existingBaseline) {
                priceCache.set(symbol, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createPriceUpdate).call(this, symbol, existingBaseline.price));
            }
            // Notify subscribers of this symbol only. #notifyAllPriceSubscribers
            // projects the fast-stream price (now stored in #marketDataCache) for
            // focused (includeMarketData: true) subscribers, while list subscribers
            // continue to receive only the allMids baseline from #cachedPriceData.
            // Scoping to this symbol avoids redundant reference-equal allMids
            // updates to list subscribers watching other symbols, since their
            // allMids baseline hasn't changed on this tick.
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_notifyAllPriceSubscribers).call(this, new Set([symbol]));
        }
    })
        .then((sub) => {
        // Only clear pending ref if this is still the current promise.
        // A rapid away-and-back can replace the pending promise; blindly
        // deleting would remove the *newer* reference (#28141).
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").get(symbol) === promise) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").delete(symbol);
        }
        // Stale subscription: cleanup was called while pending, a newer
        // subscription already won the race, OR a different pending promise
        // exists (rapid away-and-back before this one resolved). (#28141)
        if ((__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_symbolSubscriberCounts, "f").get(symbol) ?? 0) <= 0 ||
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").has(symbol) ||
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").has(symbol)) {
            return sub.unsubscribe();
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").set(symbol, sub);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`HyperLiquid: Market data subscription established for ${symbol}`);
        return undefined;
    })
        .catch((error) => {
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").get(symbol) === promise) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").delete(symbol);
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.ensureActiveAssetSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'ensureActiveAssetSubscription', { symbol }));
    });
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").set(symbol, promise);
}, _HyperLiquidSubscriptionService_cleanupActiveAssetSubscription = function _HyperLiquidSubscriptionService_cleanupActiveAssetSubscription(symbol) {
    const currentCount = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_symbolSubscriberCounts, "f").get(symbol) ?? 0;
    if (currentCount <= 1) {
        // Last subscriber, cleanup subscription
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_symbolSubscriberCounts, "f").delete(symbol);
        const subscription = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").get(symbol);
        if (subscription && typeof subscription.unsubscribe === 'function') {
            const unsubscribeResult = Promise.resolve(subscription.unsubscribe());
            unsubscribeResult.catch(() => {
                // Ignore errors during cleanup
            });
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").delete(symbol);
        }
        else if (subscription) {
            // Subscription exists but unsubscribe is not a function or doesn't return a Promise
            // Just clean up the reference
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalActiveAssetSubscriptions, "f").delete(symbol);
        }
        // If subscription is still pending (async), the .then() handler in
        // #ensureActiveAssetSubscription will check symbolSubscriberCounts
        // and unsubscribe immediately when it resolves (#28141)
        // Clean up the pending promise reference
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingActiveAssetPromises, "f").delete(symbol);
    }
    else {
        // Still has subscribers, just decrement count
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_symbolSubscriberCounts, "f").set(symbol, currentCount - 1);
    }
}, _HyperLiquidSubscriptionService_ensureAssetCtxsSubscription = 
/**
 * Ensure assetCtxs subscription for specific DEX (HIP-3 support)
 * Uses WebSocket instead of REST polling for market data
 * Implements reference counting to track active subscribers per DEX
 *
 * @param dex - The DEX identifier (empty string for main DEX).
 * @param options - Subscription behavior overrides.
 * @param options.incrementRefCount - Skip incrementing when restoring existing subscribers after reconnect.
 */
async function _HyperLiquidSubscriptionService_ensureAssetCtxsSubscription(dex, options = {}) {
    const dexKey = dex || '';
    const { incrementRefCount = true } = options;
    if (incrementRefCount) {
        const currentCount = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").get(dexKey) ?? 0;
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").set(dexKey, currentCount + 1);
    }
    // Return if subscription already exists
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, "f").has(dexKey)) {
        return;
    }
    let promise = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises, "f").get(dexKey);
    if (!promise) {
        promise = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createAssetCtxsSubscription).call(this, dex);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises, "f").set(dexKey, promise);
    }
    try {
        await promise;
    }
    catch (error) {
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises, "f").get(dexKey) === promise) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises, "f").delete(dexKey);
        }
        if (incrementRefCount) {
            const currentCount = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").get(dexKey) ?? 0;
            if (currentCount <= 1) {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").delete(dexKey);
            }
            else {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").set(dexKey, currentCount - 1);
            }
        }
        throw error;
    }
}, _HyperLiquidSubscriptionService_ensureDexAllMidsSubscription = 
/**
 * Ensure a per-DEX allMids WS subscription exists (singleton per DEX).
 * Mirrors the assetCtxs subscription dedup pattern and is used only for HIP-3 DEXs.
 *
 * @param dex - The HIP-3 DEX name.
 */
async function _HyperLiquidSubscriptionService_ensureDexAllMidsSubscription(dex) {
    if (!dex) {
        return;
    }
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, "f").has(dex)) {
        return;
    }
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises, "f").has(dex)) {
        await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises, "f").get(dex);
        return;
    }
    const promise = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createDexAllMidsSubscription).call(this, dex);
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises, "f").set(dex, promise);
    try {
        await promise;
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises, "f").delete(dex);
        throw error;
    }
}, _HyperLiquidSubscriptionService_createDexAllMidsSubscription = 
/**
 * Create allMids WS subscription for a specific HIP-3 DEX.
 *
 * @param dex - The HIP-3 DEX name.
 */
async function _HyperLiquidSubscriptionService_createDexAllMidsSubscription(dex) {
    await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        throw new Error('Subscription client not initialized');
    }
    return new Promise((resolve, reject) => {
        subscriptionClient
            .allMids({ dex }, (data) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_allMidsSnapshots, "f").set(dex, data.mids);
        })
            .then((sub) => {
            // If a newer subscription already won the race, discard this one (#28141)
            if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, "f").has(dex)) {
                resolve();
                return sub.unsubscribe();
            }
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, "f").set(dex, sub);
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`allMids subscription established for DEX: ${dex}`);
            resolve();
            return undefined;
        })
            .catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createDexAllMidsSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'createDexAllMidsSubscription', { dex }));
            reject((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createDexAllMidsSubscription'));
        });
    });
}, _HyperLiquidSubscriptionService_createAssetCtxsSubscription = 
/**
 * Create assetCtxs subscription for specific DEX
 * Provides real-time market data for all assets on the DEX
 *
 * Performance: Uses cached meta from dexMetaCache (populated by metaAndAssetCtxs)
 * to avoid redundant meta() API calls during subscription setup
 *
 * @param dex - The DEX identifier (empty string for main DEX).
 */
async function _HyperLiquidSubscriptionService_createAssetCtxsSubscription(dex) {
    await __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").ensureSubscriptionClient(__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_walletService, "f").createWalletAdapter());
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        throw new Error('Subscription client not initialized');
    }
    const dexKey = dex || '';
    const dexIdentifier = dex ?? 'main DEX';
    // Check cache first - populated by metaAndAssetCtxs in ensureAssetCtxsSubscription
    let perpsMeta = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexMetaCache, "f").get(dexKey);
    if (!perpsMeta) {
        // Fallback: fetch meta if not in cache (shouldn't happen in normal flow)
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`Meta cache miss for ${dexIdentifier}, fetching from API`);
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getInfoClient();
        const fetchedMeta = await infoClient.meta({ dex: dex || undefined });
        if (fetchedMeta?.universe) {
            perpsMeta = fetchedMeta;
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexMetaCache, "f").set(dexKey, fetchedMeta);
        }
    }
    if (!perpsMeta?.universe) {
        const errorMessage = `No universe data available for ${dexIdentifier}`;
        throw new Error(errorMessage);
    }
    // Capture narrowed perpsMeta in a const for use inside closures
    const validatedMeta = perpsMeta;
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`Using ${__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexMetaCache, "f").has(dexKey) ? 'cached' : 'fetched'} meta for ${dexIdentifier}`, {
        dex,
        universeCount: validatedMeta.universe.length,
        firstAssetSample: validatedMeta.universe[0]?.name,
    });
    return new Promise((resolve, reject) => {
        const subscriptionParams = dex ? { dex } : {};
        const handleAssetCtxsUpdate = (data) => {
            // Cache asset contexts for this DEX
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAssetCtxsCache, "f").set(dexKey, data.ctxs);
            // Use cached meta to map ctxs array indices to symbols (no REST API call!)
            validatedMeta.universe.forEach((asset, index) => {
                const ctx = data.ctxs[index];
                if (ctx && (0, utils_1.hasProperty)(ctx, 'funding')) {
                    // This is a perps context
                    const ctxPrice = ctx.midPx ?? ctx.markPx;
                    const openInterestUSD = (0, marketDataTransform_js_1.calculateOpenInterestUSD)(ctx.openInterest, ctxPrice);
                    // Preserve the fast-stream price fields set by the per-symbol
                    // activeAssetCtx handler. assetCtxs is a per-DEX batch that does not
                    // carry the fast-stream price concept, so rebuilding the entry from
                    // scratch would clobber activeAssetCtxPrice/priceLastUpdated and make
                    // #getFreshActiveAssetCtxPrice return stale, dropping focused
                    // subscribers back to the slower allMids baseline. priceLastUpdated
                    // is carried forward (not reset) so the staleness gate keeps
                    // reflecting the last activeAssetCtx tick.
                    const existingMarketData = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataCache, "f").get(asset.name);
                    const marketData = {
                        prevDayPx: ctx.prevDayPx
                            ? parseFloat(ctx.prevDayPx.toString())
                            : undefined,
                        funding: parseFloat(ctx.funding.toString()),
                        openInterest: isNaN(openInterestUSD)
                            ? undefined
                            : openInterestUSD,
                        volume24h: ctx.dayNtlVlm
                            ? parseFloat(ctx.dayNtlVlm.toString())
                            : undefined,
                        oraclePrice: parseFloat(ctx.oraclePx.toString()),
                        lastUpdated: Date.now(),
                        activeAssetCtxPrice: existingMarketData?.activeAssetCtxPrice,
                        priceLastUpdated: existingMarketData?.priceLastUpdated,
                    };
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataCache, "f").set(asset.name, marketData);
                    // HIP-3: Extract price from assetCtx and update cached prices.
                    // For HIP-3 DEXs, meta() returns asset.name already containing the
                    // DEX prefix (e.g., "xyz:XYZ100"), so use it directly.
                    const symbol = asset.name;
                    const price = ctx.midPx?.toString() ?? ctx.markPx?.toString();
                    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_fastAssetCtxsCoins, "f").has(symbol)) {
                        // fastAssetCtxs (TAT-3387) owns the price string for this coin
                        // with fresher, ~5s-cadence data, so don't overwrite it with
                        // this batch's price. Still rebuild the baseline (keeping the
                        // existing price) so derived fields just refreshed above in
                        // #marketDataCache (funding, openInterest, volume24h,
                        // oraclePrice, percentChange24h/isTradable via markPrice) reach
                        // list subscribers instead of going stale until the next
                        // fastAssetCtxs/allMids price change. Only rebuild an existing
                        // baseline to preserve the startup zero-price guard: we never
                        // want to synthesize a baseline from a '0' / absent allMids
                        // price.
                        const existingBaseline = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f")?.get(symbol);
                        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f") && existingBaseline) {
                            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f").set(symbol, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createPriceUpdate).call(this, symbol, existingBaseline.price));
                        }
                    }
                    else if (price) {
                        const priceUpdate = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createPriceUpdate).call(this, symbol, price);
                        __classPrivateFieldSet(this, _HyperLiquidSubscriptionService_cachedPriceData, __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f") ?? new Map(), "f");
                        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f").set(symbol, priceUpdate);
                    }
                }
            });
            // Notify price subscribers with updated market data
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_notifyAllPriceSubscribers).call(this);
        };
        const subscribeWithRetry = async () => {
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await subscriptionClient.assetCtxs(subscriptionParams, handleAssetCtxsUpdate);
                }
                catch (error) {
                    const ensuredError = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createAssetCtxsSubscription');
                    const isLastAttempt = attempt === maxAttempts;
                    if (isLastAttempt || !__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_isTransientSdkError).call(this, ensuredError)) {
                        throw ensuredError;
                    }
                    const retryDelayMs = attempt * 500;
                    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log('Transient assetCtxs subscription failure during reconnect, retrying', {
                        dex: dexKey || 'main',
                        attempt,
                        retryDelayMs,
                        error: ensuredError.message,
                    });
                    await new Promise((_resolve) => setTimeout(_resolve, retryDelayMs));
                }
            }
            throw new Error(`Failed to establish assetCtxs subscription for ${dexIdentifier}`);
        };
        subscribeWithRetry()
            .then((sub) => {
            // If a newer subscription already won the race, discard this one (#28141)
            if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, "f").has(dexKey)) {
                resolve();
                return sub.unsubscribe();
            }
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, "f").set(dexKey, sub);
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`assetCtxs subscription established for ${dex ? `DEX: ${dex}` : 'main DEX'}`);
            resolve();
            return undefined;
        })
            .catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createAssetCtxsSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'createAssetCtxsSubscription', { dex }));
            reject((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.createAssetCtxsSubscription'));
        });
    });
}, _HyperLiquidSubscriptionService_cleanupAssetCtxsSubscription = function _HyperLiquidSubscriptionService_cleanupAssetCtxsSubscription(dex) {
    const dexKey = dex || '';
    // Decrement subscriber count for this DEX
    const currentCount = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").get(dexKey) ?? 0;
    if (currentCount <= 1) {
        // Last subscriber - cleanup the subscription
        const subscription = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, "f").get(dexKey);
        const allMidsSubscription = dex
            ? __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, "f").get(dex)
            : undefined;
        if (subscription) {
            subscription.unsubscribe().catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.cleanupAssetCtxsSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'cleanupAssetCtxsSubscription', { dex }));
            });
        }
        if (allMidsSubscription) {
            allMidsSubscription.unsubscribe().catch((error) => {
                __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.cleanupDexAllMidsSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'cleanupDexAllMidsSubscription', { dex }));
            });
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptions, "f").delete(dexKey);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAssetCtxsCache, "f").delete(dexKey);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_assetCtxsSubscriptionPromises, "f").delete(dexKey);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").delete(dexKey);
        if (dex) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptions, "f").delete(dex);
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexAllMidsSubscriptionPromises, "f").delete(dex);
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_allMidsSnapshots, "f").delete(dex);
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`Cleaned up assetCtxs subscription for ${dex ? `DEX: ${dex}` : 'main DEX'}`);
    }
    else {
        // Still has subscribers - just decrement count
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_dexSubscriberCounts, "f").set(dexKey, currentCount - 1);
    }
}, _HyperLiquidSubscriptionService_ensureBboSubscription = function _HyperLiquidSubscriptionService_ensureBboSubscription(symbol) {
    // Skip if subscription already exists or is being created
    if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").has(symbol) ||
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").has(symbol)) {
        return;
    }
    const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_clientService, "f").getSubscriptionClient();
    if (!subscriptionClient) {
        return;
    }
    const promise = subscriptionClient
        .bbo({ coin: symbol }, (data) => {
        (0, hyperLiquidOrderBookProcessor_js_1.processBboData)({
            symbol,
            data,
            orderBookCache: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookCache, "f"),
            cachedPriceData: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f"),
            createPriceUpdate: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createPriceUpdate).bind(this),
            notifySubscribers: __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_notifyAllPriceSubscribers).bind(this),
        });
    })
        .then((sub) => {
        // Only clear pending ref if this is still the current promise (#28141).
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").get(symbol) === promise) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").delete(symbol);
        }
        // Stale subscription: cleanup was called while pending, a newer
        // subscription already won the race, OR a different pending promise
        // exists (rapid away-and-back before this one resolved). (#28141)
        if ((__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookSubscribers, "f").get(symbol)?.size ?? 0) <= 0 ||
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").has(symbol) ||
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").has(symbol)) {
            return sub.unsubscribe();
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").set(symbol, sub);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_deps, "f").debugLogger.log(`HyperLiquid: BBO subscription established for ${symbol}`);
        return undefined;
    })
        .catch((error) => {
        if (__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").get(symbol) === promise) {
            __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").delete(symbol);
        }
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_logErrorUnlessClearing).call(this, (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidSubscriptionService.ensureBboSubscription'), __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getErrorContext).call(this, 'ensureBboSubscription', { symbol }));
    });
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").set(symbol, promise);
}, _HyperLiquidSubscriptionService_cleanupBboSubscription = function _HyperLiquidSubscriptionService_cleanupBboSubscription(symbol) {
    // If anyone still wants order book (top-of-book) data for this symbol, keep the subscription alive.
    if ((__classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookSubscribers, "f").get(symbol)?.size ?? 0) > 0) {
        return;
    }
    const subscription = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").get(symbol);
    if (subscription && typeof subscription.unsubscribe === 'function') {
        const unsubscribeResult = Promise.resolve(subscription.unsubscribe());
        unsubscribeResult.catch(() => {
            // Ignore errors during cleanup
        });
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").delete(symbol);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookCache, "f").delete(symbol);
    }
    else if (subscription) {
        // Subscription exists but unsubscribe is not a function or doesn't return a Promise
        // Just clean up the reference
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_globalBboSubscriptions, "f").delete(symbol);
        __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_orderBookCache, "f").delete(symbol);
    }
    // If subscription is still pending (async), the .then() handler in
    // #ensureBboSubscription will check orderBookSubscribers and
    // unsubscribe immediately when it resolves (#28141)
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_pendingBboPromises, "f").delete(symbol);
}, _HyperLiquidSubscriptionService_processOrderBookData = function _HyperLiquidSubscriptionService_processOrderBookData(data, levels) {
    const bidsRaw = data?.levels?.[0] ?? [];
    const asksRaw = data?.levels?.[1] ?? [];
    // Process bids (buy orders) - highest price first
    let bidCumulativeSize = 0;
    let bidCumulativeNotional = 0;
    const bids = bidsRaw.slice(0, levels).map((level) => {
        const price = parseFloat(level.px);
        const size = parseFloat(level.sz);
        const notional = price * size;
        bidCumulativeSize += size;
        bidCumulativeNotional += notional;
        return {
            price: level.px,
            size: level.sz,
            total: bidCumulativeSize.toString(),
            notional: notional.toFixed(2),
            totalNotional: bidCumulativeNotional.toFixed(2),
        };
    });
    // Process asks (sell orders) - lowest price first
    let askCumulativeSize = 0;
    let askCumulativeNotional = 0;
    const asks = asksRaw.slice(0, levels).map((level) => {
        const price = parseFloat(level.px);
        const size = parseFloat(level.sz);
        const notional = price * size;
        askCumulativeSize += size;
        askCumulativeNotional += notional;
        return {
            price: level.px,
            size: level.sz,
            total: askCumulativeSize.toString(),
            notional: notional.toFixed(2),
            totalNotional: askCumulativeNotional.toFixed(2),
        };
    });
    // Calculate spread and mid price
    const bestBid = bids[0];
    const bestAsk = asks[0];
    const bidPrice = bestBid ? parseFloat(bestBid.price) : 0;
    const askPrice = bestAsk ? parseFloat(bestAsk.price) : 0;
    const spread = askPrice > 0 && bidPrice > 0 ? askPrice - bidPrice : 0;
    const midPrice = askPrice > 0 && bidPrice > 0 ? (askPrice + bidPrice) / 2 : 0;
    const spreadPercentage = midPrice > 0 ? ((spread / midPrice) * 100).toFixed(4) : '0';
    // Calculate max total for depth chart scaling
    const maxTotal = Math.max(bidCumulativeSize, askCumulativeSize).toString();
    return {
        bids,
        asks,
        spread: spread.toFixed(5),
        spreadPercentage,
        midPrice: midPrice.toFixed(5),
        lastUpdated: Date.now(),
        maxTotal,
    };
}, _HyperLiquidSubscriptionService_notifyAllPriceSubscribers = function _HyperLiquidSubscriptionService_notifyAllPriceSubscribers(changedSymbols) {
    const subscriberUpdates = new Map();
    __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_priceSubscribers, "f").forEach((subscriberSet, symbol) => {
        if (changedSymbols && !changedSymbols.has(symbol)) {
            return;
        }
        const allMidsBase = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_cachedPriceData, "f")?.get(symbol);
        const fastPrice = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_getFreshActiveAssetCtxPrice).call(this, symbol);
        const now = Date.now();
        subscriberSet.forEach((callback) => {
            const isFocused = __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_marketDataSubscribers, "f").get(symbol)?.has(callback) ?? false;
            let priceUpdate;
            if (isFocused && fastPrice !== undefined) {
                // Use allMids baseline as the structural base when available;
                // fall back to a freshly computed PriceUpdate if allMids hasn't
                // arrived yet so focused screens stay responsive on first render.
                const base = allMidsBase ?? __classPrivateFieldGet(this, _HyperLiquidSubscriptionService_instances, "m", _HyperLiquidSubscriptionService_createPriceUpdate).call(this, symbol, fastPrice);
                priceUpdate = { ...base, price: fastPrice, timestamp: now };
            }
            else if (allMidsBase !== undefined) {
                priceUpdate = allMidsBase;
            }
            if (priceUpdate !== undefined) {
                const updates = subscriberUpdates.get(callback) ?? [];
                updates.push(priceUpdate);
                subscriberUpdates.set(callback, updates);
            }
        });
    });
    // Send batched updates to each subscriber
    subscriberUpdates.forEach((updates, callback) => {
        if (updates.length > 0) {
            callback(updates);
        }
    });
};
// Stale threshold for the fast-stream price preference. If the last
// activeAssetCtx price update is older than this, the allMids baseline is
// used for focused subscribers.
_HyperLiquidSubscriptionService_activeAssetCtxPriceTtlMs = { value: 10000 };
//# sourceMappingURL=HyperLiquidSubscriptionService.cjs.map