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
var _PerpsController_instances, _a, _PerpsController_initializationPromise, _PerpsController_isReinitializing, _PerpsController_myxRegistrationPromise, _PerpsController_lighterRegistrationPromise, _PerpsController_blockedRegionListVersion, _PerpsController_hip3Enabled, _PerpsController_hip3AllowlistMarkets, _PerpsController_hip3BlocklistMarkets, _PerpsController_hip3ConfigSource, _PerpsController_priceDeviationLimit, _PerpsController_attributionContext, _PerpsController_isMYXProviderEnabled, _PerpsController_isLighterProviderEnabled, _PerpsController_standaloneProvider, _PerpsController_handlersRegistered, _PerpsController_standaloneProviderIsTestnet, _PerpsController_standaloneProviderHip3Version, _PerpsController_standaloneProviderOperations, _PerpsController_eligibilityCheckDeferred, _PerpsController_ausQueue, _PerpsController_userDiskWrite, _PerpsController_options, _PerpsController_tradingService, _PerpsController_marketDataService, _PerpsController_accountService, _PerpsController_eligibilityService, _PerpsController_dataLakeService, _PerpsController_depositService, _PerpsController_featureFlagConfigurationService, _PerpsController_rewardsIntegrationService, _PerpsController_logError, _PerpsController_debugLog, _PerpsController_awaitInitializationIfInProgress, _PerpsController_getAggregatedCacheProviderIds, _PerpsController_isMarketCacheEntryCurrent, _PerpsController_isUserCacheIdentityCurrent, _PerpsController_fetchAndCacheUserDataSnapshot, _PerpsController_getOrCreateStandaloneProvider, _PerpsController_trackStandaloneProviderOperation, _PerpsController_retireStandaloneProvider, _PerpsController_cleanupStandaloneProvider, _PerpsController_getMetrics, _PerpsController_findNetworkClientIdForChain, _PerpsController_submitTransaction, _PerpsController_migrateRequestsIfNeeded, _PerpsController_withStreamPause, _PerpsController_performInitialization, _PerpsController_createProviders, _PerpsController_assignActiveProvider, _PerpsController_getErrorContext, _PerpsController_getControllerState, _PerpsController_buildMarketAllowedFilter, _PerpsController_compilePatternsSafely, _PerpsController_createServiceContext, _PerpsController_ensureTradingServiceDeps, _PerpsController_getActiveProviderWhenReady, _PerpsController_buildGlobalSnapshotContext, _PerpsController_getStaticSnapshotDexes, _PerpsController_preloadWatchedPaths, _PerpsController_preloadTimer, _PerpsController_isPreloading, _PerpsController_marketPreloadQueued, _PerpsController_isPreloadingUserData, _PerpsController_userPreloadQueued, _PerpsController_userSnapshotRequests, _PerpsController_preloadStateUnsubscribe, _PerpsController_accountChangeUnsubscribe, _PerpsController_previousIsTestnet, _PerpsController_previousHip3ConfigVersion, _PerpsController_preloadRefreshMs, _PerpsController_preloadGuardMs, _PerpsController_hydrateCacheFromDiskSync, _PerpsController_persistUserCacheToDisk, _PerpsController_performMarketDataPreload, _PerpsController_performUserDataPreload, _PerpsController_persistWatchlistToRemote, _PerpsController_syncWatchlistFromRemote;
import { BaseController } from "@metamask/base-controller";
import { ORIGIN_METAMASK } from "@metamask/controller-utils";
import { v4 as uuidv4 } from "uuid";
import { CandlePeriod } from "./constants/chartConfig.mjs";
import { PERPS_EVENT_PROPERTY, PERPS_EVENT_VALUE } from "./constants/eventNames.mjs";
import { canonicalizeHyperLiquidDexes, MAINNET_HIP3_CONFIG, TESTNET_HIP3_CONFIG, USDC_SYMBOL } from "./constants/hyperLiquidConfig.mjs";
import { PerpsMeasurementName } from "./constants/performanceMetrics.mjs";
import { PERPS_CONSTANTS, MARKET_SORTING_CONFIG, PROVIDER_CONFIG, buildProviderCacheKey, MAX_SLIPPAGE_BOUNDS, DEFAULT_PERPS_MODE, DEFAULT_PRO_LAYOUT_PREFERENCES } from "./constants/perpsConfig.mjs";
import { PERPS_ERROR_CODES } from "./perpsErrorCodes.mjs";
import { AggregatedPerpsProvider } from "./providers/AggregatedPerpsProvider.mjs";
import { HyperLiquidProvider } from "./providers/HyperLiquidProvider.mjs";
import { AccountService } from "./services/AccountService.mjs";
import { DataLakeService } from "./services/DataLakeService.mjs";
import { DepositService } from "./services/DepositService.mjs";
import { EligibilityService } from "./services/EligibilityService.mjs";
import { FeatureFlagConfigurationService } from "./services/FeatureFlagConfigurationService.mjs";
import { MarketDataService } from "./services/MarketDataService.mjs";
import { RewardsIntegrationService } from "./services/RewardsIntegrationService.mjs";
import { TerminalMarketService } from "./services/TerminalMarketService.mjs";
import { TradingService } from "./services/TradingService.mjs";
// PerpsStreamChannelKey removed: using string for channel keys (PerpsStreamManager.pauseChannel takes string)
import { WebSocketConnectionState, PerpsAnalyticsEvent, PerpsTraceNames, PerpsTraceOperations, isVersionGatedFeatureFlag, MARKET_CATEGORIES } from "./types/index.mjs";
import { getSelectedEvmAccountFromMessenger } from "./utils/accountUtils.mjs";
import { ensureError } from "./utils/errorUtils.mjs";
import { parseAssetName } from "./utils/hyperLiquidAdapter.mjs";
import { clonePerpsMarketData, compileMarketPattern, shouldIncludeMarket } from "./utils/marketUtils.mjs";
import { hydrateFromDiskSync, persistMarketEntriesToDisk, persistUserEntriesToDisk } from "./utils/perpsDiskPersistence.mjs";
import { wait } from "./utils/wait.mjs";
function cloneUserDataSnapshot(snapshot) {
    return {
        positions: snapshot.positions.map((position) => ({
            ...position,
            leverage: { ...position.leverage },
            cumulativeFunding: { ...position.cumulativeFunding },
            ...(position.takeProfitOrders && {
                takeProfitOrders: position.takeProfitOrders.map((order) => ({
                    ...order,
                })),
            }),
            ...(position.stopLossOrders && {
                stopLossOrders: position.stopLossOrders.map((order) => ({
                    ...order,
                })),
            }),
        })),
        orders: snapshot.orders.map((order) => ({ ...order })),
        accountState: {
            ...snapshot.accountState,
            ...(snapshot.accountState.subAccountBreakdown && {
                subAccountBreakdown: Object.fromEntries(Object.entries(snapshot.accountState.subAccountBreakdown).map(([dex, balances]) => [dex, { ...balances }])),
            }),
        },
        identity: {
            ...snapshot.identity,
            dexes: [...snapshot.identity.dexes],
        },
    };
}
/**
 * Returns the first non-empty string from the given values.
 * Env vars default to '' (not null/undefined), so ?? wouldn't fall through.
 *
 * @param vals - String values to check in order.
 * @returns The first non-empty string, or '' if all are empty/undefined.
 */
export function firstNonEmpty(...vals) {
    return (vals.find((val) => val !== null && val !== undefined && val !== '') ?? '');
}
/**
 * Maps an active provider mode to the corresponding exchange key used in the
 * AUS {@link PerpsWatchlistMarkets} schema.
 *
 * Returns `null` for modes that are not yet represented in the AUS schema
 * (e.g. `'aggregated'`), which signals callers to skip remote sync and fall
 * back to local state only.  Add new entries here as additional DEX providers
 * gain AUS watchlist support.
 *
 * @param activeProvider - The current active provider mode from controller state.
 * @returns The matching `PerpsWatchlistMarkets` key, or `null` if unsupported.
 */
export function resolveWatchlistExchangeKey(activeProvider) {
    const map = {
        hyperliquid: 'hyperliquid',
        myx: 'myx',
    };
    return map[activeProvider] ?? null;
}
/**
 * Resolves MYX auth config from provider credentials, handling
 * testnet/mainnet fallback logic.
 *
 * @param myx - MYX provider credentials.
 * @param isTestnet - Whether the controller is in testnet mode.
 * @returns Resolved appId, apiSecret, and brokerAddress.
 */
export function resolveMyxAuthConfig(myx, isTestnet) {
    return {
        appId: isTestnet
            ? (myx.appIdTestnet ?? '')
            : firstNonEmpty(myx.appIdMainnet, myx.appIdTestnet),
        apiSecret: isTestnet
            ? (myx.apiSecretTestnet ?? '')
            : firstNonEmpty(myx.apiSecretMainnet, myx.apiSecretTestnet),
        brokerAddress: isTestnet
            ? (myx.brokerAddressTestnet ?? '')
            : firstNonEmpty(myx.brokerAddressMainnet, myx.brokerAddressTestnet),
    };
}
// Re-export error codes from separate file to avoid circular dependencies
export { PERPS_ERROR_CODES } from "./perpsErrorCodes.mjs";
/**
 * Initialization state enum for state machine tracking
 */
export var InitializationState;
(function (InitializationState) {
    InitializationState["Uninitialized"] = "uninitialized";
    InitializationState["Initializing"] = "initializing";
    InitializationState["Initialized"] = "initialized";
    InitializationState["Failed"] = "failed";
})(InitializationState || (InitializationState = {}));
// Re-exported so consumers can keep importing these from the controller entry
// point; the canonical definitions live in the dependency-free constants module.
export { PerpsMode, DEFAULT_PERPS_MODE, DEFAULT_PRO_LAYOUT_PREFERENCES } from "./constants/perpsConfig.mjs";
/**
 * Get default PerpsController state
 *
 * To change the active provider, modify the `activeProvider` value below:
 * - 'hyperliquid': HyperLiquid provider (default, production)
 * - 'aggregated': Multi-provider aggregation mode
 * - 'myx': MYX provider (future implementation)
 *
 * @returns The default perps controller state.
 */
export const getDefaultPerpsControllerState = () => ({
    activeProvider: 'hyperliquid',
    isTestnet: false, // Default to mainnet
    initializationState: InitializationState.Uninitialized,
    initializationError: null,
    initializationAttempts: 0,
    accountState: null,
    perpsBalances: {},
    depositInProgress: false,
    lastDepositResult: null,
    withdrawInProgress: false,
    lastDepositTransactionId: null,
    lastWithdrawResult: null,
    lastCompletedWithdrawalTimestamp: null,
    lastCompletedWithdrawalTxHashes: [],
    withdrawalRequests: [],
    withdrawalProgress: {
        progress: 0,
        lastUpdated: 0,
        activeWithdrawalId: null,
    },
    depositRequests: [],
    lastError: null,
    lastUpdateTimestamp: 0,
    isEligible: false,
    isFirstTimeUser: {
        testnet: true,
        mainnet: true,
    },
    hasPlacedFirstOrder: {
        testnet: false,
        mainnet: false,
    },
    watchlistMarkets: {
        testnet: [],
        mainnet: [],
    },
    recentlyViewedMarkets: {
        testnet: [],
        mainnet: [],
    },
    tradeConfigurations: {
        testnet: {},
        mainnet: {},
    },
    marketFilterPreferences: {
        optionId: MARKET_SORTING_CONFIG.DefaultSortOptionId,
        direction: MARKET_SORTING_CONFIG.DefaultDirection,
    },
    proLayoutPreferences: { ...DEFAULT_PRO_LAYOUT_PREFERENCES },
    mode: DEFAULT_PERPS_MODE,
    hip3ConfigVersion: 0,
    selectedPaymentToken: null,
    cachedMarketDataByProvider: {},
    cachedUserDataByProvider: {},
});
/**
 * State metadata for the PerpsController
 */
const metadata = {
    accountState: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    perpsBalances: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    isTestnet: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    activeProvider: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    initializationState: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    initializationError: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    initializationAttempts: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: false,
    },
    depositInProgress: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    lastDepositTransactionId: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    lastDepositResult: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    withdrawInProgress: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    lastWithdrawResult: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    lastCompletedWithdrawalTimestamp: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    lastCompletedWithdrawalTxHashes: {
        includeInStateLogs: false,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    withdrawalRequests: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    withdrawalProgress: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    depositRequests: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    lastError: {
        includeInStateLogs: false,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: false,
    },
    lastUpdateTimestamp: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: false,
    },
    isEligible: {
        includeInStateLogs: true,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    isFirstTimeUser: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    hasPlacedFirstOrder: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    watchlistMarkets: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    recentlyViewedMarkets: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    tradeConfigurations: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    maxSlippageBps: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    marketFilterPreferences: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    proLayoutPreferences: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    mode: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    hip3ConfigVersion: {
        includeInStateLogs: true,
        persist: true,
        includeInDebugSnapshot: false,
        usedInUi: false,
    },
    selectedPaymentToken: {
        includeInStateLogs: false,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    cachedMarketDataByProvider: {
        includeInStateLogs: false,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
    cachedUserDataByProvider: {
        includeInStateLogs: false,
        persist: false,
        includeInDebugSnapshot: false,
        usedInUi: true,
    },
};
const MESSENGER_EXPOSED_METHODS = [
    'approveSubscriptionBuilderFee',
    'calculateFees',
    'calculateLiquidationPrice',
    'calculateMaintenanceMargin',
    'cancelOrder',
    'cancelOrders',
    'clearAttributionContext',
    'clearDepositResult',
    'clearPendingTradeConfiguration',
    'clearPendingTransactionRequests',
    'clearWithdrawResult',
    'closePosition',
    'closePositions',
    'completeWithdrawalFromHistory',
    'depositWithConfirmation',
    'depositWithOrder',
    'disconnect',
    'editOrder',
    'fetchHistoricalCandles',
    'flipPosition',
    'getAccountState',
    'getActiveProvider',
    'getActiveProviderOrNull',
    'getAttributionContext',
    'getAvailableDexs',
    'getBlockExplorerUrl',
    'getCachedMarketDataForActiveProvider',
    'getCachedUserDataForActiveProvider',
    'getUserDataSnapshot',
    'getCurrentNetwork',
    'getFunding',
    'getHistoricalPortfolio',
    'getMarketCategories',
    'getMarketDataWithPrices',
    'getMarketFilterPreferences',
    'getMarkets',
    'getMaxLeverage',
    'getOpenOrders',
    'getOrderBookGrouping',
    'getOrderFills',
    'getOrders',
    'getPendingManualRecoveries',
    'getPendingTradeConfiguration',
    'getPositions',
    'getRecoveredDispatches',
    'acknowledgeRecoveredDispatch',
    'getTradeConfiguration',
    'getRecentlyViewedMarkets',
    'getWatchlistMarkets',
    'getWebSocketConnectionState',
    'getWithdrawalProgress',
    'getWithdrawalRoutes',
    'init',
    'invalidateSubscriptionBenefits',
    'isCurrentlyReinitializing',
    'isFirstTimeUserOnCurrentNetwork',
    'isWatchlistMarket',
    'markFirstOrderCompleted',
    'markTutorialCompleted',
    'placeOrder',
    'reconnect',
    'recordMarketViewed',
    'refreshEligibility',
    'resetFirstTimeUserState',
    'resetSelectedPaymentToken',
    'getMaxSlippage',
    'setMaxSlippage',
    'getProLayoutPreferences',
    'setProLayoutPreferences',
    'setPerpsMode',
    'saveMarketFilterPreferences',
    'saveOrderBookGrouping',
    'savePendingTradeConfiguration',
    'saveTradeConfiguration',
    'setAttributionContext',
    'setLiveDataConfig',
    'setSelectedPaymentToken',
    'startEligibilityMonitoring',
    'startMarketDataPreload',
    'stopEligibilityMonitoring',
    'stopMarketDataPreload',
    'subscribeToAccount',
    'subscribeToCandles',
    'subscribeToConnectionState',
    'subscribeToOICaps',
    'subscribeToOrderBook',
    'subscribeToOrderFills',
    'subscribeToOrders',
    'subscribeToPositions',
    'subscribeToPrices',
    'switchProvider',
    'toggleTestnet',
    'toggleWatchlistMarket',
    'updateMargin',
    'updatePositionTPSL',
    'updateWithdrawalProgress',
    'updateWithdrawalStatus',
    'validateClosePosition',
    'validateOrder',
    'validateWithdrawal',
    'withdraw',
];
/**
 * PerpsController - Protocol-agnostic perpetuals trading controller
 *
 * Provides a unified interface for perpetual futures trading across multiple protocols.
 * Features dual data flow architecture:
 * - Trading actions use Redux for persistence and optimistic updates
 * - Live data uses direct callbacks for maximum performance
 */
export class PerpsController extends BaseController {
    constructor({ messenger, state = {}, clientConfig = {}, infrastructure, deferEligibilityCheck = false, }) {
        super({
            name: 'PerpsController',
            metadata,
            messenger,
            state: { ...getDefaultPerpsControllerState(), ...state },
        });
        _PerpsController_instances.add(this);
        this.isInitialized = false;
        _PerpsController_initializationPromise.set(this, null);
        _PerpsController_isReinitializing.set(this, false);
        /** Tracks the async MYX dynamic import so performInitialization can await it. */
        _PerpsController_myxRegistrationPromise.set(this, null);
        _PerpsController_lighterRegistrationPromise.set(this, null);
        this.blockedRegionList = {
            list: [],
            source: 'fallback',
        };
        /**
         * Version counter for blocked region list.
         * Used to prevent race conditions where stale eligibility checks
         * (started with fallback config) overwrite results from newer checks
         * (started with remote config).
         */
        _PerpsController_blockedRegionListVersion.set(this, 0);
        // Store HIP-3 configuration (mutable for runtime updates from remote flags)
        _PerpsController_hip3Enabled.set(this, void 0);
        _PerpsController_hip3AllowlistMarkets.set(this, void 0);
        _PerpsController_hip3BlocklistMarkets.set(this, void 0);
        _PerpsController_hip3ConfigSource.set(this, 'fallback');
        // Optional client override for the max market-vs-oracle price deviation before a
        // market is reported untradable (PriceUpdate.isTradable). Protocol-agnostic: passed
        // through to each provider, which applies its own default when this is undefined.
        _PerpsController_priceDeviationLimit.set(this, void 0);
        /**
         * Transient UTM / discovery attribution context.
         * Held in-memory only (never persisted in PerpsControllerState) and merged
         * into analytics event properties via {@link mergeAttributionContext}.
         */
        _PerpsController_attributionContext.set(this, {});
        /**
         * Active provider instance for routing operations.
         * When activeProvider is 'hyperliquid' or 'myx': points to specific provider directly
         * When activeProvider is 'aggregated': points to AggregatedPerpsProvider wrapper
         */
        this.activeProviderInstance = null;
        /**
         * Cached standalone provider for pre-initialization discovery queries.
         * Avoids creating a new HyperLiquidProvider (and potentially leaking WebSocket
         * connections) on every standalone call from the preload cycle.
         */
        _PerpsController_standaloneProvider.set(this, null);
        _PerpsController_handlersRegistered.set(this, false);
        _PerpsController_standaloneProviderIsTestnet.set(this, null);
        _PerpsController_standaloneProviderHip3Version.set(this, null);
        _PerpsController_standaloneProviderOperations.set(this, new Map());
        _PerpsController_eligibilityCheckDeferred.set(this, void 0);
        /**
         * Serial promise queue for all AUS watchlist operations (hydration and
         * individual toggles).  Chaining every operation onto this field ensures
         * that:
         *
         * - A toggle that fires immediately after init() always runs *after* the
         *   init hydration finishes (Bug 3).
         * - Concurrent toggles are serialised so the last PUT reflects all changes
         *   rather than racing with each other (Bug 4).
         *
         * Errors from individual operations are swallowed inside the queue so that
         * a failed operation does not stall subsequent ones.
         */
        _PerpsController_ausQueue.set(this, Promise.resolve());
        _PerpsController_userDiskWrite.set(this, Promise.resolve());
        // Store options for dependency injection (allows core package to inject platform-specific services)
        _PerpsController_options.set(this, void 0);
        // Service instances (instantiated with platform dependencies)
        _PerpsController_tradingService.set(this, void 0);
        _PerpsController_marketDataService.set(this, void 0);
        _PerpsController_accountService.set(this, void 0);
        _PerpsController_eligibilityService.set(this, void 0);
        _PerpsController_dataLakeService.set(this, void 0);
        _PerpsController_depositService.set(this, void 0);
        _PerpsController_featureFlagConfigurationService.set(this, void 0);
        _PerpsController_rewardsIntegrationService.set(this, void 0);
        _PerpsController_preloadTimer.set(this, null);
        _PerpsController_isPreloading.set(this, false);
        _PerpsController_marketPreloadQueued.set(this, false);
        _PerpsController_isPreloadingUserData.set(this, false);
        _PerpsController_userPreloadQueued.set(this, false);
        _PerpsController_userSnapshotRequests.set(this, new Map());
        _PerpsController_preloadStateUnsubscribe.set(this, null);
        _PerpsController_accountChangeUnsubscribe.set(this, null);
        _PerpsController_previousIsTestnet.set(this, null);
        _PerpsController_previousHip3ConfigVersion.set(this, null);
        __classPrivateFieldSet(this, _PerpsController_eligibilityCheckDeferred, deferEligibilityCheck, "f");
        // Store options for dependency injection
        __classPrivateFieldSet(this, _PerpsController_options, {
            messenger,
            state,
            clientConfig,
            infrastructure,
        }, "f");
        // Instantiate services with platform dependencies
        // Services that need cross-controller access receive the messenger
        __classPrivateFieldSet(this, _PerpsController_tradingService, new TradingService(infrastructure), "f");
        __classPrivateFieldSet(this, _PerpsController_marketDataService, new MarketDataService({
            ...infrastructure,
            terminalMarketService: infrastructure.terminalMarketService ??
                (infrastructure.terminalApi?.marketDataUrl ||
                    infrastructure.terminalApiUrl ||
                    infrastructure.terminalApi?.globalSnapshotUrl
                    ? new TerminalMarketService(infrastructure)
                    : undefined),
        }), "f");
        __classPrivateFieldSet(this, _PerpsController_accountService, new AccountService(infrastructure, messenger), "f");
        __classPrivateFieldSet(this, _PerpsController_eligibilityService, new EligibilityService(infrastructure), "f");
        __classPrivateFieldSet(this, _PerpsController_dataLakeService, new DataLakeService(infrastructure, messenger), "f");
        __classPrivateFieldSet(this, _PerpsController_depositService, new DepositService(infrastructure, messenger), "f");
        __classPrivateFieldSet(this, _PerpsController_featureFlagConfigurationService, new FeatureFlagConfigurationService(infrastructure), "f");
        __classPrivateFieldSet(this, _PerpsController_rewardsIntegrationService, new RewardsIntegrationService(infrastructure, messenger), "f");
        // Set HIP-3 fallback configuration from client (will be updated if remote flags available)
        __classPrivateFieldSet(this, _PerpsController_hip3Enabled, clientConfig.fallbackHip3Enabled ?? false, "f");
        __classPrivateFieldSet(this, _PerpsController_hip3AllowlistMarkets, [
            ...(clientConfig.fallbackHip3AllowlistMarkets ?? []),
        ], "f");
        __classPrivateFieldSet(this, _PerpsController_hip3BlocklistMarkets, [
            ...(clientConfig.fallbackHip3BlocklistMarkets ?? []),
        ], "f");
        __classPrivateFieldSet(this, _PerpsController_priceDeviationLimit, clientConfig.fallbackPriceDeviationLimit, "f");
        // Immediately set the fallback region list since RemoteFeatureFlagController is empty by default and takes a moment to populate.
        this.setBlockedRegionList(clientConfig.fallbackBlockedRegions ?? [], 'fallback');
        /**
         * Immediately read current state to catch any flags already loaded
         * This is necessary to avoid race conditions where the RemoteFeatureFlagController fetches flags
         * before the PerpsController initializes its RemoteFeatureFlagController subscription.
         *
         * We still subscribe in case the RemoteFeatureFlagController is not yet populated and updates later.
         */
        try {
            const currentRemoteFeatureFlagState = this.messenger.call('RemoteFeatureFlagController:getState');
            this.refreshEligibilityOnFeatureFlagChange(currentRemoteFeatureFlagState);
        }
        catch (error) {
            // If we can't read the remote feature flags at construction time, we'll rely on:
            // 1. The fallback blocked regions already set above
            // 2. The subscription to catch updates when RemoteFeatureFlagController is ready
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.constructor'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'constructor', {
                operation: 'readRemoteFeatureFlags',
            }));
        }
        // Subscribe for the full controller lifetime — intentionally not stored;
        // geo-blocking and HIP-3 flag propagation must remain active across
        // disconnect → reconnect cycles and must never be torn down.
        this.messenger.subscribe('RemoteFeatureFlagController:stateChange', this.refreshEligibilityOnFeatureFlagChange.bind(this));
        this.providers = new Map();
        // Migrate old persisted data without accountAddress
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_migrateRequestsIfNeeded).call(this);
        // Eagerly hydrate in-memory caches from disk so hooks see data on first render.
        // Must happen at construction time — before any React component mounts.
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_hydrateCacheFromDiskSync).call(this);
    }
    /**
     * Read cached market data for the currently active provider (or aggregated).
     * Returns null when no valid cache exists or when cache has expired.
     *
     * @param options - Optional settings.
     * @param options.skipTTL - When true, bypass the 5-minute TTL check.
     * Used during initial render so disk-hydrated structural data (with
     * placeholder prices) is returned regardless of age.
     * @returns The cached market data array, or null if no valid cache.
     */
    getCachedMarketDataForActiveProvider(options) {
        const { activeProvider } = this.state;
        const cache = this.state.cachedMarketDataByProvider;
        if (activeProvider === 'aggregated') {
            // Assemble from all registered provider entries
            const assembled = [];
            for (const providerId of __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getAggregatedCacheProviderIds).call(this, Object.keys(cache))) {
                const key = buildProviderCacheKey(providerId, this.state.isTestnet);
                const entry = cache[key];
                if (!entry || entry.data.length === 0) {
                    continue;
                }
                if (!__classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isMarketCacheEntryCurrent).call(this, providerId, entry, options)) {
                    continue;
                }
                assembled.push(...clonePerpsMarketData(entry.data));
            }
            if (assembled.length === 0) {
                return null;
            }
            return assembled;
        }
        // Single provider mode
        const key = buildProviderCacheKey(activeProvider, this.state.isTestnet);
        const entry = cache[key];
        if (!entry || entry.data.length === 0) {
            return null;
        }
        if (!__classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isMarketCacheEntryCurrent).call(this, activeProvider, entry, options)) {
            return null;
        }
        return clonePerpsMarketData(entry.data);
    }
    /**
     * Read cached user data for the currently active provider (or aggregated).
     * Returns null when no valid cache exists, cache has expired, or address
     * does not match the currently selected EVM account.
     *
     * @param options - Optional settings.
     * @param options.skipTTL - When true, bypass the 60s staleness check.
     * Used during initial render so disk-hydrated user data (positions/orders)
     * is returned regardless of age, avoiding a skeleton flash.
     * @returns The cached user data, or null if no valid cache.
     */
    getCachedUserDataForActiveProvider(options) {
        const { activeProvider } = this.state;
        const cache = this.state.cachedUserDataByProvider;
        const staleCutoff = __classPrivateFieldGet(_a, _a, "f", _PerpsController_preloadGuardMs) * 2; // 60s
        // Get current user address for validation
        let currentAddress = null;
        try {
            const evmAccount = getSelectedEvmAccountFromMessenger(this.messenger);
            currentAddress = evmAccount?.address ?? null;
        }
        catch {
            // Account identity is required before account-scoped data can be trusted.
        }
        if (!currentAddress) {
            return null;
        }
        const selectedAddress = currentAddress;
        const skipTTL = options?.skipTTL ?? false;
        const isValidEntry = (providerId, entry) => {
            if (!entry) {
                return false;
            }
            if (!skipTTL && Date.now() - entry.timestamp >= staleCutoff) {
                return false;
            }
            if (!__classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isUserCacheIdentityCurrent).call(this, providerId, entry, selectedAddress)) {
                return false;
            }
            return true;
        };
        if (activeProvider === 'aggregated') {
            // Assemble from all registered provider entries
            const allPositions = [];
            const allOrders = [];
            let defaultAccountState = null;
            let hasValidEntry = false;
            for (const providerId of __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getAggregatedCacheProviderIds).call(this, Object.keys(cache))) {
                const providerNetworkKey = buildProviderCacheKey(providerId, this.state.isTestnet);
                const entry = cache[providerNetworkKey];
                if (!isValidEntry(providerId, entry)) {
                    continue;
                }
                hasValidEntry = true;
                allPositions.push(...entry.positions);
                allOrders.push(...entry.orders);
                // AccountState from default provider (hyperliquid)
                if (providerId === 'hyperliquid') {
                    defaultAccountState = entry.accountState;
                }
            }
            if (!hasValidEntry) {
                return null;
            }
            return {
                positions: allPositions,
                orders: allOrders,
                accountState: defaultAccountState,
            };
        }
        // Single provider mode
        const providerNetworkKey = buildProviderCacheKey(activeProvider, this.state.isTestnet);
        const entry = cache[providerNetworkKey];
        if (!entry || !isValidEntry(activeProvider, entry)) {
            return null;
        }
        return {
            positions: entry.positions,
            orders: entry.orders,
            accountState: entry.accountState,
        };
    }
    /**
     * Fetch, validate, and atomically cache a complete user-data snapshot.
     * This remains callable after mount so consumers can seed their live channel
     * from one coherent positions/orders/account result.
     *
     * @returns The accepted user-data snapshot.
     */
    async getUserDataSnapshot() {
        const evmAccount = getSelectedEvmAccountFromMessenger(this.messenger);
        if (!evmAccount?.address) {
            throw new Error('Cannot fetch user data snapshot without an EVM account');
        }
        if (this.state.activeProvider !== 'hyperliquid') {
            throw new Error('User data snapshots require Hyperliquid provider mode');
        }
        const capturedActiveProvider = this.activeProviderInstance;
        const standaloneProvider = capturedActiveProvider
            ? null
            : __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getOrCreateStandaloneProvider).call(this);
        const provider = capturedActiveProvider ?? standaloneProvider;
        if (!provider) {
            throw new Error('Cannot create standalone Hyperliquid provider');
        }
        const { address } = evmAccount;
        const { isTestnet, hip3ConfigVersion } = this.state;
        const network = isTestnet ? 'testnet' : 'mainnet';
        const expectedDexes = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getStaticSnapshotDexes).call(this);
        if (!expectedDexes) {
            throw new Error('User data snapshot DEX identity is not static');
        }
        const isCurrent = () => {
            let currentAddress;
            try {
                currentAddress = getSelectedEvmAccountFromMessenger(this.messenger)?.address;
            }
            catch {
                return false;
            }
            return (this.state.activeProvider === 'hyperliquid' &&
                (!capturedActiveProvider ||
                    this.activeProviderInstance === capturedActiveProvider) &&
                this.state.isTestnet === isTestnet &&
                this.state.hip3ConfigVersion === hip3ConfigVersion &&
                currentAddress?.toLowerCase() === address.toLowerCase());
        };
        const context = {
            provider,
            standaloneProvider,
            address,
            isTestnet,
            hip3ConfigVersion,
            expectedDexes,
            isCurrent,
        };
        const requestKey = [
            'hyperliquid',
            network,
            address.toLowerCase(),
            hip3ConfigVersion,
            ...expectedDexes,
        ].join('|');
        const existingRequest = __classPrivateFieldGet(this, _PerpsController_userSnapshotRequests, "f").get(requestKey);
        if (existingRequest?.provider === provider) {
            return existingRequest.promise;
        }
        const request = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_fetchAndCacheUserDataSnapshot).call(this, context);
        __classPrivateFieldGet(this, _PerpsController_userSnapshotRequests, "f").set(requestKey, { provider, promise: request });
        try {
            return await request;
        }
        finally {
            if (__classPrivateFieldGet(this, _PerpsController_userSnapshotRequests, "f").get(requestKey)?.promise === request) {
                __classPrivateFieldGet(this, _PerpsController_userSnapshotRequests, "f").delete(requestKey);
            }
        }
    }
    /**
     * Test-observable accessor for whether a standalone provider is cached.
     *
     * @returns True if a standalone provider instance exists.
     */
    hasStandaloneProvider() {
        return __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f") !== null;
    }
    setBlockedRegionList(list, source) {
        __classPrivateFieldGet(this, _PerpsController_featureFlagConfigurationService, "f").setBlockedRegions({
            list,
            source,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'setBlockedRegionList', {
                getBlockedRegionList: () => this.blockedRegionList,
                setBlockedRegionList: (newList, newSource) => {
                    this.blockedRegionList = { list: newList, source: newSource };
                    __classPrivateFieldSet(this, _PerpsController_blockedRegionListVersion, __classPrivateFieldGet(this, _PerpsController_blockedRegionListVersion, "f") + 1, "f");
                },
                refreshEligibility: () => this.refreshEligibility(),
            }),
        });
    }
    /**
     * Respond to RemoteFeatureFlagController state changes
     * Refreshes user eligibility based on geo-blocked regions defined in remote feature flag.
     * Uses fallback configuration when remote feature flag is undefined.
     * Note: Initial eligibility is set in the constructor if fallback regions are provided.
     *
     * @param remoteFeatureFlagControllerState - State from RemoteFeatureFlagController.
     */
    refreshEligibilityOnFeatureFlagChange(remoteFeatureFlagControllerState) {
        __classPrivateFieldGet(this, _PerpsController_featureFlagConfigurationService, "f").refreshEligibility({
            remoteFeatureFlagControllerState,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'refreshEligibilityOnFeatureFlagChange', {
                getBlockedRegionList: () => this.blockedRegionList,
                setBlockedRegionList: (list, source) => {
                    this.blockedRegionList = { list, source };
                    __classPrivateFieldSet(this, _PerpsController_blockedRegionListVersion, __classPrivateFieldGet(this, _PerpsController_blockedRegionListVersion, "f") + 1, "f");
                },
                refreshEligibility: () => this.refreshEligibility(),
                getHip3Config: () => ({
                    enabled: __classPrivateFieldGet(this, _PerpsController_hip3Enabled, "f"),
                    allowlistMarkets: __classPrivateFieldGet(this, _PerpsController_hip3AllowlistMarkets, "f"),
                    blocklistMarkets: __classPrivateFieldGet(this, _PerpsController_hip3BlocklistMarkets, "f"),
                    source: __classPrivateFieldGet(this, _PerpsController_hip3ConfigSource, "f"),
                }),
                setHip3Config: (config) => {
                    if (config.enabled !== undefined) {
                        __classPrivateFieldSet(this, _PerpsController_hip3Enabled, config.enabled, "f");
                    }
                    if (config.allowlistMarkets !== undefined) {
                        __classPrivateFieldSet(this, _PerpsController_hip3AllowlistMarkets, [...config.allowlistMarkets], "f");
                    }
                    if (config.blocklistMarkets !== undefined) {
                        __classPrivateFieldSet(this, _PerpsController_hip3BlocklistMarkets, [...config.blocklistMarkets], "f");
                    }
                    if (config.source !== undefined) {
                        __classPrivateFieldSet(this, _PerpsController_hip3ConfigSource, config.source, "f");
                    }
                },
                incrementHip3ConfigVersion: () => {
                    const newVersion = (this.state.hip3ConfigVersion || 0) + 1;
                    this.update((state) => {
                        state.hip3ConfigVersion = newVersion;
                    });
                    return newVersion;
                },
            }),
        });
    }
    /**
     * Initialize the PerpsController providers
     * Must be called before using any other methods
     * Prevents double initialization with promise caching
     *
     * @returns A promise that resolves when the operation completes.
     */
    async init() {
        if (!__classPrivateFieldGet(this, _PerpsController_handlersRegistered, "f")) {
            this.messenger.registerMethodActionHandlers(this, MESSENGER_EXPOSED_METHODS);
            __classPrivateFieldSet(this, _PerpsController_handlersRegistered, true, "f");
        }
        if (this.isInitialized) {
            return undefined;
        }
        if (__classPrivateFieldGet(this, _PerpsController_initializationPromise, "f")) {
            return __classPrivateFieldGet(this, _PerpsController_initializationPromise, "f");
        }
        __classPrivateFieldSet(this, _PerpsController_initializationPromise, __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performInitialization).call(this), "f");
        return __classPrivateFieldGet(this, _PerpsController_initializationPromise, "f");
    }
    /**
     * Registers the MYX provider after dynamic import resolves.
     *
     * Extracted from the import().then() callback so it can be tested directly
     * (Jest cannot resolve dynamic imports without --experimental-vm-modules).
     *
     * @param MYXProvider - Constructor class for the MYX provider.
     */
    registerMYXProvider(MYXProvider) {
        const myxIsTestnet = PROVIDER_CONFIG.MYX_TESTNET_ONLY || this.state.isTestnet;
        const myx = __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.myx ?? {};
        const myxAuthConfig = resolveMyxAuthConfig(myx, myxIsTestnet);
        const myxProvider = new MYXProvider({
            isTestnet: myxIsTestnet,
            platformDependencies: __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure,
            messenger: this.messenger,
            myxAuthConfig,
        });
        this.providers.set('myx', myxProvider);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: MYX provider registered', {
            isTestnet: myxIsTestnet,
        });
    }
    /**
     * Handles errors from the MYX dynamic import.
     *
     * Module-not-found errors are expected (extension doesn't ship MYX) → debug log.
     * Other errors indicate constructor/config problems → Sentry via logError.
     *
     * @param error - The caught error from the dynamic import or constructor.
     */
    handleMYXImportError(error) {
        const isModuleError = error?.code === 'MODULE_NOT_FOUND';
        if (isModuleError) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: MYX provider module not available, skipping registration');
        }
        else {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, error instanceof Error ? error : new Error(String(error)), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'createProviders.myx'));
        }
    }
    /**
     * Registers the Lighter provider after dynamic import resolves.
     *
     * Extracted from the import().then() callback so it can be tested directly
     * (Jest cannot resolve dynamic imports without --experimental-vm-modules).
     *
     * @param LighterProviderClass - Constructor class for the Lighter provider.
     */
    registerLighterProvider(LighterProviderClass) {
        const lighterIsTestnet = PROVIDER_CONFIG.LIGHTER_TESTNET_ONLY || this.state.isTestnet;
        const lighter = __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.lighter ?? {};
        const lighterProvider = new LighterProviderClass({
            isTestnet: lighterIsTestnet,
            platformDependencies: __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure,
            messenger: this.messenger,
            signerBridge: lighter.signerBridge,
            lighterAuthConfig: {
                enabled: lighter.enabled,
                accountIndex: lighterIsTestnet
                    ? lighter.accountIndexTestnet
                    : lighter.accountIndexMainnet,
                apiKeyIndex: lighter.apiKeyIndex,
            },
        });
        this.providers.set('lighter', lighterProvider);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Lighter provider registered', {
            isTestnet: lighterIsTestnet,
        });
    }
    /**
     * Handles errors from the Lighter dynamic import.
     *
     * Module-not-found errors are expected (clients may not ship Lighter) →
     * debug log. Other errors indicate constructor/config problems → Sentry.
     *
     * @param error - The caught error from the dynamic import or constructor.
     */
    handleLighterImportError(error) {
        const isModuleError = error?.code === 'MODULE_NOT_FOUND';
        if (isModuleError) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Lighter provider module not available, skipping registration');
        }
        else {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, error instanceof Error ? error : new Error(String(error)), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'createProviders.lighter'));
        }
    }
    /**
     * Get the currently active provider.
     * In aggregated mode, returns AggregatedPerpsProvider which routes to underlying providers.
     * In single provider mode, returns HyperLiquidProvider directly.
     *
     * @returns The active provider (aggregated wrapper or direct provider based on mode)
     * @throws Error if provider is not initialized or reinitializing
     */
    getActiveProvider() {
        // Check if we're in the middle of reinitializing
        if (this.isCurrentlyReinitializing()) {
            this.update((state) => {
                state.lastError = PERPS_ERROR_CODES.CLIENT_REINITIALIZING;
                state.lastUpdateTimestamp = Date.now();
            });
            throw new Error(PERPS_ERROR_CODES.CLIENT_REINITIALIZING);
        }
        // Check if not initialized
        if (this.state.initializationState !== InitializationState.Initialized ||
            !this.isInitialized) {
            this.update((state) => {
                state.lastError = PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED;
                state.lastUpdateTimestamp = Date.now();
            });
            throw new Error(PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED);
        }
        // Return the active provider instance (set during initialization based on providerMode)
        if (!this.activeProviderInstance) {
            this.update((state) => {
                state.lastError = PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE;
                state.lastUpdateTimestamp = Date.now();
            });
            throw new Error(PERPS_ERROR_CODES.PROVIDER_NOT_AVAILABLE);
        }
        return this.activeProviderInstance;
    }
    /**
     * Get the currently active provider, returning null if not available
     * Use this method when the caller can gracefully handle a missing provider
     * (e.g., UI components during initialization or reconnection)
     *
     * @returns The active provider, or null if not initialized/reinitializing
     */
    getActiveProviderOrNull() {
        // Return null during reinitialization
        if (this.isCurrentlyReinitializing()) {
            return null;
        }
        // Return null if not initialized
        if (this.state.initializationState !== InitializationState.Initialized ||
            !this.isInitialized) {
            return null;
        }
        // Return the active provider instance or null if not found
        return this.activeProviderInstance ?? null;
    }
    /**
     * Place a new order
     * Thin delegation to TradingService
     *
     * @param params - The operation parameters.
     * @returns The order result with order ID and status.
     */
    async placeOrder(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_ensureTradingServiceDeps).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").placeOrder({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'placeOrder', {
                saveTradeConfiguration: (symbol, leverage) => this.saveTradeConfiguration(symbol, leverage),
            }),
            reportOrderToDataLake: (dataLakeParams) => this.reportOrderToDataLake(dataLakeParams),
        });
    }
    /**
     * Edit an existing order
     * Thin delegation to TradingService
     *
     * @param params - The operation parameters.
     * @returns The updated order result with order ID and status.
     */
    async editOrder(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_ensureTradingServiceDeps).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").editOrder({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'editOrder'),
        });
    }
    /**
     * Cancel an existing order
     *
     * @param params - The operation parameters.
     * @returns The cancellation result with status.
     */
    async cancelOrder(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").cancelOrder({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'cancelOrder'),
        });
    }
    /**
     * Cancel multiple orders in parallel
     * Batch version of cancelOrder() that cancels multiple orders simultaneously
     *
     * @param params - The operation parameters.
     * @returns The batch cancellation results for each order.
     */
    async cancelOrders(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").cancelOrders({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'cancelOrders', {
                getOpenOrders: () => this.getOpenOrders(),
            }),
            withStreamPause: (operation, channels) => __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_withStreamPause).call(this, operation, channels),
        });
    }
    /**
     * Close a position (partial or full)
     * Thin delegation to TradingService
     *
     * @param params - The operation parameters.
     * @returns The order result from the close position request.
     */
    async closePosition(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_ensureTradingServiceDeps).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").closePosition({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'closePosition', {
                getPositions: () => this.getPositions(),
            }),
            reportOrderToDataLake: (dataLakeParams) => this.reportOrderToDataLake(dataLakeParams),
        });
    }
    /**
     * Close multiple positions in parallel
     * Batch version of closePosition() that closes multiple positions simultaneously
     *
     * @param params - The operation parameters.
     * @returns The batch close results for each position.
     */
    async closePositions(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_ensureTradingServiceDeps).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").closePositions({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'closePositions', {
                getPositions: () => this.getPositions(),
            }),
        });
    }
    /**
     * Update TP/SL for an existing position
     *
     * @param params - The operation parameters.
     * @returns The order result from the TP/SL update.
     */
    async updatePositionTPSL(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_ensureTradingServiceDeps).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").updatePositionTPSL({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'updatePositionTPSL'),
        });
    }
    /**
     * Update margin for an existing position (add or remove)
     *
     * @param params - The operation parameters.
     * @returns The margin update result.
     */
    async updateMargin(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_ensureTradingServiceDeps).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").updateMargin({
            provider,
            symbol: params.symbol,
            amount: params.amount,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'updateMargin'),
        });
    }
    /**
     * Flip position (reverse direction while keeping size and leverage)
     *
     * @param params - The operation parameters.
     * @returns The order result from the position flip.
     */
    async flipPosition(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_ensureTradingServiceDeps).call(this);
        return __classPrivateFieldGet(this, _PerpsController_tradingService, "f").flipPosition({
            provider,
            position: params.position,
            trackingData: params.trackingData,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'flipPosition'),
        });
    }
    /**
     * Simplified deposit method that prepares transaction for confirmation screen
     * No complex state tracking - just sets a loading flag
     *
     * @param params - Parameters for the deposit flow
     * @param params.amount - Optional deposit amount
     * @param params.placeOrder - If true, uses addTransaction instead of submit to avoid navigation
     * @returns An object containing a promise that resolves to the transaction hash.
     */
    async depositWithConfirmation(params = {}) {
        const { amount, placeOrder } = params;
        let currentDepositId;
        try {
            const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
            const { transaction, assetChainId, currentDepositId: depositId, } = await __classPrivateFieldGet(this, _PerpsController_depositService, "f").prepareTransaction({ provider });
            currentDepositId = depositId;
            // Get current account address via messenger (outside of update() for proper typing)
            const evmAccount = getSelectedEvmAccountFromMessenger(this.messenger);
            const accountAddress = evmAccount?.address ?? 'unknown';
            this.update((state) => {
                state.lastDepositResult = null;
                // Add deposit request to tracking
                const depositRequest = {
                    id: currentDepositId ?? uuidv4(),
                    timestamp: Date.now(),
                    amount: amount ?? '0', // Use provided amount or default to '0'
                    asset: USDC_SYMBOL,
                    accountAddress, // Track which account initiated deposit
                    success: false, // Will be updated when transaction completes
                    txHash: undefined,
                    status: 'pending',
                    source: undefined,
                    transactionId: undefined, // Will be set to depositId when available
                };
                state.depositRequests.unshift(depositRequest); // Add to beginning of array
            });
            const networkClientId = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_findNetworkClientIdForChain).call(this, assetChainId);
            if (!networkClientId) {
                throw new Error(`No network client found for chain ${assetChainId}. Please add the network first.`);
            }
            let result;
            let transactionMeta;
            let depositOrderResult = null;
            const defaultTransactionOptions = {
                networkClientId,
                origin: ORIGIN_METAMASK,
                skipInitialGasEstimate: true,
            };
            __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.tracer.addBreadcrumb({
                category: 'perps',
                message: 'Deposit action started',
                level: 'info',
                data: {
                    place_order_after_deposit: placeOrder === true,
                },
            });
            if (placeOrder) {
                // Use addTransaction to create transaction without navigating to confirmation screen
                const addResult = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_submitTransaction).call(this, transaction, {
                    ...defaultTransactionOptions,
                    type: 'perpsDepositAndOrder',
                });
                transactionMeta = addResult.transactionMeta;
                // Return transaction ID immediately (fire-and-forget for caller)
                result = Promise.resolve(transactionMeta.id);
                // Track deposit request lifecycle via the real transaction result
                depositOrderResult = addResult.result;
            }
            else {
                // submit shows the confirmation screen and returns a promise
                // The promise will resolve when transaction completes or reject if cancelled/failed
                const submitResult = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_submitTransaction).call(this, transaction, {
                    ...defaultTransactionOptions,
                    type: 'perpsDeposit',
                });
                result = submitResult.result;
                transactionMeta = submitResult.transactionMeta;
            }
            // Store the transaction ID and try to get amount from transaction
            this.update((state) => {
                state.lastDepositTransactionId = transactionMeta.id;
            });
            // Track the transaction lifecycle only when using submit (deposit-only flow)
            if (!placeOrder) {
                // At this point, the confirmation modal is shown to the user
                // The result promise will resolve/reject based on user action and transaction outcome
                // Track the transaction lifecycle
                // The result promise will resolve/reject based on user action and transaction outcome
                // Note: We intentionally don't set depositInProgress immediately to avoid
                // showing toasts before the user confirms the transaction
                // TODO: @abretonc7s Find a better way to trigger our custom toast notification then having to toggle the state
                // How to replace the system notifications?
                result
                    .then((actualTxHash) => {
                    // Transaction was successfully completed
                    // Set depositInProgress to true temporarily to show success
                    this.update((state) => {
                        state.depositInProgress = true;
                        state.lastDepositResult = {
                            success: true,
                            txHash: actualTxHash,
                            amount: amount ?? '0',
                            asset: USDC_SYMBOL, // Default asset for deposits
                            timestamp: Date.now(),
                            error: '',
                        };
                        // Update the deposit request by request ID to avoid race conditions
                        if (state.depositRequests.length > 0) {
                            const requestToUpdate = state.depositRequests.find((req) => req.id === currentDepositId);
                            if (requestToUpdate) {
                                // For deposits, we have a txHash immediately, so mark as completed
                                // (the transaction hash means the deposit was successful)
                                requestToUpdate.status = 'completed';
                                requestToUpdate.success = true;
                                requestToUpdate.txHash = actualTxHash;
                            }
                        }
                    });
                    // Clear depositInProgress after a short delay
                    setTimeout(() => {
                        this.update((state) => {
                            state.depositInProgress = false;
                            state.lastDepositTransactionId = null;
                        });
                    }, 100);
                    return undefined;
                })
                    .catch((error) => {
                    // Check if user denied/cancelled the transaction
                    const errorMessage = ensureError(error, 'PerpsController.initiateDeposit').message;
                    const userCancelled = errorMessage.includes('User denied') ||
                        errorMessage.includes('User rejected') ||
                        errorMessage.includes('User cancelled') ||
                        errorMessage.includes('User canceled');
                    if (userCancelled) {
                        // User cancelled - clear any state, no toast
                        this.update((state) => {
                            state.depositInProgress = false;
                            state.lastDepositTransactionId = null;
                            // Don't set lastDepositResult - no toast needed
                            // Mark deposit request as cancelled
                            const requestToUpdate = state.depositRequests.find((req) => req.id === currentDepositId);
                            if (requestToUpdate) {
                                requestToUpdate.status = 'cancelled';
                                requestToUpdate.success = false;
                            }
                        });
                    }
                    else {
                        // Transaction failed after confirmation - show error toast
                        this.update((state) => {
                            state.depositInProgress = false;
                            state.lastDepositTransactionId = null;
                            state.lastDepositResult = {
                                success: false,
                                error: errorMessage,
                                amount: amount ?? '0',
                                asset: USDC_SYMBOL, // Default asset for deposits
                                timestamp: Date.now(),
                                txHash: '',
                            };
                            // Update the deposit request by request ID to avoid race conditions
                            if (state.depositRequests.length > 0) {
                                const requestToUpdate = state.depositRequests.find((req) => req.id === currentDepositId);
                                if (requestToUpdate) {
                                    requestToUpdate.status = 'failed';
                                    requestToUpdate.success = false;
                                }
                            }
                        });
                    }
                });
            }
            else if (depositOrderResult) {
                // Track deposit request lifecycle for deposit+order flow
                depositOrderResult
                    .then((actualTxHash) => {
                    this.update((state) => {
                        const requestToUpdate = state.depositRequests.find((req) => req.id === currentDepositId);
                        if (requestToUpdate) {
                            requestToUpdate.status = 'completed';
                            requestToUpdate.success = true;
                            requestToUpdate.txHash = actualTxHash;
                        }
                    });
                    return undefined;
                })
                    .catch((error) => {
                    const errorMessage = ensureError(error, 'PerpsController.depositWithOrder').message;
                    const isCancellation = errorMessage.includes('User denied') ||
                        errorMessage.includes('User rejected') ||
                        errorMessage.includes('User cancelled') ||
                        errorMessage.includes('User canceled');
                    this.update((state) => {
                        const requestToUpdate = state.depositRequests.find((req) => req.id === currentDepositId);
                        if (requestToUpdate) {
                            requestToUpdate.status = (isCancellation ? 'cancelled' : 'failed');
                            requestToUpdate.success = false;
                        }
                    });
                });
            }
            return {
                result,
            };
        }
        catch (error) {
            // Check if user denied/cancelled the transaction
            const errorMessage = ensureError(error, 'PerpsController.initiateDeposit').message;
            const userCancelled = errorMessage.includes('User denied') ||
                errorMessage.includes('User rejected') ||
                errorMessage.includes('User cancelled') ||
                errorMessage.includes('User canceled');
            if (!userCancelled) {
                // Only track actual errors, not user cancellations
                this.update((state) => {
                    state.lastDepositTransactionId = null;
                    // Note: lastDepositResult is already set in the catch block above
                    // Mark deposit request as failed if one was created
                    if (currentDepositId) {
                        const request = state.depositRequests.find((req) => req.id === currentDepositId);
                        if (request) {
                            request.status = 'failed';
                            request.success = false;
                        }
                    }
                });
            }
            throw error;
        }
    }
    /**
     * Same as depositWithConfirmation - prepares transaction for confirmation screen.
     *
     * @returns A promise that resolves to the string result.
     */
    async depositWithOrder() {
        return this.depositWithConfirmation({ placeOrder: true });
    }
    /**
     * Clear the last deposit result after it has been shown to the user
     */
    clearDepositResult() {
        this.update((state) => {
            state.lastDepositResult = null;
        });
    }
    clearWithdrawResult() {
        this.update((state) => {
            state.lastWithdrawResult = null;
        });
    }
    /**
     * Update withdrawal request status when it completes, or remove it on failure.
     * This is called when a withdrawal is matched with a completed withdrawal from the API.
     * When status is `failed`, the request is removed from the queue (not retained).
     *
     * @param withdrawalId - The withdrawal transaction ID.
     * @param status - The current status.
     * @param txHash - The transaction hash.
     */
    updateWithdrawalStatus(withdrawalId, status, txHash) {
        let withdrawalAmount;
        let shouldTrack = false;
        let found = false;
        this.update((state) => {
            const withdrawalIndex = state.withdrawalRequests.findIndex((request) => request.id === withdrawalId);
            if (withdrawalIndex >= 0) {
                found = true;
                const request = state.withdrawalRequests[withdrawalIndex];
                withdrawalAmount = request.amount;
                shouldTrack =
                    withdrawalAmount !== undefined && request.status !== status;
                if (status === 'failed') {
                    state.withdrawalRequests.splice(withdrawalIndex, 1);
                    state.withdrawInProgress = state.withdrawalRequests.some((req) => req.status === 'pending' || req.status === 'bridging');
                    state.withdrawalProgress = {
                        progress: 0,
                        lastUpdated: Date.now(),
                        activeWithdrawalId: null,
                    };
                }
                else {
                    request.status = status;
                    request.success = status === 'completed';
                    if (txHash) {
                        request.txHash = txHash;
                    }
                    // Clear withdrawal progress when withdrawal completes
                    state.withdrawalProgress = {
                        progress: 0,
                        lastUpdated: Date.now(),
                        activeWithdrawalId: null,
                    };
                }
            }
        });
        if (shouldTrack && withdrawalAmount !== undefined) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getMetrics).call(this).trackPerpsEvent(PerpsAnalyticsEvent.WithdrawalTransaction, {
                [PERPS_EVENT_PROPERTY.STATUS]: status === 'completed'
                    ? PERPS_EVENT_VALUE.STATUS.COMPLETED
                    : PERPS_EVENT_VALUE.STATUS.FAILED,
                [PERPS_EVENT_PROPERTY.WITHDRAWAL_AMOUNT]: Number.parseFloat(withdrawalAmount),
            });
        }
        if (found) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Updated withdrawal status', {
                withdrawalId,
                status,
                txHash,
            });
        }
    }
    /**
     * Complete a specific withdrawal detected via transaction history polling (FIFO queue).
     * Called when a completed withdrawal appears in the transaction history matching a pending request.
     *
     * Uses FIFO matching: oldest pending withdrawal is matched with first completed withdrawal
     * in history that happened after its submission time.
     *
     * @param withdrawalRequestId - The ID of the pending withdrawal request to mark as complete.
     * @param completedWithdrawal - The completed withdrawal data from the history API.
     * @param completedWithdrawal.txHash - The on-chain transaction hash.
     * @param completedWithdrawal.amount - The withdrawal amount.
     * @param completedWithdrawal.timestamp - The completion timestamp from the history API.
     * @param completedWithdrawal.asset - The asset symbol (e.g. USDC).
     */
    completeWithdrawalFromHistory(withdrawalRequestId, completedWithdrawal) {
        let didRemove = false;
        this.update((state) => {
            const requestIndex = state.withdrawalRequests.findIndex((req) => req.id === withdrawalRequestId);
            if (requestIndex === -1) {
                return;
            }
            didRemove = true;
            state.withdrawalRequests.splice(requestIndex, 1);
            // Update the FIFO guard. The timestamp is persisted for cross-restart
            // protection. The txHashes array (not persisted) accumulates within a
            // session to prevent re-matching direct completions and same-millisecond
            // API completions. It resets naturally on app restart.
            state.lastCompletedWithdrawalTimestamp = completedWithdrawal.timestamp;
            state.lastCompletedWithdrawalTxHashes.push(completedWithdrawal.txHash);
            const hasPendingWithdrawals = state.withdrawalRequests.some((req) => req.status === 'pending' || req.status === 'bridging');
            state.withdrawInProgress = hasPendingWithdrawals;
            if (!hasPendingWithdrawals) {
                state.withdrawalProgress = {
                    progress: 0,
                    lastUpdated: Date.now(),
                    activeWithdrawalId: null,
                };
            }
            state.lastUpdateTimestamp = Date.now();
        });
        if (!didRemove) {
            return;
        }
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Completed withdrawal from transaction history (FIFO)', {
            withdrawalRequestId,
            txHash: completedWithdrawal.txHash,
            amount: completedWithdrawal.amount,
        });
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getMetrics).call(this).trackPerpsEvent(PerpsAnalyticsEvent.WithdrawalTransaction, {
            [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.COMPLETED,
            [PERPS_EVENT_PROPERTY.WITHDRAWAL_AMOUNT]: Number.parseFloat(completedWithdrawal.amount),
        });
    }
    /**
     * Update withdrawal progress (persistent across navigation)
     *
     * @param progress - The progress indicator.
     * @param activeWithdrawalId - The active withdrawal ID.
     */
    updateWithdrawalProgress(progress, activeWithdrawalId = null) {
        this.update((state) => {
            state.withdrawalProgress = {
                progress,
                lastUpdated: Date.now(),
                activeWithdrawalId,
            };
        });
    }
    /**
     * Get current withdrawal progress
     *
     * @returns The withdrawal progress, last update timestamp, and active withdrawal ID.
     */
    getWithdrawalProgress() {
        return this.state.withdrawalProgress;
    }
    /**
     * Withdraw funds from trading account
     *
     * The withdrawal process varies by provider and may involve:
     * - Direct on-chain transfers
     * - Bridge operations
     * - Multi-step validation processes
     *
     * Check the specific provider documentation for detailed withdrawal flows.
     *
     * @param params Withdrawal parameters
     * @returns WithdrawResult with withdrawal ID and tracking info
     */
    async withdraw(params) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        return __classPrivateFieldGet(this, _PerpsController_accountService, "f").withdraw({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'withdraw'),
            refreshAccountState: async () => {
                await this.getAccountState({ source: 'post_withdrawal' });
            },
        });
    }
    /**
     * Get current positions
     * Thin delegation to MarketDataService
     *
     * For standalone mode, bypasses getActiveProvider() to allow position queries
     * without full perps initialization (e.g., for showing positions on token details page)
     *
     * @param params - The operation parameters.
     * @returns Array of open positions for the active provider.
     */
    async getPositions(params) {
        // For standalone mode, access provider directly without initialization check
        // This allows discovery use cases (checking if user has positions) without full perps setup
        if (params?.standalone && params.userAddress) {
            // Use activeProviderInstance if available (respects provider abstraction)
            // Fallback to cached standalone provider for pre-initialization discovery
            // TODO: When adding new providers (MYX), consider a provider factory pattern
            const provider = this.activeProviderInstance ?? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getOrCreateStandaloneProvider).call(this);
            const operation = provider.getPositions(params);
            return provider === __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f")
                ? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_trackStandaloneProviderOperation).call(this, provider, operation)
                : operation;
        }
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getPositions({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getPositions'),
        });
    }
    /**
     * Get historical user fills (trade executions)
     * Thin delegation to MarketDataService
     *
     * @param params - The operation parameters.
     * @param options - Optional call modifiers.
     * @param options.forceRefresh - Bypass the request-coalesce cache
     * end-to-end (user-initiated refresh).
     * @returns Array of historical trade executions (fills).
     */
    async getOrderFills(params, options) {
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getOrderFills({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getOrderFills'),
            forceRefresh: options?.forceRefresh,
        });
    }
    /**
     * List TP/SL protection changes the active provider parked for
     * explicit manual re-establishment. Providers without durable
     * settlement state return an empty list.
     *
     * @returns Pending manual-recovery entries.
     */
    async getPendingManualRecoveries() {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        if (!provider.getPendingManualRecoveries) {
            return [];
        }
        return provider.getPendingManualRecoveries();
    }
    /**
     * READ-ONLY list of the active provider's recovered-dispatch outcomes
     * (previously ambiguous submissions later resolved). Providers without
     * durable dispatch state return an empty list.
     *
     * @returns Pending recovered-dispatch outcomes.
     */
    async getRecoveredDispatches() {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        if (!provider.getRecoveredDispatches) {
            return [];
        }
        return provider.getRecoveredDispatches();
    }
    /**
     * Acknowledge ONE recovered-dispatch outcome by its stable id, after
     * refreshing venue state. Throws when the active provider has no
     * durable dispatch state or the id no longer matches.
     *
     * @param recoveryId - Stable id from {@link getRecoveredDispatches}.
     * @returns Resolves when the outcome is acknowledged.
     */
    async acknowledgeRecoveredDispatch(recoveryId) {
        const provider = await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getActiveProviderWhenReady).call(this);
        if (!provider.acknowledgeRecoveredDispatch) {
            throw new Error('The active perps provider has no recovered dispatches to acknowledge');
        }
        return provider.acknowledgeRecoveredDispatch(recoveryId);
    }
    /**
     * Get historical user orders (order lifecycle)
     * Thin delegation to MarketDataService
     *
     * @param params - The operation parameters.
     * @param options - Optional call modifiers.
     * @param options.forceRefresh - Bypass the request-coalesce cache
     * end-to-end (user-initiated refresh).
     * @returns Array of historical orders.
     */
    async getOrders(params, options) {
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getOrders({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getOrders'),
            forceRefresh: options?.forceRefresh,
        });
    }
    /**
     * Get currently open orders (real-time status)
     * Thin delegation to MarketDataService
     *
     * For standalone mode, bypasses getActiveProvider() to allow open order queries
     * without full perps initialization (e.g., for background preloading)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async getOpenOrders(params) {
        // For standalone mode, access provider directly without initialization check
        if (params?.standalone && params.userAddress) {
            const provider = this.activeProviderInstance ?? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getOrCreateStandaloneProvider).call(this);
            const operation = provider.getOpenOrders(params);
            return provider === __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f")
                ? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_trackStandaloneProviderOperation).call(this, provider, operation)
                : operation;
        }
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getOpenOrders({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getOpenOrders'),
        });
    }
    /**
     * Get historical user funding history (funding payments)
     * Thin delegation to MarketDataService
     *
     * @param params - The operation parameters.
     * @param options - Optional call modifiers.
     * @param options.forceRefresh - Bypass the request-coalesce cache
     * end-to-end (user-initiated refresh).
     * @returns Array of historical funding payments.
     */
    async getFunding(params, options) {
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getFunding({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getFunding'),
            forceRefresh: options?.forceRefresh,
        });
    }
    /**
     * Get account state (balances, etc.)
     * Thin delegation to MarketDataService
     *
     * For standalone mode, bypasses getActiveProvider() to allow account state queries
     * without full perps initialization (e.g., for checking if user has perps funds)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async getAccountState(params) {
        // For standalone mode, access provider directly without initialization check
        // This allows discovery use cases (checking if user has perps funds) without full perps setup
        if (params?.standalone && params.userAddress) {
            // Use activeProviderInstance if available (respects provider abstraction)
            // Fallback to cached standalone provider for pre-initialization discovery
            const provider = this.activeProviderInstance ?? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getOrCreateStandaloneProvider).call(this);
            const operation = provider.getAccountState(params);
            return provider === __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f")
                ? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_trackStandaloneProviderOperation).call(this, provider, operation)
                : operation;
        }
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getAccountState({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getAccountState'),
        });
    }
    /**
     * Get historical portfolio data
     * Thin delegation to MarketDataService
     *
     * @param params - The operation parameters.
     * @returns The historical portfolio data points.
     */
    async getHistoricalPortfolio(params) {
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getHistoricalPortfolio({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getHistoricalPortfolio'),
        });
    }
    /**
     * Get available markets with optional filtering
     * Thin delegation to MarketDataService
     *
     * For standalone mode, bypasses getActiveProvider() to allow market discovery
     * without full perps initialization (e.g., for discovery banners on spot screens)
     *
     * @param params - The operation parameters.
     * @returns Array of available markets matching the filter criteria.
     */
    async getMarkets(params) {
        const isMarketAllowed = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_buildMarketAllowedFilter).call(this);
        if (params?.standalone) {
            const provider = this.activeProviderInstance ?? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getOrCreateStandaloneProvider).call(this);
            const operation = __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getMarkets({
                provider,
                params,
                context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getMarkets'),
                isMarketAllowed,
            });
            return provider === __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f")
                ? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_trackStandaloneProviderOperation).call(this, provider, operation)
                : operation;
        }
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getMarkets({
            provider,
            params,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getMarkets'),
            isMarketAllowed,
        });
    }
    /**
     * Get market data with prices (includes price, volume, 24h change).
     * Optionally filter by category, sort, and limit the results.
     *
     * For standalone mode, bypasses getActiveProvider() to allow market data queries
     * without full perps initialization (e.g., for background preloading on app start)
     *
     * @param params - The operation parameters.
     * @param params.standalone - Whether to use standalone mode.
     * @param params.categories - Filter to markets matching any of these categories.
     * @param params.sortBy - Sort results by this field.
     * @param params.direction - Sort direction (default: desc).
     * @param params.limit - Maximum number of results to return.
     * @returns A promise that resolves to the market data.
     */
    async getMarketDataWithPrices(params) {
        const globalSnapshot = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_buildGlobalSnapshotContext).call(this);
        const context = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getMarketDataWithPrices', {
            ...(globalSnapshot && { globalSnapshot }),
        });
        if (params?.standalone) {
            const provider = this.activeProviderInstance ?? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getOrCreateStandaloneProvider).call(this);
            const operation = __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getMarketDataWithPrices({
                provider,
                params,
                context,
            });
            return provider === __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f")
                ? __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_trackStandaloneProviderOperation).call(this, provider, operation)
                : operation;
        }
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getMarketDataWithPrices({
            provider,
            params,
            context,
        });
    }
    /**
     * Start background market data preloading.
     * Fetches market data immediately and refreshes every 5 minutes.
     * Watches for isTestnet and hip3ConfigVersion changes to re-preload.
     */
    startMarketDataPreload() {
        if (__classPrivateFieldGet(this, _PerpsController_preloadTimer, "f")) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Preload already started, skipping');
            return;
        }
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Starting market data preload');
        // Track current values for change detection
        __classPrivateFieldSet(this, _PerpsController_previousIsTestnet, this.state.isTestnet, "f");
        __classPrivateFieldSet(this, _PerpsController_previousHip3ConfigVersion, this.state.hip3ConfigVersion, "f");
        // Immediate preload
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performMarketDataPreload).call(this).catch(() => {
            /* fire-and-forget */
        });
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performUserDataPreload).call(this).catch(() => {
            /* fire-and-forget */
        });
        // Periodic refresh
        __classPrivateFieldSet(this, _PerpsController_preloadTimer, setInterval(() => {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performMarketDataPreload).call(this).catch(() => {
                /* fire-and-forget */
            });
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performUserDataPreload).call(this).catch(() => {
                /* fire-and-forget */
            });
        }, __classPrivateFieldGet(_a, _a, "f", _PerpsController_preloadRefreshMs)), "f");
        // Watch for isTestnet / hip3ConfigVersion changes
        const handler = (_state, patches) => {
            // Early-return when no watched field changed (skips ~46 unrelated updates)
            const hasRelevantChange = patches.some((patch) => typeof patch.path[0] === 'string' &&
                __classPrivateFieldGet(_a, _a, "f", _PerpsController_preloadWatchedPaths).has(patch.path[0]));
            if (!hasRelevantChange) {
                return;
            }
            const currentIsTestnet = this.state.isTestnet;
            const currentHip3Version = this.state.hip3ConfigVersion;
            const testnetChanged = currentIsTestnet !== __classPrivateFieldGet(this, _PerpsController_previousIsTestnet, "f");
            const hip3Changed = currentHip3Version !== __classPrivateFieldGet(this, _PerpsController_previousHip3ConfigVersion, "f");
            if (testnetChanged || hip3Changed) {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Network/config changed, re-preloading', {
                    testnetChanged,
                    hip3Changed,
                    isTestnet: currentIsTestnet,
                    hip3ConfigVersion: currentHip3Version,
                });
                __classPrivateFieldSet(this, _PerpsController_previousIsTestnet, currentIsTestnet, "f");
                __classPrivateFieldSet(this, _PerpsController_previousHip3ConfigVersion, currentHip3Version, "f");
                // No need to clear user data cache — per-provider keys include the
                // network, so different networks don't collide. Re-preload will
                // populate the new key.
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performMarketDataPreload).call(this).catch(() => {
                    /* fire-and-forget */
                });
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performUserDataPreload).call(this).catch(() => {
                    /* fire-and-forget */
                });
            }
        };
        this.messenger.subscribe('PerpsController:stateChanged', handler);
        __classPrivateFieldSet(this, _PerpsController_preloadStateUnsubscribe, () => {
            this.messenger.unsubscribe('PerpsController:stateChanged', handler);
        }, "f");
        // Watch for selected account changes and selected account group changes.
        const accountChangeHandler = () => {
            const evmAccount = getSelectedEvmAccountFromMessenger(this.messenger);
            const currentAddress = evmAccount?.address ?? null;
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: account cache selection', {
                address: currentAddress?.toLowerCase() ?? null,
                availableKeys: Object.keys(this.state.cachedUserDataByProvider).sort(),
            });
            // The address guard makes the previous entry unreadable immediately;
            // refresh replaces it under the existing provider/network key.
            if (currentAddress) {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performUserDataPreload).call(this).catch(() => {
                    /* fire-and-forget */
                });
            }
        };
        this.messenger.subscribe('AccountsController:selectedAccountChange', accountChangeHandler);
        this.messenger.subscribe('AccountTreeController:selectedAccountGroupChange', accountChangeHandler);
        __classPrivateFieldSet(this, _PerpsController_accountChangeUnsubscribe, () => {
            this.messenger.unsubscribe('AccountsController:selectedAccountChange', accountChangeHandler);
            this.messenger.unsubscribe('AccountTreeController:selectedAccountGroupChange', accountChangeHandler);
        }, "f");
    }
    /**
     * Stop background market data preloading.
     */
    stopMarketDataPreload() {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Stopping market data preload');
        if (__classPrivateFieldGet(this, _PerpsController_preloadTimer, "f")) {
            clearInterval(__classPrivateFieldGet(this, _PerpsController_preloadTimer, "f"));
            __classPrivateFieldSet(this, _PerpsController_preloadTimer, null, "f");
        }
        if (__classPrivateFieldGet(this, _PerpsController_preloadStateUnsubscribe, "f")) {
            __classPrivateFieldGet(this, _PerpsController_preloadStateUnsubscribe, "f").call(this);
            __classPrivateFieldSet(this, _PerpsController_preloadStateUnsubscribe, null, "f");
        }
        if (__classPrivateFieldGet(this, _PerpsController_accountChangeUnsubscribe, "f")) {
            __classPrivateFieldGet(this, _PerpsController_accountChangeUnsubscribe, "f").call(this);
            __classPrivateFieldSet(this, _PerpsController_accountChangeUnsubscribe, null, "f");
        }
        __classPrivateFieldSet(this, _PerpsController_previousIsTestnet, null, "f");
        __classPrivateFieldSet(this, _PerpsController_previousHip3ConfigVersion, null, "f");
        __classPrivateFieldSet(this, _PerpsController_marketPreloadQueued, false, "f");
        __classPrivateFieldSet(this, _PerpsController_userPreloadQueued, false, "f");
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_cleanupStandaloneProvider).call(this).catch(() => {
            /* fire-and-forget to preserve sync signature */
        });
    }
    /**
     * Get list of available HIP-3 builder-deployed DEXs
     *
     * @param params - Optional parameters for filtering
     * @returns Array of DEX names
     */
    async getAvailableDexs(params) {
        const provider = this.getActiveProvider();
        const context = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getAvailableDexs');
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getAvailableDexs({
            provider,
            params,
            context,
        });
    }
    /**
     * Fetch historical candle data
     * Thin delegation to MarketDataService
     *
     * @param options - The configuration options.
     * @param options.symbol - The trading pair symbol.
     * @param options.interval - The candle interval period.
     * @param options.limit - Maximum number of items to fetch.
     * @param options.endTime - End timestamp in milliseconds.
     * @returns The historical candle data for the requested symbol and interval.
     */
    async fetchHistoricalCandles(options) {
        const { symbol, interval, limit = 100, endTime } = options;
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").fetchHistoricalCandles({
            provider,
            symbol,
            interval,
            limit,
            endTime,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'fetchHistoricalCandles'),
        });
    }
    /**
     * Calculate liquidation price for a position
     * Uses provider-specific formulas based on protocol rules
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the string result.
     */
    async calculateLiquidationPrice(params) {
        const provider = this.getActiveProvider();
        const context = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'calculateLiquidationPrice');
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").calculateLiquidationPrice({
            provider,
            params,
            context,
        });
    }
    /**
     * Calculate maintenance margin for a specific asset
     * Returns a percentage (e.g., 0.0125 for 1.25%)
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the numeric result.
     */
    async calculateMaintenanceMargin(params) {
        const provider = this.getActiveProvider();
        const context = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'calculateMaintenanceMargin');
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").calculateMaintenanceMargin({
            provider,
            params,
            context,
        });
    }
    /**
     * Get maximum leverage allowed for an asset
     *
     * @param asset - The asset identifier.
     * @returns A promise that resolves to the numeric result.
     */
    async getMaxLeverage(asset) {
        const provider = this.getActiveProvider();
        const context = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'getMaxLeverage');
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getMaxLeverage({ provider, asset, context });
    }
    /**
     * Validate order parameters according to protocol-specific rules
     *
     * @param params - The operation parameters.
     * @returns True if the condition is met.
     */
    async validateOrder(params) {
        const provider = this.getActiveProvider();
        const context = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'validateOrder');
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").validateOrder({ provider, params, context });
    }
    /**
     * Validate close position parameters according to protocol-specific rules
     *
     * @param params - The operation parameters.
     * @returns A promise that resolves to the result.
     */
    async validateClosePosition(params) {
        const provider = this.getActiveProvider();
        const context = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'validateClosePosition');
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").validateClosePosition({
            provider,
            params,
            context,
        });
    }
    /**
     * Validate withdrawal parameters according to protocol-specific rules
     *
     * @param params - The operation parameters.
     * @returns True if the condition is met.
     */
    async validateWithdrawal(params) {
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_accountService, "f").validateWithdrawal({ provider, params });
    }
    /**
     * Get supported withdrawal routes - returns complete asset and routing information
     *
     * @returns Array of supported asset routes for withdrawals.
     */
    getWithdrawalRoutes() {
        try {
            const provider = this.getActiveProvider();
            return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getWithdrawalRoutes({ provider });
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.getWithdrawalRoutes'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'getWithdrawalRoutes'));
            // Return empty array if provider is not available
            return [];
        }
    }
    /**
     * Set the transient UTM / discovery attribution context.
     * Replaces any previously set context. Held in-memory only — not persisted.
     *
     * @param context - The attribution context (UTM fields) to store.
     */
    setAttributionContext(context) {
        __classPrivateFieldSet(this, _PerpsController_attributionContext, { ...context }, "f");
    }
    /**
     * Get a copy of the current attribution context.
     *
     * @returns A shallow copy of the stored attribution context.
     */
    getAttributionContext() {
        return { ...__classPrivateFieldGet(this, _PerpsController_attributionContext, "f") };
    }
    /**
     * Clear the stored attribution context.
     */
    clearAttributionContext() {
        __classPrivateFieldSet(this, _PerpsController_attributionContext, {}, "f");
    }
    /**
     * Merge the stored UTM attribution context into a set of analytics event
     * properties. Only defined UTM fields are added, mapped
     * to their canonical PERPS_EVENT_PROPERTY keys. Provided properties take
     * precedence and are never overwritten.
     *
     * @param properties - Base event properties to merge attribution into.
     * @returns A new properties object including any defined UTM keys.
     */
    mergeAttributionContext(properties = {}) {
        const utm = {};
        const context = __classPrivateFieldGet(this, _PerpsController_attributionContext, "f");
        if (context.utmSource !== undefined) {
            utm[PERPS_EVENT_PROPERTY.UTM_SOURCE] = context.utmSource;
        }
        if (context.utmMedium !== undefined) {
            utm[PERPS_EVENT_PROPERTY.UTM_MEDIUM] = context.utmMedium;
        }
        if (context.utmCampaign !== undefined) {
            utm[PERPS_EVENT_PROPERTY.UTM_CAMPAIGN] = context.utmCampaign;
        }
        if (context.utmContent !== undefined) {
            utm[PERPS_EVENT_PROPERTY.UTM_CONTENT] = context.utmContent;
        }
        if (context.utmTerm !== undefined) {
            utm[PERPS_EVENT_PROPERTY.UTM_TERM] = context.utmTerm;
        }
        // Provided properties win over attribution context.
        return { ...utm, ...properties };
    }
    /**
     * Toggle between testnet and mainnet
     *
     * @returns The toggle result with success status and current network mode.
     */
    async toggleTestnet() {
        // Prevent concurrent reinitializations
        if (this.isCurrentlyReinitializing()) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Already reinitializing, skipping toggle', {
                timestamp: new Date().toISOString(),
            });
            return {
                success: false,
                isTestnet: this.state.isTestnet,
                error: PERPS_ERROR_CODES.CLIENT_REINITIALIZING,
            };
        }
        __classPrivateFieldSet(this, _PerpsController_isReinitializing, true, "f");
        // Store previous isTestnet for rollback on failure
        const previousIsTestnet = this.state.isTestnet;
        try {
            await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_cleanupStandaloneProvider).call(this);
            const previousNetwork = previousIsTestnet ? 'testnet' : 'mainnet';
            this.update((state) => {
                state.isTestnet = !state.isTestnet;
            });
            const newNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Network toggle initiated', {
                from: previousNetwork,
                to: newNetwork,
                timestamp: new Date().toISOString(),
            });
            // Reset initialization state and reinitialize provider with new testnet setting
            this.isInitialized = false;
            __classPrivateFieldSet(this, _PerpsController_initializationPromise, null, "f");
            await this.init();
            // Check if initialization actually succeeded — performInitialization()
            // does not throw on failure, it sets state to Failed and resolves.
            if (this.state.initializationState === InitializationState.Failed) {
                throw new Error(this.state.initializationError ??
                    'Network toggle initialization failed');
            }
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Network toggle completed', {
                newNetwork,
                isTestnet: this.state.isTestnet,
                timestamp: new Date().toISOString(),
            });
            return { success: true, isTestnet: this.state.isTestnet };
        }
        catch (error) {
            // Rollback isTestnet to previous value
            this.update((state) => {
                state.isTestnet = previousIsTestnet;
            });
            return {
                success: false,
                isTestnet: this.state.isTestnet,
                error: ensureError(error, 'PerpsController.toggleTestnet').message,
            };
        }
        finally {
            __classPrivateFieldSet(this, _PerpsController_isReinitializing, false, "f");
            // Re-trigger preload now that reinit is complete and the
            // activeProviderInstance points to the correct network.
            // The state-change listener may have already fired during reinit
            // but was skipped due to the #isReinitializing guard.
            if (__classPrivateFieldGet(this, _PerpsController_preloadTimer, "f")) {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performMarketDataPreload).call(this).catch(() => {
                    /* fire-and-forget */
                });
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performUserDataPreload).call(this).catch(() => {
                    /* fire-and-forget */
                });
            }
        }
    }
    /**
     * Switch to a different provider
     * Uses a full reinit approach: disconnect() → update state → init()
     * This ensures complete state reset including WebSocket connections and caches.
     *
     * @param providerId - The provider identifier.
     * @returns The switch result with success status and active provider.
     */
    async switchProvider(providerId) {
        // No-op if already on this provider (regardless of init state)
        if (this.state.activeProvider === providerId) {
            return { success: true, providerId };
        }
        // Validate provider is available
        // 'aggregated' is always valid, individual providers must exist in the map
        const isValidProvider = providerId === 'aggregated' || this.providers.has(providerId);
        if (!isValidProvider) {
            return {
                success: false,
                providerId: this.state.activeProvider,
                error: `Provider ${providerId} not available`,
            };
        }
        // Prevent concurrent switches
        if (this.isCurrentlyReinitializing()) {
            return {
                success: false,
                providerId: this.state.activeProvider,
                error: PERPS_ERROR_CODES.CLIENT_REINITIALIZING,
            };
        }
        __classPrivateFieldSet(this, _PerpsController_isReinitializing, true, "f");
        // Store previous provider for rollback on failure
        const previousProvider = this.state.activeProvider;
        try {
            await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_cleanupStandaloneProvider).call(this);
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Provider switch initiated', {
                from: previousProvider,
                to: providerId,
                timestamp: new Date().toISOString(),
            });
            // Provider disconnect is handled by performInitialization() during
            // reinitialization. The disconnect() method skips provider teardown
            // when isReinitializing is true to prevent double-disconnect.
            // Update state with new provider (market data cache preserved per-provider)
            this.update((state) => {
                state.activeProvider = providerId;
                state.accountState = null;
                state.initializationState = InitializationState.Uninitialized;
            });
            // Reset initialization state and reinitialize
            this.isInitialized = false;
            __classPrivateFieldSet(this, _PerpsController_initializationPromise, null, "f");
            await this.init();
            // Check if initialization actually succeeded — performInitialization()
            // does not throw on failure, it sets state to Failed and resolves.
            if (this.state.initializationState === InitializationState.Failed) {
                throw new Error(this.state.initializationError ?? 'Provider initialization failed');
            }
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Provider switch completed', {
                providerId,
                timestamp: new Date().toISOString(),
            });
            return { success: true, providerId };
        }
        catch (error) {
            // Rollback state to previous provider
            this.update((state) => {
                state.activeProvider = previousProvider;
            });
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.switchProvider'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'switchProvider', { providerId }));
            // Attempt to reinitialize the previous provider via init(),
            // which handles all provider modes including 'aggregated'.
            try {
                this.isInitialized = false;
                __classPrivateFieldSet(this, _PerpsController_initializationPromise, null, "f");
                await this.init();
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Rollback to previous provider succeeded', {
                    previousProvider,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (reinitError) {
                // Reinit also failed — mark as failed
                this.update((state) => {
                    state.initializationState = InitializationState.Failed;
                });
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(reinitError, 'PerpsController.switchProvider.rollback'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'switchProvider.rollback', {
                    previousProvider,
                }));
            }
            return {
                success: false,
                providerId: previousProvider,
                error: error instanceof Error
                    ? error.message
                    : PERPS_ERROR_CODES.UNKNOWN_ERROR,
            };
        }
        finally {
            __classPrivateFieldSet(this, _PerpsController_isReinitializing, false, "f");
            // Re-trigger preload now that reinit is complete.
            if (__classPrivateFieldGet(this, _PerpsController_preloadTimer, "f")) {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performMarketDataPreload).call(this).catch(() => {
                    /* fire-and-forget */
                });
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performUserDataPreload).call(this).catch(() => {
                    /* fire-and-forget */
                });
            }
        }
    }
    /**
     * Get current network (mainnet/testnet)
     *
     * @returns Either 'mainnet' or 'testnet' based on the current configuration.
     */
    getCurrentNetwork() {
        return this.state.isTestnet ? 'testnet' : 'mainnet';
    }
    /**
     * Get the ordered list of all market categories for HIP-3 markets.
     * Returns a stable, explicitly ordered array so the UI can render
     * category filter tabs without deriving order from config insertion.
     *
     * @returns Ordered array of {@link MarketTypeFilter} values. Does not include the 'all' or 'new' sentinels — those are separate UI controls.
     */
    getMarketCategories() {
        return MARKET_CATEGORIES;
    }
    /**
     * Get the current WebSocket connection state from the active provider.
     * Used by the UI to monitor connection health and show notifications.
     *
     * @returns The current WebSocket connection state, or DISCONNECTED if not supported
     */
    getWebSocketConnectionState() {
        try {
            const provider = this.getActiveProvider();
            if (provider.getWebSocketConnectionState) {
                return provider.getWebSocketConnectionState();
            }
            // Fallback for providers that don't support this method
            return WebSocketConnectionState.Disconnected;
        }
        catch {
            // If no provider is active, return disconnected
            return WebSocketConnectionState.Disconnected;
        }
    }
    /**
     * Subscribe to WebSocket connection state changes from the active provider.
     * The listener will be called immediately with the current state and whenever the state changes.
     *
     * @param listener - Callback function that receives the new connection state and reconnection attempt
     * @returns Unsubscribe function to remove the listener, or no-op if not supported
     */
    subscribeToConnectionState(listener) {
        try {
            const provider = this.getActiveProvider();
            if (provider.subscribeToConnectionState) {
                return provider.subscribeToConnectionState(listener);
            }
            // Fallback: immediately call with current state and return no-op unsubscribe
            listener(this.getWebSocketConnectionState(), 0);
            return () => {
                // No-op
            };
        }
        catch {
            // If no provider is active, call with disconnected and return no-op
            listener(WebSocketConnectionState.Disconnected, 0);
            return () => {
                // No-op
            };
        }
    }
    /**
     * Manually trigger a WebSocket reconnection attempt.
     * Used by the UI retry button when connection is lost.
     */
    async reconnect() {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, '[PerpsController] reconnect() called');
        try {
            const provider = this.getActiveProvider();
            if (provider.reconnect) {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, '[PerpsController] Delegating to provider.reconnect()');
                await provider.reconnect();
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, '[PerpsController] provider.reconnect() completed');
            }
            else {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, '[PerpsController] Provider does not support reconnect()');
            }
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.reconnect'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'reconnect', {
                operation: 'websocket_reconnect',
            }));
        }
    }
    // Live data delegation (NO Redux) - delegates to active provider
    /**
     * Subscribe to live price updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToPrices(params) {
        const provider = this.getActiveProviderOrNull();
        if (!provider) {
            return () => {
                // No-op: Provider not initialized
            };
        }
        try {
            return provider.subscribeToPrices(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.subscribeToPrices'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'subscribeToPrices', {
                symbols: params.symbols?.join(','),
            }));
            return () => {
                // No-op
            };
        }
    }
    /**
     * Subscribe to live position updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToPositions(params) {
        const provider = this.getActiveProviderOrNull();
        if (!provider) {
            return () => {
                // No-op: Provider not initialized
            };
        }
        try {
            return provider.subscribeToPositions(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.subscribeToPositions'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'subscribeToPositions', {
                accountId: params.accountId,
            }));
            return () => {
                // No-op
            };
        }
    }
    /**
     * Subscribe to live order fill updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrderFills(params) {
        const provider = this.getActiveProviderOrNull();
        if (!provider) {
            return () => {
                // No-op: Provider not initialized
            };
        }
        try {
            return provider.subscribeToOrderFills(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.subscribeToOrderFills'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'subscribeToOrderFills', {
                accountId: params.accountId,
            }));
            return () => {
                // No-op
            };
        }
    }
    /**
     * Subscribe to live order updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrders(params) {
        const provider = this.getActiveProviderOrNull();
        if (!provider) {
            return () => {
                // No-op: Provider not initialized
            };
        }
        try {
            return provider.subscribeToOrders(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.subscribeToOrders'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'subscribeToOrders', {
                accountId: params.accountId,
            }));
            return () => {
                // No-op
            };
        }
    }
    /**
     * Subscribe to live account updates.
     * Updates controller state (Redux) when new account data arrives so consumers
     * like usePerpsBalanceTokenFilter (PayWithModal) see the latest balance.
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToAccount(params) {
        const provider = this.getActiveProviderOrNull();
        if (!provider) {
            return () => {
                // No-op: Provider not initialized
            };
        }
        try {
            const originalCallback = params.callback;
            return provider.subscribeToAccount({
                ...params,
                callback: (account) => {
                    if (account) {
                        this.update((state) => {
                            state.accountState = account;
                            state.lastUpdateTimestamp = Date.now();
                            state.lastError = null;
                        });
                    }
                    originalCallback(account);
                },
            });
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.subscribeToAccount'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'subscribeToAccount', {
                accountId: params.accountId,
            }));
            return () => {
                // No-op
            };
        }
    }
    /**
     * Subscribe to full order book updates with multiple depth levels
     * Creates a dedicated L2Book subscription for real-time order book data
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOrderBook(params) {
        const provider = this.getActiveProviderOrNull();
        if (!provider) {
            return () => {
                // No-op: Provider not initialized
            };
        }
        try {
            return provider.subscribeToOrderBook(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.subscribeToOrderBook'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'subscribeToOrderBook', {
                symbol: params.symbol,
                levels: params.levels,
            }));
            return () => {
                // No-op
            };
        }
    }
    /**
     * Subscribe to live candle updates
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToCandles(params) {
        const provider = this.getActiveProviderOrNull();
        if (!provider) {
            return () => {
                // No-op: Provider not initialized
            };
        }
        try {
            return provider.subscribeToCandles(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.subscribeToCandles'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'subscribeToCandles', {
                symbol: params.symbol,
                interval: params.interval,
                duration: params.duration,
            }));
            return () => {
                // No-op
            };
        }
    }
    /**
     * Subscribe to open interest cap updates
     * Zero additional network overhead - data comes from existing webData3 subscription
     *
     * @param params - The operation parameters.
     * @returns A cleanup function to remove the subscription.
     */
    subscribeToOICaps(params) {
        const provider = this.getActiveProviderOrNull();
        if (!provider) {
            return () => {
                // No-op: Provider not initialized
            };
        }
        try {
            return provider.subscribeToOICaps(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.subscribeToOICaps'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'subscribeToOICaps', {
                accountId: params.accountId,
            }));
            return () => {
                // No-op
            };
        }
    }
    /**
     * Configure live data throttling
     *
     * @param config - The configuration object.
     */
    setLiveDataConfig(config) {
        try {
            const provider = this.getActiveProvider();
            provider.setLiveDataConfig(config);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.setLiveDataConfig'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'setLiveDataConfig'));
        }
    }
    /**
     * Calculate trading fees for the active provider
     * Each provider implements its own fee structure
     *
     * @param params - The operation parameters.
     * @returns The fee calculation result for the trade.
     */
    async calculateFees(params) {
        const provider = this.getActiveProvider();
        // Preview owns subscription hydration. The submit resolver remains a pure
        // cache read and can therefore never start a benefits request while an
        // order is being signed.
        await __classPrivateFieldGet(this, _PerpsController_rewardsIntegrationService, "f").refreshSubscriptionBenefits();
        const waiverStatus = __classPrivateFieldGet(this, _PerpsController_rewardsIntegrationService, "f").getSubscriptionFeeWaiverStatus();
        const context = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'calculateFees', {
            subscriptionFeeWaiver: waiverStatus.reason === 'no-source' ? undefined : waiverStatus,
        });
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").calculateFees({ provider, params, context });
    }
    /**
     * Approve the dedicated subscription builder outside order submission.
     * Until this succeeds, subscription waivers fall back to the ordinary
     * builder at the standard fee.
     *
     * @returns Whether the subscription builder is approved.
     */
    async approveSubscriptionBuilderFee() {
        const provider = this.getActiveProvider();
        return provider.approveSubscriptionBuilderFee
            ? provider.approveSubscriptionBuilderFee()
            : false;
    }
    /**
     * Drop the cached subscription benefits snapshot.
     *
     * Call this when the identity behind the benefits changes — sign-out, or a
     * profile switch. The snapshot carries no profile identity of its own, so
     * without this it keeps answering for the previous profile until the next
     * successful refresh. The next fee resolution reports the waiver as
     * unavailable, so it is withheld until preview or lifecycle hydration.
     */
    invalidateSubscriptionBenefits() {
        __classPrivateFieldGet(this, _PerpsController_rewardsIntegrationService, "f").invalidateSubscriptionBenefits();
    }
    /**
     * Disconnect provider and cleanup subscriptions
     * Call this when navigating away from Perps screens to prevent battery drain
     */
    async disconnect() {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Disconnecting provider to cleanup subscriptions', {
            timestamp: new Date().toISOString(),
        });
        // Stop preload interval and messenger subscriptions first,
        // so no background work fires while we tear down providers.
        if (__classPrivateFieldGet(this, _PerpsController_preloadTimer, "f")) {
            clearInterval(__classPrivateFieldGet(this, _PerpsController_preloadTimer, "f"));
            __classPrivateFieldSet(this, _PerpsController_preloadTimer, null, "f");
        }
        if (__classPrivateFieldGet(this, _PerpsController_preloadStateUnsubscribe, "f")) {
            __classPrivateFieldGet(this, _PerpsController_preloadStateUnsubscribe, "f").call(this);
            __classPrivateFieldSet(this, _PerpsController_preloadStateUnsubscribe, null, "f");
        }
        if (__classPrivateFieldGet(this, _PerpsController_accountChangeUnsubscribe, "f")) {
            __classPrivateFieldGet(this, _PerpsController_accountChangeUnsubscribe, "f").call(this);
            __classPrivateFieldSet(this, _PerpsController_accountChangeUnsubscribe, null, "f");
        }
        __classPrivateFieldSet(this, _PerpsController_previousIsTestnet, null, "f");
        __classPrivateFieldSet(this, _PerpsController_previousHip3ConfigVersion, null, "f");
        // Only disconnect the provider if we're initialized
        if (this.isInitialized && !this.isCurrentlyReinitializing()) {
            try {
                const provider = this.getActiveProvider();
                await provider.disconnect();
            }
            catch (error) {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.disconnect'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'disconnect'));
            }
        }
        // Clear stale reference so standalone reads don't route through old provider
        this.activeProviderInstance = null;
        // Cleanup cached standalone provider (if any) — awaited to prevent races
        await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_cleanupStandaloneProvider).call(this);
        // Note: Feature-flag subscription is NOT cleaned up here.
        // It is a controller-lifetime concern (set once in the constructor),
        // not a session-lifetime concern. Unsubscribing here would break
        // geo-blocking / HIP-3 flag propagation after disconnect → reconnect.
        // Reset initialization state to ensure proper reconnection
        this.isInitialized = false;
        __classPrivateFieldSet(this, _PerpsController_initializationPromise, null, "f");
    }
    /**
     * Eligibility (Geo-Blocking)
     */
    /**
     * Fetch geo location
     *
     * Returned in Country or Country-Region format
     * Example: FR, DE, US-MI, CA-ON
     */
    /**
     * Refresh eligibility status
     */
    /**
     * Resume eligibility monitoring after onboarding completes.
     * Clears the deferred flag and triggers an immediate eligibility check
     * using the current remote feature flag state.
     */
    startEligibilityMonitoring() {
        __classPrivateFieldSet(this, _PerpsController_eligibilityCheckDeferred, false, "f");
        try {
            const currentState = this.messenger.call('RemoteFeatureFlagController:getState');
            this.refreshEligibilityOnFeatureFlagChange(currentState);
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.startEligibilityMonitoring'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'startEligibilityMonitoring', {
                operation: 'readRemoteFeatureFlags',
            }));
        }
    }
    /**
     * Stops geo-blocking eligibility monitoring.
     * Call this when the user disables basic functionality (e.g. useExternalServices becomes false).
     * Prevents geolocation calls until startEligibilityMonitoring() is called again.
     * Safe to call multiple times.
     */
    stopEligibilityMonitoring() {
        __classPrivateFieldSet(this, _PerpsController_eligibilityCheckDeferred, true, "f");
    }
    async refreshEligibility() {
        if (__classPrivateFieldGet(this, _PerpsController_eligibilityCheckDeferred, "f")) {
            return;
        }
        // Capture the current version before starting the async operation.
        // This prevents race conditions where stale eligibility checks
        // (started with fallback config) overwrite results from newer checks
        // (started with remote config after it was fetched).
        const versionAtStart = __classPrivateFieldGet(this, _PerpsController_blockedRegionListVersion, "f");
        try {
            const geoLocation = await this.messenger.call('GeolocationController:getGeolocation');
            const isEligible = await __classPrivateFieldGet(this, _PerpsController_eligibilityService, "f").checkEligibility({
                blockedRegions: this.blockedRegionList.list,
                geoLocation,
            });
            // Only update state if the blocked region list hasn't changed while we were awaiting.
            // This prevents stale fallback-based eligibility checks from overwriting
            // results from remote-based checks.
            if (__classPrivateFieldGet(this, _PerpsController_blockedRegionListVersion, "f") !== versionAtStart) {
                return;
            }
            this.update((state) => {
                state.isEligible = isEligible;
            });
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.refreshEligibility'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'refreshEligibility'));
            // Only update on error if version is still current
            if (__classPrivateFieldGet(this, _PerpsController_blockedRegionListVersion, "f") === versionAtStart) {
                // Default to eligible on error
                this.update((state) => {
                    state.isEligible = true;
                });
            }
        }
    }
    /**
     * Get block explorer URL for an address or just the base URL
     *
     * @param address - Optional address to append to the base URL
     * @returns Block explorer URL
     */
    getBlockExplorerUrl(address) {
        const provider = this.getActiveProvider();
        return __classPrivateFieldGet(this, _PerpsController_marketDataService, "f").getBlockExplorerUrl({ provider, address });
    }
    /**
     * Check if user is first-time for the current network
     *
     * @returns True if the condition is met.
     */
    isFirstTimeUserOnCurrentNetwork() {
        const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
        return this.state.isFirstTimeUser[currentNetwork];
    }
    /**
     * Mark that the user has completed the tutorial/onboarding
     * This prevents the tutorial from showing again
     */
    markTutorialCompleted() {
        const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Marking tutorial as completed', {
            timestamp: new Date().toISOString(),
            network: currentNetwork,
        });
        this.update((state) => {
            state.isFirstTimeUser[currentNetwork] = false;
        });
    }
    /*
     * Mark that user has placed their first successful order
     * This prevents the notification tooltip from showing again
     */
    markFirstOrderCompleted() {
        const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Marking first order completed', {
            timestamp: new Date().toISOString(),
            network: currentNetwork,
        });
        this.update((state) => {
            state.hasPlacedFirstOrder[currentNetwork] = true;
        });
    }
    /**
     * Reset first-time user state for both networks
     * This is useful for testing the tutorial flow
     * Called by Reset Account feature in settings
     */
    resetFirstTimeUserState() {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Resetting first-time user state', {
            timestamp: new Date().toISOString(),
            previousState: this.state.isFirstTimeUser,
        });
        this.update((state) => {
            state.isFirstTimeUser = {
                testnet: true,
                mainnet: true,
            };
            state.hasPlacedFirstOrder = {
                testnet: false,
                mainnet: false,
            };
        });
    }
    /**
     * Clear pending/bridging withdrawal and deposit requests
     * This is useful when users want to clear stuck pending indicators
     * Called by Reset Account feature in settings
     */
    clearPendingTransactionRequests() {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Clearing pending transaction requests', {
            timestamp: new Date().toISOString(),
        });
        this.update((state) => {
            // Filter out pending/bridging withdrawals, keep completed for history
            state.withdrawalRequests = state.withdrawalRequests.filter((req) => req.status !== 'pending' && req.status !== 'bridging');
            // Filter out pending deposits, keep completed/failed for history
            state.depositRequests = state.depositRequests.filter((req) => req.status !== 'pending' && req.status !== 'bridging');
            // Reset withdrawal progress
            state.withdrawalProgress = {
                progress: 0,
                lastUpdated: Date.now(),
                activeWithdrawalId: null,
            };
        });
    }
    /**
     * Get saved trade configuration for a market
     *
     * @param symbol - The trading pair symbol.
     * @returns The resulting string value.
     */
    getTradeConfiguration(symbol) {
        const network = this.state.isTestnet ? 'testnet' : 'mainnet';
        const config = this.state.tradeConfigurations[network]?.[symbol];
        if (!config?.leverage) {
            return undefined;
        }
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Retrieved trade config', {
            symbol,
            network,
            leverage: config.leverage,
        });
        return { leverage: config.leverage };
    }
    /**
     * Save trade configuration for a market
     *
     * @param symbol - Market symbol
     * @param leverage - Leverage value
     */
    saveTradeConfiguration(symbol, leverage) {
        const network = this.state.isTestnet ? 'testnet' : 'mainnet';
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Saving trade configuration', {
            symbol,
            network,
            leverage,
            timestamp: new Date().toISOString(),
        });
        this.update((state) => {
            if (!state.tradeConfigurations[network]) {
                state.tradeConfigurations[network] = {};
            }
            const existingConfig = state.tradeConfigurations[network][symbol] || {};
            state.tradeConfigurations[network][symbol] = {
                ...existingConfig,
                leverage,
            };
        });
    }
    /**
     * Save pending trade configuration for a market
     * This is a temporary configuration that expires after 5 minutes
     *
     * @param symbol - Market symbol
     * @param config - Pending trade configuration (includes optional selected payment token from Pay row)
     * @param config.amount - The amount value.
     * @param config.leverage - The leverage multiplier.
     * @param config.takeProfitPrice - The take profit price.
     * @param config.stopLossPrice - The stop loss price.
     * @param config.limitPrice - The limit price.
     * @param config.orderType - The order type.
     * @param config.selectedPaymentToken - The selected payment token.
     */
    savePendingTradeConfiguration(symbol, config) {
        const network = this.state.isTestnet ? 'testnet' : 'mainnet';
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Saving pending trade configuration', {
            symbol,
            network,
            config,
            timestamp: new Date().toISOString(),
        });
        this.update((state) => {
            if (!state.tradeConfigurations[network]) {
                state.tradeConfigurations[network] = {};
            }
            const existingConfig = state.tradeConfigurations[network][symbol] || {};
            state.tradeConfigurations[network][symbol] = {
                ...existingConfig,
                pendingConfig: {
                    ...config,
                    timestamp: Date.now(),
                },
            };
        });
    }
    /**
     * Get pending trade configuration for a market
     * Returns undefined if config doesn't exist or has expired (more than 5 minutes old)
     *
     * @param symbol - Market symbol
     * @returns Pending trade configuration or undefined
     */
    getPendingTradeConfiguration(symbol) {
        const network = this.state.isTestnet ? 'testnet' : 'mainnet';
        const config = this.state.tradeConfigurations[network]?.[symbol]?.pendingConfig;
        if (!config) {
            return undefined;
        }
        // Check if config has expired (5 minutes = 300,000 milliseconds)
        const FIVE_MINUTES_MS = 5 * 60 * 1000;
        const now = Date.now();
        const age = now - config.timestamp;
        if (age > FIVE_MINUTES_MS) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Pending trade config expired', {
                symbol,
                network,
                age,
                timestamp: config.timestamp,
            });
            // Clear expired config
            this.update((state) => {
                if (state.tradeConfigurations[network]?.[symbol]?.pendingConfig) {
                    delete state.tradeConfigurations[network][symbol].pendingConfig;
                }
            });
            return undefined;
        }
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Retrieved pending trade config', {
            symbol,
            network,
            config,
            age,
        });
        // Return config without timestamp
        const { timestamp, ...configWithoutTimestamp } = config;
        return configWithoutTimestamp;
    }
    /**
     * Clear pending trade configuration for a market
     *
     * @param symbol - Market symbol
     */
    clearPendingTradeConfiguration(symbol) {
        const network = this.state.isTestnet ? 'testnet' : 'mainnet';
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Clearing pending trade configuration', {
            symbol,
            network,
            timestamp: new Date().toISOString(),
        });
        this.update((state) => {
            if (state.tradeConfigurations[network]?.[symbol]?.pendingConfig) {
                delete state.tradeConfigurations[network][symbol].pendingConfig;
            }
        });
    }
    /**
     * Get saved market filter preferences
     * Handles backward compatibility with legacy string format
     *
     * @returns The saved sort option ID and direction.
     */
    getMarketFilterPreferences() {
        const pref = this.state.marketFilterPreferences;
        // Handle legacy string format (backward compatibility)
        if (typeof pref === 'string') {
            // Map legacy compound IDs to new format
            // Old format: 'priceChange-desc' or 'priceChange-asc'
            // New format: { optionId: 'priceChange', direction: 'desc'/'asc' }
            if (pref === 'priceChange-desc') {
                return {
                    optionId: 'priceChange',
                    direction: 'desc',
                };
            }
            if (pref === 'priceChange-asc') {
                return {
                    optionId: 'priceChange',
                    direction: 'asc',
                };
            }
            // Handle other simple legacy strings (e.g., 'volume', 'openInterest', etc.)
            return {
                optionId: pref,
                direction: MARKET_SORTING_CONFIG.DefaultDirection,
            };
        }
        // Return new object format or default
        return (pref ?? {
            optionId: MARKET_SORTING_CONFIG.DefaultSortOptionId,
            direction: MARKET_SORTING_CONFIG.DefaultDirection,
        });
    }
    /**
     * Save market filter preferences
     *
     * @param optionId - Sort/filter option ID
     * @param direction - Sort direction ('asc' or 'desc')
     */
    saveMarketFilterPreferences(optionId, direction) {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Saving market filter preferences', {
            optionId,
            direction,
            timestamp: new Date().toISOString(),
        });
        this.update((state) => {
            state.marketFilterPreferences = { optionId, direction };
        });
    }
    /**
     * Get the user's max slippage tolerance in basis points.
     *
     * @returns The configured max slippage bps, or undefined if never set (callers should default to 300 bps / 3%).
     */
    getMaxSlippage() {
        return this.state.maxSlippageBps;
    }
    /**
     * Set the user's max slippage tolerance in basis points.
     *
     * @param bps - Max slippage in basis points (e.g. 300 = 3%). Clamped to 10–1000, snapped to step of 10.
     */
    setMaxSlippage(bps) {
        // Reject non-finite input (NaN/Infinity) so it cannot reach the order
        // path, where it would poison `getMaxSlippage` and produce a NaN limit
        // price. `Math.max(..., NaN)` returns NaN and `??` does not catch it.
        if (!Number.isFinite(bps)) {
            return;
        }
        const clamped = Math.min(MAX_SLIPPAGE_BOUNDS.MaxBps, Math.max(MAX_SLIPPAGE_BOUNDS.MinBps, bps));
        const snapped = Math.round(clamped / MAX_SLIPPAGE_BOUNDS.StepBps) *
            MAX_SLIPPAGE_BOUNDS.StepBps;
        this.update((state) => {
            state.maxSlippageBps = snapped;
        });
    }
    /**
     * Get the user's pro-mode layout preferences (network-independent).
     *
     * @returns The current pro-mode layout preferences.
     */
    getProLayoutPreferences() {
        // Merge over defaults so callers always receive a fully-populated object,
        // even if the persisted state predates one of the fields.
        return {
            ...DEFAULT_PRO_LAYOUT_PREFERENCES,
            ...this.state.proLayoutPreferences,
        };
    }
    /**
     * Update the user's pro-mode layout preferences.
     *
     * Patch-style setter: only the provided fields are updated, the rest are
     * preserved. This keeps the signature stable as new layout fields are added.
     *
     * @param patch - Partial set of pro-mode layout preferences to update.
     */
    setProLayoutPreferences(patch) {
        this.update((state) => {
            state.proLayoutPreferences = {
                ...state.proLayoutPreferences,
                ...patch,
            };
        });
    }
    /**
     * Set the Perps interface mode (lite/pro).
     *
     * @param mode - The mode to switch to.
     */
    setPerpsMode(mode) {
        this.update((state) => {
            state.mode = mode;
        });
    }
    /**
     * Set the selected payment token for the Perps order/deposit flow.
     * Pass null or a token with description PERPS_CONSTANTS.PerpsBalanceTokenDescription to select Perps balance.
     * Only required fields (address, chainId) are stored in state; description and symbol are optional.
     *
     * @param token - The token identifier.
     */
    setSelectedPaymentToken(token) {
        let normalized = null;
        if (token !== null &&
            token.description !== PERPS_CONSTANTS.PerpsBalanceTokenDescription) {
            normalized = token;
        }
        const current = this.state.selectedPaymentToken;
        const initialPaymentMethod = current === null ||
            current === undefined ||
            current?.description === PERPS_CONSTANTS.PerpsBalanceTokenDescription
            ? 'perps_balance'
            : (current?.symbol ?? 'unknown');
        const newPaymentMethod = token === null ||
            token.description === PERPS_CONSTANTS.PerpsBalanceTokenDescription
            ? 'perps_balance'
            : (token.symbol ?? 'unknown');
        if (initialPaymentMethod !== newPaymentMethod) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getMetrics).call(this).trackPerpsEvent(PerpsAnalyticsEvent.UiInteraction, {
                [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: PERPS_EVENT_VALUE.INTERACTION_TYPE.PAYMENT_METHOD_CHANGED,
                [PERPS_EVENT_PROPERTY.INITIAL_PAYMENT_METHOD]: initialPaymentMethod,
                [PERPS_EVENT_PROPERTY.NEW_PAYMENT_METHOD]: newPaymentMethod,
            });
        }
        let snapshot = null;
        if (normalized !== null) {
            snapshot = {
                ...(normalized.description !== undefined && {
                    description: normalized.description,
                }),
                address: normalized.address,
                chainId: normalized.chainId,
                symbol: normalized.symbol,
            };
        }
        this.update((state) => {
            state.selectedPaymentToken = snapshot;
        });
    }
    /**
     * Reset the selected payment token to Perps balance (null).
     * Call when leaving the Perps order view so the next visit defaults to Perps balance.
     */
    resetSelectedPaymentToken() {
        this.update((state) => {
            state.selectedPaymentToken = null;
        });
    }
    /**
     * Get saved order book grouping for a market
     *
     * @param symbol - Market symbol
     * @returns The saved grouping value or undefined if not set
     */
    getOrderBookGrouping(symbol) {
        const network = this.state.isTestnet ? 'testnet' : 'mainnet';
        const grouping = this.state.tradeConfigurations[network]?.[symbol]?.orderBookGrouping;
        if (grouping !== undefined) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Retrieved order book grouping', {
                symbol,
                network,
                grouping,
            });
        }
        return grouping;
    }
    /**
     * Save order book grouping for a market
     *
     * @param symbol - Market symbol
     * @param grouping - Price grouping value
     */
    saveOrderBookGrouping(symbol, grouping) {
        const network = this.state.isTestnet ? 'testnet' : 'mainnet';
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Saving order book grouping', {
            symbol,
            network,
            grouping,
            timestamp: new Date().toISOString(),
        });
        this.update((state) => {
            if (!state.tradeConfigurations[network]) {
                state.tradeConfigurations[network] = {};
            }
            const existingConfig = state.tradeConfigurations[network][symbol] || {};
            state.tradeConfigurations[network][symbol] = {
                ...existingConfig,
                orderBookGrouping: grouping,
            };
        });
    }
    /**
     * Toggle watchlist status for a market.
     *
     * Updates local state immediately (optimistic UI) and then syncs the new
     * watchlist to AuthenticatedUserStorageService.  If the remote write fails,
     * the local state is reverted so it stays consistent with AUS.
     *
     * When the user is unauthenticated, or the active provider is not yet
     * supported by the AUS schema, the controller continues operating with
     * local-persisted state only — no error is surfaced to the caller.
     *
     * Watchlist markets are stored per network (testnet/mainnet).
     *
     * @param symbol - The trading pair symbol.
     */
    async toggleWatchlistMarket(symbol) {
        const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
        const currentWatchlist = this.state.watchlistMarkets[currentNetwork];
        const isWatchlisted = currentWatchlist.includes(symbol);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Toggling watchlist market', {
            timestamp: new Date().toISOString(),
            network: currentNetwork,
            symbol,
            action: isWatchlisted ? 'remove' : 'add',
        });
        // Step 1: Optimistic local state update — UI reflects change immediately.
        this.update((state) => {
            if (isWatchlisted) {
                state.watchlistMarkets[currentNetwork] = currentWatchlist.filter((marketSymbol) => marketSymbol !== symbol);
            }
            else {
                state.watchlistMarkets[currentNetwork] = [...currentWatchlist, symbol];
            }
        });
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getMetrics).call(this).trackPerpsEvent(PerpsAnalyticsEvent.UiInteraction, {
            [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]: PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
            [PERPS_EVENT_PROPERTY.ASSET]: symbol,
            [PERPS_EVENT_PROPERTY.ACTION_TYPE]: isWatchlisted
                ? PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET
                : PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET,
            [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: this.state.watchlistMarkets[currentNetwork].length,
        });
        // Step 2: Persist to AUS; revert local state if the write fails.
        // Enqueue behind #ausQueue so that:
        //   - concurrent toggles serialize their GET-merge-PUT sequences, and
        //   - any in-flight init hydration completes before we issue a write.
        try {
            await new Promise((resolve, reject) => {
                __classPrivateFieldSet(this, _PerpsController_ausQueue, __classPrivateFieldGet(this, _PerpsController_ausQueue, "f")
                    .then(() => __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_persistWatchlistToRemote).call(this, currentNetwork))
                    .then(resolve, reject)
                    // Swallow the error on the queue chain so later operations can run.
                    .catch(() => undefined), "f");
            });
        }
        catch (error) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.toggleWatchlistMarket'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'toggleWatchlistMarket', {
                symbol,
                network: currentNetwork,
                action: isWatchlisted ? 'remove' : 'add',
            }));
            // Revert the optimistic update.
            this.update((state) => {
                state.watchlistMarkets[currentNetwork] = currentWatchlist;
            });
        }
    }
    /**
     * Check if a market is in the watchlist on the current network
     *
     * @param symbol - The trading pair symbol.
     * @returns True if the condition is met.
     */
    isWatchlistMarket(symbol) {
        const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
        return this.state.watchlistMarkets[currentNetwork].includes(symbol);
    }
    /**
     * Get all watchlist markets for the current network
     *
     * @returns The resulting string value.
     */
    getWatchlistMarkets() {
        const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
        return this.state.watchlistMarkets[currentNetwork];
    }
    /**
     * Record that the user viewed a market.
     *
     * The symbol is prepended to the per-network recently-viewed list (newest-first).
     * Any existing entry for the same symbol is removed first so there are no
     * duplicates. The list is then capped at PERPS_CONSTANTS.RecentlyViewedMarketsLimit.
     *
     * @param symbol - The trading pair symbol (e.g. 'BTC', 'ETH', 'xyz:TSLA').
     */
    recordMarketViewed(symbol) {
        const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
        const now = Date.now();
        this.update((state) => {
            const current = state.recentlyViewedMarkets[currentNetwork].filter((entry) => entry.symbol !== symbol);
            state.recentlyViewedMarkets[currentNetwork] = [
                { symbol, viewedAt: now },
                ...current,
            ].slice(0, PERPS_CONSTANTS.RecentlyViewedMarketsLimit);
        });
    }
    /**
     * Get recently viewed markets for the current network.
     *
     * Returns up to PERPS_CONSTANTS.RecentlyViewedMarketsLimit symbols, ordered
     * newest-first, filtered to entries within the last
     * PERPS_CONSTANTS.RecentlyViewedMarketsTtlMs (24 hours). Returns an empty
     * array when no qualifying entries exist.
     *
     * @returns Ordered array of market symbols.
     */
    getRecentlyViewedMarkets() {
        const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
        const cutoff = Date.now() - PERPS_CONSTANTS.RecentlyViewedMarketsTtlMs;
        return this.state.recentlyViewedMarkets[currentNetwork]
            .filter((entry) => entry.viewedAt > cutoff)
            .map((entry) => entry.symbol)
            .slice(0, PERPS_CONSTANTS.RecentlyViewedMarketsLimit);
    }
    /**
     * Report order events to data lake API with retry (non-blocking)
     * Thin delegation to DataLakeService
     *
     * @param params - The operation parameters.
     * @param params.action - The order action.
     * @param params.symbol - The trading pair symbol.
     * @param params.slPrice - The stop loss price.
     * @param params.tpPrice - The take profit price.
     * @param params.retryCount - Internal retry counter.
     * @param params._traceId - Internal trace ID.
     * @returns Whether the report was sent successfully, with an optional error message.
     */
    async reportOrderToDataLake(params) {
        return __classPrivateFieldGet(this, _PerpsController_dataLakeService, "f").reportOrder({
            action: params.action,
            symbol: params.symbol,
            slPrice: params.slPrice,
            tpPrice: params.tpPrice,
            isTestnet: this.state.isTestnet,
            context: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createServiceContext).call(this, 'reportOrderToDataLake', {}),
            retryCount: params.retryCount,
            _traceId: params._traceId,
        });
    }
    /**
     * Check if the controller is currently reinitializing
     *
     * @returns true if providers are being reinitialized
     */
    isCurrentlyReinitializing() {
        return __classPrivateFieldGet(this, _PerpsController_isReinitializing, "f");
    }
}
_a = PerpsController, _PerpsController_initializationPromise = new WeakMap(), _PerpsController_isReinitializing = new WeakMap(), _PerpsController_myxRegistrationPromise = new WeakMap(), _PerpsController_lighterRegistrationPromise = new WeakMap(), _PerpsController_blockedRegionListVersion = new WeakMap(), _PerpsController_hip3Enabled = new WeakMap(), _PerpsController_hip3AllowlistMarkets = new WeakMap(), _PerpsController_hip3BlocklistMarkets = new WeakMap(), _PerpsController_hip3ConfigSource = new WeakMap(), _PerpsController_priceDeviationLimit = new WeakMap(), _PerpsController_attributionContext = new WeakMap(), _PerpsController_standaloneProvider = new WeakMap(), _PerpsController_handlersRegistered = new WeakMap(), _PerpsController_standaloneProviderIsTestnet = new WeakMap(), _PerpsController_standaloneProviderHip3Version = new WeakMap(), _PerpsController_standaloneProviderOperations = new WeakMap(), _PerpsController_eligibilityCheckDeferred = new WeakMap(), _PerpsController_ausQueue = new WeakMap(), _PerpsController_userDiskWrite = new WeakMap(), _PerpsController_options = new WeakMap(), _PerpsController_tradingService = new WeakMap(), _PerpsController_marketDataService = new WeakMap(), _PerpsController_accountService = new WeakMap(), _PerpsController_eligibilityService = new WeakMap(), _PerpsController_dataLakeService = new WeakMap(), _PerpsController_depositService = new WeakMap(), _PerpsController_featureFlagConfigurationService = new WeakMap(), _PerpsController_rewardsIntegrationService = new WeakMap(), _PerpsController_preloadTimer = new WeakMap(), _PerpsController_isPreloading = new WeakMap(), _PerpsController_marketPreloadQueued = new WeakMap(), _PerpsController_isPreloadingUserData = new WeakMap(), _PerpsController_userPreloadQueued = new WeakMap(), _PerpsController_userSnapshotRequests = new WeakMap(), _PerpsController_preloadStateUnsubscribe = new WeakMap(), _PerpsController_accountChangeUnsubscribe = new WeakMap(), _PerpsController_previousIsTestnet = new WeakMap(), _PerpsController_previousHip3ConfigVersion = new WeakMap(), _PerpsController_instances = new WeakSet(), _PerpsController_isMYXProviderEnabled = function _PerpsController_isMYXProviderEnabled() {
    const myx = __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.myx;
    // Local env-var override (MM_PERPS_MYX_PROVIDER_ENABLED) always wins —
    // matches the UI selector (resolvePerpsMyxProviderEnabled) so controller
    // and UI agree on whether MYX is available.
    if (myx?.enabled) {
        return true;
    }
    // Credentials present → MYX is enabled regardless of remote flag.
    // Use || so empty-string env vars (default '') fall through.
    const hasCredentials = Boolean(
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    myx?.appIdTestnet || myx?.appIdMainnet);
    if (hasCredentials) {
        return true;
    }
    // No local override or credentials — check remote flag as fallback
    try {
        const remoteState = this.messenger.call('RemoteFeatureFlagController:getState');
        const remoteFlag = remoteState.remoteFeatureFlags?.perpsMyxProviderEnabled;
        if (isVersionGatedFeatureFlag(remoteFlag)) {
            const validated = __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.featureFlags.validateVersionGated(remoteFlag);
            return validated ?? false;
        }
        return false;
    }
    catch {
        return false;
    }
}, _PerpsController_isLighterProviderEnabled = function _PerpsController_isLighterProviderEnabled() {
    const lighter = __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.lighter;
    if (lighter?.enabled) {
        return true;
    }
    if (!lighter?.signerBridge) {
        return false;
    }
    try {
        const remoteState = this.messenger.call('RemoteFeatureFlagController:getState');
        const remoteFlag = remoteState.remoteFeatureFlags?.perpsLighterProviderEnabled;
        if (isVersionGatedFeatureFlag(remoteFlag)) {
            const validated = __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.featureFlags.validateVersionGated(remoteFlag);
            return validated ?? false;
        }
        return false;
    }
    catch {
        return false;
    }
}, _PerpsController_logError = function _PerpsController_logError(error, options) {
    __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.logger.error(error, options);
}, _PerpsController_debugLog = function _PerpsController_debugLog(...args) {
    __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.debugLogger.log(...args);
}, _PerpsController_awaitInitializationIfInProgress = 
/**
 * Awaits the in-flight initialization promise if init is currently running.
 * Called internally by #getActiveProviderWhenReady().
 */
async function _PerpsController_awaitInitializationIfInProgress() {
    if (this.state.initializationState === InitializationState.Initializing &&
        __classPrivateFieldGet(this, _PerpsController_initializationPromise, "f")) {
        await __classPrivateFieldGet(this, _PerpsController_initializationPromise, "f");
    }
}, _PerpsController_getAggregatedCacheProviderIds = function _PerpsController_getAggregatedCacheProviderIds(cacheKeys) {
    const providerIds = new Set();
    const currentNetwork = this.state.isTestnet ? 'testnet' : 'mainnet';
    for (const [providerId] of this.providers) {
        providerIds.add(providerId);
    }
    for (const key of cacheKeys) {
        const [providerId, network] = key.split(':');
        if (!providerId ||
            network !== currentNetwork ||
            providerId === 'aggregated') {
            continue;
        }
        if (providerId === 'hyperliquid' ||
            (providerId === 'myx' && __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isMYXProviderEnabled).call(this)) ||
            (providerId === 'lighter' && __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isLighterProviderEnabled).call(this)) ||
            this.providers.has(providerId)) {
            providerIds.add(providerId);
        }
    }
    return Array.from(providerIds);
}, _PerpsController_isMarketCacheEntryCurrent = function _PerpsController_isMarketCacheEntryCurrent(providerId, entry, options) {
    if (entry.sourceExpiresAt !== undefined) {
        const expectedDexes = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getStaticSnapshotDexes).call(this);
        return (providerId === 'hyperliquid' &&
            Date.now() < entry.sourceExpiresAt &&
            entry.hip3ConfigVersion === this.state.hip3ConfigVersion &&
            expectedDexes !== undefined &&
            Array.isArray(entry.dexes) &&
            entry.dexes.length === expectedDexes.length &&
            entry.dexes.every((dex, index) => dex === expectedDexes[index]));
    }
    return (options?.skipTTL === true ||
        Date.now() - entry.timestamp <= __classPrivateFieldGet(_a, _a, "f", _PerpsController_preloadGuardMs) * 10);
}, _PerpsController_isUserCacheIdentityCurrent = function _PerpsController_isUserCacheIdentityCurrent(providerId, entry, address) {
    if (entry.address.toLowerCase() !== address.toLowerCase()) {
        return false;
    }
    if (providerId !== 'hyperliquid') {
        return true;
    }
    const expectedDexes = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getStaticSnapshotDexes).call(this);
    return (entry.hip3ConfigVersion === this.state.hip3ConfigVersion &&
        expectedDexes !== undefined &&
        Array.isArray(entry.dexes) &&
        entry.dexes.length === expectedDexes.length &&
        entry.dexes.every((dex, index) => dex === expectedDexes[index]));
}, _PerpsController_fetchAndCacheUserDataSnapshot = async function _PerpsController_fetchAndCacheUserDataSnapshot(context) {
    const { provider, standaloneProvider, address, isTestnet, hip3ConfigVersion, expectedDexes, isCurrent, } = context;
    if (!isCurrent()) {
        throw new Error('User data snapshot context changed');
    }
    if (!provider.getUserDataSnapshot) {
        throw new Error('Provider has no atomic snapshot API');
    }
    const identity = {
        provider: 'hyperliquid',
        network: isTestnet ? 'testnet' : 'mainnet',
        hip3ConfigVersion,
        dexes: expectedDexes,
    };
    const snapshotRequest = provider.getUserDataSnapshot({
        userAddress: address,
        identity,
    });
    const snapshot = standaloneProvider
        ? await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_trackStandaloneProviderOperation).call(this, standaloneProvider, snapshotRequest)
        : await snapshotRequest;
    if (!isCurrent()) {
        throw new Error('User data snapshot context changed');
    }
    const snapshotIdentity = snapshot.identity;
    const hasCompleteBundle = Array.isArray(snapshot.positions) &&
        Array.isArray(snapshot.orders) &&
        snapshot.accountState !== null &&
        typeof snapshot.accountState === 'object';
    const hasExactIdentity = snapshotIdentity.provider === identity.provider &&
        snapshotIdentity.network === identity.network &&
        snapshotIdentity.hip3ConfigVersion === identity.hip3ConfigVersion &&
        snapshotIdentity.address.toLowerCase() === address.toLowerCase() &&
        snapshotIdentity.dexes.length === expectedDexes.length &&
        snapshotIdentity.dexes.every((dex, index) => dex === expectedDexes[index]);
    if (!hasCompleteBundle || !hasExactIdentity) {
        throw new Error('User data snapshot is incomplete or mismatched');
    }
    if (!isCurrent()) {
        throw new Error('User data snapshot context changed');
    }
    const cachedSnapshot = cloneUserDataSnapshot(snapshot);
    const result = cloneUserDataSnapshot(snapshot);
    const timestamp = Date.now();
    const providerNetworkKey = buildProviderCacheKey('hyperliquid', isTestnet);
    this.update((state) => {
        state.cachedUserDataByProvider[providerNetworkKey] = {
            positions: cachedSnapshot.positions,
            orders: cachedSnapshot.orders,
            accountState: cachedSnapshot.accountState,
            timestamp,
            address,
            hip3ConfigVersion,
            dexes: expectedDexes,
        };
    });
    __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_persistUserCacheToDisk).call(this);
    __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: user cache snapshot written', {
        writtenKey: providerNetworkKey,
        availableKeys: Object.keys(this.state.cachedUserDataByProvider).sort(),
        positionCount: cachedSnapshot.positions.length,
        orderCount: cachedSnapshot.orders.length,
    });
    return result;
}, _PerpsController_getOrCreateStandaloneProvider = function _PerpsController_getOrCreateStandaloneProvider() {
    const currentIsTestnet = this.state.isTestnet;
    const currentHip3Version = this.state.hip3ConfigVersion ?? 0;
    if (__classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f") &&
        __classPrivateFieldGet(this, _PerpsController_standaloneProviderIsTestnet, "f") === currentIsTestnet &&
        __classPrivateFieldGet(this, _PerpsController_standaloneProviderHip3Version, "f") === currentHip3Version) {
        return __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f");
    }
    // Stale or missing — retire the old provider after active operations finish.
    if (__classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f")) {
        const old = __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f");
        __classPrivateFieldSet(this, _PerpsController_standaloneProvider, null, "f");
        __classPrivateFieldSet(this, _PerpsController_standaloneProviderIsTestnet, null, "f");
        __classPrivateFieldSet(this, _PerpsController_standaloneProviderHip3Version, null, "f");
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_retireStandaloneProvider).call(this, old).catch(() => {
            /* best-effort */
        });
    }
    __classPrivateFieldSet(this, _PerpsController_standaloneProvider, new HyperLiquidProvider({
        isTestnet: currentIsTestnet,
        hip3Enabled: __classPrivateFieldGet(this, _PerpsController_hip3Enabled, "f"),
        allowlistMarkets: __classPrivateFieldGet(this, _PerpsController_hip3AllowlistMarkets, "f"),
        blocklistMarkets: __classPrivateFieldGet(this, _PerpsController_hip3BlocklistMarkets, "f"),
        priceDeviationLimit: __classPrivateFieldGet(this, _PerpsController_priceDeviationLimit, "f"),
        platformDependencies: __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure,
        messenger: this.messenger,
        builderAddressTestnet: __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.hyperliquid
            ?.builderAddressTestnet,
        builderAddressMainnet: __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.hyperliquid
            ?.builderAddressMainnet,
        subscriptionBuilderAddressTestnet: __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.hyperliquid
            ?.subscriptionBuilderAddressTestnet,
        subscriptionBuilderAddressMainnet: __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.hyperliquid
            ?.subscriptionBuilderAddressMainnet,
    }), "f");
    __classPrivateFieldSet(this, _PerpsController_standaloneProviderIsTestnet, currentIsTestnet, "f");
    __classPrivateFieldSet(this, _PerpsController_standaloneProviderHip3Version, currentHip3Version, "f");
    return __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f");
}, _PerpsController_trackStandaloneProviderOperation = function _PerpsController_trackStandaloneProviderOperation(provider, operation) {
    const operations = __classPrivateFieldGet(this, _PerpsController_standaloneProviderOperations, "f").get(provider) ?? new Set();
    __classPrivateFieldGet(this, _PerpsController_standaloneProviderOperations, "f").set(provider, operations);
    const trackedOperation = operation.finally(() => {
        operations.delete(trackedOperation);
        if (operations.size === 0) {
            __classPrivateFieldGet(this, _PerpsController_standaloneProviderOperations, "f").delete(provider);
        }
    });
    operations.add(trackedOperation);
    return trackedOperation;
}, _PerpsController_retireStandaloneProvider = async function _PerpsController_retireStandaloneProvider(provider) {
    const operations = __classPrivateFieldGet(this, _PerpsController_standaloneProviderOperations, "f").get(provider);
    if (operations?.size) {
        await Promise.allSettled([...operations]);
    }
    try {
        await provider.disconnect();
    }
    catch {
        /* best-effort */
    }
    finally {
        __classPrivateFieldGet(this, _PerpsController_standaloneProviderOperations, "f").delete(provider);
    }
}, _PerpsController_cleanupStandaloneProvider = 
/**
 * Disconnect and discard the cached standalone provider (if any).
 * Best-effort — errors are silently caught.
 */
async function _PerpsController_cleanupStandaloneProvider() {
    const provider = __classPrivateFieldGet(this, _PerpsController_standaloneProvider, "f");
    if (!provider) {
        return;
    }
    __classPrivateFieldSet(this, _PerpsController_standaloneProvider, null, "f");
    __classPrivateFieldSet(this, _PerpsController_standaloneProviderIsTestnet, null, "f");
    __classPrivateFieldSet(this, _PerpsController_standaloneProviderHip3Version, null, "f");
    await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_retireStandaloneProvider).call(this, provider);
}, _PerpsController_getMetrics = function _PerpsController_getMetrics() {
    return __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.metrics;
}, _PerpsController_findNetworkClientIdForChain = function _PerpsController_findNetworkClientIdForChain(chainId) {
    return this.messenger.call('NetworkController:findNetworkClientIdByChainId', chainId);
}, _PerpsController_submitTransaction = 
/**
 * Submit a transaction via messenger (shows confirmation screen)
 *
 * @param txParams - The transaction parameters.
 * @param txParams.from - The sender address.
 * @param txParams.to - The recipient address.
 * @param txParams.value - The transaction value.
 * @param txParams.data - The transaction data payload.
 * @param txParams.gas - The gas limit.
 * @param options - The configuration options.
 * @param options.networkClientId - The network client identifier.
 * @param options.origin - The transaction origin.
 * @param options.type - The transaction type.
 * @param options.skipInitialGasEstimate - Whether to skip initial gas estimation.
 * @returns The transaction result containing a hash promise and transaction metadata.
 */
async function _PerpsController_submitTransaction(txParams, options) {
    // Cast needed: PerpsController uses loose string types for txParams/options
    // while TransactionController uses strict branded types (TransactionParams, AddTransactionOptions)
    return this.messenger.call('TransactionController:addTransaction', 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    txParams, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { ...options, isInternal: true });
}, _PerpsController_migrateRequestsIfNeeded = function _PerpsController_migrateRequestsIfNeeded() {
    this.update((state) => {
        // Remove withdrawal requests without accountAddress - they can't be attributed to any account
        state.withdrawalRequests = state.withdrawalRequests.filter((req) => Boolean(req.accountAddress) && req.status !== 'failed');
        // Remove deposit requests without accountAddress - they can't be attributed to any account
        state.depositRequests = state.depositRequests.filter((req) => Boolean(req.accountAddress));
    });
}, _PerpsController_withStreamPause = 
/**
 * Execute an operation while temporarily pausing specified stream channels
 * to prevent WebSocket updates from triggering UI re-renders during operations.
 *
 * WebSocket connections remain alive but updates are not emitted to subscribers.
 * This prevents race conditions where UI re-renders fetch stale data during operations.
 *
 * @param operation - The async operation to execute
 * @param channels - Array of stream channel names to pause
 * @returns The result of the operation
 * @example
 * ```typescript
 * // Cancel orders without stream interference
 * await this.#withStreamPause(
 *   async () => this.provider.cancelOrders({ cancelAll: true }),
 *   ['orders']
 * );
 *
 * // Close positions and pause multiple streams
 * await this.#withStreamPause(
 *   async () => this.provider.closePositions(positions),
 *   ['positions', 'account', 'orders']
 * );
 * ```
 */
async function _PerpsController_withStreamPause(operation, channels) {
    const pausedChannels = [];
    const { streamManager } = __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure;
    // Pause emission on specified channels (WebSocket stays connected)
    // Track which channels successfully paused to ensure proper cleanup
    for (const channel of channels) {
        try {
            streamManager.pauseChannel(channel);
            pausedChannels.push(channel);
        }
        catch (error) {
            // Log error to Sentry but continue pausing remaining channels
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.withStreamPause'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'withStreamPause', {
                operation: 'pause',
                channel: String(channel),
                pausedChannels: pausedChannels.join(','),
            }));
        }
    }
    try {
        // Execute operation without stream interference
        return await operation();
    }
    finally {
        // Resume only channels that were successfully paused
        for (const channel of pausedChannels) {
            try {
                streamManager.resumeChannel(channel);
            }
            catch (error) {
                // Log error to Sentry but continue resuming remaining channels
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.withStreamPause'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'withStreamPause', {
                    operation: 'resume',
                    channel: String(channel),
                    pausedChannels: pausedChannels.join(','),
                }));
            }
        }
    }
}, _PerpsController_performInitialization = 
/**
 * Actual initialization implementation with retry logic
 */
async function _PerpsController_performInitialization() {
    const maxAttempts = 3;
    const baseDelay = 1000;
    this.update((state) => {
        state.initializationState = InitializationState.Initializing;
        state.initializationError = null;
        state.initializationAttempts = 0;
    });
    __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Initializing providers', {
        currentNetwork: this.state.isTestnet ? 'testnet' : 'mainnet',
        existingProviders: Array.from(this.providers.keys()),
        timestamp: new Date().toISOString(),
    });
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            this.update((state) => {
                state.initializationAttempts = attempt;
            });
            // Disconnect existing providers to close WebSocket connections
            const existingProviders = Array.from(this.providers.values());
            if (existingProviders.length > 0) {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Disconnecting existing providers', {
                    count: existingProviders.length,
                    timestamp: new Date().toISOString(),
                });
                await Promise.all(existingProviders.map((provider) => provider.disconnect()));
            }
            this.providers.clear();
            await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_cleanupStandaloneProvider).call(this);
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_createProviders).call(this);
            // Await MYX dynamic import (if started) so MYX is in the providers
            // map before we assign the active provider. Runs concurrently with
            // the WebSocket readiness delay for zero additional latency.
            await Promise.all([
                wait(PERPS_CONSTANTS.ReconnectionCleanupDelayMs),
                __classPrivateFieldGet(this, _PerpsController_myxRegistrationPromise, "f"),
                __classPrivateFieldGet(this, _PerpsController_lighterRegistrationPromise, "f"),
            ]);
            __classPrivateFieldSet(this, _PerpsController_myxRegistrationPromise, null, "f");
            __classPrivateFieldSet(this, _PerpsController_lighterRegistrationPromise, null, "f");
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_assignActiveProvider).call(this);
            this.isInitialized = true;
            this.update((state) => {
                state.initializationState = InitializationState.Initialized;
                state.initializationError = null;
            });
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Providers initialized successfully', {
                providerCount: this.providers.size,
                activeProvider: this.state.activeProvider,
                timestamp: new Date().toISOString(),
                attempts: attempt,
            });
            // Hydrate watchlist from AUS (non-blocking — transient failures are
            // caught inside and must not prevent init from completing).
            // Assigning to #ausQueue ensures subsequent toggleWatchlistMarket
            // calls wait for hydration before running their own GET-merge-PUT.
            __classPrivateFieldSet(this, _PerpsController_ausQueue, __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_syncWatchlistFromRemote).call(this).catch(() => {
                // Errors are already logged inside #syncWatchlistFromRemote.
            }), "f");
            return; // Exit retry loop on success
        }
        catch (error) {
            lastError = ensureError(error, 'PerpsController.performInitialization');
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, lastError, __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'performInitialization', {
                attempt,
                maxAttempts,
            }));
            // If not the last attempt, wait before retrying (exponential backoff)
            if (attempt < maxAttempts) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, `PerpsController: Retrying initialization in ${delay}ms`, {
                    attempt,
                    maxAttempts,
                    error: lastError.message,
                });
                await wait(delay);
            }
        }
    }
    this.isInitialized = false;
    this.update((state) => {
        state.initializationState = InitializationState.Failed;
        state.initializationError = lastError?.message ?? 'Unknown error';
    });
    __classPrivateFieldSet(this, _PerpsController_initializationPromise, null, "f"); // Clear promise to allow retry
    __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Initialization failed', {
        error: lastError?.message,
        attempts: maxAttempts,
        timestamp: new Date().toISOString(),
    });
}, _PerpsController_createProviders = function _PerpsController_createProviders() {
    const { activeProvider } = this.state;
    __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Creating provider with HIP-3 configuration', {
        hip3Enabled: __classPrivateFieldGet(this, _PerpsController_hip3Enabled, "f"),
        hip3AllowlistMarkets: __classPrivateFieldGet(this, _PerpsController_hip3AllowlistMarkets, "f"),
        hip3BlocklistMarkets: __classPrivateFieldGet(this, _PerpsController_hip3BlocklistMarkets, "f"),
        hip3ConfigSource: __classPrivateFieldGet(this, _PerpsController_hip3ConfigSource, "f"),
        isTestnet: this.state.isTestnet,
        activeProvider,
    });
    // Always create HyperLiquid provider as the base provider
    const hyperLiquidProvider = new HyperLiquidProvider({
        isTestnet: this.state.isTestnet,
        hip3Enabled: __classPrivateFieldGet(this, _PerpsController_hip3Enabled, "f"),
        allowlistMarkets: __classPrivateFieldGet(this, _PerpsController_hip3AllowlistMarkets, "f"),
        blocklistMarkets: __classPrivateFieldGet(this, _PerpsController_hip3BlocklistMarkets, "f"),
        priceDeviationLimit: __classPrivateFieldGet(this, _PerpsController_priceDeviationLimit, "f"),
        platformDependencies: __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure,
        messenger: this.messenger,
        builderAddressTestnet: __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.hyperliquid
            ?.builderAddressTestnet,
        builderAddressMainnet: __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.hyperliquid
            ?.builderAddressMainnet,
        subscriptionBuilderAddressTestnet: __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.hyperliquid
            ?.subscriptionBuilderAddressTestnet,
        subscriptionBuilderAddressMainnet: __classPrivateFieldGet(this, _PerpsController_options, "f").clientConfig?.providerCredentials?.hyperliquid
            ?.subscriptionBuilderAddressMainnet,
    });
    this.providers.set('hyperliquid', hyperLiquidProvider);
    // Register MYX provider if enabled via feature flag.
    // Dynamic import because the MYX package pulls in heavy dependencies we
    // don't want bundled in extension. Until MYX fixes their package, extension
    // doesn't ship it — the catch branch silently skips registration.
    // Uses .then()/.catch() instead of await because #createProviders is not async;
    // MYX registration completing asynchronously is fine since it's only used when
    // explicitly enabled and selected.
    const isMYXEnabled = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isMYXProviderEnabled).call(this);
    if (isMYXEnabled) {
        // IMPORTANT: Must use import() — NOT require() — for core/extension tree-shaking.
        // require() is synchronous and bundlers include it in the main bundle.
        // import() enables true code splitting so MYX is excluded when not enabled.
        // NOTE: Keep the path in a variable so ts-bridge does not rewrite the
        // import argument and strip the webpackIgnore magic comment in core dist.
        const myxModulePath = './providers/MYXProvider';
        __classPrivateFieldSet(this, _PerpsController_myxRegistrationPromise, import(
        /* webpackIgnore: true */ myxModulePath)
            .then(({ MYXProvider }) => {
            this.registerMYXProvider(MYXProvider);
            return undefined;
        })
            .catch((error) => this.handleMYXImportError(error)), "f");
    }
    // Register Lighter provider if enabled (POC). Same dynamic-import pattern
    // as MYX so clients that do not ship the Lighter files skip registration
    // silently.
    const isLighterEnabled = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isLighterProviderEnabled).call(this);
    if (isLighterEnabled) {
        // NOTE: Keep the path in a variable so ts-bridge does not rewrite the
        // import argument and strip the webpackIgnore magic comment in core dist.
        const lighterModulePath = './providers/LighterProvider';
        __classPrivateFieldSet(this, _PerpsController_lighterRegistrationPromise, import(
        /* webpackIgnore: true */ lighterModulePath)
            .then(({ LighterProvider }) => {
            this.registerLighterProvider(LighterProvider);
            return undefined;
        })
            .catch((error) => this.handleLighterImportError(error)), "f");
    }
}, _PerpsController_assignActiveProvider = function _PerpsController_assignActiveProvider() {
    const { activeProvider } = this.state;
    const hyperLiquidProvider = this.providers.get('hyperliquid');
    if (!hyperLiquidProvider) {
        throw new Error('HyperLiquid provider not registered — cannot assign active provider');
    }
    if (activeProvider === 'aggregated') {
        this.activeProviderInstance = new AggregatedPerpsProvider({
            providers: this.providers,
            defaultProvider: 'hyperliquid',
            infrastructure: __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure,
        });
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Using aggregated provider (multi-provider)', { registeredProviders: Array.from(this.providers.keys()) });
    }
    else if (activeProvider === 'hyperliquid') {
        this.activeProviderInstance = hyperLiquidProvider;
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, `PerpsController: Using direct provider (${activeProvider})`);
    }
    else if (activeProvider === 'myx' || activeProvider === 'lighter') {
        const directProvider = this.providers.get(activeProvider);
        if (directProvider) {
            this.activeProviderInstance = directProvider;
        }
        else {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, `PerpsController: ${activeProvider} provider not available, falling back to hyperliquid`);
            this.activeProviderInstance = hyperLiquidProvider;
            this.update((state) => {
                state.activeProvider = 'hyperliquid';
            });
        }
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, `PerpsController: Using direct provider (${this.activeProviderInstance === hyperLiquidProvider ? 'hyperliquid' : activeProvider})`);
    }
    else {
        throw new Error(`Unsupported provider: ${String(activeProvider)}. Currently only 'hyperliquid', 'myx', 'lighter', and 'aggregated' are supported.`);
    }
}, _PerpsController_getErrorContext = function _PerpsController_getErrorContext(method, extra) {
    return {
        tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            provider: this.state.activeProvider,
            network: this.state.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
            name: 'PerpsController',
            data: {
                method,
                ...extra,
            },
        },
    };
}, _PerpsController_getControllerState = function _PerpsController_getControllerState() {
    return this.state;
}, _PerpsController_buildMarketAllowedFilter = function _PerpsController_buildMarketAllowedFilter() {
    const hip3Enabled = __classPrivateFieldGet(this, _PerpsController_hip3Enabled, "f");
    const compiledAllowlist = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_compilePatternsSafely).call(this, __classPrivateFieldGet(this, _PerpsController_hip3AllowlistMarkets, "f"));
    const compiledBlocklist = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_compilePatternsSafely).call(this, __classPrivateFieldGet(this, _PerpsController_hip3BlocklistMarkets, "f"));
    return (symbol) => {
        const { dex } = parseAssetName(symbol);
        return shouldIncludeMarket(symbol, dex, hip3Enabled, compiledAllowlist, compiledBlocklist);
    };
}, _PerpsController_compilePatternsSafely = function _PerpsController_compilePatternsSafely(patterns) {
    const compiled = [];
    for (const pattern of patterns) {
        try {
            compiled.push({ pattern, matcher: compileMarketPattern(pattern) });
        }
        catch {
            // Invalid patterns silently skipped — logged at provider level.
        }
    }
    return compiled;
}, _PerpsController_createServiceContext = function _PerpsController_createServiceContext(method, additionalContext) {
    return {
        tracingContext: {
            provider: this.state.activeProvider,
            isTestnet: this.state.isTestnet,
        },
        errorContext: {
            controller: 'PerpsController',
            method,
        },
        stateManager: {
            update: (updater) => this.update(updater),
            getState: () => __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getControllerState).call(this),
        },
        ...additionalContext,
    };
}, _PerpsController_ensureTradingServiceDeps = function _PerpsController_ensureTradingServiceDeps() {
    __classPrivateFieldGet(this, _PerpsController_tradingService, "f").setControllerDependencies({
        rewardsIntegrationService: __classPrivateFieldGet(this, _PerpsController_rewardsIntegrationService, "f"),
    });
}, _PerpsController_getActiveProviderWhenReady = 
/**
 * Await in-flight initialization, then return the active provider.
 * Use for async action methods (trading, deposits, withdrawals) that should
 * tolerate an in-progress cold-start or reconnection instead of failing
 * immediately with CLIENT_NOT_INITIALIZED.
 *
 * Synchronous callers that need fail-fast behaviour should keep using
 * getActiveProvider() directly.
 *
 * @returns The active provider once initialization completes.
 */
async function _PerpsController_getActiveProviderWhenReady() {
    await __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_awaitInitializationIfInProgress).call(this);
    return this.getActiveProvider();
}, _PerpsController_buildGlobalSnapshotContext = function _PerpsController_buildGlobalSnapshotContext() {
    const snapshotConfigured = Boolean(__classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.terminalApi?.globalSnapshotUrl) ||
        typeof __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.terminalMarketService
            ?.fetchGlobalSnapshot === 'function';
    if (!snapshotConfigured || this.state.activeProvider !== 'hyperliquid') {
        return undefined;
    }
    const enabledDexes = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getStaticSnapshotDexes).call(this);
    if (!enabledDexes) {
        return undefined;
    }
    const { isTestnet, hip3ConfigVersion } = this.state;
    return {
        request: {
            provider: 'hyperliquid',
            network: isTestnet ? 'testnet' : 'mainnet',
            enabledDexes,
        },
        isCurrent: () => this.state.activeProvider === 'hyperliquid' &&
            this.state.isTestnet === isTestnet &&
            this.state.hip3ConfigVersion === hip3ConfigVersion,
        isMarketAllowed: __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_buildMarketAllowedFilter).call(this),
    };
}, _PerpsController_getStaticSnapshotDexes = function _PerpsController_getStaticSnapshotDexes() {
    if (!__classPrivateFieldGet(this, _PerpsController_hip3Enabled, "f")) {
        return ['main'];
    }
    if (this.state.isTestnet) {
        return TESTNET_HIP3_CONFIG.AutoDiscoverAll
            ? undefined
            : canonicalizeHyperLiquidDexes(TESTNET_HIP3_CONFIG.EnabledDexs);
    }
    if (MAINNET_HIP3_CONFIG.AutoDiscoverAll) {
        return undefined;
    }
    const dexes = new Set();
    for (const pattern of __classPrivateFieldGet(this, _PerpsController_hip3AllowlistMarkets, "f")) {
        const colonIndex = pattern.indexOf(':');
        if (colonIndex <= 0) {
            if (/^[a-z][a-z0-9]*$/iu.test(pattern)) {
                dexes.add(pattern.toLowerCase());
                continue;
            }
            return undefined;
        }
        const dex = pattern.slice(0, colonIndex);
        if (dex && /^[a-z0-9][a-z0-9-]*$/u.test(dex)) {
            dexes.add(dex);
        }
        else {
            return undefined;
        }
    }
    return canonicalizeHyperLiquidDexes(dexes);
}, _PerpsController_hydrateCacheFromDiskSync = function _PerpsController_hydrateCacheFromDiskSync() {
    const { marketUpdates, userUpdates, stats } = hydrateFromDiskSync(__classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.diskCache, this.state.cachedMarketDataByProvider, this.state.cachedUserDataByProvider, __classPrivateFieldGet(_a, _a, "f", _PerpsController_preloadGuardMs));
    const hasMarketUpdates = Object.keys(marketUpdates).length > 0;
    const hasUserUpdates = Object.keys(userUpdates).length > 0;
    if (hasMarketUpdates || hasUserUpdates) {
        this.update((state) => {
            if (hasMarketUpdates) {
                Object.assign(state.cachedMarketDataByProvider, marketUpdates);
            }
            if (hasUserUpdates) {
                Object.assign(state.cachedUserDataByProvider, userUpdates);
            }
        });
    }
    __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Disk cache hydrated (sync)', {
        markets: stats.marketCount,
        positions: stats.userPositions,
        orders: stats.userOrders,
        duration_ms: stats.durationMs,
    });
}, _PerpsController_persistUserCacheToDisk = function _PerpsController_persistUserCacheToDisk() {
    const entries = [];
    for (const [cacheKey, entry] of Object.entries(this.state.cachedUserDataByProvider)) {
        const [providerId, network] = cacheKey.split(':');
        if (!providerId ||
            (network !== 'mainnet' && network !== 'testnet') ||
            providerId === 'aggregated') {
            continue;
        }
        entries.push({
            providerNetworkKey: `${providerId}:${network}`,
            address: entry.address,
            positions: entry.positions,
            orders: entry.orders,
            accountState: entry.accountState,
            timestamp: entry.timestamp,
            ...(entry.hip3ConfigVersion !== undefined && {
                hip3ConfigVersion: entry.hip3ConfigVersion,
            }),
            ...(entry.dexes !== undefined && { dexes: entry.dexes }),
        });
    }
    __classPrivateFieldSet(this, _PerpsController_userDiskWrite, __classPrivateFieldGet(this, _PerpsController_userDiskWrite, "f")
        .then(() => persistUserEntriesToDisk(__classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.diskCache, entries))
        .catch(() => {
        // Disk persistence is best-effort and must not block live data.
    }), "f");
}, _PerpsController_performMarketDataPreload = 
/**
 * Perform a single market data preload (best-effort, no throw).
 */
async function _PerpsController_performMarketDataPreload() {
    if (__classPrivateFieldGet(this, _PerpsController_isPreloading, "f")) {
        __classPrivateFieldSet(this, _PerpsController_marketPreloadQueued, true, "f");
        return;
    }
    // Skip preloading during provider/network reinitialisation.
    // The activeProviderInstance still points to the OLD network's provider
    // until init() completes, so fetching now would store stale data under
    // the NEW network's cache key.
    if (__classPrivateFieldGet(this, _PerpsController_isReinitializing, "f")) {
        return;
    }
    // Determine actual provider and cache key for debounce
    const actualProviderId = this.activeProviderInstance
        ? this.state.activeProvider // includes 'aggregated'
        : 'hyperliquid';
    const cacheKey = buildProviderCacheKey(actualProviderId, this.state.isTestnet);
    const preloadContext = {
        activeProvider: this.state.activeProvider,
        isTestnet: this.state.isTestnet,
        hip3ConfigVersion: this.state.hip3ConfigVersion,
    };
    const staticSnapshotDexes = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getStaticSnapshotDexes).call(this);
    const now = Date.now();
    const existingEntry = this.state.cachedMarketDataByProvider[cacheKey];
    if (existingEntry &&
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isMarketCacheEntryCurrent).call(this, actualProviderId, existingEntry) &&
        now - existingEntry.timestamp < __classPrivateFieldGet(_a, _a, "f", _PerpsController_preloadGuardMs)) {
        return;
    }
    __classPrivateFieldSet(this, _PerpsController_isPreloading, true, "f");
    const traceId = uuidv4();
    const preloadStart = performance.now();
    let traceData;
    try {
        __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.tracer.trace({
            name: PerpsTraceNames.MarketDataPreload,
            id: traceId,
            op: PerpsTraceOperations.Operation,
            tags: {
                provider: this.state.activeProvider,
                isTestnet: this.state.isTestnet,
            },
        });
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Fetching market data in background');
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: rest_preload_start');
        const data = await this.getMarketDataWithPrices({ standalone: true });
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: rest_preload_end', {
            duration_ms: Math.round(performance.now() - preloadStart),
            markets: data.length,
        });
        if (this.state.activeProvider !== preloadContext.activeProvider ||
            this.state.isTestnet !== preloadContext.isTestnet ||
            this.state.hip3ConfigVersion !== preloadContext.hip3ConfigVersion) {
            traceData = {
                success: false,
                error: 'Global snapshot preload context changed',
            };
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Discarding stale global snapshot preload');
            return;
        }
        // Store under per-provider key(s)
        const ts = Date.now();
        const sourceExpiries = data.flatMap((market) => market.dataSource === 'terminal-global-snapshot-mark' &&
            typeof market.sourceExpiresAt === 'number'
            ? [market.sourceExpiresAt]
            : []);
        const sourceExpiresAt = data.length > 0 && sourceExpiries.length === data.length
            ? Math.min(...sourceExpiries)
            : undefined;
        const snapshotCacheIdentity = sourceExpiresAt !== undefined && staticSnapshotDexes
            ? {
                sourceExpiresAt,
                hip3ConfigVersion: preloadContext.hip3ConfigVersion,
                dexes: staticSnapshotDexes,
            }
            : {};
        const marketDiskEntries = [];
        if (this.state.activeProvider === 'aggregated' &&
            this.activeProviderInstance) {
            // Split returned data by providerId and store each slice
            const fallbackProviderId = 'hyperliquid'; // default for items missing providerId
            const byProvider = new Map();
            for (const item of data) {
                const pid = item.providerId ?? fallbackProviderId;
                const existing = byProvider.get(pid);
                if (existing) {
                    existing.push(item);
                }
                else {
                    byProvider.set(pid, [item]);
                }
            }
            this.update((state) => {
                for (const [pid, slice] of byProvider) {
                    const key = buildProviderCacheKey(pid, this.state.isTestnet);
                    marketDiskEntries.push({
                        providerNetworkKey: key,
                        data: slice,
                        timestamp: ts,
                    });
                    state.cachedMarketDataByProvider[key] = {
                        data: slice,
                        timestamp: ts,
                    };
                }
                // Write aggregated sentinel so the staleness guard sees it
                state.cachedMarketDataByProvider[cacheKey] = {
                    data: [], // sentinel — real data is in per-provider keys
                    timestamp: ts,
                };
            });
        }
        else {
            marketDiskEntries.push({
                providerNetworkKey: cacheKey,
                data,
                timestamp: ts,
            });
            this.update((state) => {
                state.cachedMarketDataByProvider[cacheKey] = {
                    data,
                    timestamp: ts,
                    ...snapshotCacheIdentity,
                };
            });
        }
        persistMarketEntriesToDisk(__classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.diskCache, marketDiskEntries);
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Market data preloaded', {
            marketCount: data.length,
        });
        traceData = { success: true, marketCount: data.length };
        __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.tracer.setMeasurement(PerpsMeasurementName.PerpsMarketDataPreload, performance.now() - preloadStart, 'millisecond');
    }
    catch (error) {
        traceData = {
            success: false,
            error: ensureError(error, 'PerpsController.performMarketDataPreload')
                .message,
        };
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.performMarketDataPreload'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'performMarketDataPreload', {
            message: 'Background preload failed',
        }));
    }
    finally {
        __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.tracer.endTrace({
            name: PerpsTraceNames.MarketDataPreload,
            id: traceId,
            data: traceData,
        });
        __classPrivateFieldSet(this, _PerpsController_isPreloading, false, "f");
        if (__classPrivateFieldGet(this, _PerpsController_marketPreloadQueued, "f") && __classPrivateFieldGet(this, _PerpsController_preloadTimer, "f")) {
            __classPrivateFieldSet(this, _PerpsController_marketPreloadQueued, false, "f");
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performMarketDataPreload).call(this).catch(() => {
                // Background preload is best-effort.
            });
        }
    }
}, _PerpsController_performUserDataPreload = 
/**
 * Perform a single user data preload (best-effort, no throw).
 * Fetches positions, open orders, and account state via lightweight REST calls.
 */
async function _PerpsController_performUserDataPreload() {
    if (__classPrivateFieldGet(this, _PerpsController_isPreloadingUserData, "f")) {
        __classPrivateFieldSet(this, _PerpsController_userPreloadQueued, true, "f");
        return;
    }
    if (__classPrivateFieldGet(this, _PerpsController_isReinitializing, "f")) {
        return;
    }
    // Get current user address
    const evmAccount = getSelectedEvmAccountFromMessenger(this.messenger);
    if (!evmAccount?.address) {
        return;
    }
    const userAddress = evmAccount.address;
    const { activeProvider, isTestnet, hip3ConfigVersion } = this.state;
    const { activeProviderInstance } = this;
    const hyperliquidDexes = __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getStaticSnapshotDexes).call(this);
    const isCurrent = () => {
        let currentAddress;
        try {
            currentAddress = getSelectedEvmAccountFromMessenger(this.messenger)?.address;
        }
        catch {
            return false;
        }
        return (this.state.activeProvider === activeProvider &&
            this.activeProviderInstance === activeProviderInstance &&
            this.state.isTestnet === isTestnet &&
            this.state.hip3ConfigVersion === hip3ConfigVersion &&
            currentAddress?.toLowerCase() === userAddress.toLowerCase());
    };
    // Determine actual provider (same logic as market preload)
    const actualProviderId = activeProviderInstance
        ? activeProvider // includes 'aggregated'
        : 'hyperliquid';
    const providerNetworkKey = buildProviderCacheKey(actualProviderId, isTestnet);
    // Skip if cache is fresh and for same account
    const now = Date.now();
    const existingEntry = this.state.cachedUserDataByProvider[providerNetworkKey];
    const hasMatchingCache = existingEntry !== undefined &&
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_isUserCacheIdentityCurrent).call(this, actualProviderId, existingEntry, userAddress);
    const cacheAgeMs = existingEntry ? now - existingEntry.timestamp : null;
    const websocketState = this.getWebSocketConnectionState();
    let selectedEntryKey = null;
    if (this.state.cachedUserDataByProvider[providerNetworkKey]) {
        selectedEntryKey = providerNetworkKey;
    }
    __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: user cache preload decision', {
        requestedKey: providerNetworkKey,
        selectedEntryKey,
        availableKeys: Object.keys(this.state.cachedUserDataByProvider).sort(),
        hasMatchingCache,
        cacheAgeMs,
        websocketState,
    });
    if (existingEntry &&
        hasMatchingCache &&
        now - existingEntry.timestamp < __classPrivateFieldGet(_a, _a, "f", _PerpsController_preloadGuardMs)) {
        return;
    }
    if (hasMatchingCache &&
        this.getWebSocketConnectionState() === WebSocketConnectionState.Connected) {
        return;
    }
    __classPrivateFieldSet(this, _PerpsController_isPreloadingUserData, true, "f");
    const traceId = uuidv4();
    const preloadStart = performance.now();
    let traceData;
    try {
        __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.tracer.trace({
            name: PerpsTraceNames.UserDataPreload,
            id: traceId,
            op: PerpsTraceOperations.Operation,
            tags: {
                provider: activeProvider,
                isTestnet,
            },
            data: { userAddress },
        });
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Fetching user data in background', {
            userAddress,
        });
        if (activeProvider === 'hyperliquid') {
            const snapshot = await this.getUserDataSnapshot();
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: User data preloaded', {
                positionCount: snapshot.positions.length,
                orderCount: snapshot.orders.length,
                totalBalance: snapshot.accountState.totalBalance,
            });
            traceData = {
                success: true,
                positionCount: snapshot.positions.length,
                orderCount: snapshot.orders.length,
            };
            __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.tracer.setMeasurement(PerpsMeasurementName.PerpsUserDataPreload, performance.now() - preloadStart, 'millisecond');
            return;
        }
        const [positions, orders, accountState] = await Promise.all([
            this.getPositions({ standalone: true, userAddress }),
            this.getOpenOrders({ standalone: true, userAddress }),
            this.getAccountState({ standalone: true, userAddress }),
        ]);
        if (!isCurrent()) {
            throw new Error('User data preload context changed');
        }
        if (activeProvider === 'aggregated' && activeProviderInstance) {
            // Split by providerId and write one cache entry per provider key
            // (mirrors the market-data preload pattern at ~line 2976)
            const ts = Date.now();
            const fallbackProviderId = 'hyperliquid'; // default for items missing providerId
            const byProvider = new Map();
            const ensureBucket = (pid) => {
                let bucket = byProvider.get(pid);
                if (!bucket) {
                    bucket = { positions: [], orders: [], accountState: null };
                    byProvider.set(pid, bucket);
                }
                return bucket;
            };
            for (const pos of positions) {
                ensureBucket(pos.providerId ?? fallbackProviderId).positions.push(pos);
            }
            for (const order of orders) {
                ensureBucket(order.providerId ?? fallbackProviderId).orders.push(order);
            }
            // AccountState — assign to its provider bucket
            ensureBucket(accountState.providerId ?? fallbackProviderId).accountState = accountState;
            this.update((state) => {
                for (const [pid, data] of byProvider) {
                    const key = buildProviderCacheKey(pid, isTestnet);
                    state.cachedUserDataByProvider[key] = {
                        ...data,
                        timestamp: ts,
                        address: userAddress,
                        ...(pid === 'hyperliquid' &&
                            hyperliquidDexes && {
                            hip3ConfigVersion,
                            dexes: hyperliquidDexes,
                        }),
                    };
                }
                // Write aggregated sentinel so the staleness guard sees it
                state.cachedUserDataByProvider[providerNetworkKey] = {
                    positions: [],
                    orders: [],
                    accountState: null,
                    timestamp: ts,
                    address: userAddress,
                };
            });
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_persistUserCacheToDisk).call(this);
        }
        else {
            // Single provider — store directly under its key
            const ts = Date.now();
            this.update((state) => {
                state.cachedUserDataByProvider[providerNetworkKey] = {
                    positions,
                    orders,
                    accountState,
                    timestamp: ts,
                    address: userAddress,
                    ...(actualProviderId === 'hyperliquid' &&
                        hyperliquidDexes && {
                        hip3ConfigVersion,
                        dexes: hyperliquidDexes,
                    }),
                };
            });
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_persistUserCacheToDisk).call(this);
        }
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: User data preloaded', {
            positionCount: positions.length,
            orderCount: orders.length,
            totalBalance: accountState.totalBalance,
        });
        traceData = {
            success: true,
            positionCount: positions.length,
            orderCount: orders.length,
        };
        __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.tracer.setMeasurement(PerpsMeasurementName.PerpsUserDataPreload, performance.now() - preloadStart, 'millisecond');
    }
    catch (error) {
        traceData = {
            success: false,
            error: ensureError(error, 'PerpsController.performUserDataPreload')
                .message,
        };
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.performUserDataPreload'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'performUserDataPreload', {
            message: 'Background user data preload failed',
        }));
    }
    finally {
        __classPrivateFieldGet(this, _PerpsController_options, "f").infrastructure.tracer.endTrace({
            name: PerpsTraceNames.UserDataPreload,
            id: traceId,
            data: traceData,
        });
        __classPrivateFieldSet(this, _PerpsController_isPreloadingUserData, false, "f");
        if (__classPrivateFieldGet(this, _PerpsController_userPreloadQueued, "f") && __classPrivateFieldGet(this, _PerpsController_preloadTimer, "f")) {
            __classPrivateFieldSet(this, _PerpsController_userPreloadQueued, false, "f");
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_performUserDataPreload).call(this).catch(() => {
                // Background preload is best-effort.
            });
        }
    }
}, _PerpsController_persistWatchlistToRemote = 
/**
 * Writes the current local watchlist to AuthenticatedUserStorageService
 * using a read-merge-write strategy to avoid overwriting other preferences.
 *
 * Skips silently when:
 * - The active provider has no AUS exchange key (e.g. `'aggregated'`).
 * - The remote preferences blob does not yet exist (returns `null` / 404).
 *   In that case, `NotificationServicesController.createOnChainTriggers` is
 *   the canonical owner that creates the initial blob.
 *
 * Throws on remote write failure so the caller can decide whether to revert.
 *
 * @param network - Which network's list to sync ('testnet' | 'mainnet').
 */
async function _PerpsController_persistWatchlistToRemote(network) {
    const exchangeKey = resolveWatchlistExchangeKey(this.state.activeProvider);
    if (!exchangeKey) {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Skipping AUS watchlist sync — provider not mapped', { activeProvider: this.state.activeProvider });
        return;
    }
    const prefs = await this.messenger.call('AuthenticatedUserStorageService:getNotificationPreferences');
    if (!prefs) {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Skipping AUS watchlist write — preferences blob not yet initialised', { exchangeKey, network });
        return;
    }
    const existingWatchlist = prefs.perps
        .watchlistMarkets ?? {
        hyperliquid: { testnet: [], mainnet: [] },
        myx: { testnet: [], mainnet: [] },
    };
    const nextWatchlistMarkets = {
        ...existingWatchlist,
        [exchangeKey]: {
            ...existingWatchlist[exchangeKey],
            [network]: this.state.watchlistMarkets[network],
        },
    };
    const nextPrefs = {
        ...prefs,
        perps: {
            ...prefs.perps,
            watchlistMarkets: nextWatchlistMarkets,
        },
    };
    await this.messenger.call('AuthenticatedUserStorageService:putNotificationPreferences', nextPrefs);
    __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Watchlist synced to AUS', {
        exchangeKey,
        network,
        count: this.state.watchlistMarkets[network].length,
    });
}, _PerpsController_syncWatchlistFromRemote = 
/**
 * Hydrates `state.watchlistMarkets` from AuthenticatedUserStorageService on
 * controller initialisation.
 *
 * AUS is the source of truth; local state is used as an offline cache.
 * This method also handles the one-time migration from local-only state to
 * AUS for users who had a watchlist before AUS sync was introduced.
 *
 * All remote errors are swallowed so a transient network failure does not
 * block the rest of `init()`.
 */
async function _PerpsController_syncWatchlistFromRemote() {
    const exchangeKey = resolveWatchlistExchangeKey(this.state.activeProvider);
    if (!exchangeKey) {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Skipping AUS watchlist hydration — provider not mapped', { activeProvider: this.state.activeProvider });
        return;
    }
    try {
        const prefs = await this.messenger.call('AuthenticatedUserStorageService:getNotificationPreferences');
        if (!prefs) {
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: No AUS preferences blob — using local watchlist');
            return;
        }
        const remoteExchangeWatchlist = prefs.perps.watchlistMarkets?.[exchangeKey];
        // AUS is the source of truth: an absent exchange key means this device
        // has not been migrated yet — push any local favorites up once.
        // A present key (even with empty arrays) must be honored as-is,
        // including an intentional remote clear.
        if (remoteExchangeWatchlist === undefined) {
            // Blob exists but has no watchlist for this exchange yet.
            // If local state has any markets, push them up as a one-time migration.
            const { testnet, mainnet } = this.state.watchlistMarkets;
            const hasLocalMarkets = testnet.length > 0 || mainnet.length > 0;
            if (hasLocalMarkets) {
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Migrating local watchlist to AUS', {
                    exchangeKey,
                    testnetCount: testnet.length,
                    mainnetCount: mainnet.length,
                });
                // Push testnet and mainnet together via a single read-merge-write.
                // Start from existing remote watchlistMarkets (or empty fallback) so
                // that other exchanges already stored in AUS are not overwritten.
                const existingWatchlist = prefs.perps
                    .watchlistMarkets ?? {
                    hyperliquid: { testnet: [], mainnet: [] },
                    myx: { testnet: [], mainnet: [] },
                };
                const nextWatchlistMarkets = {
                    ...existingWatchlist,
                    [exchangeKey]: { testnet, mainnet },
                };
                const nextPrefs = {
                    ...prefs,
                    perps: {
                        ...prefs.perps,
                        watchlistMarkets: nextWatchlistMarkets,
                    },
                };
                await this.messenger.call('AuthenticatedUserStorageService:putNotificationPreferences', nextPrefs);
                __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Local watchlist migrated to AUS', {
                    exchangeKey,
                });
            }
        }
        else {
            // AUS has an entry for this exchange — hydrate local state from it.
            this.update((state) => {
                state.watchlistMarkets.testnet = remoteExchangeWatchlist.testnet;
                state.watchlistMarkets.mainnet = remoteExchangeWatchlist.mainnet;
            });
            __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_debugLog).call(this, 'PerpsController: Watchlist hydrated from AUS', {
                exchangeKey,
                testnetCount: remoteExchangeWatchlist.testnet.length,
                mainnetCount: remoteExchangeWatchlist.mainnet.length,
            });
        }
    }
    catch (error) {
        __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_logError).call(this, ensureError(error, 'PerpsController.syncWatchlistFromRemote'), __classPrivateFieldGet(this, _PerpsController_instances, "m", _PerpsController_getErrorContext).call(this, 'syncWatchlistFromRemote'));
    }
};
// ============================================================================
// Market Data Preload (client-agnostic background caching)
// ============================================================================
/** State paths that the preload stateChange handler reads. */
_PerpsController_preloadWatchedPaths = { value: new Set([
        'isTestnet',
        'hip3ConfigVersion',
    ]) };
_PerpsController_preloadRefreshMs = { value: 5 * 60 * 1000 }; // 5 min
_PerpsController_preloadGuardMs = { value: 30000 }; // 30s debounce
//# sourceMappingURL=PerpsController.mjs.map