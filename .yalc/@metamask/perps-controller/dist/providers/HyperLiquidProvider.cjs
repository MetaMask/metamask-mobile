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
var _HyperLiquidProvider_instances, _HyperLiquidProvider_deps, _HyperLiquidProvider_clientService, _HyperLiquidProvider_walletService, _HyperLiquidProvider_subscriptionService, _HyperLiquidProvider_symbolToAssetId, _HyperLiquidProvider_userFeeCache, _HyperLiquidProvider_maxLeverageCache, _HyperLiquidProvider_cachedMetaByDex, _HyperLiquidProvider_cachedMarketDataWithPrices, _HyperLiquidProvider_cachedSpotMeta, _HyperLiquidProvider_dexDiscoveryCache, _HyperLiquidProvider_referralCheckCache, _HyperLiquidProvider_builderFeeCheckCache, _HyperLiquidProvider_ensureReadyPromise, _HyperLiquidProvider_pendingBuilderFeeApprovals, _HyperLiquidProvider_subscriptionBuilderApprovalEpoch, _HyperLiquidProvider_approvedBuilderAddresses, _HyperLiquidProvider_compiledAllowlistPatterns, _HyperLiquidProvider_compiledBlocklistPatterns, _HyperLiquidProvider_userFeeDiscountBips, _HyperLiquidProvider_userFeeResolution, _HyperLiquidProvider_hip3Enabled, _HyperLiquidProvider_allowlistMarkets, _HyperLiquidProvider_blocklistMarkets, _HyperLiquidProvider_useUnifiedAccount, _HyperLiquidProvider_dexDiscoveryComplete, _HyperLiquidProvider_unifiedAccountSetupNeedsRetry, _HyperLiquidProvider_pendingValidatedDexsPromise, _HyperLiquidProvider_cachedUsdcTokenId, _HyperLiquidProvider_errorMappings, _HyperLiquidProvider_scaleOrderGroups, _HyperLiquidProvider_chaseSessions, _HyperLiquidProvider_chasePlacementsInFlight, _HyperLiquidProvider_chaseGeneration, _HyperLiquidProvider_clientsInitialized, _HyperLiquidProvider_initializationPromise, _HyperLiquidProvider_messenger, _HyperLiquidProvider_builderAddressTestnet, _HyperLiquidProvider_builderAddressMainnet, _HyperLiquidProvider_subscriptionBuilderAddressTestnet, _HyperLiquidProvider_subscriptionBuilderAddressMainnet, _HyperLiquidProvider_priceDeviationLimit, _HyperLiquidProvider_compilePatternsSafely, _HyperLiquidProvider_ensureClientsInitialized, _HyperLiquidProvider_isWalletOnHyperliquid, _HyperLiquidProvider_isHyperliquidMultiSigAccount, _HyperLiquidProvider_ensureUnifiedAccountEnabled, _HyperLiquidProvider_ensureReady, _HyperLiquidProvider_tradingSetupPromise, _HyperLiquidProvider_tradingSetupComplete, _HyperLiquidProvider_ensureReadyForTrading, _HyperLiquidProvider_getOrFetchPrice, _HyperLiquidProvider_filterFills, _HyperLiquidProvider_getAllAvailableDexs, _HyperLiquidProvider_getValidatedDexs, _HyperLiquidProvider_fetchValidatedDexsInternal, _HyperLiquidProvider_getCachedMeta, _HyperLiquidProvider_backfillAssetMapForDex, _HyperLiquidProvider_getAssetIdWithRepair, _HyperLiquidProvider_getCachedSpotMeta, _HyperLiquidProvider_getCachedPerpDexs, _HyperLiquidProvider_calculateHip3FeeMultiplier, _HyperLiquidProvider_getCacheKey, _HyperLiquidProvider_getApprovedBuilderKey, _HyperLiquidProvider_fetchMarketsForDex, _HyperLiquidProvider_getUsdcTokenId, _HyperLiquidProvider_isUsdcCollateralDex, _HyperLiquidProvider_buildAssetMapping, _HyperLiquidProvider_queryUserDataAcrossDexs, _HyperLiquidProvider_mapError, _HyperLiquidProvider_getErrorContext, _HyperLiquidProvider_isMappedAccountModeExchangeError, _HyperLiquidProvider_getTradingErrorContext, _HyperLiquidProvider_checkBuilderFeeApproval, _HyperLiquidProvider_ensureBuilderFeeApproval, _HyperLiquidProvider_checkBuilderFeeStatus, _HyperLiquidProvider_getBalanceForDex, _HyperLiquidProvider_findSourceDexWithBalance, _HyperLiquidProvider_autoTransferForHip3Order, _HyperLiquidProvider_autoTransferBackAfterClose, _HyperLiquidProvider_calculateHip3RequiredMargin, _HyperLiquidProvider_handleHip3PostOrderRebalance, _HyperLiquidProvider_handleHip3OrderRollback, _HyperLiquidProvider_validateOrderBeforePlacement, _HyperLiquidProvider_getAssetInfo, _HyperLiquidProvider_prepareAssetForTrading, _HyperLiquidProvider_handleHip3PreOrder, _HyperLiquidProvider_submitOrderWithRollback, _HyperLiquidProvider_handleOrderError, _HyperLiquidProvider_placeStrategyOrder, _HyperLiquidProvider_prepareStrategyPlacement, _HyperLiquidProvider_getMinimumOrderSize, _HyperLiquidProvider_buildScaleLadder, _HyperLiquidProvider_placeTwapOrder, _HyperLiquidProvider_placeScaleOrder, _HyperLiquidProvider_startChaseSession, _HyperLiquidProvider_getChaseQuotePrice, _HyperLiquidProvider_restChaseOrder, _HyperLiquidProvider_scheduleChaseTick, _HyperLiquidProvider_recoverFailedChaseTick, _HyperLiquidProvider_runChaseTick, _HyperLiquidProvider_resolveOwnRestingSizes, _HyperLiquidProvider_readOrderRemainder, _HyperLiquidProvider_cancelChaseChild, _HyperLiquidProvider_retractOrphanedChaseOrder, _HyperLiquidProvider_stopChaseSession, _HyperLiquidProvider_cancelStrategyOrder, _HyperLiquidProvider_cancelTwapOrder, _HyperLiquidProvider_cancelScaleOrder, _HyperLiquidProvider_cancelChaseOrder, _HyperLiquidProvider_readOrderIdFromStatus, _HyperLiquidProvider_getDiscountedBuilderFee, _HyperLiquidProvider_getBuilderOrderContext, _HyperLiquidProvider_fetchOpenOrders, _HyperLiquidProvider_resolveReplacementOrderId, _HyperLiquidProvider_getStandaloneValidatedDexs, _HyperLiquidProvider_queryDexPositions, _HyperLiquidProvider_getAllMids, _HyperLiquidProvider_fetchSingleDexFresh, _HyperLiquidProvider_excludeNonUsdcCollateralResults, _HyperLiquidProvider_mergeDexResultsInto, _HyperLiquidProvider_cacheFreshMarketDataSnapshot, _HyperLiquidProvider_getStaleMarketDataSnapshot, _HyperLiquidProvider_isFeeCacheValid, _HyperLiquidProvider_getBuilderAddress, _HyperLiquidProvider_getSubscriptionBuilderAddress, _HyperLiquidProvider_getReferralCode, _HyperLiquidProvider_ensureReferralSet, _HyperLiquidProvider_isReferralCodeReady, _HyperLiquidProvider_checkReferralSet, _HyperLiquidProvider_setReferralCode;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperLiquidProvider = void 0;
const utils_1 = require("@metamask/utils");
const uuid_1 = require("uuid");
const eventNames_js_1 = require("../constants/eventNames.cjs");
const hyperLiquidConfig_js_1 = require("../constants/hyperLiquidConfig.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const transactionsHistoryConfig_js_1 = require("../constants/transactionsHistoryConfig.cjs");
const perpsErrorCodes_js_1 = require("../perpsErrorCodes.cjs");
const DexDiscoveryCacheManager_js_1 = require("../services/DexDiscoveryCacheManager.cjs");
const HyperLiquidClientService_js_1 = require("../services/HyperLiquidClientService.cjs");
const HyperLiquidSubscriptionService_js_1 = require("../services/HyperLiquidSubscriptionService.cjs");
const HyperLiquidWalletService_js_1 = require("../services/HyperLiquidWalletService.cjs");
const TradingReadinessCache_js_1 = require("../services/TradingReadinessCache.cjs");
const hyperliquid_types_js_1 = require("../types/hyperliquid-types.cjs");
const index_js_1 = require("../types/index.cjs");
const accountUtils_js_1 = require("../utils/accountUtils.cjs");
const errorUtils_js_1 = require("../utils/errorUtils.cjs");
const hyperLiquidAbstraction_js_1 = require("../utils/hyperLiquidAbstraction.cjs");
const hyperLiquidAdapter_js_1 = require("../utils/hyperLiquidAdapter.cjs");
const hyperLiquidValidation_js_1 = require("../utils/hyperLiquidValidation.cjs");
const idUtils_js_1 = require("../utils/idUtils.cjs");
const marketDataTransform_js_1 = require("../utils/marketDataTransform.cjs");
const marketUtils_js_1 = require("../utils/marketUtils.cjs");
const orderCalculations_js_1 = require("../utils/orderCalculations.cjs");
const orderTypes_js_1 = require("../utils/orderTypes.cjs");
const standaloneInfoClient_js_1 = require("../utils/standaloneInfoClient.cjs");
// getStreamManagerInstance removed: use this.#deps.streamManager instead
/**
 * Type guard to check if a status is an object (not a string literal like "waitingForFill")
 * The SDK returns status as a union of object types and string literals.
 *
 * @param status - The current status.
 * @returns The result of the operation.
 */
const isStatusObject = (status) => typeof status === 'object' && status !== null;
/**
 * Exchange messages that mean a cancel was refused because the order is not on
 * the book any more.
 *
 * HyperLiquid answers a cancel it cannot match with "Order was never placed,
 * already canceled, or filled." That is a rejection of the request but a
 * confirmation of what the caller wanted — nothing of that order is resting.
 * Every other rejection (multi-sig, a stale nonce, a rate limit) leaves the
 * order exactly where it was, which is a materially different outcome.
 */
const ALREADY_GONE_CANCEL_MARKERS = [
    'never placed',
    'already canceled',
    'already cancelled',
    'order not found',
];
/**
 * Classify one entry of a cancel response.
 *
 * @param status - A single status from the exchange's cancel response.
 * @returns Whether the order was cancelled, was already gone, or still rests.
 */
const classifyCancelStatus = (status) => {
    if (status === 'success') {
        return 'cancelled';
    }
    const message = (isStatusObject(status) && typeof status.error === 'string'
        ? status.error
        : '').toLowerCase();
    return ALREADY_GONE_CANCEL_MARKERS.some((marker) => message.includes(marker))
        ? 'gone'
        : 'refused';
};
/**
 * Read the best price on one side of the book, discounting the chase's own
 * order.
 *
 * A chase rests one tick inside the spread, so its own order *is* the best
 * price on its side. Reading the raw book would therefore see the chase's own
 * quote every tick, conclude the touch has not moved, and never re-price —
 * masking exactly the adverse moves the strategy exists to follow. Levels this
 * provider occupies are netted down by what it holds there, and are skipped
 * entirely when nothing else is left on them.
 *
 * "Own" means *every* chase this provider is running on that side, not just the
 * one asking. Two chases on the same side each netting only themselves would
 * read the other as the external touch and improve on it, then improve on the
 * improvement — walking each other toward the opposite side of an unchanged
 * market.
 *
 * The sizes must be what the orders still have resting, not what they were
 * placed for: an order netted at its original size subtracts more than it
 * occupies, which can hide external liquidity sharing the level.
 *
 * @param levels - One side of the book, best-first.
 * @param ownByPrice - This provider's own resting size at each price.
 * @returns The best price other participants are showing, or null.
 */
const readBestExternalPrice = (levels, ownByPrice) => {
    for (const level of levels ?? []) {
        const price = parseFloat(level.px);
        if (!Number.isFinite(price) || price <= 0) {
            continue;
        }
        const size = parseFloat(level.sz) - (ownByPrice.get(level.px) ?? 0);
        if (size > 0) {
            return price;
        }
    }
    return null;
};
/**
 * Narrow order params down to their strategy fields.
 *
 * Both validation entry points forward exactly this group, so a field added to
 * `StrategyOrderValidationParams` reaches both of them or neither.
 *
 * @param params - Order parameters.
 * @returns The strategy fields, as validation takes them.
 */
const pickStrategyParams = (params) => ({
    twapDuration: params.twapDuration,
    twapRandomize: params.twapRandomize,
    scaleMinPrice: params.scaleMinPrice,
    scaleMaxPrice: params.scaleMaxPrice,
    scaleNumOrders: params.scaleNumOrders,
    chaseIntervalMs: params.chaseIntervalMs,
    chaseMaxDurationMs: params.chaseMaxDurationMs,
    chaseMaxRepricings: params.chaseMaxRepricings,
});
/**
 * Check a strategy placement's notional against the minimum the venue will
 * actually apply to it.
 *
 * The per-order minimum is charged against each order the venue receives, and a
 * strategy placement does not send one order:
 *
 * A `twap` is a single instruction the venue slices itself, so it is bounded by
 * the venue's own documented minimum for a TWAP rather than by the per-order
 * minimum that `validateOrder` has already applied.
 *
 * `scale` is deliberately absent. Its rungs are the orders the venue charges
 * the minimum against, and their sizes come from flooring onto the asset's size
 * grid with the remainder landing on the first rung — none of which is knowable
 * without `szDecimals`, which this check does not have. Every approximation
 * available here is unsound in one direction or the other, and the one that was
 * here rejected ladders whose submitted rungs all cleared the minimum.
 * `#buildScaleLadder` applies the exact per-rung check against the real grid
 * sizes, and it runs before anything is signed, so nothing is lost by leaving
 * the question to it.
 *
 * `chase` is absent too: it rests one order at a time, so the per-order minimum
 * the caller has already been checked against is the right bound.
 *
 * @param params - Notional parameters.
 * @param params.orderType - The order placement type.
 * @param params.orderValueUSD - Total notional of the placement, in USD.
 * @returns Validation result with isValid flag and optional error message.
 */
const validateStrategyNotional = (params) => {
    const { orderType, orderValueUSD } = params;
    if (orderType === 'twap') {
        return orderValueUSD < perpsConfig_js_1.HYPERLIQUID_TWAP_LIMITS.MinNotionalUsd
            ? {
                isValid: false,
                error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_TWAP_NOTIONAL_TOO_SMALL,
            }
            : { isValid: true };
    }
    return { isValid: true };
};
/**
 * Collect the order IDs of every TP/SL child carried by a parent order.
 *
 * HyperLiquid lists `normalTpsl` children both nested under their parent and as
 * top-level entries in `frontendOpenOrders`. Those children protect the pending
 * parent order rather than the position, so callers use this set to exclude them.
 *
 * @param orders - Raw frontend open orders for the account.
 * @returns The set of child order IDs.
 */
function collectChildOrderIds(orders) {
    const childOrderIds = new Set();
    orders.forEach((order) => {
        order.children?.forEach((child) => {
            childOrderIds.add(child.oid);
        });
    });
    return childOrderIds;
}
/**
 * Group orders by market, so a per-position pass does not rescan every order.
 *
 * @param orders - Raw frontend open orders across all DEXs.
 * @returns Orders keyed by market symbol.
 */
function groupOrdersBySymbol(orders) {
    const bySymbol = new Map();
    orders.forEach((order) => {
        const existing = bySymbol.get(order.coin);
        if (existing) {
            existing.push(order);
        }
        else {
            bySymbol.set(order.coin, [order]);
        }
    });
    return bySymbol;
}
/**
 * Build the trigger-order view of a position: position-bound TP/SL plus
 * standalone (partial) reduce-only triggers on the same market, de-duplicated by
 * order ID and excluding children of pending parent orders.
 *
 * @param params - Collection parameters.
 * @param params.orders - Raw frontend open orders across all DEXs.
 * @param params.position - Position the triggers are attached to.
 * @param params.childOrderIds - Order IDs that belong to a pending parent order.
 * @returns The take profit and stop loss trigger orders for the position.
 */
function collectPositionTriggerOrders(params) {
    const { orders, position, childOrderIds } = params;
    const byOrderId = new Map();
    let takeProfitPrice;
    let stopLossPrice;
    orders.forEach((rawOrder) => {
        if (rawOrder.isTrigger &&
            rawOrder.reduceOnly &&
            rawOrder.isPositionTpsl === Boolean(perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl)) {
            if (rawOrder.orderType.includes('Take Profit')) {
                takeProfitPrice = rawOrder.triggerPx;
            }
            else if (rawOrder.orderType.includes('Stop')) {
                stopLossPrice = rawOrder.triggerPx;
            }
        }
        rawOrder.children?.forEach((childOrder) => {
            if (!childOrder.isTrigger ||
                !childOrder.reduceOnly ||
                childOrder.isPositionTpsl !== Boolean(perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl)) {
                return;
            }
            if (childOrder.orderType.includes('Take Profit')) {
                takeProfitPrice = childOrder.triggerPx;
            }
            else if (childOrder.orderType.includes('Stop')) {
                stopLossPrice = childOrder.triggerPx;
            }
        });
        if (rawOrder.coin !== position.symbol ||
            !rawOrder.isTrigger ||
            !rawOrder.reduceOnly ||
            childOrderIds.has(rawOrder.oid)) {
            return;
        }
        const triggerOrder = (0, hyperLiquidAdapter_js_1.adaptPositionTriggerOrderFromSDK)({
            rawOrder,
            positionSize: position.size,
            entryPrice: position.entryPrice,
        });
        if (triggerOrder && !byOrderId.has(triggerOrder.orderId)) {
            byOrderId.set(triggerOrder.orderId, triggerOrder);
        }
    });
    const triggerOrders = Array.from(byOrderId.values());
    return {
        takeProfitOrders: triggerOrders.filter((order) => order.direction === 'take_profit'),
        stopLossOrders: triggerOrders.filter((order) => order.direction !== 'take_profit'),
        ...(takeProfitPrice && { takeProfitPrice }),
        ...(stopLossPrice && { stopLossPrice }),
    };
}
/**
 * HyperLiquid provider implementation
 *
 * Implements the PerpsProvider interface for HyperLiquid protocol.
 * Uses the @nktkas/hyperliquid SDK for all operations.
 * Delegates to service classes for client management, wallet integration, and subscriptions.
 *
 * HIP-3 Balance Management:
 * Attempts to use HyperLiquid's native DEX abstraction for automatic collateral transfers.
 * If not supported, falls back to programmatic balance management using SDK's sendAsset.
 */
class HyperLiquidProvider {
    constructor(options) {
        _HyperLiquidProvider_instances.add(this);
        this.protocolId = 'hyperliquid';
        // Platform dependencies for logging and debugging
        _HyperLiquidProvider_deps.set(this, void 0);
        // Service instances
        _HyperLiquidProvider_clientService.set(this, void 0);
        _HyperLiquidProvider_walletService.set(this, void 0);
        _HyperLiquidProvider_subscriptionService.set(this, void 0);
        // Asset mapping
        _HyperLiquidProvider_symbolToAssetId.set(this, new Map());
        // Cache for user fee rates to avoid excessive API calls
        _HyperLiquidProvider_userFeeCache.set(this, new Map());
        // Cache for max leverage values to avoid excessive API calls
        _HyperLiquidProvider_maxLeverageCache.set(this, new Map());
        // Cache for raw meta responses (shared across methods to avoid redundant API calls)
        // Filtering is applied on-demand (cheap array operations) - no need for separate processed cache
        _HyperLiquidProvider_cachedMetaByDex.set(this, new Map());
        // Last known-good market list for stale fallback when every enabled DEX fails in one fetch window.
        _HyperLiquidProvider_cachedMarketDataWithPrices.set(this, null);
        // Session cache for spot metadata (contains token info for HIP-3 collateral checks)
        // Pre-fetched in ensureReadyForTrading() to avoid API failures during order placement
        _HyperLiquidProvider_cachedSpotMeta.set(this, null);
        // Unified DEX discovery cache — single source of truth for all perpDexs() derivatives.
        // Replaces three separate caches to eliminate desync bugs by construction.
        // All writes go through #dexDiscoveryCache.update(); readers use .state.
        _HyperLiquidProvider_dexDiscoveryCache.set(this, void 0);
        // Session cache for referral state (cleared on disconnect/reconnect)
        // Key: `network:userAddress`, Value: true if referral is set
        _HyperLiquidProvider_referralCheckCache.set(this, new Map());
        // Session cache for builder fee approval state (cleared on disconnect/reconnect)
        // Key: `network:userAddress`, Value: true if builder fee is approved
        _HyperLiquidProvider_builderFeeCheckCache.set(this, new Map());
        // Pending promise trackers for deduplicating concurrent calls
        // Prevents multiple signature requests when methods called simultaneously
        _HyperLiquidProvider_ensureReadyPromise.set(this, null);
        _HyperLiquidProvider_pendingBuilderFeeApprovals.set(this, new Map());
        _HyperLiquidProvider_subscriptionBuilderApprovalEpoch.set(this, 0);
        /** Builder approvals keyed by network, account, and builder address. */
        _HyperLiquidProvider_approvedBuilderAddresses.set(this, new Set());
        // Pre-compiled patterns for fast filtering
        _HyperLiquidProvider_compiledAllowlistPatterns.set(this, []);
        _HyperLiquidProvider_compiledBlocklistPatterns.set(this, []);
        // Fee discount context for MetaMask reward discounts (in basis points)
        _HyperLiquidProvider_userFeeDiscountBips.set(this, void 0);
        _HyperLiquidProvider_userFeeResolution.set(this, void 0);
        // Feature flag configuration for HIP-3 market filtering
        _HyperLiquidProvider_hip3Enabled.set(this, void 0);
        _HyperLiquidProvider_allowlistMarkets.set(this, void 0);
        _HyperLiquidProvider_blocklistMarkets.set(this, void 0);
        // Emergency kill-switch for the Unified Account migration flow. Defaults
        // to true and is the expected production state after HL's DEX Abstraction
        // deprecation. Kept as a constructor option (not removed) so we can
        // disable the migration via a hot-fix release if a regression surfaces
        // in the wild — flipping this to false reverts to the legacy programmatic
        // HIP-3 transfer path that already lives in the codebase.
        _HyperLiquidProvider_useUnifiedAccount.set(this, void 0);
        // True once DEX discovery has succeeded with real data (not a fallback).
        // When false, #ensureReadyPromise is reset after each init so the next
        // caller retries DEX discovery instead of reusing a degraded mapping.
        _HyperLiquidProvider_dexDiscoveryComplete.set(this, false);
        // True when the most recent #ensureUnifiedAccountEnabled run ended in a
        // transient state that warrants retry (silent agent-key failure, REST
        // userAbstraction lookup failure, or keyring locked). #ensureReady resets
        // its memoized promise when this is set so the next entry retries the
        // migration instead of returning the cached resolved promise.
        _HyperLiquidProvider_unifiedAccountSetupNeedsRetry.set(this, false);
        // Pending promise to deduplicate concurrent getValidatedDexs() calls
        _HyperLiquidProvider_pendingValidatedDexsPromise.set(this, null);
        // Cache for USDC token ID from spot metadata
        _HyperLiquidProvider_cachedUsdcTokenId.set(this, void 0);
        // Error mappings from HyperLiquid API errors to standardized PERPS_ERROR_CODES
        _HyperLiquidProvider_errorMappings.set(this, {
            'isolated position does not have sufficient margin available to decrease leverage': perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_LEVERAGE_REDUCTION_FAILED,
            'could not immediately match': perpsErrorCodes_js_1.PERPS_ERROR_CODES.IOC_CANCEL,
            'multi-sig required': perpsErrorCodes_js_1.PERPS_ERROR_CODES.EXCHANGE_MULTI_SIG_REQUIRED,
            'invalid nonce': perpsErrorCodes_js_1.PERPS_ERROR_CODES.EXCHANGE_INVALID_NONCE,
        });
        // Scale ladders placed by this provider instance, keyed by group handle, so
        // one cancel can reach every rung. Cleared on disconnect; the rung IDs are
        // also returned to the caller as `OrderResult.childOrderIds`.
        _HyperLiquidProvider_scaleOrderGroups.set(this, new Map());
        // Chase sessions running on this provider instance, keyed by session handle.
        // Each owns a pending timer, so disconnect has to stop them.
        _HyperLiquidProvider_chaseSessions.set(this, new Map());
        // Chase placements that have reserved a slot against the venue's concurrency
        // cap but have not registered their session yet. Two round trips separate the
        // two, and a reservation is what keeps concurrent placements from both
        // passing the check.
        _HyperLiquidProvider_chasePlacementsInFlight.set(this, 0);
        // Bumped by every teardown that clears the chase registry. A placement
        // captures it before its round trips and refuses to register afterwards if it
        // has moved: a session registered after a disconnect would schedule a
        // background timer against a provider that has already been torn down.
        _HyperLiquidProvider_chaseGeneration.set(this, 0);
        // Track whether clients have been initialized (lazy initialization)
        _HyperLiquidProvider_clientsInitialized.set(this, false);
        // Promise-based lock to prevent race conditions in concurrent initialization
        _HyperLiquidProvider_initializationPromise.set(this, null);
        _HyperLiquidProvider_messenger.set(this, void 0);
        _HyperLiquidProvider_builderAddressTestnet.set(this, void 0);
        _HyperLiquidProvider_builderAddressMainnet.set(this, void 0);
        _HyperLiquidProvider_subscriptionBuilderAddressTestnet.set(this, void 0);
        _HyperLiquidProvider_subscriptionBuilderAddressMainnet.set(this, void 0);
        _HyperLiquidProvider_priceDeviationLimit.set(this, void 0);
        /**
         * Ensure provider is ready for TRADING operations (signing required)
         *
         * This method performs additional setup that requires user signatures:
         * - DEX abstraction enablement (for HIP-3 auto-transfers)
         * - Builder fee approval (required for orders)
         * - Referral code setup (attribution)
         *
         * These operations are DEFERRED from ensureReady() to avoid hardware wallet prompt spam
         * when users are just viewing the Perps section (critical for hardware wallets).
         *
         * Call this method before any trading operation (placeOrder, cancelOrder, etc.)
         */
        _HyperLiquidProvider_tradingSetupPromise.set(this, null);
        _HyperLiquidProvider_tradingSetupComplete.set(this, false);
        __classPrivateFieldSet(this, _HyperLiquidProvider_deps, options.platformDependencies, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_messenger, options.messenger, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_builderAddressTestnet, options.builderAddressTestnet, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_builderAddressMainnet, options.builderAddressMainnet, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_subscriptionBuilderAddressTestnet, options.subscriptionBuilderAddressTestnet, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_subscriptionBuilderAddressMainnet, options.subscriptionBuilderAddressMainnet, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_priceDeviationLimit, options.priceDeviationLimit ??
            hyperLiquidConfig_js_1.HYPERLIQUID_CONFIG.OraclePriceDeviationLimit, "f");
        const isTestnet = options.isTestnet ?? false;
        // Dev-friendly defaults: Enable all markets by default for easier testing (discovery mode)
        __classPrivateFieldSet(this, _HyperLiquidProvider_hip3Enabled, options.hip3Enabled ?? false, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_allowlistMarkets, options.allowlistMarkets ?? [], "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_blocklistMarkets, options.blocklistMarkets ?? [], "f");
        // Attempt unified account mode, fallback to programmatic transfer if unsupported
        __classPrivateFieldSet(this, _HyperLiquidProvider_useUnifiedAccount, options.useUnifiedAccount ?? true, "f");
        // Initialize services with injected platform dependencies
        __classPrivateFieldSet(this, _HyperLiquidProvider_clientService, new HyperLiquidClientService_js_1.HyperLiquidClientService(__classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f"), {
            isTestnet,
        }), "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_dexDiscoveryCache, new DexDiscoveryCacheManager_js_1.DexDiscoveryCacheManager({
            isTestnetMode: () => __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
            debugLogger: __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger,
            getAllowlistMarkets: () => __classPrivateFieldGet(this, _HyperLiquidProvider_allowlistMarkets, "f"),
        }), "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_walletService, new HyperLiquidWalletService_js_1.HyperLiquidWalletService(__classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_messenger, "f"), {
            isTestnet,
        }), "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_subscriptionService, new HyperLiquidSubscriptionService_js_1.HyperLiquidSubscriptionService(__classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f"), [], // enabledDexs - will be populated after DEX discovery in buildAssetMapping
        __classPrivateFieldGet(this, _HyperLiquidProvider_allowlistMarkets, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_blocklistMarkets, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_priceDeviationLimit, "f"), async () => {
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            const validatedDexs = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getValidatedDexs).call(this);
            return validatedDexs.filter((dex) => dex !== null);
        }), "f");
        // NOTE: Clients are NOT initialized here - they'll be initialized lazily
        // when first needed. This avoids accessing Engine.context before it's ready.
        // Pre-compile filter patterns for performance (invalid patterns are skipped)
        __classPrivateFieldSet(this, _HyperLiquidProvider_compiledAllowlistPatterns, __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_compilePatternsSafely).call(this, __classPrivateFieldGet(this, _HyperLiquidProvider_allowlistMarkets, "f"), 'allowlist'), "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_compiledBlocklistPatterns, __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_compilePatternsSafely).call(this, __classPrivateFieldGet(this, _HyperLiquidProvider_blocklistMarkets, "f"), 'blocklist'), "f");
        // Populate initial asset mapping if provided (used for DI in tests)
        if (options.initialAssetMapping) {
            for (const [symbol, assetId] of options.initialAssetMapping) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").set(symbol, assetId);
            }
        }
        // Debug: Confirm batch methods exist and show HIP-3 config
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[HyperLiquidProvider] Constructor complete', {
            hasBatchCancel: typeof this.cancelOrders === 'function',
            hasBatchClose: typeof this.closePositions === 'function',
            protocolId: this.protocolId,
            hip3Enabled: __classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f"),
            allowlistMarkets: __classPrivateFieldGet(this, _HyperLiquidProvider_allowlistMarkets, "f"),
            blocklistMarkets: __classPrivateFieldGet(this, _HyperLiquidProvider_blocklistMarkets, "f"),
            isTestnet,
        });
    }
    /**
     * Get fills using WebSocket cache first, falling back to REST API
     * OPTIMIZATION: Uses cached fills when available (0 API weight), only calls REST on cache miss
     *
     * Cache limitation: WebSocket cache is limited to ~100 most recent fills.
     * For historical data (e.g., position-opening fills from months ago), use getOrderFills directly.
     *
     * @param params - Optional filter parameters (startTime, symbol)
     * @returns Array of order fills
     */
    async getOrFetchFills(params) {
        // Check WebSocket cache first (0 API weight)
        const cachedFills = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getFillsCacheIfInitialized();
        if (cachedFills !== null) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using WebSocket cached fills', {
                count: cachedFills.length,
                params,
            });
            return __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_filterFills).call(this, cachedFills, params);
        }
        // Fallback to REST API when cache not initialized
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Fills cache miss for getOrFetchFills, falling back to REST', { params });
        const restFills = await this.getOrderFills(params);
        // Apply symbol filter to REST results for consistent API behavior
        // Note: getOrderFills doesn't support symbol filtering natively
        return __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_filterFills).call(this, restFills, params);
    }
    /**
     * Set user fee discount context for next operations
     * Used by PerpsController to apply MetaMask reward discounts
     *
     * @param discountBips - The discount in basis points (e.g., 550 = 5.5%)
     */
    setUserFeeDiscount(discountBips) {
        __classPrivateFieldSet(this, _HyperLiquidProvider_userFeeResolution, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_userFeeDiscountBips, discountBips, "f");
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid: Fee discount context updated', {
            discountBips,
            discountPercentage: discountBips ? discountBips / 100 : undefined,
            isActive: discountBips !== undefined,
        });
    }
    /**
     * Set the resolved fee and its attribution source for the next operation.
     *
     * @param resolution - Unified fee resolution, or undefined to clear it.
     */
    setUserFeeResolution(resolution) {
        __classPrivateFieldSet(this, _HyperLiquidProvider_userFeeResolution, resolution, "f");
        __classPrivateFieldSet(this, _HyperLiquidProvider_userFeeDiscountBips, resolution?.discountBips, "f");
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid: Fee resolution context updated', {
            source: resolution?.source,
            discountBips: resolution?.discountBips,
            isActive: resolution !== undefined,
        });
    }
    /**
     * Get supported deposit routes with complete asset and routing information
     *
     * @param params - The operation parameters.
     * @returns The result of the operation.
     */
    getDepositRoutes(params) {
        const isTestnet = params?.isTestnet ?? __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode();
        const supportedAssets = (0, hyperLiquidValidation_js_1.getSupportedPaths)({ ...params, isTestnet });
        const bridgeInfo = (0, hyperLiquidConfig_js_1.getBridgeInfo)(isTestnet);
        return supportedAssets.map((assetId) => ({
            assetId,
            chainId: bridgeInfo.chainId,
            contractAddress: bridgeInfo.contractAddress,
            constraints: {
                minAmount: perpsConfig_js_1.WITHDRAWAL_CONSTANTS.DefaultMinAmount,
                estimatedMinutes: hyperLiquidConfig_js_1.HYPERLIQUID_WITHDRAWAL_MINUTES,
                fees: {
                    fixed: perpsConfig_js_1.WITHDRAWAL_CONSTANTS.DefaultFeeAmount,
                    token: perpsConfig_js_1.WITHDRAWAL_CONSTANTS.DefaultFeeToken,
                },
            },
        }));
    }
    /**
     * Get supported withdrawal routes with complete asset and routing information
     *
     * @param params - The operation parameters.
     * @returns The result of the operation.
     */
    getWithdrawalRoutes(params) {
        // For HyperLiquid, withdrawal routes are the same as deposit routes
        return this.getDepositRoutes(params);
    }
    /**
     * Approve the dedicated subscription builder outside order submission.
     * Failure is non-blocking: order construction will use the ordinary builder
     * at the standard fee until a later approval succeeds.
     *
     * @returns Whether the builder is approved for the current account.
     */
    async approveSubscriptionBuilderFee() {
        const approvalEpoch = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionBuilderApprovalEpoch, "f");
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
        if (approvalEpoch !== __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionBuilderApprovalEpoch, "f")) {
            return false;
        }
        const isTestnet = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode();
        const network = isTestnet ? 'testnet' : 'mainnet';
        const builderAddress = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getSubscriptionBuilderAddress).call(this, isTestnet);
        if (!builderAddress) {
            return false;
        }
        const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
        const key = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getApprovedBuilderKey).call(this, network, userAddress, builderAddress);
        if (__classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").has(key)) {
            return true;
        }
        const pending = __classPrivateFieldGet(this, _HyperLiquidProvider_pendingBuilderFeeApprovals, "f").get(key);
        if (pending) {
            try {
                await pending;
                return __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").has(key);
            }
            catch (error) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Subscription builder approval unavailable', error);
                return false;
            }
        }
        const approval = (async () => {
            const currentApproval = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_checkBuilderFeeApproval).call(this, builderAddress, userAddress);
            if (approvalEpoch !== __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionBuilderApprovalEpoch, "f")) {
                return;
            }
            if (currentApproval !== null &&
                currentApproval >= hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeDecimal) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").add(key);
                return;
            }
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            await exchangeClient.approveBuilderFee({
                builder: builderAddress,
                maxFeeRate: hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeRate,
            });
            if (approvalEpoch !== __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionBuilderApprovalEpoch, "f")) {
                return;
            }
            const afterApproval = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_checkBuilderFeeApproval).call(this, builderAddress, userAddress);
            if (approvalEpoch !== __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionBuilderApprovalEpoch, "f")) {
                return;
            }
            if (afterApproval === null ||
                afterApproval < hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeDecimal) {
                throw new Error('[HyperLiquidProvider] Subscription builder approval verification failed');
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").add(key);
        })();
        __classPrivateFieldGet(this, _HyperLiquidProvider_pendingBuilderFeeApprovals, "f").set(key, approval);
        try {
            await approval;
            return __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").has(key);
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Subscription builder approval unavailable', error);
            return false;
        }
        finally {
            if (__classPrivateFieldGet(this, _HyperLiquidProvider_pendingBuilderFeeApprovals, "f").get(key) === approval) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_pendingBuilderFeeApprovals, "f").delete(key);
            }
        }
    }
    /**
     * Place an order using direct wallet signing
     *
     * Refactored to use helper methods for better maintainability and reduced complexity.
     * Each helper method is focused on a single responsibility.
     *
     * @param params - Order parameters
     * @param retryCount - Internal retry counter to prevent infinite loops (default: 0)
     * @returns A promise that resolves to the result.
     */
    async placeOrder(params, retryCount = 0) {
        // Hoisted so the retry path in the catch block can use the fetched price
        // even when the caller (e.g. flipPosition) omits currentPrice from params.
        let effectivePrice;
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Placing order via HyperLiquid SDK:', params);
            // Basic sync validation (backward compatibility)
            const validation = (0, hyperLiquidValidation_js_1.validateOrderParams)({
                coin: params.symbol,
                size: params.size,
                price: params.price,
                orderType: params.orderType,
                triggerPrice: params.triggerPrice,
                takeProfitPrice: params.takeProfitPrice,
                stopLossPrice: params.stopLossPrice,
                takeProfitSize: params.takeProfitSize,
                stopLossSize: params.stopLossSize,
                tpslLinkage: params.tpslLinkage,
                grouping: params.grouping,
                timeInForce: params.timeInForce,
                clientOrderId: params.clientOrderId,
                ...pickStrategyParams(params),
            });
            if (!validation.isValid) {
                throw new Error(validation.error);
            }
            // Strategy placements expand into an execution schedule rather than a
            // single order, so they leave the shared path here — before the order
            // array, the HIP-3 transfer, and the atomic single-order submit, none of
            // which describe what a TWAP, a ladder, or a chase does.
            if ((0, orderTypes_js_1.isStrategyOrderType)(params.orderType)) {
                return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_placeStrategyOrder).call(this, params, params.orderType);
            }
            // Extract DEX name for API calls (main DEX = null)
            const { dex: dexName } = (0, hyperLiquidAdapter_js_1.parseAssetName)(params.symbol);
            // 1. Get asset info and current price before validation so price-less
            // callers (e.g. flipPosition) can validate against the live fetched price.
            const { assetInfo, currentPrice, meta } = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetInfo).call(this, {
                symbol: params.symbol,
                dexName,
            });
            // A price or partial size that rounds away at the asset precision is
            // caught here, as soon as szDecimals is known and before anything is
            // committed: the signing prompts in #ensureReadyForTrading, the leverage
            // change in #prepareAssetForTrading, and the HIP-3 margin transfer all
            // come later.
            const precision = (0, orderCalculations_js_1.validateOrderPrecision)({
                triggerPrice: params.triggerPrice,
                takeProfitPrice: params.takeProfitPrice,
                stopLossPrice: params.stopLossPrice,
                takeProfitSize: params.takeProfitSize,
                stopLossSize: params.stopLossSize,
                szDecimals: assetInfo.szDecimals,
            });
            if (!precision.isValid) {
                throw new Error(precision.error);
            }
            // Allow override with UI-provided price (optimization to avoid API call).
            effectivePrice =
                params.currentPrice && params.currentPrice > 0
                    ? params.currentPrice
                    : currentPrice;
            if (params.currentPrice && params.currentPrice > 0) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using provided current price:', {
                    coin: params.symbol,
                    providedPrice: effectivePrice,
                    source: 'UI price feed',
                });
            }
            // Validate order at provider level (enforces USD validation rules).
            // Pass effectivePrice so price-less market orders (e.g. flipPosition)
            // validate against the live fetched price instead of failing with
            // ORDER_PRICE_REQUIRED.
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_validateOrderBeforePlacement).call(this, {
                ...params,
                currentPrice: effectivePrice,
            });
            // Ensure provider is ready for trading (includes signing operations).
            // Kept after validation so invalid orders never trigger signature prompts
            // (builder-fee approval, DEX abstraction enablement, etc.).
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
            // Debug: Log asset map state before order placement
            const allMapKeys = Array.from(__classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").keys());
            const hip3Keys = allMapKeys.filter((key) => key.includes(':'));
            const assetExists = __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").has(params.symbol);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Asset map state at order time', {
                requestedCoin: params.symbol,
                assetExistsInMap: assetExists,
                totalAssetsInMap: __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").size,
                hip3AssetsCount: hip3Keys.length,
                hip3AssetsSample: hip3Keys.slice(0, 10),
                hip3Enabled: __classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f"),
                allowlistMarkets: __classPrivateFieldGet(this, _HyperLiquidProvider_allowlistMarkets, "f"),
                blocklistMarkets: __classPrivateFieldGet(this, _HyperLiquidProvider_blocklistMarkets, "f"),
            });
            // Normalize the deprecated decimal `slippage` to bps once so both the
            // price-staleness check and the limit-price calc see the same value.
            const normalizedMaxSlippageBps = params.maxSlippageBps ??
                (typeof params.slippage === 'number'
                    ? Math.round(params.slippage * hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR)
                    : undefined);
            const { finalPositionSize } = (0, orderCalculations_js_1.calculateFinalPositionSize)({
                usdAmount: params.usdAmount,
                size: params.size,
                currentPrice: effectivePrice,
                priceAtCalculation: params.priceAtCalculation,
                maxSlippageBps: normalizedMaxSlippageBps,
                szDecimals: assetInfo.szDecimals,
                leverage: params.leverage,
                reduceOnly: params.reduceOnly,
            });
            const { orderPrice, formattedSize, formattedPrice } = (0, orderCalculations_js_1.calculateOrderPriceAndSize)({
                orderType: params.orderType,
                isBuy: params.isBuy,
                finalPositionSize,
                currentPrice: effectivePrice,
                limitPrice: params.price,
                triggerPrice: params.triggerPrice,
                maxSlippageBps: normalizedMaxSlippageBps,
                szDecimals: assetInfo.szDecimals,
            });
            // 4. Get asset ID and validate it exists
            const assetId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
                symbol: params.symbol,
                dexName,
                meta,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Resolved DEX-specific asset ID', {
                coin: params.symbol,
                dex: dexName ?? 'main',
                assetId,
            });
            // 5. Update leverage if specified
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_prepareAssetForTrading).call(this, {
                symbol: params.symbol,
                assetId,
                leverage: params.leverage,
            });
            // 6. Handle HIP-3 balance management (if applicable)
            const isHip3Order = dexName !== null;
            let transferInfo = null;
            if (isHip3Order && dexName) {
                const effectiveLeverage = params.leverage ?? assetInfo.maxLeverage ?? 1;
                const hip3Result = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_handleHip3PreOrder).call(this, {
                    dexName,
                    symbol: params.symbol,
                    orderPrice,
                    positionSize: parseFloat(formattedSize),
                    leverage: effectiveLeverage,
                    isBuy: params.isBuy,
                    maxLeverage: assetInfo.maxLeverage,
                });
                transferInfo = hip3Result.transferInfo;
            }
            // 7. Build orders array (main + TP/SL if specified)
            const { orders, grouping } = (0, orderCalculations_js_1.buildOrdersArray)({
                assetId,
                isBuy: params.isBuy,
                formattedPrice,
                formattedSize,
                reduceOnly: params.reduceOnly ?? false,
                orderType: params.orderType,
                timeInForce: params.timeInForce,
                clientOrderId: params.clientOrderId,
                triggerPrice: params.triggerPrice,
                takeProfitPrice: params.takeProfitPrice,
                stopLossPrice: params.stopLossPrice,
                takeProfitSize: params.takeProfitSize,
                stopLossSize: params.stopLossSize,
                szDecimals: assetInfo.szDecimals,
                // The provider-agnostic linkage wins; `grouping` is the deprecated
                // HyperLiquid-shaped spelling kept for existing callers.
                grouping: params.tpslLinkage
                    ? (0, hyperLiquidAdapter_js_1.adaptTpslLinkageToGrouping)(params.tpslLinkage)
                    : params.grouping,
            });
            // 8. Submit order with atomic rollback
            return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_submitOrderWithRollback).call(this, {
                orders,
                grouping,
                isHip3Order,
                dexName,
                transferInfo,
                symbol: params.symbol,
                assetId,
            });
        }
        catch (error) {
            // Retry mechanism for $10 minimum order errors
            // This handles the case where UI price feed slightly differs from HyperLiquid's orderbook price
            const errorMessage = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.placeOrder').message;
            const isMinimumOrderError = errorMessage.includes('Order must have minimum value of $10') ||
                errorMessage.includes('Order 0: Order must have minimum value');
            // Reduce-only orders are excluded. The retry works by growing the order
            // 1.5%, which a close cannot do: a full close already submits the whole
            // position, and a partial close is capped at the size the caller asked to
            // close, so the retry would either be rejected as "Reduce only order would
            // increase position" or resubmit an identical order. Surfacing the
            // minimum-value error names the real problem instead.
            //
            // Strategy placements are excluded for the same reason in a different
            // shape: the minimum applies to each TWAP slice and each ladder rung, not
            // to the total, so growing the total by 1.5% does not clear it.
            if (isMinimumOrderError &&
                retryCount === 0 &&
                !params.reduceOnly &&
                !(0, orderTypes_js_1.isStrategyOrderType)(params.orderType)) {
                let adjustedUsdAmount;
                let originalValue;
                if (params.usdAmount) {
                    // USD-based order: adjust the USD amount directly
                    originalValue = params.usdAmount;
                    adjustedUsdAmount = (parseFloat(params.usdAmount) * 1.015).toFixed(2);
                }
                else if (effectivePrice) {
                    // Size-based order: calculate USD from size and adjust.
                    // Use the hoisted effectivePrice (fetched live price) so callers that
                    // omit currentPrice (e.g. flipPosition) can still recover from the
                    // $10-minimum edge case.
                    const sizeValue = parseFloat(params.size);
                    const estimatedUsd = sizeValue * effectivePrice;
                    originalValue = `${estimatedUsd.toFixed(2)} (calculated from size ${params.size})`;
                    adjustedUsdAmount = (estimatedUsd * 1.015).toFixed(2);
                }
                else {
                    // No price information available - cannot retry
                    return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_handleOrderError).call(this, {
                        error,
                        symbol: params.symbol,
                        orderType: params.orderType,
                        isBuy: params.isBuy,
                    });
                }
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Retrying order with adjusted size due to minimum value error', {
                    originalValue,
                    adjustedUsdAmount,
                    retryCount,
                });
                return this.placeOrder({
                    ...params,
                    usdAmount: adjustedUsdAmount,
                }, 1);
            }
            return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_handleOrderError).call(this, {
                error,
                symbol: params.symbol,
                orderType: params.orderType,
                isBuy: params.isBuy,
            });
        }
    }
    /**
     * Edit an existing order (pending/unfilled order)
     *
     * Note: This modifies price/size of a pending order. It CANNOT add TP/SL to an existing order.
     * For adding TP/SL to an existing position, use updatePositionTPSL instead.
     *
     * @param params - The operation parameters.
     * @param params.orderId - The order ID to modify
     * @param params.newOrder - New order parameters (price, size, etc.)
     * @returns A promise that resolves to the result.
     */
    async editOrder(params) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Editing order:', params);
            // Validate size is positive (validateOrderParams no longer validates size)
            const size = parseFloat(params.newOrder.size || '0');
            if (size <= 0) {
                return {
                    success: false,
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE,
                };
            }
            // `modify` rebuilds an order as a plain limit/market order, so a trigger
            // on either side of the edit would be silently dropped. Reject a resting
            // trigger order as well as an edit *into* one; cancel and re-place instead.
            if ((0, orderTypes_js_1.isTriggerOrderType)(params.newOrder.orderType)) {
                return {
                    success: false,
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_EDIT_TRIGGER_UNSUPPORTED,
                };
            }
            // A strategy placement is not a single resting order, so there is nothing
            // for `modify` to rewrite: it would submit the edit as an ordinary
            // FrontendMarket modification and quietly drop the TWAP schedule, the
            // ladder, or the chase loop the caller asked for. Cancel by the strategy
            // handle and place again.
            if ((0, orderTypes_js_1.isStrategyOrderType)(params.newOrder.orderType)) {
                return {
                    success: false,
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_EDIT_STRATEGY_UNSUPPORTED,
                };
            }
            // The WebSocket order cache is the cheap source for the resting order's
            // placement type, but it may be cold or stale.
            const cachedRestingOrder = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f")
                .getOrdersCacheIfInitialized()
                ?.find((order) => order.orderId === params.orderId.toString());
            if (cachedRestingOrder?.isTrigger === true) {
                return {
                    success: false,
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_EDIT_TRIGGER_UNSUPPORTED,
                };
            }
            // Validate new order parameters
            const validation = (0, hyperLiquidValidation_js_1.validateOrderParams)({
                coin: params.newOrder.symbol,
                size: params.newOrder.size,
                price: params.newOrder.price,
                orderType: params.newOrder.orderType,
                triggerPrice: params.newOrder.triggerPrice,
                takeProfitPrice: params.newOrder.takeProfitPrice,
                stopLossPrice: params.newOrder.stopLossPrice,
                takeProfitSize: params.newOrder.takeProfitSize,
                stopLossSize: params.newOrder.stopLossSize,
                tpslLinkage: params.newOrder.tpslLinkage,
                grouping: params.newOrder.grouping,
                timeInForce: params.newOrder.timeInForce,
            });
            if (!validation.isValid) {
                throw new Error(validation.error);
            }
            // Extract DEX name for API calls (main DEX = null)
            const { dex: dexName } = (0, hyperLiquidAdapter_js_1.parseAssetName)(params.newOrder.symbol);
            // Initialization only — clients and the asset mapping. The signing half
            // of readiness is deferred until after the checks below, so a refused
            // edit never prompts for a signature or writes an approval.
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
            // What is resting before the edit serves two purposes, and they carry
            // different weight. Verifying the target is REQUIRED when the cache could
            // not do it — an unverified edit can rebuild a protective stop as a plain
            // order — so that read must fail closed. Providing a baseline for the
            // optional orderId resolution is not: when the cache already confirmed the
            // order, a failed read must not sink a modify that would otherwise
            // succeed, exactly as the post-modify lookup does not.
            let ordersBeforeEdit;
            if (cachedRestingOrder === undefined) {
                ordersBeforeEdit = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchOpenOrders).call(this, { dexName });
                const restingOrder = ordersBeforeEdit.find((order) => order.oid.toString() === params.orderId.toString());
                if (!restingOrder) {
                    return {
                        success: false,
                        error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_EDIT_ORDER_UNVERIFIABLE,
                    };
                }
                if (restingOrder.isTrigger) {
                    return {
                        success: false,
                        error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_EDIT_TRIGGER_UNSUPPORTED,
                    };
                }
            }
            else {
                try {
                    ordersBeforeEdit = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchOpenOrders).call(this, { dexName });
                }
                catch (error) {
                    // Only the optional identity baseline is lost. Without it novelty
                    // cannot be judged, so the id is omitted below rather than guessed.
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Could not read the pre-edit orders baseline:', error);
                }
            }
            // Get asset info and prices (uses cache to avoid redundant API calls)
            const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName });
            // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
            const assetInfo = meta.universe.find((asset) => asset.name === params.newOrder.symbol);
            if (!assetInfo) {
                throw new Error(`Asset ${params.newOrder.symbol} not found in ${dexName ?? 'main'} DEX universe`);
            }
            const currentPrice = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getOrFetchPrice).call(this, {
                symbol: params.newOrder.symbol,
                dexName: dexName ?? null,
            });
            // Calculate order parameters using the same helper as placeOrder so the
            // slippage rules stay in one place (bps → decimal, market-only, default).
            // Accept the deprecated decimal `slippage` field too, normalizing to bps.
            const normalizedMaxSlippageBps = params.newOrder.maxSlippageBps ??
                (typeof params.newOrder.slippage === 'number'
                    ? Math.round(params.newOrder.slippage * hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR)
                    : undefined);
            const { formattedSize, formattedPrice } = (0, orderCalculations_js_1.calculateOrderPriceAndSize)({
                orderType: params.newOrder.orderType,
                isBuy: params.newOrder.isBuy,
                finalPositionSize: parseFloat(params.newOrder.size),
                currentPrice,
                limitPrice: params.newOrder.price,
                maxSlippageBps: normalizedMaxSlippageBps,
                szDecimals: assetInfo.szDecimals,
            });
            const assetId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
                symbol: params.newOrder.symbol,
                dexName,
                meta,
            });
            // Build new order parameters
            const newOrder = {
                a: assetId,
                b: params.newOrder.isBuy,
                p: formattedPrice,
                s: formattedSize,
                r: params.newOrder.reduceOnly ?? false,
                // Same TIF logic as placeOrder - see documentation above for details.
                // A limit order honours the caller's time in force; validation above has
                // already rejected one on any other order shape.
                t: params.newOrder.orderType === 'limit'
                    ? { limit: { tif: (0, orderTypes_js_1.toSDKTimeInForce)(params.newOrder.timeInForce) } }
                    : { limit: { tif: 'FrontendMarket' } }, // True market order
                c: params.newOrder.clientOrderId
                    ? params.newOrder.clientOrderId
                    : undefined,
            };
            // Every refusal is behind us, so the setup that may prompt for signatures
            // and write builder-fee/referral approvals can run now — a rejected edit
            // costs the caller nothing, matching placeOrder and updatePositionTPSL.
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
            // Submit modification via SDK
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            const result = await exchangeClient.modify({
                oid: typeof params.orderId === 'string'
                    ? params.orderId
                    : params.orderId,
                order: newOrder,
            });
            if (result.status !== 'ok') {
                throw new Error(`Order modification failed: ${JSON.stringify(result)}`);
            }
            // `params.orderId` is the order that was just REPLACED, so returning it
            // as OrderResult.orderId (documented as the exchange order ID) names an
            // order the venue has already cancelled. Report the replacement when it
            // can be resolved unambiguously, and otherwise omit the optional id
            // rather than fabricate identity.
            const replacementOrderId = ordersBeforeEdit === undefined
                ? undefined
                : await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_resolveReplacementOrderId).call(this, {
                    previousOrders: ordersBeforeEdit,
                    dexName,
                    symbol: params.newOrder.symbol,
                    isBuy: params.newOrder.isBuy,
                    size: formattedSize,
                });
            return {
                success: true,
                ...(replacementOrderId === undefined
                    ? {}
                    : { orderId: replacementOrderId }),
            };
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.editOrder'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'editOrder', {
                orderId: params.orderId,
                coin: params.newOrder.symbol,
                orderType: params.newOrder.orderType,
            }));
            return (0, hyperLiquidValidation_js_1.createErrorResult)(error, { success: false });
        }
    }
    /**
     * Cancel an order
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async cancelOrder(params) {
        // A strategy handle is not an exchange order ID, so it cannot go through
        // the single-order cancel below. Callers that omit `orderType` — every
        // existing one — keep the behaviour they have today.
        if (params.orderType && (0, orderTypes_js_1.isStrategyOrderType)(params.orderType)) {
            return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_cancelStrategyOrder).call(this, params);
        }
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Canceling order:', params);
            // Hydrate the asset map before coin validation so a cold start (e.g.
            // service-worker restart with an empty prefetch map) can self-heal
            // without signature prompts on invalid cancels. Trading setup (builder
            // fee, referral, unified account) runs only after validation passes,
            // matching placeOrder / editOrder.
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
            const coinValidation = (0, hyperLiquidValidation_js_1.validateCoinExists)(params.symbol, __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f"));
            if (!coinValidation.isValid) {
                throw new Error(coinValidation.error);
            }
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            const asset = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
                symbol: params.symbol,
                dexName: (0, hyperLiquidAdapter_js_1.parseAssetName)(params.symbol).dex,
            });
            const result = await exchangeClient.cancel({
                cancels: [
                    {
                        a: asset,
                        o: parseInt(params.orderId, 10),
                    },
                ],
            });
            const status = result.response?.data?.statuses?.[0];
            if (status === 'success') {
                return {
                    success: true,
                    orderId: params.orderId,
                };
            }
            // HyperLiquid usually rejects a cancel without throwing: the status entry
            // carries the raw exchange string (e.g. "multi-sig required"). Map it the
            // same way as a thrown rejection so callers get a standardized code
            // instead of a generic message. The SDK types every status as 'success',
            // so the rejection shape needs the same cast cancelOrders already uses.
            const rawError = status?.error ??
                'Order cancellation failed';
            return (0, hyperLiquidValidation_js_1.createErrorResult)(__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mapError).call(this, new Error(rawError)), {
                success: false,
                orderId: params.orderId,
            });
        }
        catch (error) {
            const mappedError = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mapError).call(this, error);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(mappedError, await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getTradingErrorContext).call(this, 'cancelOrder', mappedError, {
                orderId: params.orderId,
                coin: params.symbol,
            }));
            return (0, hyperLiquidValidation_js_1.createErrorResult)(mappedError, { success: false });
        }
    }
    /**
     * Cancel multiple orders in a single batch API call
     * Optimized implementation that uses HyperLiquid's batch cancel endpoint
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async cancelOrders(params) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Batch canceling orders:', {
                count: params.length,
            });
            if (params.length === 0) {
                return {
                    success: false,
                    successCount: 0,
                    failureCount: 0,
                    results: [],
                };
            }
            // Ensure provider is ready for trading (includes signing operations)
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            // Map orders to SDK format and validate coins
            const cancelRequests = await Promise.all(params.map(async (order) => {
                const asset = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
                    symbol: order.symbol,
                    dexName: (0, hyperLiquidAdapter_js_1.parseAssetName)(order.symbol).dex,
                });
                return {
                    a: asset,
                    o: parseInt(order.orderId, 10),
                };
            }));
            // Single batch API call
            const result = await exchangeClient.cancel({
                cancels: cancelRequests,
            });
            // Parse response statuses (one per order)
            const { statuses } = result.response.data;
            const successCount = statuses.filter((status) => status === 'success').length;
            const failureCount = statuses.length - successCount;
            return {
                success: successCount > 0,
                successCount,
                failureCount,
                results: statuses.map((status, index) => {
                    // Map each per-status rejection the same way cancelOrder does, so a
                    // batch cancel reports standardized codes rather than raw exchange
                    // strings for the rejections this provider recognizes.
                    const statusError = status?.error;
                    return {
                        orderId: params[index].orderId,
                        symbol: params[index].symbol,
                        success: status === 'success',
                        error: statusError
                            ? __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mapError).call(this, new Error(statusError)).message
                            : undefined,
                    };
                }),
            };
        }
        catch (error) {
            const mappedError = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mapError).call(this, error);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(mappedError, await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getTradingErrorContext).call(this, 'cancelOrders', mappedError, {
                orderCount: params.length,
            }));
            // Return all orders as failed
            return {
                success: false,
                successCount: 0,
                failureCount: params.length,
                results: params.map((order) => ({
                    orderId: order.orderId,
                    symbol: order.symbol,
                    success: false,
                    error: error instanceof Error
                        ? mappedError.message
                        : perpsErrorCodes_js_1.PERPS_ERROR_CODES.BATCH_CANCEL_FAILED,
                })),
            };
        }
    }
    async closePositions(params) {
        // Declare outside try block so it's accessible in catch block
        let positionsToClose = [];
        try {
            // Ensure provider is ready for trading (includes signing operations)
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
            // Get all current positions from cache (avoids 429 rate limiting)
            const positions = await this.getPositions();
            // Filter positions based on params
            positionsToClose =
                params.closeAll === true ||
                    !params.symbols ||
                    params.symbols.length === 0
                    ? positions
                    : positions.filter((pos) => params.symbols?.includes(pos.symbol));
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Batch closing positions:', {
                count: positionsToClose.length,
                closeAll: params.closeAll,
                coins: params.symbols,
            });
            if (positionsToClose.length === 0) {
                return {
                    success: false,
                    successCount: 0,
                    failureCount: 0,
                    results: [],
                };
            }
            // Get exchange client for order submission
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            // Pre-fetch meta for all unique DEXs to avoid N API calls in loop
            const uniqueDexs = [
                ...new Set(positionsToClose.map((pos) => (0, hyperLiquidAdapter_js_1.parseAssetName)(pos.symbol).dex ?? 'main')),
            ];
            await Promise.all(uniqueDexs.map((dex) => __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName: dex === 'main' ? null : dex })));
            // Freed-margin transfer for each submitted order, or null when that order
            // needs none. One entry per order rather than one per HIP-3 position: a
            // compacted list read with the response-status index credits the wrong
            // order in a mixed main-DEX/HIP-3 batch.
            const orderedHip3Transfers = [];
            // Build orders array, plus the positions each order closes so response
            // statuses stay index-aligned when a position is skipped below
            const orders = [];
            const orderedPositions = [];
            // Positions no order could be built for. Reported as failures so a caller
            // cannot read "closed everything" from a result that left one open.
            const skippedResults = [];
            for (const position of positionsToClose) {
                // Extract DEX name for HIP-3 positions
                const { dex: dexName } = (0, hyperLiquidAdapter_js_1.parseAssetName)(position.symbol);
                const isHip3Position = position.symbol.includes(':');
                // Get asset info for formatting (uses cache populated above)
                const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName });
                const assetInfo = meta.universe.find((asset) => asset.name === position.symbol);
                if (!assetInfo) {
                    throw new Error(`Asset ${position.symbol} not found in ${dexName ?? 'main'} DEX universe`);
                }
                // Get asset ID
                const assetId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
                    symbol: position.symbol,
                    dexName,
                    meta,
                });
                // Calculate position details (always full close)
                const positionSize = parseFloat(position.size);
                const isBuy = positionSize < 0; // Close opposite side
                const closeSize = Math.abs(positionSize);
                const totalMarginUsed = parseFloat(position.marginUsed);
                // formatHyperLiquidSize() below rounds half-up, so floor onto the size
                // grid first: a reduce-only order rounded above the position is rejected
                // with "Reduce only order would increase position".
                const flooredCloseSize = (0, orderCalculations_js_1.floorToSizeDecimals)(closeSize, assetInfo.szDecimals);
                // A dust position worth less than one size increment floors to 0, which
                // would submit a zero-size order. Skip it rather than sending an order
                // the exchange must reject; the remaining positions still close, and the
                // skip is reported as a failure below.
                if (flooredCloseSize <= 0) {
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Skipping position smaller than one size increment', { coin: position.symbol, size: position.size });
                    skippedResults.push({
                        symbol: position.symbol,
                        success: false,
                        error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE,
                    });
                    continue;
                }
                // Track this order's HIP-3 transfer, if it needs one (a full position
                // close frees all of its margin). Pushed below alongside the order so the
                // two stay index-aligned.
                const hip3Transfer = isHip3Position && dexName && !__classPrivateFieldGet(this, _HyperLiquidProvider_useUnifiedAccount, "f")
                    ? { sourceDex: dexName, freedMargin: totalMarginUsed }
                    : null;
                const currentPrice = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getOrFetchPrice).call(this, {
                    symbol: position.symbol,
                    dexName: dexName ?? null,
                });
                // Calculate order price with slippage
                const slippage = perpsConfig_js_1.ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps / 10000;
                const orderPrice = isBuy
                    ? currentPrice * (1 + slippage)
                    : currentPrice * (1 - slippage);
                const formattedSize = (0, hyperLiquidAdapter_js_1.formatHyperLiquidSize)({
                    size: flooredCloseSize,
                    szDecimals: assetInfo.szDecimals,
                });
                const formattedPrice = (0, hyperLiquidAdapter_js_1.formatHyperLiquidPrice)({
                    price: orderPrice,
                    szDecimals: assetInfo.szDecimals,
                });
                // Build reduce-only order
                orders.push({
                    a: assetId,
                    b: isBuy,
                    p: formattedPrice,
                    s: formattedSize,
                    r: true, // reduceOnly
                    t: { limit: { tif: 'Ioc' } }, // Immediate or cancel for market-like execution
                });
                orderedPositions.push(position);
                orderedHip3Transfers.push(hip3Transfer);
            }
            // Every position was smaller than one size increment. Return their
            // failures rather than an empty result, which would be indistinguishable
            // from "no positions matched".
            if (orders.length === 0) {
                return {
                    success: false,
                    successCount: 0,
                    failureCount: skippedResults.length,
                    results: skippedResults,
                };
            }
            // Single batch API call
            const result = await exchangeClient.order({
                orders,
                grouping: 'na',
                builder: await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderOrderContext).call(this),
            });
            // Parse response statuses (one per order)
            const { statuses } = result.response.data;
            const successCount = statuses.filter((stat) => isStatusObject(stat) &&
                ((0, utils_1.hasProperty)(stat, 'filled') || (0, utils_1.hasProperty)(stat, 'resting'))).length;
            const failureCount = statuses.length - successCount + skippedResults.length;
            // Handle HIP-3 margin transfers for successful closes
            if (!__classPrivateFieldGet(this, _HyperLiquidProvider_useUnifiedAccount, "f")) {
                for (let i = 0; i < statuses.length; i++) {
                    const status = statuses[i];
                    const isSuccess = isStatusObject(status) &&
                        ((0, utils_1.hasProperty)(status, 'filled') || (0, utils_1.hasProperty)(status, 'resting'));
                    const transfer = orderedHip3Transfers[i];
                    if (isSuccess && transfer) {
                        const { sourceDex, freedMargin } = transfer;
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Position closed successfully, initiating manual auto-transfer back', { symbol: orderedPositions[i].symbol, freedMargin });
                        // Non-blocking: Transfer freed margin back to main DEX
                        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_autoTransferBackAfterClose).call(this, {
                            sourceDex,
                            freedMargin,
                        });
                    }
                }
            }
            // Index submitted and skipped outcomes by symbol so `results` can keep the
            // order of the requested positions: consumers may correlate them by index.
            const submittedResults = new Map(statuses.map((status, index) => [
                orderedPositions[index].symbol,
                {
                    symbol: orderedPositions[index].symbol,
                    success: isStatusObject(status) &&
                        ((0, utils_1.hasProperty)(status, 'filled') || (0, utils_1.hasProperty)(status, 'resting')),
                    error: isStatusObject(status) && (0, utils_1.hasProperty)(status, 'error')
                        ? String(status.error)
                        : undefined,
                },
            ]));
            const skippedBySymbol = new Map(skippedResults.map((skipped) => [skipped.symbol, skipped]));
            return {
                success: successCount > 0,
                successCount,
                failureCount,
                results: positionsToClose.flatMap((position) => {
                    const outcome = submittedResults.get(position.symbol) ??
                        skippedBySymbol.get(position.symbol);
                    return outcome ? [outcome] : [];
                }),
            };
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.closePositions'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'closePositions', {
                positionCount: positionsToClose.length,
            }));
            // Return all positions as failed
            return {
                success: false,
                successCount: 0,
                failureCount: positionsToClose.length,
                results: positionsToClose.map((position) => ({
                    symbol: position.symbol,
                    success: false,
                    error: error instanceof Error
                        ? error.message
                        : perpsErrorCodes_js_1.PERPS_ERROR_CODES.BATCH_CLOSE_FAILED,
                })),
            };
        }
    }
    /**
     * Update TP/SL for an existing position
     *
     * This creates new TP/SL orders for the position using 'positionTpsl' grouping.
     * These are separate orders that will close the position when triggered.
     *
     * Key differences from editOrder:
     * - editOrder: Modifies pending orders (before fill)
     * - updatePositionTPSL: Creates TP/SL orders for filled positions
     *
     * HyperLiquid supports two TP/SL types:
     * 1. 'normalTpsl' - Tied to a parent order (set when placing the order)
     * 2. 'positionTpsl' - Tied to a position (can be set/modified after fill)
     *
     * Partial TP/SL: when `takeProfitSize` or `stopLossSize` is supplied, the
     * orders cannot use 'positionTpsl' (which always covers the whole position and
     * requires size 0). They are submitted as standalone reduce-only trigger orders
     * with 'na' grouping and explicit sizes instead.
     *
     * Note that the pre-cancel sweep clears every standalone reduce-only trigger
     * on the symbol — whether this update is partial or whole-position — not only
     * the ones this method placed. A trigger the caller placed independently
     * through `placeOrder` (for example a manual reduce-only stop) is therefore
     * cancelled too. Only TP/SL children of another pending order are protected.
     *
     * @param params - The operation parameters.
     * @param params.symbol - Asset symbol of the position
     * @param params.takeProfitPrice - TP price (undefined to remove)
     * @param params.stopLossPrice - SL price (undefined to remove)
     * @param params.takeProfitSize - Partial TP size (undefined for the whole position)
     * @param params.stopLossSize - Partial SL size (undefined for the whole position)
     * @returns A promise that resolves to the result.
     */
    async updatePositionTPSL(params) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Updating position TP/SL:', params);
            const { symbol, takeProfitPrice, stopLossPrice, takeProfitSize, stopLossSize, position: livePosition, } = params;
            const isPartialTpsl = takeProfitSize !== undefined || stopLossSize !== undefined;
            // Basic initialization only. The trading setup that can prompt a hardware
            // wallet and write the referral / builder-fee approvals is deferred until
            // every validation below has passed, so a rejected update leaves nothing
            // behind.
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
            // Use live position (from WebSocket) if available, otherwise fetch via REST
            // Preferring WebSocket data avoids rate limiting issues with the REST API
            let position = livePosition;
            if (position) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using live position from WebSocket', {
                    symbol: position.symbol,
                    size: position.size,
                });
            }
            else {
                // Fallback: fetch positions via REST API (legacy behavior)
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('No live position passed, falling back to REST API fetch');
                let positions;
                try {
                    positions = await this.getPositions({ skipCache: true });
                }
                catch (error) {
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.updatePositionTPSL'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'updatePositionTPSL > getPositions', {
                        symbol,
                    }));
                    throw error;
                }
                position = positions.find((pos) => pos.symbol === symbol);
            }
            if (!position) {
                throw new Error(`No position found for ${symbol}`);
            }
            const positionSize = Math.abs(parseFloat(position.size));
            const isLong = parseFloat(position.size) > 0;
            // Partial TP/SL sizes must be positive, paired with their price, and no
            // larger than the position they close.
            const tpslSizeValidation = (0, hyperLiquidValidation_js_1.validateOrderParams)({
                coin: symbol,
                size: positionSize.toString(),
                takeProfitPrice,
                stopLossPrice,
                takeProfitSize,
                stopLossSize,
            });
            if (!tpslSizeValidation.isValid) {
                return {
                    success: false,
                    error: tpslSizeValidation.error,
                };
            }
            // Get clients for API calls (#ensureReady already called at method start).
            // Holding the exchange client reference is not itself a write; it is only
            // used below, after the trading setup has run.
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
            // Extract DEX name for API calls (main DEX = null)
            const { dex: dexName } = (0, hyperLiquidAdapter_js_1.parseAssetName)(symbol);
            // Asset info is resolved before the pre-cancel sweep so a partial size
            // that rounds away at the asset precision is rejected while the
            // position's existing triggers are still in place. Rejecting it after the
            // sweep would leave the position unprotected with nothing put back.
            const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName });
            // Check if meta is an error response (string) or doesn't have universe property
            if (!meta ||
                typeof meta === 'string' ||
                !meta.universe ||
                !Array.isArray(meta.universe)) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Failed to fetch metadata for asset mapping', {
                    meta,
                    dex: dexName ?? 'main',
                });
                throw new Error(`Failed to fetch market metadata for DEX ${dexName ?? 'main'}`);
            }
            // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
            const assetInfo = meta.universe.find((asset) => asset.name === symbol);
            if (!assetInfo) {
                throw new Error(`Asset ${symbol} not found in ${dexName ?? 'main'} DEX universe`);
            }
            const precision = (0, orderCalculations_js_1.validateOrderPrecision)({
                takeProfitPrice,
                stopLossPrice,
                takeProfitSize,
                stopLossSize,
                szDecimals: assetInfo.szDecimals,
            });
            if (!precision.isValid) {
                return {
                    success: false,
                    error: precision.error,
                };
            }
            // Everything is validated: only now run the trading setup that can prompt
            // for signatures and write the referral / builder-fee approvals.
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
            // Cancel existing TP/SL orders for this position
            // OPTIMIZATION: Use WebSocket cache first (0 weight), fall back to single-DEX REST (20 weight)
            // Previously: queryUserDataAcrossDexs queried ALL DEXs (20 weight × N DEXs = 40+ weight)
            const assetId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
                symbol,
                dexName,
            });
            let cancelRequests = [];
            // Use atomic getter to prevent race condition between check and get
            const cachedOrders = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getOrdersCacheIfInitialized();
            // Replacing TP/SL has to consider standalone ('na' grouping) triggers —
            // left by a partial update or placed independently — which are not
            // position-bound. Telling those apart from a pending order's normalTpsl
            // child requires the parent/child relationship, which only the REST
            // payload carries. The cache path is therefore only safe when the cache
            // shows no such trigger on this market: a partial update always places
            // standalone triggers, and a whole-position update must still clear any
            // standalone leftovers instead of letting them fire beside the new
            // position-bound orders.
            const cacheShowsStandaloneTriggers = Boolean(cachedOrders?.some((order) => order.symbol === symbol &&
                order.reduceOnly === true &&
                order.isTrigger === true &&
                order.isPositionTpsl !==
                    Boolean(perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl) &&
                order.detailedOrderType &&
                (order.detailedOrderType.includes('Take Profit') ||
                    order.detailedOrderType.includes('Stop'))));
            if (cachedOrders === null ||
                isPartialTpsl ||
                cacheShowsStandaloneTriggers) {
                // Fallback: Query only the specific DEX (20 weight instead of 40+)
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(cachedOrders === null
                    ? 'WebSocket cache not initialized, falling back to single-DEX REST query'
                    : 'TP/SL update needs parent/child order context: using single-DEX REST query', { dex: dexName ?? 'main', isPartialTpsl });
                const orders = await infoClient.frontendOpenOrders({
                    user: userAddress,
                    dex: dexName ?? undefined,
                });
                // Orders that belong to a pending parent order (normalTpsl children) are
                // also listed at the top level, so collect their IDs to exclude them:
                // they protect that pending order, not this position.
                const childOrderIds = collectChildOrderIds(orders);
                // Filter using raw SDK response properties
                const tpslOrders = orders.filter((order) => order.coin === symbol &&
                    order.reduceOnly &&
                    // Position-bound TP/SL always qualifies, and so do standalone
                    // triggers on this market (they belong to the position too, whether
                    // this update is partial or whole) — but never another order's
                    // TP/SL children.
                    (order.isPositionTpsl ===
                        Boolean(perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl) ||
                        !childOrderIds.has(order.oid)) &&
                    order.isTrigger &&
                    (order.orderType.includes('Take Profit') ||
                        order.orderType.includes('Stop')));
                cancelRequests = tpslOrders.map((order) => ({
                    a: assetId,
                    o: order.oid,
                }));
            }
            else {
                // WebSocket cache available - use it (no API call, 0 weight)
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using WebSocket cache for TP/SL orders lookup', { cachedOrdersCount: cachedOrders.length });
                // Filter using normalized Order type properties, matching the REST fallback criteria:
                // - symbol matches
                // - isTrigger === true
                // - reduceOnly === true
                // - isPositionTpsl matches the configured mode (only cancel position-bound TP/SL,
                //   not normalTpsl children that belong to pending limit orders)
                // - detailedOrderType contains 'Take Profit' or 'Stop'
                const tpslOrders = cachedOrders.filter((order) => order.symbol === symbol &&
                    order.reduceOnly === true &&
                    order.isTrigger === true &&
                    order.isPositionTpsl ===
                        Boolean(perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl) &&
                    order.detailedOrderType &&
                    (order.detailedOrderType.includes('Take Profit') ||
                        order.detailedOrderType.includes('Stop')));
                cancelRequests = tpslOrders.map((order) => ({
                    a: assetId,
                    o: parseInt(order.orderId, 10),
                }));
            }
            if (cancelRequests.length > 0) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Canceling ${cancelRequests.length} existing TP/SL orders for ${symbol}`);
                const cancelResult = await exchangeClient.cancel({
                    cancels: cancelRequests,
                });
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Cancel result:', cancelResult);
            }
            // assetId already validated above when building cancelRequests
            // Build orders array for TP/SL
            const orders = [];
            const fullSize = perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl && !isPartialTpsl
                ? '0'
                : (0, hyperLiquidAdapter_js_1.formatHyperLiquidSize)({
                    size: positionSize,
                    szDecimals: assetInfo.szDecimals,
                });
            // Partial TP/SL orders carry their own size; the rest cover the position.
            // A partial size that rounds away at the asset precision is rejected
            // rather than sent as '0', which the exchange reads as whole-position.
            const resolveTpslSize = (tpslSize) => tpslSize === undefined
                ? fullSize
                : (0, orderCalculations_js_1.formatPartialTpslSize)({
                    size: parseFloat(tpslSize),
                    szDecimals: assetInfo.szDecimals,
                });
            // Take Profit order
            if (takeProfitPrice) {
                const tpOrder = {
                    a: assetId,
                    b: !isLong, // Opposite side to close position
                    p: (0, hyperLiquidAdapter_js_1.formatHyperLiquidPrice)({
                        price: parseFloat(takeProfitPrice),
                        szDecimals: assetInfo.szDecimals,
                    }),
                    s: resolveTpslSize(takeProfitSize),
                    r: true, // Always reduce-only for position TP
                    t: {
                        trigger: {
                            isMarket: false, // Limit order when triggered
                            triggerPx: (0, hyperLiquidAdapter_js_1.formatHyperLiquidPrice)({
                                price: parseFloat(takeProfitPrice),
                                szDecimals: assetInfo.szDecimals,
                            }),
                            tpsl: 'tp',
                        },
                    },
                };
                orders.push(tpOrder);
            }
            // Stop Loss order
            if (stopLossPrice) {
                const slOrder = {
                    a: assetId,
                    b: !isLong, // Opposite side to close position
                    p: (0, hyperLiquidAdapter_js_1.formatHyperLiquidPrice)({
                        price: parseFloat(stopLossPrice),
                        szDecimals: assetInfo.szDecimals,
                    }),
                    s: resolveTpslSize(stopLossSize),
                    r: true, // Always reduce-only for position SL
                    t: {
                        trigger: {
                            isMarket: true, // Market order when triggered for faster execution
                            triggerPx: (0, hyperLiquidAdapter_js_1.formatHyperLiquidPrice)({
                                price: parseFloat(stopLossPrice),
                                szDecimals: assetInfo.szDecimals,
                            }),
                            tpsl: 'sl',
                        },
                    },
                };
                orders.push(slOrder);
            }
            // If no new orders, we've just cancelled existing ones (clearing TP/SL)
            if (orders.length === 0) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('No new TP/SL orders to place - existing ones cancelled');
                return {
                    success: true,
                    // No orderId since we only cancelled orders, didn't place new ones
                };
            }
            // Submit via SDK exchange client. Position-bound TP/SL uses 'positionTpsl';
            // partial TP/SL must be standalone reduce-only triggers ('na'), since a
            // position-bound TP/SL always closes the whole position.
            const result = await exchangeClient.order({
                orders,
                grouping: isPartialTpsl ? 'na' : 'positionTpsl',
                builder: await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderOrderContext).call(this),
            });
            if (result.status !== 'ok') {
                throw new Error(`TP/SL update failed: ${JSON.stringify(result)}`);
            }
            return {
                success: true,
                orderId: 'TP/SL orders placed',
            };
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.updatePositionTPSL'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'updatePositionTPSL', {
                symbol: params.symbol,
                hasTakeProfit: params.takeProfitPrice !== undefined,
                hasStopLoss: params.stopLossPrice !== undefined,
            }));
            return (0, hyperLiquidValidation_js_1.createErrorResult)(error, { success: false });
        }
    }
    /**
     * Close a position
     *
     * For HIP-3 positions, this method automatically transfers freed margin
     * back to the main DEX after successfully closing the position.
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async closePosition(params) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Closing position:', params);
            // Ensure provider is ready for trading (includes signing operations)
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
            // Use provided position (from WebSocket) or fetch from cache
            // This avoids unnecessary API calls and prevents 429 rate limiting
            let { position } = params;
            // Re-validate the caller-supplied snapshot against the freshest WebSocket
            // position cache. Clients pass a throttled snapshot (~1s old on mobile),
            // so a concurrent TP/SL fill, a liquidation, or a double-tapped close
            // leaves the snapshot's side/size larger than (or opposite to) the real
            // position and HyperLiquid rejects the reduce-only order with "Reduce
            // only order would increase position". Reading the cache never issues a
            // REST request, so this does not reintroduce 429 rate limiting.
            if (position && __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").isPositionsCacheInitialized()) {
                // Read the symbol's own DEX slice, not the aggregate. The aggregate is
                // only rebuilt once every expected DEX has published, so after a
                // WebSocket reconnect — which resets the initialized-DEX set without
                // clearing these caches — it can sit frozen at pre-reconnect contents
                // while the per-DEX slices keep updating. Deciding "this DEX is covered"
                // from the per-DEX map and then reading the position from the aggregate
                // mixed a fresh answer with stale data: a close could reuse a stale size,
                // or throw for a position that is open.
                const dexPositions = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getCachedPositionsForDex((0, hyperLiquidAdapter_js_1.parseAssetName)(params.symbol).dex ?? '');
                const livePosition = dexPositions?.find((pos) => pos.symbol === params.symbol);
                if (livePosition) {
                    if (livePosition.size !== position.size) {
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Stale close position snapshot: using live WebSocket position', {
                            coin: params.symbol,
                            snapshotSize: position.size,
                            liveSize: livePosition.size,
                        });
                    }
                    position = livePosition;
                }
                else if (dexPositions) {
                    // That DEX has published and does not hold this symbol, so the position
                    // is already closed (e.g. a double-tapped close). This is the same read
                    // the lookup above used, so the two can never disagree. Fail here rather
                    // than falling back to REST: the cache is the freshest source, so a REST
                    // lookup can only burn a request that risks 429s and, if it lags, hand
                    // back a position that no longer exists.
                    throw new Error(`No position found for ${params.symbol}`);
                }
                else {
                    // The cache holds nothing for this symbol's DEX — a HIP-3 DEX whose
                    // subscription has not published this session — so the symbol's
                    // absence proves nothing. Spend one REST request to get live data
                    // rather than trusting a snapshot the exchange may have moved past.
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Position cache does not cover this DEX: fetching live positions', { coin: params.symbol });
                    // Query the symbol's own DEX so the outcome carries provenance.
                    // getPositions() fans out across every enabled DEX, flattens the subset
                    // that answered and turns any failure into [], so it cannot distinguish
                    // "this DEX answered and holds nothing" from "this DEX failed or was
                    // never queried" — and those two need opposite decisions.
                    const { answered, positions } = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_queryDexPositions).call(this, (0, hyperLiquidAdapter_js_1.parseAssetName)(params.symbol).dex);
                    const livePositionFromApi = positions.find((pos) => pos.symbol === params.symbol);
                    if (livePositionFromApi) {
                        position = livePositionFromApi;
                    }
                    else if (answered) {
                        // The DEX answered without this symbol — even with no positions at
                        // all — so it is genuinely closed.
                        throw new Error(`No position found for ${params.symbol}`);
                    }
                    // Otherwise the query failed, so the absence proves nothing: keep the
                    // caller's snapshot rather than block a position that may be closable.
                }
            }
            if (!position) {
                const positions = await this.getPositions();
                position = positions.find((pos) => pos.symbol === params.symbol);
            }
            if (!position) {
                throw new Error(`No position found for ${params.symbol}`);
            }
            const positionSize = parseFloat(position.size);
            const isBuy = positionSize < 0;
            const absPositionSize = Math.abs(positionSize);
            // Only an omitted (or empty) size means "close 100%". A supplied size must
            // be a positive number: silently promoting '0' or 'abc' to a full close
            // would liquidate the whole position on a caller-side formatting slip.
            // A supplied size is clamped to the live position size, because
            // HyperLiquid rejects reduce-only orders that exceed the position and the
            // caller computed its size from a snapshot that may already be too large.
            const hasRequestedSize = params.size !== undefined && params.size !== '';
            let closeSizeNumber = absPositionSize;
            if (hasRequestedSize) {
                const requestedSize = parseFloat(params.size);
                if (!Number.isFinite(requestedSize) || requestedSize <= 0) {
                    throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SIZE_POSITIVE);
                }
                closeSizeNumber = Math.min(requestedSize, absPositionSize);
            }
            const closeSize = closeSizeNumber.toString();
            // Capture position details BEFORE closing for freed margin calculation
            const totalMarginUsed = parseFloat(position.marginUsed);
            const totalPositionSize = absPositionSize;
            const closeSizeNum = closeSizeNumber;
            const isHip3Position = position.symbol.includes(':');
            const hip3Dex = isHip3Position ? position.symbol.split(':')[0] : null;
            // Calculate freed margin proportionally
            const freedMarginRatio = closeSizeNum / totalPositionSize;
            const freedMargin = totalMarginUsed * freedMarginRatio;
            // Get current price for USD/minimum validation if not provided. A full
            // close skips *that* validation because it submits the exact live size —
            // but not the price-staleness guard: calculateFinalPositionSize checks
            // priceAtCalculation against the live price for every close that supplies
            // it, using the price placeOrder fetches when none is passed here.
            let { currentPrice } = params;
            if (!currentPrice && params.size && !params.usdAmount) {
                // Partial close without USD or price: use limit price as fallback for validation
                // For limit orders, the limit price is a reasonable proxy for validation purposes
                if (params.price && params.orderType === 'limit') {
                    currentPrice = parseFloat(params.price);
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using limit price for close position validation (limit order)', {
                        coin: params.symbol,
                        currentPrice,
                    });
                }
                // Note: For market orders without usdAmount/currentPrice, validation will fail
                // with "price_required" error, which is correct behavior (prevents invalid orders)
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Position close details', {
                coin: position.symbol,
                isHip3Position,
                hip3Dex,
                totalMarginUsed,
                closedSize: closeSize,
                freedMargin: freedMargin.toFixed(2),
            });
            // True when the order closes 100% of the position: either no size was
            // provided, or the requested size covers (or was clamped to) the whole
            // position.
            const isFullClose = closeSizeNum >= absPositionSize;
            // Execute position close with consistent slippage handling
            const result = await this.placeOrder({
                symbol: params.symbol,
                isBuy,
                size: closeSize,
                orderType: params.orderType ?? 'market',
                price: params.price,
                reduceOnly: true,
                isFullClose,
                // Pass through price and slippage parameters for consistent validation
                currentPrice,
                // A close of the whole position must submit exactly the live position
                // size. Forwarding usdAmount would make placeOrder recompute the size as
                // usdAmount / currentPrice — discarding the clamp above, since usdAmount
                // is the source of truth there — and submit more than the position
                // holds, which is rejected with "Reduce only order would increase
                // position". Genuine partial closes keep usdAmount so their size stays
                // USD-accurate.
                usdAmount: isFullClose ? undefined : params.usdAmount,
                priceAtCalculation: params.priceAtCalculation,
                maxSlippageBps: params.maxSlippageBps,
            });
            // Return freed margin using native abstraction or programmatic transfer
            if (result.success &&
                isHip3Position &&
                hip3Dex &&
                !__classPrivateFieldGet(this, _HyperLiquidProvider_useUnifiedAccount, "f")) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Position closed successfully, initiating manual auto-transfer back');
                // Non-blocking: Transfer freed margin back to main DEX
                await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_autoTransferBackAfterClose).call(this, {
                    sourceDex: hip3Dex,
                    freedMargin,
                });
            }
            else if (result.success &&
                isHip3Position &&
                hip3Dex &&
                __classPrivateFieldGet(this, _HyperLiquidProvider_useUnifiedAccount, "f")) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Position closed - Unified Account will auto-return freed margin', {
                    coin: params.symbol,
                    dex: hip3Dex,
                    note: 'HyperLiquid handles return automatically',
                });
            }
            return result;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.closePosition'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'closePosition', {
                coin: params.symbol,
                orderType: params.orderType,
            }));
            return (0, hyperLiquidValidation_js_1.createErrorResult)(error, { success: false });
        }
    }
    /**
     * Update margin for an existing position (add or remove)
     *
     * @param params - Margin adjustment parameters
     * @param params.symbol - Asset symbol (e.g., 'BTC', 'ETH')
     * @param params.amount - Amount to adjust as string (positive = add, negative = remove)
     * @param params.providerId - Optional provider identifier (ignored, always uses HyperLiquid)
     * @returns Promise resolving to margin adjustment result
     *
     * Note: HyperLiquid uses micro-units (multiply by 1e6) for the ntli parameter.
     * The SDK's updateIsolatedMargin requires:
     * - asset: Asset ID (number)
     * - isBuy: Position direction (true for long, false for short)
     * - ntli: Amount in micro-units (amount * 1e6)
     */
    async updateMargin(params) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Updating position margin:', params);
            const { symbol, amount } = params;
            // Ensure provider is ready
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
            // Get current position to determine direction (from cache to avoid 429 rate limiting)
            const positions = await this.getPositions();
            const position = positions.find((pos) => pos.symbol === symbol);
            if (!position) {
                throw new Error(`No position found for ${symbol}`);
            }
            // Determine position direction
            const isBuy = parseFloat(position.size) > 0; // true for long, false for short
            // Get asset ID for the symbol
            const assetId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
                symbol,
                dexName: (0, hyperLiquidAdapter_js_1.parseAssetName)(symbol).dex,
            });
            // Convert amount to micro-units (HyperLiquid SDK requirement)
            const amountFloat = parseFloat(amount);
            const ntli = Math.floor(amountFloat * 1e6);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Margin adjustment details', {
                symbol,
                assetId,
                isBuy,
                amount: amountFloat,
                ntli,
            });
            // Guard: confirm spendableBalance can cover margin addition.
            // spendableBalance is already mode-aware (includes free spot in Unified,
            // excludes it in Standard), so no extra spot fetch needed.
            if (amountFloat > 0) {
                const accountState = await this.getAccountState();
                const spendable = parseFloat(accountState.spendableBalance);
                if (spendable < amountFloat) {
                    throw new Error(`Insufficient balance for margin addition: need ${amountFloat}, available ${spendable.toFixed(2)}`);
                }
            }
            // Call SDK to update isolated margin
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            const result = await exchangeClient.updateIsolatedMargin({
                asset: assetId,
                isBuy,
                ntli,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Margin update result:', result);
            if (result.status !== 'ok') {
                throw new Error(`Margin adjustment failed: ${JSON.stringify(result)}`);
            }
            return {
                success: true,
            };
        }
        catch (error) {
            const safeError = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.updateMargin');
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(safeError, __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'updateMargin', {
                symbol: params.symbol,
                amount: params.amount,
            }));
            return {
                success: false,
                error: safeError.message,
            };
        }
    }
    /**
     * Fetch a complete standalone user-data bundle.
     *
     * Each DEX clearinghouse response is shared by position and account-state
     * mapping. Any required request failure rejects the entire bundle.
     *
     * @param params - User and captured controller identity.
     * @returns The complete user-data snapshot.
     */
    async getUserDataSnapshot(params) {
        const { identity, userAddress } = params;
        const network = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode() ? 'testnet' : 'mainnet';
        const snapshotStartedAt = __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").performance.now();
        const measure = async (stage, request, dex) => {
            const startedAt = __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").performance.now();
            const dexDetail = dex === undefined ? {} : { dex: dex ?? 'main' };
            try {
                const result = await request();
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[PerpsUserSnapshot]', {
                    stage,
                    durationMs: Math.round(__classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").performance.now() - startedAt),
                    success: true,
                    ...dexDetail,
                });
                return result;
            }
            catch (error) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[PerpsUserSnapshot]', {
                    stage,
                    durationMs: Math.round(__classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").performance.now() - startedAt),
                    success: false,
                    ...dexDetail,
                });
                throw error;
            }
        };
        if (identity.provider !== 'hyperliquid' || identity.network !== network) {
            throw new Error('User data snapshot identity does not match provider');
        }
        const requestedDexes = identity.dexes;
        const canonicalDexes = (0, hyperLiquidConfig_js_1.canonicalizeHyperLiquidDexes)(requestedDexes);
        const hasValidDexIdentity = requestedDexes.length > 0 &&
            new Set(requestedDexes).size === requestedDexes.length &&
            requestedDexes.every((dex) => dex === 'main' || /^[a-z0-9][a-z0-9-]*$/u.test(dex)) &&
            requestedDexes.length === canonicalDexes.length &&
            requestedDexes.every((dex, index) => dex === canonicalDexes[index]);
        if (!hasValidDexIdentity) {
            throw new Error('User data snapshot DEX identity is invalid');
        }
        const dexs = requestedDexes.map((dex) => (dex === 'main' ? null : dex));
        const standaloneInfoClient = (0, standaloneInfoClient_js_1.createStandaloneInfoClient)({
            isTestnet: network === 'testnet',
        });
        const buildUserParams = (dex) => ({
            user: userAddress,
            ...(dex ? { dex } : {}),
        });
        const [clearinghouseStates, openOrdersByDex, spotState, abstractionMode] = await Promise.all([
            Promise.all(dexs.map((dex) => measure('clearinghouse_state', () => standaloneInfoClient.clearinghouseState(buildUserParams(dex)), dex))),
            Promise.all(dexs.map((dex) => measure('frontend_open_orders', () => standaloneInfoClient.frontendOpenOrders(buildUserParams(dex)), dex))),
            measure('spot_clearinghouse_state', () => standaloneInfoClient.spotClearinghouseState({ user: userAddress })),
            measure('user_abstraction', () => standaloneInfoClient.userAbstraction({ user: userAddress })),
        ]);
        const rawOrders = openOrdersByDex.flat();
        const childOrderIds = collectChildOrderIds(rawOrders);
        const ordersBySymbol = groupOrdersBySymbol(rawOrders);
        const positions = clearinghouseStates.flatMap((state) => state.assetPositions
            .filter(({ position }) => position.szi !== '0')
            .map((assetPosition) => {
            const position = (0, hyperLiquidAdapter_js_1.adaptPositionFromSDK)(assetPosition);
            const { takeProfitOrders, stopLossOrders, takeProfitPrice, stopLossPrice, } = collectPositionTriggerOrders({
                orders: ordersBySymbol.get(position.symbol) ?? [],
                position,
                childOrderIds,
            });
            return {
                ...position,
                takeProfitCount: takeProfitOrders.length,
                stopLossCount: stopLossOrders.length,
                takeProfitOrders,
                stopLossOrders,
                ...(takeProfitPrice && { takeProfitPrice }),
                ...(stopLossPrice && { stopLossPrice }),
            };
        }));
        const positionsBySymbol = new Map(positions.map((position) => [position.symbol, position]));
        const orders = rawOrders.map((order) => (0, hyperLiquidAdapter_js_1.adaptOrderFromSDK)(order, positionsBySymbol.get(order.coin)));
        const dexAccountStates = clearinghouseStates.map((state) => (0, hyperLiquidAdapter_js_1.adaptAccountStateFromSDK)(state));
        const accountState = (0, accountUtils_js_1.addSpotBalanceToAccountState)((0, accountUtils_js_1.aggregateAccountStates)(dexAccountStates), spotState, { foldIntoCollateral: (0, hyperliquid_types_js_1.hyperLiquidModeFoldsSpot)(abstractionMode) });
        accountState.subAccountBreakdown = Object.fromEntries(dexAccountStates.map((dexAccountState, index) => {
            return [
                dexs[index] ?? '',
                {
                    spendableBalance: dexAccountState.spendableBalance,
                    withdrawableBalance: dexAccountState.withdrawableBalance,
                    totalBalance: dexAccountState.totalBalance,
                },
            ];
        }));
        const snapshot = {
            positions,
            orders,
            accountState,
            identity: {
                ...identity,
                address: userAddress,
            },
        };
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[PerpsUserSnapshot]', {
            stage: 'complete',
            durationMs: Math.round(__classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").performance.now() - snapshotStartedAt),
            success: true,
            dexCount: dexs.length,
        });
        return snapshot;
    }
    /**
     * Get current positions with TP/SL prices
     *
     * Note on TP/SL orders:
     * - normalTpsl: TP/SL tied to parent order, only placed after parent fills
     * - positionTpsl: TP/SL tied to position, placed immediately
     *
     * This means TP/SL prices may not appear immediately after placing an order
     * with TP/SL. They will only show up once the parent order is filled and
     * the child TP/SL orders are actually placed on the order book.
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async getPositions(params) {
        try {
            // Path 0: Standalone mode for lightweight position queries
            // Creates a standalone InfoClient without requiring full initialization
            // No wallet, WebSocket, or account setup needed - just HTTP API call
            // Use for discovery use cases like showing positions on token details page
            if (params?.standalone && params.userAddress) {
                const { userAddress } = params;
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Getting positions in standalone mode', { userAddress });
                const standaloneInfoClient = (0, standaloneInfoClient_js_1.createStandaloneInfoClient)({
                    isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
                });
                const dexs = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getStandaloneValidatedDexs).call(this);
                const results = await (0, standaloneInfoClient_js_1.queryStandaloneClearinghouseStates)(standaloneInfoClient, userAddress, dexs);
                // Combine and filter positions from all DEXs
                // Skip TP/SL lookup (would require additional API call)
                const positions = results.flatMap((state) => state.assetPositions
                    .filter((assetPos) => assetPos.position.szi !== '0')
                    .map((assetPos) => (0, hyperLiquidAdapter_js_1.adaptPositionFromSDK)(assetPos)));
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: standalone positions fetched', { count: positions.length });
                return positions;
            }
            // Try WebSocket cache first (unless explicitly bypassed)
            if (!params?.skipCache &&
                __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").isPositionsCacheInitialized()) {
                const cachedPositions = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getCachedPositions() ?? [];
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using cached positions from WebSocket', {
                    count: cachedPositions.length,
                });
                return cachedPositions;
            }
            // Fallback to API call
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Fetching positions via API', params?.skipCache ? '(skipCache requested)' : '(cache not initialized)');
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            // Query positions and orders across all enabled DEXs in parallel
            const [stateResponse, orderResponse] = await Promise.all([
                __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_queryUserDataAcrossDexs).call(this, { user: userAddress }, (userParam) => infoClient.clearinghouseState(userParam)),
                __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_queryUserDataAcrossDexs).call(this, { user: userAddress }, (userParam) => infoClient.frontendOpenOrders(userParam)),
            ]);
            const { results: stateResults, failedDexs: failedStateDexs } = stateResponse;
            const { results: orderResults, failedDexs: failedOrderDexs } = orderResponse;
            if (failedStateDexs.length > 0 || failedOrderDexs.length > 0) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Partial multi-DEX position fetch completed with failures', {
                    failedStateDexs: failedStateDexs.map(({ dex, error }) => `${dex ?? 'main'}:${error.message}`),
                    failedOrderDexs: failedOrderDexs.map(({ dex, error }) => `${dex ?? 'main'}:${error.message}`),
                });
            }
            // Combine all orders from all DEXs for TP/SL lookup
            const allOrders = orderResults.flatMap((result) => result.data);
            // TP/SL children of pending parent orders are listed at the top level too;
            // they belong to that order, not to a position.
            const allOrdersChildIds = collectChildOrderIds(allOrders);
            // Grouped once here rather than rescanned per position, mirroring the
            // positionsBySymbol map on the WebSocket path.
            const ordersBySymbol = groupOrdersBySymbol(allOrders);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Frontend open orders (all DEXs):', {
                count: allOrders.length,
                orders: allOrders.map((ord) => ({
                    coin: ord.coin,
                    oid: ord.oid,
                    orderType: ord.orderType,
                    reduceOnly: ord.reduceOnly,
                    isTrigger: ord.isTrigger,
                    triggerPx: ord.triggerPx,
                    isPositionTpsl: ord.isPositionTpsl,
                    side: ord.side,
                    sz: ord.sz,
                })),
            });
            // Combine and process positions from all DEXs
            const allPositions = stateResults.flatMap((result) => result.data.assetPositions
                .filter((assetPos) => assetPos.position.szi !== '0')
                .map((assetPos) => {
                const position = (0, hyperLiquidAdapter_js_1.adaptPositionFromSDK)(assetPos);
                // Find TP/SL orders for this position
                // First check direct trigger orders (raw SDK uses 'coin', adapted position uses 'symbol')
                // Only match position-bound TP/SL orders when UsePositionBoundTpsl is enabled,
                // to avoid picking up normalTpsl children from pending limit orders
                const positionOrders = allOrders.filter((order) => order.coin === position.symbol &&
                    order.isTrigger &&
                    order.reduceOnly &&
                    order.isPositionTpsl ===
                        Boolean(perpsConfig_js_1.TP_SL_CONFIG.UsePositionBoundTpsl));
                // Also check for parent orders that might have TP/SL children
                const parentOrdersWithChildren = allOrders.filter((order) => order.coin === position.symbol &&
                    order.children &&
                    order.children.length > 0);
                // Look for TP and SL trigger orders
                let takeProfitPrice;
                let stopLossPrice;
                // Trigger orders attached to this position: position-bound TP/SL plus
                // standalone ('na' grouping) partial TP/SL. A pending order's
                // normalTpsl children are excluded — they are also listed at the top
                // level, but they protect that order, not this position (same rule as
                // the positionOrders filter above).
                const { takeProfitOrders, stopLossOrders } = collectPositionTriggerOrders({
                    orders: ordersBySymbol.get(position.symbol) ?? [],
                    position,
                    childOrderIds: allOrdersChildIds,
                });
                // Check direct trigger orders
                positionOrders.forEach((order) => {
                    // Frontend orders have explicit orderType field
                    if (order.orderType === 'Take Profit Market' ||
                        order.orderType === 'Take Profit Limit') {
                        takeProfitPrice = order.triggerPx;
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Found TP order for ${position.symbol}:`, {
                            triggerPrice: order.triggerPx,
                            orderId: order.oid,
                            orderType: order.orderType,
                            isPositionTpsl: order.isPositionTpsl,
                        });
                    }
                    else if (order.orderType === 'Stop Market' ||
                        order.orderType === 'Stop Limit') {
                        stopLossPrice = order.triggerPx;
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Found SL order for ${position.symbol}:`, {
                            triggerPrice: order.triggerPx,
                            orderId: order.oid,
                            orderType: order.orderType,
                            isPositionTpsl: order.isPositionTpsl,
                        });
                    }
                });
                // Check child orders (for normalTpsl grouping)
                parentOrdersWithChildren.forEach((parentOrder) => {
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Parent order with children for ${position.symbol}:`, {
                        parentOid: parentOrder.oid,
                        childrenCount: parentOrder.children.length,
                    });
                    parentOrder.children.forEach((childOrder) => {
                        if (childOrder.isTrigger && childOrder.reduceOnly) {
                            if (childOrder.orderType === 'Take Profit Market' ||
                                childOrder.orderType === 'Take Profit Limit') {
                                takeProfitPrice = childOrder.triggerPx;
                                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Found TP child order for ${position.symbol}:`, {
                                    triggerPrice: childOrder.triggerPx,
                                    orderId: childOrder.oid,
                                    orderType: childOrder.orderType,
                                });
                            }
                            else if (childOrder.orderType === 'Stop Market' ||
                                childOrder.orderType === 'Stop Limit') {
                                stopLossPrice = childOrder.triggerPx;
                                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Found SL child order for ${position.symbol}:`, {
                                    triggerPrice: childOrder.triggerPx,
                                    orderId: childOrder.oid,
                                    orderType: childOrder.orderType,
                                });
                            }
                        }
                    });
                });
                return {
                    ...position,
                    takeProfitPrice,
                    stopLossPrice,
                    takeProfitCount: takeProfitOrders.length,
                    stopLossCount: stopLossOrders.length,
                    takeProfitOrders,
                    stopLossOrders,
                };
            }));
            return allPositions;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Error getting positions:', error);
            return [];
        }
    }
    /**
     * Get historical user fills (trade executions)
     *
     * @param params - The operation parameters.
     * @param options - Optional cache-control modifiers for this read.
     * @returns A promise that resolves to the result.
     */
    async getOrderFills(params, options) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Getting user fills via HyperLiquid SDK:', params);
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            // Use userFillsByTime when startTime is provided for time-filtered queries,
            // otherwise use userFills for backward compatibility
            const rawFills = params?.startTime
                ? await infoClient.userFillsByTime({
                    user: userAddress,
                    startTime: params.startTime,
                    endTime: params.endTime,
                    aggregateByTime: params?.aggregateByTime ?? false,
                })
                : await infoClient.userFills({
                    user: userAddress,
                    aggregateByTime: params?.aggregateByTime ?? false,
                });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('User fills received:', {
                count: rawFills?.length ?? 0,
            });
            // Start fetching historical orders in parallel with fill transformation.
            // The fills API does not return order type, so we cross-reference
            // with historical orders to enable TP/SL pill rendering in activity.
            // Routed through the client-service coalesce so the enrichment sidecar
            // rides the same cache as an explicit getOrders call, preventing a
            // second REST fire under rapid market switching.
            const historicalOrdersPromise = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f")
                .fetchHistoricalOrders(userAddress, {
                forceRefresh: options?.forceRefresh,
            })
                .catch((enrichError) => {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Warning: failed to enrich fills with order types:', enrichError);
                return null;
            });
            // Transform HyperLiquid fills to abstract OrderFill type
            const fills = (rawFills || []).reduce((acc, fill) => {
                // Perps only, no Spots
                if (!['Buy', 'Sell'].includes(fill.dir)) {
                    acc.push({
                        orderId: fill.oid?.toString() || '',
                        symbol: fill.coin,
                        side: fill.side === 'A' ? 'sell' : 'buy',
                        startPosition: fill.startPosition,
                        size: fill.sz,
                        price: fill.px,
                        fee: fill.fee,
                        feeToken: fill.feeToken,
                        timestamp: fill.time,
                        pnl: fill.closedPnl,
                        direction: fill.dir,
                        success: true,
                        liquidation: fill.liquidation
                            ? {
                                liquidatedUser: fill.liquidation.liquidatedUser,
                                markPx: fill.liquidation.markPx,
                                method: fill.liquidation.method,
                            }
                            : undefined,
                    });
                }
                return acc;
            }, []);
            // Enrich fills with detailedOrderType from historical orders
            // Wrapped in its own try/catch so a malformed order never discards fetched fills
            try {
                const rawOrders = await historicalOrdersPromise;
                if (rawOrders) {
                    const orderTypeByOid = new Map();
                    for (const rawOrder of rawOrders) {
                        const oid = rawOrder.order?.oid?.toString();
                        if (oid && rawOrder.order?.orderType && !orderTypeByOid.has(oid)) {
                            orderTypeByOid.set(oid, rawOrder.order.orderType);
                        }
                    }
                    for (const fill of fills) {
                        const orderType = orderTypeByOid.get(fill.orderId);
                        if (orderType) {
                            fill.detailedOrderType = orderType;
                        }
                    }
                }
            }
            catch (enrichError) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Error enriching fills with order types:', enrichError);
            }
            return fills;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Error getting user fills:', error);
            return [];
        }
    }
    /**
     * Get historical orders (order lifecycle)
     *
     * @param params - The operation parameters.
     * @param options - Optional cache-control modifiers for this read.
     * @returns A promise that resolves to the result.
     */
    async getOrders(params, options) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Getting user orders via HyperLiquid SDK:', params);
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            const rawOrders = await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").fetchHistoricalOrders(userAddress, { forceRefresh: options?.forceRefresh });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('User orders received:', {
                count: rawOrders?.length ?? 0,
            });
            // Transform HyperLiquid orders to abstract Order type
            const orders = (rawOrders || []).map((rawOrder) => {
                const { order, status, statusTimestamp } = rawOrder;
                // Normalize side: HyperLiquid uses 'A' (Ask/Sell) and 'B' (Bid/Buy)
                const normalizedSide = order.side === 'B' ? 'buy' : 'sell';
                // Normalize status
                let normalizedStatus;
                switch (status) {
                    case 'open':
                        normalizedStatus = 'open';
                        break;
                    case 'filled':
                        normalizedStatus = 'filled';
                        break;
                    case 'canceled':
                    case 'marginCanceled':
                    case 'vaultWithdrawalCanceled':
                    case 'openInterestCapCanceled':
                    case 'selfTradeCanceled':
                    case 'reduceOnlyCanceled':
                    case 'siblingFilledCanceled':
                    case 'delistedCanceled':
                    case 'liquidatedCanceled':
                    case 'scheduledCancel':
                    case 'reduceOnlyRejected':
                        normalizedStatus = 'canceled';
                        break;
                    case 'rejected':
                        // case 'minTradeNtlRejected':
                        normalizedStatus = 'rejected';
                        break;
                    case 'triggered':
                        normalizedStatus = 'triggered';
                        break;
                    default:
                        normalizedStatus = 'queued';
                }
                // Calculate filled and remaining size
                const originalSize = parseFloat(order.origSz || order.sz);
                const currentSize = parseFloat(order.sz);
                const filledSize = originalSize - currentSize;
                return {
                    orderId: order.oid?.toString() || '',
                    symbol: order.coin,
                    side: normalizedSide,
                    orderType: order.orderType?.toLowerCase().includes('limit')
                        ? 'limit'
                        : 'market',
                    size: order.sz,
                    originalSize: order.origSz || order.sz,
                    price: order.limitPx || '0',
                    filledSize: filledSize.toString(),
                    remainingSize: currentSize.toString(),
                    status: normalizedStatus,
                    timestamp: statusTimestamp,
                    lastUpdated: statusTimestamp,
                    detailedOrderType: order.orderType, // Full order type from exchange (e.g., 'Take Profit Limit', 'Stop Market')
                    isTrigger: order.isTrigger,
                    reduceOnly: order.reduceOnly,
                };
            });
            return orders;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Error getting user orders:', error);
            return [];
        }
    }
    /**
     * Get currently open orders (real-time status)
     * Uses frontendOpenOrders API to get only currently active orders
     * Aggregates orders from all enabled DEXs (main + HIP-3)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async getOpenOrders(params) {
        try {
            // Path 0: Standalone mode for lightweight open order queries
            // Creates a standalone InfoClient without requiring full initialization
            // No wallet, WebSocket, or account setup needed - just HTTP API call
            if (params?.standalone && params.userAddress) {
                const { userAddress } = params;
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Getting open orders in standalone mode', { userAddress });
                const standaloneInfoClient = (0, standaloneInfoClient_js_1.createStandaloneInfoClient)({
                    isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
                });
                const dexs = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getStandaloneValidatedDexs).call(this);
                const orderResults = await (0, standaloneInfoClient_js_1.queryStandaloneOpenOrders)(standaloneInfoClient, userAddress, dexs);
                // Combine all orders from all DEXs and adapt (without position context in standalone mode)
                const orders = orderResults.flatMap((dexOrders) => dexOrders.map((order) => (0, hyperLiquidAdapter_js_1.adaptOrderFromSDK)(order, undefined)));
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: standalone open orders fetched', { count: orders.length });
                return orders;
            }
            // Try WebSocket cache first (unless explicitly bypassed)
            // Use atomic getter to prevent race condition between check and get
            if (!params?.skipCache) {
                const cachedOrders = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getOrdersCacheIfInitialized();
                if (cachedOrders !== null) {
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using cached open orders from WebSocket', {
                        count: cachedOrders.length,
                    });
                    return cachedOrders;
                }
            }
            // Fallback to API call
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Fetching open orders via API', params?.skipCache ? '(skipCache requested)' : '(cache not initialized)');
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            // Query orders across all enabled DEXs in parallel
            const { results: orderResults, failedDexs } = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_queryUserDataAcrossDexs).call(this, { user: userAddress }, (userParam) => infoClient.frontendOpenOrders(userParam));
            if (failedDexs.length > 0) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Partial multi-DEX open order fetch completed with failures', {
                    failedDexs: failedDexs.map(({ dex, error }) => `${dex ?? 'main'}:${error.message}`),
                });
            }
            // Combine all orders from all DEXs
            const rawOrders = orderResults.flatMap((result) => result.data);
            // Get positions for order context (already multi-DEX aware)
            const positions = await this.getPositions();
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Currently open orders received (all DEXs):', {
                count: rawOrders.length,
            });
            // Transform HyperLiquid open orders to abstract Order type using adapter
            // Raw SDK orders use 'coin', adapted positions use 'symbol'
            const orders = (rawOrders || []).map((order) => {
                const position = positions.find((pos) => pos.symbol === order.coin);
                return (0, hyperLiquidAdapter_js_1.adaptOrderFromSDK)(order, position);
            });
            return orders;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Error getting currently open orders:', error);
            return [];
        }
    }
    /**
     * Get user funding history
     *
     * @param params - The operation parameters.
     * @param _options - Cache-control modifiers (unused — funding has no
     * provider-internal cache; coalescing happens at MarketDataService).
     * @returns A promise that resolves to the result.
     */
    async getFunding(params, _options) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Getting user funding via HyperLiquid SDK:', params);
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            // On-demand loading: the default window is one 30-day page so the
            // initial fetch costs exactly 1 API call (~24 weight vs 312 previously).
            // When loadMoreFunding in usePerpsTransactionHistory passes explicit
            // startTime/endTime for an older 30-day page the while-loop below still
            // produces exactly 1 chunk. The 365-day max lookback is enforced by the
            // caller.
            //
            // Each chunk is fetched via fetchWindowWithAutoSplit: if a call returns
            // FUNDING_HISTORY_API_LIMIT records the window has hit the API cap and
            // the oldest records would be silently dropped. The function splits the
            // window in half and recurses until every sub-window is under the cap,
            // guaranteeing complete results regardless of position count or activity.
            const finalEndTime = params?.endTime ?? Date.now();
            const pageWindowMs = transactionsHistoryConfig_js_1.PERPS_TRANSACTIONS_HISTORY_CONSTANTS.FUNDING_HISTORY_PAGE_WINDOW_DAYS *
                24 *
                60 *
                60 *
                1000;
            const finalStartTime = params?.startTime ?? finalEndTime - pageWindowMs; // Default: most recent 30-day window only
            const minSplitWindowMs = transactionsHistoryConfig_js_1.PERPS_TRANSACTIONS_HISTORY_CONSTANTS.MIN_SPLIT_WINDOW_MS;
            const apiLimit = transactionsHistoryConfig_js_1.PERPS_TRANSACTIONS_HISTORY_CONSTANTS.FUNDING_HISTORY_API_LIMIT;
            // Fetches a single window. If the result hits the API cap the window is
            // split in half and both halves are fetched in parallel, recursively,
            // until every sub-window is under the cap.
            const fetchWindowWithAutoSplit = async (windowStart, windowEnd) => {
                const result = await infoClient.userFunding({
                    user: userAddress,
                    startTime: windowStart,
                    endTime: windowEnd,
                });
                const records = result ?? [];
                if (records.length >= apiLimit &&
                    windowEnd - windowStart > minSplitWindowMs) {
                    const mid = windowStart + Math.floor((windowEnd - windowStart) / 2);
                    const [left, right] = await Promise.all([
                        fetchWindowWithAutoSplit(windowStart, mid),
                        fetchWindowWithAutoSplit(mid, windowEnd),
                    ]);
                    return [...(left ?? []), ...(right ?? [])];
                }
                return records;
            };
            const chunks = [];
            let chunkEnd = finalEndTime;
            while (chunkEnd > finalStartTime) {
                const chunkStart = Math.max(finalStartTime, chunkEnd - pageWindowMs);
                chunks.push({ start: chunkStart, end: chunkEnd });
                chunkEnd = chunkStart;
            }
            const pages = await Promise.all(chunks.map((chunk) => fetchWindowWithAutoSplit(chunk.start, chunk.end)));
            // Deduplicate at chunk boundaries — adjacent windows share their boundary
            // timestamp (chunkEnd of N === chunkStart of N+1) and the API is
            // inclusive on both sides, so a record can appear in both adjacent calls.
            // Funding records share a zero hash, so we key on time + coin instead.
            const seen = new Set();
            const allRaw = pages.flat().filter((record) => {
                const key = `${record.time}-${record.delta.coin}`;
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
            allRaw.sort((a, b) => a.time - b.time);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('User funding received:', {
                count: allRaw.length,
                chunks: chunks.length,
            });
            // Transform HyperLiquid funding to abstract Funding type
            const funding = allRaw.map(({ delta, hash, time }) => ({
                symbol: delta.coin,
                amountUsd: delta.usdc,
                rate: delta.fundingRate,
                timestamp: time,
                transactionHash: hash,
            }));
            return funding;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Error getting user funding:', error);
            return [];
        }
    }
    /**
     * Get user non-funding ledger updates (deposits, transfers, withdrawals)
     *
     * @param params - The operation parameters.
     * @param params.accountId - The CAIP account ID.
     * @param params.startTime - Start timestamp in milliseconds.
     * @param params.endTime - End timestamp in milliseconds.
     * @returns The result of the operation.
     */
    async getUserNonFundingLedgerUpdates(params) {
        try {
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            const rawLedgerUpdates = await infoClient.userNonFundingLedgerUpdates({
                user: userAddress,
                startTime: params?.startTime ?? 0,
                endTime: params?.endTime,
            });
            return rawLedgerUpdates ?? [];
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getUserNonFundingLedgerUpdates'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getUserNonFundingLedgerUpdates', params));
            return [];
        }
    }
    /**
     * Resolve the provider's currently active CAIP account identifier.
     * Used by the MarketDataService REST coalesce layer so cached payloads
     * are keyed by the actual resolved address rather than a shared
     * "default" sentinel — prevents one account's data from being served
     * after an account switch within the coalesce TTL window.
     *
     * @returns CAIP account id for the currently selected HyperLiquid account.
     */
    async getCurrentAccountId() {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getCurrentAccountId();
    }
    /**
     * Get user history (deposits, withdrawals, transfers)
     *
     * @param params - The operation parameters.
     * @param params.accountId - The CAIP account ID.
     * @param params.startTime - Start timestamp in milliseconds.
     * @param params.endTime - End timestamp in milliseconds.
     * @returns The result of the operation.
     */
    async getUserHistory(params) {
        try {
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            const rawLedgerUpdates = await infoClient.userNonFundingLedgerUpdates({
                user: userAddress,
                startTime: params?.startTime ?? 0,
                endTime: params?.endTime,
            });
            // Transform the raw ledger updates to UserHistoryItem format
            return (0, hyperLiquidAdapter_js_1.adaptHyperLiquidLedgerUpdateToUserHistoryItem)(rawLedgerUpdates);
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getUserHistory'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getUserHistory'));
            return [];
        }
    }
    async getHistoricalPortfolio(params) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Getting historical portfolio via HyperLiquid SDK:', params);
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            // Get portfolio data
            const portfolioData = await infoClient.portfolio({
                user: userAddress,
            });
            // Calculate target time (default to 24 hours ago)
            const targetTime = Date.now() - 24 * 60 * 60 * 1000;
            // Get UTC 00:00 of the target day
            const targetDate = new Date(targetTime);
            const targetTimestamp = targetDate.getTime();
            // Get the account value history from the last week's data
            const weeklyPeriod = portfolioData?.[1];
            const weekData = weeklyPeriod?.[1];
            const accountValueHistory = weekData?.accountValueHistory || [];
            // Find entries that are before the target timestamp, then get the closest one
            const entriesBeforeTarget = accountValueHistory.filter(([timestamp]) => timestamp < targetTimestamp);
            let closestEntry = null;
            let smallestDiff = Infinity;
            for (const entry of entriesBeforeTarget) {
                const [timestamp] = entry;
                const diff = targetTimestamp - timestamp;
                if (diff < smallestDiff) {
                    smallestDiff = diff;
                    closestEntry = entry;
                }
            }
            const result = closestEntry
                ? {
                    accountValue1dAgo: closestEntry[1] || '0',
                    timestamp: closestEntry[0] || 0,
                }
                : {
                    accountValue1dAgo: accountValueHistory?.[accountValueHistory.length - 1]?.[1] || '0',
                    timestamp: 0,
                };
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Historical portfolio result:', result);
            return result;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Error getting historical portfolio:', error);
            return {
                accountValue1dAgo: '0',
                timestamp: 0,
            };
        }
    }
    /**
     * Get account state
     * Aggregates balances across all enabled DEXs (main + HIP-3)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async getAccountState(params) {
        try {
            // Path 0: Standalone mode for lightweight account state queries
            // Creates a standalone InfoClient without requiring full initialization
            // No wallet, WebSocket, or account setup needed - just HTTP API call
            // Use for discovery use cases like checking if user has perps funds
            if (params?.standalone && params.userAddress) {
                const { userAddress } = params;
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Getting account state in standalone mode', { userAddress });
                const standaloneInfoClient = (0, standaloneInfoClient_js_1.createStandaloneInfoClient)({
                    isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
                });
                const dexs = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getStandaloneValidatedDexs).call(this);
                const [standaloneSpotStateResult, standalonePerpsResults, standaloneAbstractionResult,] = await Promise.all([
                    standaloneInfoClient
                        .spotClearinghouseState({ user: userAddress })
                        .catch((error) => {
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Standalone spot state fetch failed — falling back to perps-only totals', {
                            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getAccountState.standalone.spot').message,
                        });
                        return null;
                    }),
                    (0, standaloneInfoClient_js_1.queryStandaloneClearinghouseStates)(standaloneInfoClient, userAddress, dexs),
                    standaloneInfoClient
                        .userAbstraction({ user: userAddress })
                        .catch((error) => {
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Standalone userAbstraction fetch failed; spot fold disabled until the mode resolves', {
                            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getAccountState.standalone.abstraction').message,
                        });
                        return null;
                    }),
                ]);
                // Aggregate account states across all DEXs, then apply spot-backed
                // adjustments so streamed/standalone/full paths report the same totals.
                const dexAccountStates = standalonePerpsResults.map((perpsState) => (0, hyperLiquidAdapter_js_1.adaptAccountStateFromSDK)(perpsState));
                const aggregatedAccountState = (0, accountUtils_js_1.addSpotBalanceToAccountState)((0, accountUtils_js_1.aggregateAccountStates)(dexAccountStates), standaloneSpotStateResult, {
                    foldIntoCollateral: (0, hyperliquid_types_js_1.hyperLiquidModeFoldsSpot)(standaloneAbstractionResult),
                });
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: standalone account state fetched', { totalBalance: aggregatedAccountState.totalBalance });
                return aggregatedAccountState;
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Getting account state via HyperLiquid SDK');
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault(params?.accountId);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('User address for account state:', userAddress);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Network mode:', __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode() ? 'TESTNET' : 'MAINNET');
            // Get Spot balance, Perps states across DEXs, and the HL abstraction
            // mode (Unified / Standard / Portfolio / DEX-abstraction). Mode decides
            // whether spot USDC is perps collateral — see addSpotBalanceToAccountState.
            // One transient DEX failure should not blank the entire account state.
            const [spotStateResult, perpsStateResult, abstractionResult] = await Promise.allSettled([
                infoClient.spotClearinghouseState({ user: userAddress }),
                __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_queryUserDataAcrossDexs).call(this, { user: userAddress }, (userParam) => infoClient.clearinghouseState(userParam)),
                infoClient.userAbstraction({ user: userAddress }),
            ]);
            const spotState = spotStateResult.status === 'fulfilled' ? spotStateResult.value : null;
            const abstractionMode = abstractionResult.status === 'fulfilled'
                ? abstractionResult.value
                : null;
            if (abstractionResult.status === 'rejected') {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('User abstraction fetch failed; spot fold disabled until the mode resolves', {
                    error: (0, errorUtils_js_1.ensureError)(abstractionResult.reason, 'HyperLiquidProvider.getAccountState.abstraction').message,
                });
            }
            const perpsResponse = perpsStateResult.status === 'fulfilled'
                ? perpsStateResult.value
                : {
                    results: [],
                    failedDexs: [
                        {
                            dex: null,
                            error: (0, errorUtils_js_1.ensureError)(perpsStateResult.reason, 'HyperLiquidProvider.getAccountState.perps'),
                        },
                    ],
                };
            const perpsStateResults = perpsResponse.results;
            const failedPerpsDexs = perpsResponse.failedDexs;
            if (spotStateResult.status === 'rejected') {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Spot state fetch failed during account state aggregation', {
                    error: (0, errorUtils_js_1.ensureError)(spotStateResult.reason, 'HyperLiquidProvider.getAccountState.spot').message,
                });
            }
            if (failedPerpsDexs.length > 0) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Perps account state completed with partial DEX failures', {
                    failedDexs: failedPerpsDexs.map(({ dex, error }) => `${dex ?? 'main'}:${error.message}`),
                });
            }
            if (perpsStateResults.length === 0) {
                const failedDexNames = failedPerpsDexs.map(({ dex }) => dex ?? 'main');
                const spotErrorMessage = spotStateResult.status === 'rejected'
                    ? (0, errorUtils_js_1.ensureError)(spotStateResult.reason, 'HyperLiquidProvider.getAccountState.spot').message
                    : undefined;
                throw new Error(`Failed to fetch account state (failedDexs=[${failedDexNames.join(',')}], spotError=${spotErrorMessage ?? 'none'})`);
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Spot state:', spotState);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Perps states (all DEXs):', {
                dexCount: perpsStateResults.length,
            });
            // Aggregate account states from all DEXs
            // Each DEX has independent positions and margin, we sum them
            const dexAccountStates = perpsStateResults.map((result) => {
                const dexAccountState = (0, hyperLiquidAdapter_js_1.adaptAccountStateFromSDK)(result.data);
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`DEX ${result.dex ?? 'main'} account state:`, {
                    totalBalance: dexAccountState.totalBalance,
                    spendableBalance: dexAccountState.spendableBalance,
                    withdrawableBalance: dexAccountState.withdrawableBalance,
                    marginUsed: dexAccountState.marginUsed,
                    unrealizedPnl: dexAccountState.unrealizedPnl,
                });
                return dexAccountState;
            });
            const aggregatedAccountState = (0, accountUtils_js_1.addSpotBalanceToAccountState)((0, accountUtils_js_1.aggregateAccountStates)(dexAccountStates), spotState, { foldIntoCollateral: (0, hyperliquid_types_js_1.hyperLiquidModeFoldsSpot)(abstractionMode) });
            // Build per-sub-account breakdown (HIP-3 DEXs map to sub-accounts)
            const subAccountBreakdown = {};
            perpsStateResults.forEach((result) => {
                const { dex, data: perpsState } = result;
                const dexAccountState = (0, hyperLiquidAdapter_js_1.adaptAccountStateFromSDK)(perpsState);
                const subAccountKey = dex ?? ''; // Empty string for main DEX
                subAccountBreakdown[subAccountKey] = {
                    spendableBalance: dexAccountState.spendableBalance,
                    withdrawableBalance: dexAccountState.withdrawableBalance,
                    totalBalance: dexAccountState.totalBalance,
                };
            });
            // Add sub-account breakdown to result
            aggregatedAccountState.subAccountBreakdown = subAccountBreakdown;
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Aggregated account state:', aggregatedAccountState);
            return aggregatedAccountState;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getAccountState'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getAccountState', {
                accountId: params?.accountId,
            }));
            // Re-throw the error so the controller can handle it properly
            // This allows the UI to show proper error messages instead of zeros
            throw (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getAccountState');
        }
    }
    /**
     * Get available markets with multi-DEX aggregation support (HIP-3)
     * Handles three query patterns:
     * 1. Symbol filtering: Groups symbols by DEX, fetches in parallel
     * 2. Multi-DEX aggregation: Fetches from all enabled DEXs when no specific DEX requested
     * 3. Single DEX query: Fetches from main or specific DEX
     *
     * @param params - Optional parameters for filtering
     * @returns A promise that resolves to the result.
     */
    async getMarkets(params) {
        try {
            // Path 0: Standalone mode for lightweight discovery queries
            // Creates a standalone InfoClient without requiring full initialization
            // No wallet, WebSocket, or account setup needed - just HTTP API call
            // Use for discovery use cases like checking if a perps market exists
            if (params?.standalone) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Getting markets in standalone mode', { symbolCount: params?.symbols?.length });
                // Create standalone client - bypasses all initialization (wallet, WebSocket, etc.)
                const standaloneInfoClient = (0, standaloneInfoClient_js_1.createStandaloneInfoClient)({
                    isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
                });
                // Simple path: fetch main DEX markets only (no HIP-3 multi-DEX)
                const meta = await standaloneInfoClient.meta();
                if (!meta?.universe || !Array.isArray(meta.universe)) {
                    throw new Error('Invalid universe data received from HyperLiquid API');
                }
                // Transform to MarketInfo format
                const markets = meta.universe.map((asset) => (0, hyperLiquidAdapter_js_1.adaptMarketFromSDK)(asset));
                // Filter by symbols if provided
                if (params?.symbols?.length) {
                    return markets.filter((market) => params.symbols?.some((symbol) => market.name.toUpperCase() === symbol.toUpperCase()));
                }
                return markets;
            }
            // Ensure full initialization including asset mapping
            // This is deduplicated - concurrent calls wait for the same promise
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
            // Path 1: Symbol filtering - group by DEX and fetch in parallel
            if (params?.symbols && params.symbols.length > 0) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Getting markets with symbol filter', {
                    symbolCount: params.symbols.length,
                });
                // Group symbols by DEX
                const symbolsByDex = new Map();
                params.symbols.forEach((symbol) => {
                    const { dex } = (0, hyperLiquidAdapter_js_1.parseAssetName)(symbol);
                    const existing = symbolsByDex.get(dex);
                    if (existing) {
                        existing.push(symbol);
                    }
                    else {
                        symbolsByDex.set(dex, [symbol]);
                    }
                });
                // Query each unique DEX in parallel (with caching)
                const marketArrays = await Promise.all(Array.from(symbolsByDex.keys()).map(async (dex) => __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchMarketsForDex).call(this, {
                    dex,
                    skipFilters: params?.skipFilters,
                })));
                // Combine and filter by requested symbols
                const allMarkets = marketArrays.flat();
                return allMarkets.filter((market) => params.symbols?.some((symbol) => market.name.toLowerCase() === symbol.toLowerCase()));
            }
            // Path 2: Multi-DEX aggregation - fetch from all enabled DEXs
            if (!params?.dex && __classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f")) {
                // Determine which DEXs to query based on skipFilters flag
                const dexsToQuery = params?.skipFilters
                    ? await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAllAvailableDexs).call(this)
                    : await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getValidatedDexs).call(this);
                if (dexsToQuery.length > 1) {
                    // More than just main DEX
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Fetching markets from DEXs', {
                        dexCount: dexsToQuery.length,
                        skipFilters: params?.skipFilters ?? false,
                    });
                    const marketArrays = await Promise.all(dexsToQuery.map(async (dex) => {
                        try {
                            return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchMarketsForDex).call(this, {
                                dex,
                                skipFilters: params?.skipFilters,
                            });
                        }
                        catch (error) {
                            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getMarkets'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getMarkets.multiDex', {
                                dex: dex ?? 'main',
                            }));
                            return []; // Continue with other DEXs on error
                        }
                    }));
                    return marketArrays.flat();
                }
            }
            // Path 3: Single DEX query (main DEX or specific DEX) - with caching
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Getting markets for single DEX', {
                dex: params?.dex ?? 'main',
            });
            return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchMarketsForDex).call(this, {
                dex: params?.dex ?? null,
                skipFilters: params?.skipFilters,
            });
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getMarkets'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getMarkets', {
                dex: params?.dex,
                symbolCount: params?.symbols?.length,
            }));
            return [];
        }
    }
    /**
     * Get list of available HIP-3 DEXs that have markets
     * Useful for debugging and manual DEX selection
     *
     * @returns Array of DEX names (excluding main DEX)
     */
    async getAvailableHip3Dexs() {
        try {
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            if (!__classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f")) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HIP-3 disabled, no DEXs available');
                return [];
            }
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            // Get all DEXs from API
            const allDexs = await infoClient.perpDexs();
            if (!allDexs || !Array.isArray(allDexs)) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('perpDexs() returned invalid data');
                return [];
            }
            // Extract HIP-3 DEX names (filter out null which is main DEX)
            const hip3DexNames = [];
            allDexs.forEach((dex) => {
                if (dex !== null && (0, utils_1.hasProperty)(dex, 'name')) {
                    hip3DexNames.push(dex.name);
                }
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Found ${hip3DexNames.length} HIP-3 DEXs from perpDexs() API`);
            // Filter to only DEXs that have markets
            const dexsWithMarkets = [];
            await Promise.all(hip3DexNames.map(async (dexName) => {
                try {
                    const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName });
                    if (meta.universe &&
                        Array.isArray(meta.universe) &&
                        meta.universe.length > 0) {
                        dexsWithMarkets.push(dexName);
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`  ✅ ${dexName}: ${meta.universe.length} markets`);
                    }
                    else {
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`  ⚠️ ${dexName}: no markets`);
                    }
                }
                catch (error) {
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`  ❌ ${dexName}: error querying`, error);
                }
            }));
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`${dexsWithMarkets.length} DEXs have markets:`, dexsWithMarkets);
            return dexsWithMarkets.sort((a, b) => a.localeCompare(b));
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getAvailableHip3Dexs'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getAvailableHip3Dexs'));
            return [];
        }
    }
    /**
     * Get market data with prices, volumes, and 24h changes
     * Aggregates data from all enabled DEXs (main + HIP-3) when equity is enabled
     *
     * Note: This is called once during initialization and cached by PerpsStreamManager.
     * Real-time price updates come from WebSocket subscriptions, not this method.
     *
     * @returns A promise that resolves to the combined market data from all enabled DEXs.
     */
    async getMarketDataWithPrices() {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Getting market data with prices via HyperLiquid SDK');
        // Ensure asset mapping is built first (populates meta cache)
        // This guarantees buildAssetMapping has run before we check cache,
        // eliminating duplicate metaAndAssetCtxs API calls from race conditions
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
        // Use HTTP transport for market data fetches — these are one-shot request/response calls
        // that don't benefit from WebSocket. When the WebSocket is in CONNECTING state (after app
        // backgrounding or network transitions), the SDK buffers messages causing timeouts.
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient({ useHttp: true });
        // Get enabled DEXs respecting feature flags (uses cached perpDexs)
        const enabledDexs = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getValidatedDexs).call(this);
        // Fetch meta, assetCtxs, and allMids for each enabled DEX in parallel.
        // Check the meta cache first to avoid redundant API calls when buildAssetMapping
        // has already populated it; on cache miss, delegate to #fetchSingleDexFresh.
        const dexDataResults = await Promise.all(enabledDexs.map(async (dex) => {
            const dexKey = dex ?? '';
            const dexParam = dex ?? '';
            const cachedMeta = __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMetaByDex, "f").get(dexKey);
            if (!cachedMeta) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`[getMarketDataWithPrices] Cache miss for ${dex ?? 'main'}, fetching`);
                return __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchSingleDexFresh).call(this, infoClient, dex);
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`[getMarketDataWithPrices] Using cached meta for ${dex ?? 'main'}`, { universeSize: cachedMeta.universe.length });
            let metaForDex = cachedMeta;
            let assetCtxs = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getDexAssetCtxsCache(dexKey) ?? [];
            let failedStep;
            let errorMessage;
            if (assetCtxs.length !== metaForDex.universe.length) {
                try {
                    const freshResult = await infoClient.metaAndAssetCtxs(dexParam ? { dex: dexParam } : undefined);
                    const freshMeta = freshResult?.[0] ?? null;
                    const freshAssetCtxs = freshResult?.[1] ?? [];
                    if (freshAssetCtxs.length !== freshMeta?.universe?.length) {
                        return {
                            dex,
                            meta: null,
                            assetCtxs: [],
                            allMids: {},
                            success: false,
                            failedStep: 'metaAndAssetCtxs',
                            errorMessage: 'metaAndAssetCtxs returned mismatched universe/assetCtxs lengths',
                        };
                    }
                    metaForDex = freshMeta;
                    assetCtxs = freshAssetCtxs;
                    __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMetaByDex, "f").set(dexKey, freshMeta);
                    __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").setDexMetaCache(dexKey, freshMeta);
                    __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").setDexAssetCtxsCache(dexKey, assetCtxs);
                    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_backfillAssetMapForDex).call(this, dex, freshMeta);
                }
                catch (error) {
                    return {
                        dex,
                        meta: null,
                        assetCtxs: [],
                        allMids: {},
                        success: false,
                        failedStep: 'metaAndAssetCtxs',
                        errorMessage: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getMarketDataWithPrices.metaAndAssetCtxs').message,
                    };
                }
            }
            let dexAllMids = {};
            try {
                dexAllMids = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAllMids).call(this, infoClient, dexParam || undefined);
            }
            catch (error) {
                failedStep = 'allMids';
                errorMessage = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getMarketDataWithPrices.allMids').message;
            }
            return {
                dex,
                meta: metaForDex,
                assetCtxs,
                allMids: dexAllMids,
                success: true,
                failedStep,
                errorMessage,
            };
        }));
        // TAT-3304: Exclude non-USDC-collateral HIP-3 DEXs before merging, so
        // getMarketDataWithPrices (and the stale snapshot #cacheFreshMarketDataSnapshot
        // derives from it) enforces the same USDC-only policy as market discovery
        // and order placement.
        const usdcFilteredDexDataResults = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_excludeNonUsdcCollateralResults).call(this, dexDataResults);
        // Combine universe, assetCtxs, and allMids from all DEXs
        const combinedUniverse = [];
        const combinedAssetCtxs = [];
        const combinedAllMids = {};
        let latestDexResults = usdcFilteredDexDataResults;
        __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mergeDexResultsInto).call(this, usdcFilteredDexDataResults, combinedUniverse, combinedAssetCtxs, combinedAllMids);
        if (combinedUniverse.length === 0) {
            combinedUniverse.length = 0;
            combinedAssetCtxs.length = 0;
            for (const key of Object.keys(combinedAllMids)) {
                delete combinedAllMids[key];
            }
            const retryDelayMs = 2000;
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`[getMarketDataWithPrices] All DEXs returned empty, retrying in ${retryDelayMs}ms`);
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            const retryResults = await Promise.all(enabledDexs.map((dex) => __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchSingleDexFresh).call(this, infoClient, dex)));
            const usdcFilteredRetryResults = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_excludeNonUsdcCollateralResults).call(this, retryResults);
            __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mergeDexResultsInto).call(this, usdcFilteredRetryResults, combinedUniverse, combinedAssetCtxs, combinedAllMids);
            latestDexResults = usdcFilteredRetryResults;
            if (combinedUniverse.length === 0) {
                const failedDexs = retryResults
                    .filter((result) => !result.success)
                    .map((result) => result.dex ?? 'main');
                const succeededDexs = retryResults
                    .filter((result) => result.success)
                    .map((result) => result.dex ?? 'main');
                const failedDetails = retryResults
                    .filter((result) => result.errorMessage)
                    .map((result) => `${result.dex ?? 'main'}:${result.failedStep ?? 'unknown'}:${result.errorMessage}`);
                const staleMarketData = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getStaleMarketDataSnapshot).call(this);
                if (staleMarketData) {
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getMarketDataWithPrices] Returning stale cached market data after retry failure', {
                        failedDexs,
                        failedDetails,
                        cachedAt: __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMarketDataWithPrices, "f")?.timestamp ?? Date.now(),
                    });
                    return staleMarketData;
                }
                const wsState = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getConnectionState();
                throw new Error(`Failed to fetch market data - no markets available (enabledDexs=${enabledDexs.length}, failed=[${failedDexs.join(',')}], succeeded=[${succeededDexs.join(',')}], wsState=${wsState}, details=[${failedDetails.join(';')}])`);
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getMarketDataWithPrices] Retry succeeded', {
                marketCount: combinedUniverse.length,
            });
        }
        const partialFailures = latestDexResults.filter((result) => result.errorMessage);
        if (partialFailures.length > 0) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Market data fetch completed with partial per-DEX failures', {
                failures: partialFailures.map((result) => `${result.dex ?? 'main'}:${result.failedStep ?? 'unknown'}:${result.errorMessage}`),
            });
        }
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Aggregated market data from all DEXs', {
            dexCount: enabledDexs.length,
            totalMarkets: combinedUniverse.length,
            mainDexMarkets: latestDexResults[0]?.meta?.universe?.length ?? 0,
            hip3Markets: combinedUniverse.length -
                (latestDexResults[0]?.meta?.universe?.length ?? 0),
        });
        // Debug: Log combinedAllMids to diagnose price lookup issues
        const hip3Keys = Object.keys(combinedAllMids).filter((key) => key.includes(':'));
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Combined allMids price data:', {
            totalKeys: Object.keys(combinedAllMids).length,
            allKeys: Object.keys(combinedAllMids),
            hip3Keys,
            hip3Prices: Object.fromEntries(hip3Keys.map((key) => [key, combinedAllMids[key]])),
            samplePrices: Object.fromEntries(Object.entries(combinedAllMids).slice(0, 5)),
        });
        // Transform to UI-friendly format using standalone utility
        const transformedMarketData = (0, marketDataTransform_js_1.transformMarketData)({
            universe: combinedUniverse,
            assetCtxs: combinedAssetCtxs,
            allMids: combinedAllMids,
        }, __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").marketDataFormatters, hyperLiquidConfig_js_1.HIP3_ASSET_MARKET_TYPES, hyperLiquidConfig_js_1.HYPERLIQUID_ASSET_NAMES);
        return __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_cacheFreshMarketDataSnapshot).call(this, transformedMarketData, latestDexResults);
    }
    /**
     * Validate deposit parameters according to HyperLiquid-specific rules
     * This method enforces protocol-specific requirements like minimum amounts
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async validateDeposit(params) {
        return (0, hyperLiquidValidation_js_1.validateDepositParams)({
            amount: params.amount,
            assetId: params.assetId,
            isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
        });
    }
    /**
     * Validate order parameters according to HyperLiquid-specific rules
     * This includes minimum order sizes, leverage limits, and other protocol requirements
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async validateOrder(params) {
        try {
            // Basic parameter validation
            const basicValidation = (0, hyperLiquidValidation_js_1.validateOrderParams)({
                coin: params.symbol,
                size: params.size,
                price: params.price,
                orderType: params.orderType,
                triggerPrice: params.triggerPrice,
                takeProfitPrice: params.takeProfitPrice,
                stopLossPrice: params.stopLossPrice,
                takeProfitSize: params.takeProfitSize,
                stopLossSize: params.stopLossSize,
                tpslLinkage: params.tpslLinkage,
                grouping: params.grouping,
                timeInForce: params.timeInForce,
                clientOrderId: params.clientOrderId,
                ...pickStrategyParams(params),
            });
            if (!basicValidation.isValid) {
                return basicValidation;
            }
            // Check minimum order size using consistent defaults (matching useMinimumOrderAmount hook)
            // Note: For full validation with market-specific limits, use async methods
            const minimumOrderSize = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode()
                ? hyperLiquidConfig_js_1.TRADING_DEFAULTS.amount.testnet
                : hyperLiquidConfig_js_1.TRADING_DEFAULTS.amount.mainnet;
            // Skip USD validation and minimum check for full closes (100% position close)
            if (params.reduceOnly && params.isFullClose) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Full close detected: skipping USD validation and $10 minimum');
            }
            else {
                // Calculate order value in USD for minimum validation
                let orderValueUSD;
                if (params.usdAmount) {
                    // Preferred: Use provided USD amount (source of truth, no rounding loss)
                    orderValueUSD = parseFloat(params.usdAmount);
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Validating USD amount (source of truth):', {
                        usdAmount: orderValueUSD,
                        minimumRequired: minimumOrderSize,
                    });
                }
                else {
                    // Fallback: Calculate from size × price
                    const size = parseFloat(params.size || '0');
                    let priceForValidation = params.currentPrice;
                    // For limit-executing orders without currentPrice, use limit price as
                    // fallback (plain limit, stop_limit, take_profit_limit)
                    if (!priceForValidation &&
                        params.price &&
                        (0, orderTypes_js_1.isLimitExecutionOrderType)(params.orderType)) {
                        priceForValidation = parseFloat(params.price);
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using limit price for order validation (limit order):', {
                            size,
                            limitPrice: priceForValidation,
                        });
                    }
                    // Market-executing trigger orders (stop_market, take_profit_market)
                    // have no limit price; the trigger price is the best notional estimate.
                    if (!priceForValidation &&
                        params.triggerPrice &&
                        (0, orderTypes_js_1.isTriggerOrderType)(params.orderType)) {
                        priceForValidation = parseFloat(params.triggerPrice);
                        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using trigger price for order validation (trigger order):', {
                            size,
                            triggerPrice: priceForValidation,
                            orderType: params.orderType,
                        });
                    }
                    if (!priceForValidation) {
                        return {
                            isValid: false,
                            error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED,
                        };
                    }
                    orderValueUSD = size * priceForValidation;
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Validating calculated USD from size:', {
                        size,
                        price: priceForValidation,
                        calculatedUsd: orderValueUSD,
                        minimumRequired: minimumOrderSize,
                    });
                }
                // Validate minimum order size
                if (orderValueUSD < minimumOrderSize) {
                    return {
                        isValid: false,
                        error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SIZE_MIN,
                    };
                }
                // A strategy placement's total clearing the per-order minimum does not
                // mean the orders it expands into will.
                const strategyMinimum = validateStrategyNotional({
                    orderType: params.orderType,
                    orderValueUSD,
                });
                if (!strategyMinimum.isValid) {
                    return strategyMinimum;
                }
            }
            // Asset-specific leverage validation
            if (params.leverage && params.symbol) {
                try {
                    const maxLeverage = await this.getMaxLeverage(params.symbol);
                    if (params.leverage < 1 || params.leverage > maxLeverage) {
                        return {
                            isValid: false,
                            error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID,
                        };
                    }
                }
                catch (error) {
                    // Log the error before falling back
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Failed to get max leverage for symbol', error);
                    // If we can't get max leverage, use the default as fallback
                    const defaultMaxLeverage = perpsConfig_js_1.PERPS_CONSTANTS.DefaultMaxLeverage;
                    if (params.leverage < 1 || params.leverage > defaultMaxLeverage) {
                        return {
                            isValid: false,
                            error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID,
                        };
                    }
                }
            }
            // Check if order leverage meets existing position requirement (HyperLiquid protocol constraint)
            if (params.leverage &&
                params.existingPositionLeverage &&
                params.leverage < params.existingPositionLeverage) {
                return {
                    isValid: false,
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_LEVERAGE_BELOW_POSITION,
                };
            }
            // Validate order value against max limits
            if (params.currentPrice && params.leverage) {
                try {
                    const maxLeverage = await this.getMaxLeverage(params.symbol);
                    const maxOrderValue = (0, hyperLiquidValidation_js_1.getMaxOrderValue)(maxLeverage, params.orderType);
                    const orderValue = parseFloat(params.size) * params.currentPrice;
                    if (orderValue > maxOrderValue) {
                        return {
                            isValid: false,
                            error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_MAX_VALUE_EXCEEDED,
                        };
                    }
                }
                catch (error) {
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Failed to validate max order value', error);
                    // Continue without max order validation if we can't get leverage
                }
            }
            return { isValid: true };
        }
        catch (error) {
            return {
                isValid: false,
                error: error instanceof Error
                    ? error.message
                    : perpsErrorCodes_js_1.PERPS_ERROR_CODES.UNKNOWN_ERROR,
            };
        }
    }
    /**
     * Validate close position parameters according to HyperLiquid-specific rules
     * Note: Full validation including remaining position size requires position data
     * which should be passed from the UI layer
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async validateClosePosition(params) {
        try {
            // Basic validation
            if (!params.symbol) {
                return {
                    isValid: false,
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_COIN_REQUIRED,
                };
            }
            // If closing with limit order, must have price
            if (params.orderType === 'limit' && !params.price) {
                return {
                    isValid: false,
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED,
                };
            }
            // Determine minimum order size (needed for precedence logic)
            const minimumOrderSize = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode()
                ? hyperLiquidConfig_js_1.TRADING_DEFAULTS.amount.testnet
                : hyperLiquidConfig_js_1.TRADING_DEFAULTS.amount.mainnet;
            // Validate close size & minimum only if size provided (partial close)
            if (params.size) {
                const closeSize = parseFloat(params.size);
                const price = params.currentPrice
                    ? parseFloat(params.currentPrice.toString())
                    : undefined;
                const orderValueUSD = price && !isNaN(closeSize) ? closeSize * price : undefined;
                // Precedence rule: if size <= 0 treat as minimum_amount failure (more actionable)
                if (isNaN(closeSize) || closeSize <= 0) {
                    return {
                        isValid: false,
                        error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SIZE_MIN,
                    };
                }
                // Enforce minimum order value for partial closes when price known
                if (orderValueUSD !== undefined && orderValueUSD < minimumOrderSize) {
                    return {
                        isValid: false,
                        error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SIZE_MIN,
                    };
                }
                // Note: Remaining position validation stays in UI layer.
            }
            // Full closes (size undefined) bypass minimum check by design
            // Note: For full closes (when size is undefined), there is no minimum
            // This allows users to close positions worth less than $10 completely
            return { isValid: true };
        }
        catch (error) {
            return {
                isValid: false,
                error: error instanceof Error
                    ? error.message
                    : perpsErrorCodes_js_1.PERPS_ERROR_CODES.UNKNOWN_ERROR,
            };
        }
    }
    /**
     * Validate withdrawal parameters - placeholder for future implementation
     *
     * @param _params - The unused operation parameters.
     * @returns A promise that resolves to the result.
     */
    async validateWithdrawal(_params) {
        // Placeholder - to be implemented when needed
        return { isValid: true };
    }
    /**
     * Withdraw funds from HyperLiquid trading account
     *
     * This initiates a withdrawal request via HyperLiquid's API (withdraw3 endpoint).
     *
     * HyperLiquid Bridge Process:
     * - Funds are immediately deducted from L1 balance on HyperLiquid
     * - Validators sign the withdrawal (2/3 of staking power required)
     * - Bridge contract on destination chain processes the withdrawal
     * - After dispute period, USDC is sent to destination address
     * - Total time: ~5 minutes
     * - Fee: 1 USDC (covers Arbitrum gas costs)
     * - No ETH required from user
     *
     * Note: Withdrawals won't appear as incoming transactions until the
     * finalization phase completes (~5 minutes after initiation)
     *
     * @param params Withdrawal parameters
     * @returns Result with txHash (HyperLiquid internal) and withdrawal ID
     */
    async withdraw(params) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: STARTING WITHDRAWAL', {
                params,
                timestamp: new Date().toISOString(),
                assetId: params.assetId,
                amount: params.amount,
                destination: params.destination,
                isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
            });
            // Step 1: Validate withdrawal parameters
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: VALIDATING PARAMETERS');
            const validation = (0, hyperLiquidValidation_js_1.validateWithdrawalParams)(params);
            if (!validation.isValid) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('❌ HyperLiquidProvider: PARAMETER VALIDATION FAILED', {
                    error: validation.error,
                    params,
                    validationResult: validation,
                });
                throw new Error(validation.error);
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: PARAMETERS VALIDATED');
            // Step 2: Get supported withdrawal routes and validate asset
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: CHECKING ASSET SUPPORT');
            const supportedRoutes = this.getWithdrawalRoutes();
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: SUPPORTED WITHDRAWAL ROUTES', {
                routeCount: supportedRoutes.length,
                routes: supportedRoutes.map((route) => ({
                    assetId: route.assetId,
                    chainId: route.chainId,
                    contractAddress: route.contractAddress,
                })),
            });
            // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
            if (!params.assetId) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: MISSING ASSET ID', {
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED,
                    params,
                });
                throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED);
            }
            const assetValidation = (0, hyperLiquidValidation_js_1.validateAssetSupport)(params.assetId, supportedRoutes);
            if (!assetValidation.isValid) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('❌ HyperLiquidProvider: ASSET NOT SUPPORTED', {
                    error: assetValidation.error,
                    assetId: params.assetId,
                    supportedAssets: supportedRoutes.map((route) => route.assetId),
                });
                throw new Error(assetValidation.error);
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: ASSET SUPPORTED', {
                assetId: params.assetId,
            });
            // Step 3: Determine destination address
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: DETERMINING DESTINATION ADDRESS');
            let destination;
            if (params.destination) {
                destination = params.destination;
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: USING PROVIDED DESTINATION', {
                    destination,
                });
            }
            else {
                destination = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: USING USER WALLET ADDRESS', {
                    destination,
                });
            }
            // Step 4: Ensure client is ready
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: ENSURING CLIENT READY');
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureUnifiedAccountEnabled).call(this, { allowUserSigning: true });
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: CLIENT READY');
            // Step 5: Validate amount against account balance
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: CHECKING ACCOUNT BALANCE');
            const accountState = await this.getAccountState();
            const withdrawableBalance = parseFloat(accountState.withdrawableBalance);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: ACCOUNT BALANCE', {
                withdrawableBalance,
                spendableBalance: accountState.spendableBalance,
                totalBalance: accountState.totalBalance,
                marginUsed: accountState.marginUsed,
                unrealizedPnl: accountState.unrealizedPnl,
            });
            // This check is already done in validateWithdrawalParams, but TypeScript needs explicit check
            if (!params.amount) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: MISSING AMOUNT', {
                    error: perpsErrorCodes_js_1.PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED,
                    params,
                });
                throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED);
            }
            const withdrawAmount = parseFloat(params.amount);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: WITHDRAWAL AMOUNT', {
                requestedAmount: withdrawAmount,
                withdrawableBalance,
                sufficientBalance: withdrawAmount <= withdrawableBalance,
            });
            // Validate against withdrawableBalance — the mode-aware cap.
            // No spot sweep: withdrawableBalance already reflects what withdraw3
            // can pull. In Unified mode HL handles cross-wallet internally; in
            // Standard mode spot is not withdrawable via perps.
            const balanceValidation = (0, hyperLiquidValidation_js_1.validateBalance)(withdrawAmount, withdrawableBalance);
            if (!balanceValidation.isValid) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: INSUFFICIENT BALANCE', {
                    error: balanceValidation.error,
                    requestedAmount: withdrawAmount,
                    withdrawableBalance,
                    difference: withdrawAmount - withdrawableBalance,
                });
                throw new Error(balanceValidation.error);
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('✅ HyperLiquidProvider: BALANCE SUFFICIENT');
            // Step 6: Execute withdrawal via HyperLiquid SDK (API call)
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: CALLING WITHDRAW3 API', {
                destination,
                amount: params.amount,
                endpoint: 'withdraw3',
                timestamp: new Date().toISOString(),
            });
            const result = await exchangeClient.withdraw3({
                destination,
                amount: params.amount,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: WITHDRAW3 API RESPONSE', {
                status: result.status,
                response: result,
                timestamp: new Date().toISOString(),
            });
            if (result.status === 'ok') {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: WITHDRAWAL SUBMITTED SUCCESSFULLY', {
                    destination,
                    amount: params.amount,
                    assetId: params.assetId,
                    status: result.status,
                });
                const now = Date.now();
                const withdrawalId = `hl_${(0, uuid_1.v4)()}`;
                return {
                    success: true,
                    withdrawalId,
                    estimatedArrivalTime: now + 5 * 60 * 1000, // HyperLiquid typically takes ~5 minutes
                    // Don't set txHash if we don't have a real transaction hash
                    // HyperLiquid's withdraw3 API doesn't return a transaction hash immediately
                };
            }
            const errorMessage = `Withdrawal failed: ${String(result.status)}`;
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: WITHDRAWAL FAILED', {
                error: errorMessage,
                status: result.status,
                response: result,
                params,
            });
            return {
                success: false,
                error: errorMessage,
            };
        }
        catch (error) {
            const safeError = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.initiateWithdrawal');
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: WITHDRAWAL EXCEPTION', {
                error: safeError.message,
                errorType: safeError.name,
                stack: safeError.stack,
                params,
                timestamp: new Date().toISOString(),
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(safeError, __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'withdraw', {
                assetId: params.assetId,
                amount: params.amount,
                destination: params.destination,
            }));
            return (0, hyperLiquidValidation_js_1.createErrorResult)(error, { success: false });
        }
    }
    /**
     * Transfer USDC collateral between DEXs (main ↔ HIP-3)
     *
     * Verified working on mainnet via Phantom wallet testing (10/15/2025).
     * See docs/perps/HIP-3-IMPLEMENTATION.md for complete transaction flow.
     *
     * @param params - Transfer parameters
     * @param params.sourceDex - Source DEX name ('' = main, 'xyz' = HIP-3)
     * @param params.destinationDex - Destination DEX name ('' = main, 'xyz' = HIP-3)
     * @param params.amount - USDC amount to transfer
     * @returns Transfer result with success status and transaction hash
     * @example
     * // Transfer 10 USDC from main DEX to xyz HIP-3 DEX
     * await transferBetweenDexs({
     *   sourceDex: '',
     *   destinationDex: 'xyz',
     *   amount: '10'
     * });
     */
    async transferBetweenDexs(params) {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: STARTING DEX TRANSFER', {
                params,
                timestamp: new Date().toISOString(),
            });
            // Validate parameters
            if (!params.amount || parseFloat(params.amount) <= 0) {
                throw new Error('Transfer amount must be greater than 0');
            }
            if (params.sourceDex === params.destinationDex) {
                throw new Error('Source and destination DEX must be different');
            }
            // Get user address
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: USER ADDRESS', {
                userAddress,
            });
            // Ensure client ready
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            // Execute transfer using SDK sendAsset()
            // Note: SDK docs say "testnet-only" but it works on mainnet (verified via Phantom)
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: CALLING SEND_ASSET API', {
                sourceDex: params.sourceDex || '(main)',
                destinationDex: params.destinationDex || '(main)',
                amount: params.amount,
            });
            const result = await exchangeClient.sendAsset({
                destination: userAddress,
                sourceDex: params.sourceDex,
                destinationDex: params.destinationDex,
                token: await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getUsdcTokenId).call(this), // Query correct USDC token ID dynamically
                amount: params.amount,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: SEND_ASSET RESPONSE', {
                status: result.status,
                timestamp: new Date().toISOString(),
            });
            if (result.status === 'ok') {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('✅ HyperLiquidProvider: TRANSFER SUCCESSFUL');
                return {
                    success: true,
                    // Note: sendAsset doesn't return txHash in response
                    // User can verify transfer in explorer by timestamp
                };
            }
            throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.TRANSFER_FAILED);
        }
        catch (error) {
            const safeError = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.transferToSpot');
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('❌ HyperLiquidProvider: TRANSFER FAILED', {
                error: safeError.message,
                params,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(safeError, __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'transferBetweenDexs', { ...params }));
            return {
                success: false,
                error: safeError.message,
            };
        }
    }
    /**
     * Subscribe to live price updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToPrices(params) {
        // Handle async subscription service by immediately returning cleanup function
        // The subscription service will load correct funding rates before any callbacks
        let unsubscribe;
        let cancelled = false;
        __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f")
            .subscribeToPrices(params)
            .then((unsub) => {
            // If cleanup was called before subscription completed, immediately unsubscribe
            if (cancelled) {
                unsub();
            }
            else {
                unsubscribe = unsub;
            }
            return undefined;
        })
            .catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.subscribeToPrices'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'subscribeToPrices', {
                symbols: params.symbols,
            }));
            return undefined;
        });
        return () => {
            cancelled = true;
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }
    /**
     * Subscribe to live position updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToPositions(params) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").subscribeToPositions(params);
    }
    /**
     * Subscribe to live order fill updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrderFills(params) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").subscribeToOrderFills(params);
    }
    /**
     * Subscribe to live order updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrders(params) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").subscribeToOrders(params);
    }
    /**
     * Subscribe to live account updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToAccount(params) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").subscribeToAccount(params);
    }
    /**
     * Subscribe to open interest cap updates
     * Zero additional overhead - data extracted from existing webData3 subscription
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOICaps(params) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").subscribeToOICaps(params);
    }
    /**
     * Subscribe to full order book updates with multiple depth levels
     * Creates a dedicated L2Book subscription for real-time order book data
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrderBook(params) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").subscribeToOrderBook(params);
    }
    /**
     * Subscribe to live candle updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToCandles(params) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").subscribeToCandles(params);
    }
    /**
     * Configure live data settings
     *
     * @param config - The configuration object.
     */
    setLiveDataConfig(config) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Live data config updated:', config);
    }
    /**
     * Toggle testnet mode
     *
     * @returns A promise that resolves to the result.
     */
    async toggleTestnet() {
        try {
            const newIsTestnet = !__classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode();
            // Await pending initialization to prevent race condition where
            // the IIFE sets clientsInitialized = true after we reset it
            const pendingInit = __classPrivateFieldGet(this, _HyperLiquidProvider_initializationPromise, "f");
            __classPrivateFieldSet(this, _HyperLiquidProvider_initializationPromise, null, "f");
            if (pendingInit) {
                try {
                    await pendingInit;
                }
                catch {
                    // Ignore - we're switching networks anyway
                }
            }
            // Update all services
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").setTestnetMode(newIsTestnet);
            __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").setTestnetMode(newIsTestnet);
            // Reset initialization flag so clients will be recreated on next use
            __classPrivateFieldSet(this, _HyperLiquidProvider_clientsInitialized, false, "f");
            return {
                success: true,
                isTestnet: newIsTestnet,
            };
        }
        catch (error) {
            return (0, hyperLiquidValidation_js_1.createErrorResult)(error, {
                success: false,
                isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
            });
        }
    }
    /**
     * Initialize provider (ensures clients are ready)
     *
     * @returns A promise that resolves to the result.
     */
    async initialize() {
        try {
            // Ensure clients are initialized (lazy initialization)
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            return {
                success: true,
                chainId: (0, hyperLiquidConfig_js_1.getChainId)(__classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode()),
            };
        }
        catch (error) {
            return (0, hyperLiquidValidation_js_1.createErrorResult)(error, { success: false });
        }
    }
    /**
     * Check if ready to trade
     *
     * @returns A promise that resolves to the result.
     */
    async isReadyToTrade() {
        try {
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const walletConnected = Boolean(exchangeClient) && Boolean(infoClient);
            let accountConnected = false;
            try {
                await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getCurrentAccountId();
                accountConnected = true;
            }
            catch (error) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Account not connected:', error);
                accountConnected = false;
            }
            const ready = walletConnected && accountConnected;
            return {
                ready,
                walletConnected,
                networkSupported: true,
            };
        }
        catch (error) {
            return {
                ready: false,
                walletConnected: false,
                networkSupported: false,
                error: error instanceof Error
                    ? error.message
                    : perpsErrorCodes_js_1.PERPS_ERROR_CODES.UNKNOWN_ERROR,
            };
        }
    }
    /**
     * Calculate liquidation price using HyperLiquid's formula
     * Formula: liq_price = price - side * margin_available / position_size / (1 - maintenanceMarginRatio * side)
     * where maintenanceMarginRatio = 1 / MAINTENANCE_LEVERAGE = 1 / (2 * max_leverage)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the string result.
     */
    async calculateLiquidationPrice(params) {
        const { entryPrice, leverage, direction, asset } = params;
        // Validate inputs
        if (!isFinite(entryPrice) ||
            !isFinite(leverage) ||
            entryPrice <= 0 ||
            leverage <= 0) {
            return '0.00';
        }
        // Get asset's max leverage to calculate maintenance margin
        let maxLeverage = perpsConfig_js_1.PERPS_CONSTANTS.DefaultMaxLeverage; // Default fallback
        if (asset) {
            try {
                maxLeverage = await this.getMaxLeverage(asset);
            }
            catch (error) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Failed to get max leverage for asset, using default', {
                    asset,
                    error,
                });
                // Use default if we can't fetch the asset's max leverage
            }
        }
        // Calculate maintenance leverage and margin according to HyperLiquid docs
        const maintenanceLeverage = 2 * maxLeverage;
        const maintenanceMarginRatio = 1 / maintenanceLeverage;
        const side = direction === 'long' ? 1 : -1;
        // For isolated margin, we use the standard formula
        // margin_available = initial_margin - maintenance_margin_required
        const initialMargin = 1 / leverage;
        const maintenanceMargin = 1 / maintenanceLeverage;
        // Check if position can be opened
        if (initialMargin < maintenanceMargin) {
            // Position cannot be opened - leverage exceeds maximum allowed (2 * maxLeverage)
            throw new Error(`Invalid leverage: ${leverage}x exceeds maximum allowed leverage of ${maintenanceLeverage}x`);
        }
        try {
            // HyperLiquid liquidation formula
            // For isolated margin: margin_available = isolated_margin - maintenance_margin_required
            const marginAvailable = initialMargin - maintenanceMargin;
            // Simplified calculation when position size is 1 unit
            // liq_price = price - side * margin_available * price / (1 - maintenanceMarginRatio * side)
            const denominator = 1 - maintenanceMarginRatio * side;
            if (Math.abs(denominator) < 0.0001) {
                // Avoid division by very small numbers
                return String(entryPrice);
            }
            const liquidationPrice = entryPrice - (side * marginAvailable * entryPrice) / denominator;
            // Ensure liquidation price is non-negative
            return String(Math.max(0, liquidationPrice));
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.calculateLiquidationPrice'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'calculateLiquidationPrice', {
                asset: params.asset,
                entryPrice: params.entryPrice,
                leverage: params.leverage,
                direction: params.direction,
            }));
            return '0.00';
        }
    }
    /**
     * Calculate maintenance margin for a specific asset
     * According to HyperLiquid docs: maintenance_margin = 1 / (2 * max_leverage)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the numeric result.
     */
    async calculateMaintenanceMargin(params) {
        const { asset } = params;
        // Get asset's max leverage
        const maxLeverage = await this.getMaxLeverage(asset);
        // Maintenance margin = 1 / (2 * max_leverage)
        // This varies from 1.25% (for 40x) to 16.7% (for 3x) depending on the asset
        return 1 / (2 * maxLeverage);
    }
    /**
     * Get maximum leverage allowed for an asset
     *
     * @param asset - The asset identifier.
     * @returns A promise that resolves to the numeric result.
     */
    async getMaxLeverage(asset) {
        try {
            // Check cache first
            const cached = __classPrivateFieldGet(this, _HyperLiquidProvider_maxLeverageCache, "f").get(asset);
            const now = Date.now();
            if (cached &&
                now - cached.timestamp < perpsConfig_js_1.PERFORMANCE_CONFIG.MaxLeverageCacheDurationMs) {
                return cached.value;
            }
            // Read-only operation: only need client initialization, not full ensureReady()
            // (no DEX abstraction, referral, or builder fee needed for metadata)
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            // Extract DEX name for API calls (main DEX = null)
            const { dex: dexName } = (0, hyperLiquidAdapter_js_1.parseAssetName)(asset);
            // Get asset info (uses cache to avoid redundant API calls)
            const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName });
            // Check if meta and universe exist and is valid
            // This should never happen since getCachedMeta validates, but defensive check
            if (!meta?.universe || !Array.isArray(meta.universe)) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(new Error('[HyperLiquidProvider] Invalid meta response in getMaxLeverage'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getMaxLeverage', {
                    asset,
                    dexName: dexName ?? 'main',
                    note: 'Meta or universe not available, using default max leverage',
                }));
                return perpsConfig_js_1.PERPS_CONSTANTS.DefaultMaxLeverage;
            }
            // asset.name format: "BTC" for main DEX, "xyz:XYZ100" for HIP-3
            const assetInfo = meta.universe.find((univ) => univ.name === asset);
            if (!assetInfo) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Asset ${asset} not found in universe, using default max leverage`);
                return perpsConfig_js_1.PERPS_CONSTANTS.DefaultMaxLeverage;
            }
            // Cache the result
            __classPrivateFieldGet(this, _HyperLiquidProvider_maxLeverageCache, "f").set(asset, {
                value: assetInfo.maxLeverage,
                timestamp: now,
            });
            return assetInfo.maxLeverage;
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getMaxLeverage'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getMaxLeverage', {
                asset,
            }));
            return perpsConfig_js_1.PERPS_CONSTANTS.DefaultMaxLeverage;
        }
    }
    /**
     * Calculate fees based on HyperLiquid's fee structure
     * Returns fee rate as decimal (e.g., 0.00045 for 0.045%)
     *
     * Uses the SDK's userFees API to get actual discounted rates when available,
     * falling back to base rates if the API is unavailable or user not connected.
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async calculateFees(params) {
        const { orderType, isMaker = false, amount, symbol } = params;
        // Every placement is charged as its execution kind: a stop_market fills as a
        // market order (taker), a stop_limit as a limit order, a scale ladder as the
        // resting limit orders it fans out into, and a TWAP as the marketable
        // suborders it crosses the book with.
        const isMarketExecution = (0, orderTypes_js_1.getTriggerExecution)(orderType) === 'market';
        // A chase is post-only by construction, so it can only ever fill as a maker.
        // Quoting it at the taker rate would overstate the fee whatever the caller
        // passes for `isMaker`.
        const chargesMakerRate = orderType === 'chase' || (!isMarketExecution && isMaker);
        // Start with base rates from config
        let feeRate = chargesMakerRate ? hyperLiquidConfig_js_1.FEE_RATES.maker : hyperLiquidConfig_js_1.FEE_RATES.taker;
        // Parse symbol to detect HIP-3 DEX (e.g., "xyz:TSLA" → dex="xyz", parsedSymbol="TSLA")
        const { dex, symbol: parsedSymbol } = (0, hyperLiquidAdapter_js_1.parseAssetName)(symbol);
        const isHip3Asset = dex !== null;
        // Calculate HIP-3 fee multiplier dynamically (handles Growth Mode)
        let hip3Multiplier = 1;
        if (isHip3Asset && dex && parsedSymbol) {
            hip3Multiplier = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_calculateHip3FeeMultiplier).call(this, {
                dexName: dex,
                assetSymbol: parsedSymbol,
            });
            const originalRate = feeRate;
            feeRate *= hip3Multiplier;
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HIP-3 Dynamic Fee Multiplier Applied', {
                symbol,
                dex,
                parsedSymbol,
                originalBaseRate: originalRate,
                hip3BaseRate: feeRate,
                hip3Multiplier,
            });
        }
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid Fee Calculation Started', {
            orderType,
            isMaker,
            amount,
            symbol,
            isHip3Asset,
            hip3Multiplier,
            baseFeeRate: feeRate,
            baseTakerRate: hyperLiquidConfig_js_1.FEE_RATES.taker,
            baseMakerRate: hyperLiquidConfig_js_1.FEE_RATES.maker,
        });
        // Try to get user-specific rates if wallet is connected
        try {
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('User Address Retrieved', {
                userAddress,
                network: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode() ? 'testnet' : 'mainnet',
            });
            // Check cache first
            if (__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isFeeCacheValid).call(this, userAddress)) {
                const cached = __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeCache, "f").get(userAddress);
                if (cached) {
                    // Same maker/taker decision as the base rates above, including the
                    // post-only chase case — re-deriving it here would quote a chase at
                    // the taker rate whenever the caller passed isMaker: false.
                    let userFeeRate = chargesMakerRate
                        ? cached.perpsMakerRate
                        : cached.perpsTakerRate;
                    // Apply HIP-3 dynamic multiplier to user-specific rates (includes Growth Mode)
                    if (isHip3Asset && hip3Multiplier > 0) {
                        userFeeRate *= hip3Multiplier;
                    }
                    feeRate = userFeeRate;
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('📦 Using Cached Fee Rates', {
                        cacheHit: true,
                        perpsTakerRate: cached.perpsTakerRate,
                        perpsMakerRate: cached.perpsMakerRate,
                        spotTakerRate: cached.spotTakerRate,
                        spotMakerRate: cached.spotMakerRate,
                        selectedRate: feeRate,
                        isHip3Asset,
                        hip3Multiplier,
                        cacheExpiry: new Date(cached.timestamp + cached.ttl).toISOString(),
                        cacheAge: `${Math.round((Date.now() - cached.timestamp) / 1000)}s`,
                    });
                }
            }
            else {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Fetching Fresh Fee Rates from HyperLiquid API', {
                    cacheHit: false,
                    userAddress,
                });
                // Fetch fresh rates from SDK
                // Read-only operation: only need client initialization
                await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
                __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
                const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
                const userFees = await infoClient.userFees({
                    user: userAddress,
                });
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid userFees API Response', {
                    userCrossRate: userFees.userCrossRate,
                    userAddRate: userFees.userAddRate,
                    activeReferralDiscount: userFees.activeReferralDiscount,
                    activeStakingDiscount: userFees.activeStakingDiscount,
                });
                // Parse base user rates (these don't include discounts as expected)
                const baseUserTakerRate = parseFloat(userFees.userCrossRate);
                const baseUserMakerRate = parseFloat(userFees.userAddRate);
                const baseUserSpotTakerRate = parseFloat(userFees.userSpotCrossRate);
                const baseUserSpotMakerRate = parseFloat(userFees.userSpotAddRate);
                // Apply discounts manually since HyperLiquid API doesn't apply them
                const referralDiscount = parseFloat(userFees.activeReferralDiscount || '0');
                const stakingDiscount = parseFloat(userFees.activeStakingDiscount?.discount || '0');
                // Calculate total discount (referral + staking, but not compounding)
                const totalDiscount = Math.min(referralDiscount + stakingDiscount, 0.4); // Cap at 40%
                // Apply discount to rates
                const perpsTakerRate = baseUserTakerRate * (1 - totalDiscount);
                const perpsMakerRate = baseUserMakerRate * (1 - totalDiscount);
                const spotTakerRate = baseUserSpotTakerRate * (1 - totalDiscount);
                const spotMakerRate = baseUserSpotMakerRate * (1 - totalDiscount);
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Fee Discount Calculation', {
                    discounts: {
                        referral: `${(referralDiscount * 100).toFixed(1)}%`,
                        staking: `${(stakingDiscount * 100).toFixed(1)}%`,
                        total: `${(totalDiscount * 100).toFixed(1)}%`,
                    },
                    rates: {
                        before: {
                            taker: `${(baseUserTakerRate * 100).toFixed(4)}%`,
                            maker: `${(baseUserMakerRate * 100).toFixed(4)}%`,
                        },
                        after: {
                            taker: `${(perpsTakerRate * 100).toFixed(4)}%`,
                            maker: `${(perpsMakerRate * 100).toFixed(4)}%`,
                        },
                    },
                });
                // Validate all rates are valid numbers before caching
                if (isNaN(perpsTakerRate) ||
                    isNaN(perpsMakerRate) ||
                    isNaN(spotTakerRate) ||
                    isNaN(spotMakerRate) ||
                    perpsTakerRate < 0 ||
                    perpsMakerRate < 0 ||
                    spotTakerRate < 0 ||
                    spotMakerRate < 0) {
                    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Fee Rate Validation Failed', {
                        validation: {
                            perpsTakerValid: !isNaN(perpsTakerRate) && perpsTakerRate >= 0,
                            perpsMakerValid: !isNaN(perpsMakerRate) && perpsMakerRate >= 0,
                            spotTakerValid: !isNaN(spotTakerRate) && spotTakerRate >= 0,
                            spotMakerValid: !isNaN(spotMakerRate) && spotMakerRate >= 0,
                        },
                        rawValues: {
                            perpsTakerRate,
                            perpsMakerRate,
                            spotTakerRate,
                            spotMakerRate,
                        },
                    });
                    throw new Error('Invalid fee rates received from API');
                }
                const rates = {
                    perpsTakerRate,
                    perpsMakerRate,
                    spotTakerRate,
                    spotMakerRate,
                    timestamp: Date.now(),
                    ttl: 5 * 60 * 1000, // 5 minutes
                };
                __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeCache, "f").set(userAddress, rates);
                // Same maker/taker decision as the base rates above, chase included.
                let userFeeRate = chargesMakerRate
                    ? rates.perpsMakerRate
                    : rates.perpsTakerRate;
                // Apply HIP-3 dynamic multiplier to API-fetched rates (includes Growth Mode)
                if (isHip3Asset && hip3Multiplier > 0) {
                    userFeeRate *= hip3Multiplier;
                }
                feeRate = userFeeRate;
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Fee Rates Validated and Cached', {
                    selectedRate: feeRate,
                    selectedRatePercentage: `${(feeRate * 100).toFixed(4)}%`,
                    discountApplied: perpsTakerRate < hyperLiquidConfig_js_1.FEE_RATES.taker,
                    isHip3Asset,
                    hip3Multiplier,
                    cacheExpiry: new Date(rates.timestamp + rates.ttl).toISOString(),
                });
            }
        }
        catch (error) {
            // Silently fall back to base rates
            const safeError = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getFeeSchedule');
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Fee API Call Failed - Falling Back to Base Rates', {
                error: safeError.message,
                errorType: safeError.name,
                fallbackTakerRate: hyperLiquidConfig_js_1.FEE_RATES.taker,
                fallbackMakerRate: hyperLiquidConfig_js_1.FEE_RATES.maker,
                userAddress: 'unknown',
            });
        }
        const parsedAmount = amount ? parseFloat(amount) : 0;
        // Protocol base fee (HyperLiquid's fee)
        const protocolFeeRate = feeRate;
        let protocolFeeAmount;
        if (amount === undefined) {
            protocolFeeAmount = undefined;
        }
        else if (isNaN(parsedAmount)) {
            protocolFeeAmount = 0;
        }
        else {
            protocolFeeAmount = parsedAmount * protocolFeeRate;
        }
        // MetaMask builder fee (0.1% = 0.001) with optional reward discount
        let metamaskFeeRate = hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeDecimal;
        // Apply MetaMask reward discount if active
        if (__classPrivateFieldGet(this, _HyperLiquidProvider_userFeeDiscountBips, "f") !== undefined) {
            const discount = __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeDiscountBips, "f") / hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR; // Convert basis points to decimal
            metamaskFeeRate = hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeDecimal * (1 - discount);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid: Applied MetaMask fee discount', {
                originalRate: hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeDecimal,
                discountBips: __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeDiscountBips, "f"),
                discountPercentage: __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeDiscountBips, "f") / 100,
                adjustedRate: metamaskFeeRate,
                discountAmount: hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeDecimal * discount,
            });
        }
        const validAmountForMetamaskFee = isNaN(parsedAmount)
            ? 0
            : parsedAmount * metamaskFeeRate;
        const metamaskFeeAmount = amount === undefined ? undefined : validAmountForMetamaskFee;
        // Total fees
        const totalFeeRate = protocolFeeRate + metamaskFeeRate;
        const validAmountForTotalFee = isNaN(parsedAmount)
            ? 0
            : parsedAmount * totalFeeRate;
        const totalFeeAmount = amount === undefined ? undefined : validAmountForTotalFee;
        const result = {
            // Total fees
            feeRate: totalFeeRate,
            feeAmount: totalFeeAmount,
            // Protocol fees
            protocolFeeRate,
            protocolFeeAmount,
            // MetaMask fees
            metamaskFeeRate,
            metamaskFeeAmount,
        };
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Final Fee Calculation Result', {
            orderType,
            amount,
            fees: {
                protocolRate: `${(protocolFeeRate * 100).toFixed(4)}%`,
                metamaskRate: `${(metamaskFeeRate * 100).toFixed(4)}%`,
                totalRate: `${(totalFeeRate * 100).toFixed(4)}%`,
                totalAmount: totalFeeAmount,
            },
            usingFallbackRates: protocolFeeRate === hyperLiquidConfig_js_1.FEE_RATES.taker ||
                protocolFeeRate === hyperLiquidConfig_js_1.FEE_RATES.maker,
        });
        return result;
    }
    /**
     * Clear fee cache for a specific user or all users
     *
     * @param userAddress - Optional address to clear cache for
     */
    clearFeeCache(userAddress) {
        if (userAddress) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeCache, "f").delete(userAddress);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Cleared fee cache for user', { userAddress });
        }
        else {
            __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeCache, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Cleared all fee cache');
        }
    }
    /**
     * Escape hatch for agentic validation flows and test harnesses that drive
     * HL mutations directly. NOT part of the PerpsProvider interface.
     * Production code paths must go through the provider's own methods.
     *
     * @returns A promise resolving to the underlying HyperLiquid SDK
     * ExchangeClient. Promise shape matches the existing agentic flows
     * (hl-provision-fixture) that chain `.then` on the result.
     */
    async getExchangeClient() {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
    }
    /**
     * Disconnect provider
     *
     * @returns A promise that resolves to the result.
     */
    async disconnect() {
        try {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid: Disconnecting provider', {
                isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
                timestamp: new Date().toISOString(),
            });
            // Clear subscriptions through subscription service
            __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").clearAll();
            // Stop every chase loop: each holds a pending timer, and re-pricing after
            // a disconnect would sign orders against a client that is being torn down.
            // Orders already resting are deliberately left alone — disconnecting is
            // not a request to cancel the user's positions or orders.
            for (const sessionId of __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").keys()) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_stopChaseSession).call(this, sessionId);
            }
            __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidProvider_scaleOrderGroups, "f").clear();
            // Placements still mid-flight check this before registering.
            __classPrivateFieldSet(this, _HyperLiquidProvider_chaseGeneration, __classPrivateFieldGet(this, _HyperLiquidProvider_chaseGeneration, "f") + 1, "f");
            // Clear fee cache
            this.clearFeeCache();
            // Clear session caches (ensures fresh state on reconnect/account switch)
            __classPrivateFieldGet(this, _HyperLiquidProvider_referralCheckCache, "f").clear();
            __classPrivateFieldGet(this, _HyperLiquidProvider_builderFeeCheckCache, "f").clear();
            __classPrivateFieldSet(this, _HyperLiquidProvider_subscriptionBuilderApprovalEpoch, __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionBuilderApprovalEpoch, "f") + 1, "f");
            __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").clear();
            __classPrivateFieldSet(this, _HyperLiquidProvider_userFeeResolution, undefined, "f");
            __classPrivateFieldSet(this, _HyperLiquidProvider_userFeeDiscountBips, undefined, "f");
            // NOTE: UnifiedAccountCache is global and NOT cleared on disconnect
            // to prevent repeated signing requests across reconnections
            __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMetaByDex, "f").clear();
            __classPrivateFieldSet(this, _HyperLiquidProvider_cachedSpotMeta, null, "f");
            __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").reset();
            __classPrivateFieldSet(this, _HyperLiquidProvider_dexDiscoveryComplete, false, "f");
            // Await pending initialization before clearing to prevent the IIFE from
            // setting clientsInitialized = true after disconnect completes
            const pendingInit = __classPrivateFieldGet(this, _HyperLiquidProvider_initializationPromise, "f");
            const pendingReady = __classPrivateFieldGet(this, _HyperLiquidProvider_ensureReadyPromise, "f");
            const pendingTradingSetup = __classPrivateFieldGet(this, _HyperLiquidProvider_tradingSetupPromise, "f");
            // Clear references first to prevent new callers from reusing
            __classPrivateFieldSet(this, _HyperLiquidProvider_initializationPromise, null, "f");
            __classPrivateFieldSet(this, _HyperLiquidProvider_ensureReadyPromise, null, "f");
            __classPrivateFieldSet(this, _HyperLiquidProvider_tradingSetupPromise, null, "f");
            __classPrivateFieldSet(this, _HyperLiquidProvider_tradingSetupComplete, false, "f");
            __classPrivateFieldGet(this, _HyperLiquidProvider_pendingBuilderFeeApprovals, "f").clear();
            // Wait for pending operations to complete (ignore errors)
            // This prevents IIFEs from setting state after disconnect completes
            if (pendingInit) {
                try {
                    await pendingInit;
                }
                catch {
                    // Ignore - we're disconnecting anyway
                }
            }
            if (pendingReady) {
                try {
                    await pendingReady;
                }
                catch {
                    // Ignore - we're disconnecting anyway
                }
            }
            if (pendingTradingSetup) {
                try {
                    await pendingTradingSetup;
                }
                catch {
                    // Ignore - we're disconnecting anyway
                }
            }
            // Reset client initialization flag so wallet adapter will be recreated with new account
            // This fixes account synchronization issue where old account's address persists in wallet adapter
            __classPrivateFieldSet(this, _HyperLiquidProvider_clientsInitialized, false, "f");
            // Disconnect client service
            await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").disconnect();
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid: Provider fully disconnected', {
                timestamp: new Date().toISOString(),
            });
            return { success: true };
        }
        catch (error) {
            return (0, hyperLiquidValidation_js_1.createErrorResult)(error, { success: false });
        }
    }
    /**
     * Lightweight WebSocket health check using SDK's built-in ready() method
     * Checks if WebSocket connection is open without making expensive API calls
     *
     * @param timeoutMs - Optional timeout in milliseconds (defaults to WEBSOCKET_PING_TIMEOUT_MS)
     * @throws {Error} If WebSocket connection times out or fails
     */
    async ping(timeoutMs) {
        // Read-only operation: only need client initialization
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
        __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
        const subscriptionClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getSubscriptionClient();
        if (!subscriptionClient) {
            throw new Error('Subscription client not initialized');
        }
        const timeout = timeoutMs ?? perpsConfig_js_1.PERPS_CONSTANTS.WebsocketPingTimeoutMs;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`HyperLiquid: WebSocket health check ping starting (timeout: ${timeout}ms)`);
        const controller = new AbortController();
        let didTimeout = false;
        const timeoutId = setTimeout(() => {
            didTimeout = true;
            controller.abort();
        }, timeout);
        try {
            // Use SDK's built-in ready() method which checks socket.readyState === OPEN
            // This is much more efficient than creating a subscription just for health check
            await subscriptionClient.config_.transport.ready(controller.signal);
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid: WebSocket health check ping succeeded');
        }
        catch (error) {
            // Check if we timed out first
            if (didTimeout) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`HyperLiquid: WebSocket health check ping timed out after ${timeout}ms`);
                throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.CONNECTION_TIMEOUT);
            }
            // Otherwise throw the actual error
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquid: WebSocket health check ping failed', error);
            throw (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.ping');
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Get the current WebSocket connection state from the client service.
     * Used by the UI to monitor connection health and show notifications.
     *
     * @returns The current WebSocket connection state
     */
    getWebSocketConnectionState() {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getConnectionState();
    }
    /**
     * Subscribe to WebSocket connection state changes.
     * The listener will be called immediately with the current state and whenever the state changes.
     *
     * @param listener - Callback function that receives the new connection state and reconnection attempt
     * @returns Unsubscribe function to remove the listener
     */
    subscribeToConnectionState(listener) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").subscribeToConnectionState(listener);
    }
    /**
     * Manually trigger a WebSocket reconnection attempt.
     * Used by the UI retry button when connection is lost.
     *
     * @returns A promise that resolves when the operation completes.
     */
    async reconnect() {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").reconnect();
    }
    /**
     * Get list of available HIP-3 builder-deployed DEXs
     *
     * @param _params - Optional parameters (reserved for future filters/pagination)
     * @returns Array of DEX names (empty string '' represents main DEX)
     */
    async getAvailableDexs(_params) {
        try {
            // Read-only operation: only need client initialization
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
            __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
            const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
            const dexs = await infoClient.perpDexs();
            // Map DEX objects to names: null -> '' (main DEX), object -> object.name
            return dexs.map((dex) => (dex === null ? '' : dex.name));
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getAvailableDexs'), {
                context: {
                    name: 'HyperLiquidProvider.getAvailableDexs',
                    data: { action: 'fetch_available_dexs' },
                },
            });
            throw error;
        }
    }
    async fetchHistoricalCandles(options) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
        const result = await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").fetchHistoricalCandles(options);
        return (result ?? {
            symbol: options.symbol,
            interval: options.interval,
            candles: [],
        });
    }
    /**
     * Get block explorer URL for an address or just the base URL
     *
     * @param address - Optional address to append to the base URL
     * @returns Block explorer URL
     */
    getBlockExplorerUrl(address) {
        const network = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode() ? 'testnet' : 'mainnet';
        const baseUrl = network === 'testnet'
            ? 'https://app.hyperliquid-testnet.xyz'
            : 'https://app.hyperliquid.xyz';
        if (address) {
            return `${baseUrl}/explorer/address/${address}`;
        }
        return `${baseUrl}/explorer`;
    }
}
exports.HyperLiquidProvider = HyperLiquidProvider;
_HyperLiquidProvider_deps = new WeakMap(), _HyperLiquidProvider_clientService = new WeakMap(), _HyperLiquidProvider_walletService = new WeakMap(), _HyperLiquidProvider_subscriptionService = new WeakMap(), _HyperLiquidProvider_symbolToAssetId = new WeakMap(), _HyperLiquidProvider_userFeeCache = new WeakMap(), _HyperLiquidProvider_maxLeverageCache = new WeakMap(), _HyperLiquidProvider_cachedMetaByDex = new WeakMap(), _HyperLiquidProvider_cachedMarketDataWithPrices = new WeakMap(), _HyperLiquidProvider_cachedSpotMeta = new WeakMap(), _HyperLiquidProvider_dexDiscoveryCache = new WeakMap(), _HyperLiquidProvider_referralCheckCache = new WeakMap(), _HyperLiquidProvider_builderFeeCheckCache = new WeakMap(), _HyperLiquidProvider_ensureReadyPromise = new WeakMap(), _HyperLiquidProvider_pendingBuilderFeeApprovals = new WeakMap(), _HyperLiquidProvider_subscriptionBuilderApprovalEpoch = new WeakMap(), _HyperLiquidProvider_approvedBuilderAddresses = new WeakMap(), _HyperLiquidProvider_compiledAllowlistPatterns = new WeakMap(), _HyperLiquidProvider_compiledBlocklistPatterns = new WeakMap(), _HyperLiquidProvider_userFeeDiscountBips = new WeakMap(), _HyperLiquidProvider_userFeeResolution = new WeakMap(), _HyperLiquidProvider_hip3Enabled = new WeakMap(), _HyperLiquidProvider_allowlistMarkets = new WeakMap(), _HyperLiquidProvider_blocklistMarkets = new WeakMap(), _HyperLiquidProvider_useUnifiedAccount = new WeakMap(), _HyperLiquidProvider_dexDiscoveryComplete = new WeakMap(), _HyperLiquidProvider_unifiedAccountSetupNeedsRetry = new WeakMap(), _HyperLiquidProvider_pendingValidatedDexsPromise = new WeakMap(), _HyperLiquidProvider_cachedUsdcTokenId = new WeakMap(), _HyperLiquidProvider_errorMappings = new WeakMap(), _HyperLiquidProvider_scaleOrderGroups = new WeakMap(), _HyperLiquidProvider_chaseSessions = new WeakMap(), _HyperLiquidProvider_chasePlacementsInFlight = new WeakMap(), _HyperLiquidProvider_chaseGeneration = new WeakMap(), _HyperLiquidProvider_clientsInitialized = new WeakMap(), _HyperLiquidProvider_initializationPromise = new WeakMap(), _HyperLiquidProvider_messenger = new WeakMap(), _HyperLiquidProvider_builderAddressTestnet = new WeakMap(), _HyperLiquidProvider_builderAddressMainnet = new WeakMap(), _HyperLiquidProvider_subscriptionBuilderAddressTestnet = new WeakMap(), _HyperLiquidProvider_subscriptionBuilderAddressMainnet = new WeakMap(), _HyperLiquidProvider_priceDeviationLimit = new WeakMap(), _HyperLiquidProvider_tradingSetupPromise = new WeakMap(), _HyperLiquidProvider_tradingSetupComplete = new WeakMap(), _HyperLiquidProvider_instances = new WeakSet(), _HyperLiquidProvider_compilePatternsSafely = function _HyperLiquidProvider_compilePatternsSafely(patterns, listName) {
    const compiled = [];
    for (const pattern of patterns) {
        try {
            compiled.push({ pattern, matcher: (0, marketUtils_js_1.compileMarketPattern)(pattern) });
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, `HyperLiquidProvider.compilePatternsSafely`), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'compilePatternsSafely', { listName, pattern }));
        }
    }
    return compiled;
}, _HyperLiquidProvider_ensureClientsInitialized = 
/**
 * Initialize HyperLiquid SDK clients (lazy initialization)
 *
 * This is called on first API operation to ensure Engine.context is ready.
 * Creating the wallet adapter requires accessing Engine.context.AccountTreeController,
 * which may not be available during early app initialization.
 *
 * IMPORTANT: This method awaits the WebSocket transport.ready() to ensure
 * the connection is fully established before marking initialization complete.
 */
async function _HyperLiquidProvider_ensureClientsInitialized() {
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_clientsInitialized, "f")) {
        return; // Already initialized
    }
    // Reuse existing initialization promise if one is in progress
    // This prevents race conditions when multiple methods call concurrently
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_initializationPromise, "f")) {
        await __classPrivateFieldGet(this, _HyperLiquidProvider_initializationPromise, "f");
        return;
    }
    // Create and cache the initialization promise
    __classPrivateFieldSet(this, _HyperLiquidProvider_initializationPromise, (async () => {
        // Double-check after acquiring the "lock"
        if (__classPrivateFieldGet(this, _HyperLiquidProvider_clientsInitialized, "f")) {
            return;
        }
        const wallet = __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").createWalletAdapter();
        await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").initialize(wallet);
        // Set termination callback for logging when WebSocket terminates
        // Note: Do NOT restore subscriptions here - termination means connection failed permanently
        __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").setOnTerminateCallback((error) => {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[HyperLiquidProvider] WebSocket terminated', {
                error: error.message,
            });
        });
        // Set reconnection callback to restore subscriptions after successful reconnection
        // This is called in handleConnectionDrop() after the WebSocket reconnects successfully
        __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").setOnReconnectCallback(async () => {
            try {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[HyperLiquidProvider] WebSocket reconnected, restoring subscriptions');
                await __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").restoreSubscriptions();
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").streamManager.clearAllChannels();
            }
            catch (restoreError) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[HyperLiquidProvider] Failed to restore subscriptions', restoreError);
            }
        });
        // Only set flag AFTER successful initialization
        __classPrivateFieldSet(this, _HyperLiquidProvider_clientsInitialized, true, "f");
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[HyperLiquidProvider] Clients initialized lazily');
    })(), "f");
    try {
        await __classPrivateFieldGet(this, _HyperLiquidProvider_initializationPromise, "f");
    }
    finally {
        // Clear promise after completion (success or failure)
        // so future calls can retry if needed
        __classPrivateFieldSet(this, _HyperLiquidProvider_initializationPromise, null, "f");
    }
}, _HyperLiquidProvider_isWalletOnHyperliquid = 
/**
 * Decide whether the wallet has a Hyperliquid account.
 *
 * Hyperliquid accounts are created server-side on first USDC deposit.
 * Before that, every user-scoped exchange write rejects with
 * "User or API Wallet 0x... does not exist." — formerly the top source
 * of `feature:perps` Sentry events (Sentry issues METAMASK-MOBILE-4XB5
 * iOS / 4Q4M Android: ~530k events / ~100k users in 14d on 7.75.1).
 *
 * Probes `infoClient.userNonFundingLedgerUpdates` and caches a positive
 * result in `PerpsSigningCache.walletRegistered`. Negative results are NOT
 * cached — the wallet may deposit between checks; the next entry must
 * re-probe. The probe is cheap (~100ms), non-throwing, and returns the
 * full deposit/withdraw history. A non-empty array means the wallet has
 * interacted with Hyperliquid at least once — necessary and sufficient
 * for `agentSetAbstraction` / `userSetAbstraction` / `setReferrer` to
 * succeed.
 *
 * If the probe itself throws (transient network), returns `true` and does
 * not cache — fail open so one bad probe never traps a real Hyperliquid
 * user in the deferred state.
 *
 * @param userAddress - The wallet address to check.
 * @param network - The network environment (mainnet | testnet).
 * @returns True if the wallet has been observed on Hyperliquid OR if
 * the probe was inconclusive (fail open). False only when the probe
 * succeeded AND returned an empty ledger.
 * @private
 */
async function _HyperLiquidProvider_isWalletOnHyperliquid(userAddress, network) {
    const cached = TradingReadinessCache_js_1.PerpsSigningCache.getWalletRegistered(network, userAddress);
    if (cached?.registered) {
        return true;
    }
    try {
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
        const ledger = await infoClient.userNonFundingLedgerUpdates({
            user: userAddress,
            startTime: 0,
        });
        const registered = Array.isArray(ledger) && ledger.length > 0;
        if (registered) {
            TradingReadinessCache_js_1.PerpsSigningCache.setWalletRegistered(network, userAddress, true);
        }
        return registered;
    }
    catch (error) {
        // Fail open. A transient probe failure must never prevent a
        // legitimate Hyperliquid user from completing migration / referral
        // setup. The next entry will re-probe.
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[isWalletOnHyperliquid] Probe failed, assuming registered', {
            network,
            user: userAddress,
            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.isWalletOnHyperliquid')
                .message,
        });
        return true;
    }
}, _HyperLiquidProvider_isHyperliquidMultiSigAccount = 
/**
 * Decide whether the Hyperliquid account is a multi-sig account.
 *
 * Hyperliquid rejects every single-signer exchange write for a converted
 * multi-sig account with `ApiRequestError: Multi-sig required`, so the
 * unified-account migration must not be attempted for those accounts.
 *
 * If the probe throws (transient network), returns `false` — fail open so
 * one bad probe never blocks migration for a normal single-signer account.
 * The `isHyperLiquidMultiSigRequiredError` fallback in the write's catch
 * block remains the safety net.
 *
 * @param userAddress - The wallet address to check.
 * @returns True only when Hyperliquid reports a multi-sig signer set.
 * @private
 */
async function _HyperLiquidProvider_isHyperliquidMultiSigAccount(userAddress) {
    try {
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
        const signers = await infoClient.userToMultiSigSigners({
            user: userAddress,
        });
        return signers !== null && signers !== undefined;
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[isHyperliquidMultiSigAccount] Probe failed, assuming single-signer', {
            user: userAddress,
            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.isHyperliquidMultiSigAccount').message,
        });
        return false;
    }
}, _HyperLiquidProvider_ensureUnifiedAccountEnabled = 
/**
 * Attempt to enable HyperLiquid Unified Account mode for HIP-3 orders
 *
 * If successful, HyperLiquid automatically manages collateral transfers for HIP-3 orders.
 * If not supported, disables the flag to trigger programmatic transfer fallback.
 *
 * IMPORTANT: Uses global singleton cache to prevent repeated signing requests
 * across provider reconnections (critical for hardware wallets).
 *
 * @param options - Optional configuration.
 * @param options.allowUserSigning - When true, runs the EIP-712 user-signed migration for `dexAbstraction` accounts. Defaults to false so init does not surface a signing prompt; action-time entry points (trading, withdraw) pass true.
 * @private
 */
async function _HyperLiquidProvider_ensureUnifiedAccountEnabled(options) {
    // dexAbstraction → unifiedAccount requires an EIP-712 prompt (HL blocks
    // the agent path for that transition). Init calls with allowUserSigning=false so
    // viewing the Perps section never surfaces a signing dialog. Trading and
    // withdraw entry points pass allowUserSigning=true to drive the migration when
    // the user actually intends to act.
    const allowUserSigning = options?.allowUserSigning ?? false;
    // Optimistic reset — set true below only at the failure points that
    // warrant retry (silent agent failure, REST lookup failure, keyring
    // locked). Final-state outcomes (success, prompted-failure cached,
    // already-on-compatible, defer, unknown mode, feature off) leave it
    // false so #ensureReady can keep the memoized promise.
    __classPrivateFieldSet(this, _HyperLiquidProvider_unifiedAccountSetupNeedsRetry, false, "f");
    if (!__classPrivateFieldGet(this, _HyperLiquidProvider_useUnifiedAccount, "f")) {
        return; // Feature disabled
    }
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
    const network = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode() ? 'testnet' : 'mainnet';
    // Check global cache first to avoid repeated signing requests
    // This is CRITICAL for hardware wallets to prevent repeated signing prompts
    // while browsing.
    const cachedStatus = TradingReadinessCache_js_1.TradingReadinessCache.get(network, userAddress);
    if (cachedStatus?.attempted) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Unified Account setup already attempted (from global cache)', {
            user: userAddress,
            network,
            enabled: cachedStatus.enabled,
            note: 'Skipping to prevent repeated signing requests',
        });
        return;
    }
    // Check if another provider instance is currently attempting this operation
    // This prevents concurrent signing attempts across providers during reconnection
    const inFlightPromise = TradingReadinessCache_js_1.PerpsSigningCache.isInFlight('unifiedAccount', network, userAddress);
    if (inFlightPromise) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Unified Account setup in-flight, waiting...', { network, userAddress });
        await inFlightPromise;
        // The other instance may have finished without writing the cache (e.g.
        // an init-time call deferred a dexAbstraction migration). If the cache
        // is still empty and we are an action-time caller (allowUserSigning=true),
        // we must run our own attempt — otherwise the trade/withdraw would
        // proceed in the deprecated mode.
        const postWaitCache = TradingReadinessCache_js_1.TradingReadinessCache.get(network, userAddress);
        if (postWaitCache?.attempted) {
            return;
        }
        // Fall through to acquire our own lock and retry.
    }
    // Set in-flight lock to prevent concurrent attempts
    const completeInFlight = TradingReadinessCache_js_1.PerpsSigningCache.setInFlight('unifiedAccount', network, userAddress);
    let currentMode;
    try {
        // Re-check cache after acquiring lock (another provider might have finished)
        const recheckCache = TradingReadinessCache_js_1.TradingReadinessCache.get(network, userAddress);
        if (recheckCache?.attempted) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Unified Account setup completed by another provider', { network, userAddress });
            completeInFlight();
            return;
        }
        // Skip the migration entirely for wallets that have no Hyperliquid
        // account yet. HL creates accounts server-side on first USDC deposit;
        // before that, both `agentSetAbstraction` and `userSetAbstraction`
        // reject with "User or API Wallet 0x... does not exist." — formerly
        // the top source of `feature:perps` Sentry events on 7.75.1.
        // The probe is cheap, non-throwing, and cached.
        const isRegistered = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isWalletOnHyperliquid).call(this, userAddress, network);
        if (!isRegistered) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureUnifiedAccountEnabled] Wallet not yet on Hyperliquid, deferring migration', { user: userAddress, network });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.AccountSetup, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.NOT_APPLICABLE,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: 'no_hl_account',
            });
            // Signal #ensureReady to drop its memoized promise so the next entry
            // re-probes. Without this, the resolved promise would be reused and
            // the wallet would stay permanently deferred until reconnect.
            __classPrivateFieldSet(this, _HyperLiquidProvider_unifiedAccountSetupNeedsRetry, true, "f");
            completeInFlight();
            return;
        }
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
        // Check current abstraction mode on-chain
        currentMode = await infoClient.userAbstraction({
            user: userAddress,
        });
        if (currentMode === 'unifiedAccount' ||
            currentMode === 'portfolioMargin') {
            // portfolioMargin is a superset of unifiedAccount — it already supports
            // auto-collateral management for HIP-3 orders and is more capital-efficient.
            // Downgrading portfolio margin users to unifiedAccount would be harmful,
            // so we treat both modes as already-enabled and skip migration.
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Account already in a compatible mode, skipping migration', { user: userAddress, network, mode: currentMode });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.AccountSetup, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ABSTRACTION_MODE]: currentMode,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.ALREADY_ENABLED,
            });
            TradingReadinessCache_js_1.TradingReadinessCache.set(network, userAddress, {
                attempted: true,
                enabled: true,
            });
            // Record the resolved mode in the subscription service so the next
            // aggregation folds spot correctly without waiting for #refreshSpotState.
            __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").setUserAbstractionMode(userAddress, currentMode);
            completeInFlight();
            return;
        }
        // Defer signing-backed transitions until the user attempts an action.
        // Cache is intentionally left untouched so the next entry re-evaluates;
        // the read-only userAbstraction call is cheap and gated by the in-flight
        // lock, preventing concurrent prompts.
        if ((0, hyperLiquidAbstraction_js_1.shouldDeferUnifiedAccountSetup)(currentMode, allowUserSigning)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Deferring unified account migration to action time', { user: userAddress, network, mode: currentMode });
            completeInFlight();
            return;
        }
        // Bail on unknown modes BEFORE firing analytics or attempting dispatch.
        // Keeps `migration_required` actionable (only fires for modes we can
        // actually migrate) and avoids re-emitting on every reconnection.
        if (currentMode !== 'dexAbstraction' &&
            currentMode !== 'default' &&
            currentMode !== 'disabled') {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Unknown abstraction mode, skipping Unified Account migration', { user: userAddress, network, mode: currentMode });
            completeInFlight();
            return;
        }
        // Hyperliquid rejects every single-signer exchange write for a converted
        // multi-sig account with "ApiRequestError: Multi-sig required", which
        // surfaced on the Perps tab on every entry (TAT-3214). Probe right
        // before the write so accounts that never reach one (already compatible,
        // deferred, unknown mode) do not pay the extra round trip.
        const isMultiSig = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isHyperliquidMultiSigAccount).call(this, userAddress);
        if (isMultiSig) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureUnifiedAccountEnabled] Multi-sig account, skipping unified account migration', { user: userAddress, network, mode: currentMode });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.AccountSetup, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.PREVIOUS_ABSTRACTION_MODE]: currentMode,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.NOT_APPLICABLE,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: 'multi_sig_account',
            });
            // Final state: the write can never succeed for this account, so cache
            // it as attempted with unified mode off. Perps keeps working through
            // the programmatic collateral-transfer fallback.
            TradingReadinessCache_js_1.TradingReadinessCache.set(network, userAddress, {
                attempted: true,
                enabled: false,
            });
            completeInFlight();
            return;
        }
        // Track which mode users are currently on before we attempt migration.
        // This tells us the distribution of legacy modes across our user base.
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.AccountSetup, {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ABSTRACTION_MODE]: currentMode,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.MIGRATION_REQUIRED,
        });
        // Enable Unified Account mode.
        // - default / disabled: agent wallet can do this silently (no prompt)
        // - dexAbstraction: HL blocks the agent transition — requires the user's main
        //   wallet to sign an EIP-712 action via userSetAbstraction (one-time prompt)
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Enabling Unified Account mode', {
            user: userAddress,
            network,
            previousMode: currentMode,
            note: 'HyperLiquid will auto-manage collateral for HIP-3 orders',
        });
        const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
        if (currentMode === 'dexAbstraction') {
            // Requires EIP-712 signature from the user's main wallet (one-time migration).
            // HL blocks the dexAbstraction → unifiedAccount transition via the agent wallet,
            // so userSetAbstraction (user-signed) is the only path for legacy users.
            await exchangeClient.userSetAbstraction({
                user: userAddress,
                abstraction: hyperliquid_types_js_1.HL_UNIFIED_ACCOUNT_MODE,
            });
        }
        else {
            // default / disabled — silent agent transition, no user prompt
            await exchangeClient.agentSetAbstraction({
                abstraction: hyperliquid_types_js_1.HL_ABSTRACTION_WIRE.unifiedAccount,
            });
        }
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('✅ HyperLiquidProvider: Unified Account enabled successfully');
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.AccountSetup, {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.PREVIOUS_ABSTRACTION_MODE]: currentMode,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ABSTRACTION_MODE]: hyperliquid_types_js_1.HL_UNIFIED_ACCOUNT_MODE,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.SUCCESS,
        });
        TradingReadinessCache_js_1.TradingReadinessCache.set(network, userAddress, {
            attempted: true,
            enabled: true,
        });
        // Record the post-migration mode in the subscription service so it
        // immediately re-aggregates with fold=true and surfaces the unified
        // balance rather than waiting for the next #refreshSpotState.
        __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").setUserAbstractionMode(userAddress, hyperliquid_types_js_1.HL_UNIFIED_ACCOUNT_MODE);
        completeInFlight();
    }
    catch (error) {
        // HyperLiquid wraps wallet signing failures and preserves KEYRING_LOCKED
        // in `cause`, so classify the full chain and leave retry caches empty.
        if ((0, errorUtils_js_1.isKeyringLockedError)(error)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureUnifiedAccountEnabled] Keyring locked, will retry later');
            __classPrivateFieldSet(this, _HyperLiquidProvider_unifiedAccountSetupNeedsRetry, true, "f");
            completeInFlight();
            return;
        }
        // Safety net: a Hyperliquid "user does not exist" rejection slipped
        // past the proactive probe (race with deposit confirmation, transient
        // probe failure that failed open, ...). Treat as benign — do NOT
        // forward to Sentry. The walletRegistered cache stores positive
        // observations only, so no demotion is needed; the next entry will
        // re-probe.
        if ((0, errorUtils_js_1.isHyperLiquidUserNotFoundError)(error)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureUnifiedAccountEnabled] Wallet not on Hyperliquid (race/stale-cache), deferring migration', { user: userAddress, network, currentMode });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.AccountSetup, {
                ...(currentMode && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.PREVIOUS_ABSTRACTION_MODE]: currentMode,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ABSTRACTION_MODE]: hyperliquid_types_js_1.HL_UNIFIED_ACCOUNT_MODE,
                }),
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.NOT_APPLICABLE,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: 'no_hl_account',
            });
            __classPrivateFieldSet(this, _HyperLiquidProvider_unifiedAccountSetupNeedsRetry, true, "f");
            completeInFlight();
            return;
        }
        // Safety net for the multi-sig probe: the account can be converted
        // between the lookup and the write, and the probe fails open on
        // transient info-API errors. Either way the rejection is a permanent
        // account-shape condition, not a failure worth reporting or retrying.
        if ((0, errorUtils_js_1.isHyperLiquidMultiSigRequiredError)(error)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureUnifiedAccountEnabled] Multi-sig account (race/probe fallback), skipping unified account migration', { user: userAddress, network, mode: currentMode });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.AccountSetup, {
                ...(currentMode && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.PREVIOUS_ABSTRACTION_MODE]: currentMode,
                }),
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.NOT_APPLICABLE,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: 'multi_sig_account',
            });
            TradingReadinessCache_js_1.TradingReadinessCache.set(network, userAddress, {
                attempted: true,
                enabled: false,
            });
            completeInFlight();
            return;
        }
        // Cache failure ONLY for the user-prompted path
        // (`dexAbstraction → unifiedAccount` via `userSetAbstraction`). The
        // rationale for caching is "don't re-prompt a user who already saw the
        // signature dialog and rejected it" — that doesn't apply to:
        //   - Read-only userAbstraction lookup failures (no prompt; transient).
        //   - Silent agent-key paths (`default`/`disabled` → `agentSetAbstraction`
        //     does not show a UI prompt; failures are typically transient HL
        //     outages and pinning them would leave users stuck in the
        //     deprecated mode for the rest of the session).
        // Action-time retries pick up the unmigrated state and try again.
        if (currentMode === 'dexAbstraction') {
            TradingReadinessCache_js_1.TradingReadinessCache.set(network, userAddress, {
                attempted: true,
                enabled: false,
            });
        }
        else {
            // Silent agent-key failure (default/disabled) or read-only
            // userAbstraction lookup failure — neither is a final state, so
            // signal #ensureReady to drop its memoized promise and retry on
            // the next entry instead of pinning the user in the deprecated
            // mode for the provider's lifetime.
            __classPrivateFieldSet(this, _HyperLiquidProvider_unifiedAccountSetupNeedsRetry, true, "f");
        }
        const errorMessage = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.ensureUnifiedAccountEnabled').message;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Unified Account setup failed', {
            user: userAddress,
            network,
            error: errorMessage,
            // Cache writes only happen on the user-prompted dexAbstraction
            // path (see P2-B logic above). Reflect that here so retry
            // behaviour is debuggable from the log alone.
            cached: currentMode === 'dexAbstraction',
        });
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.AccountSetup, {
            ...(currentMode && {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.PREVIOUS_ABSTRACTION_MODE]: currentMode,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ABSTRACTION_MODE]: hyperliquid_types_js_1.HL_UNIFIED_ACCOUNT_MODE,
            }),
            [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
        });
        completeInFlight();
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.ensureUnifiedAccountEnabled'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'ensureUnifiedAccountEnabled', {
            note: 'Could not enable Unified Account (user rejected, or network error)',
        }));
    }
}, _HyperLiquidProvider_ensureReady = 
/**
 * Ensure clients are initialized and asset mapping is loaded
 * Asset mapping is built once on first call and reused for the provider's lifetime
 * since HIP-3 configuration is immutable after construction
 */
async function _HyperLiquidProvider_ensureReady() {
    // If already initializing or completed, wait for/return that promise
    // This prevents duplicate initialization flows when multiple methods called concurrently
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_ensureReadyPromise, "f")) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReady] Reusing existing initialization promise');
        await __classPrivateFieldGet(this, _HyperLiquidProvider_ensureReadyPromise, "f");
        return;
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReady] Starting new initialization');
    // Create and track initialization promise
    __classPrivateFieldSet(this, _HyperLiquidProvider_ensureReadyPromise, (async () => {
        // Lazy initialization: ensure clients are created (safe after Engine.context is ready)
        // This awaits WebSocket transport.ready() to ensure connection is established
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
        // Verify clients are properly initialized
        __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
        // Build asset mapping on first call, or retry if DEX discovery previously failed
        if (__classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").size === 0 || !__classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryComplete, "f")) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Building asset mapping', {
                hip3Enabled: __classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f"),
                allowlistMarkets: __classPrivateFieldGet(this, _HyperLiquidProvider_allowlistMarkets, "f"),
                blocklistMarkets: __classPrivateFieldGet(this, _HyperLiquidProvider_blocklistMarkets, "f"),
            });
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_buildAssetMapping).call(this);
        }
        // Attempt Unified Account migration as early as possible so users aren't
        // blocked when they try to trade. Software wallets can complete the
        // signing-backed migration during initial setup so the first trade sees
        // the unified balance. Hardware wallets remain deferred to action time to
        // avoid repeated signing prompts while browsing.
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureUnifiedAccountEnabled).call(this, {
            allowUserSigning: !__classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").isSelectedHardwareWallet(),
        });
    })(), "f");
    // Await initialization - keep the promise so subsequent calls resolve immediately
    // The promise is only reset in disconnect() for clean reconnection,
    // or when DEX discovery was degraded so the next caller retries.
    await __classPrivateFieldGet(this, _HyperLiquidProvider_ensureReadyPromise, "f");
    if (!__classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryComplete, "f")) {
        // DEX discovery failed transiently — reset so next call retries.
        // Trading still works (main DEX mapping is populated), but HIP-3 markets
        // will be re-discovered on the next #ensureReady() call.
        __classPrivateFieldSet(this, _HyperLiquidProvider_ensureReadyPromise, null, "f");
    }
    else if (__classPrivateFieldGet(this, _HyperLiquidProvider_unifiedAccountSetupNeedsRetry, "f")) {
        // Silent migration / lookup / keyring-locked failure left the cache
        // empty. Without resetting the memoized promise, subsequent
        // #ensureReady calls would skip retry and the user would be stuck
        // in the deprecated mode for the provider's lifetime.
        __classPrivateFieldSet(this, _HyperLiquidProvider_ensureReadyPromise, null, "f");
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReady] Initialization complete');
}, _HyperLiquidProvider_ensureReadyForTrading = async function _HyperLiquidProvider_ensureReadyForTrading() {
    // First ensure basic initialization is complete
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
    // dexAbstraction users were deferred during init to avoid an EIP-712 prompt
    // on Perps section open. Drive the migration here, gated by its own cache so
    // already-migrated or already-rejected users are not re-prompted.
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureUnifiedAccountEnabled).call(this, { allowUserSigning: true });
    // If trading setup already complete, only retry builder fee if it previously failed
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_tradingSetupComplete, "f")) {
        const isTestnet = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode();
        const network = isTestnet ? 'testnet' : 'mainnet';
        const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
        const cacheKey = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCacheKey).call(this, network, userAddress);
        if (!__classPrivateFieldGet(this, _HyperLiquidProvider_builderFeeCheckCache, "f").has(cacheKey)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReadyForTrading] Retrying builder fee approval (previous attempt failed)');
            try {
                await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureBuilderFeeApproval).call(this);
            }
            catch (error) {
                // Don't throw - retry is best-effort, trading continues regardless
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReadyForTrading] Builder fee retry failed', error);
            }
        }
        return;
    }
    // If trading setup is in progress, wait for it
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_tradingSetupPromise, "f")) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReadyForTrading] Waiting for in-progress trading setup');
        await __classPrivateFieldGet(this, _HyperLiquidProvider_tradingSetupPromise, "f");
        return;
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReadyForTrading] Starting trading setup (may require signatures)');
    __classPrivateFieldSet(this, _HyperLiquidProvider_tradingSetupPromise, (async () => {
        // Pre-fetch spotMeta for HIP-3 operations (non-blocking if it fails)
        // This ensures token info (e.g. USDC token index) is available during order placement
        if (__classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f")) {
            try {
                await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedSpotMeta).call(this);
            }
            catch (error) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReadyForTrading] spotMeta pre-fetch failed, will retry when needed', error);
                // Don't throw - spotMeta will be fetched on-demand if needed
            }
        }
        // Set up builder fee approval
        try {
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureBuilderFeeApproval).call(this);
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Builder fee approval failed', error);
            // Don't throw - let trading continue, will fail with clear error if needed
        }
        // Set up referral code
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReferralSet).call(this);
        // Only mark complete if keyring was unlocked (signing could actually happen)
        if (__classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").isKeyringUnlocked()) {
            __classPrivateFieldSet(this, _HyperLiquidProvider_tradingSetupComplete, true, "f");
        }
    })(), "f");
    try {
        await __classPrivateFieldGet(this, _HyperLiquidProvider_tradingSetupPromise, "f");
    }
    finally {
        __classPrivateFieldSet(this, _HyperLiquidProvider_tradingSetupPromise, null, "f");
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReadyForTrading] Trading setup complete');
}, _HyperLiquidProvider_getOrFetchPrice = 
/**
 * Get current price for a symbol using WebSocket cache first, REST API fallback
 * Centralizes the price fetching pattern used across multiple methods
 *
 * @param params - Parameters for fetching price
 * @param params.symbol - The symbol to get price for
 * @param params.dexName - Optional DEX name for REST API fallback
 * @returns The current price as a number
 * @throws Error if no price is available
 */
async function _HyperLiquidProvider_getOrFetchPrice(params) {
    const { symbol, dexName } = params;
    // OPTIMIZATION: Use WebSocket price cache first (0 weight), fall back to REST (2 weight)
    const cachedPrice = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getCachedPrice(symbol);
    if (cachedPrice) {
        const price = parseFloat(cachedPrice);
        // Validate cached price: must be positive and finite
        // Covers zero, negative, NaN, and Infinity in one check
        if (price <= 0 || !isFinite(price)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('WebSocket cached price invalid for getOrFetchPrice, falling back to REST', { symbol, cachedPrice, parsedPrice: price });
            // Fall through to REST API fallback
        }
        else {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using WebSocket cached price', {
                symbol,
                price,
            });
            return price;
        }
    }
    // Fallback to REST API if cache miss
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Price cache miss for getOrFetchPrice, falling back to REST allMids', { symbol });
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient({ useHttp: true });
    const mids = await infoClient.allMids(dexName ? { dex: dexName } : undefined);
    const price = parseFloat(mids[symbol] || '0');
    // Validate REST price: must be positive and finite
    if (price <= 0 || !isFinite(price)) {
        throw new Error(`Invalid price for ${symbol}: ${price}`);
    }
    return price;
}, _HyperLiquidProvider_filterFills = function _HyperLiquidProvider_filterFills(fills, params) {
    if (!params) {
        return fills;
    }
    return fills.filter((fill) => {
        if (params.startTime && fill.timestamp < params.startTime) {
            return false;
        }
        if (params.symbol && fill.symbol !== params.symbol) {
            return false;
        }
        return true;
    });
}, _HyperLiquidProvider_getAllAvailableDexs = 
/**
 * Get all available DEXs without allowlist filtering
 * Used when skipFilters=true in getMarkets()
 *
 * @returns Array of all DEX names (null for main DEX, strings for HIP-3 DEXs)
 */
async function _HyperLiquidProvider_getAllAvailableDexs() {
    // Use unified state if available
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state) {
        const availableHip3Dexs = [];
        __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state.raw.forEach((dex) => {
            if (dex !== null) {
                availableHip3Dexs.push(dex.name);
            }
        });
        return [null, ...availableHip3Dexs];
    }
    // Fetch fresh from API and update unified state
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
    try {
        const allDexs = await infoClient.perpDexs();
        if (!allDexs || !Array.isArray(allDexs)) {
            return [null]; // Fallback to main DEX only
        }
        const state = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").update(allDexs);
        const availableHip3Dexs = [];
        state.raw.forEach((dex) => {
            if (dex !== null) {
                availableHip3Dexs.push(dex.name);
            }
        });
        return [null, ...availableHip3Dexs];
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getAllAvailableDexs'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getAllAvailableDexs'));
        return [null]; // Fallback to main DEX only
    }
}, _HyperLiquidProvider_getValidatedDexs = 
/**
 * Get validated list of DEXs to use based on feature flags and allowlist
 * Implements Step 3b from HIP-3-IMPLEMENTATION.md (lines 108-134)
 *
 * Logic Flow:
 * 1. If hip3Enabled === false → Return [null] (main DEX only)
 * 2. Fetch available DEXs via SDK: infoClient.perpDexs()
 * 3. If enabledDexs is empty [] → Return [null, ...allDiscoveredDexs] (auto-discover)
 * 4. Else filter enabledDexs against available DEXs → Return [null, ...validatedDexs] (allowlist)
 *
 * Invalid DEX names are silently filtered with debugLogger warning.
 *
 * @returns Array of DEX names to use (null = main DEX, strings = HIP-3 DEXs)
 */
async function _HyperLiquidProvider_getValidatedDexs() {
    // Kill switch: HIP-3 disabled, return main DEX only
    // Must check before cache — #getAllAvailableDexs() can populate
    // state.validated without the hip3Enabled gate
    if (!__classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f")) {
        return [null];
    }
    // Return cached result if available
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state?.validated) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state.validated;
    }
    // If a fetch is already in progress, reuse the pending promise
    // This prevents duplicate perpDexs() API calls from concurrent callers
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_pendingValidatedDexsPromise, "f") !== null) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getValidatedDexs] Reusing pending promise for perpDexs fetch');
        return __classPrivateFieldGet(this, _HyperLiquidProvider_pendingValidatedDexsPromise, "f");
    }
    // Create and cache the pending promise for deduplication
    __classPrivateFieldSet(this, _HyperLiquidProvider_pendingValidatedDexsPromise, __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchValidatedDexsInternal).call(this), "f");
    try {
        const result = await __classPrivateFieldGet(this, _HyperLiquidProvider_pendingValidatedDexsPromise, "f");
        return result;
    }
    finally {
        // Clear the pending promise when done (success or error)
        __classPrivateFieldSet(this, _HyperLiquidProvider_pendingValidatedDexsPromise, null, "f");
    }
}, _HyperLiquidProvider_fetchValidatedDexsInternal = 
/**
 * Internal method that performs the actual perpDexs fetch and caching
 * Separated from getValidatedDexs to enable promise deduplication
 *
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_fetchValidatedDexsInternal() {
    // Kill switch: HIP-3 disabled, return main DEX only
    if (!__classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f")) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: HIP-3 disabled via hip3Enabled flag');
        const state = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").update([null]);
        return state.validated;
    }
    // Fetch all available DEXs from HyperLiquid
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
    let allDexs;
    try {
        allDexs = await infoClient.perpDexs();
    }
    catch (error) {
        // debugLogger not logger.error: this is a handled transient failure — the app
        // recovers to main DEX via return [null]. Sending to Sentry as error() is noise.
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[fetchValidatedDexsInternal] perpDexs() call failed, falling back to main DEX', {
            error: String(error),
            ...__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'getValidatedDexs.perpDexs'),
        });
        // Do not cache — transient error, allow retry on next call
        return [null];
    }
    // Validate API response
    if (!allDexs || !Array.isArray(allDexs)) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Failed to fetch DEX list (invalid response), falling back to main DEX only', { allDexs });
        // Do not cache — may be transient, allow retry on next call
        return [null];
    }
    // Atomically update unified state (raw + validated + timestamp)
    const state = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").update(allDexs);
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Available DEXs (market filtering applied at data layer)', {
        count: state.validated.filter((dex) => dex !== null).length,
        dexNames: state.validated.filter((dex) => dex !== null),
    });
    return state.validated;
}, _HyperLiquidProvider_getCachedMeta = 
/**
 * Get cached meta response for a DEX, fetching from API if not cached
 * This helper consolidates cache logic to avoid redundant API calls across the provider
 *
 * @param params - The operation parameters.
 * @param params.dexName - DEX name (null for main DEX).
 * @param params.skipCache - If true, bypass cache and fetch fresh data.
 * @returns MetaResponse with universe data.
 * @throws Error if API returns invalid data
 */
async function _HyperLiquidProvider_getCachedMeta(params) {
    const { dexName, skipCache } = params;
    // Use empty string for main DEX key (consistent with buildAssetMapping cache population)
    const dexKey = dexName ?? '';
    const dexDisplayName = dexKey || 'main';
    // Skip cache if requested (forces fresh fetch)
    if (!skipCache) {
        const cached = __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMetaByDex, "f").get(dexKey);
        if (cached) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getCachedMeta] Using cached meta response', {
                dex: dexDisplayName,
                universeSize: cached.universe.length,
            });
            return cached;
        }
    }
    // Cache miss or skipCache=true - fetch from API.
    // Bring the SDK clients up first. This is the first client touch on the
    // write path — placeOrder resolves asset info before it ensures trading
    // readiness — so without it a cold start or a post-disconnect action fails
    // with CLIENT_NOT_INITIALIZED instead of waiting for the clients it needs.
    // Idempotent, and a warm cache hit returns above without reaching here.
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
    // Metadata is request/response data, so keep this path available while a
    // failed WebSocket reconnect is retrying.
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient({ useHttp: true });
    // Pass dex only for HIP-3 DEXs; omit for main DEX (empty string).
    // Testnet API returns null when dex="" is explicitly sent.
    const meta = await infoClient.meta(dexKey ? { dex: dexKey } : undefined);
    // Defensive validation before caching
    if (!meta?.universe || !Array.isArray(meta.universe)) {
        throw new Error(`[HyperLiquidProvider] Invalid meta response for DEX ${dexDisplayName}: universe is ${meta?.universe ? 'not an array' : 'missing'}`);
    }
    // Store raw meta response for reuse
    __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMetaByDex, "f").set(dexKey, meta);
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_backfillAssetMapForDex).call(this, dexName, meta);
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getCachedMeta] Fetched and cached meta response', {
        dex: dexDisplayName,
        universeSize: meta.universe.length,
        skipCache,
    });
    return meta;
}, _HyperLiquidProvider_backfillAssetMapForDex = 
/**
 * Backfill the asset ID map for a single DEX from a fresh meta response.
 * Used to repair partial asset mapping when an individual DEX becomes available later.
 *
 * @param dex - DEX name (null for main DEX).
 * @param meta - Meta response containing the DEX universe.
 * @returns True if the mapping was rebuilt for the DEX.
 */
async function _HyperLiquidProvider_backfillAssetMapForDex(dex, meta) {
    if (!meta?.universe || !Array.isArray(meta.universe)) {
        return false;
    }
    if (!__classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state) {
        try {
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getValidatedDexs).call(this);
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[backfillAssetMapForDex] Unable to refresh validated DEXs before rebuilding asset map', {
                dex: dex ?? 'main',
                error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.backfillAssetMapForDex').message,
            });
        }
    }
    const allPerpDexs = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state?.raw ?? [null];
    const perpDexIndex = allPerpDexs.findIndex((entry) => {
        if (dex === null) {
            return entry === null;
        }
        return entry !== null && entry.name === dex;
    });
    if (perpDexIndex === -1) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[backfillAssetMapForDex] Could not find perpDexIndex for DEX', { dex: dex ?? 'main' });
        return false;
    }
    const { symbolToAssetId } = (0, hyperLiquidAdapter_js_1.buildAssetMapping)({
        metaUniverse: meta.universe,
        dex,
        perpDexIndex,
    });
    symbolToAssetId.forEach((assetId, coin) => {
        __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").set(coin, assetId);
    });
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[backfillAssetMapForDex] Rebuilt asset mapping for DEX', {
        dex: dex ?? 'main',
        dexAssetCount: symbolToAssetId.size,
        totalAssetCount: __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").size,
    });
    return symbolToAssetId.size > 0;
}, _HyperLiquidProvider_getAssetIdWithRepair = 
/**
 * Resolve an asset ID, repairing the DEX-specific map when meta is available but the map is stale.
 *
 * @param params - Resolution parameters.
 * @param params.symbol - Asset symbol to resolve.
 * @param params.dexName - DEX name (null for main DEX).
 * @param params.meta - Optional pre-fetched meta for the DEX.
 * @returns The asset ID.
 */
async function _HyperLiquidProvider_getAssetIdWithRepair(params) {
    const { symbol, dexName } = params;
    const existingAssetId = __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").get(symbol);
    if (existingAssetId !== undefined) {
        return existingAssetId;
    }
    const meta = params.meta ?? (await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName: dexName ?? null }));
    const assetExistsInMeta = meta.universe.some((asset) => asset.name === symbol);
    if (assetExistsInMeta) {
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_backfillAssetMapForDex).call(this, dexName, meta);
        const repairedAssetId = __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").get(symbol);
        if (repairedAssetId !== undefined) {
            return repairedAssetId;
        }
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Asset ID lookup failed', {
        requestedCoin: symbol,
        dexName: dexName ?? 'main',
        mapSize: __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").size,
        mapContainsAsset: __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").has(symbol),
        assetExistsInMeta,
        allKeys: Array.from(__classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").keys()).slice(0, 20),
    });
    throw new Error(`Asset ID not found for ${symbol}`);
}, _HyperLiquidProvider_getCachedSpotMeta = 
/**
 * Fetch spot metadata with session-based caching
 * Contains token info (e.g. USDC token index) needed for HIP-3 collateral checks
 * Pre-fetched in ensureReadyForTrading() to ensure availability during order placement
 *
 * @returns SpotMetaResponse with tokens and universe data
 */
async function _HyperLiquidProvider_getCachedSpotMeta() {
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_cachedSpotMeta, "f")) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getCachedSpotMeta] Using cached spotMeta', {
            tokensCount: __classPrivateFieldGet(this, _HyperLiquidProvider_cachedSpotMeta, "f").tokens.length,
            universeCount: __classPrivateFieldGet(this, _HyperLiquidProvider_cachedSpotMeta, "f").universe.length,
        });
        return __classPrivateFieldGet(this, _HyperLiquidProvider_cachedSpotMeta, "f");
    }
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
    const spotMeta = await infoClient.spotMeta();
    __classPrivateFieldSet(this, _HyperLiquidProvider_cachedSpotMeta, spotMeta, "f");
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getCachedSpotMeta] Fetched and cached spotMeta', {
        tokensCount: spotMeta.tokens.length,
        universeCount: spotMeta.universe.length,
    });
    return spotMeta;
}, _HyperLiquidProvider_getCachedPerpDexs = 
/**
 * Fetch perpDexs data with TTL-based caching
 * Returns deployerFeeScale info needed for dynamic fee calculation
 *
 * @returns Array of ExtendedPerpDex objects (null entries represent main DEX)
 */
async function _HyperLiquidProvider_getCachedPerpDexs() {
    const now = Date.now();
    // Return cached data if still valid (uses unified state timestamp for TTL)
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state &&
        now - __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state.timestamp <
            hyperLiquidConfig_js_1.HIP3_FEE_CONFIG.PerpDexsCacheTtlMs) {
        const raw = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state.raw;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getCachedPerpDexs] Using cached perpDexs data', {
            age: `${Math.round((now - __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state.timestamp) / 1000)}s`,
            count: raw.length,
        });
        return raw;
    }
    // Fetch fresh data from API
    // Note: SDK types are incomplete, but API returns deployerFeeScale
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
    const perpDexs = (await infoClient.perpDexs());
    // Atomically update unified state (raw + validated + timestamp)
    __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").update(perpDexs);
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getCachedPerpDexs] Fetched and cached perpDexs data', {
        count: perpDexs.length,
        dexes: perpDexs
            .filter((dex) => dex !== null)
            .map((dex) => ({
            name: dex.name,
            deployerFeeScale: dex.deployerFeeScale,
        })),
    });
    return perpDexs;
}, _HyperLiquidProvider_calculateHip3FeeMultiplier = 
/**
 * Calculate HIP-3 fee multiplier using HyperLiquid's official formula
 * Fetches deployerFeeScale from perpDexs API and growthMode from meta API
 *
 * Formula from HyperLiquid docs:
 * - scaleIfHip3 = deployerFeeScale < 1 ? deployerFeeScale + 1 : deployerFeeScale * 2
 * - growthModeScale = growthMode ? 0.1 : 1
 * - finalMultiplier = scaleIfHip3 * growthModeScale
 *
 * @param params - The operation parameters.
 * @param params.dexName - The DEX identifier (empty string for main DEX).
 * @param params.assetSymbol - The asset symbol.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees#fee-formula-for-developers
 * @returns The result of the operation.
 */
async function _HyperLiquidProvider_calculateHip3FeeMultiplier(params) {
    const { dexName, assetSymbol } = params;
    try {
        // Get deployerFeeScale from perpDexs
        const perpDexs = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedPerpDexs).call(this);
        const dexInfo = perpDexs.find((dex) => dex?.name === dexName);
        const parsedScale = parseFloat(dexInfo?.deployerFeeScale ?? '');
        const deployerFeeScale = Number.isNaN(parsedScale)
            ? hyperLiquidConfig_js_1.HIP3_FEE_CONFIG.DefaultDeployerFeeScale
            : parsedScale;
        // Get growthMode from meta for this specific asset
        const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName });
        const fullAssetName = `${dexName}:${assetSymbol}`;
        const assetMeta = meta.universe.find((univ) => univ.name === fullAssetName);
        const isGrowthMode = assetMeta?.growthMode === 'enabled';
        // Apply official formula
        const scaleIfHip3 = deployerFeeScale < 1 ? deployerFeeScale + 1 : deployerFeeScale * 2;
        const growthModeScale = isGrowthMode
            ? hyperLiquidConfig_js_1.HIP3_FEE_CONFIG.GrowthModeScale
            : 1;
        const finalMultiplier = scaleIfHip3 * growthModeScale;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HIP-3 Dynamic Fee Calculation', {
            dexName,
            assetSymbol,
            fullAssetName,
            deployerFeeScale,
            isGrowthMode,
            scaleIfHip3,
            growthModeScale,
            finalMultiplier,
        });
        return finalMultiplier;
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HIP-3 Fee Calculation Failed, using fallback', {
            dexName,
            assetSymbol,
            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.calculateHip3FeeMultiplier').message,
        });
        // Safe fallback: standard HIP-3 2x multiplier (no Growth Mode discount)
        return hyperLiquidConfig_js_1.HIP3_FEE_CONFIG.DefaultDeployerFeeScale * 2;
    }
}, _HyperLiquidProvider_getCacheKey = function _HyperLiquidProvider_getCacheKey(network, userAddress) {
    return `${network}:${userAddress.toLowerCase()}`;
}, _HyperLiquidProvider_getApprovedBuilderKey = function _HyperLiquidProvider_getApprovedBuilderKey(network, userAddress, builderAddress) {
    return `${__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCacheKey).call(this, network, userAddress)}:${builderAddress.toLowerCase()}`;
}, _HyperLiquidProvider_fetchMarketsForDex = 
/**
 * Fetch markets for a specific DEX with optional filtering
 * Uses session-based caching via getCachedMeta() - no TTL, cleared on disconnect
 *
 * @param params - The operation parameters.
 * @param params.dex - DEX name (null for main DEX).
 * @param params.skipFilters - If true, skip HIP-3 filtering (return all markets).
 * @param params.skipCache - If true, bypass cache and fetch fresh data.
 * @returns Array of MarketInfo objects.
 */
async function _HyperLiquidProvider_fetchMarketsForDex(params) {
    const { dex, skipFilters = false, skipCache = false } = params;
    // Get raw meta response (uses session cache unless skipCache=true)
    const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName: dex, skipCache });
    if (!meta.universe || !Array.isArray(meta.universe)) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`HyperLiquidProvider: Invalid universe data for DEX ${dex ?? 'main'}`);
        return [];
    }
    // TAT-3304: Following the USDH sunset, only USDC-collateral HIP-3 DEXs
    // are supported for trading. Gate non-USDC-collateral DEXs out of market
    // discovery entirely (regardless of skipFilters) so their markets can
    // never be surfaced to trade, even via an allowlist entry naming the DEX.
    if (dex !== null && !(await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isUsdcCollateralDex).call(this, dex))) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Filtering out non-USDC-collateral HIP-3 DEX from market discovery', { dex });
        return [];
    }
    // Transform to MarketInfo format
    const markets = meta.universe.map((asset) => (0, hyperLiquidAdapter_js_1.adaptMarketFromSDK)(asset));
    // Apply HIP-3 filtering on-demand (cheap array operation)
    // Skip filtering for main DEX (null) or if explicitly requested
    const filteredMarkets = skipFilters || dex === null
        ? markets
        : markets.filter((market) => (0, marketUtils_js_1.shouldIncludeMarket)(market.name, dex, __classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_compiledAllowlistPatterns, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_compiledBlocklistPatterns, "f")));
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Fetched markets for DEX', {
        dex: dex ?? 'main',
        marketCount: filteredMarkets.length,
        skipFilters,
        skipCache,
    });
    return filteredMarkets;
}, _HyperLiquidProvider_getUsdcTokenId = 
/**
 * Get USDC token ID from spot metadata
 * Returns format: "USDC:{hex_token_id}"
 * Caches result to avoid repeated API calls
 *
 * @returns A promise that resolves to the string result.
 */
async function _HyperLiquidProvider_getUsdcTokenId() {
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_cachedUsdcTokenId, "f")) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_cachedUsdcTokenId, "f");
    }
    const spotMeta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedSpotMeta).call(this);
    const usdcToken = spotMeta.tokens.find((tok) => tok.name === 'USDC');
    if (!usdcToken) {
        throw new Error('USDC token not found in spot metadata');
    }
    __classPrivateFieldSet(this, _HyperLiquidProvider_cachedUsdcTokenId, `USDC:${usdcToken.tokenId}`, "f");
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: USDC token ID cached', {
        tokenId: __classPrivateFieldGet(this, _HyperLiquidProvider_cachedUsdcTokenId, "f"),
    });
    return __classPrivateFieldGet(this, _HyperLiquidProvider_cachedUsdcTokenId, "f");
}, _HyperLiquidProvider_isUsdcCollateralDex = 
/**
 * Check if a HIP-3 DEX uses USDC as its collateral token
 *
 * TAT-3304: Following the USDH sunset, only USDC-collateral DEXs are
 * supported for trading. This gate filters non-USDC-collateral DEXs
 * (e.g. the now-sunset USDH) out of market discovery and blocks order
 * placement, replacing the previous USDH-specific auto-swap path.
 *
 * Fails closed: only returns true when the collateral token index
 * positively resolves to USDC against spot metadata. If the token can't
 * be resolved (e.g. missing/stale spot metadata), the DEX is treated as
 * non-USDC and gated out, since we can't otherwise verify the USDC-only
 * requirement. This only affects HIP-3 DEXs — main-DEX trading (dex ===
 * null) never calls this gate.
 *
 * @param dexName - The DEX identifier (empty string for main DEX).
 * @returns A promise that resolves to the boolean result.
 */
async function _HyperLiquidProvider_isUsdcCollateralDex(dexName) {
    const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName });
    const spotMeta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedSpotMeta).call(this);
    const collateralToken = spotMeta.tokens.find((tok) => tok.index === meta.collateralToken);
    const isUsdc = collateralToken?.name === hyperLiquidConfig_js_1.USDC_SYMBOL;
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Checked DEX collateral type', {
        dexName,
        collateralTokenIndex: meta.collateralToken,
        collateralTokenName: collateralToken?.name,
        isUsdc,
    });
    return isUsdc;
}, _HyperLiquidProvider_buildAssetMapping = 
/**
 * Build asset ID mapping from market metadata
 * Fetches metadata for feature-flag-enabled DEXs and builds a unified mapping
 * with DEX-prefixed keys for HIP-3 assets (e.g., "xyz:XYZ100" → assetId)
 *
 * Per HIP-3-IMPLEMENTATION.md:
 * - Main DEX: assetId = index (0, 1, 2, ...)
 * - HIP-3 DEX: assetId = BASE_ASSET_ID + (perpDexIndex × DEX_MULTIPLIER) + index
 *
 * This enables proper order routing - when placeOrder({ symbol: "xyz:XYZ100" }) is called,
 * the asset ID lookup succeeds and the order routes to the correct DEX.
 */
async function _HyperLiquidProvider_buildAssetMapping() {
    // Get feature-flag-validated DEXs to map (respects hip3Enabled and enabledDexs)
    let dexsToMap;
    try {
        dexsToMap = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getValidatedDexs).call(this);
    }
    catch (dexError) {
        // If getValidatedDexs fails, fall back to main DEX only to keep the provider
        // functional. Without this, a transient perpDexs() failure would permanently
        // brick #ensureReady via the cached rejected promise.
        // Do not update #dexDiscoveryCache here — leave state null
        // so #getValidatedDexs retries on the next call (same as #fetchValidatedDexsInternal).
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[buildAssetMapping] getValidatedDexs failed, falling back to main DEX', { error: String(dexError) });
        dexsToMap = [null];
    }
    // Local fallback only — never write [null] into #dexDiscoveryCache here.
    // That state is owned exclusively by #dexDiscoveryCache.update(); writing a
    // fallback here would prevent subsequent callers from retrying perpDexs().
    const allPerpDexs = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state?.raw ?? [null];
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Starting asset mapping rebuild', {
        dexs: dexsToMap,
        previousMapSize: __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").size,
        hip3Enabled: __classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f"),
        allowlistMarkets: __classPrivateFieldGet(this, _HyperLiquidProvider_allowlistMarkets, "f"),
        blocklistMarkets: __classPrivateFieldGet(this, _HyperLiquidProvider_blocklistMarkets, "f"),
        timestamp: new Date().toISOString(),
    });
    // Update subscription service with current feature flags
    // Extract HIP-3 DEX names (filter out null which represents main DEX)
    const enabledDexs = dexsToMap.filter((dex) => dex !== null);
    await __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").updateFeatureFlags(__classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f"), enabledDexs, __classPrivateFieldGet(this, _HyperLiquidProvider_allowlistMarkets, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_blocklistMarkets, "f"));
    // Fetch metadata for each DEX in parallel using metaAndAssetCtxs
    // Optimization: Check cache first - getMarketDataWithPrices may have already fetched
    // If not cached, fetch via metaAndAssetCtxs and populate cache for other methods
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
    const allMetas = await Promise.allSettled(dexsToMap.map((dex) => {
        const dexKey = dex ?? '';
        // Check if already cached (e.g., by getMarketDataWithPrices running in parallel)
        const cachedMeta = __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMetaByDex, "f").get(dexKey);
        if (cachedMeta) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`[buildAssetMapping] Using cached meta for ${dex ?? 'main'}`, { universeSize: cachedMeta.universe.length });
            return Promise.resolve({
                dex,
                meta: cachedMeta,
                success: true,
            });
        }
        // Not cached, fetch and populate cache
        const dexParam = dex ?? undefined;
        return infoClient
            .metaAndAssetCtxs(dexParam ? { dex: dexParam } : undefined)
            .then((result) => {
            const meta = result?.[0] || null;
            const assetCtxs = result?.[1] || [];
            // Cache meta for later use by getCachedMeta
            if (meta?.universe) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMetaByDex, "f").set(dexKey, meta);
                // Also populate subscription service cache to avoid redundant API calls
                __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").setDexMetaCache(dexKey, meta);
                // Cache assetCtxs for getMarketDataWithPrices (avoids duplicate metaAndAssetCtxs calls)
                __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").setDexAssetCtxsCache(dexKey, assetCtxs);
            }
            return { dex, meta, success: true };
        })
            .catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`HyperLiquidProvider: Failed to fetch metaAndAssetCtxs for DEX ${dex ?? 'main'}`, { error });
            return { dex, meta: null, success: false };
        });
    }));
    // Build mapping with DEX prefixes for HIP-3 DEXs using the utility function
    __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").clear();
    let dexDiscoveryComplete = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state !== null;
    allMetas.forEach((result) => {
        if (result.status === 'fulfilled' &&
            result.value.success &&
            result.value.meta) {
            const { dex, meta } = result.value;
            // Validate that meta.universe exists and is an array
            if (!meta.universe || !Array.isArray(meta.universe)) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`HyperLiquidProvider: Skipping DEX ${dex ?? 'main'} - invalid or missing universe data`, {
                    hasUniverse: Boolean(meta.universe),
                    isArray: Array.isArray(meta.universe),
                });
                dexDiscoveryComplete = false;
                return;
            }
            // Find perpDexIndex for this DEX in the perpDexs array
            // Main DEX (dex=null) is at index 0
            // HIP-3 DEXs are at indices 1, 2, 3, etc.
            const perpDexIndex = allPerpDexs.findIndex((entry) => {
                if (dex === null) {
                    return entry === null; // Main DEX
                }
                return entry !== null && entry.name === dex;
            });
            if (perpDexIndex === -1) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`HyperLiquidProvider: Could not find perpDexIndex for DEX ${dex ?? 'main'}`);
                dexDiscoveryComplete = false;
                return;
            }
            // Use the utility function to build mapping for this DEX
            const { symbolToAssetId } = (0, hyperLiquidAdapter_js_1.buildAssetMapping)({
                metaUniverse: meta.universe,
                dex,
                perpDexIndex,
            });
            // Merge into provider's map
            symbolToAssetId.forEach((assetId, coin) => {
                __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").set(coin, assetId);
            });
        }
        else {
            dexDiscoveryComplete = false;
        }
    });
    __classPrivateFieldSet(this, _HyperLiquidProvider_dexDiscoveryComplete, dexDiscoveryComplete, "f");
    const allKeys = Array.from(__classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").keys());
    const mainDexKeys = allKeys.filter((key) => !key.includes(':')).slice(0, 5);
    const hip3Keys = allKeys.filter((key) => key.includes(':')).slice(0, 10);
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Asset mapping built', {
        totalAssets: __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f").size,
        dexCount: dexsToMap.length,
        mainDexSample: mainDexKeys,
        hip3Sample: hip3Keys,
    });
}, _HyperLiquidProvider_queryUserDataAcrossDexs = 
/**
 * Query user data across all enabled DEXs in parallel
 *
 * DRY helper for multi-DEX user data queries. Handles feature flag logic
 * and DEX iteration in one place. Uses cached getValidatedDexs() to avoid
 * redundant perpDexs() API calls.
 *
 * @param baseParams - Base parameters (e.g., { user: '0x...' })
 * @param queryFn - API method to call per DEX
 * @returns Array of results per DEX with DEX identifier
 * @example
 * ```typescript
 * const results = await this.#queryUserDataAcrossDexs(
 *   { user: userAddress },
 *   (p) => infoClient.clearinghouseState(p)
 * );
 * ```
 */
async function _HyperLiquidProvider_queryUserDataAcrossDexs(baseParams, queryFn) {
    const enabledDexs = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getValidatedDexs).call(this);
    const settledResults = await Promise.allSettled(enabledDexs.map(async (dex) => {
        const params = dex
            ? { ...baseParams, dex }
            : baseParams;
        return queryFn(params);
    }));
    const results = [];
    const failedDexs = [];
    settledResults.forEach((result, index) => {
        const dex = enabledDexs[index];
        if (result.status === 'fulfilled') {
            results.push({ dex, data: result.value });
            return;
        }
        failedDexs.push({
            dex,
            error: (0, errorUtils_js_1.ensureError)(result.reason, 'HyperLiquidProvider.queryUserDataAcrossDexs'),
        });
    });
    return { results, failedDexs };
}, _HyperLiquidProvider_mapError = function _HyperLiquidProvider_mapError(error) {
    const { message } = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.mapError');
    // "User or API Wallet 0x... does not exist." carries the user's address, so
    // it cannot be matched by the static substring table below. It means the
    // wallet has no Hyperliquid account yet — surface an actionable code the
    // client can translate ("fund your account") instead of leaking the raw
    // exchange string to the UI and to failed-trade analytics.
    if ((0, errorUtils_js_1.isHyperLiquidUserNotFoundError)(error)) {
        return new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.EXCHANGE_ACCOUNT_NOT_FOUND);
    }
    for (const [pattern, code] of Object.entries(__classPrivateFieldGet(this, _HyperLiquidProvider_errorMappings, "f"))) {
        if (message.toLowerCase().includes(pattern.toLowerCase())) {
            return new Error(code);
        }
    }
    // Return original error to preserve stack trace for unmapped errors
    return (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.mapError');
}, _HyperLiquidProvider_getErrorContext = function _HyperLiquidProvider_getErrorContext(method, extra) {
    return {
        tags: {
            feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
            provider: this.protocolId,
            network: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode() ? 'testnet' : 'mainnet',
        },
        context: {
            name: 'HyperLiquidProvider',
            data: {
                method,
                ...extra,
            },
        },
    };
}, _HyperLiquidProvider_isMappedAccountModeExchangeError = function _HyperLiquidProvider_isMappedAccountModeExchangeError(error) {
    return (error.message === perpsErrorCodes_js_1.PERPS_ERROR_CODES.EXCHANGE_MULTI_SIG_REQUIRED ||
        error.message === perpsErrorCodes_js_1.PERPS_ERROR_CODES.EXCHANGE_INVALID_NONCE);
}, _HyperLiquidProvider_getTradingErrorContext = async function _HyperLiquidProvider_getTradingErrorContext(method, error, extra) {
    const contextExtra = { ...extra };
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isMappedAccountModeExchangeError).call(this, error)) {
        try {
            const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
            const abstractionMode = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getCachedAbstractionMode(userAddress);
            if (abstractionMode) {
                contextExtra[eventNames_js_1.PERPS_EVENT_PROPERTY.ABSTRACTION_MODE] = abstractionMode;
            }
        }
        catch {
            // Best-effort context enrichment only.
        }
    }
    return __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, method, contextExtra);
}, _HyperLiquidProvider_checkBuilderFeeApproval = 
/**
 * Check current builder fee approval for the user
 *
 * @param builder - Builder address to query.
 * @param userAddress - Account whose approval should be queried.
 * @returns Current max fee rate or null if not approved
 */
async function _HyperLiquidProvider_checkBuilderFeeApproval(builder, userAddress) {
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
    return infoClient.maxBuilderFee({
        user: userAddress,
        builder,
    });
}, _HyperLiquidProvider_ensureBuilderFeeApproval = 
/**
 * Ensure builder fee is approved for MetaMask
 * Called once during initialization (ensureReady) to set up builder fee for the session
 * Uses session cache to avoid redundant API calls until disconnect/reconnect
 *
 * Cache semantics: Uses GLOBAL cache to persist across provider reconnections
 * This prevents repeated signing requests for hardware wallets.
 *
 * Note: This is network-specific - testnet and mainnet have separate builder fee states
 */
async function _HyperLiquidProvider_ensureBuilderFeeApproval() {
    const isTestnet = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode();
    const network = isTestnet ? 'testnet' : 'mainnet';
    const builderAddress = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderAddress).call(this, isTestnet);
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
    const cacheKey = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCacheKey).call(this, network, userAddress);
    // Check GLOBAL cache first to avoid repeated signing requests across reconnections
    // This is CRITICAL for hardware wallets to prevent repeated signing prompts
    // while browsing.
    const globalCached = TradingReadinessCache_js_1.PerpsSigningCache.getBuilderFee(network, userAddress);
    if (globalCached?.attempted && globalCached?.success) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureBuilderFeeApproval] Using global cache (prevents hardware wallet prompt spam)', { network, success: globalCached.success });
        __classPrivateFieldGet(this, _HyperLiquidProvider_builderFeeCheckCache, "f").set(cacheKey, true);
        __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").add(__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getApprovedBuilderKey).call(this, network, userAddress, builderAddress));
        return;
    }
    // Check if another provider instance is currently attempting this operation
    const inFlightPromise = TradingReadinessCache_js_1.PerpsSigningCache.isInFlight('builderFee', network, userAddress);
    if (inFlightPromise) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureBuilderFeeApproval] Global in-flight, waiting...', { network });
        await inFlightPromise;
        return;
    }
    // Set global in-flight lock
    const completeInFlight = TradingReadinessCache_js_1.PerpsSigningCache.setInFlight('builderFee', network, userAddress);
    try {
        // Re-check cache after acquiring lock
        const recheckCache = TradingReadinessCache_js_1.PerpsSigningCache.getBuilderFee(network, userAddress);
        if (recheckCache?.attempted && recheckCache?.success) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureBuilderFeeApproval] Completed by another provider', { network });
            completeInFlight();
            return;
        }
        const { isApproved, requiredDecimal } = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_checkBuilderFeeStatus).call(this, builderAddress, userAddress);
        if (isApproved) {
            // User already has approval on-chain
            TradingReadinessCache_js_1.PerpsSigningCache.setBuilderFee(network, userAddress, {
                attempted: true,
                success: true,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_builderFeeCheckCache, "f").set(cacheKey, true);
            __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").add(__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getApprovedBuilderKey).call(this, network, userAddress, builderAddress));
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureBuilderFeeApproval] Already approved on-chain', { network });
        }
        else {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureBuilderFeeApproval] Approval required (will show signing request)', { builder: builderAddress, requiredDecimal });
            const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
            const maxFeeRate = hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeRate;
            await exchangeClient.approveBuilderFee({
                builder: builderAddress,
                maxFeeRate,
            });
            // Verify approval was successful before caching
            const afterApprovalDecimal = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_checkBuilderFeeApproval).call(this, builderAddress, userAddress);
            if (afterApprovalDecimal === null ||
                afterApprovalDecimal < requiredDecimal) {
                throw new Error('[HyperLiquidProvider] Builder fee approval verification failed');
            }
            // Cache success in BOTH global and instance caches
            TradingReadinessCache_js_1.PerpsSigningCache.setBuilderFee(network, userAddress, {
                attempted: true,
                success: true,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_builderFeeCheckCache, "f").set(cacheKey, true);
            __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").add(__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getApprovedBuilderKey).call(this, network, userAddress, builderAddress));
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureBuilderFeeApproval] Approval successful', {
                builder: builderAddress,
                maxFeeRate,
            });
        }
        completeInFlight();
    }
    catch (error) {
        // HyperLiquid wraps wallet signing failures and preserves KEYRING_LOCKED
        // in `cause`, so classify the full chain and leave retry caches empty.
        if ((0, errorUtils_js_1.isKeyringLockedError)(error)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureBuilderFeeApproval] Keyring locked, will retry later');
            completeInFlight();
            return;
        }
        // Record failure — will be retried on next trading operation
        TradingReadinessCache_js_1.PerpsSigningCache.setBuilderFee(network, userAddress, {
            attempted: true,
            success: false,
        });
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureBuilderFeeApproval] Failed, will retry on next trading operation', {
            network,
            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.ensureBuilderFeeApproval').message,
        });
        completeInFlight();
        throw error;
    }
}, _HyperLiquidProvider_checkBuilderFeeStatus = 
/**
 * Check if builder fee is approved for the current user
 *
 * @param builderAddress - Builder address to query.
 * @param userAddress - Account whose approval should be queried.
 * @returns Object with approval status and current rate
 */
async function _HyperLiquidProvider_checkBuilderFeeStatus(builderAddress, userAddress) {
    const currentApproval = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_checkBuilderFeeApproval).call(this, builderAddress, userAddress);
    const requiredDecimal = hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeDecimal;
    return {
        isApproved: currentApproval !== null && currentApproval >= requiredDecimal,
        currentRate: currentApproval,
        requiredDecimal,
    };
}, _HyperLiquidProvider_getBalanceForDex = 
/**
 * Get available balance for a specific DEX
 *
 * @param params - Balance query parameters
 * @param params.dex - DEX name (null = main, 'xyz' = HIP-3)
 * @returns Available balance in USDC
 * @private
 */
async function _HyperLiquidProvider_getBalanceForDex(params) {
    const { dex } = params;
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
    const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
    const queryParams = dex
        ? { user: userAddress, dex }
        : { user: userAddress };
    const accountState = await infoClient.clearinghouseState(queryParams);
    const adapted = (0, hyperLiquidAdapter_js_1.adaptAccountStateFromSDK)(accountState);
    return parseFloat(adapted.withdrawableBalance);
}, _HyperLiquidProvider_findSourceDexWithBalance = 
/**
 * Find source DEX with sufficient balance for transfer
 * Strategy: Prefer main DEX → other HIP-3 DEXs
 *
 * @param params - Source search parameters
 * @param params.targetDex - Target DEX name
 * @param params.requiredAmount - Required balance shortfall
 * @returns Source DEX info or null if insufficient funds
 * @private
 */
async function _HyperLiquidProvider_findSourceDexWithBalance(params) {
    const { targetDex, requiredAmount } = params;
    // Try main DEX first
    try {
        const mainBalance = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBalanceForDex).call(this, { dex: null });
        if (mainBalance >= requiredAmount) {
            return { sourceDex: '', available: mainBalance };
        }
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Could not fetch main DEX balance', { error });
    }
    // Try other HIP-3 DEXs
    // Get all available DEXs from cache (includes all HIP-3 DEXs since we no longer filter)
    const availableDexs = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state?.validated?.filter((dex) => dex !== null) ?? [];
    for (const dex of availableDexs) {
        if (dex === targetDex) {
            continue;
        }
        try {
            const balance = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBalanceForDex).call(this, { dex });
            if (balance >= requiredAmount) {
                return { sourceDex: dex, available: balance };
            }
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log(`Could not fetch balance for DEX ${dex}`, {
                error,
            });
        }
    }
    return null;
}, _HyperLiquidProvider_autoTransferForHip3Order = 
/**
 * Auto-transfer funds for HIP-3 orders when insufficient balance
 * Only called for HIP-3 markets (not main DEX)
 *
 * @param params - Transfer parameters
 * @param params.targetDex - HIP-3 DEX name (e.g., 'xyz')
 * @param params.requiredMargin - Required margin with buffer
 * @returns Transfer info for rollback, or null if no transfer needed
 * @private
 */
async function _HyperLiquidProvider_autoTransferForHip3Order(params) {
    const { targetDex, requiredMargin } = params;
    // Check target DEX balance
    const targetBalance = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBalanceForDex).call(this, { dex: targetDex });
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: HIP-3 balance check', {
        targetDex,
        targetBalance: targetBalance.toFixed(2),
        requiredMargin: requiredMargin.toFixed(2),
        shortfall: Math.max(0, requiredMargin - targetBalance).toFixed(2),
    });
    // Sufficient balance - no transfer needed
    if (targetBalance >= requiredMargin) {
        return null;
    }
    // Calculate shortfall and find source
    const shortfall = requiredMargin - targetBalance;
    const source = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_findSourceDexWithBalance).call(this, {
        targetDex,
        requiredAmount: shortfall,
    });
    if (!source) {
        throw new Error(`Insufficient balance for HIP-3 order. Required: ${requiredMargin.toFixed(2)} USDC on ${targetDex} DEX, Available: ${targetBalance.toFixed(2)} USDC. Please transfer funds to ${targetDex} DEX.`);
    }
    // Execute transfer
    const transferAmount = Math.min(shortfall, source.available).toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS);
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Executing HIP-3 auto-transfer', {
        from: source.sourceDex || 'main',
        to: targetDex,
        amount: transferAmount,
    });
    const result = await this.transferBetweenDexs({
        sourceDex: source.sourceDex,
        destinationDex: targetDex,
        amount: transferAmount,
    });
    if (!result.success) {
        throw new Error(`Auto-transfer failed: ${result.error ?? 'Unknown error'}`);
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('✅ HyperLiquidProvider: HIP-3 auto-transfer complete', {
        amount: transferAmount,
        from: source.sourceDex || 'main',
        to: targetDex,
    });
    return {
        amount: parseFloat(transferAmount),
        sourceDex: source.sourceDex,
    };
}, _HyperLiquidProvider_autoTransferBackAfterClose = 
/**
 * Auto-transfer freed margin back to main DEX after closing a HIP-3 position
 *
 * This method transfers the margin released from closing a position back to
 * the main DEX to prevent balance fragmentation across HIP-3 DEXs.
 *
 * Design: Non-blocking operation - failures are logged but don't affect the
 * position close operation. Extensible for future configuration options.
 *
 * @param params - Transfer configuration
 * @param params.sourceDex - HIP-3 DEX name to transfer from
 * @param params.freedMargin - Amount of margin released from position close
 * @param params.transferAll - (Future) Transfer all available balance instead
 * @param params.skipTransfer - (Future) Skip auto-transfer if disabled
 * @returns Transfer info if successful, null if skipped/failed
 * @private
 */
async function _HyperLiquidProvider_autoTransferBackAfterClose(params) {
    const { sourceDex, freedMargin, transferAll = false, skipTransfer = false, } = params;
    // Future: Check user preference to skip auto-transfer
    if (skipTransfer) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Auto-transfer back skipped (disabled by config)');
        return null;
    }
    try {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Attempting auto-transfer back to main DEX', {
            sourceDex,
            freedMargin: freedMargin.toFixed(2),
            transferAll,
        });
        // Get current balance on HIP-3 DEX
        const sourceBalance = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBalanceForDex).call(this, { dex: sourceDex });
        if (sourceBalance <= 0) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('No balance to transfer back', {
                sourceBalance,
            });
            return null;
        }
        // Determine transfer amount
        const transferAmount = transferAll
            ? sourceBalance
            : Math.min(freedMargin, sourceBalance);
        if (transferAmount <= 0) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Transfer amount too small', {
                transferAmount,
            });
            return null;
        }
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Transferring back to main DEX', {
            amount: transferAmount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
            from: sourceDex,
            to: 'main',
        });
        // Execute transfer back to main DEX (empty string '' represents main DEX)
        const result = await this.transferBetweenDexs({
            sourceDex,
            destinationDex: '',
            amount: transferAmount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
        });
        if (!result.success) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('❌ Auto-transfer back failed', {
                error: result.error,
            });
            return null;
        }
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('✅ Auto-transfer back successful', {
            amount: transferAmount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
            from: sourceDex,
            to: 'main',
        });
        return {
            amount: transferAmount,
            destinationDex: '',
        };
    }
    catch (error) {
        // Non-blocking: Log error but don't throw
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('❌ Auto-transfer back exception', {
            error,
            sourceDex,
            freedMargin,
        });
        return null;
    }
}, _HyperLiquidProvider_calculateHip3RequiredMargin = 
/**
 * Calculate required margin for HIP-3 order based on existing position
 * Handles three scenarios:
 * 1. Increasing existing position - requires TOTAL margin (temporary over-funding)
 * 2. Reducing/flipping position - requires margin for new order only
 * 3. New position - requires margin for new order only
 *
 * @param params - The operation parameters.
 * @param params.symbol - The trading pair symbol.
 * @param params.dexName - The DEX identifier (empty string for main DEX).
 * @param params.positionSize - The position size value.
 * @param params.orderPrice - The order price value.
 * @param params.leverage - The leverage multiplier.
 * @param params.isBuy - Whether this is a buy order.
 * @private
 * @returns The result of the operation.
 */
async function _HyperLiquidProvider_calculateHip3RequiredMargin(params) {
    const { symbol, dexName, positionSize, orderPrice, leverage, isBuy } = params;
    // Get existing position to check if we're increasing
    const positions = await this.getPositions();
    const existingPosition = positions.find((pos) => pos.symbol === symbol);
    let requiredMarginWithBuffer;
    // HyperLiquid validates isolated margin by checking if available balance >= TOTAL position margin
    // When increasing a position, we need to ensure enough funds are available for the TOTAL combined size
    if (existingPosition) {
        const existingIsLong = parseFloat(existingPosition.size) > 0;
        const orderIsLong = isBuy;
        if (existingIsLong === orderIsLong) {
            // Increasing position - HyperLiquid validates spendableBalance >= totalRequiredMargin
            // BEFORE reallocating existing locked margin. Must transfer TOTAL margin temporarily.
            const existingSize = Math.abs(parseFloat(existingPosition.size));
            const existingMargin = parseFloat(existingPosition.marginUsed);
            const totalSize = existingSize + positionSize;
            const totalNotionalValue = totalSize * orderPrice;
            const totalRequiredMargin = totalNotionalValue / leverage;
            // Accept temporary over-funding - excess will be reclaimed after order succeeds
            requiredMarginWithBuffer =
                totalRequiredMargin * hyperLiquidConfig_js_1.HIP3_MARGIN_CONFIG.BufferMultiplier;
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: HIP-3 margin calculation (TOTAL margin - temporary over-funding)', {
                symbol,
                dex: dexName,
                existingSize: existingSize.toFixed(4),
                existingMargin: existingMargin.toFixed(2),
                newSize: positionSize.toFixed(4),
                totalSize: totalSize.toFixed(4),
                totalNotionalValue: totalNotionalValue.toFixed(2),
                leverage,
                totalRequiredMargin: totalRequiredMargin.toFixed(2),
                requiredMarginWithBuffer: requiredMarginWithBuffer.toFixed(2),
                note: 'Transferring TOTAL margin (HyperLiquid validates before reallocation). Will auto-rebalance excess after success.',
            });
        }
        else {
            // Reducing or flipping position - just need margin for new order
            const notionalValue = positionSize * orderPrice;
            const requiredMargin = notionalValue / leverage;
            requiredMarginWithBuffer =
                requiredMargin * hyperLiquidConfig_js_1.HIP3_MARGIN_CONFIG.BufferMultiplier;
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: HIP-3 margin calculation (reducing position)', {
                symbol,
                dex: dexName,
                notionalValue: notionalValue.toFixed(2),
                leverage,
                requiredMargin: requiredMargin.toFixed(2),
                requiredMarginWithBuffer: requiredMarginWithBuffer.toFixed(2),
            });
        }
    }
    else {
        // No existing position - just need margin for this order
        const notionalValue = positionSize * orderPrice;
        const requiredMargin = notionalValue / leverage;
        requiredMarginWithBuffer =
            requiredMargin * hyperLiquidConfig_js_1.HIP3_MARGIN_CONFIG.BufferMultiplier;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: HIP-3 margin calculation (new position)', {
            symbol,
            dex: dexName,
            notionalValue: notionalValue.toFixed(2),
            leverage,
            requiredMargin: requiredMargin.toFixed(2),
            requiredMarginWithBuffer: requiredMarginWithBuffer.toFixed(2),
        });
    }
    return requiredMarginWithBuffer;
}, _HyperLiquidProvider_handleHip3PostOrderRebalance = 
/**
 * Handle post-order balance check and auto-rebalance for HIP-3 orders
 * After a successful order, checks available balance and transfers excess back to main DEX
 * Does not throw errors - logs them for monitoring
 *
 * @param params - The operation parameters.
 * @param params.dexName - The DEX identifier (empty string for main DEX).
 * @param params.transferInfo - The transfer information.
 * @param params.transferInfo.amount - The amount value.
 * @param params.transferInfo.sourceDex - The source DEX for the transfer.
 * @private
 */
async function _HyperLiquidProvider_handleHip3PostOrderRebalance(params) {
    const { dexName, transferInfo } = params;
    try {
        const postOrderBalance = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBalanceForDex).call(this, { dex: dexName });
        const transferredAmount = transferInfo.amount;
        const leftoverAmount = postOrderBalance;
        const leftoverPercentage = transferredAmount > 0 ? (leftoverAmount / transferredAmount) * 100 : 0;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('✅ HyperLiquidProvider: Order succeeded - post-order balance', {
            dex: dexName,
            transferredAmount: transferredAmount.toFixed(2),
            availableAfterOrder: leftoverAmount.toFixed(2),
            leftoverPercentage: `${leftoverPercentage.toFixed(2)}%`,
        });
        // Auto-rebalance: Reclaim excess funds back to main DEX
        const desiredBuffer = hyperLiquidConfig_js_1.HIP3_MARGIN_CONFIG.RebalanceDesiredBuffer;
        const excessAmount = postOrderBalance - desiredBuffer;
        const minimumTransferThreshold = hyperLiquidConfig_js_1.HIP3_MARGIN_CONFIG.RebalanceMinThreshold;
        if (excessAmount > minimumTransferThreshold) {
            try {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('🔄 HyperLiquidProvider: Auto-rebalancing excess margin back to main DEX', {
                    dex: dexName,
                    spendableBalance: postOrderBalance.toFixed(2),
                    desiredBuffer: desiredBuffer.toFixed(2),
                    excessAmount: excessAmount.toFixed(2),
                    destinationDex: transferInfo.sourceDex,
                });
                await this.transferBetweenDexs({
                    sourceDex: dexName,
                    destinationDex: transferInfo.sourceDex,
                    amount: excessAmount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
                });
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('✅ HyperLiquidProvider: Auto-rebalance completed', {
                    transferredBack: excessAmount.toFixed(2),
                    from: dexName,
                    to: transferInfo.sourceDex,
                });
            }
            catch (rebalanceError) {
                // Don't fail the order if rebalance fails (order already succeeded)
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(rebalanceError, 'HyperLiquidProvider.placeOrder:autoRebalance'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'placeOrder:autoRebalance', {
                    dex: dexName,
                    excessAmount: excessAmount.toFixed(2),
                    note: 'Auto-rebalance failed - funds remain on HIP-3 DEX',
                }));
            }
        }
        else {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('ℹ️ HyperLiquidProvider: No auto-rebalance needed', {
                excessAmount: excessAmount.toFixed(2),
                threshold: minimumTransferThreshold.toFixed(2),
                note: 'Excess below minimum transfer threshold',
            });
        }
    }
    catch (balanceCheckError) {
        // Don't fail the order if balance check fails - log for monitoring
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(balanceCheckError, 'HyperLiquidProvider.placeOrder:postOrderBalanceCheck'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'placeOrder:postOrderBalanceCheck', {
            dex: dexName,
            note: 'Failed to verify post-order balance for auto-rebalance',
        }));
    }
}, _HyperLiquidProvider_handleHip3OrderRollback = 
/**
 * Handle rollback of HIP-3 transfer when order fails
 * Attempts to return funds to source DEX
 * Does not throw errors - logs them for monitoring
 *
 * @param params - The operation parameters.
 * @param params.dexName - The DEX identifier (empty string for main DEX).
 * @param params.transferInfo - The transfer information.
 * @param params.transferInfo.amount - The amount value.
 * @param params.transferInfo.sourceDex - The source DEX for the transfer.
 * @private
 */
async function _HyperLiquidProvider_handleHip3OrderRollback(params) {
    const { dexName, transferInfo } = params;
    try {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Rolling back failed order transfer', {
            from: dexName,
            to: transferInfo.sourceDex || 'main',
            amount: transferInfo.amount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
            reason: 'order_failed',
        });
        const rollbackResult = await this.transferBetweenDexs({
            sourceDex: dexName, // From HIP-3 DEX
            destinationDex: transferInfo.sourceDex, // Back to source
            amount: transferInfo.amount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
        });
        if (rollbackResult.success) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('✅ HyperLiquidProvider: Rollback successful', {
                amount: transferInfo.amount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
                returnedTo: transferInfo.sourceDex || 'main',
            });
        }
        else {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(new Error(rollbackResult.error ?? 'Rollback transfer failed'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'placeOrder:rollback', {
                dex: dexName,
                amount: transferInfo.amount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
                note: 'Rollback failed - funds remain on HIP-3 DEX',
            }));
        }
    }
    catch (rollbackError) {
        // Log but don't throw - original order error is more important
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(rollbackError, 'HyperLiquidProvider.placeOrder:rollback'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'placeOrder:rollback:exception', {
            dex: dexName,
            amount: transferInfo.amount.toFixed(hyperLiquidConfig_js_1.USDC_DECIMALS),
            note: 'Rollback threw exception - funds remain on HIP-3 DEX',
        }));
    }
}, _HyperLiquidProvider_validateOrderBeforePlacement = 
// ============================================================================
// Helper Methods for placeOrder Refactoring
// ============================================================================
/**
 * Validates order parameters before placement using provider-level validation
 *
 * @param params - The operation parameters.
 * @throws Error if validation fails
 */
async function _HyperLiquidProvider_validateOrderBeforePlacement(params) {
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Provider: Validating order before placement:', params);
    const validation = await this.validateOrder(params);
    if (!validation.isValid) {
        throw new Error(validation.error ?? 'Order validation failed at provider level');
    }
}, _HyperLiquidProvider_getAssetInfo = 
/**
 * Gets asset info and current price from the correct DEX
 *
 * @param params - The operation parameters.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_getAssetInfo(params) {
    const { symbol, dexName } = params;
    const meta = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getCachedMeta).call(this, { dexName });
    const assetInfo = meta.universe.find((asset) => asset.name === symbol);
    if (!assetInfo) {
        throw new Error(`Asset ${symbol} not found in ${dexName ?? 'main'} DEX universe`);
    }
    const currentPrice = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getOrFetchPrice).call(this, {
        symbol,
        dexName: dexName ?? null,
    });
    return { assetInfo, currentPrice, meta };
}, _HyperLiquidProvider_prepareAssetForTrading = 
/**
 * Prepares asset for trading by updating leverage if specified
 *
 * @param params - The operation parameters.
 */
async function _HyperLiquidProvider_prepareAssetForTrading(params) {
    const { symbol, assetId, leverage } = params;
    if (!leverage) {
        return;
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Updating leverage before order:', {
        symbol,
        assetId,
        requestedLeverage: leverage,
        leverageType: 'isolated',
    });
    const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
    const leverageResult = await exchangeClient.updateLeverage({
        asset: assetId,
        isCross: false,
        leverage,
    });
    if (leverageResult.status !== 'ok') {
        throw new Error(`Failed to update leverage: ${JSON.stringify(leverageResult)}`);
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Leverage updated successfully:', {
        symbol,
        leverage,
    });
}, _HyperLiquidProvider_handleHip3PreOrder = 
/**
 * Handles HIP-3 pre-order balance management
 *
 * @param params - The operation parameters.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_handleHip3PreOrder(params) {
    const { dexName, symbol, orderPrice, positionSize, leverage, isBuy } = params;
    // TAT-3304: Only USDC-collateral HIP-3 DEXs are supported for trading.
    // Following the USDH sunset, reject orders on any non-USDC-collateral
    // DEX here instead of attempting the (now-removed) USDH auto-swap path.
    // Market discovery (#fetchMarketsForDex) already filters such DEXs out,
    // so this is a defense-in-depth check against stale caches or a
    // misconfigured allowlist entry.
    const isUsdcDex = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isUsdcCollateralDex).call(this, dexName);
    if (!isUsdcDex) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Rejecting order for non-USDC-collateral DEX', {
            dexName,
            symbol,
        });
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.UNSUPPORTED_COLLATERAL);
    }
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_useUnifiedAccount, "f")) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using Unified Account (no manual transfer)', {
            symbol,
            dex: dexName,
        });
        return { transferInfo: null };
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Using manual auto-transfer', {
        symbol,
        dex: dexName,
    });
    const requiredMarginWithBuffer = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_calculateHip3RequiredMargin).call(this, {
        symbol,
        dexName,
        positionSize,
        orderPrice,
        leverage,
        isBuy,
    });
    try {
        const transferInfo = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_autoTransferForHip3Order).call(this, {
            targetDex: dexName,
            requiredMargin: requiredMarginWithBuffer,
        });
        return { transferInfo };
    }
    catch (transferError) {
        const errorMsg = transferError?.message || '';
        if (errorMsg.includes('Cannot transfer with DEX abstraction enabled')) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Detected DEX abstraction is enabled, switching mode');
            __classPrivateFieldSet(this, _HyperLiquidProvider_useUnifiedAccount, true, "f");
            return { transferInfo: null };
        }
        throw transferError;
    }
}, _HyperLiquidProvider_submitOrderWithRollback = 
/**
 * Submits order with atomic rollback for HIP-3 failures
 *
 * @param params - The operation parameters.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_submitOrderWithRollback(params) {
    const { orders, grouping, isHip3Order, dexName, transferInfo, symbol } = params;
    const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
    const builder = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderOrderContext).call(this);
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Submitting order via asset ID routing', {
        symbol,
        assetId: orders[0].a,
        orderCount: orders.length,
        mainOrder: orders[0],
        dexName: dexName ?? 'main',
        isHip3: Boolean(dexName),
    });
    try {
        const result = await exchangeClient.order({
            orders,
            grouping,
            builder,
        });
        if (result.status !== 'ok') {
            throw new Error(`Order failed: ${JSON.stringify(result)}`);
        }
        const status = result.response?.data?.statuses?.[0];
        // Note: `in` narrows the HyperLiquid SDK discriminated union to the
        // branch that has the property; `hasProperty` types the property as
        // `unknown`, losing downstream access to `.oid`, `.totalSz`, `.avgPx`.
        /* eslint-disable no-restricted-syntax */
        const restingOrder = isStatusObject(status) && 'resting' in status ? status.resting : null;
        const filledOrder = isStatusObject(status) && 'filled' in status ? status.filled : null;
        /* eslint-enable no-restricted-syntax */
        // Success - auto-rebalance excess funds
        if (isHip3Order && transferInfo && dexName) {
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_handleHip3PostOrderRebalance).call(this, { dexName, transferInfo });
        }
        return {
            success: true,
            orderId: restingOrder?.oid?.toString() ?? filledOrder?.oid?.toString(),
            filledSize: filledOrder?.totalSz,
            // The main order's `s` is the final normalized size sent to the exchange
            // (post precision rounding, USD recalculation, and $10-minimum retry —
            // the retry recurses through placeOrder so this reflects the last
            // submission). TradingService uses it to classify partial fills. The SDK
            // types `s` as `string | number`, so normalize to the string OrderResult
            // shape while preserving `undefined` when no order was built.
            submittedSize: orders[0]?.s === undefined ? undefined : String(orders[0].s),
            averagePrice: filledOrder?.avgPx,
        };
    }
    catch (orderError) {
        // Failure - rollback transfer
        if (transferInfo && dexName) {
            await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_handleHip3OrderRollback).call(this, { dexName, transferInfo });
        }
        throw orderError;
    }
}, _HyperLiquidProvider_handleOrderError = 
/**
 * Handles order errors with proper error mapping
 *
 * @param params - The operation parameters.
 * @returns The result of the operation.
 */
async function _HyperLiquidProvider_handleOrderError(params) {
    const { error, symbol, orderType, isBuy } = params;
    const mappedError = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mapError).call(this, error);
    // A wallet with no Hyperliquid account is an expected pre-account state,
    // not an app defect — same policy already applied to every other
    // user-scoped exchange write in this provider. Keep it out of Sentry; the
    // failure is still reported to the caller (and to trade analytics) via the
    // mapped EXCHANGE_ACCOUNT_NOT_FOUND code below.
    if ((0, errorUtils_js_1.isHyperLiquidUserNotFoundError)(error)) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[handleOrderError] Wallet has no Hyperliquid account, order cannot be placed', { symbol, orderType, isBuy });
    }
    else {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(mappedError, await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getTradingErrorContext).call(this, 'placeOrder', mappedError, {
            symbol,
            orderType,
            isBuy,
        }));
    }
    return (0, hyperLiquidValidation_js_1.createErrorResult)(mappedError, { success: false });
}, _HyperLiquidProvider_placeStrategyOrder = 
/**
 * Dispatch a strategy placement to the handler that owns it.
 *
 * @param params - Order parameters, already validated.
 * @param orderType - The strategy type, narrowed by the caller.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_placeStrategyOrder(params, orderType) {
    // Captured before the shared preamble, not after it: that preamble awaits
    // asset info, validation, trading readiness and a leverage update, and a
    // disconnect during any of them has to be seen by the chase registration
    // at the end.
    const generation = __classPrivateFieldGet(this, _HyperLiquidProvider_chaseGeneration, "f");
    if (orderType !== 'chase') {
        const context = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_prepareStrategyPlacement).call(this, params);
        return orderType === 'twap'
            ? await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_placeTwapOrder).call(this, params, context)
            : await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_placeScaleOrder).call(this, params, context);
    }
    // The chase slot is claimed before the preamble, not after it: the preamble
    // completes the signing setup and can change the asset's leverage, and a
    // request that is going to be refused for exceeding the venue's cap must
    // not cost either. Reserved in the same synchronous step it is checked, so
    // concurrent placements cannot both see room during the round trips that
    // follow.
    const activeChases = [...__classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").values()].filter((session) => session.active).length;
    if (activeChases + __classPrivateFieldGet(this, _HyperLiquidProvider_chasePlacementsInFlight, "f") >=
        perpsConfig_js_1.CHASE_ORDER_CONFIG.MaxActiveSessions) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_CHASE_LIMIT_REACHED);
    }
    __classPrivateFieldSet(this, _HyperLiquidProvider_chasePlacementsInFlight, __classPrivateFieldGet(this, _HyperLiquidProvider_chasePlacementsInFlight, "f") + 1, "f");
    try {
        const context = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_prepareStrategyPlacement).call(this, params);
        return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_startChaseSession).call(this, params, context, generation);
    }
    finally {
        __classPrivateFieldSet(this, _HyperLiquidProvider_chasePlacementsInFlight, __classPrivateFieldGet(this, _HyperLiquidProvider_chasePlacementsInFlight, "f") - 1, "f");
    }
}, _HyperLiquidProvider_prepareStrategyPlacement = 
/**
 * Run the shared preamble every strategy placement needs.
 *
 * Mirrors the single-order path's own preamble — validate against a live
 * price, complete the signing setup, resolve the asset ID, apply leverage —
 * so a strategy order is held to the same rules as an ordinary one.
 *
 * @param params - Order parameters.
 * @returns The asset and sizing context the strategy handlers submit with.
 */
async function _HyperLiquidProvider_prepareStrategyPlacement(params) {
    const { dex: dexName } = (0, hyperLiquidAdapter_js_1.parseAssetName)(params.symbol);
    // A HIP-3 order is preceded by a margin transfer onto the builder DEX and
    // followed by a rebalance, both of which are wired into the single-order
    // submit path and its rollback. Rather than half-support that here, a
    // strategy placement on a HIP-3 market is refused outright.
    if (dexName !== null) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_STRATEGY_MARKET_UNSUPPORTED);
    }
    const { assetInfo, currentPrice, meta } = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetInfo).call(this, {
        symbol: params.symbol,
        dexName,
    });
    const effectivePrice = params.currentPrice && params.currentPrice > 0
        ? params.currentPrice
        : currentPrice;
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_validateOrderBeforePlacement).call(this, {
        ...params,
        currentPrice: effectivePrice,
    });
    const normalizedMaxSlippageBps = params.maxSlippageBps ??
        (typeof params.slippage === 'number'
            ? Math.round(params.slippage * hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR)
            : undefined);
    const { finalPositionSize } = (0, orderCalculations_js_1.calculateFinalPositionSize)({
        usdAmount: params.usdAmount,
        size: params.size,
        currentPrice: effectivePrice,
        priceAtCalculation: params.priceAtCalculation,
        maxSlippageBps: normalizedMaxSlippageBps,
        szDecimals: assetInfo.szDecimals,
        leverage: params.leverage,
        reduceOnly: params.reduceOnly,
    });
    const formattedSize = (0, hyperLiquidAdapter_js_1.formatHyperLiquidSize)({
        size: finalPositionSize,
        szDecimals: assetInfo.szDecimals,
    });
    // Everything below is checked here, before anything is signed: it needs
    // `szDecimals`, which only arrives with the asset info above, and these are
    // caller mistakes that must not cost a leverage change or a signing prompt
    // first.
    const ladder = params.orderType === 'scale'
        ? __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_buildScaleLadder).call(this, {
            params,
            szDecimals: assetInfo.szDecimals,
            finalPositionSize,
        })
        : undefined;
    // `validateOrder` applied the venue minimum to the notional the caller
    // asked for; this applies it to the size actually being submitted. The two
    // differ whenever sizing floors onto the grid rather than rounding up to
    // meet the requested USD — which is exactly what a reduce-only order does,
    // since the venue rejects a close larger than the position. A boundary
    // amount can therefore clear the check the caller sees and still arrive
    // under the minimum the venue charges against what it receives.
    if (params.orderType === 'twap' || params.orderType === 'chase') {
        const submittedNotional = parseFloat(formattedSize) * effectivePrice;
        const minimumNotional = params.orderType === 'twap'
            ? perpsConfig_js_1.HYPERLIQUID_TWAP_LIMITS.MinNotionalUsd
            : __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getMinimumOrderSize).call(this);
        if (submittedNotional < minimumNotional) {
            throw new Error(params.orderType === 'twap'
                ? perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_TWAP_NOTIONAL_TOO_SMALL
                : perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SIZE_MIN);
        }
    }
    // Kept after validation so an invalid strategy order never triggers the
    // signature prompts in trading setup — same ordering as `placeOrder`.
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
    const assetId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
        symbol: params.symbol,
        dexName,
        meta,
    });
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_prepareAssetForTrading).call(this, {
        symbol: params.symbol,
        assetId,
        leverage: params.leverage,
    });
    return {
        assetId,
        szDecimals: assetInfo.szDecimals,
        finalPositionSize,
        formattedSize,
        ladder,
    };
}, _HyperLiquidProvider_getMinimumOrderSize = function _HyperLiquidProvider_getMinimumOrderSize() {
    return __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode()
        ? hyperLiquidConfig_js_1.TRADING_DEFAULTS.amount.testnet
        : hyperLiquidConfig_js_1.TRADING_DEFAULTS.amount.mainnet;
}, _HyperLiquidProvider_buildScaleLadder = function _HyperLiquidProvider_buildScaleLadder(options) {
    const { params, szDecimals, finalPositionSize } = options;
    const count = params.scaleNumOrders;
    const prices = (0, orderCalculations_js_1.computeScalePriceLadder)({
        minPrice: parseFloat(params.scaleMinPrice),
        maxPrice: parseFloat(params.scaleMaxPrice),
        count,
    }).map((price) => (0, hyperLiquidAdapter_js_1.formatHyperLiquidPrice)({ price, szDecimals }));
    if (new Set(prices).size !== prices.length) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SCALE_RANGE_INVALID);
    }
    // Throws ORDER_SCALE_SIZE_TOO_SMALL when a rung would round to nothing.
    const sizes = (0, orderCalculations_js_1.splitScaleSizes)({
        totalSize: finalPositionSize,
        count,
        szDecimals,
    });
    const minimumOrderSize = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getMinimumOrderSize).call(this);
    const cheapestRungNotional = Math.min(...sizes.map((size, index) => parseFloat(size) * parseFloat(prices[index])));
    if (cheapestRungNotional < minimumOrderSize) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_SCALE_NOTIONAL_TOO_SMALL);
    }
    return { prices, sizes };
}, _HyperLiquidProvider_placeTwapOrder = 
/**
 * Submit a TWAP through HyperLiquid's dedicated TWAP action.
 *
 * A TWAP is not an order on the book, so it does not go through the `order`
 * action, carries no builder fee, and comes back identified by a `twapId`
 * rather than an `oid`. That ID is the handle `cancelOrder` needs.
 *
 * @param params - Order parameters.
 * @param context - Prepared asset and sizing context.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_placeTwapOrder(params, context) {
    const { assetId, formattedSize } = context;
    const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Submitting TWAP order', {
        symbol: params.symbol,
        assetId,
        size: formattedSize,
        durationMinutes: params.twapDuration,
        randomize: params.twapRandomize ?? false,
    });
    const result = await exchangeClient.twapOrder({
        twap: {
            a: assetId,
            b: params.isBuy,
            s: formattedSize,
            r: params.reduceOnly ?? false,
            // Validation has already established this is a whole number of minutes
            // inside the venue's bounds.
            m: params.twapDuration,
            t: params.twapRandomize ?? false,
        },
    });
    if (result.status !== 'ok') {
        throw new Error(`TWAP order failed: ${JSON.stringify(result)}`);
    }
    const status = result.response?.data?.status;
    if (!isStatusObject(status) || !(0, utils_1.hasProperty)(status, 'running')) {
        const rawError = status?.error ??
            'TWAP order rejected';
        throw new Error(rawError);
    }
    const running = status.running;
    return {
        success: true,
        orderId: running.twapId.toString(),
        submittedSize: formattedSize,
    };
}, _HyperLiquidProvider_placeScaleOrder = 
/**
 * Fan a scale placement out into one batch of resting limit orders.
 *
 * The whole ladder goes in a single `order` action, which is one round trip
 * and one signature rather than one per rung. It is **not** atomic: an `na`
 * grouping evaluates each entry independently, so the response can report
 * some rungs resting and others rejected. A partial ladder is reported as
 * such — `submittedSize` covers only the rungs that actually rested — rather
 * than as a full submission.
 *
 * @param params - Order parameters.
 * @param context - Prepared asset and sizing context.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_placeScaleOrder(params, context) {
    const { assetId, szDecimals, formattedSize, ladder } = context;
    // Built and validated in `#prepareStrategyPlacement`, before anything was
    // signed, so what is submitted here is exactly what the minimums were
    // applied to.
    const { prices, sizes } = ladder;
    const count = prices.length;
    const orders = prices.map((price, index) => ({
        a: assetId,
        b: params.isBuy,
        p: price,
        s: sizes[index],
        r: params.reduceOnly ?? false,
        t: { limit: { tif: 'Gtc' } },
    }));
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Submitting scale ladder', {
        symbol: params.symbol,
        assetId,
        count,
        prices: orders.map((order) => order.p),
        sizes,
    });
    const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
    const result = await exchangeClient.order({
        orders,
        grouping: 'na',
        builder: await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderOrderContext).call(this),
    });
    if (result.status !== 'ok') {
        throw new Error(`Scale order failed: ${JSON.stringify(result)}`);
    }
    const statuses = result.response?.data?.statuses ?? [];
    // Which rung each ID came from matters: `submittedSize` has to add up the
    // slices that actually rested, not the total that was asked for.
    const restedRungs = statuses
        .map((status, index) => ({
        orderId: __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_readOrderIdFromStatus).call(this, status),
        size: sizes[index],
    }))
        .filter((rung) => rung.orderId !== undefined);
    // A ladder that came back with no IDs at all rested nothing; reporting it
    // as a success would hand the caller a handle that cancels nothing.
    if (restedRungs.length === 0) {
        throw new Error(`Scale order rejected: ${JSON.stringify(result.response?.data)}`);
    }
    const childOrderIds = restedRungs.map((rung) => rung.orderId);
    const groupId = (0, idUtils_js_1.generatePerpsId)('scale');
    __classPrivateFieldGet(this, _HyperLiquidProvider_scaleOrderGroups, "f").set(groupId, { assetId, orderIds: childOrderIds });
    // The batch is not atomic, so a ladder can come back part-rested. Reporting
    // the requested total as submitted would tell the caller they are exposed
    // for more than they are.
    const isPartial = restedRungs.length < count;
    if (isPartial) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Scale ladder only partly rested', {
            groupId,
            rested: restedRungs.length,
            requested: count,
            statuses,
        });
    }
    return {
        success: true,
        orderId: groupId,
        childOrderIds,
        submittedSize: isPartial
            ? (0, hyperLiquidAdapter_js_1.formatHyperLiquidSize)({
                size: restedRungs.reduce((total, rung) => total + parseFloat(rung.size), 0),
                szDecimals,
            })
            : formattedSize,
    };
}, _HyperLiquidProvider_startChaseSession = 
/**
 * Place a chase's first order and register the session that follows it.
 *
 * Split from the routing above so the concurrency reservation there wraps
 * every await in one `try`/`finally`.
 *
 * @param params - Order parameters.
 * @param context - Prepared asset and sizing context.
 * @param generation - Teardown generation captured before any await.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_startChaseSession(params, context, generation) {
    const { assetId, szDecimals, formattedSize } = context;
    // The preamble is several round trips long. A disconnect during it has
    // already torn down everything this session would run on, so the chase
    // stops here rather than reading the book and putting a fresh order on it
    // for a provider that no longer exists.
    if (generation !== __classPrivateFieldGet(this, _HyperLiquidProvider_chaseGeneration, "f")) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_CHASE_ABANDONED);
    }
    const quotePrice = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getChaseQuotePrice).call(this, {
        symbol: params.symbol,
        isBuy: params.isBuy,
        szDecimals,
    });
    if (quotePrice === 'gone') {
        // No own order to be gone on a first placement; narrows the union.
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_CHASE_TOUCH_UNAVAILABLE);
    }
    // The book read is a round trip of its own, so the check above does not
    // cover it. Re-checked here, immediately before the only statement that
    // signs anything: every await on this path is now followed by a refusal
    // before the next one, leaving one window that cannot be closed from here
    // — a disconnect arriving while the submission itself is in flight, which
    // the check after it handles.
    if (generation !== __classPrivateFieldGet(this, _HyperLiquidProvider_chaseGeneration, "f")) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_CHASE_ABANDONED);
    }
    // Read once, while the caller's fee-source context is still set.
    const builder = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderOrderContext).call(this);
    // Held onto rather than looked up again after the submission returns.
    // `disconnect` drops the service's client reference synchronously, so a
    // retraction that asked for a client after the fact would be refused one
    // and leave the order resting under the account that placed it. This
    // instance signed the order and can still cancel it as that account.
    const placingClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
    const orderId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_restChaseOrder).call(this, {
        assetId,
        isBuy: params.isBuy,
        price: quotePrice,
        size: formattedSize,
        reduceOnly: params.reduceOnly ?? false,
        builderFee: builder.f,
        builderAddress: builder.b,
        exchangeClient: placingClient,
    });
    const intervalMs = params.chaseIntervalMs ?? perpsConfig_js_1.CHASE_ORDER_CONFIG.DefaultIntervalMs;
    const sessionId = (0, idUtils_js_1.generatePerpsId)('chase');
    const session = {
        symbol: params.symbol,
        assetId,
        isBuy: params.isBuy,
        size: formattedSize,
        szDecimals,
        reduceOnly: params.reduceOnly ?? false,
        orderId,
        pendingReplacement: null,
        restingPrice: quotePrice,
        intervalMs,
        builderFee: builder.f,
        builderAddress: builder.b,
        deadline: Date.now() +
            (params.chaseMaxDurationMs ?? perpsConfig_js_1.CHASE_ORDER_CONFIG.DefaultMaxDurationMs),
        maxRepricings: params.chaseMaxRepricings ?? perpsConfig_js_1.CHASE_ORDER_CONFIG.DefaultMaxRepricings,
        repricings: 0,
        timer: null,
        active: true,
    };
    // A disconnect landed while the submission was in flight — the one window
    // the checks above cannot close. The order rested, but no strategy is
    // running behind it and no handle names it, so this placement is reported
    // as a failure. That makes the resting order an orphan: the caller is told
    // the chase failed, nothing refreshes the caches a successful placement
    // would have invalidated, and the exchange id is only usable for as long as
    // the provider stays pointed at the account that placed it — a disconnect
    // is usually followed by an account or network switch, after which handing
    // the id back is no remedy at all. So it is cancelled here, through the
    // client that signed it — the account switch cannot reach that instance —
    // and the failure is then true of the venue as well as of this provider.
    // Best-effort still: the transport underneath that client may already be
    // closing, so a cancel that does not land falls back to reporting the id.
    if (generation !== __classPrivateFieldGet(this, _HyperLiquidProvider_chaseGeneration, "f")) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase placement outlived its provider', {
            orderId,
            restingPrice: quotePrice,
        });
        const outcome = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_retractOrphanedChaseOrder).call(this, session, placingClient);
        return (0, hyperLiquidValidation_js_1.createErrorResult)(new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_CHASE_ABANDONED), {
            success: false,
            // Reported only when the retraction did not take. Naming an order
            // that is no longer on the book would send the caller to cancel
            // something already gone; naming one that still rests is the only
            // route left to it.
            ...(outcome === 'refused' ? { childOrderIds: [orderId] } : {}),
            submittedSize: formattedSize,
        });
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").set(sessionId, session);
    __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_scheduleChaseTick).call(this, sessionId);
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase session started', {
        sessionId,
        symbol: params.symbol,
        orderId,
        restingPrice: quotePrice,
        intervalMs,
    });
    return {
        success: true,
        orderId: sessionId,
        childOrderIds: [orderId],
        submittedSize: formattedSize,
    };
}, _HyperLiquidProvider_getChaseQuotePrice = 
/**
 * Read the price a chase must rest at: the best bid for a buy, the best ask
 * for a sell.
 *
 * The touch, not the mid: a post-only order priced at the mid would either
 * cross or be rejected, and a chase that never rests at the front of the
 * queue is not chasing anything.
 *
 * @param params - The lookup parameters.
 * @param params.symbol - Market to read.
 * @param params.isBuy - Which side the chase rests on.
 * @param params.szDecimals - Asset size precision, for price formatting.
 * @param params.own - The chase's own resting order, excluded from the book.
 * @param params.own.orderId - Exchange ID of that order.
 * @param params.own.price - Price that order rests at.
 * @param params.own.size - Size it was last placed for.
 * @returns The formatted price the chase should rest at, or `'gone'` when the
 * order it was chasing is no longer live.
 */
async function _HyperLiquidProvider_getChaseQuotePrice(params) {
    const { symbol, isBuy, szDecimals, own } = params;
    const book = await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient().l2Book({
        coin: symbol,
    });
    // `levels` is [bids, asks], each best-first.
    const ownSide = book?.levels?.[isBuy ? 0 : 1];
    const netting = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_resolveOwnRestingSizes).call(this, {
        symbol,
        isBuy,
        callerOrderId: own?.orderId,
        ownSide,
    });
    if (netting === 'gone') {
        return 'gone';
    }
    const bestBid = readBestExternalPrice(book?.levels?.[0], netting);
    const bestAsk = readBestExternalPrice(book?.levels?.[1], netting);
    if (bestBid === null || bestAsk === null) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_CHASE_TOUCH_UNAVAILABLE);
    }
    return (0, orderCalculations_js_1.computeChaseQuotePrice)({ bestBid, bestAsk, isBuy, szDecimals });
}, _HyperLiquidProvider_restChaseOrder = 
/**
 * Rest one post-only order for a chase and return its exchange ID.
 *
 * @param params - The placement parameters.
 * @param params.assetId - Resolved asset ID.
 * @param params.isBuy - Order side.
 * @param params.price - Formatted limit price.
 * @param params.size - Formatted size.
 * @param params.reduceOnly - Whether the order may only reduce a position.
 * @param params.builderFee - Builder fee, in tenths of a basis point, captured
 * when the session started so replacements keep the rate they were quoted at.
 * @param params.builderAddress - Builder address captured with the fee.
 * @param params.exchangeClient - Client to submit through. Passed in rather
 * than looked up here so a first placement can keep the instance it signed
 * with, which is the only one that can take the order back once `disconnect`
 * has dropped the service's reference.
 * @returns The resting order's exchange ID.
 */
async function _HyperLiquidProvider_restChaseOrder(params) {
    const result = await params.exchangeClient.order({
        orders: [
            {
                a: params.assetId,
                b: params.isBuy,
                p: params.price,
                s: params.size,
                r: params.reduceOnly,
                // Post-only: a chase adds liquidity at the touch. Crossing would end
                // the chase on its first tick at a worse price than resting does.
                t: { limit: { tif: 'Alo' } },
            },
        ],
        grouping: 'na',
        builder: {
            b: params.builderAddress,
            f: params.builderFee,
        },
    });
    if (result.status !== 'ok') {
        throw new Error(`Chase order failed: ${JSON.stringify(result)}`);
    }
    const orderId = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_readOrderIdFromStatus).call(this, result.response?.data?.statuses?.[0]);
    if (!orderId) {
        throw new Error(`Chase order rejected: ${JSON.stringify(result.response?.data)}`);
    }
    return orderId;
}, _HyperLiquidProvider_scheduleChaseTick = function _HyperLiquidProvider_scheduleChaseTick(sessionId) {
    const session = __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").get(sessionId);
    if (!session?.active) {
        return;
    }
    const timer = setTimeout(() => {
        // A rejected tick must not stop the session from being cancellable, and
        // must not surface as an unhandled rejection either.
        __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_runChaseTick).call(this, sessionId).catch((error) => {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase tick failed', {
                sessionId,
                error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.chaseTick').message,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_recoverFailedChaseTick).call(this, sessionId);
        });
    }, session.intervalMs);
    // Node keeps the process alive for a pending timer; a background chase is
    // not a reason to hold an exiting process open. React Native's timers have
    // no `unref`, hence the guard.
    timer.unref?.();
    session.timer = timer;
}, _HyperLiquidProvider_recoverFailedChaseTick = function _HyperLiquidProvider_recoverFailedChaseTick(sessionId) {
    const session = __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").get(sessionId);
    if (!session?.active) {
        return;
    }
    if (session.orderId === null) {
        session.active = false;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase ended with nothing resting', {
            sessionId,
        });
        return;
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_scheduleChaseTick).call(this, sessionId);
}, _HyperLiquidProvider_runChaseTick = 
/**
 * Advance one chase session: re-price if the touch has moved, stop if the
 * window has closed.
 *
 * @param sessionId - Session to advance.
 */
async function _HyperLiquidProvider_runChaseTick(sessionId) {
    const session = __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").get(sessionId);
    if (!session?.active) {
        return;
    }
    if (Date.now() >= session.deadline) {
        // The window closed. The last order stays resting as an ordinary limit
        // order and the session stays registered, so cancelling by its handle
        // still reaches that order.
        session.active = false;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase session window closed', { sessionId });
        return;
    }
    const quotePrice = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getChaseQuotePrice).call(this, {
        symbol: session.symbol,
        isBuy: session.isBuy,
        szDecimals: session.szDecimals,
        own: session.orderId
            ? {
                orderId: session.orderId,
                price: session.restingPrice,
                size: session.size,
            }
            : undefined,
    });
    if (quotePrice === 'gone') {
        // The order left the book without the loop seeing it — it filled. Ending
        // here releases its slot against the venue's concurrency cap instead of
        // holding one until the window closes.
        session.orderId = null;
        session.active = false;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase order filled between ticks', {
            sessionId,
        });
        return;
    }
    // The book read is a round trip, and a cancel arriving during it stops the
    // session. Without this re-check the tick would cancel and re-place the very
    // order the caller just asked to be rid of.
    if (!session.active) {
        return;
    }
    if (quotePrice !== session.restingPrice && session.orderId) {
        const outcome = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_cancelChaseChild).call(this, session);
        // The cancel is a second round trip, and this is the window where a
        // caller's `cancelOrder` does the most damage: it would cancel the order
        // this tick has already cancelled, report the cancel incomplete, and then
        // this tick would rest a replacement the caller has no idea exists.
        // Stopping here leaves nothing on the book.
        if (!session.active) {
            // A refused cancel leaves the child resting. Preserve its ID so the
            // caller that stopped this session can report an incomplete cancel and
            // retry it instead of orphaning the order.
            if (outcome !== 'refused') {
                session.orderId = null;
            }
            return;
        }
        if (outcome === 'refused') {
            // The exchange kept the order, so it is still resting at the old price.
            // Placing the replacement anyway would double the position. Leave it
            // alone and try again on the next tick, which is why this falls through
            // to the reschedule below rather than ending the session.
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase reprice cancel refused', {
                sessionId,
                orderId: session.orderId,
            });
        }
        else if (outcome === 'gone') {
            // The order left the book between ticks: it filled, or something else
            // cancelled it. There is nothing left to chase.
            session.orderId = null;
            session.active = false;
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase order no longer resting', {
                sessionId,
            });
            return;
        }
        else {
            // The cancel is confirmed, so the session owns nothing from here on.
            // Recorded before the read rather than after it: a read that rejects
            // would otherwise leave the session naming an order that is already off
            // the book, and recovery would reschedule a chase with nothing resting.
            const cancelledOrderId = session.orderId;
            session.orderId = null;
            // No further fills can reach a cancelled order, so what it did not fill
            // is now fixed. Sampling before the cancel would have left a window in
            // which a fill lands and is then re-placed.
            const remaining = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_readOrderRemainder).call(this, cancelledOrderId);
            // Another round trip, another window for a cancel to land. By now the
            // old order is already off the book, so a cancel that arrived during it
            // found nothing to cancel and reported success — resting a replacement
            // after that would put an order on the book the caller believes is gone
            // and has no handle for.
            if (!session.active || !__classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").has(sessionId)) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase cancelled mid-reprice', {
                    sessionId,
                });
                return;
            }
            if (remaining === null) {
                // It filled completely between ticks; there is nothing left to chase.
                session.active = false;
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase order fully filled', { sessionId });
                return;
            }
            // Published *before* the placement starts, not from the promise it
            // returns: the window opens the moment `#restChaseOrder` is entered, so
            // deriving the marker from its return value would leave the synchronous
            // prefix of that call unguarded. A cancel arriving anywhere inside the
            // round trip now waits for the replacement to land instead of reading
            // the null `orderId` as "nothing rests", reporting success, and dropping
            // the handle while this call is still putting an order on the book.
            let settleReplacement;
            session.pendingReplacement = new Promise((resolve) => {
                settleReplacement = resolve;
            });
            try {
                session.orderId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_restChaseOrder).call(this, {
                    assetId: session.assetId,
                    isBuy: session.isBuy,
                    price: quotePrice,
                    size: remaining,
                    reduceOnly: session.reduceOnly,
                    builderFee: session.builderFee,
                    builderAddress: session.builderAddress,
                    // A running session is on a live provider, so the current client is
                    // the right one; only the first placement has a teardown to survive.
                    exchangeClient: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient(),
                });
                session.size = remaining;
            }
            finally {
                // Cleared before the waiters wake, so they see the settled session.
                session.pendingReplacement = null;
                settleReplacement?.();
            }
            session.restingPrice = quotePrice;
            session.repricings += 1;
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase re-priced', {
                sessionId,
                orderId: session.orderId,
                restingPrice: quotePrice,
                size: session.size,
                repricings: session.repricings,
            });
            // A cancel that arrived during the round trip is now waiting on this
            // session; it cancels the order just recorded above. A `disconnect`
            // deregisters the session instead, and deliberately leaves resting
            // orders alone — logged with its ID so it stays traceable.
            if (!__classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").has(sessionId)) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase replacement outlived its session', {
                    sessionId,
                    orderId: session.orderId,
                });
                return;
            }
            if (!session.active) {
                return;
            }
        }
    }
    if (session.repricings >= session.maxRepricings) {
        session.active = false;
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase repricing cap reached', { sessionId });
        return;
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_scheduleChaseTick).call(this, sessionId);
}, _HyperLiquidProvider_resolveOwnRestingSizes = 
/**
 * Resolve how much of the chase's own order is really sitting on its level.
 *
 * The session tracks what its order was last *placed* for, which overstates
 * the order once it partially fills. Over-subtracting only matters when it
 * would net the level away entirely — while the level still shows more size
 * than the order could possibly hold, the level has external liquidity either
 * way and the stale figure is good enough.
 *
 * So the live size is fetched only in the ambiguous case, which keeps the
 * common tick to a single book read rather than doubling the request rate
 * against the venue for every chase on every interval.
 *
 * @param params - Netting parameters.
 * @param params.symbol - Market being quoted.
 * @param params.isBuy - Side being quoted.
 * @param params.callerOrderId - The asking session's order, if it has one.
 * @param params.ownSide - The side of the book those orders rest on.
 * @returns Our resting size at each price, or `'gone'` when the asking
 * session's own order is no longer live.
 */
async function _HyperLiquidProvider_resolveOwnRestingSizes(params) {
    const { symbol, isBuy, callerOrderId, ownSide } = params;
    // Every chase this provider is running on this side, the caller included.
    const ourOrders = [...__classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").values()]
        .filter((session) => session.orderId !== null &&
        session.symbol === symbol &&
        session.isBuy === isBuy)
        .map((session) => ({
        orderId: session.orderId,
        price: session.restingPrice,
        size: session.size,
    }));
    if (ourOrders.length === 0) {
        return new Map();
    }
    const recorded = new Map();
    for (const order of ourOrders) {
        recorded.set(order.price, (recorded.get(order.price) ?? 0) + parseFloat(order.size));
    }
    // A level holding more than we possibly could has external size regardless,
    // so the recorded figures cannot change the answer there and are left as
    // they are. Elsewhere the recorded sizes may overstate what is really
    // resting — an order partially fills without the loop seeing it — and only
    // then is a lookup worth a round trip.
    const ambiguous = ourOrders.filter((order) => {
        const level = ownSide?.find((entry) => entry.px === order.price);
        return !level || parseFloat(level.sz) <= (recorded.get(order.price) ?? 0);
    });
    let callerIsGone = false;
    for (const order of ambiguous) {
        try {
            const live = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_readOrderRemainder).call(this, order.orderId);
            const delta = (live === null ? 0 : parseFloat(live)) - parseFloat(order.size);
            recorded.set(order.price, Math.max(0, (recorded.get(order.price) ?? 0) + delta));
            if (live === null && order.orderId === callerOrderId) {
                callerIsGone = true;
            }
        }
        catch (error) {
            // A failed lookup must not stop the chase. Keeping the recorded size can
            // only over-subtract, which quotes a level deeper rather than leaving
            // the order stranded at a stale price.
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase own-size lookup failed', {
                orderId: order.orderId,
                error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.chaseOwnSize').message,
            });
        }
    }
    return callerIsGone ? 'gone' : recorded;
}, _HyperLiquidProvider_readOrderRemainder = 
/**
 * Read what a chase's just-cancelled order left unfilled.
 *
 * A chase re-prices by cancelling and re-placing, and the order it cancels
 * may have partially filled first; re-placing the session's original size
 * would execute more than the caller asked for.
 *
 * Read *after* the cancel on purpose. The order's status endpoint answers for
 * an order that is no longer on the book, and once the cancel has landed no
 * further fills can reach it — so the unfilled size it reports is final.
 * Sampling the open-order book beforehand would instead leave a one-round-trip
 * window in which a fill lands and is then re-placed on top.
 *
 * @param orderId - Exchange ID of the order that was just cancelled.
 * @returns The unfilled size, or null when nothing is left to chase.
 */
async function _HyperLiquidProvider_readOrderRemainder(orderId) {
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
    const status = await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient().orderStatus({
        user: userAddress,
        oid: parseInt(orderId, 10),
    });
    if (status.status !== 'order') {
        return null;
    }
    const remaining = String(status.order.order.sz);
    return parseFloat(remaining) > 0 ? remaining : null;
}, _HyperLiquidProvider_cancelChaseChild = 
/**
 * Cancel the order a chase session currently has resting.
 *
 * @param session - The session whose child to cancel.
 * @param placingClient - Client to cancel through. Omitted by every cancel on
 * a live provider, which wants the current one; an abandoned placement passes
 * the client it signed with, the only one still able to reach its order.
 * @returns Whether the order was cancelled, was already gone, or still rests.
 */
async function _HyperLiquidProvider_cancelChaseChild(session, placingClient) {
    if (!session.orderId) {
        return 'gone';
    }
    // Looked up only once there is something to cancel, so a session with
    // nothing resting still answers on a provider whose client is already gone.
    const exchangeClient = placingClient ?? __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
    const result = await exchangeClient.cancel({
        cancels: [{ a: session.assetId, o: parseInt(session.orderId, 10) }],
    });
    return classifyCancelStatus(result.response?.data?.statuses?.[0]);
}, _HyperLiquidProvider_retractOrphanedChaseOrder = 
/**
 * Take back the order of a chase that was abandoned before it registered.
 *
 * Best-effort by construction: the provider is already being torn down, so a
 * cancel that fails outright is reported rather than retried or thrown. The
 * caller reports the placement as a failure either way — the outcome only
 * decides whether an exchange id is worth handing back with it.
 *
 * @param session - The unregistered session holding the resting order.
 * @param placingClient - The client the order was signed with. The service's
 * own reference is already cleared by the time this runs, so asking it for a
 * client here would fail before a cancel was ever sent.
 * @returns Whether the order was cancelled, was already gone, or still rests.
 */
async function _HyperLiquidProvider_retractOrphanedChaseOrder(session, placingClient) {
    try {
        const outcome = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_cancelChaseChild).call(this, session, placingClient);
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Retracted abandoned chase order', {
            orderId: session.orderId,
            outcome,
        });
        return outcome;
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Could not retract abandoned chase order', {
            orderId: session.orderId,
            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.startChaseSession')
                .message,
        });
        return 'refused';
    }
}, _HyperLiquidProvider_stopChaseSession = function _HyperLiquidProvider_stopChaseSession(sessionId) {
    const session = __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").get(sessionId);
    if (!session) {
        return;
    }
    session.active = false;
    if (session.timer) {
        clearTimeout(session.timer);
        session.timer = null;
    }
}, _HyperLiquidProvider_cancelStrategyOrder = 
/**
 * Cancel a strategy placement by its handle.
 *
 * @param params - Cancellation parameters.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_cancelStrategyOrder(params) {
    try {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Canceling strategy order:', params);
        if (params.orderType === 'twap') {
            return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_cancelTwapOrder).call(this, params);
        }
        if (params.orderType === 'scale') {
            return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_cancelScaleOrder).call(this, params);
        }
        return await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_cancelChaseOrder).call(this, params);
    }
    catch (error) {
        const mappedError = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mapError).call(this, error);
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error(mappedError, await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getTradingErrorContext).call(this, 'cancelOrder', mappedError, {
            orderId: params.orderId,
            coin: params.symbol,
            orderType: params.orderType,
        }));
        return (0, hyperLiquidValidation_js_1.createErrorResult)(mappedError, {
            success: false,
            orderId: params.orderId,
        });
    }
}, _HyperLiquidProvider_cancelTwapOrder = 
/**
 * Cancel a running TWAP through the venue's TWAP cancel action.
 *
 * A TWAP never rested on the book, so the ordinary `cancel` action has no
 * order ID to match and would reject it.
 *
 * @param params - Cancellation parameters, with `orderId` carrying the TWAP ID.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_cancelTwapOrder(params) {
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReady).call(this);
    const coinValidation = (0, hyperLiquidValidation_js_1.validateCoinExists)(params.symbol, __classPrivateFieldGet(this, _HyperLiquidProvider_symbolToAssetId, "f"));
    if (!coinValidation.isValid) {
        throw new Error(coinValidation.error);
    }
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
    const assetId = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAssetIdWithRepair).call(this, {
        symbol: params.symbol,
        dexName: (0, hyperLiquidAdapter_js_1.parseAssetName)(params.symbol).dex,
    });
    const result = await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient().twapCancel({
        a: assetId,
        t: parseInt(params.orderId, 10),
    });
    const status = result.response?.data?.status;
    if (status === 'success') {
        return { success: true, orderId: params.orderId };
    }
    const rawError = status?.error ??
        'TWAP cancellation failed';
    return (0, hyperLiquidValidation_js_1.createErrorResult)(__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_mapError).call(this, new Error(rawError)), {
        success: false,
        orderId: params.orderId,
    });
}, _HyperLiquidProvider_cancelScaleOrder = 
/**
 * Cancel every child of a scale ladder in one batch.
 *
 * @param params - Cancellation parameters, with `orderId` carrying the group handle.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_cancelScaleOrder(params) {
    const group = __classPrivateFieldGet(this, _HyperLiquidProvider_scaleOrderGroups, "f").get(params.orderId);
    if (!group) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_STRATEGY_HANDLE_UNKNOWN);
    }
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
    const result = await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient().cancel({
        cancels: group.orderIds.map((orderId) => ({
            a: group.assetId,
            o: parseInt(orderId, 10),
        })),
    });
    const statuses = result.response?.data?.statuses ?? [];
    // A rung that filled or was cancelled individually comes back as a
    // rejection, but nothing of it is resting — counting it as still live would
    // pin the handle open for a ladder that is entirely off the book.
    const remaining = group.orderIds.filter((_unused, index) => classifyCancelStatus(statuses[index]) === 'refused');
    if (remaining.length === 0) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_scaleOrderGroups, "f").delete(params.orderId);
        return { success: true, orderId: params.orderId };
    }
    // A rung the exchange refused to cancel may still be resting. Keeping the
    // handle registered against what is left means the caller can retry the
    // same cancel rather than being told the ladder is gone when it is not.
    __classPrivateFieldGet(this, _HyperLiquidProvider_scaleOrderGroups, "f").set(params.orderId, {
        assetId: group.assetId,
        orderIds: remaining,
    });
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Scale group cancel left children resting', {
        groupId: params.orderId,
        remaining: remaining.length,
        total: group.orderIds.length,
    });
    return (0, hyperLiquidValidation_js_1.createErrorResult)(new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_STRATEGY_CANCEL_INCOMPLETE), { success: false, orderId: params.orderId });
}, _HyperLiquidProvider_cancelChaseOrder = 
/**
 * Stop a chase session and cancel whatever it still has resting.
 *
 * @param params - Cancellation parameters, with `orderId` carrying the session handle.
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_cancelChaseOrder(params) {
    const session = __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").get(params.orderId);
    if (!session) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_STRATEGY_HANDLE_UNKNOWN);
    }
    // Stopped first: a tick that fired between here and the cancel below would
    // otherwise re-place the very order being cancelled.
    __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_stopChaseSession).call(this, params.orderId);
    // A replacement already in flight cannot be called off, so the cancel waits
    // for it and then cancels whatever it rested. Deciding without waiting would
    // read the session's null `orderId` as "nothing rests" and report a clean
    // cancellation over an order that was about to appear on the book.
    if (session.pendingReplacement) {
        await session.pendingReplacement;
    }
    // Nothing rests: the order filled, something else cancelled it, or a
    // replacement failed to go up. Either way the session ends cleanly.
    if (session.orderId === null) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").delete(params.orderId);
        return { success: true, orderId: params.orderId };
    }
    await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureReadyForTrading).call(this);
    // Only a refusal leaves an order behind. A child that had already filled or
    // been cancelled is reported as a rejection too, but nothing of it is
    // resting — treating that as a failure would pin the handle open forever on
    // a chase that is entirely finished.
    if ((await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_cancelChaseChild).call(this, session)) === 'refused') {
        // The order is still resting. The session stays registered — stopped, but
        // still cancellable — so the caller can retry with the same handle.
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Chase cancel left its order resting', {
            sessionId: params.orderId,
            orderId: session.orderId,
        });
        return (0, hyperLiquidValidation_js_1.createErrorResult)(new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_STRATEGY_CANCEL_INCOMPLETE), { success: false, orderId: params.orderId });
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_chaseSessions, "f").delete(params.orderId);
    return { success: true, orderId: params.orderId };
}, _HyperLiquidProvider_readOrderIdFromStatus = function _HyperLiquidProvider_readOrderIdFromStatus(status) {
    if (!isStatusObject(status)) {
        return undefined;
    }
    // `hasProperty` types the property as `unknown`, so each branch is cast to
    // the only shape the exchange puts there.
    const restingOrder = (0, utils_1.hasProperty)(status, 'resting')
        ? status.resting
        : undefined;
    const filledOrder = (0, utils_1.hasProperty)(status, 'filled')
        ? status.filled
        : undefined;
    return (restingOrder?.oid?.toString() ?? filledOrder?.oid?.toString() ?? undefined);
}, _HyperLiquidProvider_getDiscountedBuilderFee = function _HyperLiquidProvider_getDiscountedBuilderFee() {
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_userFeeDiscountBips, "f") === undefined) {
        return hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeTenthsBps;
    }
    return Math.floor(hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeTenthsBps *
        (1 - __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeDiscountBips, "f") / hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR));
}, _HyperLiquidProvider_getBuilderOrderContext = 
/**
 * Resolve the builder payload for the current operation.
 *
 * Subscription waivers use their dedicated builder only after approval is
 * cached for this provider/account session. Until then, the ordinary builder
 * and standard fee keep the trade attributable and non-blocking.
 *
 * @returns HyperLiquid builder address and fee payload.
 */
async function _HyperLiquidProvider_getBuilderOrderContext() {
    const isTestnet = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode();
    const network = isTestnet ? 'testnet' : 'mainnet';
    const defaultBuilder = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderAddress).call(this, isTestnet);
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_userFeeResolution, "f")?.source === 'subscription') {
        const subscriptionBuilder = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getSubscriptionBuilderAddress).call(this, isTestnet);
        const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
        if (subscriptionBuilder &&
            __classPrivateFieldGet(this, _HyperLiquidProvider_approvedBuilderAddresses, "f").has(__classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getApprovedBuilderKey).call(this, network, userAddress, subscriptionBuilder))) {
            return { b: subscriptionBuilder, f: 0 };
        }
        return {
            b: defaultBuilder,
            f: hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MaxFeeTenthsBps,
        };
    }
    return { b: defaultBuilder, f: __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getDiscountedBuilderFee).call(this) };
}, _HyperLiquidProvider_fetchOpenOrders = 
/**
 * Read the account's currently resting orders.
 *
 * @param params - The lookup parameters.
 * @param params.dexName - DEX to query, or null for the main DEX.
 * @returns The raw open orders.
 */
async function _HyperLiquidProvider_fetchOpenOrders(params) {
    const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
    return await __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient().frontendOpenOrders({
        user: userAddress,
        dex: params.dexName ?? undefined,
    });
}, _HyperLiquidProvider_resolveReplacementOrderId = 
/**
 * Resolve the order id that a `modify` rested the replacement under.
 *
 * HyperLiquid does not edit an order in place: it cancels the target and
 * rests a replacement under a NEW oid, which the SDK's modify response does
 * not carry. The submitted oid therefore names an order that no longer
 * exists, so the only honest source of identity is a post-modify read.
 *
 * An id is returned only when exactly one newly-rested order carries the
 * attributes just submitted. Everything else leaves it absent: a market edit
 * that filled rather than rested, a read that has not caught up yet, or two
 * equally plausible candidates. Novelty is judged against the pre-edit
 * snapshot rather than attributes alone, because an order that was already
 * resting can share a market, side and size with the replacement.
 *
 * @param params - The resolution parameters.
 * @param params.previousOrders - Orders resting immediately before the edit.
 * @param params.dexName - DEX to query, or null for the main DEX.
 * @param params.symbol - Market the edit was submitted against.
 * @param params.isBuy - Direction submitted.
 * @param params.size - Formatted size submitted.
 * @returns The replacement order id, or undefined when it cannot be resolved unambiguously.
 */
async function _HyperLiquidProvider_resolveReplacementOrderId(params) {
    try {
        const previousOrderIds = new Set(params.previousOrders.map((order) => order.oid.toString()));
        const ordersAfterEdit = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_fetchOpenOrders).call(this, {
            dexName: params.dexName,
        });
        const submittedSize = parseFloat(params.size);
        const candidates = ordersAfterEdit.filter((order) => !previousOrderIds.has(order.oid.toString()) &&
            order.coin === params.symbol &&
            (order.side === 'B') === params.isBuy &&
            parseFloat(order.sz) === submittedSize);
        return candidates.length === 1 ? candidates[0].oid.toString() : undefined;
    }
    catch (error) {
        // The modify was accepted; only the identity lookup failed. Reporting a
        // failed edit here would misstate an order that really was changed.
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Could not resolve the replacement order id after modify:', error);
        return undefined;
    }
}, _HyperLiquidProvider_getStandaloneValidatedDexs = 
/**
 * Get validated DEXs for standalone mode using a standalone InfoClient.
 * Similar to getValidatedDexs() but doesn't require full initialization.
 * Reuses cachedValidatedDexs to avoid redundant perpDexs() calls.
 *
 * @returns A promise that resolves to the result.
 */
async function _HyperLiquidProvider_getStandaloneValidatedDexs() {
    // Return cached result if available (unified state)
    if (__classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state?.validated) {
        return __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").state.validated;
    }
    // Kill switch: HIP-3 disabled, return main DEX only
    if (!__classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f")) {
        const state = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").update([null]);
        return state.validated;
    }
    // Fetch available DEXs via standalone client
    const standaloneInfoClient = (0, standaloneInfoClient_js_1.createStandaloneInfoClient)({
        isTestnet: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode(),
    });
    let allDexs;
    try {
        allDexs = await standaloneInfoClient.perpDexs();
    }
    catch {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: standalone perpDexs() failed, falling back to main DEX only');
        // Do not cache — transient error, allow retry on next call
        return [null];
    }
    // Validate response
    if (!allDexs || !Array.isArray(allDexs)) {
        // Do not cache — may be transient, allow retry on next call
        return [null];
    }
    // Atomically update unified state (raw + validated + timestamp).
    // buildAssetMapping uses state.raw for perpDexIndex computation.
    const state = __classPrivateFieldGet(this, _HyperLiquidProvider_dexDiscoveryCache, "f").update(allDexs);
    return state.validated;
}, _HyperLiquidProvider_queryDexPositions = 
/**
 * Query one DEX's positions directly, preserving whether that DEX answered.
 *
 * `getPositions()` fans out across every enabled DEX, flattens the subset that
 * answered and converts any thrown error into an empty array, so its result
 * cannot distinguish "this DEX answered and holds no positions" from "this
 * DEX's request failed or it was never queried". `closePosition` needs that
 * distinction: the first means the position is closed and the close must fail
 * before submitting, the second means the absence proves nothing and the
 * caller's snapshot should stand.
 *
 * TP/SL enrichment is skipped, as in standalone mode: the close path only reads
 * size, side and margin.
 *
 * @param dexName - DEX identifier, or null for the main DEX.
 * @returns Whether the DEX answered, and the positions it reported.
 */
async function _HyperLiquidProvider_queryDexPositions(dexName) {
    try {
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_ensureClientsInitialized).call(this);
        __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").ensureInitialized();
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
        const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
        const state = await infoClient.clearinghouseState(dexName ? { user: userAddress, dex: dexName } : { user: userAddress });
        const positions = (state.assetPositions ?? [])
            .filter((assetPos) => assetPos.position.szi !== '0')
            .map((assetPos) => (0, hyperLiquidAdapter_js_1.adaptPositionFromSDK)(assetPos));
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Target DEX position query answered', {
            dex: dexName ?? 'main',
            count: positions.length,
        });
        return { answered: true, positions };
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Target DEX position query failed; its silence proves nothing', {
            dex: dexName ?? 'main',
            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.queryDexPositions')
                .message,
        });
        return { answered: false, positions: [] };
    }
}, _HyperLiquidProvider_getAllMids = 
/**
 * Get allMids for a DEX — uses WS snapshot as primary source, REST as fallback.
 *
 * @param infoClient - The HyperLiquid info client (used only on cold start).
 * @param dexParam - Optional DEX parameter (empty string for main DEX).
 * @returns allMids record.
 */
async function _HyperLiquidProvider_getAllMids(infoClient, dexParam) {
    const wsSnapshot = __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").getLastAllMidsSnapshot?.(dexParam);
    if (wsSnapshot) {
        return wsSnapshot;
    }
    __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[getMarketDataWithPrices] No WS allMids snapshot, falling back to REST', { dexParam: dexParam ?? 'main' });
    const mids = await infoClient.allMids(dexParam ? { dex: dexParam } : undefined);
    return mids ?? {};
}, _HyperLiquidProvider_fetchSingleDexFresh = async function _HyperLiquidProvider_fetchSingleDexFresh(infoClient, dex) {
    const dexParam = dex ?? '';
    let metaAndCtxs = null;
    try {
        metaAndCtxs = (await infoClient.metaAndAssetCtxs(dexParam ? { dex: dexParam } : undefined));
    }
    catch (error) {
        return {
            dex,
            meta: null,
            assetCtxs: [],
            allMids: {},
            success: false,
            failedStep: 'metaAndAssetCtxs',
            errorMessage: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getMarketDataWithPrices.metaAndAssetCtxs').message,
        };
    }
    const meta = metaAndCtxs?.[0] ?? null;
    const assetCtxs = metaAndCtxs?.[1] ?? [];
    let dexAllMids = {};
    let allMidsErrorMessage;
    try {
        dexAllMids = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getAllMids).call(this, infoClient, dexParam || undefined);
    }
    catch (error) {
        allMidsErrorMessage = (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.getMarketDataWithPrices.allMids').message;
    }
    if (meta?.universe) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMetaByDex, "f").set(dexParam, meta);
        __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").setDexMetaCache(dexParam, meta);
        __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionService, "f").setDexAssetCtxsCache(dexParam, assetCtxs);
        await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_backfillAssetMapForDex).call(this, dex, meta);
    }
    return {
        dex,
        meta,
        assetCtxs,
        allMids: dexAllMids,
        success: Boolean(meta?.universe),
        failedStep: allMidsErrorMessage ? 'allMids' : undefined,
        errorMessage: allMidsErrorMessage,
    };
}, _HyperLiquidProvider_excludeNonUsdcCollateralResults = 
/**
 * Filter out successful HIP-3 DexFetchResults whose collateral token is
 * not USDC, so getMarketDataWithPrices enforces the same USDC-only policy
 * as market discovery (#fetchMarketsForDex) and order placement
 * (#handleHip3PreOrder) — otherwise a non-USDC HIP-3 market could appear
 * in overview data (and the cached stale snapshot derived from it) while
 * order placement rejects it (TAT-3304).
 *
 * Main-DEX results (dex === null) and already-failed results pass through
 * unchanged. #isUsdcCollateralDex fails closed, and on an unexpected
 * error checking it (e.g. a spotMeta fetch failure) this also fails
 * closed by dropping the DEX's result, rather than failing the whole
 * method and losing main-DEX overview data.
 *
 * @param results - The DEX fetch results to filter.
 * @returns A promise that resolves to the filtered results.
 */
async function _HyperLiquidProvider_excludeNonUsdcCollateralResults(results) {
    return Promise.all(results.map(async (result) => {
        if (result.dex === null || !result.success) {
            return result;
        }
        let isUsdcDex;
        try {
            isUsdcDex = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isUsdcCollateralDex).call(this, result.dex);
        }
        catch (error) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Failed to check collateral type for HIP-3 DEX; excluding from market data', {
                dex: result.dex,
                error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.excludeNonUsdcCollateralResults').message,
            });
            isUsdcDex = false;
        }
        if (isUsdcDex) {
            return result;
        }
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('HyperLiquidProvider: Excluding non-USDC-collateral HIP-3 DEX from market data', { dex: result.dex });
        return {
            ...result,
            meta: null,
            assetCtxs: [],
            allMids: {},
            success: false,
        };
    }));
}, _HyperLiquidProvider_mergeDexResultsInto = function _HyperLiquidProvider_mergeDexResultsInto(results, combinedUniverse, combinedAssetCtxs, combinedAllMids) {
    results.forEach((result) => {
        if (result.success && result.meta?.universe) {
            const marketsFromDex = result.meta.universe;
            const filteredMarkets = result.dex === null
                ? marketsFromDex
                : marketsFromDex.filter((asset) => (0, marketUtils_js_1.shouldIncludeMarket)(asset.name, result.dex, __classPrivateFieldGet(this, _HyperLiquidProvider_hip3Enabled, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_compiledAllowlistPatterns, "f"), __classPrivateFieldGet(this, _HyperLiquidProvider_compiledBlocklistPatterns, "f")));
            combinedUniverse.push(...filteredMarkets);
            combinedAssetCtxs.push(...result.assetCtxs);
            Object.assign(combinedAllMids, result.allMids);
        }
    });
}, _HyperLiquidProvider_cacheFreshMarketDataSnapshot = function _HyperLiquidProvider_cacheFreshMarketDataSnapshot(marketData, results) {
    const freshMarketData = marketData.map((market) => ({
        ...market,
        isStale: false,
    }));
    __classPrivateFieldSet(this, _HyperLiquidProvider_cachedMarketDataWithPrices, {
        data: freshMarketData.map((market) => ({ ...market })),
        timestamp: Date.now(),
        contributingDexs: results
            .filter((result) => result.success && result.meta?.universe)
            .map((result) => result.dex ?? 'main'),
        failedDexs: results
            .filter((result) => !result.success)
            .map((result) => result.dex ?? 'main'),
    }, "f");
    return freshMarketData;
}, _HyperLiquidProvider_getStaleMarketDataSnapshot = function _HyperLiquidProvider_getStaleMarketDataSnapshot() {
    if (!__classPrivateFieldGet(this, _HyperLiquidProvider_cachedMarketDataWithPrices, "f")) {
        return null;
    }
    return __classPrivateFieldGet(this, _HyperLiquidProvider_cachedMarketDataWithPrices, "f").data.map((market) => ({
        ...market,
        isStale: true,
    }));
}, _HyperLiquidProvider_isFeeCacheValid = function _HyperLiquidProvider_isFeeCacheValid(userAddress) {
    const cached = __classPrivateFieldGet(this, _HyperLiquidProvider_userFeeCache, "f").get(userAddress);
    if (!cached) {
        return false;
    }
    return Date.now() - cached.timestamp < cached.ttl;
}, _HyperLiquidProvider_getBuilderAddress = function _HyperLiquidProvider_getBuilderAddress(isTestnet) {
    // || intentional: env vars default to '' which must fall through to the hardcoded default
    if (isTestnet) {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        return __classPrivateFieldGet(this, _HyperLiquidProvider_builderAddressTestnet, "f") || hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.TestnetBuilder;
    }
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    return __classPrivateFieldGet(this, _HyperLiquidProvider_builderAddressMainnet, "f") || hyperLiquidConfig_js_1.BUILDER_FEE_CONFIG.MainnetBuilder;
}, _HyperLiquidProvider_getSubscriptionBuilderAddress = function _HyperLiquidProvider_getSubscriptionBuilderAddress(isTestnet) {
    return isTestnet
        ? __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionBuilderAddressTestnet, "f")
        : __classPrivateFieldGet(this, _HyperLiquidProvider_subscriptionBuilderAddressMainnet, "f");
}, _HyperLiquidProvider_getReferralCode = function _HyperLiquidProvider_getReferralCode(isTestnet) {
    return isTestnet
        ? hyperLiquidConfig_js_1.REFERRAL_CONFIG.TestnetCode
        : hyperLiquidConfig_js_1.REFERRAL_CONFIG.MainnetCode;
}, _HyperLiquidProvider_ensureReferralSet = 
/**
 * Ensure user has a MetaMask referral code set
 * Called once during initialization (ensureReady) to set up referral for the session
 * Uses GLOBAL cache to persist across provider reconnections
 * This prevents repeated signing requests for hardware wallets.
 *
 * Note: This is network-specific - testnet and mainnet have separate referral states
 * Note: Non-blocking - failures are logged to Sentry but don't prevent trading
 */
async function _HyperLiquidProvider_ensureReferralSet() {
    const isTestnet = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode();
    const network = isTestnet ? 'testnet' : 'mainnet';
    const expectedReferralCode = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getReferralCode).call(this, isTestnet);
    const referrerAddress = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderAddress).call(this, isTestnet);
    let userAddress;
    try {
        userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
    }
    catch {
        return; // Can't proceed without address
    }
    if (userAddress.toLowerCase() === referrerAddress.toLowerCase()) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] User is builder, skipping', { network });
        return;
    }
    // Skip the referral write for unfunded wallets — same proactive gate
    // as `#ensureUnifiedAccountEnabled`. `exchangeClient.setReferrer`
    // rejects with "User or API Wallet 0x... does not exist." for wallets
    // that have not yet deposited.
    const isRegistered = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isWalletOnHyperliquid).call(this, userAddress, network);
    if (!isRegistered) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Wallet not yet on Hyperliquid, deferring referral setup', { network });
        return;
    }
    // Check GLOBAL cache first
    const globalCached = TradingReadinessCache_js_1.PerpsSigningCache.getReferral(network, userAddress);
    if (globalCached?.attempted) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Using global cache (prevents hardware wallet prompt spam)', { network, success: globalCached.success });
        return;
    }
    // Check if another provider is currently attempting this
    const inFlightPromise = TradingReadinessCache_js_1.PerpsSigningCache.isInFlight('referral', network, userAddress);
    if (inFlightPromise) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Global in-flight, waiting...', { network });
        await inFlightPromise;
        return;
    }
    // Set global in-flight lock
    const completeInFlight = TradingReadinessCache_js_1.PerpsSigningCache.setInFlight('referral', network, userAddress);
    try {
        // Re-check cache after acquiring lock
        const recheckCache = TradingReadinessCache_js_1.PerpsSigningCache.getReferral(network, userAddress);
        if (recheckCache?.attempted) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Completed by another provider', { network });
            completeInFlight();
            return;
        }
        const isReady = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_isReferralCodeReady).call(this);
        if (!isReady) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Builder referral not ready, skipping', { network });
            completeInFlight();
            return; // Don't cache - retry when ready
        }
        // Check if user already has a referral on-chain
        const hasReferral = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_checkReferralSet).call(this);
        if (hasReferral) {
            // Already has referral on-chain
            TradingReadinessCache_js_1.PerpsSigningCache.setReferral(network, userAddress, {
                attempted: true,
                success: true,
            });
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Already has referral on-chain', { network });
        }
        else {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Setting referral (will show signing request)', { network, referralCode: expectedReferralCode });
            const result = await __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_setReferralCode).call(this);
            if (result) {
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Referral set successfully', { network });
                TradingReadinessCache_js_1.PerpsSigningCache.setReferral(network, userAddress, {
                    attempted: true,
                    success: true,
                });
            }
            else {
                TradingReadinessCache_js_1.PerpsSigningCache.setReferral(network, userAddress, {
                    attempted: true,
                    success: false,
                });
                __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Failed, cached to prevent retries', { network });
            }
        }
        completeInFlight();
    }
    catch (error) {
        // HyperLiquid wraps wallet signing failures and preserves KEYRING_LOCKED
        // in `cause`, so classify the full chain and leave retry caches empty.
        if ((0, errorUtils_js_1.isKeyringLockedError)(error)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Keyring locked, will retry later');
            completeInFlight();
            return;
        }
        // Safety net: wallet looked registered but the SDK still rejects with
        // "User or API Wallet 0x... does not exist." Do not forward to Sentry.
        // The walletRegistered cache stores positive observations only, so no
        // demotion is needed; the next entry will re-probe.
        if ((0, errorUtils_js_1.isHyperLiquidUserNotFoundError)(error)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Wallet not on Hyperliquid (race/stale-cache), deferring referral', { network, user: userAddress });
            completeInFlight();
            return;
        }
        // Cache failure to prevent retries
        TradingReadinessCache_js_1.PerpsSigningCache.setReferral(network, userAddress, {
            attempted: true,
            success: false,
        });
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[ensureReferralSet] Error, cached to prevent retries', {
            network,
            error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.ensureReferralSet')
                .message,
        });
        completeInFlight();
        // Non-blocking: Log to Sentry but don't throw
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.ensureReferralSet'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'ensureReferralSet', {
            note: 'Referral setup failed (non-blocking), cached to prevent retries',
        }));
    }
}, _HyperLiquidProvider_isReferralCodeReady = 
/**
 * Check if the referral code is ready to be used
 *
 * @returns Promise resolving to true if referral code is ready
 */
async function _HyperLiquidProvider_isReferralCodeReady() {
    try {
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
        const isTestnet = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode();
        const code = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getReferralCode).call(this, isTestnet);
        const referrerAddr = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderAddress).call(this, isTestnet);
        const referral = await infoClient.referral({ user: referrerAddr });
        const stage = referral.referrerState?.stage;
        if (stage === 'ready') {
            const onFile = referral.referrerState?.data?.code || '';
            if (onFile.toUpperCase() !== code.toUpperCase()) {
                throw new Error(`Ready for referrals but there is a config code mismatch ${onFile} vs ${code}`);
            }
            return true;
        }
        // Not ready yet - log as debugLogger since this is expected during setup phase
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[isReferralCodeReady] Referral code not ready', {
            stage,
            code,
            referrerAddr,
        });
        return false;
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.isReferralCodeReady'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'isReferralCodeReady', {
            code: __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getReferralCode).call(this, __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode()),
            referrerAddress: __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getBuilderAddress).call(this, __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode()),
        }));
        return false;
    }
}, _HyperLiquidProvider_checkReferralSet = 
/**
 * Check if user has a referral code set with HyperLiquid
 *
 * @returns Promise resolving to true if referral is set, false otherwise
 */
async function _HyperLiquidProvider_checkReferralSet() {
    try {
        const infoClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getInfoClient();
        const userAddress = await __classPrivateFieldGet(this, _HyperLiquidProvider_walletService, "f").getUserAddressWithDefault();
        // Call HyperLiquid API to check if user has a referral set
        const referralData = await infoClient.referral({
            user: userAddress,
        });
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('Referral check result:', {
            userAddress,
            referralData,
        });
        return Boolean(referralData?.referredBy?.code);
    }
    catch (error) {
        // Benign for unfunded wallets — downgrade to debug log, do not Sentry.
        if ((0, errorUtils_js_1.isHyperLiquidUserNotFoundError)(error)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[checkReferralSet] Wallet not on Hyperliquid yet, treating as no referral', {
                error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.checkReferralSet')
                    .message,
            });
            return false;
        }
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.checkReferralSet'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'checkReferralSet', {
            note: 'Error checking referral status, will retry',
        }));
        // do not throw here, return false as we can try to set it again
        return false;
    }
}, _HyperLiquidProvider_setReferralCode = 
/**
 * Set MetaMask as the user's referrer on HyperLiquid
 *
 * @returns A promise that resolves to the boolean result.
 */
async function _HyperLiquidProvider_setReferralCode() {
    try {
        const exchangeClient = __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").getExchangeClient();
        const referralCode = __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getReferralCode).call(this, __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode());
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[setReferralCode] Setting referral code', {
            code: referralCode,
            network: __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode() ? 'testnet' : 'mainnet',
        });
        // set the referral code
        const result = await exchangeClient.setReferrer({
            code: referralCode,
        });
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[setReferralCode] Referral code set result', result);
        return result?.status === 'ok';
    }
    catch (error) {
        // Benign for unfunded wallets — downgrade and rethrow so the outer
        // `#ensureReferralSet` catch self-heals the walletRegistered gate
        // without forwarding to Sentry.
        if ((0, errorUtils_js_1.isHyperLiquidUserNotFoundError)(error)) {
            __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").debugLogger.log('[setReferralCode] Wallet not on Hyperliquid yet, skipping referral write', {
                error: (0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.setReferralCode')
                    .message,
            });
            throw error;
        }
        __classPrivateFieldGet(this, _HyperLiquidProvider_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'HyperLiquidProvider.setReferralCode'), __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getErrorContext).call(this, 'setReferralCode', {
            code: __classPrivateFieldGet(this, _HyperLiquidProvider_instances, "m", _HyperLiquidProvider_getReferralCode).call(this, __classPrivateFieldGet(this, _HyperLiquidProvider_clientService, "f").isTestnetMode()),
        }));
        // Rethrow to be caught by retry logic in ensureReferralSet
        throw error;
    }
};
//# sourceMappingURL=HyperLiquidProvider.cjs.map