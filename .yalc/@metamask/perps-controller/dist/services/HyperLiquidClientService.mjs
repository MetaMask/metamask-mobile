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
var _HyperLiquidClientService_instances, _HyperLiquidClientService_exchangeClient, _HyperLiquidClientService_infoClient, _HyperLiquidClientService_infoClientHttp, _HyperLiquidClientService_subscriptionClient, _HyperLiquidClientService_wsTransport, _HyperLiquidClientService_httpTransport, _HyperLiquidClientService_walletParams, _HyperLiquidClientService_isTestnet, _HyperLiquidClientService_connectionState, _HyperLiquidClientService_disconnectionPromise, _HyperLiquidClientService_onTerminateCallback, _HyperLiquidClientService_onReconnectCallback, _HyperLiquidClientService_reconnectionAttempt, _HyperLiquidClientService_connectionStateListeners, _HyperLiquidClientService_reconnectionRetryTimeout, _HyperLiquidClientService_deps, _HyperLiquidClientService_createTransports, _HyperLiquidClientService_createAllClients, _HyperLiquidClientService_createHttpClients, _HyperLiquidClientService_runCandleSnapshotFetch, _HyperLiquidClientService_runHistoricalOrdersFetch, _HyperLiquidClientService_getIntervalMilliseconds, _HyperLiquidClientService_performDisconnection, _HyperLiquidClientService_updateConnectionState, _HyperLiquidClientService_notifyConnectionStateListeners, _HyperLiquidClientService_isReconnecting, _HyperLiquidClientService_handleConnectionDrop;
import { ExchangeClient, HttpTransport, InfoClient, SubscriptionClient, WebSocketTransport } from "@nktkas/hyperliquid";
import { CandlePeriod, calculateCandleCount } from "../constants/chartConfig.mjs";
import { HYPERLIQUID_TRANSPORT_CONFIG } from "../constants/hyperLiquidConfig.mjs";
import { PERFORMANCE_CONFIG, PERPS_CONSTANTS } from "../constants/perpsConfig.mjs";
import { PERPS_ERROR_CODES } from "../perpsErrorCodes.mjs";
import { WebSocketConnectionState } from "../types/index.mjs";
import { coalescePerpsRestRequest } from "../utils/coalescePerpsRestRequest.mjs";
import { ensureError, isAbortError } from "../utils/errorUtils.mjs";
import { getPerpsConnectionAttemptContext } from "../utils/perpsConnectionAttemptContext.mjs";
/**
 * Maximum number of reconnection attempts before giving up.
 */
const maxReconnectionAttempts = 10;
// WebSocketConnectionState is now imported from controllers/types
// Re-export for backward compatibility with existing consumers
export { WebSocketConnectionState } from "../types/index.mjs";
/**
 * Service for managing HyperLiquid SDK clients
 * Handles initialization, transport creation, and client lifecycle
 */
export class HyperLiquidClientService {
    constructor(deps, options = {}) {
        _HyperLiquidClientService_instances.add(this);
        _HyperLiquidClientService_exchangeClient.set(this, void 0);
        _HyperLiquidClientService_infoClient.set(this, void 0); // WebSocket transport (default)
        _HyperLiquidClientService_infoClientHttp.set(this, void 0); // HTTP transport (fallback)
        _HyperLiquidClientService_subscriptionClient.set(this, void 0);
        _HyperLiquidClientService_wsTransport.set(this, void 0);
        _HyperLiquidClientService_httpTransport.set(this, void 0);
        _HyperLiquidClientService_walletParams.set(this, void 0);
        _HyperLiquidClientService_isTestnet.set(this, void 0);
        _HyperLiquidClientService_connectionState.set(this, WebSocketConnectionState.Disconnected);
        _HyperLiquidClientService_disconnectionPromise.set(this, null);
        // Callback for SDK terminate event (fired when all reconnection attempts exhausted)
        _HyperLiquidClientService_onTerminateCallback.set(this, null);
        _HyperLiquidClientService_onReconnectCallback.set(this, void 0);
        // Reconnection attempt counter
        _HyperLiquidClientService_reconnectionAttempt.set(this, 0);
        // Connection state change listeners for event-based notifications
        _HyperLiquidClientService_connectionStateListeners.set(this, new Set());
        // Timeout reference for reconnection retry, tracked to enable cancellation on disconnect
        _HyperLiquidClientService_reconnectionRetryTimeout.set(this, null);
        // Platform dependencies for logging
        _HyperLiquidClientService_deps.set(this, void 0);
        // Flag to prevent concurrent reconnection attempts
        _HyperLiquidClientService_isReconnecting.set(this, false);
        __classPrivateFieldSet(this, _HyperLiquidClientService_deps, deps, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_isTestnet, options.isTestnet ?? false, "f");
    }
    /**
     * Initialize all HyperLiquid SDK clients
     *
     * IMPORTANT: This method awaits transport.ready() to ensure the WebSocket is
     * in OPEN state before marking initialization complete. This prevents race
     * conditions where subscriptions are attempted before the WebSocket handshake
     * completes (which would cause "subscribe error: undefined" errors).
     *
     * @param wallet - The wallet parameters for signing typed data.
     */
    async initialize(wallet) {
        const network = __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f") ? 'testnet' : 'mainnet';
        const attemptContext = getPerpsConnectionAttemptContext();
        try {
            __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Connecting);
            __classPrivateFieldSet(this, _HyperLiquidClientService_walletParams, wallet, "f");
            __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_createTransports).call(this);
            // Ensure transports are created
            if (!__classPrivateFieldGet(this, _HyperLiquidClientService_httpTransport, "f") || !__classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f")) {
                throw new Error('Failed to create transports');
            }
            __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_createAllClients).call(this, wallet);
            // Wait for WebSocket to actually be ready before setting CONNECTED
            // This ensures we have a real connection, not just client objects
            await __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f").ready();
            __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Connected);
            __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid SDK clients initialized', {
                testnet: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f"),
                timestamp: new Date().toISOString(),
                connectionState: __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f"),
                note: 'Using WebSocket for InfoClient (default), HTTP fallback available',
            });
        }
        catch (error) {
            // Cleanup on failure to prevent leaks and ensure isInitialized() returns false
            // Clear clients first, then transports
            __classPrivateFieldSet(this, _HyperLiquidClientService_subscriptionClient, undefined, "f");
            __classPrivateFieldSet(this, _HyperLiquidClientService_infoClient, undefined, "f");
            __classPrivateFieldSet(this, _HyperLiquidClientService_infoClientHttp, undefined, "f");
            __classPrivateFieldSet(this, _HyperLiquidClientService_exchangeClient, undefined, "f");
            // Close WebSocket transport to release resources and event listeners
            if (__classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f")) {
                try {
                    __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f").close();
                }
                catch {
                    // Ignore cleanup errors
                }
                __classPrivateFieldSet(this, _HyperLiquidClientService_wsTransport, undefined, "f");
            }
            __classPrivateFieldSet(this, _HyperLiquidClientService_httpTransport, undefined, "f");
            const errorInstance = ensureError(error, 'HyperLiquidClientService.initialize');
            __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Disconnected);
            if (attemptContext?.suppressError) {
                __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid initialize failed during suppressed startup attempt', {
                    error: errorInstance.message,
                    network,
                    source: attemptContext.source,
                });
            }
            else {
                __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").logger.error(errorInstance, {
                    tags: {
                        feature: PERPS_CONSTANTS.FeatureName,
                        service: 'HyperLiquidClientService',
                        network,
                    },
                    context: {
                        name: 'sdk_initialization',
                        data: {
                            operation: 'initialize',
                            isTestnet: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f"),
                            source: attemptContext?.source ?? 'unspecified',
                        },
                    },
                });
            }
            throw error;
        }
    }
    /**
     * Toggle testnet mode and reinitialize clients
     *
     * @param wallet - The wallet parameters for signing typed data.
     * @returns The new network name after toggling.
     */
    async toggleTestnet(wallet) {
        __classPrivateFieldSet(this, _HyperLiquidClientService_isTestnet, !__classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f"), "f");
        await this.initialize(wallet);
        return __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f") ? 'testnet' : 'mainnet';
    }
    /**
     * Check if clients are properly initialized
     *
     * @returns True if all SDK clients are initialized.
     */
    isInitialized() {
        return Boolean(__classPrivateFieldGet(this, _HyperLiquidClientService_exchangeClient, "f") &&
            __classPrivateFieldGet(this, _HyperLiquidClientService_infoClient, "f") &&
            __classPrivateFieldGet(this, _HyperLiquidClientService_infoClientHttp, "f") &&
            __classPrivateFieldGet(this, _HyperLiquidClientService_subscriptionClient, "f"));
    }
    /**
     * Ensure clients are initialized, throw if not
     */
    ensureInitialized() {
        if (!this.isInitialized()) {
            throw new Error(PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED);
        }
    }
    /**
     * Recreate subscription client if needed (for reconnection scenarios)
     *
     * @param wallet - The wallet parameters for signing typed data.
     */
    async ensureSubscriptionClient(wallet) {
        if (!__classPrivateFieldGet(this, _HyperLiquidClientService_subscriptionClient, "f")) {
            // A reconnect publishes its WebSocket clients only after transport.ready().
            // Do not start a competing initialize() while that attempt or its retry
            // backoff is active; callers will observe an unavailable subscription
            // client until the reconnect completes and restores tracked subscriptions.
            if (__classPrivateFieldGet(this, _HyperLiquidClientService_isReconnecting, "f") || __classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionRetryTimeout, "f")) {
                return;
            }
            __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid: Recreating subscription client after disconnect');
            if (__classPrivateFieldGet(this, _HyperLiquidClientService_walletParams, "f") &&
                __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f") === WebSocketConnectionState.Disconnected) {
                await this.reconnect();
            }
            else {
                await this.initialize(wallet);
            }
        }
    }
    /**
     * Get the exchange client
     *
     * @returns The initialized ExchangeClient instance.
     */
    getExchangeClient() {
        if (!__classPrivateFieldGet(this, _HyperLiquidClientService_exchangeClient, "f")) {
            this.ensureInitialized();
            throw new Error(PERPS_ERROR_CODES.EXCHANGE_CLIENT_NOT_AVAILABLE);
        }
        return __classPrivateFieldGet(this, _HyperLiquidClientService_exchangeClient, "f");
    }
    /**
     * Get the info client
     *
     * @param options - The options for selecting the transport.
     * @param options.useHttp - Force HTTP transport instead of WebSocket (default: false).
     * @returns InfoClient instance with the selected transport.
     */
    getInfoClient(options) {
        if (options?.useHttp) {
            if (!__classPrivateFieldGet(this, _HyperLiquidClientService_infoClientHttp, "f")) {
                this.ensureInitialized();
                throw new Error(PERPS_ERROR_CODES.INFO_CLIENT_NOT_AVAILABLE);
            }
            return __classPrivateFieldGet(this, _HyperLiquidClientService_infoClientHttp, "f");
        }
        this.ensureInitialized();
        if (!__classPrivateFieldGet(this, _HyperLiquidClientService_infoClient, "f")) {
            throw new Error(PERPS_ERROR_CODES.INFO_CLIENT_NOT_AVAILABLE);
        }
        return __classPrivateFieldGet(this, _HyperLiquidClientService_infoClient, "f");
    }
    /**
     * Get the subscription client
     *
     * @returns The SubscriptionClient instance, or undefined if not initialized.
     */
    getSubscriptionClient() {
        if (!__classPrivateFieldGet(this, _HyperLiquidClientService_subscriptionClient, "f")) {
            __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('SubscriptionClient not initialized');
            return undefined;
        }
        return __classPrivateFieldGet(this, _HyperLiquidClientService_subscriptionClient, "f");
    }
    /**
     * Ensures the WebSocket transport is in OPEN state and ready for subscriptions.
     * This MUST be called before any subscription operations to prevent race conditions.
     *
     * The SDK's `transport.ready()` method:
     * - Returns immediately if WebSocket is already in OPEN state
     * - Waits for the "open" event if WebSocket is in CONNECTING state
     * - Supports AbortSignal for timeout/cancellation
     *
     * @param options - The options for transport readiness check.
     * @param options.timeoutMs - Maximum time to wait for transport ready (default 5000ms).
     * @throws Error if transport not ready within timeout or subscription client unavailable.
     */
    async ensureTransportReady(options = {}) {
        const { timeoutMs = 5000 } = options;
        const subscriptionClient = this.getSubscriptionClient();
        if (!subscriptionClient) {
            throw new Error('Subscription client not initialized');
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error(`WebSocket transport ready timeout after ${timeoutMs}ms`)), timeoutMs);
        try {
            await subscriptionClient.config_.transport.ready(controller.signal);
        }
        catch (error) {
            if (controller.signal.aborted) {
                throw new Error(`WebSocket transport ready timeout after ${timeoutMs}ms`);
            }
            throw ensureError(error, 'HyperLiquidClientService.ensureTransportReady');
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Get current network state
     *
     * @returns The current HyperLiquid network (mainnet or testnet).
     */
    getNetwork() {
        return __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f") ? 'testnet' : 'mainnet';
    }
    /**
     * Check if running on testnet
     *
     * @returns True if the service is in testnet mode.
     */
    isTestnetMode() {
        return __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f");
    }
    /**
     * Update testnet mode
     *
     * @param isTestnet - Whether to enable testnet mode.
     */
    setTestnetMode(isTestnet) {
        __classPrivateFieldSet(this, _HyperLiquidClientService_isTestnet, isTestnet, "f");
    }
    /**
     * Fetch historical candle data using the HyperLiquid SDK
     *
     * @param options - The candle fetch configuration.
     * @param options.symbol - The asset symbol (e.g., "BTC", "ETH").
     * @param options.interval - The candle interval (e.g., "1m", "5m", "15m", "1h", "1d").
     * @param options.limit - Number of candles to fetch (default: 100).
     * @param options.endTime - End timestamp in milliseconds (default: now).
     * @param options.signal - Optional AbortSignal to cancel the fetch.
     * @returns The historical candle data, or null if no data is available.
     */
    async fetchHistoricalCandles(options) {
        const { symbol, interval, limit = 100, endTime, signal } = options;
        if (signal?.aborted) {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            throw abortError;
        }
        // Explicit endTime is a paging call — the caller owns that exact window
        // and expects a fresh page. Coalescing per-millisecond endTimes produces
        // keys that never dedupe and never evict (TTL-miss sweep only fires on
        // re-access with the same key), so route paging straight to the SDK and
        // only coalesce the live-snapshot path where all callers share 'now'.
        if (endTime !== undefined) {
            return __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_runCandleSnapshotFetch).call(this, {
                symbol,
                interval,
                limit,
                endTime,
                signal,
            });
        }
        // Live snapshot: coalesce across rapid market switches (pass 1 → pass 2
        // of the 10-market stress loop) so callers share one snapshot per
        // (symbol, interval).
        // Signal is intentionally dropped inside the coalesced fetch — the HL
        // SDK charges weight for any request already sent, and dropping a
        // per-caller abort lets the next caller reuse the in-flight/cached
        // result instead of re-firing the REST. The WS stream keeps live
        // candles fresh, so reusing the first-caller snapshot for up to the
        // TTL is acceptable.
        const cacheKey = [
            'candleSnapshot',
            __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f") ? 'testnet' : 'mainnet',
            symbol,
            interval,
            limit,
        ].join('|');
        return coalescePerpsRestRequest(cacheKey, () => __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_runCandleSnapshotFetch).call(this, { symbol, interval, limit }), { ttlMs: PERFORMANCE_CONFIG.PerpsCandleCoalesceTtlMs });
    }
    /**
     * Fetch the user's historical orders via the HyperLiquid SDK, coalesced
     * across concurrent callers and cached for {@link PERFORMANCE_CONFIG.PerpsRestCoalesceTtlMs}.
     *
     * Both getOrders (service layer) and the getUserFills enrichment sidecar
     * (fills→order-type resolution for TP/SL pills in activity) hit the same
     * `historicalOrders` info-post. Routing both through this wrapper means the
     * enrichment path rides the same cache as an explicit activity-page fetch,
     * so rapid market switching never fires redundant HL traffic.
     *
     * Pass `forceRefresh: true` to bypass the coalesce cache end-to-end
     * (hooks → controller → MarketDataService → provider → this method), which
     * is required for pull-to-refresh to fetch fresh data from the network.
     *
     * @param userAddress - The user's 0x address to query.
     * @param options - Optional cache-control options.
     * @param options.forceRefresh - When true, bypasses the coalesce cache.
     * @returns Array of historical orders, empty array on SDK null.
     */
    async fetchHistoricalOrders(userAddress, options) {
        this.ensureInitialized();
        const cacheKey = [
            'historicalOrders',
            __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f") ? 'testnet' : 'mainnet',
            userAddress.toLowerCase(),
        ].join('|');
        return coalescePerpsRestRequest(cacheKey, () => __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_runHistoricalOrdersFetch).call(this, userAddress), { forceRefresh: options?.forceRefresh });
    }
    /**
     * Subscribe to candle updates via WebSocket
     *
     * @param root0 - The subscription parameters.
     * @param root0.symbol - The asset symbol (e.g., "BTC", "ETH").
     * @param root0.interval - The candle interval (e.g., "1m", "5m", "15m").
     * @param root0.duration - Optional time duration for calculating initial fetch size.
     * @param root0.callback - Function called with updated candle data.
     * @param root0.onError - Optional function called if subscription initialization fails.
     * @returns Cleanup function to unsubscribe.
     */
    subscribeToCandles({ symbol, interval, duration, callback, onError, }) {
        this.ensureInitialized();
        const subscriptionClient = this.getSubscriptionClient();
        if (!subscriptionClient) {
            throw new Error(PERPS_ERROR_CODES.SUBSCRIPTION_CLIENT_NOT_AVAILABLE);
        }
        let currentCandleData = null;
        let wsUnsubscribe = null;
        let isUnsubscribed = false;
        // Store the subscription promise to enable cleanup even when pending
        // This fixes a race condition where component unmounts before subscription resolves
        let subscriptionPromise = null;
        // AbortController to cancel in-flight REST calls (candleSnapshot) on cleanup.
        // Prevents rate limit exhaustion when rapidly switching markets (#28141).
        const abortController = new AbortController();
        // Calculate initial fetch size dynamically based on duration and interval
        // Match main branch behavior: up to 500 candles initially
        const initialLimit = duration
            ? Math.min(calculateCandleCount(duration, interval), 500)
            : 100; // Default to 100 if no duration provided
        // 1. Fetch initial historical data, then subscribe to WebSocket updates
        // Using an async IIFE to avoid nested promises and callback-in-promise issues
        const initAndSubscribe = async () => {
            try {
                const initialData = await this.fetchHistoricalCandles({
                    symbol,
                    interval,
                    limit: initialLimit,
                    signal: abortController.signal,
                });
                // Don't proceed if already unsubscribed
                if (isUnsubscribed) {
                    return;
                }
                currentCandleData = initialData;
                if (currentCandleData) {
                    callback(currentCandleData);
                }
                // 2. Subscribe to WebSocket for new candles
                // HyperLiquid SDK uses 'coin' terminology
                // Store the promise so cleanup can wait for it if needed
                subscriptionPromise = subscriptionClient.candle({ coin: symbol, interval }, // Map to HyperLiquid SDK's 'coin' parameter
                (candleEvent) => {
                    // Don't process events if already unsubscribed
                    if (isUnsubscribed) {
                        return;
                    }
                    // Transform SDK CandleEvent to our Candle format
                    const newCandle = {
                        time: candleEvent.t,
                        open: candleEvent.o.toString(),
                        high: candleEvent.h.toString(),
                        low: candleEvent.l.toString(),
                        close: candleEvent.c.toString(),
                        volume: candleEvent.v.toString(),
                    };
                    if (currentCandleData) {
                        // Check if this is an update to the last candle or a new candle
                        const { candles } = currentCandleData;
                        const lastCandle = candles[candles.length - 1];
                        if (lastCandle?.time === newCandle.time) {
                            // Update existing candle (live candle update)
                            // Create new array with updated last element to trigger React re-render
                            currentCandleData = {
                                ...currentCandleData,
                                candles: [...candles.slice(0, -1), newCandle],
                            };
                        }
                        else {
                            // New candle (completed candle)
                            // Create new array with added element to trigger React re-render
                            currentCandleData = {
                                ...currentCandleData,
                                candles: [...candles, newCandle],
                            };
                        }
                    }
                    else {
                        currentCandleData = {
                            symbol,
                            interval,
                            candles: [newCandle],
                        };
                    }
                    callback(currentCandleData);
                });
                // Store cleanup function when subscription resolves
                try {
                    const sub = await subscriptionPromise;
                    wsUnsubscribe = () => sub.unsubscribe();
                    // If already unsubscribed while waiting, clean up immediately
                    if (isUnsubscribed) {
                        wsUnsubscribe();
                        wsUnsubscribe = null;
                    }
                }
                catch (error) {
                    const errorInstance = ensureError(error, 'HyperLiquidClientService.subscribeToCandles');
                    // Log to Sentry: WebSocket subscription failure prevents live updates
                    __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").logger.error(errorInstance, {
                        tags: {
                            feature: PERPS_CONSTANTS.FeatureName,
                            service: 'HyperLiquidClientService',
                            network: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f") ? 'testnet' : 'mainnet',
                        },
                        context: {
                            name: 'websocket_subscription',
                            data: {
                                operation: 'subscribeToCandles',
                                symbol,
                                interval,
                                phase: 'ws_subscription',
                            },
                        },
                    });
                    // Notify caller of error
                    onError?.(errorInstance);
                }
            }
            catch (error) {
                // Skip logging and notification for intentional abort (user navigated away)
                if (abortController.signal.aborted) {
                    return;
                }
                const errorInstance = ensureError(error, 'HyperLiquidClientService.subscribeToCandles');
                // Log to Sentry: initial fetch failure blocks chart completely
                __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").logger.error(errorInstance, {
                    tags: {
                        feature: PERPS_CONSTANTS.FeatureName,
                        service: 'HyperLiquidClientService',
                        network: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f") ? 'testnet' : 'mainnet',
                    },
                    context: {
                        name: 'initial_candles_fetch',
                        data: {
                            operation: 'subscribeToCandles',
                            symbol,
                            interval,
                            phase: 'initial_fetch',
                            initialLimit,
                        },
                    },
                });
                // Notify caller of error
                onError?.(errorInstance);
            }
        };
        // Fire-and-forget the async initialization
        initAndSubscribe().catch(() => {
            // Error already handled inside initAndSubscribe
        });
        // Return cleanup function
        return () => {
            isUnsubscribed = true;
            // Cancel any in-flight REST calls (candleSnapshot) to conserve rate limit budget (#28141)
            abortController.abort();
            if (wsUnsubscribe) {
                // Subscription already resolved - unsubscribe directly
                wsUnsubscribe();
                wsUnsubscribe = null;
            }
            else if (subscriptionPromise) {
                // Subscription promise still pending - wait for it and clean up
                // This prevents WebSocket subscription leaks when component unmounts
                // before the subscription promise resolves
                subscriptionPromise
                    .then((sub) => sub.unsubscribe())
                    .catch(() => {
                    // Ignore errors during cleanup - subscription may have failed
                });
                subscriptionPromise = null;
            }
        };
    }
    /**
     * Disconnect and cleanup all clients
     *
     * @returns A promise that resolves when disconnection is complete.
     */
    async disconnect() {
        // Await existing promise if already disconnecting
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_disconnectionPromise, "f")) {
            await __classPrivateFieldGet(this, _HyperLiquidClientService_disconnectionPromise, "f");
            return;
        }
        // If already disconnected, return immediately
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f") === WebSocketConnectionState.Disconnected) {
            return;
        }
        // Create and store the disconnection promise
        __classPrivateFieldSet(this, _HyperLiquidClientService_disconnectionPromise, __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_performDisconnection).call(this), "f");
        try {
            await __classPrivateFieldGet(this, _HyperLiquidClientService_disconnectionPromise, "f");
        }
        finally {
            __classPrivateFieldSet(this, _HyperLiquidClientService_disconnectionPromise, null, "f");
        }
    }
    /**
     * Get current WebSocket connection state
     *
     * @returns The current WebSocket connection state.
     */
    getConnectionState() {
        return __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f");
    }
    /**
     * Check if WebSocket is fully disconnected
     *
     * @returns True if the WebSocket is in disconnected state.
     */
    isDisconnected() {
        return __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f") === WebSocketConnectionState.Disconnected;
    }
    /**
     * Set callback to be invoked when reconnection is needed
     * This allows the service to notify external components (like PerpsConnectionManager)
     * when a connection drop is detected
     *
     * @param callback - The async callback to invoke when reconnection is needed.
     */
    setOnReconnectCallback(callback) {
        __classPrivateFieldSet(this, _HyperLiquidClientService_onReconnectCallback, callback, "f");
    }
    /**
     * Set callback for WebSocket termination events
     * Called when the SDK exhausts all reconnection attempts
     *
     * @param callback - The callback to invoke on termination, or null to clear.
     */
    setOnTerminateCallback(callback) {
        __classPrivateFieldSet(this, _HyperLiquidClientService_onTerminateCallback, callback, "f");
    }
    /**
     * Subscribe to connection state changes.
     * The listener will be called immediately with the current state and whenever the state changes.
     *
     * @param listener - Callback function that receives the new connection state and reconnection attempt
     * @returns Unsubscribe function to remove the listener
     */
    subscribeToConnectionState(listener) {
        __classPrivateFieldGet(this, _HyperLiquidClientService_connectionStateListeners, "f").add(listener);
        // Immediately notify with current state
        // Wrap in try-catch to match notifyConnectionStateListeners behavior
        // This ensures the unsubscribe function is always returned even if listener throws
        try {
            listener(__classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f"), __classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionAttempt, "f"));
        }
        catch {
            // Ignore errors in listeners to prevent breaking subscription mechanism
            // If listener throws, it will be removed when unsubscribe is called
        }
        // Return unsubscribe function
        return () => {
            __classPrivateFieldGet(this, _HyperLiquidClientService_connectionStateListeners, "f").delete(listener);
        };
    }
    /**
     * Manually trigger a reconnection attempt.
     * This is exposed for UI retry buttons when user wants to force reconnection.
     * Resets the reconnection attempt counter to allow retrying after max attempts.
     */
    async reconnect() {
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('[HyperLiquidClientService] reconnect() called', {
            previousAttempt: __classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionAttempt, "f"),
            currentState: __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f"),
        });
        // Reset attempt counter when user manually triggers retry
        __classPrivateFieldSet(this, _HyperLiquidClientService_reconnectionAttempt, 0, "f");
        await __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_handleConnectionDrop).call(this);
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('[HyperLiquidClientService] reconnect() completed', {
            newState: __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f"),
        });
    }
}
_HyperLiquidClientService_exchangeClient = new WeakMap(), _HyperLiquidClientService_infoClient = new WeakMap(), _HyperLiquidClientService_infoClientHttp = new WeakMap(), _HyperLiquidClientService_subscriptionClient = new WeakMap(), _HyperLiquidClientService_wsTransport = new WeakMap(), _HyperLiquidClientService_httpTransport = new WeakMap(), _HyperLiquidClientService_walletParams = new WeakMap(), _HyperLiquidClientService_isTestnet = new WeakMap(), _HyperLiquidClientService_connectionState = new WeakMap(), _HyperLiquidClientService_disconnectionPromise = new WeakMap(), _HyperLiquidClientService_onTerminateCallback = new WeakMap(), _HyperLiquidClientService_onReconnectCallback = new WeakMap(), _HyperLiquidClientService_reconnectionAttempt = new WeakMap(), _HyperLiquidClientService_connectionStateListeners = new WeakMap(), _HyperLiquidClientService_reconnectionRetryTimeout = new WeakMap(), _HyperLiquidClientService_deps = new WeakMap(), _HyperLiquidClientService_isReconnecting = new WeakMap(), _HyperLiquidClientService_instances = new WeakSet(), _HyperLiquidClientService_createTransports = function _HyperLiquidClientService_createTransports() {
    // Prevent duplicate transport creation and listener accumulation
    // This guards against re-entry if initialize() is called multiple times
    // (e.g., after a failed initialization attempt that didn't properly clean up)
    if (__classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f") && __classPrivateFieldGet(this, _HyperLiquidClientService_httpTransport, "f")) {
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid: Transports already exist, skipping creation');
        return __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f");
    }
    __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid: Creating transports', {
        isTestnet: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f"),
        timestamp: new Date().toISOString(),
        note: 'SDK will auto-select endpoints based on isTestnet flag',
    });
    // HTTP transport for request/response operations (InfoClient, ExchangeClient)
    // SDK automatically selects: mainnet (https://api.hyperliquid.xyz) or testnet (https://api.hyperliquid-testnet.xyz)
    __classPrivateFieldSet(this, _HyperLiquidClientService_httpTransport, new HttpTransport({
        isTestnet: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f"),
        timeout: HYPERLIQUID_TRANSPORT_CONFIG.timeout,
    }), "f");
    // WebSocket transport for real-time subscriptions (SubscriptionClient)
    // SDK automatically selects: mainnet (wss://api.hyperliquid.xyz/ws) or testnet (wss://api.hyperliquid-testnet.xyz/ws)
    __classPrivateFieldSet(this, _HyperLiquidClientService_wsTransport, new WebSocketTransport({
        isTestnet: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f"),
        ...HYPERLIQUID_TRANSPORT_CONFIG,
        reconnect: HYPERLIQUID_TRANSPORT_CONFIG.reconnect,
    }), "f");
    // Listen for WebSocket termination (fired when SDK exhausts all reconnection attempts)
    __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f").socket.addEventListener('terminate', (event) => {
        const customEvent = event;
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid: WebSocket terminated', {
            reason: customEvent.detail?.code,
            timestamp: new Date().toISOString(),
        });
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Disconnected);
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_onTerminateCallback, "f")) {
            const error = customEvent.detail instanceof Error
                ? customEvent.detail
                : new Error(`WebSocket terminated: ${customEvent.detail?.code ?? 'unknown'}`);
            __classPrivateFieldGet(this, _HyperLiquidClientService_onTerminateCallback, "f").call(this, error);
        }
    });
    return __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f");
}, _HyperLiquidClientService_createAllClients = function _HyperLiquidClientService_createAllClients(wallet) {
    if (!__classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f") || !__classPrivateFieldGet(this, _HyperLiquidClientService_httpTransport, "f")) {
        throw new Error('Transports must be created before clients');
    }
    __classPrivateFieldSet(this, _HyperLiquidClientService_infoClient, new InfoClient({ transport: __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f") }), "f");
    __classPrivateFieldSet(this, _HyperLiquidClientService_subscriptionClient, new SubscriptionClient({
        transport: __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f"),
    }), "f");
    __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_createHttpClients).call(this, wallet);
}, _HyperLiquidClientService_createHttpClients = function _HyperLiquidClientService_createHttpClients(wallet) {
    const effectiveWallet = wallet ?? __classPrivateFieldGet(this, _HyperLiquidClientService_walletParams, "f");
    if (!__classPrivateFieldGet(this, _HyperLiquidClientService_httpTransport, "f")) {
        throw new Error('HTTP transport must be created before clients');
    }
    __classPrivateFieldSet(this, _HyperLiquidClientService_infoClientHttp, new InfoClient({ transport: __classPrivateFieldGet(this, _HyperLiquidClientService_httpTransport, "f") }), "f");
    if (effectiveWallet) {
        __classPrivateFieldSet(this, _HyperLiquidClientService_exchangeClient, new ExchangeClient({
            wallet: effectiveWallet, // eslint-disable-line @typescript-eslint/no-explicit-any -- Type widening for SDK compatibility
            transport: __classPrivateFieldGet(this, _HyperLiquidClientService_httpTransport, "f"),
        }), "f");
    }
    else {
        __classPrivateFieldSet(this, _HyperLiquidClientService_exchangeClient, undefined, "f");
    }
}, _HyperLiquidClientService_runCandleSnapshotFetch = async function _HyperLiquidClientService_runCandleSnapshotFetch(options) {
    const { symbol, interval, limit, endTime, signal } = options;
    try {
        const now = endTime ?? Date.now();
        const intervalMs = __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_getIntervalMilliseconds).call(this, interval);
        const startTime = now - limit * intervalMs;
        // Use HTTP transport for historical candle snapshots (request/response).
        // This avoids the WebSocket abort race condition that causes 429s
        // during rapid market switching on extension (#TAT-2954).
        const infoClient = this.getInfoClient({ useHttp: true });
        const request = {
            coin: symbol, // Map to HyperLiquid SDK's 'coin' parameter
            interval,
            startTime,
            endTime: now,
        };
        const data = signal
            ? await infoClient.candleSnapshot(request, signal)
            : await infoClient.candleSnapshot(request);
        if (Array.isArray(data) && data.length > 0) {
            const candles = data.map((candle) => ({
                time: candle.t, // open time
                open: candle.o.toString(),
                high: candle.h.toString(),
                low: candle.l.toString(),
                close: candle.c.toString(),
                volume: candle.v.toString(),
            }));
            return {
                symbol,
                interval,
                candles,
            };
        }
        return {
            symbol,
            interval,
            candles: [],
        };
    }
    catch (error) {
        const errorInstance = ensureError(error, 'HyperLiquidClientService.fetchHistoricalCandles');
        if (isAbortError(error)) {
            throw error;
        }
        // Log to Sentry: prevents initial chart data load
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").logger.error(errorInstance, {
            tags: {
                feature: PERPS_CONSTANTS.FeatureName,
                service: 'HyperLiquidClientService',
                network: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f") ? 'testnet' : 'mainnet',
            },
            context: {
                name: 'historical_candles_api',
                data: {
                    operation: 'fetchHistoricalCandles',
                    symbol,
                    interval,
                    limit,
                    hasEndTime: endTime !== undefined,
                },
            },
        });
        throw error;
    }
}, _HyperLiquidClientService_runHistoricalOrdersFetch = async function _HyperLiquidClientService_runHistoricalOrdersFetch(userAddress) {
    const infoClient = this.getInfoClient();
    const result = await infoClient.historicalOrders({ user: userAddress });
    return result ?? [];
}, _HyperLiquidClientService_getIntervalMilliseconds = function _HyperLiquidClientService_getIntervalMilliseconds(interval) {
    const intervalMap = {
        [CandlePeriod.OneMinute]: 1 * 60 * 1000,
        [CandlePeriod.ThreeMinutes]: 3 * 60 * 1000,
        [CandlePeriod.FiveMinutes]: 5 * 60 * 1000,
        [CandlePeriod.FifteenMinutes]: 15 * 60 * 1000,
        [CandlePeriod.ThirtyMinutes]: 30 * 60 * 1000,
        [CandlePeriod.OneHour]: 60 * 60 * 1000,
        [CandlePeriod.TwoHours]: 2 * 60 * 60 * 1000,
        [CandlePeriod.FourHours]: 4 * 60 * 60 * 1000,
        [CandlePeriod.EightHours]: 8 * 60 * 60 * 1000,
        [CandlePeriod.TwelveHours]: 12 * 60 * 60 * 1000,
        [CandlePeriod.OneDay]: 24 * 60 * 60 * 1000,
        [CandlePeriod.ThreeDays]: 3 * 24 * 60 * 60 * 1000,
        [CandlePeriod.OneWeek]: 7 * 24 * 60 * 60 * 1000,
        [CandlePeriod.OneMonth]: 30 * 24 * 60 * 60 * 1000, // Approximate
    };
    return intervalMap[interval];
}, _HyperLiquidClientService_performDisconnection = async function _HyperLiquidClientService_performDisconnection() {
    try {
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Disconnecting);
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid: Disconnecting SDK clients', {
            isTestnet: __classPrivateFieldGet(this, _HyperLiquidClientService_isTestnet, "f"),
            timestamp: new Date().toISOString(),
            connectionState: __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f"),
        });
        // Clear callbacks
        __classPrivateFieldSet(this, _HyperLiquidClientService_onReconnectCallback, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_onTerminateCallback, null, "f");
        // Cancel any pending reconnection retry timeout
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionRetryTimeout, "f")) {
            clearTimeout(__classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionRetryTimeout, "f"));
            __classPrivateFieldSet(this, _HyperLiquidClientService_reconnectionRetryTimeout, null, "f");
        }
        // Clear connection state listeners to prevent stale callbacks
        __classPrivateFieldGet(this, _HyperLiquidClientService_connectionStateListeners, "f").clear();
        // Reset reconnection flag to allow future manual retries
        // This prevents a race condition where disconnecting during an active
        // reconnection attempt could leave the flag stuck, blocking subsequent retries
        __classPrivateFieldSet(this, _HyperLiquidClientService_isReconnecting, false, "f");
        // Close WebSocket transport only (HTTP is stateless)
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f")) {
            try {
                __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f").close();
                __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid: Closed WebSocket transport', {
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").logger.error(ensureError(error, 'HyperLiquidClientService.performDisconnection'), {
                    tags: { feature: PERPS_CONSTANTS.FeatureName },
                    context: {
                        name: 'HyperLiquidClientService.performDisconnection',
                        data: { action: 'close_transport' },
                    },
                });
            }
        }
        // Clear client references
        __classPrivateFieldSet(this, _HyperLiquidClientService_subscriptionClient, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_exchangeClient, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_infoClient, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_infoClientHttp, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_wsTransport, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_httpTransport, undefined, "f");
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Disconnected);
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid: SDK clients fully disconnected', {
            timestamp: new Date().toISOString(),
            connectionState: __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f"),
        });
    }
    catch (error) {
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Disconnected);
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").logger.error(ensureError(error, 'HyperLiquidClientService.performDisconnection'), {
            tags: { feature: PERPS_CONSTANTS.FeatureName },
            context: {
                name: 'HyperLiquidClientService.performDisconnection',
                data: { action: 'outer_catch' },
            },
        });
        throw error;
    }
}, _HyperLiquidClientService_updateConnectionState = function _HyperLiquidClientService_updateConnectionState(newState) {
    const previousState = __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f");
    const stateChanged = previousState !== newState;
    const isReconnectionAttempt = newState === WebSocketConnectionState.Connecting &&
        __classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionAttempt, "f") > 0;
    __classPrivateFieldSet(this, _HyperLiquidClientService_connectionState, newState, "f");
    // Reset reconnection attempt counter when successfully connected
    if (newState === WebSocketConnectionState.Connected) {
        __classPrivateFieldSet(this, _HyperLiquidClientService_reconnectionAttempt, 0, "f");
    }
    // Notify if state changed OR if this is a reconnection attempt (to update attempt count)
    if (stateChanged || isReconnectionAttempt) {
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_notifyConnectionStateListeners).call(this);
    }
}, _HyperLiquidClientService_notifyConnectionStateListeners = function _HyperLiquidClientService_notifyConnectionStateListeners() {
    __classPrivateFieldGet(this, _HyperLiquidClientService_connectionStateListeners, "f").forEach((listener) => {
        try {
            listener(__classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f"), __classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionAttempt, "f"));
        }
        catch {
            // Ignore errors in listeners to prevent breaking other listeners
        }
    });
}, _HyperLiquidClientService_handleConnectionDrop = 
/**
 * Handle detected connection drop
 * Recreates WebSocket transport and notifies callback to restore subscriptions
 * Will give up after maxReconnectionAttempts and mark status as disconnected
 */
async function _HyperLiquidClientService_handleConnectionDrop() {
    // Prevent multiple simultaneous reconnection attempts
    if (__classPrivateFieldGet(this, _HyperLiquidClientService_isReconnecting, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _HyperLiquidClientService_isReconnecting, true, "f");
    // Increment reconnection attempt counter
    __classPrivateFieldSet(this, _HyperLiquidClientService_reconnectionAttempt, __classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionAttempt, "f") + 1, "f");
    // Check if we've exceeded max retry attempts
    if (__classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionAttempt, "f") > maxReconnectionAttempts) {
        __classPrivateFieldSet(this, _HyperLiquidClientService_isReconnecting, false, "f");
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Disconnected);
        return;
    }
    try {
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Connecting);
        // Close existing WebSocket transport and clear references
        // so createTransports() will create fresh ones
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f")) {
            try {
                __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f").close();
            }
            catch {
                // Ignore errors during close - transport may already be dead
            }
        }
        __classPrivateFieldSet(this, _HyperLiquidClientService_wsTransport, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_httpTransport, undefined, "f");
        // WebSocket clients are unavailable throughout the reconnect. HTTP
        // clients remain usable while the new socket is staged and verified.
        __classPrivateFieldSet(this, _HyperLiquidClientService_subscriptionClient, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_infoClient, undefined, "f");
        // Recreate transports (both WS and HTTP)
        const newWsTransport = __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_createTransports).call(this);
        const newInfoClient = new InfoClient({ transport: newWsTransport });
        const newSubscriptionClient = new SubscriptionClient({
            transport: newWsTransport,
        });
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_createHttpClients).call(this);
        await newWsTransport.ready();
        // Publish WebSocket clients only after the transport is usable. This
        // keeps isInitialized() false and blocks WS-backed access during a
        // failed or in-flight reconnect without disabling HTTP-backed trading.
        __classPrivateFieldSet(this, _HyperLiquidClientService_infoClient, newInfoClient, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_subscriptionClient, newSubscriptionClient, "f");
        __classPrivateFieldGet(this, _HyperLiquidClientService_deps, "f").debugLogger.log('HyperLiquid: Transport ready, restoring subscriptions', { timestamp: new Date().toISOString() });
        // NOW safe to restore subscriptions
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_onReconnectCallback, "f")) {
            await __classPrivateFieldGet(this, _HyperLiquidClientService_onReconnectCallback, "f").call(this);
        }
        // Cancel any pending retry timeout from previous failed attempts
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionRetryTimeout, "f")) {
            clearTimeout(__classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionRetryTimeout, "f"));
            __classPrivateFieldSet(this, _HyperLiquidClientService_reconnectionRetryTimeout, null, "f");
        }
        __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Connected);
        __classPrivateFieldSet(this, _HyperLiquidClientService_isReconnecting, false, "f");
    }
    catch {
        // The staged WebSocket clients were never published. Keep the HTTP
        // clients alive so exchange writes and explicit HTTP info reads remain
        // available while the WebSocket retry loop continues.
        __classPrivateFieldSet(this, _HyperLiquidClientService_subscriptionClient, undefined, "f");
        __classPrivateFieldSet(this, _HyperLiquidClientService_infoClient, undefined, "f");
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f")) {
            try {
                __classPrivateFieldGet(this, _HyperLiquidClientService_wsTransport, "f").close();
            }
            catch {
                // Ignore cleanup errors - transport may already be dead
            }
        }
        __classPrivateFieldSet(this, _HyperLiquidClientService_wsTransport, undefined, "f");
        // Reset flag before scheduling retry so the next attempt can proceed
        __classPrivateFieldSet(this, _HyperLiquidClientService_isReconnecting, false, "f");
        // Check if we've exceeded max retry attempts
        if (__classPrivateFieldGet(this, _HyperLiquidClientService_reconnectionAttempt, "f") >= maxReconnectionAttempts) {
            __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_updateConnectionState).call(this, WebSocketConnectionState.Disconnected);
            return;
        }
        // Reconnection failed - schedule a retry after a delay
        // Store timeout reference so it can be cancelled on intentional disconnect
        __classPrivateFieldSet(this, _HyperLiquidClientService_reconnectionRetryTimeout, setTimeout(() => {
            __classPrivateFieldSet(this, _HyperLiquidClientService_reconnectionRetryTimeout, null, "f"); // Clear reference after execution
            // Only retry if we haven't been intentionally disconnected
            // and no manual reconnect() is already in progress
            // Note: State may be CONNECTING or DISCONNECTED (if terminate event fired during reconnect)
            if ((__classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f") === WebSocketConnectionState.Connecting ||
                __classPrivateFieldGet(this, _HyperLiquidClientService_connectionState, "f") === WebSocketConnectionState.Disconnected) &&
                !__classPrivateFieldGet(this, _HyperLiquidClientService_disconnectionPromise, "f") &&
                !__classPrivateFieldGet(this, _HyperLiquidClientService_isReconnecting, "f")) {
                __classPrivateFieldGet(this, _HyperLiquidClientService_instances, "m", _HyperLiquidClientService_handleConnectionDrop).call(this).catch(() => {
                    // Error already handled inside #handleConnectionDrop
                });
            }
        }, PERPS_CONSTANTS.ReconnectionRetryDelayMs), "f");
    }
};
//# sourceMappingURL=HyperLiquidClientService.mjs.map