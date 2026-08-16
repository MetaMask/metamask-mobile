/**
 * LighterProvider
 *
 * Provider implementation for the zkLighter protocol (POC).
 * Implements the PerpsProvider interface with live REST reads and a real
 * write path (place/cancel limit orders) driven through the Lighter Go/WASM
 * signer behind the transport-agnostic {@link LighterSignerBridge} seam.
 *
 * Key differences from HyperLiquid:
 * - Venue-specific key (Schnorr over ECgFp5) registered per API-key slot via
 *   a ChangePubKey L2 transaction carrying an EIP-191 personal_sign L1Sig.
 * - Order prices/sizes are integers scaled by per-market decimals.
 * - REST + polling in the POC; WebSocket streams deferred.
 */
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
var _LighterProvider_deps, _LighterProvider_clientService, _LighterProvider_walletService, _LighterProvider_messenger, _LighterProvider_signerBridge, _LighterProvider_isTestnet, _LighterProvider_apiKeyIndex, _LighterProvider_configuredAccountIndex, _LighterProvider_marketsBySymbol, _LighterProvider_marketsById, _LighterProvider_accountIndex, _LighterProvider_boundAddress, _LighterProvider_sessionGeneration, _LighterProvider_priceSubscribers, _LighterProvider_pricePollTimer, _LighterProvider_priceWs, _LighterProvider_pricePollCycle, _LighterProvider_webSocketCtor, _LighterProvider_wsWantedChannels, _LighterProvider_wsKeepaliveTimer, _LighterProvider_connectionState, _LighterProvider_wsReconnectAttempts, _LighterProvider_connectionListeners, _LighterProvider_setConnectionState, _LighterProvider_wsReconnectTimer, _LighterProvider_lastPriceBySymbol, _LighterProvider_wsPositions, _LighterProvider_wsOrders, _LighterProvider_oiCapSubscribers, _LighterProvider_accountSubscribers, _LighterProvider_positionSubscribers, _LighterProvider_orderSubscribers, _LighterProvider_fillSubscribers, _LighterProvider_orderBookSubscribers, _LighterProvider_orderBookState, _LighterProvider_candleSubscribers, _LighterProvider_candleSeries, _LighterProvider_accountChannelsPromise, _LighterProvider_venuePublicKey, _LighterProvider_signerReadyPromise, _LighterProvider_authToken, _LighterProvider_getErrorContext, _LighterProvider_getSignerBridge, _LighterProvider_invalidateSignerSession, _LighterProvider_ensureSessionBinding, _LighterProvider_rebuildStreamForSubscribers, _LighterProvider_ensureAccountIndex, _LighterProvider_ensureSignerReady, _LighterProvider_setupSigner, _LighterProvider_isVenueKeyRegistered, _LighterProvider_registerVenueKey, _LighterProvider_writeChain, _LighterProvider_withVenueWriteLock, _LighterProvider_withVenueNonce, _LighterProvider_getAuthToken, _LighterProvider_ensureMarkets, _LighterProvider_resolveLeverageIntent, _LighterProvider_marginBySymbol, _LighterProvider_ensureMarketMargins, _LighterProvider_ensureAccountChannels, _LighterProvider_hasAnySubscriber, _LighterProvider_requestChannel, _LighterProvider_sendSubscribe, _LighterProvider_releaseChannelIfUnused, _LighterProvider_ensureStream, _LighterProvider_connectWs, _LighterProvider_handleWsMessage, _LighterProvider_handleOrderBookMessage, _LighterProvider_handleCandleMessage, _LighterProvider_handleTradesMessage, _LighterProvider_dispatchOICaps, _LighterProvider_emitToOrderSubscribers, _LighterProvider_logSubscriberError, _LighterProvider_startPricePolling, _LighterProvider_emitPolledPrices, _LighterProvider_dispatchPriceUpdates, _LighterProvider_deliverPrices, _LighterProvider_clearKeepalive, _LighterProvider_teardownStream, _LighterProvider_bridgeRoute;
import { computeLighterMinOrderSize, getLighterChainId, LIGHTER_RESOLUTION_MS, LIGHTER_SUPPORTED_RESOLUTIONS, LIGHTER_DEFAULT_API_KEY_INDEX, LIGHTER_MAX_LEVERAGE, LIGHTER_NO_TRIGGER_PRICE, LIGHTER_ORDER_EXPIRY_NONE, LIGHTER_ORDER_TYPE_LIMIT, LIGHTER_ORDER_TYPE_MARKET, LIGHTER_TIME_IN_FORCE_GOOD_TILL_TIME, getLighterWsEndpoint, LIGHTER_PRICE_POLLING_INTERVAL_MS, LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL, LIGHTER_BRIDGE_CONFIG, LIGHTER_TX_TYPE_CANCEL_ORDER, LIGHTER_TX_TYPE_CHANGE_PUB_KEY, LIGHTER_GROUPING_ONE_CANCELS_THE_OTHER, LIGHTER_ORDER_TYPE_STOP_LOSS, LIGHTER_ORDER_TYPE_TAKE_PROFIT, LIGHTER_TX_TYPE_CREATE_GROUPED_ORDERS, LIGHTER_TX_TYPE_CREATE_ORDER, LIGHTER_TX_TYPE_UPDATE_LEVERAGE, LIGHTER_TX_TYPE_UPDATE_MARGIN, LIGHTER_TX_TYPE_WITHDRAW, LIGHTER_MARGIN_MODE_CROSS, LIGHTER_USDC_ASSET_INDEX, toLighterInteger } from "../constants/lighterConfig.mjs";
import { PERPS_CONSTANTS } from "../constants/perpsConfig.mjs";
import { convertKeysToCamelCase, LighterClientService } from "../services/LighterClientService.mjs";
import { LighterWalletService } from "../services/LighterWalletService.mjs";
import { WebSocketConnectionState } from "../types/index.mjs";
import { ensureError } from "../utils/errorUtils.mjs";
import { adaptAccountStateFromLighter, adaptAccountStateFromLighterUserStats, adaptFillFromLighterTrade, adaptMarketDataFromLighter, adaptMarketFromLighter, adaptOrderFromLighter, adaptPositionFromLighter, adaptPriceUpdateFromLighter, adaptPriceUpdateFromLighterWsStat } from "../utils/lighterAdapter.mjs";
// ============================================================================
// Constants
// ============================================================================
const LIGHTER_NOT_SUPPORTED_ERROR = 'Lighter operation not yet supported';
const LIGHTER_SIGNER_UNAVAILABLE_ERROR = 'Lighter signer bridge not configured';
const LIGHTER_MAINNET_EXPLORER_URL = 'https://scan.lighter.xyz';
const LIGHTER_TESTNET_EXPLORER_URL = 'https://testnet.zklighter.elliot.ai';
/**
 * Empty account state returned when reads fail or no account exists.
 */
const EMPTY_ACCOUNT_STATE = {
    totalBalance: '0',
    spendableBalance: '0',
    withdrawableBalance: '0',
    marginUsed: '0',
    unrealizedPnl: '0',
    returnOnEquity: '0',
    providerId: 'lighter',
};
// ============================================================================
// LighterProvider
// ============================================================================
/**
 * Lighter provider implementation (POC).
 */
export class LighterProvider {
    constructor(options) {
        this.protocolId = 'lighter';
        _LighterProvider_deps.set(this, void 0);
        _LighterProvider_clientService.set(this, void 0);
        _LighterProvider_walletService.set(this, void 0);
        _LighterProvider_messenger.set(this, void 0);
        _LighterProvider_signerBridge.set(this, void 0);
        _LighterProvider_isTestnet.set(this, void 0);
        _LighterProvider_apiKeyIndex.set(this, void 0);
        _LighterProvider_configuredAccountIndex.set(this, void 0);
        /** Markets cache keyed by symbol (freshness delegated to client service). */
        _LighterProvider_marketsBySymbol.set(this, new Map());
        _LighterProvider_marketsById.set(this, new Map());
        /** Resolved Lighter account index (after ensureAccount()). */
        _LighterProvider_accountIndex.set(this, null);
        /** L1 address the current venue session (index/signer/auth) is bound to. */
        _LighterProvider_boundAddress.set(this, null);
        /**
         * Monotonic counter bumped on every session rebind. Async resolutions
         * capture it before awaiting and refuse to cache results from a stale
         * generation (an account-A lookup resolving after the switch to B).
         */
        _LighterProvider_sessionGeneration.set(this, 0);
        /** Active price-stream subscribers (REST polling fan-out). */
        _LighterProvider_priceSubscribers.set(this, new Set());
        _LighterProvider_pricePollTimer.set(this, null);
        _LighterProvider_priceWs.set(this, null);
        /** Monotonic poll counter — surfaced in debug logs so e2e can assert liveness. */
        _LighterProvider_pricePollCycle.set(this, 0);
        /** Injectable WebSocket constructor (null → REST polling fallback). */
        _LighterProvider_webSocketCtor.set(this, void 0);
        /** Channels the shared socket should be subscribed to (subscribe payloads). */
        _LighterProvider_wsWantedChannels.set(this, new Map());
        _LighterProvider_wsKeepaliveTimer.set(this, null);
        /** Live WS connection state, mirrored to subscribed listeners. */
        _LighterProvider_connectionState.set(this, WebSocketConnectionState.Disconnected);
        /** Consecutive reconnect attempts since the last successful open. */
        _LighterProvider_wsReconnectAttempts.set(this, 0);
        _LighterProvider_connectionListeners.set(this, new Set());
        _LighterProvider_setConnectionState.set(this, (state) => {
            if (__classPrivateFieldGet(this, _LighterProvider_connectionState, "f") === state) {
                return;
            }
            __classPrivateFieldSet(this, _LighterProvider_connectionState, state, "f");
            for (const listener of __classPrivateFieldGet(this, _LighterProvider_connectionListeners, "f")) {
                try {
                    listener(state, __classPrivateFieldGet(this, _LighterProvider_wsReconnectAttempts, "f"));
                }
                catch (error) {
                    __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'connection-state', error);
                }
            }
        });
        _LighterProvider_wsReconnectTimer.set(this, null);
        /** Merged latest price per symbol, replayed to late price subscribers. */
        _LighterProvider_lastPriceBySymbol.set(this, new Map());
        /** Merged live position state from account_all_positions (keyed marketId). */
        _LighterProvider_wsPositions.set(this, new Map());
        /** Merged live open orders from account_all_orders (keyed orderId). */
        _LighterProvider_wsOrders.set(this, new Map());
        _LighterProvider_oiCapSubscribers.set(this, new Set());
        _LighterProvider_accountSubscribers.set(this, new Set());
        _LighterProvider_positionSubscribers.set(this, new Set());
        _LighterProvider_orderSubscribers.set(this, new Set());
        _LighterProvider_fillSubscribers.set(this, new Set());
        /** Order-book subscribers keyed by market id. */
        _LighterProvider_orderBookSubscribers.set(this, new Map());
        /** Live order-book level state per market (price → size). */
        _LighterProvider_orderBookState.set(this, new Map());
        /** Candle subscribers keyed by `marketId:resolution`. */
        _LighterProvider_candleSubscribers.set(this, new Map());
        /** Cached candle series per `marketId:resolution` (keyed by open time). */
        _LighterProvider_candleSeries.set(this, new Map());
        /** Dedup for the async account-channel setup. */
        _LighterProvider_accountChannelsPromise.set(this, null);
        /** Derived venue public key hex, set after the signer client is created. */
        _LighterProvider_venuePublicKey.set(this, null);
        /** Signer session dedup. */
        _LighterProvider_signerReadyPromise.set(this, null);
        /** Cached auth token (deadline-managed). */
        _LighterProvider_authToken.set(this, null);
        // ============================================================================
        // Error Context Helper
        // ============================================================================
        _LighterProvider_getErrorContext.set(this, (method, extra) => {
            return {
                tags: {
                    feature: PERPS_CONSTANTS.FeatureName,
                    provider: 'LighterProvider',
                    network: __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet',
                },
                context: {
                    name: `LighterProvider.${method}`,
                    data: {
                        isTestnet: __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f"),
                        ...extra,
                    },
                },
            };
        });
        // ============================================================================
        // Signer session
        // ============================================================================
        _LighterProvider_getSignerBridge.set(this, () => {
            if (!__classPrivateFieldGet(this, _LighterProvider_signerBridge, "f")) {
                throw new Error(LIGHTER_SIGNER_UNAVAILABLE_ERROR);
            }
            const bridge = __classPrivateFieldGet(this, _LighterProvider_signerBridge, "f");
            // The WASM client lives inside the bridge host (mobile: a WebView that
            // can reload and lose it). When the venue signer reports a missing
            // client, drop the cached session so the next call re-runs setup
            // instead of failing forever against a resolved-but-dead session.
            return {
                execute: async (call) => {
                    const lostClientPattern = /client is not created|WebView reloaded|signer not ready|executor not connected|timed out/iu;
                    try {
                        const result = await bridge.execute(call);
                        const error = result?.error;
                        if (error && lostClientPattern.test(error)) {
                            __classPrivateFieldGet(this, _LighterProvider_invalidateSignerSession, "f").call(this);
                        }
                        return result;
                    }
                    catch (error) {
                        if (lostClientPattern.test(String(error))) {
                            __classPrivateFieldGet(this, _LighterProvider_invalidateSignerSession, "f").call(this);
                        }
                        throw error;
                    }
                },
            };
        });
        _LighterProvider_invalidateSignerSession.set(this, () => {
            __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_authToken, null, "f");
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] signer session invalidated (client lost); will re-setup on next call');
        });
        /**
         * Bind the venue session to the currently selected wallet address.
         *
         * Everything downstream — account index, venue signer, auth token, and
         * the account-scoped stream channels — is derived from one L1 address.
         * When the wallet switches accounts, all of it must be dropped
         * atomically or reads/writes would keep targeting the previous account.
         */
        _LighterProvider_ensureSessionBinding.set(this, () => {
            let address;
            try {
                address = __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress().toLowerCase();
            }
            catch {
                // No account selected — the caller's own address resolution surfaces
                // the error with better context.
                return;
            }
            if (__classPrivateFieldGet(this, _LighterProvider_boundAddress, "f") === address) {
                return;
            }
            const hadPreviousBinding = __classPrivateFieldGet(this, _LighterProvider_boundAddress, "f") !== null;
            __classPrivateFieldSet(this, _LighterProvider_boundAddress, address, "f");
            if (!hadPreviousBinding) {
                return;
            }
            // Invalidate in-flight async resolutions started under the previous
            // binding: they compare this generation after their awaits and retry
            // instead of caching results for the wrong account.
            __classPrivateFieldSet(this, _LighterProvider_sessionGeneration, __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f") + 1, "f");
            __classPrivateFieldSet(this, _LighterProvider_accountIndex, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_authToken, null, "f");
            __classPrivateFieldGet(this, _LighterProvider_teardownStream, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_rebuildStreamForSubscribers, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] session rebound to new wallet account');
        });
        /**
         * Re-request every channel the current subscriber registries imply.
         *
         * #teardownStream clears the wanted-channel intents; without this,
         * subscribers that outlive an account switch would sit on a fresh socket
         * subscribed to nothing.
         */
        _LighterProvider_rebuildStreamForSubscribers.set(this, () => {
            if (!__classPrivateFieldGet(this, _LighterProvider_hasAnySubscriber, "f").call(this)) {
                return;
            }
            if (__classPrivateFieldGet(this, _LighterProvider_priceSubscribers, "f").size > 0 || __classPrivateFieldGet(this, _LighterProvider_oiCapSubscribers, "f").size > 0) {
                __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, 'market_stats/all');
            }
            for (const marketId of __classPrivateFieldGet(this, _LighterProvider_orderBookSubscribers, "f").keys()) {
                __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `order_book/${marketId}`);
            }
            for (const seriesKey of __classPrivateFieldGet(this, _LighterProvider_candleSubscribers, "f").keys()) {
                // Series keys are `${marketId}:${resolution}`; the channel form uses
                // slashes. The teardown cleared the series state, and the message
                // router drops updates for unknown series — recreate an empty series
                // so live candles flow again (history reseeds on the next fetch).
                __classPrivateFieldGet(this, _LighterProvider_candleSeries, "f").set(seriesKey, new Map());
                __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `candle/${seriesKey.replace(':', '/')}`);
            }
            if (__classPrivateFieldGet(this, _LighterProvider_accountSubscribers, "f").size > 0 ||
                __classPrivateFieldGet(this, _LighterProvider_positionSubscribers, "f").size > 0 ||
                __classPrivateFieldGet(this, _LighterProvider_orderSubscribers, "f").size > 0 ||
                __classPrivateFieldGet(this, _LighterProvider_fillSubscribers, "f").size > 0) {
                // The promise was cleared by the teardown, so this re-resolves the
                // account channels against the newly bound address.
                __classPrivateFieldGet(this, _LighterProvider_ensureAccountChannels, "f").call(this);
            }
            __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
        });
        /**
         * Resolve the Lighter account index for the current user.
         *
         * @returns The account index.
         */
        _LighterProvider_ensureAccountIndex.set(this, async () => {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            if (__classPrivateFieldGet(this, _LighterProvider_accountIndex, "f") !== null) {
                return __classPrivateFieldGet(this, _LighterProvider_accountIndex, "f");
            }
            if (__classPrivateFieldGet(this, _LighterProvider_configuredAccountIndex, "f") !== undefined) {
                __classPrivateFieldSet(this, _LighterProvider_accountIndex, __classPrivateFieldGet(this, _LighterProvider_configuredAccountIndex, "f"), "f");
                return __classPrivateFieldGet(this, _LighterProvider_accountIndex, "f");
            }
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const address = __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress();
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getAccountsByL1Address(address);
            if (generation !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                // The wallet switched accounts while this lookup was in flight;
                // caching would poison the new session with the old account. Retry
                // against the current binding.
                return await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            }
            if (!response.subAccounts?.length) {
                throw new Error(`No Lighter account exists for ${address}; fund it via the bridge (or the testnet faucet) first`);
            }
            const master = response.subAccounts.reduce((min, account) => account.index < min.index ? account : min);
            __classPrivateFieldSet(this, _LighterProvider_accountIndex, master.index, "f");
            return __classPrivateFieldGet(this, _LighterProvider_accountIndex, "f");
        });
        /**
         * Create the WASM signer client and register the venue key if the
         * account's key slot does not hold it yet. Deduplicated.
         *
         * @returns Resolves when the signer session is ready.
         */
        _LighterProvider_ensureSignerReady.set(this, async () => {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            if (__classPrivateFieldGet(this, _LighterProvider_signerReadyPromise, "f")) {
                return await __classPrivateFieldGet(this, _LighterProvider_signerReadyPromise, "f");
            }
            __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, __classPrivateFieldGet(this, _LighterProvider_setupSigner, "f").call(this).catch((error) => {
                __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, null, "f");
                throw error;
            }), "f");
            return await __classPrivateFieldGet(this, _LighterProvider_signerReadyPromise, "f");
        });
        _LighterProvider_setupSigner.set(this, async () => {
            const bridge = __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const chainId = getLighterChainId(__classPrivateFieldGet(this, _LighterProvider_clientService, "f").network);
            const seed = await __classPrivateFieldGet(this, _LighterProvider_walletService, "f").deriveKeySeedPlain(__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
            const nonceResponse = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getNextNonce(accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
            const created = await bridge.execute({
                function: '_createClient',
                params: [
                    seed,
                    chainId,
                    accountIndex,
                    nonceResponse.nonce,
                    __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"),
                ],
            });
            if (created.error || !created.success) {
                throw new Error(`Lighter signer client creation failed: ${created.error ?? 'unknown'}`);
            }
            __classPrivateFieldSet(this, _LighterProvider_venuePublicKey, created.pk, "f");
            // Register the venue key when the slot does not hold it yet. Only the
            // plaintext body leaves this scope — `created.prv` (the venue private
            // key) must stay inside the signer bridge boundary and never be logged.
            const registered = await __classPrivateFieldGet(this, _LighterProvider_isVenueKeyRegistered, "f").call(this, accountIndex);
            if (!registered) {
                await __classPrivateFieldGet(this, _LighterProvider_registerVenueKey, "f").call(this, accountIndex, created.body);
            }
        });
        _LighterProvider_isVenueKeyRegistered.set(this, async (accountIndex) => {
            try {
                const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getApiKeys(accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
                return response.apiKeys.some((key) => key.apiKeyIndex === __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f") &&
                    key.publicKey === __classPrivateFieldGet(this, _LighterProvider_venuePublicKey, "f"));
            }
            catch {
                return false;
            }
        });
        _LighterProvider_registerVenueKey.set(this, async (accountIndex, changePubKeyBody) => {
            const bridge = __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this);
            // The ChangePubKey plaintext from _createClient embeds the nonce used at
            // client creation; sign it with the user's L1 account (EIP-191).
            const l1Signature = await __classPrivateFieldGet(this, _LighterProvider_walletService, "f").signPersonalMessage(changePubKeyBody);
            const nonceResponse = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getNextNonce(accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
            const signed = await bridge.execute({
                function: '_signChangePubKey',
                params: [
                    accountIndex,
                    l1Signature,
                    nonceResponse.nonce,
                    __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"),
                ],
            });
            if (signed.error) {
                throw new Error(`Lighter ChangePubKey signing failed: ${signed.error}`);
            }
            const result = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").sendTx(LIGHTER_TX_TYPE_CHANGE_PUB_KEY, signed.txInfo);
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] Venue key registered', {
                accountIndex,
                apiKeyIndex: __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"),
                txHash: result.txHash,
            });
        });
        /**
         * Mint (or reuse) an auth token for authenticated REST reads.
         *
         * @returns Auth token string.
         */
        /** Tail of the serialized venue-write chain (see #withVenueNonce). */
        _LighterProvider_writeChain.set(this, Promise.resolve());
        /**
         * Serialize a nonce-consuming venue write.
         *
         * Lighter nonces are strictly ordered per key slot; two interleaved
         * fetch→submit pairs (e.g. the controller's per-item batch fallbacks
         * running concurrently) would sign with the same nonce and get one
         * rejection. Every write acquires the chain, fetches a fresh nonce
         * inside it, and submits before the next write's fetch runs. A section
         * queued under a wallet account that has since been switched away from
         * refuses to run — a delayed account-A write must never execute inside
         * account-B's session.
         *
         * @param accountIndex - Account whose key-slot nonce is consumed.
         * @param section - Work to run exclusively; fetch nonces via the
         * provided helper (each call returns the next fresh nonce).
         * @param generationAtIntent - Session generation captured when the
         * caller's intent was formed (defaults to now).
         * @returns The section's result.
         */
        _LighterProvider_withVenueWriteLock.set(this, async (accountIndex, section, generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) => {
            const criticalSection = async () => {
                if (generationAtIntent !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                    throw new Error('Operation cancelled: the wallet switched accounts while this write was queued');
                }
                const nextNonce = async () => {
                    const nonceResponse = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getNextNonce(accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
                    return nonceResponse.nonce;
                };
                return await section(nextNonce);
            };
            const run = __classPrivateFieldGet(this, _LighterProvider_writeChain, "f").then(criticalSection, criticalSection);
            __classPrivateFieldSet(this, _LighterProvider_writeChain, run.then(() => undefined, () => undefined), "f");
            return await run;
        });
        _LighterProvider_withVenueNonce.set(this, async (accountIndex, operation, generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) => await __classPrivateFieldGet(this, _LighterProvider_withVenueWriteLock, "f").call(this, accountIndex, async (nextNonce) => operation(await nextNonce()), generationAtIntent));
        _LighterProvider_getAuthToken.set(this, async () => {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const nowSeconds = Math.floor(Date.now() / 1000);
            if (__classPrivateFieldGet(this, _LighterProvider_authToken, "f") && __classPrivateFieldGet(this, _LighterProvider_authToken, "f").deadline - nowSeconds > 60) {
                return __classPrivateFieldGet(this, _LighterProvider_authToken, "f").token;
            }
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const token = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                function: '_createAuthToken',
                params: [accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")],
            });
            if (token.error || !token.token) {
                throw new Error(`Lighter auth token creation failed: ${token.error ?? 'unknown'}`);
            }
            if (generation !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                // Minted under a binding that no longer exists — do not cache it;
                // re-mint against the current session.
                return await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            }
            __classPrivateFieldSet(this, _LighterProvider_authToken, { token: token.token, deadline: token.deadline }, "f");
            return token.token;
        });
        _LighterProvider_ensureMarkets.set(this, async () => {
            if (__classPrivateFieldGet(this, _LighterProvider_marketsBySymbol, "f").size === 0) {
                await this.initialize();
            }
            return __classPrivateFieldGet(this, _LighterProvider_marketsBySymbol, "f");
        });
        // ============================================================================
        // Trading Operations (POC: limit/market place + cancel)
        // ============================================================================
        /**
         * Apply the leverage the caller requested with the order.
         *
         * Lighter models leverage as a per-market account setting (UpdateLeverage,
         * tx 20; initial margin fraction in hundredths of a percent), not an order
         * field. The venue rejects the update while a position or resting order
         * exists on the market, so in that case the request is skipped with a log
         * (matching the already-set leverage is not an error).
         *
         * @param accountIndex - Lighter account index.
         * @param market - Market metadata for the order being placed.
         * @param params - The original order params carrying `leverage`.
         */
        /**
         * Decide whether the caller's requested leverage needs a venue update.
         *
         * @param params - The order params carrying `leverage`.
         * @returns The UpdateLeverage margin fraction (hundredths of a percent)
         * to sign, or null when no change is needed.
         */
        _LighterProvider_resolveLeverageIntent.set(this, async (params) => {
            const requested = params.leverage;
            if (!requested ||
                requested <= 0 ||
                requested === params.existingPositionLeverage) {
                return null;
            }
            const positions = await this.getPositions();
            const held = positions.find((position) => position.symbol === params.symbol);
            if (held?.leverage?.value !== undefined &&
                Math.abs(held.leverage.value - requested) < 0.5) {
                // Requested leverage already in effect — intent satisfied.
                return null;
            }
            // Otherwise sign the update inside the placement's own write lock. If
            // the market has a position or resting order the venue rejects it with
            // a clear error, failing the placement instead of silently trading at
            // a leverage the caller did not ask for.
            return Math.round(10000 / requested);
        });
        /** Per-market margin fractions from orderBookDetails (hundredths of %). */
        _LighterProvider_marginBySymbol.set(this, new Map());
        _LighterProvider_ensureMarketMargins.set(this, async () => {
            if (__classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").size > 0) {
                return;
            }
            const details = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBookDetails();
            for (const detail of details.orderBookDetails) {
                __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").set(detail.symbol, {
                    minInitial: detail.minInitialMarginFraction,
                    maintenance: detail.maintenanceMarginFraction,
                });
            }
        });
        // ============================================================================
        // Shared WebSocket stream manager (market_stats / user_stats /
        // account_all_positions / account_all_orders), REST polling fallback for
        // prices when no WebSocket implementation is available.
        // ============================================================================
        /**
         * Resolve the Lighter account index and request the account-scoped
         * channels; without a Lighter account the account-ish subscribers get one
         * empty emission (graceful degradation, matching REST reads).
         */
        _LighterProvider_ensureAccountChannels.set(this, () => {
            if (__classPrivateFieldGet(this, _LighterProvider_accountChannelsPromise, "f")) {
                __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
                return;
            }
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            __classPrivateFieldSet(this, _LighterProvider_accountChannelsPromise, (async () => {
                try {
                    const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
                    if (generation !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                        // The wallet switched accounts while resolving; the rebind's own
                        // rebuild requests the channels for the new session.
                        return;
                    }
                    __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `user_stats/${accountIndex}`);
                    __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `account_all_positions/${accountIndex}`);
                    __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `account_all_trades/${accountIndex}`);
                    try {
                        const auth = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
                        if (generation !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                            return;
                        }
                        __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `account_all_orders/${accountIndex}`, auth);
                    }
                    catch (error) {
                        __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] orders channel skipped (no auth token)', { error: String(error) });
                        __classPrivateFieldGet(this, _LighterProvider_emitToOrderSubscribers, "f").call(this, []);
                    }
                }
                catch (error) {
                    __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] account channels unavailable', { error: String(error) });
                    for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_accountSubscribers, "f")) {
                        subscriber.callback(EMPTY_ACCOUNT_STATE);
                    }
                    for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_positionSubscribers, "f")) {
                        subscriber.callback([]);
                    }
                    __classPrivateFieldGet(this, _LighterProvider_emitToOrderSubscribers, "f").call(this, []);
                }
            })(), "f");
            __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
        });
        _LighterProvider_hasAnySubscriber.set(this, () => {
            return (__classPrivateFieldGet(this, _LighterProvider_priceSubscribers, "f").size > 0 ||
                __classPrivateFieldGet(this, _LighterProvider_oiCapSubscribers, "f").size > 0 ||
                __classPrivateFieldGet(this, _LighterProvider_accountSubscribers, "f").size > 0 ||
                __classPrivateFieldGet(this, _LighterProvider_positionSubscribers, "f").size > 0 ||
                __classPrivateFieldGet(this, _LighterProvider_orderSubscribers, "f").size > 0 ||
                __classPrivateFieldGet(this, _LighterProvider_fillSubscribers, "f").size > 0 ||
                [...__classPrivateFieldGet(this, _LighterProvider_orderBookSubscribers, "f").values()].some((subscribers) => subscribers.size > 0) ||
                [...__classPrivateFieldGet(this, _LighterProvider_candleSubscribers, "f").values()].some((subscribers) => subscribers.size > 0));
        });
        _LighterProvider_requestChannel.set(this, (channel, auth) => {
            if (__classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f").has(channel)) {
                return;
            }
            __classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f").set(channel, { auth });
            if (__classPrivateFieldGet(this, _LighterProvider_priceWs, "f") && __classPrivateFieldGet(this, _LighterProvider_priceWs, "f").readyState === 1) {
                __classPrivateFieldGet(this, _LighterProvider_sendSubscribe, "f").call(this, channel, auth);
            }
        });
        _LighterProvider_sendSubscribe.set(this, (channel, auth) => {
            __classPrivateFieldGet(this, _LighterProvider_priceWs, "f")?.send(JSON.stringify(auth
                ? { type: 'subscribe', channel, auth }
                : { type: 'subscribe', channel }));
        });
        _LighterProvider_releaseChannelIfUnused.set(this, () => {
            if (!__classPrivateFieldGet(this, _LighterProvider_hasAnySubscriber, "f").call(this)) {
                __classPrivateFieldGet(this, _LighterProvider_teardownStream, "f").call(this);
            }
        });
        _LighterProvider_ensureStream.set(this, () => {
            if (__classPrivateFieldGet(this, _LighterProvider_priceWs, "f") || __classPrivateFieldGet(this, _LighterProvider_pricePollTimer, "f")) {
                return;
            }
            if (__classPrivateFieldGet(this, _LighterProvider_webSocketCtor, "f")) {
                __classPrivateFieldGet(this, _LighterProvider_connectWs, "f").call(this);
            }
            else {
                __classPrivateFieldGet(this, _LighterProvider_startPricePolling, "f").call(this);
            }
        });
        _LighterProvider_connectWs.set(this, () => {
            if (!__classPrivateFieldGet(this, _LighterProvider_webSocketCtor, "f")) {
                return;
            }
            const url = getLighterWsEndpoint(__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet');
            const WebSocketCtor = __classPrivateFieldGet(this, _LighterProvider_webSocketCtor, "f");
            const ws = new WebSocketCtor(url);
            __classPrivateFieldSet(this, _LighterProvider_priceWs, ws, "f");
            __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, WebSocketConnectionState.Connecting);
            ws.onopen = () => {
                __classPrivateFieldSet(this, _LighterProvider_wsReconnectAttempts, 0, "f");
                __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, WebSocketConnectionState.Connected);
                for (const [channel, meta] of __classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f")) {
                    if (meta.auth) {
                        // Auth tokens are short-lived; a reconnect after the deadline must
                        // re-mint instead of replaying the token captured at subscribe
                        // time. #getAuthToken reuses the cached token while it is fresh.
                        __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this)
                            .then((freshToken) => {
                            __classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f").set(channel, { auth: freshToken });
                            __classPrivateFieldGet(this, _LighterProvider_sendSubscribe, "f").call(this, channel, freshToken);
                            return undefined;
                        })
                            .catch((error) => {
                            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] auth channel resubscribe failed', { channel, error: String(error) });
                        });
                    }
                    else {
                        __classPrivateFieldGet(this, _LighterProvider_sendSubscribe, "f").call(this, channel, meta.auth);
                    }
                }
                // The server closes idle sockets; any frame under 2 minutes keeps it up.
                // Unconditional replacement: `??=` would keep a timer bound to a dead
                // socket when a new one opens before the old socket's onclose fired.
                __classPrivateFieldGet(this, _LighterProvider_clearKeepalive, "f").call(this);
                __classPrivateFieldSet(this, _LighterProvider_wsKeepaliveTimer, setInterval(() => {
                    try {
                        ws.send(JSON.stringify({ type: 'ping' }));
                    }
                    catch {
                        // Socket closing; onclose handles recovery.
                    }
                }, 60000), "f");
                __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] price stream connected (ws)', { url, channels: [...__classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f").keys()] });
            };
            ws.onmessage = (event) => {
                __classPrivateFieldGet(this, _LighterProvider_handleWsMessage, "f").call(this, String(event.data));
            };
            ws.onclose = () => {
                if (__classPrivateFieldGet(this, _LighterProvider_priceWs, "f") !== ws) {
                    return;
                }
                __classPrivateFieldSet(this, _LighterProvider_priceWs, null, "f");
                __classPrivateFieldGet(this, _LighterProvider_clearKeepalive, "f").call(this);
                __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, WebSocketConnectionState.Disconnected);
                if (__classPrivateFieldGet(this, _LighterProvider_hasAnySubscriber, "f").call(this)) {
                    __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] price stream closed; reconnecting in 5s');
                    __classPrivateFieldSet(this, _LighterProvider_wsReconnectAttempts, __classPrivateFieldGet(this, _LighterProvider_wsReconnectAttempts, "f") + 1, "f");
                    __classPrivateFieldSet(this, _LighterProvider_wsReconnectTimer, setTimeout(() => {
                        __classPrivateFieldSet(this, _LighterProvider_wsReconnectTimer, null, "f");
                        __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
                    }, 5000), "f");
                }
            };
            ws.onerror = () => {
                __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] price stream ws error');
            };
        });
        _LighterProvider_handleWsMessage.set(this, (raw) => {
            let message;
            try {
                message = convertKeysToCamelCase(JSON.parse(raw));
            }
            catch (error) {
                __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] price stream message parse failed', { error: String(error) });
                return;
            }
            const type = message.type ?? '';
            if (type.includes('market_stats') && message.marketStats) {
                const timestamp = message.timestamp ?? Date.now();
                const updates = Object.values(message.marketStats).map((stat) => adaptPriceUpdateFromLighterWsStat(stat, timestamp));
                __classPrivateFieldGet(this, _LighterProvider_dispatchPriceUpdates, "f").call(this, updates, 'ws');
                __classPrivateFieldGet(this, _LighterProvider_dispatchOICaps, "f").call(this, Object.values(message.marketStats));
                return;
            }
            if (type.includes('user_stats') && message.stats) {
                const accountState = adaptAccountStateFromLighterUserStats(message.stats);
                for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_accountSubscribers, "f")) {
                    try {
                        subscriber.callback(accountState);
                    }
                    catch (error) {
                        __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'account', error);
                    }
                }
                return;
            }
            if (type.includes('account_all_positions') && message.positions) {
                const isSnapshot = type.startsWith('subscribed');
                if (isSnapshot) {
                    __classPrivateFieldGet(this, _LighterProvider_wsPositions, "f").clear();
                }
                for (const [marketId, position] of Object.entries(message.positions)) {
                    const adapted = adaptPositionFromLighter(position);
                    if (parseFloat(adapted.size) === 0) {
                        __classPrivateFieldGet(this, _LighterProvider_wsPositions, "f").delete(Number(marketId));
                    }
                    else {
                        __classPrivateFieldGet(this, _LighterProvider_wsPositions, "f").set(Number(marketId), adapted);
                    }
                }
                const positions = [...__classPrivateFieldGet(this, _LighterProvider_wsPositions, "f").values()];
                for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_positionSubscribers, "f")) {
                    try {
                        subscriber.callback(positions);
                    }
                    catch (error) {
                        __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'positions', error);
                    }
                }
                return;
            }
            if (type.includes('order_book')) {
                __classPrivateFieldGet(this, _LighterProvider_handleOrderBookMessage, "f").call(this, type, message);
                return;
            }
            if (type.includes('candle')) {
                __classPrivateFieldGet(this, _LighterProvider_handleCandleMessage, "f").call(this, message);
                return;
            }
            if (type.includes('account_all_trades')) {
                __classPrivateFieldGet(this, _LighterProvider_handleTradesMessage, "f").call(this, message);
                return;
            }
            if (type.includes('account_all_orders') && message.orders) {
                const isSnapshot = type.startsWith('subscribed');
                if (isSnapshot) {
                    __classPrivateFieldGet(this, _LighterProvider_wsOrders, "f").clear();
                }
                for (const marketOrders of Object.values(message.orders)) {
                    for (const order of marketOrders) {
                        const adapted = adaptOrderFromLighter(order, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(order.marketIndex)?.symbol ??
                            String(order.marketIndex));
                        const isOpen = adapted.status === 'queued' || adapted.status === 'open';
                        if (isOpen) {
                            __classPrivateFieldGet(this, _LighterProvider_wsOrders, "f").set(adapted.orderId, adapted);
                        }
                        else {
                            __classPrivateFieldGet(this, _LighterProvider_wsOrders, "f").delete(adapted.orderId);
                        }
                    }
                }
                __classPrivateFieldGet(this, _LighterProvider_emitToOrderSubscribers, "f").call(this, [...__classPrivateFieldGet(this, _LighterProvider_wsOrders, "f").values()]);
            }
        });
        /**
         * Apply an order_book snapshot/delta and fan the assembled book out.
         *
         * @param type - Message type (subscribed = full snapshot, update = delta).
         * @param message - Camelized order_book payload.
         */
        _LighterProvider_handleOrderBookMessage.set(this, (type, message) => {
            const channel = message.channel ?? '';
            const marketId = Number(channel.split(':')[1] ?? Number.NaN);
            if (!Number.isFinite(marketId) || !message.orderBook) {
                return;
            }
            let state = __classPrivateFieldGet(this, _LighterProvider_orderBookState, "f").get(marketId);
            if (!state || type.startsWith('subscribed')) {
                state = { bids: new Map(), asks: new Map() };
                __classPrivateFieldGet(this, _LighterProvider_orderBookState, "f").set(marketId, state);
            }
            for (const side of ['bids', 'asks']) {
                for (const level of message.orderBook[side] ?? []) {
                    if (parseFloat(level.size) === 0) {
                        state[side].delete(level.price);
                    }
                    else {
                        state[side].set(level.price, level.size);
                    }
                }
            }
            const subscribers = __classPrivateFieldGet(this, _LighterProvider_orderBookSubscribers, "f").get(marketId);
            if (!subscribers || subscribers.size === 0) {
                return;
            }
            for (const subscriber of subscribers) {
                const levels = subscriber.levels ?? 10;
                const bids = [...state.bids.entries()]
                    .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
                    .slice(0, levels)
                    .map(([price, size]) => ({ price, size }));
                const asks = [...state.asks.entries()]
                    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
                    .slice(0, levels)
                    .map(([price, size]) => ({ price, size }));
                const bestBid = parseFloat(bids[0]?.price ?? '0');
                const bestAsk = parseFloat(asks[0]?.price ?? '0');
                const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0;
                try {
                    subscriber.callback({
                        bids,
                        asks,
                        spread: String(bestAsk - bestBid),
                        spreadPercentage: mid > 0 ? String(((bestAsk - bestBid) / mid) * 100) : '0',
                        midPrice: String(mid),
                    });
                }
                catch (error) {
                    __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'orderBook', error);
                }
            }
        });
        /**
         * Merge live candle updates into the cached series and fan out.
         *
         * @param message - Camelized candle payload.
         */
        _LighterProvider_handleCandleMessage.set(this, (message) => {
            const channel = message.channel ?? '';
            const [, marketIdRaw, resolution] = channel.split(':');
            const key = `${marketIdRaw}:${resolution}`;
            const series = __classPrivateFieldGet(this, _LighterProvider_candleSeries, "f").get(key);
            const subscribers = __classPrivateFieldGet(this, _LighterProvider_candleSubscribers, "f").get(key);
            if (!series || !subscribers || subscribers.size === 0) {
                return;
            }
            for (const candle of message.candles ?? []) {
                series.set(candle.t, {
                    time: candle.t,
                    open: String(candle.o),
                    high: String(candle.h),
                    low: String(candle.l),
                    close: String(candle.c),
                    volume: String(candle.v),
                });
            }
            const candles = [...series.values()].sort((a, b) => a.time - b.time);
            for (const subscriber of subscribers) {
                try {
                    subscriber.callback({
                        symbol: subscriber.symbol,
                        interval: subscriber.interval,
                        candles,
                    });
                }
                catch (error) {
                    __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'candles', error);
                }
            }
        });
        /**
         * Adapt live account trades into OrderFill emissions.
         *
         * @param message - Camelized account_all_trades payload.
         */
        _LighterProvider_handleTradesMessage.set(this, (message) => {
            if (__classPrivateFieldGet(this, _LighterProvider_fillSubscribers, "f").size === 0) {
                return;
            }
            const isSnapshot = (message.type ?? '').startsWith('subscribed');
            const fills = [];
            for (const marketTrades of Object.values(message.trades ?? {})) {
                for (const trade of marketTrades) {
                    const symbol = __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(trade.marketId)?.symbol ??
                        String(trade.marketId);
                    const accountIsAsk = trade.askAccountId === __classPrivateFieldGet(this, _LighterProvider_accountIndex, "f");
                    fills.push({
                        orderId: String(accountIsAsk ? trade.askId : trade.bidId),
                        symbol,
                        side: accountIsAsk ? 'sell' : 'buy',
                        size: trade.size,
                        price: trade.price,
                        pnl: '0',
                        direction: accountIsAsk ? 'sell' : 'buy',
                        fee: '0',
                        feeToken: 'USDC',
                        timestamp: trade.timestamp,
                    });
                }
            }
            if (fills.length === 0 && !isSnapshot) {
                return;
            }
            for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_fillSubscribers, "f")) {
                try {
                    subscriber.callback(fills, isSnapshot);
                }
                catch (error) {
                    __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'fills', error);
                }
            }
        });
        _LighterProvider_dispatchOICaps.set(this, (stats) => {
            if (__classPrivateFieldGet(this, _LighterProvider_oiCapSubscribers, "f").size === 0) {
                return;
            }
            const capped = stats
                .filter((stat) => {
                const openInterest = parseFloat(stat.openInterest ?? '0');
                const limit = parseFloat(stat.openInterestLimit ?? '0');
                return limit > 0 && openInterest >= limit;
            })
                .map((stat) => stat.symbol);
            for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_oiCapSubscribers, "f")) {
                try {
                    subscriber.callback(capped);
                }
                catch (error) {
                    __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'oiCaps', error);
                }
            }
        });
        _LighterProvider_emitToOrderSubscribers.set(this, (orders) => {
            for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_orderSubscribers, "f")) {
                try {
                    subscriber.callback(orders);
                }
                catch (error) {
                    __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'orders', error);
                }
            }
        });
        _LighterProvider_logSubscriberError.set(this, (channel, error) => {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log(`[LighterProvider] ${channel} subscriber callback failed`, { error: String(error) });
        });
        _LighterProvider_startPricePolling.set(this, () => {
            if (__classPrivateFieldGet(this, _LighterProvider_pricePollTimer, "f")) {
                return;
            }
            const poll = () => {
                __classPrivateFieldGet(this, _LighterProvider_emitPolledPrices, "f").call(this).catch((error) => {
                    __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] price poll failed', {
                        error: String(error),
                    });
                });
            };
            poll();
            __classPrivateFieldSet(this, _LighterProvider_pricePollTimer, setInterval(poll, LIGHTER_PRICE_POLLING_INTERVAL_MS), "f");
        });
        /**
         * REST fallback: fetch market stats once and fan them out.
         */
        _LighterProvider_emitPolledPrices.set(this, async () => {
            if (__classPrivateFieldGet(this, _LighterProvider_priceSubscribers, "f").size === 0) {
                return;
            }
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBookDetails();
            const timestamp = Date.now();
            const updates = (response.orderBookDetails ?? []).map((detail) => adaptPriceUpdateFromLighter(detail, timestamp));
            __classPrivateFieldGet(this, _LighterProvider_dispatchPriceUpdates, "f").call(this, updates, 'poll');
        });
        /**
         * Fan price updates out to every subscriber, honoring symbol filters.
         *
         * @param updates - Adapted price updates for this cycle.
         * @param transport - Which transport produced the cycle (ws or poll).
         */
        _LighterProvider_dispatchPriceUpdates.set(this, (updates, transport) => {
            if (updates.length === 0) {
                return;
            }
            for (const update of updates) {
                __classPrivateFieldGet(this, _LighterProvider_lastPriceBySymbol, "f").set(update.symbol, update);
            }
            __classPrivateFieldSet(this, _LighterProvider_pricePollCycle, __classPrivateFieldGet(this, _LighterProvider_pricePollCycle, "f") + 1, "f");
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log(`[LighterProvider] price stream cycle=${__classPrivateFieldGet(this, _LighterProvider_pricePollCycle, "f")} transport=${transport} updates=${updates.length}`);
            for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_priceSubscribers, "f")) {
                __classPrivateFieldGet(this, _LighterProvider_deliverPrices, "f").call(this, subscriber, updates);
            }
        });
        _LighterProvider_deliverPrices.set(this, (subscriber, updates) => {
            const filtered = subscriber.symbols.length > 0
                ? updates.filter((update) => subscriber.symbols.includes(update.symbol))
                : updates;
            if (filtered.length === 0) {
                return;
            }
            try {
                subscriber.callback(filtered);
            }
            catch (error) {
                __classPrivateFieldGet(this, _LighterProvider_logSubscriberError, "f").call(this, 'prices', error);
            }
        });
        _LighterProvider_clearKeepalive.set(this, () => {
            if (__classPrivateFieldGet(this, _LighterProvider_wsKeepaliveTimer, "f")) {
                clearInterval(__classPrivateFieldGet(this, _LighterProvider_wsKeepaliveTimer, "f"));
                __classPrivateFieldSet(this, _LighterProvider_wsKeepaliveTimer, null, "f");
            }
        });
        _LighterProvider_teardownStream.set(this, () => {
            if (__classPrivateFieldGet(this, _LighterProvider_pricePollTimer, "f")) {
                clearInterval(__classPrivateFieldGet(this, _LighterProvider_pricePollTimer, "f"));
                __classPrivateFieldSet(this, _LighterProvider_pricePollTimer, null, "f");
            }
            if (__classPrivateFieldGet(this, _LighterProvider_wsReconnectTimer, "f")) {
                clearTimeout(__classPrivateFieldGet(this, _LighterProvider_wsReconnectTimer, "f"));
                __classPrivateFieldSet(this, _LighterProvider_wsReconnectTimer, null, "f");
            }
            __classPrivateFieldGet(this, _LighterProvider_clearKeepalive, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f").clear();
            __classPrivateFieldSet(this, _LighterProvider_accountChannelsPromise, null, "f");
            __classPrivateFieldGet(this, _LighterProvider_wsPositions, "f").clear();
            __classPrivateFieldGet(this, _LighterProvider_wsOrders, "f").clear();
            __classPrivateFieldGet(this, _LighterProvider_orderBookState, "f").clear();
            __classPrivateFieldGet(this, _LighterProvider_candleSeries, "f").clear();
            __classPrivateFieldGet(this, _LighterProvider_lastPriceBySymbol, "f").clear();
            if (__classPrivateFieldGet(this, _LighterProvider_priceWs, "f")) {
                const ws = __classPrivateFieldGet(this, _LighterProvider_priceWs, "f");
                __classPrivateFieldSet(this, _LighterProvider_priceWs, null, "f");
                try {
                    ws.close();
                }
                catch {
                    // Socket may already be closed.
                }
            }
            __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, WebSocketConnectionState.Disconnected);
        });
        this.fetchHistoricalCandles = async (options) => {
            const empty = {
                symbol: options.symbol,
                interval: options.interval,
                candles: [],
            };
            try {
                const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
                const market = markets.get(options.symbol);
                if (!market) {
                    return empty;
                }
                const resolution = LIGHTER_SUPPORTED_RESOLUTIONS.has(options.interval)
                    ? options.interval
                    : '15m';
                const intervalMs = LIGHTER_RESOLUTION_MS[resolution] ?? LIGHTER_RESOLUTION_MS['15m'];
                const limit = options.limit ?? 120;
                const endTimestamp = options.endTime ?? Date.now();
                const startTimestamp = endTimestamp - intervalMs * limit;
                const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getCandles(market.marketId, resolution, startTimestamp, endTimestamp, limit);
                return {
                    symbol: options.symbol,
                    interval: options.interval,
                    candles: (response.c ?? []).map((candle) => ({
                        time: candle.t,
                        open: String(candle.o),
                        high: String(candle.h),
                        low: String(candle.l),
                        close: String(candle.c),
                        volume: String(candle.v),
                    })),
                };
            }
            catch (error) {
                __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] fetchHistoricalCandles failed', { error: String(error) });
                return empty;
            }
        };
        // ============================================================================
        // Asset Routes
        // ============================================================================
        /**
         * The venue's USDC bridge route for the active network, in AssetRoute
         * shape. Facts sourced live from `layer1BasicInfo` + venue docs (see
         * LIGHTER_BRIDGE_CONFIG).
         *
         * @param minAmount - Which venue minimum applies (deposit vs withdrawal).
         * @returns Single-element route list.
         */
        _LighterProvider_bridgeRoute.set(this, (minAmount) => {
            const bridge = LIGHTER_BRIDGE_CONFIG[__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'];
            return [
                {
                    assetId: `${bridge.chainId}/erc20:${bridge.usdcContract}/default`,
                    chainId: bridge.chainId,
                    contractAddress: bridge.bridgeContract,
                    constraints: { minAmount },
                },
            ];
        });
        __classPrivateFieldSet(this, _LighterProvider_deps, options.platformDependencies, "f");
        __classPrivateFieldSet(this, _LighterProvider_isTestnet, options.isTestnet ?? true, "f");
        __classPrivateFieldSet(this, _LighterProvider_messenger, options.messenger ?? null, "f");
        __classPrivateFieldSet(this, _LighterProvider_signerBridge, options.signerBridge ?? null, "f");
        // Learn about bridge resets proactively (e.g. the mobile WebView
        // reloading) instead of from the next failed trading call.
        __classPrivateFieldGet(this, _LighterProvider_signerBridge, "f")?.onReset?.(() => __classPrivateFieldGet(this, _LighterProvider_invalidateSignerSession, "f").call(this));
        const globalWebSocket = Reflect.get(globalThis, 'WebSocket');
        const defaultWebSocketCtor = typeof globalWebSocket === 'function' ? globalWebSocket : null;
        __classPrivateFieldSet(this, _LighterProvider_webSocketCtor, options.webSocketCtor === undefined
            ? defaultWebSocketCtor
            : options.webSocketCtor, "f");
        __classPrivateFieldSet(this, _LighterProvider_apiKeyIndex, options.lighterAuthConfig?.apiKeyIndex ?? LIGHTER_DEFAULT_API_KEY_INDEX, "f");
        __classPrivateFieldSet(this, _LighterProvider_configuredAccountIndex, options.lighterAuthConfig?.accountIndex, "f");
        __classPrivateFieldSet(this, _LighterProvider_clientService, new LighterClientService(__classPrivateFieldGet(this, _LighterProvider_deps, "f"), {
            isTestnet: __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f"),
        }), "f");
        __classPrivateFieldSet(this, _LighterProvider_walletService, new LighterWalletService(__classPrivateFieldGet(this, _LighterProvider_deps, "f"), {
            isTestnet: __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f"),
            messenger: options.messenger,
            personalSigner: options.lighterAuthConfig?.personalSigner,
            l1Address: options.lighterAuthConfig?.l1Address,
        }), "f");
        __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] Constructor complete', {
            protocolId: this.protocolId,
            isTestnet: __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f"),
            hasMessenger: Boolean(__classPrivateFieldGet(this, _LighterProvider_messenger, "f")),
            hasSignerBridge: Boolean(__classPrivateFieldGet(this, _LighterProvider_signerBridge, "f")),
            apiKeyIndex: __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"),
        });
    }
    // ============================================================================
    // Initialization & Lifecycle
    // ============================================================================
    async initialize() {
        try {
            const markets = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBooks(true);
            __classPrivateFieldSet(this, _LighterProvider_marketsBySymbol, new Map(markets.map((market) => [market.symbol, market])), "f");
            __classPrivateFieldSet(this, _LighterProvider_marketsById, new Map(markets.map((market) => [market.marketId, market])), "f");
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] Initialized', {
                markets: markets.length,
            });
            return { success: true };
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.initialize');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] initialize failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'initialize'),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    async disconnect() {
        __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, null, "f");
        __classPrivateFieldSet(this, _LighterProvider_authToken, null, "f");
        __classPrivateFieldGet(this, _LighterProvider_teardownStream, "f").call(this);
        __classPrivateFieldGet(this, _LighterProvider_priceSubscribers, "f").clear();
        __classPrivateFieldGet(this, _LighterProvider_oiCapSubscribers, "f").clear();
        __classPrivateFieldGet(this, _LighterProvider_accountSubscribers, "f").clear();
        __classPrivateFieldGet(this, _LighterProvider_positionSubscribers, "f").clear();
        __classPrivateFieldGet(this, _LighterProvider_orderSubscribers, "f").clear();
        __classPrivateFieldGet(this, _LighterProvider_fillSubscribers, "f").clear();
        __classPrivateFieldGet(this, _LighterProvider_orderBookSubscribers, "f").clear();
        __classPrivateFieldGet(this, _LighterProvider_candleSubscribers, "f").clear();
        return { success: true };
    }
    async ping(_timeoutMs) {
        await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBooks();
    }
    async toggleTestnet() {
        // Network is fixed at construction, mirroring MYXProvider.
        return {
            success: false,
            isTestnet: __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f"),
            error: 'Lighter network is fixed at construction',
        };
    }
    async isReadyToTrade() {
        try {
            if (!__classPrivateFieldGet(this, _LighterProvider_signerBridge, "f")) {
                return {
                    ready: false,
                    error: LIGHTER_SIGNER_UNAVAILABLE_ERROR,
                    walletConnected: false,
                    networkSupported: true,
                };
            }
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            return {
                ready: true,
                walletConnected: true,
                networkSupported: true,
                authenticatedAddress: __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress(),
            };
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.isReadyToTrade');
            return {
                ready: false,
                error: wrappedError.message,
                walletConnected: false,
                networkSupported: true,
            };
        }
    }
    // ============================================================================
    // Market Data Operations (Public Reads)
    // ============================================================================
    async getMarkets(_params) {
        try {
            const markets = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBooks();
            // Best effort: per-market max leverage from the venue's margin
            // fractions; the adapter's constant only stands in when unknown.
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarketMargins, "f").call(this).catch(() => undefined);
            return markets
                .filter((market) => market.marketType === 'perp')
                .map((market) => {
                const adapted = adaptMarketFromLighter(market);
                const minInitial = __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").get(market.symbol)?.minInitial;
                if (minInitial && minInitial > 0) {
                    adapted.maxLeverage = Math.floor(10000 / minInitial);
                }
                return adapted;
            });
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.getMarkets');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getMarkets failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getMarkets'),
            });
            return [];
        }
    }
    async getMarketDataWithPrices() {
        try {
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBookDetails();
            return response.orderBookDetails
                .filter((detail) => detail.marketType === 'perp')
                .map((detail) => adaptMarketDataFromLighter(detail, __classPrivateFieldGet(this, _LighterProvider_deps, "f").marketDataFormatters));
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.getMarketDataWithPrices');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getMarketDataWithPrices failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getMarketDataWithPrices'),
            });
            return [];
        }
    }
    // ============================================================================
    // Account Operations
    // ============================================================================
    async getPositions(_params) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getAccountByIndex(accountIndex);
            const account = response.accounts[0];
            if (!account?.positions) {
                return [];
            }
            return account.positions
                .filter((position) => parseFloat(position.position) !== 0)
                .map(adaptPositionFromLighter);
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.getPositions');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getPositions failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getPositions'),
            });
            return [];
        }
    }
    async getAccountState(_params) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getAccountByIndex(accountIndex);
            const account = response.accounts[0];
            if (!account) {
                return EMPTY_ACCOUNT_STATE;
            }
            return adaptAccountStateFromLighter(account);
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.getAccountState');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getAccountState failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getAccountState'),
            });
            return EMPTY_ACCOUNT_STATE;
        }
    }
    async getOpenOrders(_params) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const authToken = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getActiveOrders(accountIndex, authToken);
            return response.orders.map((order) => adaptOrderFromLighter(order, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(order.marketIndex)?.symbol ??
                String(order.marketIndex)));
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.getOpenOrders');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getOpenOrders failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getOpenOrders'),
            });
            return [];
        }
    }
    async getOrders(params, _options) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const authToken = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getInactiveOrders(accountIndex, authToken);
            const historical = (response.orders ?? []).map((order) => adaptOrderFromLighter(order, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(order.marketIndex)?.symbol ??
                String(order.marketIndex)));
            // Full lifecycle: open orders first, then the historical states.
            const open = await this.getOpenOrders(params);
            return [...open, ...historical];
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.getOrders');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getOrders failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getOrders'),
            });
            return [];
        }
    }
    async getCurrentAccountId() {
        const address = __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress();
        const chainId = getLighterChainId(__classPrivateFieldGet(this, _LighterProvider_clientService, "f").network);
        return `eip155:${chainId}:${address}`;
    }
    async placeOrder(params) {
        try {
            if (params.orderType !== 'limit' && params.orderType !== 'market') {
                return { success: false, error: LIGHTER_NOT_SUPPORTED_ERROR };
            }
            // User intent is never silently dropped: fields this venue path does
            // not execute are rejected so the caller can adapt, not surprised.
            if (params.takeProfitPrice || params.stopLossPrice) {
                return {
                    success: false,
                    error: 'Lighter does not support TP/SL attached at placement; place the order, then call updatePositionTPSL',
                };
            }
            if (params.timeInForce === 'ALO') {
                return {
                    success: false,
                    error: 'Lighter placement does not support post-only (ALO) yet',
                };
            }
            // Bind the write to the wallet account it was INITIATED under; if the
            // wallet switches before the queued critical section runs, it aborts.
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const market = markets.get(params.symbol);
            if (!market) {
                return {
                    success: false,
                    error: `Unknown Lighter market: ${params.symbol}`,
                };
            }
            if (params.orderType === 'limit' && !params.price) {
                return { success: false, error: 'Limit order requires a price' };
            }
            // Slippage tolerance: caller basis points win, then the deprecated
            // decimal field, then the venue-conventional 5%.
            const slippageFraction = params.maxSlippageBps === undefined
                ? (params.slippage ?? 0.05)
                : params.maxSlippageBps / 10000;
            // The reference price sizes the order; market orders additionally get
            // a protection price offset by the slippage tolerance. They are kept
            // separate so usdAmount sizing is never distorted by the protection
            // offset.
            let referencePrice = parseFloat(params.price ?? String(params.currentPrice ?? 0));
            let executionPrice = referencePrice;
            if (params.orderType === 'market') {
                // Always resolve a FRESH venue price: the caller's currentPrice is
                // the same snapshot as priceAtCalculation, and a drift check that
                // compares a snapshot to itself would never fire.
                const details = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBookDetails();
                const freshPrice = details.orderBookDetails.find((entry) => entry.symbol === params.symbol)?.lastTradePrice ?? 0;
                if (freshPrice > 0) {
                    referencePrice = freshPrice;
                }
                // Honor the caller's sizing snapshot: refuse instead of executing
                // at a live price that drifted past their slippage tolerance.
                if (params.priceAtCalculation !== undefined &&
                    params.priceAtCalculation > 0 &&
                    referencePrice > 0 &&
                    Math.abs(referencePrice - params.priceAtCalculation) /
                        params.priceAtCalculation >
                        slippageFraction) {
                    return {
                        success: false,
                        error: `Price moved beyond the ${(slippageFraction * 100).toFixed(2)}% slippage tolerance since sizing`,
                    };
                }
                executionPrice = params.isBuy
                    ? referencePrice * (1 + slippageFraction)
                    : referencePrice * (1 - slippageFraction);
            }
            if (!(referencePrice > 0) || !(executionPrice > 0)) {
                return {
                    success: false,
                    error: 'Unable to resolve an execution price for the order',
                };
            }
            // USD is the source of truth when provided (hybrid sizing contract),
            // converted at the reference price — not the protection price.
            const requestedSize = params.usdAmount !== undefined && parseFloat(params.usdAmount) > 0
                ? parseFloat(params.usdAmount) / referencePrice
                : parseFloat(params.size);
            if (!(requestedSize > 0)) {
                return { success: false, error: 'Order size must be positive' };
            }
            const minSize = computeLighterMinOrderSize(market, referencePrice);
            if (requestedSize < minSize) {
                // Only a LIVE-VERIFIED full close may be bumped to the venue
                // minimum: reduce-only execution clamps to the position, so no
                // extra exposure results and dust positions stay closable. The
                // isFullClose flag is a hint, never trusted — a partial close
                // bumped to the minimum would close more than the caller asked.
                let verifiedFullClose = false;
                if (params.reduceOnly) {
                    const positions = await this.getPositions();
                    const held = Math.abs(parseFloat(positions.find((entry) => entry.symbol === params.symbol)?.size ??
                        '0'));
                    verifiedFullClose = held > 0 && requestedSize >= held * 0.99;
                }
                if (!verifiedFullClose) {
                    return {
                        success: false,
                        error: `Order size ${requestedSize} is below the Lighter minimum of ${minSize} ${params.symbol}`,
                    };
                }
            }
            const size = Math.max(requestedSize, minSize);
            const leverageImfHundredths = await __classPrivateFieldGet(this, _LighterProvider_resolveLeverageIntent, "f").call(this, params);
            const priceInt = toLighterInteger(executionPrice, market.supportedPriceDecimals);
            const sizeInt = toLighterInteger(size, market.supportedSizeDecimals);
            const clientOrderIndex = Date.now() % 1000000000;
            // Leverage update and order placement share ONE lock acquisition so a
            // concurrent write can never interleave between the caller's leverage
            // intent and the order that depends on it.
            const result = await __classPrivateFieldGet(this, _LighterProvider_withVenueWriteLock, "f").call(this, accountIndex, async (nextNonce) => {
                if (leverageImfHundredths !== null) {
                    const signedLeverage = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                        function: '_signUpdateLeverage',
                        params: [
                            accountIndex,
                            market.marketId,
                            leverageImfHundredths,
                            LIGHTER_MARGIN_MODE_CROSS,
                            await nextNonce(),
                        ],
                    });
                    if (signedLeverage.error) {
                        throw new Error(`Lighter leverage update failed: ${signedLeverage.error}`);
                    }
                    await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").sendTx(LIGHTER_TX_TYPE_UPDATE_LEVERAGE, signedLeverage.txInfo);
                }
                const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signCreateOrder',
                    params: [
                        accountIndex,
                        market.marketId,
                        clientOrderIndex,
                        String(sizeInt),
                        String(priceInt),
                        params.isBuy ? 0 : 1,
                        params.orderType === 'limit'
                            ? LIGHTER_ORDER_TYPE_LIMIT
                            : LIGHTER_ORDER_TYPE_MARKET,
                        params.orderType === 'limit' && params.timeInForce !== 'IOC'
                            ? LIGHTER_TIME_IN_FORCE_GOOD_TILL_TIME
                            : LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
                        params.reduceOnly ? 1 : 0,
                        String(LIGHTER_NO_TRIGGER_PRICE),
                        // GTT orders auto-expire in 28 days (signer sentinel -1);
                        // IOC orders must carry a zero expiry.
                        params.orderType === 'limit' && params.timeInForce !== 'IOC'
                            ? LIGHTER_ORDER_EXPIRY_NONE
                            : 0,
                        await nextNonce(),
                    ],
                });
                if (signed.error) {
                    throw new Error(`Lighter order signing failed: ${signed.error}`);
                }
                return await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").sendTx(LIGHTER_TX_TYPE_CREATE_ORDER, signed.txInfo);
            }, generationAtIntent);
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] Order placed', {
                symbol: params.symbol,
                clientOrderIndex,
                txHash: result.txHash,
            });
            return {
                success: true,
                orderId: String(clientOrderIndex),
                submittedSize: String(size),
                providerId: 'lighter',
            };
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.placeOrder');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] placeOrder failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'placeOrder', { symbol: params.symbol }),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    async cancelOrder(params) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const market = markets.get(params.symbol);
            if (!market) {
                return {
                    success: false,
                    error: `Unknown Lighter market: ${params.symbol}`,
                };
            }
            await __classPrivateFieldGet(this, _LighterProvider_withVenueNonce, "f").call(this, accountIndex, async (nonce) => {
                const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signCancelOrder',
                    params: [accountIndex, market.marketId, params.orderId, nonce],
                });
                if (signed.error) {
                    throw new Error(`Lighter cancel signing failed: ${signed.error}`);
                }
                return await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").sendTx(LIGHTER_TX_TYPE_CANCEL_ORDER, signed.txInfo);
            }, generationAtIntent);
            return {
                success: true,
                orderId: params.orderId,
                providerId: 'lighter',
            };
        }
        catch (caughtError) {
            const wrappedError = ensureError(caughtError, 'LighterProvider.cancelOrder');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] cancelOrder failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'cancelOrder', { symbol: params.symbol }),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    // ============================================================================
    // Trading Operations (POC: stubbed)
    // ============================================================================
    async editOrder(_params) {
        // ModifyOrder (tx 17) is accepted by the venue's sendTx but the resting
        // order keeps its original price — an execution no-op we have raised
        // with Lighter. Reporting success here would misrepresent user intent,
        // so the operation refuses until the venue behavior is resolved.
        // Callers can cancel + re-place instead.
        return {
            success: false,
            error: 'Lighter order editing is unavailable: the venue currently accepts but does not apply ModifyOrder. Cancel and re-place the order instead.',
        };
    }
    async closePosition(params) {
        try {
            const positions = await this.getPositions();
            const position = positions.find((entry) => entry.symbol === params.symbol);
            if (!position) {
                return {
                    success: false,
                    error: `No open Lighter position for ${params.symbol}`,
                };
            }
            const signedSize = parseFloat(position.size);
            const closeSize = params.size ?? String(Math.abs(signedSize));
            // Reduce-only market order on the opposite side flattens the position.
            return await this.placeOrder({
                symbol: params.symbol,
                isBuy: signedSize < 0,
                size: closeSize,
                orderType: 'market',
                reduceOnly: true,
                // A full close must never be rejected by the minimum-notional check
                // even when the residual position is dust.
                isFullClose: params.size === undefined,
                currentPrice: params.currentPrice,
            });
        }
        catch (error) {
            const wrappedError = ensureError(error, 'LighterProvider.closePosition');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] closePosition failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'closePosition'),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    async updatePositionTPSL(params) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const market = markets.get(params.symbol);
            if (!market) {
                return {
                    success: false,
                    error: `Unknown Lighter market: ${params.symbol}`,
                };
            }
            const positions = await this.getPositions();
            const position = positions.find((entry) => entry.symbol === params.symbol);
            if (!position) {
                return {
                    success: false,
                    error: `No open Lighter position for ${params.symbol}`,
                };
            }
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            // Replace semantics: drop existing reduce-only trigger orders first.
            const openOrders = await this.getOpenOrders();
            for (const order of openOrders) {
                if (order.symbol === params.symbol &&
                    order.reduceOnly &&
                    (Boolean(order.orderType?.includes('stop')) ||
                        Boolean(order.orderType?.includes('take')) ||
                        order.isTrigger === true)) {
                    await this.cancelOrder({
                        orderId: order.orderId,
                        symbol: params.symbol,
                    });
                }
            }
            if (!params.takeProfitPrice && !params.stopLossPrice) {
                return { success: true };
            }
            const signedSize = parseFloat(position.size);
            const isLong = signedSize > 0;
            const coverSize = Math.abs(signedSize);
            const sizeInt = toLighterInteger(coverSize, market.supportedSizeDecimals);
            // Closing side is opposite the position; trigger market orders execute
            // at a protection price 5% beyond the trigger in the taker direction.
            const isAsk = isLong ? 1 : 0;
            const buildOrder = (orderType, triggerPriceRaw, clientOrderIndex) => {
                const trigger = parseFloat(triggerPriceRaw);
                const execution = isLong ? trigger * 0.95 : trigger * 1.05;
                return [
                    market.marketId,
                    clientOrderIndex,
                    String(sizeInt),
                    String(toLighterInteger(execution, market.supportedPriceDecimals)),
                    isAsk,
                    orderType,
                    LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
                    1,
                    String(toLighterInteger(trigger, market.supportedPriceDecimals)),
                    // Trigger orders rest until fired: use the 28-day default expiry.
                    LIGHTER_ORDER_EXPIRY_NONE,
                ];
            };
            const clientBase = Date.now() % 1000000000;
            const grouped = [];
            let orderCount = 0;
            if (params.takeProfitPrice) {
                grouped.push(...buildOrder(LIGHTER_ORDER_TYPE_TAKE_PROFIT, params.takeProfitPrice, clientBase + 1));
                orderCount += 1;
            }
            if (params.stopLossPrice) {
                grouped.push(...buildOrder(LIGHTER_ORDER_TYPE_STOP_LOSS, params.stopLossPrice, clientBase + 2));
                orderCount += 1;
            }
            const groupingType = orderCount === 2 ? LIGHTER_GROUPING_ONE_CANCELS_THE_OTHER : 0;
            await __classPrivateFieldGet(this, _LighterProvider_withVenueNonce, "f").call(this, accountIndex, async (nonce) => {
                const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signCreateGroupedOrders',
                    params: [
                        accountIndex,
                        groupingType,
                        orderCount,
                        ...grouped,
                        nonce,
                    ],
                });
                if (signed.error) {
                    throw new Error(signed.error);
                }
                return await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").sendTx(LIGHTER_TX_TYPE_CREATE_GROUPED_ORDERS, signed.txInfo);
            }, generationAtIntent);
            return { success: true };
        }
        catch (error) {
            const wrappedError = ensureError(error, 'LighterProvider.updatePositionTPSL');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] updatePositionTPSL failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'updatePositionTPSL'),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    async updateMargin(params) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const market = markets.get(params.symbol);
            if (!market) {
                return {
                    success: false,
                    error: `Unknown Lighter market: ${params.symbol}`,
                };
            }
            const amount = parseFloat(params.amount);
            if (!Number.isFinite(amount) || amount === 0) {
                return {
                    success: false,
                    error: 'updateMargin requires a non-zero amount',
                };
            }
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            // USDC uses 6 decimals; direction 1 adds isolated margin, 0 removes it
            // (types/txtypes/constants.go: RemoveFromIsolatedMargin=0, Add=1).
            await __classPrivateFieldGet(this, _LighterProvider_withVenueNonce, "f").call(this, accountIndex, async (nonce) => {
                const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signUpdateMargin',
                    params: [
                        accountIndex,
                        market.marketId,
                        Math.round(Math.abs(amount) * 1000000),
                        amount > 0 ? 1 : 0,
                        nonce,
                    ],
                });
                if (signed.error) {
                    throw new Error(signed.error);
                }
                return await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").sendTx(LIGHTER_TX_TYPE_UPDATE_MARGIN, signed.txInfo);
            }, generationAtIntent);
            return { success: true };
        }
        catch (error) {
            const wrappedError = ensureError(error, 'LighterProvider.updateMargin');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] updateMargin failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'updateMargin'),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    async withdraw(params) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const amount = parseFloat(params.amount);
            if (!(amount > 0)) {
                return { success: false, error: 'withdraw requires a positive amount' };
            }
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            // USDC uses 6 decimals on zkLighter.
            const assetAmount = String(Math.round(amount * 1000000));
            const result = await __classPrivateFieldGet(this, _LighterProvider_withVenueNonce, "f").call(this, accountIndex, async (nonce) => {
                const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signWithdraw',
                    params: [
                        accountIndex,
                        LIGHTER_USDC_ASSET_INDEX,
                        0,
                        assetAmount,
                        nonce,
                    ],
                });
                if (signed.error) {
                    throw new Error(signed.error);
                }
                return await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").sendTx(LIGHTER_TX_TYPE_WITHDRAW, signed.txInfo);
            }, generationAtIntent);
            return { success: true, txHash: result.txHash };
        }
        catch (error) {
            const wrappedError = ensureError(error, 'LighterProvider.withdraw');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] withdraw failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'withdraw'),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    // ============================================================================
    // History Operations (POC: stubbed)
    // ============================================================================
    async getOrderFills(params, _options) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const token = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getTrades(accountIndex, token, params?.limit ?? 50);
            return (response.trades ?? []).map((trade) => adaptFillFromLighterTrade(trade, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(trade.marketId)?.symbol ??
                String(trade.marketId), accountIndex));
        }
        catch (error) {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getOrderFills failed', {
                error: String(error),
            });
            return [];
        }
    }
    async getOrFetchFills(params) {
        return await this.getOrderFills(params);
    }
    async getHistoricalPortfolio(_params) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const token = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            const now = Date.now();
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getPnl(accountIndex, token, now - 2 * 24 * 60 * 60 * 1000, now, 2);
            const dayAgo = now - 24 * 60 * 60 * 1000;
            // The venue reports flows per bucket, not account value; reconstruct
            // the value a day ago from the current balance minus the last day's
            // trading pnl and net transfers.
            const lastDayDelta = (response.pnl ?? [])
                .filter((bucket) => bucket.timestamp >= dayAgo)
                .reduce((sum, bucket) => sum + bucket.tradePnl + bucket.inflow - bucket.outflow, 0);
            const accountState = await this.getAccountState();
            const currentValue = parseFloat(accountState.totalBalance || '0');
            return {
                accountValue1dAgo: String(currentValue - lastDayDelta),
                timestamp: now,
            };
        }
        catch (error) {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getHistoricalPortfolio failed', { error: String(error) });
            return { accountValue1dAgo: '0', timestamp: Date.now() };
        }
    }
    async getFunding(_params, _options) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const token = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getPositionFundings(accountIndex, token);
            return (response.positionFundings ?? []).map((entry) => ({
                symbol: __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(entry.marketId)?.symbol ??
                    String(entry.marketId),
                // `change` is the signed USDC funding flow for the account's side.
                amountUsd: entry.change,
                rate: entry.rate,
                timestamp: entry.timestamp * 1000,
            }));
        }
        catch (error) {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getFunding failed', {
                error: String(error),
            });
            return [];
        }
    }
    async getUserNonFundingLedgerUpdates(params) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const authToken = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            const l1Address = __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress();
            const [deposits, withdraws, transfers] = await Promise.all([
                __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getDepositHistory(accountIndex, l1Address, authToken),
                __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getWithdrawHistory(accountIndex, authToken),
                __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getTransferHistory(accountIndex, authToken),
            ]);
            const updates = [
                ...(deposits.deposits ?? []).map((entry) => ({
                    hash: entry.l1TxHash,
                    time: entry.timestamp,
                    delta: { type: 'deposit', usdc: entry.amount },
                })),
                ...(withdraws.withdraws ?? []).map((entry) => ({
                    hash: entry.l1TxHash,
                    time: entry.timestamp,
                    delta: { type: 'withdraw', usdc: `-${entry.amount}` },
                })),
                ...(transfers.transfers ?? []).map((entry) => ({
                    hash: entry.txHash,
                    time: entry.timestamp,
                    delta: {
                        // Venue types are L2TransferInflow / L2TransferOutflow.
                        type: entry.type.includes('Outflow') ? 'transferOut' : 'transferIn',
                        usdc: entry.type.includes('Outflow')
                            ? `-${entry.amount}`
                            : entry.amount,
                    },
                })),
            ].sort((first, second) => second.time - first.time);
            const { startTime, endTime } = params ?? {};
            return updates.filter((update) => (startTime === undefined || update.time >= startTime) &&
                (endTime === undefined || update.time <= endTime));
        }
        catch (error) {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getUserNonFundingLedgerUpdates failed', { error: String(error) });
            return [];
        }
    }
    async getUserHistory(params) {
        try {
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const authToken = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            const l1Address = __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress();
            const [deposits, withdraws] = await Promise.all([
                __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getDepositHistory(accountIndex, l1Address, authToken),
                __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getWithdrawHistory(accountIndex, authToken),
            ]);
            const toStatus = (venueStatus) => {
                if (venueStatus === 'completed') {
                    return 'completed';
                }
                return venueStatus === 'failed' ? 'failed' : 'pending';
            };
            const items = [
                ...(deposits.deposits ?? []).map((entry) => ({
                    id: `deposit-${entry.id}`,
                    timestamp: entry.timestamp,
                    type: 'deposit',
                    amount: entry.amount,
                    asset: 'USDC',
                    txHash: entry.l1TxHash,
                    status: toStatus(entry.status),
                    details: { source: 'lighter' },
                })),
                ...(withdraws.withdraws ?? []).map((entry) => ({
                    id: `withdrawal-${entry.id}`,
                    timestamp: entry.timestamp,
                    type: 'withdrawal',
                    amount: entry.amount,
                    asset: 'USDC',
                    txHash: entry.l1TxHash,
                    status: toStatus(entry.status),
                    details: { source: 'lighter' },
                })),
            ].sort((first, second) => second.timestamp - first.timestamp);
            const { startTime, endTime } = params ?? {};
            return items.filter((item) => (startTime === undefined || item.timestamp >= startTime) &&
                (endTime === undefined || item.timestamp <= endTime));
        }
        catch (error) {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getUserHistory failed', {
                error: String(error),
            });
            return [];
        }
    }
    // ============================================================================
    // Validation (POC: minimal)
    // ============================================================================
    async validateDeposit(_params) {
        return { isValid: false, error: LIGHTER_NOT_SUPPORTED_ERROR };
    }
    async validateOrder(params) {
        // Mirrors placeOrder's own rejections so validation never approves an
        // order shape the placement path would refuse.
        if (params.orderType !== 'limit' && params.orderType !== 'market') {
            return { isValid: false, error: LIGHTER_NOT_SUPPORTED_ERROR };
        }
        if (params.takeProfitPrice || params.stopLossPrice) {
            return {
                isValid: false,
                error: 'Lighter does not support TP/SL attached at placement; place the order, then call updatePositionTPSL',
            };
        }
        if (params.timeInForce === 'ALO') {
            return {
                isValid: false,
                error: 'Lighter placement does not support post-only (ALO) yet',
            };
        }
        if (params.orderType === 'limit' && !params.price) {
            return { isValid: false, error: 'Limit order requires a price' };
        }
        const usdAmount = parseFloat(params.usdAmount ?? '');
        const hasUsdSizing = Number.isFinite(usdAmount) && usdAmount > 0;
        if (!hasUsdSizing && !(parseFloat(params.size) > 0)) {
            return { isValid: false, error: 'Order size must be positive' };
        }
        const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
        const market = markets.get(params.symbol);
        if (!market) {
            return {
                isValid: false,
                error: `Unknown Lighter market: ${params.symbol}`,
            };
        }
        const referencePrice = parseFloat(params.price ?? String(params.currentPrice ?? 0));
        if (referencePrice > 0 && !params.reduceOnly && !params.isFullClose) {
            const requestedSize = hasUsdSizing
                ? usdAmount / referencePrice
                : parseFloat(params.size);
            const minSize = computeLighterMinOrderSize(market, referencePrice);
            if (requestedSize < minSize) {
                return {
                    isValid: false,
                    error: `Order size ${requestedSize} is below the Lighter minimum of ${minSize} ${params.symbol}`,
                };
            }
        }
        return { isValid: true };
    }
    async validateClosePosition(params) {
        const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
        if (!markets.has(params.symbol)) {
            return {
                isValid: false,
                error: `Unknown Lighter market ${params.symbol}`,
            };
        }
        return { isValid: true };
    }
    async validateWithdrawal(params) {
        const amount = parseFloat(params.amount ?? '');
        if (!Number.isFinite(amount) || amount <= 0) {
            return { isValid: false, error: 'Withdrawal amount must be positive' };
        }
        return { isValid: true };
    }
    // ============================================================================
    // Calculations (POC: coarse)
    // ============================================================================
    async calculateLiquidationPrice(params) {
        // Pre-trade estimate using the standard cross-margin approximation with
        // maintenance fraction = 1 / (2 * maxLeverage) — the same convention the
        // HyperLiquid provider uses. Live positions carry the venue's own
        // liquidationPrice; this is only for sizing previews.
        const { entryPrice, leverage, direction } = params;
        if (!(entryPrice > 0) || !(leverage > 0)) {
            return '0';
        }
        const maintenanceFraction = await this.calculateMaintenanceMargin({
            asset: params.asset ?? '',
        });
        const sideFactor = direction === 'long' ? 1 : -1;
        const liquidationPrice = entryPrice * (1 - sideFactor * (1 / leverage - maintenanceFraction));
        return liquidationPrice > 0 ? liquidationPrice.toFixed(6) : '0';
    }
    async calculateMaintenanceMargin(params) {
        // The venue publishes per-market maintenance margin fractions
        // (hundredths of a percent, e.g. 240 = 2.4%) in orderBookDetails.
        try {
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarketMargins, "f").call(this);
            const maintenance = __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").get(params.asset)?.maintenance;
            if (maintenance && maintenance > 0) {
                return maintenance / 10000;
            }
        }
        catch (error) {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] maintenance margin fallback', { error: String(error) });
        }
        // Fallback: half the initial margin at the max-leverage constant.
        return 1 / (2 * LIGHTER_MAX_LEVERAGE);
    }
    async getMaxLeverage(asset) {
        // The venue publishes per-market minimum initial margin fractions
        // (hundredths of a percent): 400 → 25x. The global constant is only a
        // fallback when the market is unknown.
        try {
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarketMargins, "f").call(this);
            const minInitial = __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").get(asset)?.minInitial;
            if (minInitial && minInitial > 0) {
                return Math.floor(10000 / minInitial);
            }
        }
        catch (error) {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getMaxLeverage fallback', {
                error: String(error),
            });
        }
        return LIGHTER_MAX_LEVERAGE;
    }
    async calculateFees(params) {
        // Sourced from the venue's own per-market metadata rather than assumed:
        // Lighter standard accounts currently report 0 maker/taker fees.
        const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
        const market = markets.get(params.symbol);
        const feeRate = parseFloat((params.isMaker ? market?.makerFee : market?.takerFee) ?? '0');
        const amount = parseFloat(params.amount ?? '0');
        return {
            feeRate,
            feeAmount: Number.isFinite(amount) ? amount * feeRate : 0,
            protocolFeeRate: feeRate,
            metamaskFeeRate: 0,
        };
    }
    // ============================================================================
    // Subscriptions (POC: REST polling stands in for a WS feed; prices are live,
    // the remaining channels emit empty snapshots)
    // ============================================================================
    subscribeToPrices(params) {
        __classPrivateFieldGet(this, _LighterProvider_priceSubscribers, "f").add(params);
        if (__classPrivateFieldGet(this, _LighterProvider_lastPriceBySymbol, "f").size > 0) {
            __classPrivateFieldGet(this, _LighterProvider_deliverPrices, "f").call(this, params, [...__classPrivateFieldGet(this, _LighterProvider_lastPriceBySymbol, "f").values()]);
        }
        __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, 'market_stats/all');
        __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
        return () => {
            __classPrivateFieldGet(this, _LighterProvider_priceSubscribers, "f").delete(params);
            __classPrivateFieldGet(this, _LighterProvider_releaseChannelIfUnused, "f").call(this);
        };
    }
    subscribeToOICaps(params) {
        __classPrivateFieldGet(this, _LighterProvider_oiCapSubscribers, "f").add(params);
        __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, 'market_stats/all');
        __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
        return () => {
            __classPrivateFieldGet(this, _LighterProvider_oiCapSubscribers, "f").delete(params);
            __classPrivateFieldGet(this, _LighterProvider_releaseChannelIfUnused, "f").call(this);
        };
    }
    subscribeToAccount(params) {
        __classPrivateFieldGet(this, _LighterProvider_accountSubscribers, "f").add(params);
        __classPrivateFieldGet(this, _LighterProvider_ensureAccountChannels, "f").call(this);
        return () => {
            __classPrivateFieldGet(this, _LighterProvider_accountSubscribers, "f").delete(params);
            __classPrivateFieldGet(this, _LighterProvider_releaseChannelIfUnused, "f").call(this);
        };
    }
    subscribeToPositions(params) {
        __classPrivateFieldGet(this, _LighterProvider_positionSubscribers, "f").add(params);
        if (__classPrivateFieldGet(this, _LighterProvider_wsPositions, "f").size > 0) {
            params.callback([...__classPrivateFieldGet(this, _LighterProvider_wsPositions, "f").values()]);
        }
        __classPrivateFieldGet(this, _LighterProvider_ensureAccountChannels, "f").call(this);
        return () => {
            __classPrivateFieldGet(this, _LighterProvider_positionSubscribers, "f").delete(params);
            __classPrivateFieldGet(this, _LighterProvider_releaseChannelIfUnused, "f").call(this);
        };
    }
    subscribeToOrders(params) {
        __classPrivateFieldGet(this, _LighterProvider_orderSubscribers, "f").add(params);
        if (__classPrivateFieldGet(this, _LighterProvider_wsOrders, "f").size > 0) {
            params.callback([...__classPrivateFieldGet(this, _LighterProvider_wsOrders, "f").values()]);
        }
        __classPrivateFieldGet(this, _LighterProvider_ensureAccountChannels, "f").call(this);
        return () => {
            __classPrivateFieldGet(this, _LighterProvider_orderSubscribers, "f").delete(params);
            __classPrivateFieldGet(this, _LighterProvider_releaseChannelIfUnused, "f").call(this);
        };
    }
    subscribeToOrderFills(params) {
        __classPrivateFieldGet(this, _LighterProvider_fillSubscribers, "f").add(params);
        __classPrivateFieldGet(this, _LighterProvider_ensureAccountChannels, "f").call(this);
        return () => {
            __classPrivateFieldGet(this, _LighterProvider_fillSubscribers, "f").delete(params);
            __classPrivateFieldGet(this, _LighterProvider_releaseChannelIfUnused, "f").call(this);
        };
    }
    subscribeToCandles(params) {
        let released = false;
        let seriesKey = null;
        const resolution = LIGHTER_SUPPORTED_RESOLUTIONS.has(params.interval)
            ? params.interval
            : '15m';
        __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this)
            .then(async (markets) => {
            const market = markets.get(params.symbol);
            if (!market || released) {
                return undefined;
            }
            seriesKey = `${market.marketId}:${resolution}`;
            // Seed with history so charts render immediately, then let the WS
            // candle channel keep the series live.
            const seeded = await this.fetchHistoricalCandles({
                symbol: params.symbol,
                interval: params.interval,
                limit: 120,
            });
            if (released) {
                return undefined;
            }
            const series = new Map();
            for (const candle of seeded.candles) {
                series.set(candle.time, candle);
            }
            __classPrivateFieldGet(this, _LighterProvider_candleSeries, "f").set(seriesKey, series);
            let subscribers = __classPrivateFieldGet(this, _LighterProvider_candleSubscribers, "f").get(seriesKey);
            if (!subscribers) {
                subscribers = new Set();
                __classPrivateFieldGet(this, _LighterProvider_candleSubscribers, "f").set(seriesKey, subscribers);
            }
            subscribers.add(params);
            params.callback(seeded);
            __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `candle/${market.marketId}/${resolution}`);
            __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
            return undefined;
        })
            .catch((error) => {
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] candle seed failed', {
                error: String(error),
            });
        });
        return () => {
            released = true;
            if (seriesKey !== null) {
                __classPrivateFieldGet(this, _LighterProvider_candleSubscribers, "f").get(seriesKey)?.delete(params);
            }
            __classPrivateFieldGet(this, _LighterProvider_releaseChannelIfUnused, "f").call(this);
        };
    }
    subscribeToOrderBook(params) {
        let released = false;
        let marketId = null;
        __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this)
            .then((markets) => {
            const market = markets.get(params.symbol);
            if (!market || released) {
                return undefined;
            }
            marketId = market.marketId;
            let subscribers = __classPrivateFieldGet(this, _LighterProvider_orderBookSubscribers, "f").get(marketId);
            if (!subscribers) {
                subscribers = new Set();
                __classPrivateFieldGet(this, _LighterProvider_orderBookSubscribers, "f").set(marketId, subscribers);
            }
            subscribers.add(params);
            __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `order_book/${marketId}`);
            __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
            return undefined;
        })
            .catch((error) => {
            params.onError?.(ensureError(error));
        });
        return () => {
            released = true;
            if (marketId !== null) {
                __classPrivateFieldGet(this, _LighterProvider_orderBookSubscribers, "f").get(marketId)?.delete(params);
            }
            __classPrivateFieldGet(this, _LighterProvider_releaseChannelIfUnused, "f").call(this);
        };
    }
    setLiveDataConfig(_config) {
        // POC: no live data configuration
    }
    getWebSocketConnectionState() {
        // REST-polling transport has no socket to report on; treat an active
        // poll loop as connected so callers don't tear down live subscriptions.
        if (!__classPrivateFieldGet(this, _LighterProvider_webSocketCtor, "f")) {
            return WebSocketConnectionState.Connected;
        }
        return __classPrivateFieldGet(this, _LighterProvider_connectionState, "f");
    }
    subscribeToConnectionState(listener) {
        __classPrivateFieldGet(this, _LighterProvider_connectionListeners, "f").add(listener);
        listener(this.getWebSocketConnectionState(), __classPrivateFieldGet(this, _LighterProvider_wsReconnectAttempts, "f"));
        return () => {
            __classPrivateFieldGet(this, _LighterProvider_connectionListeners, "f").delete(listener);
        };
    }
    async reconnect() {
        const ws = __classPrivateFieldGet(this, _LighterProvider_priceWs, "f");
        if (ws) {
            // Detach first so the onclose handler's 5s backoff never races the
            // immediate reconnect below.
            __classPrivateFieldSet(this, _LighterProvider_priceWs, null, "f");
            __classPrivateFieldGet(this, _LighterProvider_clearKeepalive, "f").call(this);
            try {
                ws.close();
            }
            catch {
                // Socket may already be closed.
            }
            __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, WebSocketConnectionState.Disconnected);
        }
        if (__classPrivateFieldGet(this, _LighterProvider_wsReconnectTimer, "f")) {
            clearTimeout(__classPrivateFieldGet(this, _LighterProvider_wsReconnectTimer, "f"));
            __classPrivateFieldSet(this, _LighterProvider_wsReconnectTimer, null, "f");
        }
        if (__classPrivateFieldGet(this, _LighterProvider_hasAnySubscriber, "f").call(this)) {
            __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
        }
    }
    getDepositRoutes(_params) {
        const bridge = LIGHTER_BRIDGE_CONFIG[__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'];
        return __classPrivateFieldGet(this, _LighterProvider_bridgeRoute, "f").call(this, bridge.minDepositUsdc);
    }
    getWithdrawalRoutes(_params) {
        const bridge = LIGHTER_BRIDGE_CONFIG[__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'];
        return __classPrivateFieldGet(this, _LighterProvider_bridgeRoute, "f").call(this, bridge.minWithdrawUsdc);
    }
    // ============================================================================
    // Block Explorer
    // ============================================================================
    getBlockExplorerUrl(address) {
        const baseUrl = __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f")
            ? LIGHTER_TESTNET_EXPLORER_URL
            : LIGHTER_MAINNET_EXPLORER_URL;
        return address ? `${baseUrl}/address/${address}` : baseUrl;
    }
}
_LighterProvider_deps = new WeakMap(), _LighterProvider_clientService = new WeakMap(), _LighterProvider_walletService = new WeakMap(), _LighterProvider_messenger = new WeakMap(), _LighterProvider_signerBridge = new WeakMap(), _LighterProvider_isTestnet = new WeakMap(), _LighterProvider_apiKeyIndex = new WeakMap(), _LighterProvider_configuredAccountIndex = new WeakMap(), _LighterProvider_marketsBySymbol = new WeakMap(), _LighterProvider_marketsById = new WeakMap(), _LighterProvider_accountIndex = new WeakMap(), _LighterProvider_boundAddress = new WeakMap(), _LighterProvider_sessionGeneration = new WeakMap(), _LighterProvider_priceSubscribers = new WeakMap(), _LighterProvider_pricePollTimer = new WeakMap(), _LighterProvider_priceWs = new WeakMap(), _LighterProvider_pricePollCycle = new WeakMap(), _LighterProvider_webSocketCtor = new WeakMap(), _LighterProvider_wsWantedChannels = new WeakMap(), _LighterProvider_wsKeepaliveTimer = new WeakMap(), _LighterProvider_connectionState = new WeakMap(), _LighterProvider_wsReconnectAttempts = new WeakMap(), _LighterProvider_connectionListeners = new WeakMap(), _LighterProvider_setConnectionState = new WeakMap(), _LighterProvider_wsReconnectTimer = new WeakMap(), _LighterProvider_lastPriceBySymbol = new WeakMap(), _LighterProvider_wsPositions = new WeakMap(), _LighterProvider_wsOrders = new WeakMap(), _LighterProvider_oiCapSubscribers = new WeakMap(), _LighterProvider_accountSubscribers = new WeakMap(), _LighterProvider_positionSubscribers = new WeakMap(), _LighterProvider_orderSubscribers = new WeakMap(), _LighterProvider_fillSubscribers = new WeakMap(), _LighterProvider_orderBookSubscribers = new WeakMap(), _LighterProvider_orderBookState = new WeakMap(), _LighterProvider_candleSubscribers = new WeakMap(), _LighterProvider_candleSeries = new WeakMap(), _LighterProvider_accountChannelsPromise = new WeakMap(), _LighterProvider_venuePublicKey = new WeakMap(), _LighterProvider_signerReadyPromise = new WeakMap(), _LighterProvider_authToken = new WeakMap(), _LighterProvider_getErrorContext = new WeakMap(), _LighterProvider_getSignerBridge = new WeakMap(), _LighterProvider_invalidateSignerSession = new WeakMap(), _LighterProvider_ensureSessionBinding = new WeakMap(), _LighterProvider_rebuildStreamForSubscribers = new WeakMap(), _LighterProvider_ensureAccountIndex = new WeakMap(), _LighterProvider_ensureSignerReady = new WeakMap(), _LighterProvider_setupSigner = new WeakMap(), _LighterProvider_isVenueKeyRegistered = new WeakMap(), _LighterProvider_registerVenueKey = new WeakMap(), _LighterProvider_writeChain = new WeakMap(), _LighterProvider_withVenueWriteLock = new WeakMap(), _LighterProvider_withVenueNonce = new WeakMap(), _LighterProvider_getAuthToken = new WeakMap(), _LighterProvider_ensureMarkets = new WeakMap(), _LighterProvider_resolveLeverageIntent = new WeakMap(), _LighterProvider_marginBySymbol = new WeakMap(), _LighterProvider_ensureMarketMargins = new WeakMap(), _LighterProvider_ensureAccountChannels = new WeakMap(), _LighterProvider_hasAnySubscriber = new WeakMap(), _LighterProvider_requestChannel = new WeakMap(), _LighterProvider_sendSubscribe = new WeakMap(), _LighterProvider_releaseChannelIfUnused = new WeakMap(), _LighterProvider_ensureStream = new WeakMap(), _LighterProvider_connectWs = new WeakMap(), _LighterProvider_handleWsMessage = new WeakMap(), _LighterProvider_handleOrderBookMessage = new WeakMap(), _LighterProvider_handleCandleMessage = new WeakMap(), _LighterProvider_handleTradesMessage = new WeakMap(), _LighterProvider_dispatchOICaps = new WeakMap(), _LighterProvider_emitToOrderSubscribers = new WeakMap(), _LighterProvider_logSubscriberError = new WeakMap(), _LighterProvider_startPricePolling = new WeakMap(), _LighterProvider_emitPolledPrices = new WeakMap(), _LighterProvider_dispatchPriceUpdates = new WeakMap(), _LighterProvider_deliverPrices = new WeakMap(), _LighterProvider_clearKeepalive = new WeakMap(), _LighterProvider_teardownStream = new WeakMap(), _LighterProvider_bridgeRoute = new WeakMap();
//# sourceMappingURL=LighterProvider.mjs.map