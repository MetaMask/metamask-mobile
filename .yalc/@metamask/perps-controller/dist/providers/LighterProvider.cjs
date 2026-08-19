"use strict";
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
var _LighterProvider_deps, _LighterProvider_clientService, _LighterProvider_walletService, _LighterProvider_messenger, _LighterProvider_signerBridge, _LighterProvider_isTestnet, _LighterProvider_apiKeyIndex, _LighterProvider_configuredAccountIndex, _LighterProvider_marketsBySymbol, _LighterProvider_marketsById, _LighterProvider_accountIndex, _LighterProvider_boundAddress, _LighterProvider_sessionGeneration, _LighterProvider_priceSubscribers, _LighterProvider_pricePollTimer, _LighterProvider_priceWs, _LighterProvider_pricePollCycle, _LighterProvider_webSocketCtor, _LighterProvider_wsWantedChannels, _LighterProvider_wsKeepaliveTimer, _LighterProvider_connectionState, _LighterProvider_wsReconnectAttempts, _LighterProvider_connectionListeners, _LighterProvider_setConnectionState, _LighterProvider_wsReconnectTimer, _LighterProvider_lastPriceBySymbol, _LighterProvider_wsPositions, _LighterProvider_wsOrders, _LighterProvider_oiCapSubscribers, _LighterProvider_accountSubscribers, _LighterProvider_positionSubscribers, _LighterProvider_orderSubscribers, _LighterProvider_fillSubscribers, _LighterProvider_orderBookSubscribers, _LighterProvider_orderBookState, _LighterProvider_candleSubscribers, _LighterProvider_candleSeries, _LighterProvider_accountChannelsPromise, _LighterProvider_venuePublicKey, _LighterProvider_signerReadyPromise, _LighterProvider_authToken, _LighterProvider_getErrorContext, _LighterProvider_rawSignerBridge, _LighterProvider_getSignerBridge, _LighterProvider_invalidateSignerSession, _LighterProvider_clearBridgeOwnership, _LighterProvider_ensureSessionBinding, _LighterProvider_rebuildStreamForSubscribers, _LighterProvider_ensureAccountIndex, _LighterProvider_assertStandardAccount, _LighterProvider_isUnsupportedCapabilityError, _LighterProvider_isDataIntegrityError, _LighterProvider_tpslUnsettled, _LighterProvider_nonceReservations, _LighterProvider_tpslOperationCounter, _LighterProvider_signerIdentity, _LighterProvider_signerRecreateParams, _LighterProvider_nonceLedgerKey, _LighterProvider_readNonceLedger, _LighterProvider_writeNonceLedger, _LighterProvider_withLedgerLock, _LighterProvider_resolveEntryPostDispatch, _LighterProvider_resolveNonceLedger, _LighterProvider_resolveNonceLedgerLocked, _LighterProvider_releaseNonceReservationIfUnconsumed, _LighterProvider_tpslJournalKey, _LighterProvider_tpslJournalOpKey, _LighterProvider_loadTpslJournal, _LighterProvider_tpslJournalIndexKey, _LighterProvider_readTpslJournalIndex, _LighterProvider_tpslManualKey, _LighterProvider_tpslManualIndexKey, _LighterProvider_readTpslManualIndex, _LighterProvider_writeTpslManualRecovery, _LighterProvider_loadTpslManualRecovery, _LighterProvider_clearTpslManualRecovery, _LighterProvider_persistTpslJournal, _LighterProvider_clearTpslJournal, _LighterProvider_makeInactiveReader, _LighterProvider_tpslRecoveryGeneration, _LighterProvider_tpslRecoveryInFlight, _LighterProvider_tpslRecoveryKickPending, _LighterProvider_kickTpslRecovery, _LighterProvider_recoverPendingTpslJournals, _LighterProvider_recoverTpslSymbol, _LighterProvider_settleTpslObligation, _LighterProvider_settleTpslObligationLocked, _LighterProvider_reconcilePriorTpsl, _LighterProvider_releaseNonceReservation, _LighterProvider_awaitTpslVisibility, _LighterProvider_assertSession, _LighterProvider_invalidateSessionState, _LighterProvider_ensureSignerReady, _LighterProvider_setupSigner, _LighterProvider_isVenueKeyRegistered, _LighterProvider_registerVenueKey, _LighterProvider_writeChain, _LighterProvider_issuedClientOrderIds, _LighterProvider_allocateClientOrderIndexes, _LighterProvider_withVenueWriteLock, _LighterProvider_withVenueNonce, _LighterProvider_reestablishSignerClient, _LighterProvider_getAuthToken, _LighterProvider_ensureMarkets, _LighterProvider_readOpenOrdersStrict, _LighterProvider_resolveLeverageIntent, _LighterProvider_resolveMarketReferencePrice, _LighterProvider_normalizeCloseParams, _LighterProvider_validateCloseShape, _LighterProvider_isVerifiedFullClose, _LighterProvider_validateOrderChecks, _LighterProvider_validateClosePositionChecks, _LighterProvider_marginBySymbol, _LighterProvider_maxLeverageForMarketId, _LighterProvider_requireMarketMaxLeverage, _LighterProvider_marginFetchedAt, _LighterProvider_marginRefreshInFlight, _LighterProvider_ensureMarketMargins, _LighterProvider_ensureAccountChannels, _LighterProvider_hasAnySubscriber, _LighterProvider_requestChannel, _LighterProvider_sendSubscribe, _LighterProvider_releaseChannelIfUnused, _LighterProvider_ensureStream, _LighterProvider_connectWs, _LighterProvider_handleWsMessage, _LighterProvider_handleOrderBookMessage, _LighterProvider_handleCandleMessage, _LighterProvider_handleTradesMessage, _LighterProvider_dispatchOICaps, _LighterProvider_emitToOrderSubscribers, _LighterProvider_logSubscriberError, _LighterProvider_startPricePolling, _LighterProvider_emitPolledPrices, _LighterProvider_dispatchPriceUpdates, _LighterProvider_deliverPrices, _LighterProvider_clearKeepalive, _LighterProvider_teardownStream, _LighterProvider_bridgeRoute;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LighterProvider = void 0;
const lighterConfig_js_1 = require("../constants/lighterConfig.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const LighterClientService_js_1 = require("../services/LighterClientService.cjs");
const LighterWalletService_js_1 = require("../services/LighterWalletService.cjs");
const index_js_1 = require("../types/index.cjs");
const errorUtils_js_1 = require("../utils/errorUtils.cjs");
const lighterAdapter_js_1 = require("../utils/lighterAdapter.cjs");
// ============================================================================
// Constants
// ============================================================================
/** Full-string decimal/scientific literal (optional sign and exponent). */
/**
 * Strict full-string numeric parsing shared with the adaptation boundary
 * (see lighterConfig.parseLighterStrictDecimal): '10USD' or '0.001BTC'
 * would prefix-parse into signed intent under bare parseFloat.
 */
const parseStrictDecimal = lighterConfig_js_1.parseLighterStrictDecimal;
/**
 * Parse caller-supplied numeric intent, accepting only finite positive
 * values from a strictly numeric string.
 *
 * @param value - Raw numeric string from params.
 * @returns The parsed number, or null when malformed, non-finite or
 * non-positive.
 */
const parseFinitePositive = (value) => {
    const parsed = parseStrictDecimal(value);
    return parsed !== null && Number.isFinite(parsed) && parsed > 0
        ? parsed
        : null;
};
/**
 * Integerize a SIGNER-BOUND value: the scaled result must be a positive
 * safe wire integer. The positive-intent policy lives here, not in the
 * generic public converter.
 *
 * @param value - Human-units value.
 * @param decimals - Market/asset decimals.
 * @returns The positive wire integer.
 */
const toSignerWireInteger = (value, decimals) => {
    const scaled = (0, lighterConfig_js_1.toLighterInteger)(value, decimals);
    if (scaled < 1) {
        throw new Error(`Value ${value} rounds to zero at ${decimals} decimals`);
    }
    return scaled;
};
/**
 * Snap a base size onto the market's size grid exactly as wire
 * integerization will (round to nearest step). Minimum-size checks must
 * judge the SNAPPED size: a raw USD/price quotient one hair under the
 * minimum still reaches the venue as the valid minimum step, and
 * rejecting the raw quotient refuses orders the venue accepts.
 *
 * @param size - Raw base size (human units).
 * @param supportedSizeDecimals - Market size decimals.
 * @returns The grid-snapped size, or the input unchanged when it cannot
 * be integerized (range overflow) — later wire conversion fails closed.
 */
const snapToLighterSizeGrid = (size, supportedSizeDecimals) => {
    try {
        return (0, lighterConfig_js_1.fromLighterInteger)((0, lighterConfig_js_1.toLighterInteger)(size, supportedSizeDecimals), supportedSizeDecimals);
    }
    catch {
        return size;
    }
};
/** The pinned signer casts price fields to uint32. */
const LIGHTER_MAX_WIRE_PRICE = 4294967295;
/**
 * Clock slack added to a signed payload's ExpiredAt before a not-found
 * transaction hash is declared never-landed.
 */
const LIGHTER_TX_EXPIRY_SLACK_MS = 30000;
/**
 * Extract the signed txHash and ExpiredAt from a bridge signing result,
 * failing CLOSED: without them the settlement journal cannot resolve a
 * lost response authoritatively, so the mutation must not be submitted.
 *
 * @param signed - Bridge signing result.
 * @param signed.txHash - Signed transaction hash (hex).
 * @param signed.txInfo - Signed wire payload JSON (carries ExpiredAt).
 * @returns The transaction hash and expiry (ms).
 */
const requireSignedTxIdentity = (signed) => {
    const { txHash } = signed;
    if (typeof txHash !== 'string' ||
        !/^(0x)?[0-9a-fA-F]{8,128}$/u.test(txHash)) {
        throw new Error('Lighter signing result carries no usable txHash; refusing to submit an unreconcilable mutation');
    }
    let expiresAt;
    try {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        expiresAt = JSON.parse(signed.txInfo ?? '')
            .ExpiredAt;
    }
    catch {
        expiresAt = undefined;
    }
    if (typeof expiresAt !== 'number' ||
        !Number.isSafeInteger(expiresAt) ||
        expiresAt <= 0) {
        throw new Error('Lighter signing result carries no usable ExpiredAt; refusing to submit an unreconcilable mutation');
    }
    return { txHash, expiresAt };
};
/**
 * PROCESS-WIDE mutexes: venue write sections, the per-settlement journal
 * state machine, and journal/index read-modify-writes are serialized
 * across ALL provider instances in this runtime. Instance-local write
 * chains cannot protect two live providers sharing one venue account or
 * one disk cache. Completed tails are evicted to keep the map bounded.
 */
const processMutexTails = new Map();
/**
 * Run an operation atomically w.r.t. every other holder of the same key
 * in this process.
 *
 * @param key - Key to serialize on.
 * @param operation - The critical operation.
 * @returns The operation's result.
 */
const withProcessMutex = async (key, operation) => {
    const tail = processMutexTails.get(key) ?? Promise.resolve();
    const run = tail.then(operation, operation);
    const settled = run.then(() => undefined, () => undefined);
    processMutexTails.set(key, settled);
    settled
        .then(() => {
        // Evict when no newer holder queued behind us.
        if (processMutexTails.get(key) === settled) {
            processMutexTails.delete(key);
        }
        return undefined;
    })
        .catch(() => undefined);
    return await run;
};
/**
 * Storage-scoped alias of the process mutex (kept for call-site clarity).
 *
 * @param key - Storage key to serialize on.
 * @param operation - The read-modify-write.
 * @returns The operation's result.
 */
const withStorageMutex = withProcessMutex;
/**
 * The WASM signer hosts ONE global client per bridge. These module maps
 * track which venue identity (`network:account:apiKey`) currently owns
 * each bridge's client, and give every bridge a process-unique mutex key
 * so all sign-and-dispatch sections across ALL provider instances
 * sharing a bridge are serialized and re-establish the correct client
 * before signing.
 */
/**
 * Cryptographic randomness with a bounded Math.random fallback for hosts
 * without WebCrypto. Collision-resistant ids matter here: a recycled
 * operation id could let a stale journal resolver clear a live journal.
 *
 * @param byteCount - Number of random bytes.
 * @returns The random bytes.
 */
const randomBytes = (byteCount) => {
    const bytes = new Uint8Array(byteCount);
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.getRandomValues) {
        cryptoObj.getRandomValues(bytes);
        return bytes;
    }
    for (let index = 0; index < byteCount; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
    }
    return bytes;
};
/**
 * Two independent 24-bit random values (client order id halves).
 *
 * @returns The [high, low] pair.
 */
const randomUint24Pair = () => {
    const bytes = randomBytes(6);
    return [
        bytes[0] * 65536 + bytes[1] * 256 + bytes[2],
        bytes[3] * 65536 + bytes[4] * 256 + bytes[5],
    ];
};
/**
 * Collision-resistant id suffix (80 bits, hex).
 *
 * @returns The suffix string.
 */
const randomIdSuffix = () => Array.from(randomBytes(10), (byte) => byte.toString(16).padStart(2, '0')).join('');
const bridgeClientOwners = new WeakMap();
const bridgeIds = new WeakMap();
let nextBridgeId = 1;
/**
 * Process-unique mutex key for a bridge instance.
 *
 * @param bridge - The signer bridge.
 * @returns The mutex key.
 */
const bridgeMutexKey = (bridge) => {
    let id = bridgeIds.get(bridge);
    if (id === undefined) {
        id = nextBridgeId;
        nextBridgeId += 1;
        bridgeIds.set(bridge, id);
    }
    return `lighterBridge:${id}`;
};
/**
 * Parse a journal-pointer document, or null when the content is not a
 * pointer (legacy inline journal or corrupt data — both handled by the
 * caller's payload validation path).
 *
 * @param raw - Raw base-key content.
 * @returns The pointer, or null.
 */
const parseTpslJournalPointer = (raw) => {
    try {
        const parsed = JSON.parse(raw);
        if (parsed.pointerVersion === 1 &&
            typeof parsed.operationId === 'string' &&
            parsed.operationId.length >= 1 &&
            parsed.operationId.length <= 64) {
            return { operationId: parsed.operationId };
        }
    }
    catch {
        // Not JSON: not a pointer.
    }
    return null;
};
/**
 * Best-effort dispatch identity from a bridge signing result. The pinned
 * WASM contract (web-wasm light_client.go) returns `{txHash, txInfo}`
 * where txInfo is the marshaled wire payload — it carries Nonce and
 * ExpiredAt but NEVER the hash. Non-throwing: ops whose signers omit a
 * field dispatch with a partial identity (resolvable only by REST
 * advance, never by expiry).
 *
 * @param signed - Bridge signing result.
 * @param signed.txHash - Signed transaction hash from the RESULT.
 * @param signed.txInfo - Marshaled wire payload.
 * @returns The dispatch identity (null fields when unavailable).
 */
const extractDispatchIdentity = (signed) => {
    const txHash = typeof signed.txHash === 'string' &&
        /^(0x)?[0-9a-fA-F]{8,128}$/u.test(signed.txHash)
        ? signed.txHash
        : null;
    let expiresAt = null;
    try {
        const wire = JSON.parse(signed.txInfo ?? '');
        expiresAt =
            typeof wire.ExpiredAt === 'number' &&
                Number.isSafeInteger(wire.ExpiredAt) &&
                wire.ExpiredAt > 0
                ? wire.ExpiredAt
                : null;
    }
    catch {
        expiresAt = null;
    }
    return { txHash, expiresAt };
};
/**
 * Allocate the next unique attempt identity from the journal's DURABLE
 * monotonic counter (compaction can therefore never recycle an id).
 *
 * @param journal - The journal being appended to.
 * @returns The allocated attempt id.
 */
const nextAttemptIdFor = (journal) => {
    const allocated = journal.nextAttemptId;
    journal.nextAttemptId += 1;
    return allocated;
};
/** Delay between TP/SL settlement visibility polls. */
const LIGHTER_TPSL_SETTLE_POLL_MS = 150;
/** Bounded attempts for TP/SL settlement visibility. */
const LIGHTER_TPSL_SETTLE_ATTEMPTS = 10;
/**
 * Integerize a signer-bound PRICE (order price / trigger price): the
 * pinned lighter-go signer casts these to uint32 (web-wasm/main.go), so a
 * safe-integer above 2^32-1 silently WRAPS (e.g. 429496729.7 at 1 decimal
 * scales to 4,294,967,297 and wires as 1).
 *
 * @param value - Human-units price.
 * @param decimals - Market price decimals.
 * @returns The positive uint32 wire integer.
 */
const toSignerWirePriceInteger = (value, decimals) => {
    const scaled = toSignerWireInteger(value, decimals);
    if (scaled > LIGHTER_MAX_WIRE_PRICE) {
        throw new Error(`Price ${value} exceeds Lighter's uint32 wire range at ${decimals} decimals`);
    }
    return scaled;
};
/**
 * Map a RAW venue trigger row to its durable prior wire intent, or null
 * when it cannot be faithfully restored: unknown type/TIF/expiry, a
 * MISSING trigger price (never substituted — that would change the
 * user's protection semantics), a malformed/non-positive decimal, or a
 * value that cannot be integerized onto the wire (range/sub-tick). The
 * writer must never persist state the loader (or the signer) would
 * later reject. A mutation that would cancel such a row must fail
 * closed BEFORE any cancel.
 *
 * @param raw - Raw venue order row.
 * @param market - Market integerization parameters.
 * @param market.supportedSizeDecimals - Size integerization decimals.
 * @param market.supportedPriceDecimals - Price integerization decimals.
 * @returns The exact prior wire intent, or null when unmappable.
 */
const mapRawTriggerToPriorIntent = (raw, market) => {
    const wireOrderTypeByVenueType = {
        'stop-loss': 2,
        'stop-loss-limit': 3,
        'take-profit': 4,
        'take-profit-limit': 5,
    };
    const wireTimeInForceByVenueTif = {
        'immediate-or-cancel': 0,
        'good-till-time': 1,
        'post-only': 2,
    };
    const wireOrderType = wireOrderTypeByVenueType[raw.type];
    const wireTimeInForce = wireTimeInForceByVenueTif[raw.timeInForce];
    if (wireOrderType === undefined ||
        wireTimeInForce === undefined ||
        !Number.isSafeInteger(raw.orderExpiry) ||
        raw.orderExpiry < -1 ||
        !/^\d{1,20}$/u.test(String(raw.orderIndex)) ||
        // A trigger's trigger price is REQUIRED verbatim.
        typeof raw.triggerPrice !== 'string') {
        return null;
    }
    const price = parseStrictDecimal(raw.price);
    const triggerPrice = parseStrictDecimal(raw.triggerPrice);
    const remainingSize = parseStrictDecimal(raw.remainingBaseAmount);
    if (price === null ||
        !Number.isFinite(price) ||
        price <= 0 ||
        triggerPrice === null ||
        !Number.isFinite(triggerPrice) ||
        triggerPrice <= 0 ||
        remainingSize === null ||
        !Number.isFinite(remainingSize) ||
        remainingSize <= 0) {
        return null;
    }
    // Wire PREFLIGHT: integerize exactly what a restore would sign. A
    // range/sub-tick failure here refuses the whole mutation up front.
    try {
        toSignerWireInteger(remainingSize, market.supportedSizeDecimals);
        toSignerWirePriceInteger(price, market.supportedPriceDecimals);
        toSignerWirePriceInteger(triggerPrice, market.supportedPriceDecimals);
    }
    catch {
        return null;
    }
    return {
        orderId: String(raw.orderIndex),
        side: raw.isAsk ? 'sell' : 'buy',
        wireOrderType,
        wireTimeInForce,
        orderExpiry: raw.orderExpiry,
        price: raw.price,
        triggerPrice: raw.triggerPrice,
        remainingSize: raw.remainingBaseAmount,
    };
};
/**
 * Validate caller leverage intent against what Lighter can represent.
 *
 * @param leverage - Requested leverage, if any.
 * @returns The exact rejection message, or null when acceptable.
 */
const lighterLeverageError = (leverage) => {
    if (leverage === undefined) {
        return null;
    }
    if (!Number.isFinite(leverage) || !(leverage > 0)) {
        return `Invalid leverage ${leverage}: must be a positive number`;
    }
    // UpdateLeverage signs an initial margin fraction in hundredths of a
    // percent. The derived IMF must itself be a positive safe integer within
    // the venue's fraction range: huge finite leverage rounds it to zero,
    // tiny finite leverage (Number.MIN_VALUE) overflows the division to
    // Infinity, and sub-1x leverage exceeds a 100% margin fraction.
    const imfHundredths = Math.round(10000 / leverage);
    if (!Number.isSafeInteger(imfHundredths) ||
        imfHundredths < 1 ||
        imfHundredths > 10000) {
        return `Invalid leverage ${leverage}: outside Lighter's representable leverage range`;
    }
    return null;
};
/**
 * Derive the protection/execution price a market order signs from its
 * reference price — shared by placement and both validators so wire-range
 * checks always inspect the exact value the signer receives.
 *
 * @param referencePrice - Fresh venue reference price.
 * @param isBuy - Order side; buys protect above, sells below.
 * @param slippageFraction - Slippage tolerance (validated < 1).
 * @returns The slippage-adjusted execution price.
 */
const deriveLighterExecutionPrice = (referencePrice, isBuy, slippageFraction) => isBuy
    ? referencePrice * (1 + slippageFraction)
    : referencePrice * (1 - slippageFraction);
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
class LighterProvider {
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
        _LighterProvider_connectionState.set(this, index_js_1.WebSocketConnectionState.Disconnected);
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
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
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
        /**
         * The RAW bridge instance — the STABLE identity object for the
         * process-wide ownership map and mutex key. The `#getSignerBridge`
         * wrapper below is a fresh object per call and must NEVER key either.
         *
         * @returns The raw signer bridge.
         */
        _LighterProvider_rawSignerBridge.set(this, () => {
            if (!__classPrivateFieldGet(this, _LighterProvider_signerBridge, "f")) {
                throw new Error(LIGHTER_SIGNER_UNAVAILABLE_ERROR);
            }
            return __classPrivateFieldGet(this, _LighterProvider_signerBridge, "f");
        });
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
            // Advancing the generation aborts any in-flight setup/write that was
            // started against the now-dead WASM client.
            __classPrivateFieldSet(this, _LighterProvider_sessionGeneration, __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f") + 1, "f");
            __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_authToken, null, "f");
            __classPrivateFieldGet(this, _LighterProvider_clearBridgeOwnership, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] signer session invalidated (client lost); will re-setup on next call');
        });
        /**
         * Drop ALL bridge-client ownership material for this provider: the
         * identity, the recreate params, and — when WE are the recorded owner
         * — the process-wide ownership entry, so a dead/rebound session can
         * never be mistaken for the live owner of the singleton client.
         */
        _LighterProvider_clearBridgeOwnership.set(this, () => {
            if (__classPrivateFieldGet(this, _LighterProvider_signerBridge, "f") &&
                __classPrivateFieldGet(this, _LighterProvider_signerIdentity, "f") !== null &&
                bridgeClientOwners.get(__classPrivateFieldGet(this, _LighterProvider_signerBridge, "f")) === __classPrivateFieldGet(this, _LighterProvider_signerIdentity, "f")) {
                bridgeClientOwners.delete(__classPrivateFieldGet(this, _LighterProvider_signerBridge, "f"));
            }
            __classPrivateFieldSet(this, _LighterProvider_signerIdentity, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_signerRecreateParams, null, "f");
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
                if (__classPrivateFieldGet(this, _LighterProvider_boundAddress, "f") !== null) {
                    // All accounts deselected while a session existed: invalidate so
                    // nothing in flight can still act for the old account.
                    __classPrivateFieldGet(this, _LighterProvider_invalidateSessionState, "f").call(this);
                    __classPrivateFieldGet(this, _LighterProvider_teardownStream, "f").call(this);
                }
                // The caller's own address resolution surfaces the error.
                return;
            }
            if (__classPrivateFieldGet(this, _LighterProvider_boundAddress, "f") === address) {
                return;
            }
            const hadPreviousBinding = __classPrivateFieldGet(this, _LighterProvider_boundAddress, "f") !== null;
            __classPrivateFieldSet(this, _LighterProvider_boundAddress, address, "f");
            if (!hadPreviousBinding) {
                // First binding (or first after a deselection): surviving
                // subscribers may be sitting on an empty channel set.
                if (__classPrivateFieldGet(this, _LighterProvider_hasAnySubscriber, "f").call(this) && __classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f").size === 0) {
                    __classPrivateFieldGet(this, _LighterProvider_rebuildStreamForSubscribers, "f").call(this);
                }
                return;
            }
            // Invalidate in-flight async resolutions started under the previous
            // binding: they compare this generation after their awaits and retry
            // instead of caching results for the wrong account.
            __classPrivateFieldSet(this, _LighterProvider_sessionGeneration, __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f") + 1, "f");
            __classPrivateFieldSet(this, _LighterProvider_accountIndex, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_authToken, null, "f");
            // #tpslUnsettled is NOT cleared: entries are keyed by
            // address+accountIndex+symbol, so B never consumes A's pending ids and
            // switching back to A retains its reconciliation obligation.
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
            // Account-bound work requires a bound wallet — including the cached
            // fast path and the configured-index path.
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f"));
            if (__classPrivateFieldGet(this, _LighterProvider_accountIndex, "f") !== null) {
                return __classPrivateFieldGet(this, _LighterProvider_accountIndex, "f");
            }
            if (__classPrivateFieldGet(this, _LighterProvider_configuredAccountIndex, "f") !== undefined) {
                // A configured index must be a Standard (0-fee) account AND owned by
                // the bound wallet address: a signed-in wallet must never read or
                // trade another owner's account just because an env var names it.
                const generationAtCheck = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
                const configured = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getAccountByIndex(__classPrivateFieldGet(this, _LighterProvider_configuredAccountIndex, "f"));
                __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
                if (generationAtCheck !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                    return await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
                }
                const configuredAccount = configured.accounts[0];
                __classPrivateFieldGet(this, _LighterProvider_assertStandardAccount, "f").call(this, configuredAccount?.accountType);
                const ownerAddress = configuredAccount?.l1Address?.toLowerCase();
                if (!ownerAddress || ownerAddress !== __classPrivateFieldGet(this, _LighterProvider_boundAddress, "f")) {
                    // Capability-prefixed so read catches SURFACE it instead of
                    // degrading a cross-owner misconfiguration into empty state.
                    throw new Error(`${lighterConfig_js_1.LIGHTER_UNSUPPORTED_CAPABILITY_PREFIX} configured account ${__classPrivateFieldGet(this, _LighterProvider_configuredAccountIndex, "f")} is not owned by the selected wallet address`);
                }
                __classPrivateFieldSet(this, _LighterProvider_accountIndex, __classPrivateFieldGet(this, _LighterProvider_configuredAccountIndex, "f"), "f");
                return __classPrivateFieldGet(this, _LighterProvider_accountIndex, "f");
            }
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const address = __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress();
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getAccountsByL1Address(address);
            // Re-run the binding so an EXTERNAL switch nothing else observed also
            // advances the generation, then compare: caching after any switch
            // would poison the new session with the old account. Retry instead.
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            if (generation !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                return await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            }
            if (!response.subAccounts?.length) {
                throw new Error(`No Lighter account exists for ${address}; fund it via the bridge (or the testnet faucet) first`);
            }
            const master = response.subAccounts.reduce((min, account) => account.index < min.index ? account : min);
            __classPrivateFieldGet(this, _LighterProvider_assertStandardAccount, "f").call(this, master.accountType);
            __classPrivateFieldSet(this, _LighterProvider_accountIndex, master.index, "f");
            return __classPrivateFieldGet(this, _LighterProvider_accountIndex, "f");
        });
        /**
         * Capability gate: only Standard (0-fee) Lighter accounts are supported.
         * Premium accounts pay nonzero maker/taker fees whose wire unit is
         * unverified — serving their history would show financially false zero
         * fees, so the whole account-bound surface refuses instead.
         *
         * @param accountType - Venue account type code (0 = Standard).
         */
        _LighterProvider_assertStandardAccount.set(this, (accountType) => {
            // Fail closed: only a PROVEN Standard (type 0) account passes. A
            // missing account/type is not evidence of Standard.
            if (accountType === undefined) {
                throw new Error(`${lighterConfig_js_1.LIGHTER_UNSUPPORTED_CAPABILITY_PREFIX} account type could not be verified (account not found); refusing to assume a Standard account`);
            }
            if (accountType !== 0) {
                throw new Error(`${lighterConfig_js_1.LIGHTER_UNSUPPORTED_CAPABILITY_PREFIX} Premium accounts are not supported yet: their fee semantics are unverified and history would be financially incorrect`);
            }
        });
        /**
         * Whether an error is an explicit capability gate (unsupported account
         * tier / unverified fee semantics). These must SURFACE to callers —
         * swallowing them into empty state would present false data.
         *
         * @param error - Caught error.
         * @returns True for capability-gate errors.
         */
        _LighterProvider_isUnsupportedCapabilityError.set(this, (error) => String(error).includes(lighterConfig_js_1.LIGHTER_UNSUPPORTED_CAPABILITY_PREFIX));
        _LighterProvider_isDataIntegrityError.set(this, (error) => String(error).includes(lighterConfig_js_1.LIGHTER_DATA_INTEGRITY_PREFIX));
        /**
         * TP/SL settlement expectations that timed out before becoming visible
         * on the venue's REST book, per symbol. While an entry exists, further
         * TP/SL mutations for that symbol must reconcile it first.
         */
        _LighterProvider_tpslUnsettled.set(this, new Map());
        /**
         * Session-global nonce reservation per `accountIndex:apiKeyIndex`.
         * Advanced at submission DISPATCH; consulted by every write-lock
         * section so a lagging nextNonce endpoint can never reissue a nonce an
         * earlier (possibly response-lost) submission may have consumed. A
         * reconciliation that PROVES a submission never landed (exact-hash
         * not-found after signed expiry) releases the reservation again.
         */
        _LighterProvider_nonceReservations.set(this, new Map());
        /** Monotonic source for journal operation ids within this session. */
        _LighterProvider_tpslOperationCounter.set(this, 0);
        /** This provider's bridge-client ownership identity (set at setup). */
        _LighterProvider_signerIdentity.set(this, null);
        /**
         * Parameters to re-create OUR venue client on the shared bridge. The
         * wallet-derived seed is NEVER retained here — it is re-derived under
         * the bridge lease each time re-establishment is needed.
         */
        _LighterProvider_signerRecreateParams.set(this, null);
        /**
         * Durable dispatch-ledger key: every nonce-consuming submission is
         * recorded here BEFORE dispatch so a restart can never reissue a nonce
         * whose outcome is unknown, and a proven never-landed dispatch can
         * release its nonce for the venue to consume.
         *
         * @param accountIndex - Venue account index.
         * @returns The disk-cache key.
         */
        _LighterProvider_nonceLedgerKey.set(this, (accountIndex) => `lighterNonceLedger:${__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'}:${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}`);
        /**
         * Read and strictly validate the durable dispatch ledger. Corruption
         * fails CLOSED (writes stay blocked) — guessing at nonce state could
         * duplicate or wedge submissions.
         *
         * @param accountIndex - Venue account index.
         * @returns The ledger document (consumed-nonce watermark + unresolved
         * dispatch entries).
         */
        _LighterProvider_readNonceLedger.set(this, async (accountIndex) => {
            let raw;
            try {
                raw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(__classPrivateFieldGet(this, _LighterProvider_nonceLedgerKey, "f").call(this, accountIndex));
            }
            catch (error) {
                throw new Error(`Lighter nonce ledger read failed; refusing writes: ${(0, errorUtils_js_1.ensureError)(error, 'LighterProvider.#readNonceLedger').message}`);
            }
            if (raw === null) {
                return { consumedFloor: 0, entries: [], recovered: [] };
            }
            try {
                const parsed = JSON.parse(raw);
                // EXPLICIT schema evolution: earlier documents (v1 without the
                // consumed watermark, v2 without operation kind/intent) migrate in
                // place — calling valid outstanding dispatch state corrupt would
                // block writes permanently.
                const consumedFloor = parsed.version === 1 && parsed.consumedFloor === undefined
                    ? 0
                    : parsed.consumedFloor;
                if ((parsed.version === 1 ||
                    parsed.version === 2 ||
                    parsed.version === 3 ||
                    parsed.version === 4) &&
                    typeof consumedFloor === 'number' &&
                    Number.isSafeInteger(consumedFloor) &&
                    consumedFloor >= 0 &&
                    Array.isArray(parsed.entries) &&
                    parsed.entries.length <= 16 &&
                    parsed.entries.every((entry) => {
                        if (typeof entry !== 'object' || entry === null) {
                            return false;
                        }
                        const candidate = entry;
                        return (typeof candidate.nonce === 'number' &&
                            Number.isSafeInteger(candidate.nonce) &&
                            candidate.nonce >= 0 &&
                            (candidate.txHash === null ||
                                typeof candidate.txHash === 'string') &&
                            (candidate.expiresAt === null ||
                                (typeof candidate.expiresAt === 'number' &&
                                    Number.isSafeInteger(candidate.expiresAt) &&
                                    candidate.expiresAt > 0)));
                    })) {
                    // STRICT bounded validation of the recovered list; malformed
                    // rows are dropped (they are observability records, never nonce
                    // state), and the list is capped.
                    const recoveredRaw = Array.isArray(parsed.recovered)
                        ? parsed.recovered
                        : [];
                    const recovered = recoveredRaw
                        .filter((row) => {
                        if (typeof row !== 'object' || row === null) {
                            return false;
                        }
                        const candidate = row;
                        return (typeof candidate.recoveryId === 'string' &&
                            candidate.recoveryId.length >= 1 &&
                            candidate.recoveryId.length <= 160 &&
                            typeof candidate.kind === 'number' &&
                            typeof candidate.intent === 'string' &&
                            candidate.intent.length <= 200 &&
                            (candidate.txHash === null ||
                                typeof candidate.txHash === 'string') &&
                            (candidate.outcome === 'succeeded' ||
                                candidate.outcome === 'failed' ||
                                candidate.outcome === 'unknown') &&
                            typeof candidate.evidence === 'string');
                    })
                        .slice(0, 32);
                    return {
                        consumedFloor,
                        entries: parsed.entries.map((entry) => ({
                            ...entry,
                            // v1-v3 migration: kind/intent/owner unknown.
                            kind: typeof entry.kind === 'number' ? entry.kind : -1,
                            intent: typeof entry.intent === 'string' ? entry.intent : 'unknown',
                            owner: typeof entry.owner === 'string' ? entry.owner : null,
                        })),
                        recovered,
                    };
                }
            }
            catch {
                // fall through to fail closed
            }
            throw new Error('Lighter nonce dispatch ledger is corrupt; refusing further writes until it is resolved');
        });
        /**
         * Persist the dispatch ledger document.
         *
         * @param accountIndex - Venue account index.
         * @param doc - The ledger document.
         * @param doc.consumedFloor - Highest proven-consumed nonce + 1.
         * @param doc.entries - Unresolved dispatch entries.
         */
        _LighterProvider_writeNonceLedger.set(this, async (accountIndex, doc) => {
            await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.setItem(__classPrivateFieldGet(this, _LighterProvider_nonceLedgerKey, "f").call(this, accountIndex), JSON.stringify({ version: 4, ...doc }));
        });
        /**
         * Resolve one dispatch entry as CONSUMED: remove it and advance the
         * durable consumed-nonce watermark so no later (stale) reconciliation
         * can ever release the nonce back.
         *
         * @param accountIndex - Venue account index.
         * @param entry - The consumed entry.
         * @param entry.nonce - The dispatched nonce.
         * @param entry.txHash - The dispatched tx hash (or null).
         */
        /**
         * EVERY ledger read-modify-write (append, resolve, consumed-resolve,
         * selective acknowledgment) serializes on this ONE process-wide mutex
         * per account+slot document. The venue write mutex alone cannot
         * protect the document: `acknowledgeRecoveredDispatch` legitimately
         * runs OUTSIDE it, and an unserialized ack RMW could overwrite a
         * concurrent append with a stale doc — silently erasing an unresolved
         * dispatch entry. Lock order is always venueWrite → bridge → ledger
         * (the ack path takes only the ledger mutex), so no cycle exists.
         *
         * @param accountIndex - Venue account index.
         * @param operation - The ledger RMW critical section.
         * @returns The operation's result.
         */
        _LighterProvider_withLedgerLock.set(this, async (accountIndex, operation) => await withProcessMutex(__classPrivateFieldGet(this, _LighterProvider_nonceLedgerKey, "f").call(this, accountIndex), operation));
        /**
         * ATOMIC post-dispatch entry transition, decided by the session fence
         * BEFORE any ledger mutation: fence passed → the entry is consumed and
         * removed (watermark advances); fence failed → the entry converts to a
         * durable recovered SUCCEEDED outcome (the venue mutation is committed
         * and a later retry under the original account would double the
         * financial intent). Both shapes land in ONE write under the ledger
         * lock — if that write fails, the ORIGINAL unresolved entry remains
         * the durable record and every retry stays blocked. The entry is never
         * consumed first and quarantined second. TP/SL-journal-owned entries
         * are consumed without quarantine in both cases (their machine
         * reconciles the intent by exact hash).
         *
         * @param accountIndex - Venue account index of the ORIGINAL session.
         * @param entry - The dispatched (accepted) ledger entry.
         * @param fenceFailed - Whether the post-send session fence rejected.
         * @returns Resolves when the transition is durably committed.
         */
        _LighterProvider_resolveEntryPostDispatch.set(this, async (accountIndex, entry, fenceFailed) => await __classPrivateFieldGet(this, _LighterProvider_withLedgerLock, "f").call(this, accountIndex, async () => {
            const doc = await __classPrivateFieldGet(this, _LighterProvider_readNonceLedger, "f").call(this, accountIndex);
            const at = doc.entries.findIndex((candidate) => candidate.nonce === entry.nonce && candidate.txHash === entry.txHash);
            if (at >= 0) {
                doc.entries.splice(at, 1);
            }
            doc.consumedFloor = Math.max(doc.consumedFloor, entry.nonce + 1);
            if (fenceFailed && entry.owner === null) {
                const recoveryId = `${String(entry.nonce)}:${entry.txHash ?? 'nohash'}`;
                if (!doc.recovered.some((outcome) => outcome.recoveryId === recoveryId)) {
                    doc.recovered = [
                        ...doc.recovered,
                        {
                            recoveryId,
                            kind: entry.kind,
                            intent: entry.intent,
                            txHash: entry.txHash,
                            outcome: 'succeeded',
                            evidence: 'post-dispatch-session-cancelled',
                        },
                    ].slice(0, 32);
                }
            }
            await __classPrivateFieldGet(this, _LighterProvider_writeNonceLedger, "f").call(this, accountIndex, doc);
        }));
        /**
         * Resolve every unresolved dispatch before a write section may issue
         * nonces. Consumption is proven by REST-nonce advance or an exact tx
         * lookup verifying the FULL identity (hash + account + api-key slot +
         * nonce + a numeric venue status); never-landed is proven ONLY by
         * venue-confirmed absence of the exact HASH after the signed validity
         * elapsed. A hashless dispatch can never be proven absent — it stays
         * blocking until the venue advances. Ambiguity blocks the write.
         * Runs under the account+slot ledger lock.
         *
         * @param accountIndex - Venue account index.
         * @returns Resolves when every prior dispatch is accounted for.
         */
        _LighterProvider_resolveNonceLedger.set(this, async (accountIndex) => await __classPrivateFieldGet(this, _LighterProvider_withLedgerLock, "f").call(this, accountIndex, async () => __classPrivateFieldGet(this, _LighterProvider_resolveNonceLedgerLocked, "f").call(this, accountIndex)));
        /**
         * @param accountIndex - Venue account index.
         * @returns Resolves when the pass completes.
         */
        _LighterProvider_resolveNonceLedgerLocked.set(this, async (accountIndex) => {
            const doc = await __classPrivateFieldGet(this, _LighterProvider_readNonceLedger, "f").call(this, accountIndex);
            const reservationKey = `${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}`;
            // The durable consumed watermark always seeds the memory floor.
            if (doc.consumedFloor > 0) {
                const floor = __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").get(reservationKey) ?? 0;
                __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").set(reservationKey, Math.max(floor, doc.consumedFloor));
            }
            // QUARANTINE CHECK FIRST: unacknowledged recovered outcomes block
            // EVERY retry, including retries arriving when no unresolved
            // entries remain — an early empty-entries return here would let the
            // second retry sail past the quarantine.
            const throwIfQuarantined = () => {
                const blocking = doc.recovered.filter((outcome) => outcome.outcome !== 'failed');
                if (blocking.length > 0) {
                    throw new Error(`A previous Lighter submission believed failed actually ${blocking.some((outcome) => outcome.outcome === 'succeeded') ? 'completed' : 'landed with an UNKNOWN outcome'} (${blocking
                        .map((outcome) => outcome.intent)
                        .join(', ')}); refresh state and call acknowledgeRecoveredDispatch before retrying`);
                }
            };
            throwIfQuarantined();
            if (doc.entries.length === 0) {
                return;
            }
            const quarantine = (entry, outcome, evidence) => {
                // TP/SL-journal-OWNED dispatches resolve through their own state
                // machine (journal attempts + exact-hash reconciliation) — they
                // are never parked behind the generic acknowledgment.
                if (entry.owner !== null) {
                    return;
                }
                doc.recovered.push({
                    recoveryId: `${String(entry.nonce)}:${entry.txHash ?? 'nohash'}`,
                    kind: entry.kind,
                    intent: entry.intent,
                    txHash: entry.txHash,
                    outcome,
                    evidence,
                });
            };
            const nonceResponse = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getNextNonce(accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
            const remaining = [];
            for (const entry of doc.entries) {
                if (entry.txHash === null && nonceResponse.nonce > entry.nonce) {
                    // Only the nonce ADVANCE is proven (possibly by another device):
                    // the intent's own fate is UNKNOWN — never reported completed.
                    doc.consumedFloor = Math.max(doc.consumedFloor, entry.nonce + 1);
                    const floor = __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").get(reservationKey) ?? 0;
                    __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").set(reservationKey, Math.max(floor, entry.nonce + 1));
                    quarantine(entry, 'unknown', 'rest-advance');
                    continue;
                }
                if (entry.txHash !== null) {
                    let lookedUp;
                    try {
                        lookedUp = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getTx(entry.txHash);
                    }
                    catch {
                        // Lookup failure is AMBIGUITY, never evidence either way: the
                        // entry stays and the write remains blocked.
                        remaining.push(entry);
                        continue;
                    }
                    if (lookedUp !== null) {
                        const matchesIdentity = typeof lookedUp.hash === 'string' &&
                            lookedUp.hash.toLowerCase().replace(/^0x/u, '') ===
                                entry.txHash.toLowerCase().replace(/^0x/u, '') &&
                            lookedUp.accountIndex === accountIndex &&
                            lookedUp.apiKeyIndex === __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f") &&
                            lookedUp.nonce === entry.nonce &&
                            typeof lookedUp.status === 'number';
                        if (matchesIdentity) {
                            doc.consumedFloor = Math.max(doc.consumedFloor, entry.nonce + 1);
                            const floor = __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").get(reservationKey) ?? 0;
                            __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").set(reservationKey, Math.max(floor, entry.nonce + 1));
                            // The EXACT tx status decides the intent's fate: executed →
                            // succeeded (blocking until acknowledged); failed/rejected →
                            // retry-safe FAILURE (recorded, non-blocking); anything else
                            // still pending → keep blocking as unresolved.
                            if (lookedUp.status === 4 || lookedUp.status === 5) {
                                quarantine(entry, 'failed', `tx-status:${String(lookedUp.status)}`);
                            }
                            else if (lookedUp.status === 3) {
                                quarantine(entry, 'succeeded', 'tx-status:3');
                            }
                            else {
                                quarantine(entry, 'unknown', `tx-status:${String(lookedUp.status ?? -1)}`);
                            }
                            continue;
                        }
                        // A DIFFERENT payload under this hash: ambiguity, fail closed.
                        remaining.push(entry);
                        continue;
                    }
                    if (nonceResponse.nonce > entry.nonce) {
                        // The venue moved past this nonce while OUR exact hash is
                        // absent: another dispatch (e.g. a second device) consumed it.
                        // Our payload can never land now — retry-safe never-landed,
                        // no quarantine; the floor advances with the venue.
                        doc.consumedFloor = Math.max(doc.consumedFloor, entry.nonce + 1);
                        const floor = __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").get(reservationKey) ?? 0;
                        __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").set(reservationKey, Math.max(floor, entry.nonce + 1));
                        continue;
                    }
                    if (entry.expiresAt !== null &&
                        Date.now() > entry.expiresAt + LIGHTER_TX_EXPIRY_SLACK_MS) {
                        // Venue-confirmed absent after the signed validity: PROVEN
                        // never landed — the venue still expects this nonce (unless a
                        // later dispatch already consumed it: consumedFloor guards).
                        if (entry.nonce >= doc.consumedFloor) {
                            __classPrivateFieldGet(this, _LighterProvider_releaseNonceReservation, "f").call(this, accountIndex, entry.nonce);
                        }
                        continue;
                    }
                }
                // Hashless, or hash present but unexpired-and-absent: ambiguous.
                remaining.push(entry);
            }
            await __classPrivateFieldGet(this, _LighterProvider_writeNonceLedger, "f").call(this, accountIndex, {
                consumedFloor: doc.consumedFloor,
                entries: remaining,
                recovered: doc.recovered,
            });
            if (remaining.length > 0) {
                throw new Error('A previous Lighter submission has an unresolved outcome; writes are blocked until it can be proven consumed or never-landed');
            }
            // RECOVERED-OUTCOME quarantine: succeeded/unknown outcomes block
            // every subsequent write until selectively acknowledged (a blind
            // retry could double the financial intent). FAILED outcomes are
            // retry-safe and never block.
            throwIfQuarantined();
        });
        /**
         * Release a nonce reservation for a PROVEN never-landed dispatch —
         * refused when the durable consumed watermark shows a later dispatch
         * (e.g. a retry) already consumed the nonce.
         *
         * @param accountIndex - Venue account index.
         * @param nonce - The proven-unconsumed nonce.
         */
        _LighterProvider_releaseNonceReservationIfUnconsumed.set(this, async (accountIndex, nonce) => {
            const doc = await __classPrivateFieldGet(this, _LighterProvider_readNonceLedger, "f").call(this, accountIndex).catch(() => null);
            if (doc === null || nonce < doc.consumedFloor) {
                return;
            }
            __classPrivateFieldGet(this, _LighterProvider_releaseNonceReservation, "f").call(this, accountIndex, nonce);
        });
        /**
         * Durable TP/SL journal key (network + address + accountIndex + symbol
         * scoped): the in-memory map alone cannot survive app/WebView/provider
         * death between venue commit and visibility.
         *
         * @param settlementKey - address:accountIndex:symbol identity.
         * @returns The disk-cache key.
         */
        _LighterProvider_tpslJournalKey.set(this, (settlementKey) => `lighterTpslJournal:${__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'}:${settlementKey}`);
        /**
         * Operation-scoped journal payload key: each operation's journal lives
         * under its OWN key so a stale resolver physically cannot overwrite or
         * delete a newer operation's payload — only its own.
         *
         * @param settlementKey - Settlement identity.
         * @param operationId - The operation identity.
         * @returns The disk-cache key.
         */
        _LighterProvider_tpslJournalOpKey.set(this, (settlementKey, operationId) => `lighterTpslJournalOp:${__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'}:${settlementKey}:${operationId}`);
        /**
         * Load and strictly validate a persisted journal entry. Malformed or
         * unsupported disk data BLOCKS protection changes (fail closed) — it is
         * never trusted into signing decisions nor silently dropped.
         *
         * @param settlementKey - Settlement identity.
         * @returns The validated entry, or null.
         */
        _LighterProvider_loadTpslJournal.set(this, async (settlementKey) => {
            const key = __classPrivateFieldGet(this, _LighterProvider_tpslJournalKey, "f").call(this, settlementKey);
            // FAIL CLOSED on read failure and on corruption: turning either into
            // "no entry" would erase exactly the uncertainty this journal exists
            // to preserve and could duplicate a committed mutation. Malformed
            // data is NOT auto-removed — it blocks until inspected/resolved.
            let baseRaw;
            try {
                baseRaw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(key);
            }
            catch (error) {
                throw new Error(`Lighter TP/SL journal read failed for ${settlementKey}; refusing protection changes: ${(0, errorUtils_js_1.ensureError)(error, 'LighterProvider.#loadTpslJournal').message}`);
            }
            if (baseRaw === null) {
                return null;
            }
            // The base key holds either a POINTER to an operation-scoped payload
            // (code-written journals: a stale writer physically cannot destroy a
            // newer operation's payload) or a legacy inline journal.
            let raw = baseRaw;
            const pointer = parseTpslJournalPointer(baseRaw);
            if (pointer !== null) {
                const payloadRaw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalOpKey, "f").call(this, settlementKey, pointer.operationId));
                if (payloadRaw === null) {
                    // Dangling pointer (payload already resolved elsewhere).
                    return null;
                }
                raw = payloadRaw;
            }
            let parsed;
            try {
                parsed = JSON.parse(raw);
            }
            catch {
                throw new Error(`Lighter TP/SL journal for ${settlementKey} is corrupt; refusing protection changes until it is resolved`);
            }
            const isWireId = (value) => typeof value === 'number' &&
                Number.isSafeInteger(value) &&
                value > 0 &&
                value < 2 ** 48;
            const isNonce = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
            const isOrderIdString = (value) => typeof value === 'string' && /^\d{1,20}$/u.test(value);
            const isTxHash = (value) => typeof value === 'string' && /^(0x)?[0-9a-fA-F]{8,128}$/u.test(value);
            const isExpiry = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
            const isAttempt = (value) => {
                if (typeof value !== 'object' || value === null) {
                    return false;
                }
                const attempt = value;
                if (!isNonce(attempt.nonce) ||
                    typeof attempt.attemptId !== 'number' ||
                    !Number.isSafeInteger(attempt.attemptId) ||
                    attempt.attemptId < 1 ||
                    (attempt.terminalStatus !== undefined &&
                        (typeof attempt.terminalStatus !== 'number' ||
                            !Number.isSafeInteger(attempt.terminalStatus))) ||
                    (attempt.outcome !== 'unknown' && attempt.outcome !== 'accepted') ||
                    !isTxHash(attempt.txHash) ||
                    !isExpiry(attempt.expiresAt)) {
                    return false;
                }
                if (attempt.kind === 'create') {
                    return (attempt.orderId === undefined &&
                        (attempt.role === 'replacement' || attempt.role === 'restore') &&
                        // priorOrderIds durably key WHICH prior intents a restore
                        // restores, INDEX-ALIGNED with clientIds; REQUIRED on
                        // restores, forbidden on replacements.
                        (attempt.role === 'restore'
                            ? Array.isArray(attempt.priorOrderIds) &&
                                Array.isArray(attempt.clientIds) &&
                                attempt.priorOrderIds.length === attempt.clientIds.length &&
                                attempt.priorOrderIds.every(isOrderIdString)
                            : attempt.priorOrderIds === undefined) &&
                        Array.isArray(attempt.clientIds) &&
                        attempt.clientIds.length >= 1 &&
                        attempt.clientIds.length <= 2 &&
                        attempt.clientIds.every(isWireId) &&
                        new Set(attempt.clientIds).size === attempt.clientIds.length);
                }
                if (attempt.kind === 'cancel') {
                    return (attempt.clientIds === undefined &&
                        (attempt.role === 'stale' || attempt.role === 'rollback') &&
                        isOrderIdString(attempt.orderId));
                }
                return false;
            };
            // Recovery SIGNS from these values: they must be strict, finite and
            // strictly positive before they can reach the wire.
            const isPositiveDecimalString = (value) => {
                if (typeof value !== 'string') {
                    return false;
                }
                const numeric = parseStrictDecimal(value);
                return numeric !== null && Number.isFinite(numeric) && numeric > 0;
            };
            const isPriorTrigger = (value) => {
                if (typeof value !== 'object' || value === null) {
                    return false;
                }
                const trigger = value;
                return (isOrderIdString(trigger.orderId) &&
                    (trigger.side === 'buy' || trigger.side === 'sell') &&
                    (trigger.wireOrderType === 2 ||
                        trigger.wireOrderType === 3 ||
                        trigger.wireOrderType === 4 ||
                        trigger.wireOrderType === 5) &&
                    (trigger.wireTimeInForce === 0 ||
                        trigger.wireTimeInForce === 1 ||
                        trigger.wireTimeInForce === 2) &&
                    typeof trigger.orderExpiry === 'number' &&
                    Number.isSafeInteger(trigger.orderExpiry) &&
                    trigger.orderExpiry >= -1 &&
                    isPositiveDecimalString(trigger.price) &&
                    isPositiveDecimalString(trigger.triggerPrice) &&
                    isPositiveDecimalString(trigger.remainingSize));
            };
            // EXPLICIT remediation policy for early schemas (v1/v2): their
            // transition state cannot be interpreted safely, so instead of a
            // permanent opaque block they convert to a DURABLE MANUAL-recovery
            // state — surfaced to the user, resolved only by an explicit new
            // protection intent.
            if (parsed.version === 1 || parsed.version === 2) {
                return {
                    attempts: [],
                    recordedAt: typeof parsed.recordedAt === 'number' ? parsed.recordedAt : 0,
                    operationId: typeof parsed.operationId === 'string' &&
                        parsed.operationId.length > 0
                        ? parsed.operationId
                        : `legacy-v${String(parsed.version)}`,
                    createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : 0,
                    nextAttemptId: 1,
                    intent: 'replace',
                    phase: 'manual',
                    priorGrouping: 'independent',
                    priorTriggers: [],
                };
            }
            if ((parsed.version === 3 || parsed.version === 4) &&
                typeof parsed.recordedAt === 'number' &&
                Number.isSafeInteger(parsed.recordedAt) &&
                parsed.recordedAt >= 0 &&
                // The journal is bound to ONE api-key slot: nonces are per slot.
                parsed.apiKeyIndex === __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f") &&
                typeof parsed.operationId === 'string' &&
                parsed.operationId.length >= 1 &&
                parsed.operationId.length <= 64 &&
                typeof parsed.createdAt === 'number' &&
                Number.isSafeInteger(parsed.createdAt) &&
                parsed.createdAt >= 0 &&
                typeof parsed.nextAttemptId === 'number' &&
                Number.isSafeInteger(parsed.nextAttemptId) &&
                parsed.nextAttemptId >= 1 &&
                // An explicit durable operation intent is REQUIRED: without it a
                // remove could be misread as a failed replacement.
                (parsed.intent === 'replace' || parsed.intent === 'remove') &&
                (parsed.phase === 'creating' ||
                    parsed.phase === 'cancelling' ||
                    // v3's 'restoring' migrates to 'manual' below.
                    parsed.phase === 'restoring' ||
                    parsed.phase === 'manual') &&
                // 'oco' grouping structurally requires the linked pair.
                (parsed.priorGrouping === 'independent' ||
                    (parsed.priorGrouping === 'oco' &&
                        Array.isArray(parsed.priorTriggers) &&
                        parsed.priorTriggers.length === 2)) &&
                Array.isArray(parsed.priorTriggers) &&
                parsed.priorTriggers.length <= 4 &&
                parsed.priorTriggers.every(isPriorTrigger) &&
                new Set(parsed.priorTriggers.map((trigger) => trigger.orderId)).size ===
                    parsed.priorTriggers.length &&
                Array.isArray(parsed.attempts) &&
                // An EMPTY journal is malformed — empty-but-shape-valid would be
                // accepted and silently cleared.
                parsed.attempts.length >= 1 &&
                parsed.attempts.length <= 40 &&
                parsed.attempts.every(isAttempt) &&
                // Attempt IDENTITY is the attemptId — nonces may legitimately
                // repeat when a proven-never-landed submission is retried. The
                // durable allocator must sit strictly ABOVE every recorded id so
                // compaction can never recycle one.
                new Set(parsed.attempts.map((entry) => entry.attemptId)).size ===
                    parsed.attempts.length &&
                parsed.attempts.every((entry) => entry.attemptId < parsed.nextAttemptId)) {
                const { attempts } = parsed;
                const { priorTriggers } = parsed;
                // Every restore leg must link to a persisted prior intent — an
                // unlinked restore could sign a duplicate or orphan a prior one.
                const restoresLinked = attempts.every((attempt) => attempt.kind !== 'create' ||
                    attempt.role !== 'restore' ||
                    (attempt.priorOrderIds ?? []).every((priorOrderId) => priorTriggers.some((trigger) => trigger.orderId === priorOrderId)));
                if (restoresLinked) {
                    return {
                        attempts,
                        recordedAt: parsed.recordedAt,
                        operationId: parsed.operationId,
                        createdAt: parsed.createdAt,
                        nextAttemptId: parsed.nextAttemptId,
                        intent: parsed.intent,
                        // v3 MIGRATION: an interrupted 'restoring' operation predates
                        // the no-auto-restore policy — it parks as MANUAL.
                        phase: parsed.phase === 'restoring' ? 'manual' : parsed.phase,
                        priorGrouping: parsed.priorGrouping,
                        priorTriggers,
                    };
                }
            }
            throw new Error(`Lighter TP/SL journal for ${settlementKey} is malformed; refusing protection changes until it is resolved`);
        });
        /**
         * Durable index of settlement keys with pending journals.
         *
         * @returns The disk-cache key of the index.
         */
        _LighterProvider_tpslJournalIndexKey.set(this, () => `lighterTpslJournalIndex:${__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'}`);
        /**
         * Read the durable journal index (strictly validated; failures fail
         * closed by throwing).
         *
         * @returns The list of settlement keys with pending journals.
         */
        _LighterProvider_readTpslJournalIndex.set(this, async () => {
            const raw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalIndexKey, "f").call(this));
            if (raw === null) {
                return [];
            }
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) &&
                    parsed.length <= 64 &&
                    parsed.every((entry) => typeof entry === 'string')) {
                    return parsed;
                }
            }
            catch {
                // fall through
            }
            throw new Error('Lighter TP/SL journal index is corrupt');
        });
        /**
         * Durable manual-recovery doc key (separate from the journal slot).
         *
         * @param settlementKey - Settlement identity.
         * @returns The disk-cache key.
         */
        _LighterProvider_tpslManualKey.set(this, (settlementKey) => `lighterTpslManual:${__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'}:${settlementKey}`);
        /**
         * Manual-recovery index key.
         *
         * @returns The disk-cache key.
         */
        _LighterProvider_tpslManualIndexKey.set(this, () => `lighterTpslManualIndex:${__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'}`);
        /**
         * Read the manual-recovery index. Corruption THROWS — a parked
         * protection warning silently degrading to "nothing pending" would
         * hide a naked position.
         *
         * @returns Settlement keys with pending manual recoveries.
         */
        _LighterProvider_readTpslManualIndex.set(this, async () => {
            const raw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(__classPrivateFieldGet(this, _LighterProvider_tpslManualIndexKey, "f").call(this));
            if (raw === null) {
                return [];
            }
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) &&
                    parsed.length <= 64 &&
                    parsed.every((entry) => typeof entry === 'string')) {
                    return parsed;
                }
            }
            catch {
                // fall through
            }
            throw new Error('Lighter TP/SL manual-recovery index is corrupt');
        });
        /**
         * Durably record a manual-recovery warning (doc + index entry).
         *
         * @param doc - The manual-recovery record.
         */
        _LighterProvider_writeTpslManualRecovery.set(this, async (doc) => {
            await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.setItem(__classPrivateFieldGet(this, _LighterProvider_tpslManualKey, "f").call(this, doc.settlementKey), JSON.stringify({ version: 1, ...doc }));
            await withStorageMutex(__classPrivateFieldGet(this, _LighterProvider_tpslManualIndexKey, "f").call(this), async () => {
                const index = await __classPrivateFieldGet(this, _LighterProvider_readTpslManualIndex, "f").call(this);
                if (!index.includes(doc.settlementKey)) {
                    await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.setItem(__classPrivateFieldGet(this, _LighterProvider_tpslManualIndexKey, "f").call(this), JSON.stringify([...index, doc.settlementKey].slice(0, 64)));
                }
            });
        });
        /**
         * Load a manual-recovery record. Corruption THROWS (never null) so a
         * parked warning cannot silently vanish.
         *
         * @param settlementKey - Settlement identity.
         * @returns The record, or null when none is parked.
         */
        _LighterProvider_loadTpslManualRecovery.set(this, async (settlementKey) => {
            const raw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(__classPrivateFieldGet(this, _LighterProvider_tpslManualKey, "f").call(this, settlementKey));
            if (raw === null) {
                return null;
            }
            try {
                const parsed = JSON.parse(raw);
                if (parsed.version === 1 &&
                    typeof parsed.settlementKey === 'string' &&
                    typeof parsed.symbol === 'string' &&
                    typeof parsed.reason === 'string' &&
                    parsed.reason.length <= 500 &&
                    (parsed.priorIntent === 'replace' || parsed.priorIntent === 'remove') &&
                    Array.isArray(parsed.priorTriggers) &&
                    Array.isArray(parsed.survivingOrderIds) &&
                    parsed.survivingOrderIds.every((id) => typeof id === 'string') &&
                    typeof parsed.operationId === 'string' &&
                    typeof parsed.recordedAt === 'number') {
                    return {
                        settlementKey: parsed.settlementKey,
                        symbol: parsed.symbol,
                        reason: parsed.reason,
                        priorIntent: parsed.priorIntent,
                        priorTriggers: parsed.priorTriggers,
                        survivingOrderIds: parsed.survivingOrderIds,
                        operationId: parsed.operationId,
                        recordedAt: parsed.recordedAt,
                    };
                }
            }
            catch {
                // fall through to fail closed
            }
            throw new Error(`Lighter TP/SL manual-recovery record for ${settlementKey} is corrupt; resolve storage before proceeding`);
        });
        /**
         * Clear a manual-recovery record — called ONLY after a successor
         * protection intent has authoritatively succeeded.
         *
         * @param settlementKey - Settlement identity.
         */
        _LighterProvider_clearTpslManualRecovery.set(this, async (settlementKey) => {
            await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.removeItem(__classPrivateFieldGet(this, _LighterProvider_tpslManualKey, "f").call(this, settlementKey));
            await withStorageMutex(__classPrivateFieldGet(this, _LighterProvider_tpslManualIndexKey, "f").call(this), async () => {
                const index = await __classPrivateFieldGet(this, _LighterProvider_readTpslManualIndex, "f").call(this);
                if (index.includes(settlementKey)) {
                    await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.setItem(__classPrivateFieldGet(this, _LighterProvider_tpslManualIndexKey, "f").call(this), JSON.stringify(index.filter((entry) => entry !== settlementKey)));
                }
            });
        });
        /**
         * Persist a journal entry durably and ensure the index lists its key so
         * restart recovery can enumerate pending obligations without waiting
         * for the next mutation.
         *
         * @param settlementKey - Settlement identity.
         * @param journal - The journal entry.
         */
        _LighterProvider_persistTpslJournal.set(this, async (settlementKey, journal) => {
            // WRITER-SIDE capacity enforcement, mirrored from the loader: a
            // journal the loader would reject as malformed must never be written
            // in the first place. Throwing here aborts BEFORE the submission the
            // entry was journalling, with every older obligation intact.
            if (journal.priorTriggers.length > 4) {
                throw new Error(`Lighter TP/SL journal for ${settlementKey} would record too many prior triggers (${journal.priorTriggers.length} > 4); refusing the mutation`);
            }
            if (journal.attempts.length > 40) {
                throw new Error(`Lighter TP/SL journal for ${settlementKey} would record too many attempts (${journal.attempts.length} > 40); refusing further submissions until pending obligations resolve`);
            }
            // INDEX-FIRST: a dangling index entry (no journal behind it) is
            // safely prunable by recovery, whereas compensating a failed index
            // write by removing the journal could erase an EXISTING authoritative
            // journal holding already-accepted attempts. Any failure here aborts
            // BEFORE the next submission with every older obligation intact.
            // Index RMW under its OWN process-wide mutex: concurrent persists
            // for different settlement keys must never lose each other's entry.
            await withStorageMutex(__classPrivateFieldGet(this, _LighterProvider_tpslJournalIndexKey, "f").call(this), async () => {
                const index = await __classPrivateFieldGet(this, _LighterProvider_readTpslJournalIndex, "f").call(this);
                if (!index.includes(settlementKey)) {
                    if (index.length >= 64) {
                        // NEVER evict a live obligation: fail the mutation before
                        // submission instead.
                        throw new Error('Lighter TP/SL journal index is full; refusing further protection changes until pending obligations resolve');
                    }
                    await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.setItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalIndexKey, "f").call(this), JSON.stringify([...index, settlementKey]));
                }
            });
            const baseKey = __classPrivateFieldGet(this, _LighterProvider_tpslJournalKey, "f").call(this, settlementKey);
            // The pointer read-modify-write is serialized PROCESS-WIDE: the
            // instance-local write lock cannot protect two live provider
            // instances sharing one disk cache.
            await withStorageMutex(baseKey, async () => {
                // COMPARE-AND-SWAP on the operation identity: a writer holding a
                // stale snapshot must never take over a DIFFERENT operation's
                // journal. (A missing journal is fine — first write of an op.)
                const currentRaw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(baseKey);
                const pointerAlreadyOurs = currentRaw !== null &&
                    parseTpslJournalPointer(currentRaw)?.operationId ===
                        journal.operationId;
                // A DANGLING pointer (payload already resolved; only the base
                // removal failed) has no live owner — it is claimable, otherwise a
                // partial clear would block every future operation forever.
                let danglingPointer = false;
                if (currentRaw !== null) {
                    const staleCheck = parseTpslJournalPointer(currentRaw);
                    if (staleCheck !== null &&
                        staleCheck.operationId !== journal.operationId) {
                        danglingPointer =
                            (await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalOpKey, "f").call(this, settlementKey, staleCheck.operationId))) === null;
                    }
                }
                if (currentRaw !== null && !danglingPointer) {
                    const pointer = parseTpslJournalPointer(currentRaw);
                    let currentOperationId = pointer?.operationId ?? null;
                    if (pointer === null) {
                        try {
                            currentOperationId = JSON.parse(currentRaw).operationId;
                        }
                        catch {
                            // Corrupt current journal: fail closed below via mismatch.
                        }
                    }
                    if (currentOperationId !== journal.operationId) {
                        throw new Error(`Lighter TP/SL journal for ${settlementKey} belongs to a different operation; refusing a stale write`);
                    }
                }
                // Payload first, under the operation's OWN key — then the pointer.
                await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.setItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalOpKey, "f").call(this, settlementKey, journal.operationId), JSON.stringify({
                    version: 4,
                    recordedAt: journal.recordedAt,
                    operationId: journal.operationId,
                    createdAt: journal.createdAt,
                    nextAttemptId: journal.nextAttemptId,
                    apiKeyIndex: __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"),
                    intent: journal.intent,
                    phase: journal.phase,
                    priorGrouping: journal.priorGrouping,
                    priorTriggers: journal.priorTriggers,
                    attempts: journal.attempts,
                }));
                try {
                    await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.setItem(baseKey, JSON.stringify({
                        pointerVersion: 1,
                        operationId: journal.operationId,
                    }));
                }
                catch (error) {
                    // Pointer write failed on the FIRST persist of this operation:
                    // remove the freshly written payload so no orphan accumulates.
                    // (When an earlier persist already pointed here, the payload is
                    // referenced durable state — keep it.)
                    if (!pointerAlreadyOurs) {
                        await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache
                            .removeItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalOpKey, "f").call(this, settlementKey, journal.operationId))
                            .catch(() => undefined);
                    }
                    throw error;
                }
            });
            // A NEW pending obligation invalidates any "recovery complete"
            // marker recorded earlier in this session — otherwise later read
            // kicks would skip it until a restart or another mutation.
            __classPrivateFieldSet(this, _LighterProvider_tpslRecoveryGeneration, -1, "f");
        });
        /**
         * Resolve a settlement obligation everywhere — compare-and-swap on the
         * operation identity: a resolver holding a STALE snapshot must never
         * erase a NEWER operation's journal. Disk removal failures PROPAGATE
         * and the in-memory entry is retained: silently dropping only the
         * memory copy would leave a stale durable obligation to wedge a later
         * session.
         *
         * @param settlementKey - Settlement identity.
         * @param expectedOperationId - The operation this resolver settled;
         * null prunes only a dangling index entry with NO journal behind it.
         * @returns True when the obligation was cleared (or already gone);
         * false when a NEWER operation owns the journal (unresolved).
         */
        _LighterProvider_clearTpslJournal.set(this, async (settlementKey, expectedOperationId) => {
            const journalKey = __classPrivateFieldGet(this, _LighterProvider_tpslJournalKey, "f").call(this, settlementKey);
            const cleared = await withStorageMutex(journalKey, async () => {
                const currentRaw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(journalKey);
                if (currentRaw === null) {
                    // Already resolved (or never journalled): nothing left to clear.
                    return true;
                }
                const pointer = parseTpslJournalPointer(currentRaw);
                if (pointer !== null) {
                    if (expectedOperationId === null) {
                        // Prune mode: only a DANGLING pointer may be pruned.
                        const payloadRaw = await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalOpKey, "f").call(this, settlementKey, pointer.operationId));
                        if (payloadRaw !== null) {
                            return false;
                        }
                        await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.removeItem(journalKey);
                        return true;
                    }
                    if (pointer.operationId !== expectedOperationId) {
                        // A NEWER operation owns the journal: remove only OUR OWN
                        // payload (physically incapable of touching theirs) and
                        // report the clear as unresolved.
                        __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] TP/SL journal clear refused: different operation', { settlementKey });
                        await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache
                            .removeItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalOpKey, "f").call(this, settlementKey, expectedOperationId))
                            .catch(() => undefined);
                        return false;
                    }
                    await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.removeItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalOpKey, "f").call(this, settlementKey, expectedOperationId));
                    await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.removeItem(journalKey);
                    return true;
                }
                // Legacy inline journal at the base key.
                if (expectedOperationId === null) {
                    return false;
                }
                let currentOperationId = null;
                try {
                    const inline = JSON.parse(currentRaw);
                    currentOperationId =
                        inline.operationId ??
                            // Early schemas carry no operation id: the loader synthesizes
                            // `legacy-v{n}` for their manual-remediation state — mirror it
                            // so the explicit new intent can clear them.
                            (inline.version === 1 || inline.version === 2
                                ? `legacy-v${String(inline.version)}`
                                : null);
                }
                catch {
                    // Corrupt journal is never silently cleared.
                }
                if (currentOperationId !== expectedOperationId) {
                    __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] TP/SL journal clear refused: different operation', { settlementKey });
                    return false;
                }
                await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.removeItem(journalKey);
                return true;
            });
            if (!cleared) {
                return false;
            }
            // Index removal under the index mutex, RE-VERIFYING the journal is
            // still gone: a newer operation may have persisted (journal +
            // index entry) between our clear and this removal — removing the
            // entry then would blind restart recovery to a live obligation.
            // A storage READ failure here is AMBIGUITY, never absence: it
            // propagates (the index entry is retained and the settlement stays
            // unresolved) — guessing could orphan a live obligation.
            await withStorageMutex(__classPrivateFieldGet(this, _LighterProvider_tpslJournalIndexKey, "f").call(this), async () => {
                const stillGone = (await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.getItem(journalKey)) === null;
                if (!stillGone) {
                    return;
                }
                const index = await __classPrivateFieldGet(this, _LighterProvider_readTpslJournalIndex, "f").call(this);
                if (index.includes(settlementKey)) {
                    await __classPrivateFieldGet(this, _LighterProvider_deps, "f").diskCache.setItem(__classPrivateFieldGet(this, _LighterProvider_tpslJournalIndexKey, "f").call(this), JSON.stringify(index.filter((entry) => entry !== settlementKey)));
                }
            });
            const memoryEntry = __classPrivateFieldGet(this, _LighterProvider_tpslUnsettled, "f").get(settlementKey);
            if (memoryEntry === undefined ||
                expectedOperationId === null ||
                memoryEntry.operationId === expectedOperationId) {
                __classPrivateFieldGet(this, _LighterProvider_tpslUnsettled, "f").delete(settlementKey);
            }
            return true;
        });
        /**
         * Targeted, cached, active-first inactive-history reader shared by the
         * mutation transition and recovery: terminal rows are immutable so they
         * cache across polls; page 1 per call; the deep cursor walk runs at
         * most ONCE per reader and stops when every target id is found.
         *
         * @param accountIndex - Captured account index.
         * @param authToken - Captured auth token.
         * @param generation - Captured session generation (fenced per read).
         * @param marketId - Market to scope inactive-history requests to.
         * @returns The reader closure.
         */
        _LighterProvider_makeInactiveReader.set(this, (accountIndex, authToken, generation, marketId) => {
            const terminalCache = new Map();
            let deepTraversalDone = false;
            return async (targetClientIds) => {
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                const targets = targetClientIds.map(String);
                const missing = () => targets.some((id) => !terminalCache.has(id));
                const ingest = (orders) => {
                    for (const order of orders) {
                        if (order.ownerAccountIndex === accountIndex) {
                            terminalCache.set(String(order.clientOrderIndex), order);
                        }
                    }
                };
                const firstPage = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getInactiveOrders(accountIndex, authToken, 100, undefined, marketId);
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                ingest(firstPage.orders);
                if (missing() && !deepTraversalDone) {
                    deepTraversalDone = true;
                    let cursor = firstPage.nextCursor;
                    for (let page = 0; page < 9 && cursor && missing(); page += 1) {
                        const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getInactiveOrders(accountIndex, authToken, 100, cursor, marketId);
                        __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                        ingest(response.orders);
                        cursor = response.nextCursor;
                    }
                }
                return [...terminalCache.values()];
            };
        });
        /** Session generation whose journal recovery fully resolved. */
        _LighterProvider_tpslRecoveryGeneration.set(this, -1);
        /** In-flight journal recovery (deduplicates concurrent triggers). */
        _LighterProvider_tpslRecoveryInFlight.set(this, null);
        /**
         * Detached, deduplicated recovery kick. Wired into signer setup AND the
         * public read paths: a recovery that returned unresolved (e.g. REST
         * visibility lag) must get another chance later in the SAME session,
         * not only at the next signer setup.
         */
        /** A kick arrived while a (possibly stale) recovery was in flight. */
        _LighterProvider_tpslRecoveryKickPending.set(this, false);
        _LighterProvider_kickTpslRecovery.set(this, () => {
            if (__classPrivateFieldGet(this, _LighterProvider_tpslRecoveryGeneration, "f") === __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                return;
            }
            if (__classPrivateFieldGet(this, _LighterProvider_tpslRecoveryInFlight, "f")) {
                // A stale-generation recovery may be finishing: remember this kick
                // so the CURRENT generation's journals are not silently skipped.
                __classPrivateFieldSet(this, _LighterProvider_tpslRecoveryKickPending, true, "f");
                return;
            }
            setTimeout(() => {
                __classPrivateFieldGet(this, _LighterProvider_recoverPendingTpslJournals, "f").call(this).catch((error) => {
                    __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] TP/SL journal recovery failed', { error: String(error) });
                });
            }, 0);
        });
        /**
         * Enumerate durable journal-index entries for the CURRENT identity and
         * recover each: reconcile, complete an interrupted replacement's stale
         * cancels when its created protection is live, then clear. Bounded and
         * deduplicated per session generation; unresolved entries stay for the
         * next attempt.
         */
        _LighterProvider_recoverPendingTpslJournals.set(this, async () => {
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            if (__classPrivateFieldGet(this, _LighterProvider_tpslRecoveryGeneration, "f") === generation) {
                return;
            }
            if (__classPrivateFieldGet(this, _LighterProvider_tpslRecoveryInFlight, "f")) {
                await __classPrivateFieldGet(this, _LighterProvider_tpslRecoveryInFlight, "f");
                return;
            }
            __classPrivateFieldSet(this, _LighterProvider_tpslRecoveryInFlight, (async () => {
                try {
                    // Index corruption/read failure PROPAGATES (logged by the hook):
                    // silently treating it as empty would disable recovery entirely.
                    const index = await __classPrivateFieldGet(this, _LighterProvider_readTpslJournalIndex, "f").call(this);
                    if (index.length === 0) {
                        __classPrivateFieldSet(this, _LighterProvider_tpslRecoveryGeneration, generation, "f");
                        return;
                    }
                    const address = __classPrivateFieldGet(this, _LighterProvider_boundAddress, "f");
                    if (!address) {
                        return;
                    }
                    const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                    const prefix = `${address}:${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}:`;
                    let allResolved = true;
                    for (const settlementKey of index) {
                        if (!settlementKey.startsWith(prefix)) {
                            continue;
                        }
                        const resolved = await __classPrivateFieldGet(this, _LighterProvider_recoverTpslSymbol, "f").call(this, settlementKey.slice(prefix.length), settlementKey, generation, accountIndex).catch((error) => {
                            // Surface the exact cause (corruption, transport, session
                            // fence) — the entry stays retryable, but never silently.
                            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] TP/SL journal entry recovery failed', {
                                settlementKey,
                                error: error instanceof Error
                                    ? (error.stack ?? error.message)
                                    : String(error),
                            });
                            return false;
                        });
                        if (!resolved) {
                            allResolved = false;
                        }
                    }
                    // Marked complete ONLY when everything resolved: unresolved or
                    // errored entries stay retryable within this session.
                    if (allResolved) {
                        __classPrivateFieldSet(this, _LighterProvider_tpslRecoveryGeneration, generation, "f");
                    }
                }
                finally {
                    __classPrivateFieldSet(this, _LighterProvider_tpslRecoveryInFlight, null, "f");
                    if (__classPrivateFieldGet(this, _LighterProvider_tpslRecoveryKickPending, "f")) {
                        __classPrivateFieldSet(this, _LighterProvider_tpslRecoveryKickPending, false, "f");
                        __classPrivateFieldGet(this, _LighterProvider_kickTpslRecovery, "f").call(this);
                    }
                }
            })(), "f");
            await __classPrivateFieldGet(this, _LighterProvider_tpslRecoveryInFlight, "f");
        });
        /**
         * Recover one pending TP/SL journal without any new protection intent.
         *
         * @param symbol - Market symbol from the settlement key.
         * @param settlementKey - Full settlement identity.
         * @param generation - Captured session generation.
         * @param accountIndex - Captured account index.
         * @returns True when the obligation fully resolved (journal cleared);
         * false when it remains pending and must be retried.
         */
        _LighterProvider_recoverTpslSymbol.set(this, async (symbol, settlementKey, generation, accountIndex) => {
            const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const market = markets.get(symbol);
            if (!market) {
                return false;
            }
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const authToken = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            return await __classPrivateFieldGet(this, _LighterProvider_withVenueWriteLock, "f").call(this, accountIndex, async (nextNonce, submit) => {
                // The journal is loaded INSIDE the lock: a snapshot taken while
                // waiting for the lock could be superseded by a foreground
                // operation that settles it and journals a NEW one — acting on
                // the stale snapshot could erase the newer obligation.
                const journalEntry = await __classPrivateFieldGet(this, _LighterProvider_loadTpslJournal, "f").call(this, settlementKey);
                if (!journalEntry) {
                    // Stale index entry with no journal behind it: prune.
                    return await __classPrivateFieldGet(this, _LighterProvider_clearTpslJournal, "f").call(this, settlementKey, null).catch(() => false);
                }
                const readActiveRaw = async () => {
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                    const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getActiveOrders(accountIndex, authToken);
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                    return response.orders;
                };
                const readInactiveFor = __classPrivateFieldGet(this, _LighterProvider_makeInactiveReader, "f").call(this, accountIndex, authToken, generation, market.marketId);
                return await __classPrivateFieldGet(this, _LighterProvider_settleTpslObligation, "f").call(this, {
                    settlementKey,
                    symbol,
                    journalEntry,
                    market,
                    accountIndex,
                    authToken,
                    generation,
                    readActiveRaw,
                    readInactiveFor,
                    nextNonce,
                    submit,
                });
            }, generation);
        });
        /**
         * THE TP/SL obligation state machine — the single implementation run by
         * startup/read-path recovery AND by a direct foreground update that
         * finds a pending journal. Reconciles every attempt authoritatively,
         * then acts per durable intent and phase, and clears the journal ONLY
         * on a fully-settled outcome.
         *
         * @param context - Captured settlement context.
         * @param context.settlementKey - Full settlement identity.
         * @param context.symbol - Market symbol.
         * @param context.journalEntry - The pending journal.
         * @param context.market - Market integerization parameters.
         * @param context.market.marketId - Venue market id.
         * @param context.market.supportedSizeDecimals - Size integerization decimals.
         * @param context.market.supportedPriceDecimals - Price integerization decimals.
         * @param context.accountIndex - Captured account index.
         * @param context.authToken - Captured venue auth token.
         * @param context.generation - Captured session generation.
         * @param context.readActiveRaw - Session-fenced raw active reader.
         * @param context.readInactiveFor - Targeted inactive reader.
         * @param context.nextNonce - Lock-section nonce issuer.
         * @param context.submit - Lock-section submitter.
         * @returns True when fully resolved (journal cleared); false when the
         * obligation remains pending and must be retried.
         */
        _LighterProvider_settleTpslObligation.set(this, async (context) => {
            const { settlementKey } = context;
            // The ENTIRE same-settlement state machine is serialized
            // PROCESS-WIDE: two live providers resolving the same operation
            // could otherwise both choose and submit identical restores/cancels
            // and overwrite each other's attempt state.
            return await withProcessMutex(`lighterTpslSettle:${__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'}:${settlementKey}`, async () => await __classPrivateFieldGet(this, _LighterProvider_settleTpslObligationLocked, "f").call(this, context));
        });
        /**
         * The settlement machine body — MUST only run under the per-settlement
         * process mutex (see #settleTpslObligation).
         *
         * @param context - See #settleTpslObligation.
         * @param context.settlementKey - Full settlement identity.
         * @param context.symbol - Market symbol.
         * @param context.journalEntry - Caller's journal snapshot (reloaded).
         * @param context.market - Market integerization parameters.
         * @param context.market.marketId - Venue market id.
         * @param context.market.supportedSizeDecimals - Size decimals.
         * @param context.market.supportedPriceDecimals - Price decimals.
         * @param context.accountIndex - Captured account index.
         * @param context.authToken - Captured venue auth token.
         * @param context.generation - Captured session generation.
         * @param context.readActiveRaw - Session-fenced raw active reader.
         * @param context.readInactiveFor - Targeted inactive reader.
         * @param context.nextNonce - Lock-section nonce issuer.
         * @param context.submit - Lock-section submitter.
         * @returns See #settleTpslObligation.
         */
        _LighterProvider_settleTpslObligationLocked.set(this, async (context) => {
            const { settlementKey, symbol, market, accountIndex, readActiveRaw, readInactiveFor, nextNonce, submit, } = context;
            // RELOAD inside the settlement mutex: the caller's snapshot may have
            // been superseded while waiting for the mutex — decisions must be
            // made on the CURRENT journal of the SAME operation only. Disk is
            // AUTHORITATIVE: absence means another resolver cleared it, so any
            // stale in-memory copy must be dropped, never resurrected.
            const journalEntry = await __classPrivateFieldGet(this, _LighterProvider_loadTpslJournal, "f").call(this, settlementKey);
            if (!journalEntry) {
                __classPrivateFieldGet(this, _LighterProvider_tpslUnsettled, "f").delete(settlementKey);
                return await __classPrivateFieldGet(this, _LighterProvider_clearTpslJournal, "f").call(this, settlementKey, null).catch(() => false);
            }
            if (journalEntry.operationId !== context.journalEntry.operationId) {
                // A different operation owns the journal now: this resolver's
                // obligation no longer exists — report unresolved so the caller
                // re-evaluates against the fresh state.
                return false;
            }
            const reconciled = await __classPrivateFieldGet(this, _LighterProvider_reconcilePriorTpsl, "f").call(this, readActiveRaw, readInactiveFor, accountIndex, journalEntry);
            if (reconciled === 'unresolved') {
                return false;
            }
            const persistEntry = async () => {
                __classPrivateFieldGet(this, _LighterProvider_tpslUnsettled, "f").set(settlementKey, journalEntry);
                await __classPrivateFieldGet(this, _LighterProvider_persistTpslJournal, "f").call(this, settlementKey, journalEntry);
            };
            // Same journalled cancel discipline as the live transition.
            const submitRecoveryCancel = async (orderId, role) => {
                if (role === 'stale' && journalEntry.intent === 'replace') {
                    journalEntry.phase = 'cancelling';
                }
                const cancelNonce = await nextNonce();
                const signedCancel = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signCancelOrder',
                    params: [accountIndex, market.marketId, orderId, cancelNonce],
                });
                if (signedCancel.error) {
                    throw new Error(`Failed to cancel trigger order ${orderId}: ${signedCancel.error}`);
                }
                const cancelIdentity = requireSignedTxIdentity(signedCancel);
                const cancelAttempt = {
                    kind: 'cancel',
                    attemptId: nextAttemptIdFor(journalEntry),
                    nonce: cancelNonce,
                    outcome: 'unknown',
                    orderId,
                    txHash: cancelIdentity.txHash,
                    expiresAt: cancelIdentity.expiresAt,
                    role,
                };
                journalEntry.attempts.push(cancelAttempt);
                await persistEntry();
                await submit(lighterConfig_js_1.LIGHTER_TX_TYPE_CANCEL_ORDER, signedCancel.txInfo, () => {
                    cancelAttempt.outcome = 'accepted';
                }, {
                    txHash: cancelIdentity.txHash,
                    expiresAt: cancelIdentity.expiresAt,
                    owner: journalEntry.operationId,
                });
            };
            // Classify every journalled create leg on the books (reconcile
            // proved each attempt either landed or never can).
            const replacementIds = journalEntry.attempts
                .filter((attempt) => attempt.kind === 'create' && attempt.role === 'replacement')
                .flatMap((attempt) => attempt.clientIds);
            const restoreAttempts = journalEntry.attempts.filter((attempt) => attempt.kind === 'create' && attempt.role === 'restore');
            const allCreateIds = [
                ...replacementIds,
                ...restoreAttempts.flatMap((attempt) => attempt.clientIds),
            ];
            const rawActive = await readActiveRaw();
            const missingFromActive = allCreateIds.filter((clientId) => !rawActive.some((order) => String(order.clientOrderIndex) === String(clientId)));
            const rawInactive = missingFromActive.length > 0
                ? await readInactiveFor(missingFromActive)
                : [];
            const stateOf = (clientId) => {
                if (rawActive.some((order) => String(order.clientOrderIndex) === String(clientId))) {
                    return 'active';
                }
                const terminal = rawInactive.find((order) => String(order.clientOrderIndex) === String(clientId));
                if (!terminal) {
                    // Reconcile proved never-landed: same outcome as failed.
                    return 'failed';
                }
                const status = terminal.status.toLowerCase();
                const fullyExecuted = (status === 'filled' || status === 'executed') &&
                    parseStrictDecimal(terminal.remainingBaseAmount) === 0;
                return fullyExecuted ? 'success' : 'failed';
            };
            const replacementStates = replacementIds.map(stateOf);
            const anySuccess = replacementStates.includes('success');
            const anyActive = replacementStates.includes('active');
            const anyFailed = replacementStates.includes('failed');
            const priorActive = (prior) => rawActive.some((order) => String(order.orderIndex) === prior.orderId);
            const cancelledOrderIds = [];
            const createdClientIds = [];
            // Aggregation groups parallel to createdClientIds: one group per
            // create ATTEMPT (grouped OCO semantics within, independence across).
            const createdGroups = [];
            const pushCreatedGroup = (group) => {
                createdClientIds.push(...group);
                createdGroups.push(group);
            };
            const cancelPriorLeftovers = async () => {
                // The replacement must STAY proven while the old protection is
                // removed: keep its live ids in the final expectation so a leg
                // terminal-failing DURING these cancels (the phase race) fails
                // this pass instead of clearing the journal naked. Grouped per
                // replacement ATTEMPT: an executed OCO leg legitimately
                // auto-cancels its sibling.
                for (const attempt of journalEntry.attempts) {
                    if (attempt.kind !== 'create' || attempt.role !== 'replacement') {
                        continue;
                    }
                    const activeLegs = attempt.clientIds.filter((clientId) => stateOf(clientId) === 'active');
                    if (activeLegs.length > 0) {
                        pushCreatedGroup(attempt.clientIds);
                    }
                }
                for (const prior of journalEntry.priorTriggers) {
                    if (priorActive(prior)) {
                        await submitRecoveryCancel(prior.orderId, 'stale');
                        cancelledOrderIds.push(prior.orderId);
                    }
                }
            };
            const rollbackActiveJournalledLegs = async (legIds) => {
                for (const clientId of legIds) {
                    if (stateOf(clientId) !== 'active') {
                        continue;
                    }
                    const survivor = rawActive.find((order) => String(order.clientOrderIndex) === String(clientId));
                    if (survivor) {
                        await submitRecoveryCancel(String(survivor.orderIndex), 'rollback');
                        cancelledOrderIds.push(String(survivor.orderIndex));
                    }
                }
            };
            const rollbackActiveReplacements = async () => await rollbackActiveJournalledLegs(replacementIds);
            // COMPACTION: proven-resolved attempts with no live effect and no
            // coverage are dropped so repeated retries can never dead-end at the
            // attempt cap: FAILED restore creates (never landed/terminal-failed)
            // and resolved cancels (target gone, or proven never-landed).
            const compactionNow = Date.now();
            journalEntry.attempts = journalEntry.attempts.filter((attempt) => {
                if (attempt.kind === 'create') {
                    return (attempt.role !== 'restore' ||
                        attempt.clientIds.some((clientId) => stateOf(clientId) !== 'failed'));
                }
                const targetGone = !rawActive.some((order) => String(order.orderIndex) === attempt.orderId);
                const provenNeverLanded = attempt.outcome === 'unknown' &&
                    compactionNow > attempt.expiresAt + LIGHTER_TX_EXPIRY_SLACK_MS;
                // Accepted-but-terminal-FAILED cancels (venue status 4/5) landed
                // without mutating the books: proven-resolved, compactable.
                const landedTerminalFailed = attempt.terminalStatus === 4 || attempt.terminalStatus === 5;
                return !(targetGone || provenNeverLanded || landedTerminalFailed);
            });
            // NO AUTOMATIC RESTORE: the venue exposes no atomic primitive that
            // could prove a re-created trigger attaches to the SAME position
            // lifecycle, so a fully-failed replacement after old cancels parks
            // the journal in a DURABLE 'manual' state — surfaced via
            // `getPendingManualRecoveries` and resolved only by an explicit NEW
            // protection intent from the user. Never restored, never silently
            // cleared.
            const parkManual = async (reason) => {
                // Survivors: prior triggers still on the books + replacement legs
                // still active — deliberately LEFT (only remaining protection).
                const survivingOrderIds = [
                    ...new Set([
                        ...journalEntry.priorTriggers
                            .filter((prior) => priorActive(prior))
                            .map((prior) => prior.orderId),
                        ...rawActive
                            .filter((order) => replacementIds.some((clientId) => String(order.clientOrderIndex) === String(clientId)))
                            .map((order) => String(order.orderIndex)),
                    ]),
                ];
                // The DURABLE warning lives in its own doc; the journal slot is
                // released so a successor protection intent can run. The doc
                // clears only after a successor SUCCEEDS.
                await __classPrivateFieldGet(this, _LighterProvider_writeTpslManualRecovery, "f").call(this, {
                    settlementKey,
                    symbol,
                    reason,
                    priorIntent: journalEntry.intent,
                    priorTriggers: journalEntry.priorTriggers,
                    survivingOrderIds,
                    operationId: journalEntry.operationId,
                    recordedAt: Date.now(),
                });
                __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] TP/SL protection requires MANUAL re-establishment', { settlementKey, reason });
                await __classPrivateFieldGet(this, _LighterProvider_clearTpslJournal, "f").call(this, settlementKey, journalEntry.operationId);
                return true;
            };
            if (journalEntry.phase === 'manual') {
                // Journal parked 'manual' by an earlier version: migrate the
                // warning into the dedicated durable doc.
                return await parkManual('TP/SL protection could not be safely re-established automatically (parked by an earlier session)');
            }
            if (journalEntry.intent === 'remove') {
                // An intentional REMOVAL is never "recovered" by restoring the
                // cancelled protection: finish/reconcile the cancels exactly.
                for (const prior of journalEntry.priorTriggers) {
                    if (priorActive(prior)) {
                        await submitRecoveryCancel(prior.orderId, 'stale');
                        cancelledOrderIds.push(prior.orderId);
                    }
                }
            }
            else if (journalEntry.phase === 'creating') {
                // Old protection untouched. Nothing landed / everything failed
                // → the old set is still the only intent: just clear.
                if (replacementIds.length > 0 && (anySuccess || anyActive)) {
                    if (!anySuccess && anyFailed) {
                        // Partial OCO before old cancels: roll surviving legs back so
                        // the OLD protection remains authoritative.
                        await rollbackActiveReplacements();
                    }
                    else {
                        // Replacement in force (or executed): finish the swap.
                        await cancelPriorLeftovers();
                    }
                }
            }
            else if (journalEntry.phase === 'cancelling') {
                if (anySuccess || (anyActive && !anyFailed)) {
                    // Replacement fully won — finish cancelling the old protection.
                    await cancelPriorLeftovers();
                }
                else {
                    // Replacement fully failed (or degraded to a partial set) AFTER
                    // old cancels began: the position's protection can no longer be
                    // proven — park durably for MANUAL re-establishment. Any
                    // surviving leg is deliberately LEFT (it is the only protection
                    // remaining); nothing is restored.
                    return await parkManual('Replacement TP/SL orders failed after the previous protection cancels began; the position may be under-protected');
                }
            }
            if (cancelledOrderIds.length > 0 || createdClientIds.length > 0) {
                const settled = await __classPrivateFieldGet(this, _LighterProvider_awaitTpslVisibility, "f").call(this, readActiveRaw, readInactiveFor, { createdClientIds, cancelledOrderIds }, 
                // PER-ATTEMPT groups: a grouped OCO replacement's executed leg
                // legitimately auto-cancels its sibling.
                { createdGroups });
                // ONLY a fully-settled pass may clear; a replacement dying DURING
                // the old cancels parks for manual re-establishment.
                if (settled.outcome === 'timeout') {
                    return false;
                }
                if (settled.outcome === 'created-terminal-failed') {
                    return await parkManual('Replacement TP/SL order was cancelled or rejected by the venue after the previous protection was already removed');
                }
            }
            // A refused clear (superseded by a newer operation) is UNRESOLVED —
            // never reported as success.
            return await __classPrivateFieldGet(this, _LighterProvider_clearTpslJournal, "f").call(this, settlementKey, journalEntry.operationId);
        });
        /**
         * Reconcile a PRIOR transition's expectation before any new mutation.
         * Only created ids can cause duplicates from a stale snapshot, so they
         * must be accounted for (active or terminal). Cancelled ids are safe in
         * either state: still-active targets reappear in the fresh snapshot and
         * are re-cancelled.
         *
         * @param readActiveRaw - Strict raw active-orders reader.
         * @param readInactive - Targeted inactive-history reader (cached, bounded).
         * @param accountIndex - Captured account index.
         * @param entry - The recorded expectation.
         * @param entry.attempts - Journalled per-attempt submissions.
         * @param entry.recordedAt - When the journal was recorded (ms).
         * @returns 'resolved' when safe to proceed; 'unresolved' when an
         * ACCEPTED mutation is still not visible.
         */
        _LighterProvider_reconcilePriorTpsl.set(this, async (readActiveRaw, readInactive, accountIndex, entry) => {
            // Per-attempt reconciliation, authoritative and never time-guessed:
            // 1. Books first — a create is resolved when its ids are all
            //    active/terminal, a cancel when its target left the active book.
            // 2. Otherwise the EXACT signed tx hash is looked up: a strict match
            //    (hash + account + api key slot + nonce) proves the payload
            //    reached the sequencer, so absence from the books can only be
            //    visibility lag (keep blocking). A venue-confirmed not-found is
            //    only never-landed once the signed ExpiredAt (+ clock slack) has
            //    passed — the sequencer cannot accept an expired payload.
            const satisfiedOnBooks = (attempt, rawActive, rawInactive) => attempt.kind === 'create'
                ? attempt.clientIds.every((clientId) => rawActive.some((order) => String(order.clientOrderIndex) === String(clientId)) ||
                    rawInactive.some((order) => String(order.clientOrderIndex) === String(clientId)))
                : !rawActive.some((order) => String(order.orderIndex) === attempt.orderId);
            // Books can satisfy only OBSERVED-accepted attempts. An UNKNOWN
            // attempt's desired book state may hold for INDEPENDENT reasons (a
            // fill, an external cancel) while the signed payload could still
            // land later and consume its nonce — every unknown attempt must
            // resolve by exact hash identity or proven expiry.
            let rawActive = [];
            let rawInactive = [];
            for (let poll = 0; poll < LIGHTER_TPSL_SETTLE_ATTEMPTS; poll += 1) {
                const activeNow = await readActiveRaw();
                // ACTIVE-FIRST (see #awaitTpslVisibility): inactive history is only
                // consulted for create ids not already visible active.
                const createIdsMissingFromActive = entry.attempts
                    .filter((attempt) => attempt.kind === 'create')
                    .flatMap((attempt) => attempt.clientIds)
                    .filter((clientId) => !activeNow.some((order) => String(order.clientOrderIndex) === String(clientId)));
                const inactiveNow = createIdsMissingFromActive.length > 0
                    ? await readInactive(createIdsMissingFromActive)
                    : [];
                rawActive = activeNow;
                rawInactive = inactiveNow;
                // Poll the books through visibility lag for ALL attempts — book
                // convergence resolves accepted attempts directly and lets an
                // unknown-but-landed attempt pass its final identity check below.
                const anyUnsatisfied = entry.attempts.some((attempt) => !satisfiedOnBooks(attempt, activeNow, inactiveNow));
                if (!anyUnsatisfied) {
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, LIGHTER_TPSL_SETTLE_POLL_MS));
            }
            for (const attempt of entry.attempts) {
                if (attempt.outcome === 'accepted' &&
                    satisfiedOnBooks(attempt, rawActive, rawInactive)) {
                    continue;
                }
                let lookedUp;
                try {
                    lookedUp = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getTx(attempt.txHash);
                }
                catch {
                    // Lookup failure is AMBIGUOUS, never evidence of non-acceptance.
                    return 'unresolved';
                }
                if (lookedUp !== null) {
                    // The exact signed hash exists at the venue. With a matching
                    // identity (hash + account + api key slot + nonce):
                    //  - terminal FAILED/REJECTED status (4/5) resolves the attempt
                    //    deterministically — the nonce was consumed but the books
                    //    were never mutated (the machine re-acts on book state);
                    //  - any other status with the books already reflecting the
                    //    attempt resolves it;
                    //  - otherwise it reached the sequencer but is not yet visible —
                    //    keep blocking. A NON-matching payload under this hash fails
                    //    closed identically, and is logged (signer/venue defect).
                    const matchesIdentity = typeof lookedUp.hash === 'string' &&
                        lookedUp.hash.toLowerCase().replace(/^0x/u, '') ===
                            attempt.txHash.toLowerCase().replace(/^0x/u, '') &&
                        lookedUp.accountIndex === accountIndex &&
                        lookedUp.apiKeyIndex === __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f") &&
                        lookedUp.nonce === attempt.nonce;
                    if (!matchesIdentity) {
                        __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] TP/SL tx lookup identity mismatch; failing closed', { txHash: attempt.txHash });
                        return 'unresolved';
                    }
                    if (lookedUp.status === 4 || lookedUp.status === 5) {
                        // Record the terminal venue status durably (next persist):
                        // compaction can then drop this attempt even though its target
                        // may still be on the books.
                        attempt.terminalStatus = lookedUp.status;
                        continue;
                    }
                    if (satisfiedOnBooks(attempt, rawActive, rawInactive)) {
                        continue;
                    }
                    return 'unresolved';
                }
                // Venue-confirmed not-found: only never-landed once the signed
                // payload can no longer be accepted.
                if (Date.now() <= attempt.expiresAt + LIGHTER_TX_EXPIRY_SLACK_MS) {
                    return 'unresolved';
                }
                // Expired and venue-confirmed absent: authoritatively never landed —
                // its reserved nonce may be released UNLESS a later dispatch (a
                // retry) already consumed it (durable consumed watermark guards).
                await __classPrivateFieldGet(this, _LighterProvider_releaseNonceReservationIfUnconsumed, "f").call(this, accountIndex, attempt.nonce);
            }
            return 'resolved';
        });
        /**
         * Release a session-global nonce reservation once a submission is
         * PROVEN never-landed. Only the topmost reservation can be safely
         * lowered; anything else stays reserved until proven in turn.
         *
         * @param accountIndex - Venue account index.
         * @param nonce - The proven-unconsumed nonce.
         */
        _LighterProvider_releaseNonceReservation.set(this, (accountIndex, nonce) => {
            const reservationKey = `${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}`;
            if (__classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").get(reservationKey) === nonce + 1) {
                __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").set(reservationKey, nonce);
            }
        });
        /**
         * Bounded poll until the venue reflects a TP/SL transition: every
         * created client id accounted for and every cancelled order id absent
         * from the active book.
         *
         * A created trigger can EXECUTE, expire, or be venue-cancelled before
         * the first poll (an immediate/crossed TP/SL never rests), so created
         * ids reconcile against the active book PLUS the inactive/terminal
         * history — otherwise the obligation could never resolve and would
         * permanently block the symbol.
         *
         * @param readActiveRaw - Strict raw active-orders reader (session-fenced).
         * @param readInactive - Targeted inactive-history reader (cached, bounded).
         * @param expectation - Ids the venue must account for.
         * @param expectation.createdClientIds - Client ids that must be active
         * or terminal.
         * @param expectation.cancelledOrderIds - Order ids that must leave the
         * active book.
         * @param options - Aggregation options.
         * @param options.createdGroups - Per-attempt aggregation groups over
         * the created ids (see inline doc).
         * @returns Outcome: 'settled' when every id is accounted for and no
         * created id failed ('executedCreated' marks created ids that reached a
         * SUCCESS terminal state — filled/executed — instead of resting
         * active); 'created-terminal-failed' when the venue reports a created
         * id cancelled/rejected/expired (the obligation RESOLVES — the caller
         * surfaces the failure but no permanent block remains); 'timeout' when
         * the bound elapsed unresolved.
         */
        _LighterProvider_awaitTpslVisibility.set(this, async (readActiveRaw, readInactive, expectation, options = {}) => {
            for (let attempt = 0; attempt < LIGHTER_TPSL_SETTLE_ATTEMPTS; attempt += 1) {
                const rawActive = await readActiveRaw();
                // ACTIVE-FIRST: only ids not already proven active need the
                // high-weight inactive-history lookup; a normal freshly-active
                // replacement performs ZERO inactive requests.
                const missingFromActive = expectation.createdClientIds.filter((clientId) => !rawActive.some((order) => String(order.clientOrderIndex) === String(clientId)));
                const rawInactive = missingFromActive.length > 0
                    ? await readInactive(missingFromActive)
                    : [];
                // Per-id classification. Success is EXACT-whitelisted
                // ('filled'/'executed') AND requires a strictly ZERO remaining size
                // (a 'filled' row with remainder is not a proven execution);
                // everything else terminal — including unknown statuses — fails
                // CLOSED.
                const classified = expectation.createdClientIds.map((clientId) => {
                    if (rawActive.some((order) => String(order.clientOrderIndex) === String(clientId))) {
                        return { clientId, state: 'active' };
                    }
                    const terminal = rawInactive.find((order) => String(order.clientOrderIndex) === String(clientId));
                    if (!terminal) {
                        return { clientId, state: 'missing' };
                    }
                    const status = terminal.status.toLowerCase();
                    // STRICT remaining parse: a prefix-parsed '0oops' must never
                    // count as a proven zero remainder.
                    const fullyExecuted = (status === 'filled' || status === 'executed') &&
                        parseStrictDecimal(terminal.remainingBaseAmount) === 0;
                    return {
                        clientId,
                        state: fullyExecuted ? 'success' : 'failed',
                    };
                });
                const createdAccounted = !classified.some((entry) => entry.state === 'missing');
                const cancelledGone = expectation.cancelledOrderIds.every((orderId) => !rawActive.some((order) => String(order.orderIndex) === orderId));
                if (createdAccounted && cancelledGone) {
                    // PER-GROUP aggregation: within a group one fully executed leg
                    // auto-cancels its sibling (grouped OCO — the GROUP succeeded);
                    // across groups each must independently succeed or rest active.
                    const groups = options.createdGroups ??
                        (expectation.createdClientIds.length > 0
                            ? [expectation.createdClientIds]
                            : []);
                    const stateOfId = new Map(classified.map((entry) => [entry.clientId, entry.state]));
                    let anyGroupSuccess = false;
                    const failedGroupActiveIds = [];
                    let anyGroupFailed = false;
                    for (const group of groups) {
                        const states = group.map((clientId) => stateOfId.get(clientId) ?? 'missing');
                        if (states.includes('success')) {
                            anyGroupSuccess = true;
                            continue;
                        }
                        if (states.includes('failed')) {
                            anyGroupFailed = true;
                            failedGroupActiveIds.push(...group.filter((clientId) => stateOfId.get(clientId) === 'active'));
                        }
                    }
                    if (anyGroupFailed) {
                        return {
                            outcome: 'created-terminal-failed',
                            survivingActiveClientIds: failedGroupActiveIds,
                        };
                    }
                    return { outcome: 'settled', executedCreated: anyGroupSuccess };
                }
                await new Promise((resolve) => setTimeout(resolve, LIGHTER_TPSL_SETTLE_POLL_MS));
            }
            return { outcome: 'timeout' };
        });
        /**
         * Throws when the session generation moved past the captured one — used
         * after every await in account-bound async work so a delayed account-A
         * step can never mutate account-B's session.
         *
         * @param generation - Generation captured when the work started.
         */
        _LighterProvider_assertSession.set(this, (generation) => {
            if (generation !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                throw new Error('Operation cancelled: the wallet switched accounts (or the signer reset) while this operation was in flight');
            }
            // The generation only advances when some provider call rebinds; also
            // notice a wallet switch nothing has observed yet. Account-bound work
            // must never run without a binding: every legitimate flow (including
            // headless l1Address and configured-index setups) binds first, so a
            // null binding here means the wallet was deselected — fail closed even
            // when a configured account index could still resolve.
            if (__classPrivateFieldGet(this, _LighterProvider_boundAddress, "f") === null) {
                throw new Error('Operation cancelled: no wallet account is bound to the venue session');
            }
            let address = null;
            try {
                address = __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress().toLowerCase();
            }
            catch {
                address = null;
            }
            if (address !== __classPrivateFieldGet(this, _LighterProvider_boundAddress, "f")) {
                if (address === null) {
                    // Deselected: nothing to rebind to yet.
                    __classPrivateFieldGet(this, _LighterProvider_invalidateSessionState, "f").call(this);
                    __classPrivateFieldGet(this, _LighterProvider_teardownStream, "f").call(this);
                }
                else {
                    // Unobserved switch: rebind properly (invalidates caches and
                    // rebuilds stream channels for the new account) before cancelling
                    // the stale operation.
                    __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
                }
                throw new Error('Operation cancelled: the wallet switched accounts (or the signer reset) while this operation was in flight');
            }
        });
        /** Drop every cache derived from the previously bound account. */
        _LighterProvider_invalidateSessionState.set(this, () => {
            __classPrivateFieldSet(this, _LighterProvider_sessionGeneration, __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f") + 1, "f");
            __classPrivateFieldSet(this, _LighterProvider_boundAddress, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_accountIndex, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, null, "f");
            __classPrivateFieldSet(this, _LighterProvider_authToken, null, "f");
            __classPrivateFieldGet(this, _LighterProvider_clearBridgeOwnership, "f").call(this);
            // #tpslUnsettled survives (address+accountIndex+symbol keyed): a
            // reselect of the same account must still reconcile its pending ids.
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
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const setupPromise = __classPrivateFieldGet(this, _LighterProvider_setupSigner, "f").call(this, generation);
            __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, setupPromise, "f");
            try {
                return await setupPromise;
            }
            catch (error) {
                // Only clear the promise WE installed — a newer session may already
                // have replaced it, and an old rejection must not tear that down.
                if (__classPrivateFieldGet(this, _LighterProvider_signerReadyPromise, "f") === setupPromise) {
                    __classPrivateFieldSet(this, _LighterProvider_signerReadyPromise, null, "f");
                }
                throw error;
            }
        });
        _LighterProvider_setupSigner.set(this, async (generation) => {
            const bridge = __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const chainId = (0, lighterConfig_js_1.getLighterChainId)(__classPrivateFieldGet(this, _LighterProvider_clientService, "f").network);
            // The WASM client is a singleton inside the bridge host and the venue
            // key registration is a nonce-consuming write. Both therefore run
            // INSIDE the venue write lock: a stale previous-account setup aborts at
            // the lock's fence before it can touch the bridge, and no other
            // account's setup or write can interleave with this critical section.
            await __classPrivateFieldGet(this, _LighterProvider_withVenueWriteLock, "f").call(this, accountIndex, async (nextNonce, submit) => {
                const seed = await __classPrivateFieldGet(this, _LighterProvider_walletService, "f").deriveKeySeedPlain(__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                const nonce = await nextNonce();
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                const created = await bridge.execute({
                    function: '_createClient',
                    params: [seed, chainId, accountIndex, nonce, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")],
                });
                if (created.error || !created.success) {
                    throw new Error(`Lighter signer client creation failed: ${created.error ?? 'unknown'}`);
                }
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                __classPrivateFieldSet(this, _LighterProvider_venuePublicKey, created.pk, "f");
                // Record bridge-client OWNERSHIP: the WASM client is a singleton
                // per bridge, so every later write section re-establishes it
                // when another identity has since overwritten it.
                __classPrivateFieldSet(this, _LighterProvider_signerIdentity, `${__classPrivateFieldGet(this, _LighterProvider_clientService, "f").network}:${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}`, "f");
                // The seed is deliberately NOT retained: re-establishment
                // re-derives it under the bridge lease.
                __classPrivateFieldSet(this, _LighterProvider_signerRecreateParams, { chainId, accountIndex }, "f");
                bridgeClientOwners.set(__classPrivateFieldGet(this, _LighterProvider_rawSignerBridge, "f").call(this), __classPrivateFieldGet(this, _LighterProvider_signerIdentity, "f"));
                // Register the venue key when the slot does not hold it yet. Only
                // the plaintext body leaves this scope — `created.prv` (the venue
                // private key) must stay inside the signer bridge boundary and
                // never be logged.
                const registered = await __classPrivateFieldGet(this, _LighterProvider_isVenueKeyRegistered, "f").call(this, accountIndex);
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                if (!registered) {
                    // Registration can never succeed under the mainnet rollout
                    // gate: refuse BEFORE the L1 personal_sign — never prompt the
                    // user (or a hardware wallet) for a signature that the
                    // dispatch backstop is guaranteed to refuse.
                    if (!__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f")) {
                        throw new Error('Lighter mainnet trading is not enabled yet; venue key registration is limited to testnet');
                    }
                    await __classPrivateFieldGet(this, _LighterProvider_registerVenueKey, "f").call(this, accountIndex, created.body, generation, nextNonce, submit);
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                }
            }, generation, true);
            // AUTOMATIC bounded recovery: pending TP/SL journals must be
            // reconciled at startup/reconnect, not only when the next mutation
            // happens to run. Detached so it awaits THIS setup's resolved promise
            // instead of deadlocking on it.
            __classPrivateFieldGet(this, _LighterProvider_kickTpslRecovery, "f").call(this);
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
        _LighterProvider_registerVenueKey.set(this, async (accountIndex, changePubKeyBody, generation, nextNonce, submit) => {
            const bridge = __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this);
            // The ChangePubKey plaintext from _createClient embeds the nonce used at
            // client creation; sign it with the user's L1 account (EIP-191). Every
            // await is fenced and the submission goes through the lock's fenced
            // submit — a stale registration can never reach the venue.
            const l1Signature = await __classPrivateFieldGet(this, _LighterProvider_walletService, "f").signPersonalMessage(changePubKeyBody);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const nonce = await nextNonce();
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const signed = await bridge.execute({
                function: '_signChangePubKey',
                params: [accountIndex, l1Signature, nonce, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")],
            });
            if (signed.error) {
                throw new Error(`Lighter ChangePubKey signing failed: ${signed.error}`);
            }
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const result = await submit(lighterConfig_js_1.LIGHTER_TX_TYPE_CHANGE_PUB_KEY, signed.txInfo, undefined, extractDispatchIdentity(signed));
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
        /** Every client order id this instance has issued (collision set). */
        _LighterProvider_issuedClientOrderIds.set(this, new Set());
        /**
         * Atomically reserve unique client order indexes.
         *
         * The venue requires client_order_index to be UNIQUE ACROSS ALL MARKETS
         * for the account (official Get Started docs) and does not require
         * monotonicity. Ids are uniform random draws over the uint48 space
         * (two 24-bit draws, exact in float space) with a per-instance
         * collision set and retry: within an instance duplicates are
         * impossible; across simultaneous instances/devices a single pair
         * collides with probability 1/2^48 (~3.6e-15) and the birthday bound
         * over n total ids is ~n(n-1)/2^49 — about 1.8e-7 after ten thousand
         * orders, versus the 1% per-pair risk of the previous 100-lane scheme.
         *
         * @param count - How many ids to reserve.
         * @returns The reserved ids.
         */
        _LighterProvider_allocateClientOrderIndexes.set(this, (count) => {
            const ids = [];
            // Bounded: a degenerate randomness source (or an absurdly full
            // collision set) must surface as an error, never a synchronous spin.
            // 100 attempts per id makes accidental exhaustion unreachable in
            // practice (collision odds per draw stay astronomically small).
            let attempts = 0;
            const maxAttempts = count * 100;
            while (ids.length < count) {
                if (attempts >= maxAttempts) {
                    throw new Error(`Unable to allocate a unique Lighter client order id after ${maxAttempts} attempts`);
                }
                attempts += 1;
                const [high, low] = randomUint24Pair();
                const candidate = high * 2 ** 24 + low;
                if (candidate === 0 || __classPrivateFieldGet(this, _LighterProvider_issuedClientOrderIds, "f").has(candidate)) {
                    continue;
                }
                __classPrivateFieldGet(this, _LighterProvider_issuedClientOrderIds, "f").add(candidate);
                ids.push(candidate);
            }
            return ids;
        });
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
         * @param allowMainnetSignerSetup - Permit entering the lock on mainnet
         * for signer setup only (bridge-local client creation + read-only
         * nonce fetch); dispatches remain refused by the gate inside submit.
         * @returns The section's result.
         */
        _LighterProvider_withVenueWriteLock.set(this, async (accountIndex, section, generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f"), allowMainnetSignerSetup = false) => {
            // INITIAL ROLLOUT GATE: every nonce-consuming venue write is limited
            // to testnet until mainnet trading is validated end-to-end — the
            // enablement flags alone must not be able to unlock unvalidated
            // mainnet trading. Signer SETUP may enter on mainnet (client
            // creation is bridge-local and the nonce fetch is read-only) so the
            // auth token can be minted for authenticated mainnet reads; any
            // dispatch it would attempt (key registration) is refused by the
            // same gate inside `submit`.
            if (!__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") && !allowMainnetSignerSetup) {
                throw new Error('Lighter mainnet trading is not enabled yet; venue writes are limited to testnet');
            }
            const criticalSection = async () => {
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                // Every unresolved prior dispatch (this session OR a previous one —
                // the ledger is durable) must resolve before this section may issue
                // nonces: a restart would otherwise reuse a consumed-but-lagging
                // nonce, and a proven never-landed dispatch must release its nonce.
                await __classPrivateFieldGet(this, _LighterProvider_resolveNonceLedger, "f").call(this, accountIndex);
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                // Monotonic nonce reservation: the venue's nextNonce endpoint can
                // LAG accepted submissions. The floor is SESSION-GLOBAL per
                // accountIndex:apiKeyIndex — a queued/next lock section (any
                // symbol, any operation) must never be handed a nonce an earlier
                // submission may have consumed, even when that submission's
                // response was lost. Reservation advances at DISPATCH (a signing
                // failure never burns a nonce the venue still expects); a proven
                // never-landed submission releases it again via reconciliation.
                const reservationKey = `${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}`;
                let lastIssuedNonce = null;
                const nextNonce = async () => {
                    // Re-fenced on every fetch AND after it resolves: the account can
                    // switch between the section's own await points, not only while it
                    // sat in the queue.
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                    const nonceResponse = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getNextNonce(accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                    const reservedFloor = __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").get(reservationKey);
                    const issued = reservedFloor === undefined
                        ? nonceResponse.nonce
                        : Math.max(nonceResponse.nonce, reservedFloor);
                    lastIssuedNonce = issued;
                    return issued;
                };
                // BRIDGE OWNERSHIP: the WASM client is a singleton per bridge —
                // another provider (different account/network sharing the bridge)
                // may have overwritten it since our setup. Re-establish OUR client
                // before any signing in this section. (During initial setup the
                // identity is not yet recorded; setup itself creates the client.)
                if (__classPrivateFieldGet(this, _LighterProvider_signerIdentity, "f") !== null &&
                    __classPrivateFieldGet(this, _LighterProvider_signerRecreateParams, "f") !== null &&
                    bridgeClientOwners.get(__classPrivateFieldGet(this, _LighterProvider_rawSignerBridge, "f").call(this)) !== __classPrivateFieldGet(this, _LighterProvider_signerIdentity, "f")) {
                    await __classPrivateFieldGet(this, _LighterProvider_reestablishSignerClient, "f").call(this, generationAtIntent, await nextNonce());
                }
                const submit = async (txType, txInfo, onAccepted, identity) => {
                    // Last fence before anything reaches the venue: a switch that
                    // happened while SIGNING must abort before submission.
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                    // Mainnet dispatch backstop: covers the signer-setup path that
                    // is allowed to ENTER the lock on mainnet — nothing may be
                    // submitted there.
                    if (!__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f")) {
                        throw new Error('Lighter mainnet trading is not enabled yet; venue writes are limited to testnet');
                    }
                    // Record the dispatch DURABLY BEFORE anything else: a failed
                    // ledger read/write means NO dispatch and an UNTOUCHED memory
                    // floor — the nonce stays safely unissued at the venue. The
                    // identity comes from the SIGNING RESULT (pinned WASM contract:
                    // txInfo never carries the hash).
                    let ledgerEntry = null;
                    if (lastIssuedNonce !== null) {
                        // COMPLETE identity is REQUIRED before anything reaches the
                        // wire: a hashless dispatch could never be proven absent, so a
                        // response loss would wedge writes until the venue advances.
                        if (identity?.txHash === null ||
                            identity?.expiresAt === null ||
                            identity === undefined) {
                            throw new Error('Lighter dispatch refused: the signing result did not provide a complete transaction identity (hash + expiry)');
                        }
                        ledgerEntry = {
                            nonce: lastIssuedNonce,
                            txHash: identity.txHash,
                            expiresAt: identity.expiresAt,
                            kind: txType,
                            intent: identity.intent ?? `txType:${txType}`,
                            owner: identity.owner ?? null,
                        };
                        const appendedEntry = ledgerEntry;
                        await __classPrivateFieldGet(this, _LighterProvider_withLedgerLock, "f").call(this, accountIndex, async () => {
                            const doc = await __classPrivateFieldGet(this, _LighterProvider_readNonceLedger, "f").call(this, accountIndex);
                            if (doc.entries.length >= 16) {
                                throw new Error('Too many unresolved Lighter dispatches; refusing further writes until they resolve');
                            }
                            await __classPrivateFieldGet(this, _LighterProvider_writeNonceLedger, "f").call(this, accountIndex, {
                                consumedFloor: doc.consumedFloor,
                                entries: [...doc.entries, appendedEntry],
                                recovered: doc.recovered,
                            });
                        });
                        // Only AFTER the durable append: reserve in memory — from this
                        // point the venue may consume the nonce even if the response
                        // never arrives.
                        __classPrivateFieldGet(this, _LighterProvider_nonceReservations, "f").set(reservationKey, lastIssuedNonce + 1);
                    }
                    // EVERY error path below keeps the durable entry — a coded venue
                    // or HTTP error can mask a commit, so nothing short of an exact
                    // authoritative reconciliation may release the nonce.
                    const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").sendTx(txType, txInfo);
                    // Acceptance bookkeeping runs SYNCHRONOUSLY before anything can
                    // fail: a switch during network submission must cancel the
                    // operation, never the record of an accepted venue mutation.
                    onAccepted?.();
                    // POST-SEND ORDER: evaluate the session fence BEFORE the ledger
                    // entry transitions, then commit the transition ATOMICALLY in
                    // ONE write under the ledger lock — fence pass → consumed/
                    // removed; fence fail → recovered(SUCCEEDED). If that single
                    // write fails, the ORIGINAL unresolved entry remains the durable
                    // record and every retry stays blocked; the only durable proof
                    // of the accepted mutation is never consumed first and
                    // quarantined second.
                    let fenceError = null;
                    try {
                        __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                    }
                    catch (error) {
                        fenceError = error;
                    }
                    if (ledgerEntry !== null) {
                        await __classPrivateFieldGet(this, _LighterProvider_resolveEntryPostDispatch, "f").call(this, accountIndex, ledgerEntry, fenceError !== null).catch(() => undefined);
                    }
                    if (fenceError !== null) {
                        throw (0, errorUtils_js_1.ensureError)(fenceError, 'LighterProvider.submit');
                    }
                    return response;
                };
                return await section(nextNonce, submit);
            };
            // The ENTIRE nonce resolve→fetch→sign/append→dispatch sequence is
            // serialized PROCESS-WIDE per network+account+api-key slot: the
            // instance chain alone cannot stop a second live provider from
            // issuing the same nonce or interleaving ledger writes.
            const guardedSection = async () => await withProcessMutex(`lighterVenueWrite:${__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet'}:${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}`, 
            // INNERMOST: the bridge mutex — the WASM client is a singleton
            // per bridge, so ensure-correct-client + every sign of a section
            // are serialized across ALL providers sharing the bridge.
            async () => await withProcessMutex(bridgeMutexKey(__classPrivateFieldGet(this, _LighterProvider_rawSignerBridge, "f").call(this)), criticalSection));
            const run = __classPrivateFieldGet(this, _LighterProvider_writeChain, "f").then(guardedSection, guardedSection);
            __classPrivateFieldSet(this, _LighterProvider_writeChain, run.then(() => undefined, () => undefined), "f");
            return await run;
        });
        _LighterProvider_withVenueNonce.set(this, async (accountIndex, operation, generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) => await __classPrivateFieldGet(this, _LighterProvider_withVenueWriteLock, "f").call(this, accountIndex, async (nextNonce, submit) => operation(await nextNonce(), submit), generationAtIntent));
        /**
         * Re-create OUR venue client on the shared bridge after another
         * identity overwrote the singleton. MUST run while holding the bridge
         * mutex. The wallet-derived seed is re-derived here — never retained.
         *
         * @param generation - The caller's captured session generation.
         * @param nonce - A fresh venue nonce for the client creation.
         */
        _LighterProvider_reestablishSignerClient.set(this, async (generation, nonce) => {
            const recreateParams = __classPrivateFieldGet(this, _LighterProvider_signerRecreateParams, "f");
            const identity = __classPrivateFieldGet(this, _LighterProvider_signerIdentity, "f");
            if (recreateParams === null || identity === null) {
                throw new Error('Lighter signer client re-establishment attempted before setup');
            }
            const seed = await __classPrivateFieldGet(this, _LighterProvider_walletService, "f").deriveKeySeedPlain(__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const recreated = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                function: '_createClient',
                params: [
                    seed,
                    recreateParams.chainId,
                    recreateParams.accountIndex,
                    nonce,
                    __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"),
                ],
            });
            if (recreated.error || !recreated.success) {
                throw new Error(`Lighter signer client re-establishment failed: ${recreated.error ?? 'unknown'}`);
            }
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            bridgeClientOwners.set(__classPrivateFieldGet(this, _LighterProvider_rawSignerBridge, "f").call(this), identity);
        });
        _LighterProvider_getAuthToken.set(this, async () => {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const nowSeconds = Math.floor(Date.now() / 1000);
            if (__classPrivateFieldGet(this, _LighterProvider_authToken, "f") && __classPrivateFieldGet(this, _LighterProvider_authToken, "f").deadline - nowSeconds > 60) {
                return __classPrivateFieldGet(this, _LighterProvider_authToken, "f").token;
            }
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            // The auth-token mint is a singleton-client call like any other sign:
            // it runs under the BRIDGE LEASE, and re-establishes OUR client first
            // when another identity has since overwritten it — otherwise the
            // token would be minted by the wrong account's venue key.
            const token = await withProcessMutex(bridgeMutexKey(__classPrivateFieldGet(this, _LighterProvider_rawSignerBridge, "f").call(this)), async () => {
                if (__classPrivateFieldGet(this, _LighterProvider_signerIdentity, "f") !== null &&
                    __classPrivateFieldGet(this, _LighterProvider_signerRecreateParams, "f") !== null &&
                    bridgeClientOwners.get(__classPrivateFieldGet(this, _LighterProvider_rawSignerBridge, "f").call(this)) !==
                        __classPrivateFieldGet(this, _LighterProvider_signerIdentity, "f")) {
                    // Client creation is bridge-local: the read-only nonce fetch
                    // seeds its tracking without dispatching anything.
                    const nonceResponse = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getNextNonce(__classPrivateFieldGet(this, _LighterProvider_signerRecreateParams, "f").accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f"));
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                    await __classPrivateFieldGet(this, _LighterProvider_reestablishSignerClient, "f").call(this, generation, nonceResponse.nonce);
                }
                return await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_createAuthToken',
                    params: [accountIndex, __classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")],
                });
            });
            if (token.error || !token.token) {
                throw new Error(`Lighter auth token creation failed: ${token.error ?? 'unknown'}`);
            }
            // Rebind first so an unobserved external switch during the bridge call
            // advances the generation, then compare: a token minted under a binding
            // that no longer exists must never be cached — re-mint under the new
            // captured session instead.
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            if (generation !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
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
        /**
         * STRICT active-orders read: any REST/auth failure THROWS. Mutation
         * flows (TP/SL replacement/removal) must use this — treating a swallowed
         * [] as authoritative would let them "succeed" while cancelling nothing.
         *
         * @returns Adapted open orders.
         */
        _LighterProvider_readOpenOrdersStrict.set(this, async () => {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const authToken = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            // The index and the token must belong to the SAME session — never
            // pair the previous account's index with the new account's token.
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getActiveOrders(accountIndex, authToken);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            return response.orders.map((order) => (0, lighterAdapter_js_1.adaptOrderFromLighter)(order, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(order.marketIndex)?.symbol ??
                String(order.marketIndex)));
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
            if (requested === undefined) {
                return null;
            }
            // Venue state decides, never the caller's possibly-stale
            // existingPositionLeverage snapshot.
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
        /**
         * Resolve the FRESH venue reference price for a market-order sizing,
         * with the same fail-closed and drift semantics as execution — shared
         * by placement and close validation so they can never disagree.
         *
         * @param symbol - Market symbol.
         * @param slippageFraction - Caller slippage tolerance (fraction).
         * @param priceAtCalculation - Caller's sizing snapshot, if any.
         * @returns The fresh reference price, or the exact execution error.
         */
        _LighterProvider_resolveMarketReferencePrice.set(this, async (symbol, slippageFraction, priceAtCalculation) => {
            // Numeric intent validates fail-closed BEFORE any drift math. A
            // non-finite/non-positive snapshot makes the drift comparison NaN
            // (silently bypassing protection), and a tolerance at or above 100%
            // derives a zero-or-negative protection price on sells.
            if (!Number.isFinite(slippageFraction) ||
                slippageFraction < 0 ||
                slippageFraction >= 1) {
                return {
                    referencePrice: null,
                    error: `Invalid slippage tolerance ${slippageFraction * 10000} bps: must be at least 0 and below 10000`,
                };
            }
            if (priceAtCalculation !== undefined &&
                (!Number.isFinite(priceAtCalculation) || !(priceAtCalculation > 0))) {
                return {
                    referencePrice: null,
                    error: `Invalid price snapshot ${priceAtCalculation}: must be a positive finite number`,
                };
            }
            // Always a FRESH venue price: the caller's currentPrice is the same
            // snapshot as priceAtCalculation, and a drift check that compares a
            // snapshot to itself would never fire.
            const details = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBookDetails();
            const freshPrice = details.orderBookDetails.find((entry) => entry.symbol === symbol)
                ?.lastTradePrice ?? 0;
            if (!Number.isFinite(freshPrice) || !(freshPrice > 0)) {
                // Fail closed: falling back to the caller's snapshot would let the
                // drift check compare that snapshot to itself.
                return {
                    referencePrice: null,
                    error: `No live venue price available for ${symbol}; refusing to size a market order`,
                };
            }
            if (priceAtCalculation !== undefined &&
                priceAtCalculation > 0 &&
                Math.abs(freshPrice - priceAtCalculation) / priceAtCalculation >
                    slippageFraction) {
                return {
                    referencePrice: null,
                    error: `Price moved beyond the ${(slippageFraction * 100).toFixed(2)}% slippage tolerance since sizing`,
                };
            }
            return { referencePrice: freshPrice, error: null };
        });
        /**
         * Validate the shape of a close request (shared by validateClosePosition
         * and closePosition so validation can never approve a close the
         * execution path refuses).
         *
         * @param params - Close request.
         * @returns Error message, or null when the shape is acceptable.
         */
        /**
         * The mobile close sheet sends a FULL close as an EMPTY size string
         * (`size: sizeToClose || ''`); HyperLiquid and TradingService treat a
         * falsy size as "no explicit size", so this venue honors the same
         * contract — an empty/whitespace size or usdAmount means full close,
         * never a validation failure.
         *
         * @param params - Raw close request.
         * @returns The request with empty-string sizing normalized to absent.
         */
        _LighterProvider_normalizeCloseParams.set(this, (params) => ({
            ...params,
            size: params.size?.trim() ? params.size : undefined,
            usdAmount: params.usdAmount?.trim() ? params.usdAmount : undefined,
        }));
        _LighterProvider_validateCloseShape.set(this, (params) => {
            const closeOrderType = params.orderType ?? 'market';
            if (closeOrderType !== 'market' && closeOrderType !== 'limit') {
                return `Lighter cannot close with a ${closeOrderType} order; use market or limit`;
            }
            if (closeOrderType === 'limit' && !params.price) {
                return 'Limit close requires a price';
            }
            if (params.usdAmount !== undefined &&
                parseFinitePositive(params.usdAmount) === null) {
                // Finite REQUIRED: a non-finite usdAmount must never fall back to
                // held-size validation while execution forwards the infinite USD
                // into placement.
                return `Invalid usdAmount ${params.usdAmount}: must be a positive number`;
            }
            // closePosition forwards an explicit size to placement, which rejects
            // non-finite or non-positive values; validation must match.
            if (params.usdAmount === undefined &&
                params.size !== undefined &&
                parseFinitePositive(params.size) === null) {
                return 'Order size must be positive';
            }
            return null;
        });
        /**
         * Live check whether a below-minimum reduce-only request is actually a
         * full close of the held position (shared by placement and validation).
         *
         * @param symbol - Market symbol.
         * @param requestedSize - Requested base size.
         * @returns True when the live position verifies a full close.
         */
        _LighterProvider_isVerifiedFullClose.set(this, async (symbol, requestedSize) => {
            const positions = await this.getPositions();
            const held = Math.abs(parseFloat(positions.find((entry) => entry.symbol === symbol)?.size ?? '0'));
            // Exact match (float epsilon only): closePosition forwards the precise
            // live size, and anything less is a deliberate partial that a min-size
            // bump would silently over-close.
            return held > 0 && requestedSize >= held * (1 - 1e-9);
        });
        _LighterProvider_validateOrderChecks.set(this, async (params) => {
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
            if (params.orderType === 'limit' && params.price !== undefined) {
                // Strict finite parity with placement, LIMIT ONLY: 'Infinity' and
                // prefix-numeric strings ('90000USD') both parse under a bare
                // parseFloat check but placement refuses them. Market placement
                // ignores params.price entirely (fresh venue price), so rejecting
                // it here would fail orders placement accepts.
                if (parseFinitePositive(params.price) === null) {
                    return {
                        isValid: false,
                        error: `Invalid limit price ${params.price}: must be a positive number`,
                    };
                }
            }
            const leverageError = lighterLeverageError(params.leverage);
            if (leverageError) {
                return { isValid: false, error: leverageError };
            }
            let usdAmount;
            if (params.usdAmount !== undefined) {
                const parsedUsd = parseFinitePositive(params.usdAmount);
                if (parsedUsd === null) {
                    return {
                        isValid: false,
                        error: `Invalid usdAmount ${params.usdAmount}: must be a positive number`,
                    };
                }
                usdAmount = parsedUsd;
            }
            const hasUsdSizing = usdAmount !== undefined;
            if (!hasUsdSizing && parseFinitePositive(params.size) === null) {
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
            if (params.leverage !== undefined) {
                // Same authoritative-metadata requirement as placement.
                const maxLeverage = await __classPrivateFieldGet(this, _LighterProvider_requireMarketMaxLeverage, "f").call(this, params.symbol);
                if (maxLeverage === null) {
                    return {
                        isValid: false,
                        error: `Cannot validate leverage for ${params.symbol}: venue margin metadata unavailable`,
                    };
                }
                if (params.leverage > maxLeverage) {
                    return {
                        isValid: false,
                        error: `Invalid leverage ${params.leverage}: exceeds the ${params.symbol} maximum of ${maxLeverage}x`,
                    };
                }
            }
            // Reference-price parity with placement: a MARKET order sizes at the
            // FRESH venue price through the SAME resolver (fail-closed missing
            // price, snapshot and slippage intent validation, drift) — the
            // caller's price/currentPrice is never trusted for min-size. A LIMIT
            // order sizes at the caller's (finite-validated) price. The EXECUTION
            // price is derived through the same helper placement signs with, so
            // the wire-range check below inspects the exact signed value.
            let referencePrice;
            let executionPrice;
            if (params.orderType === 'market') {
                const slippageFraction = params.maxSlippageBps === undefined
                    ? (params.slippage ?? 0.05)
                    : params.maxSlippageBps / 10000;
                // A validator must RESOLVE to an invalid result, never reject: the
                // fresh-price lookup can throw on REST failure.
                let resolved;
                try {
                    resolved = await __classPrivateFieldGet(this, _LighterProvider_resolveMarketReferencePrice, "f").call(this, params.symbol, slippageFraction, params.priceAtCalculation);
                }
                catch (error) {
                    return {
                        isValid: false,
                        error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateOrder').message,
                    };
                }
                if (resolved.error !== null) {
                    return { isValid: false, error: resolved.error };
                }
                referencePrice = resolved.referencePrice;
                executionPrice = deriveLighterExecutionPrice(referencePrice, params.isBuy, slippageFraction);
            }
            else {
                referencePrice = parseFloat(params.price ?? String(params.currentPrice ?? 0));
                executionPrice = referencePrice;
            }
            if (referencePrice > 0) {
                // USD-derived sizes snap onto the venue grid (placement parity);
                // explicit size strings stay verbatim.
                const requestedSize = usdAmount === undefined
                    ? parseFloat(params.size)
                    : snapToLighterSizeGrid(usdAmount / referencePrice, market.supportedSizeDecimals);
                const minSize = (0, lighterConfig_js_1.computeLighterMinOrderSize)(market, referencePrice);
                if (requestedSize < minSize) {
                    // EXACTLY the placement rule: only reduce-only orders may bump to
                    // the venue minimum, and only when the live position verifies a
                    // full close; isFullClose remains an untrusted hint. The live read
                    // can THROW (capability gates, venue-data integrity): a validator
                    // must resolve to an explicit invalid result, never reject.
                    let verifiedFullClose = false;
                    if (params.reduceOnly) {
                        try {
                            verifiedFullClose = await __classPrivateFieldGet(this, _LighterProvider_isVerifiedFullClose, "f").call(this, params.symbol, requestedSize);
                        }
                        catch (error) {
                            return {
                                isValid: false,
                                error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateOrder')
                                    .message,
                            };
                        }
                    }
                    if (!verifiedFullClose) {
                        return {
                            isValid: false,
                            error: `Order size ${requestedSize} is below the Lighter minimum of ${minSize} ${params.symbol}`,
                        };
                    }
                }
                // Wire-format parity: placement integerizes size and the
                // slippage-adjusted EXECUTION price; toLighterInteger throws on
                // safe-integer overflow and wire-zero there; surface the identical
                // error here so validation never approves an order the signer path
                // refuses (a safe reference can still overflow after +5%).
                try {
                    toSignerWireInteger(requestedSize, market.supportedSizeDecimals);
                    toSignerWirePriceInteger(executionPrice, market.supportedPriceDecimals);
                }
                catch (error) {
                    return {
                        isValid: false,
                        error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateOrder').message,
                    };
                }
            }
            return { isValid: true };
        });
        _LighterProvider_validateClosePositionChecks.set(this, async (rawParams) => {
            const params = __classPrivateFieldGet(this, _LighterProvider_normalizeCloseParams, "f").call(this, rawParams);
            // Same shape rules the execution path enforces.
            const shapeError = __classPrivateFieldGet(this, _LighterProvider_validateCloseShape, "f").call(this, params);
            if (shapeError) {
                return { isValid: false, error: shapeError };
            }
            const markets = await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const market = markets.get(params.symbol);
            if (!market) {
                return {
                    isValid: false,
                    error: `Unknown Lighter market ${params.symbol}`,
                };
            }
            // Live sizing parity with closePosition→placeOrder: a validator that
            // approves a close the execution path rejects is worse than none.
            // Capability and data-integrity errors from the read surface as an
            // explicit invalid result, never an exception or a silent empty.
            let positions;
            try {
                positions = await this.getPositions();
            }
            catch (error) {
                return {
                    isValid: false,
                    error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateClosePosition')
                        .message,
                };
            }
            const signedHeld = parseFloat(positions.find((entry) => entry.symbol === params.symbol)?.size ?? '0');
            const held = Math.abs(signedHeld);
            if (held === 0) {
                return {
                    isValid: false,
                    error: `No open Lighter position for ${params.symbol}`,
                };
            }
            // Order-type-specific pricing, matching execution exactly: a LIMIT
            // close is sized at the caller's price (which must be a finite
            // positive number — never silently replaced by a live price the
            // execution path would not use); a MARKET close resolves the FRESH
            // venue price through the SAME helper as placement, inheriting its
            // fail-closed missing-price and drift semantics.
            let referencePrice;
            let executionPrice;
            if ((params.orderType ?? 'market') === 'limit') {
                const parsedLimitPrice = parseFinitePositive(params.price ?? '');
                if (parsedLimitPrice === null) {
                    return {
                        isValid: false,
                        error: `Invalid limit price ${params.price}: must be a positive number`,
                    };
                }
                referencePrice = parsedLimitPrice;
                executionPrice = referencePrice;
            }
            else {
                const slippageFraction = params.maxSlippageBps === undefined
                    ? 0.05
                    : params.maxSlippageBps / 10000;
                // Same validator contract as validateOrder: REST failures resolve.
                let resolved;
                try {
                    resolved = await __classPrivateFieldGet(this, _LighterProvider_resolveMarketReferencePrice, "f").call(this, params.symbol, slippageFraction, params.priceAtCalculation);
                }
                catch (error) {
                    return {
                        isValid: false,
                        error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateClosePosition')
                            .message,
                    };
                }
                if (resolved.error !== null) {
                    return { isValid: false, error: resolved.error };
                }
                referencePrice = resolved.referencePrice;
                // Closing is the opposite side: a SHORT closes with a BUY, whose
                // +slippage protection price is what placement actually signs.
                executionPrice = deriveLighterExecutionPrice(referencePrice, signedHeld < 0, slippageFraction);
            }
            if (referencePrice > 0) {
                const usdAmount = parseFloat(params.usdAmount ?? '');
                // USD-derived sizes snap onto the venue grid (placement parity);
                // explicit size strings stay verbatim.
                const requestedSize = Number.isFinite(usdAmount) && usdAmount > 0
                    ? snapToLighterSizeGrid(usdAmount / referencePrice, market.supportedSizeDecimals)
                    : parseFloat(params.size ?? String(held));
                const minSize = (0, lighterConfig_js_1.computeLighterMinOrderSize)(market, referencePrice);
                if (requestedSize < minSize && !(requestedSize >= held * (1 - 1e-9))) {
                    return {
                        isValid: false,
                        error: `Order size ${requestedSize} is below the Lighter minimum of ${minSize} ${params.symbol}`,
                    };
                }
                // Wire-format parity with the placement path closePosition uses:
                // the EXECUTION price is what gets integerized and signed.
                try {
                    toSignerWireInteger(requestedSize, market.supportedSizeDecimals);
                    toSignerWirePriceInteger(executionPrice, market.supportedPriceDecimals);
                }
                catch (error) {
                    return {
                        isValid: false,
                        error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateClosePosition')
                            .message,
                    };
                }
            }
            return { isValid: true };
        });
        /** Per-market margin fractions + last price from orderBookDetails. */
        _LighterProvider_marginBySymbol.set(this, new Map());
        /**
         * Synchronous best-effort per-market max leverage from the margin cache
         * (populated by #ensureMarketMargins); the constant covers cache misses.
         *
         * @param marketId - Numeric Lighter market id.
         * @returns Max leverage for the market.
         */
        _LighterProvider_maxLeverageForMarketId.set(this, (marketId) => {
            const symbol = __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(marketId)?.symbol;
            const minInitial = symbol
                ? __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").get(symbol)?.minInitial
                : undefined;
            return minInitial && minInitial > 0
                ? Math.floor(10000 / minInitial)
                : lighterConfig_js_1.LIGHTER_MAX_LEVERAGE;
        });
        /**
         * Authoritative per-market max leverage for TRADING validation: unlike
         * getMaxLeverage (which may fall back to the global constant for
         * display), this returns null when the venue's margin metadata is
         * missing or unreadable so leverage validation fails CLOSED — the 50x
         * fallback must never approve 26x for what may be a 25x market.
         *
         * @param symbol - Market symbol.
         * @returns The published max leverage, or null when unavailable.
         */
        _LighterProvider_requireMarketMaxLeverage.set(this, async (symbol) => {
            try {
                await __classPrivateFieldGet(this, _LighterProvider_ensureMarketMargins, "f").call(this);
            }
            catch {
                return null;
            }
            const minInitial = __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").get(symbol)?.minInitial;
            if (typeof minInitial !== 'number' || !(minInitial > 0)) {
                return null;
            }
            return Math.floor(10000 / minInitial);
        });
        /** When the margin-metadata cache was last refreshed (0 = never). */
        _LighterProvider_marginFetchedAt.set(this, 0);
        /** In-flight authoritative margin refresh, shared by the stale epoch. */
        _LighterProvider_marginRefreshInFlight.set(this, null);
        _LighterProvider_ensureMarketMargins.set(this, async () => {
            // TTL refresh: metadata cached once for the whole session would keep
            // validating leverage against a stale (possibly higher) max. On
            // expiry the fetch re-runs; if it fails, the throw propagates and
            // #requireMarketMaxLeverage fails CLOSED for explicit leverage while
            // display callers keep their catch+fallback behavior.
            if (__classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").size > 0 &&
                Date.now() - __classPrivateFieldGet(this, _LighterProvider_marginFetchedAt, "f") < lighterConfig_js_1.LIGHTER_MARGIN_METADATA_TTL_MS) {
                return;
            }
            // ONE authoritative request per stale epoch: overlapping independent
            // fetches can resolve out of order, letting a DELAYED older payload
            // overwrite a fresher cap for a full TTL. A rejection propagates to
            // every waiter of this epoch (fail closed) and clears the in-flight
            // slot in finally so a later call can retry.
            if (!__classPrivateFieldGet(this, _LighterProvider_marginRefreshInFlight, "f")) {
                __classPrivateFieldSet(this, _LighterProvider_marginRefreshInFlight, (async () => {
                    try {
                        const details = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getOrderBookDetails();
                        // Atomic replacement: set()-ing into the old map would let a
                        // symbol REMOVED from fresh metadata keep its stale cap forever.
                        // The timestamp only advances on success.
                        const fresh = new Map();
                        for (const detail of details.orderBookDetails) {
                            fresh.set(detail.symbol, {
                                minInitial: detail.minInitialMarginFraction,
                                maintenance: detail.maintenanceMarginFraction,
                                lastTradePrice: detail.lastTradePrice,
                            });
                        }
                        __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").clear();
                        for (const [symbol, entry] of fresh) {
                            __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").set(symbol, entry);
                        }
                        __classPrivateFieldSet(this, _LighterProvider_marginFetchedAt, Date.now(), "f");
                    }
                    finally {
                        __classPrivateFieldSet(this, _LighterProvider_marginRefreshInFlight, null, "f");
                    }
                })(), "f");
            }
            await __classPrivateFieldGet(this, _LighterProvider_marginRefreshInFlight, "f");
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
            let channelsRequested = false;
            const setupPromise = (async () => {
                try {
                    // Warm the margin cache before any WS position frame is adapted.
                    await __classPrivateFieldGet(this, _LighterProvider_ensureMarketMargins, "f").call(this).catch(() => undefined);
                    const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
                    // Address-aware: an EXTERNAL switch during the lookup (with no other
                    // provider call to advance the generation) must also stop these
                    // channels from being requested for the old account. The rebind
                    // inside the binding call triggers its own rebuild for the new one.
                    // Fails closed when no wallet account is bound — a configured
                    // account index alone must never subscribe user channels.
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                    __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `user_stats/${accountIndex}`);
                    __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `account_all_positions/${accountIndex}`);
                    __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `account_all_trades/${accountIndex}`);
                    channelsRequested = true;
                    try {
                        const auth = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
                        __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
                        __classPrivateFieldGet(this, _LighterProvider_requestChannel, "f").call(this, `account_all_orders/${accountIndex}`, auth);
                    }
                    catch (error) {
                        __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] orders channel skipped (no auth token)', { error: String(error) });
                        // Only the CURRENT session may blank the order subscribers: an
                        // auth failure from an aborted previous-account setup must not
                        // overwrite the new account's live orders with [].
                        if (generation === __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                            __classPrivateFieldGet(this, _LighterProvider_emitToOrderSubscribers, "f").call(this, []);
                        }
                    }
                }
                catch (error) {
                    __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] account channels unavailable', { error: String(error) });
                    // Only the CURRENT session may blank the subscribers: an aborted
                    // previous-account setup must not overwrite the new account's data
                    // with empty emissions.
                    if (generation !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f")) {
                        return;
                    }
                    // Capability gates (Premium/unverified tier, cross-owner config)
                    // are not "no data": emitting empty state for them would present
                    // false emptiness where reads surface an explicit error. Preserve
                    // whatever the subscribers last saw and only log.
                    if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, error)) {
                        return;
                    }
                    for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_accountSubscribers, "f")) {
                        subscriber.callback(EMPTY_ACCOUNT_STATE);
                    }
                    for (const subscriber of __classPrivateFieldGet(this, _LighterProvider_positionSubscribers, "f")) {
                        subscriber.callback([]);
                    }
                    __classPrivateFieldGet(this, _LighterProvider_emitToOrderSubscribers, "f").call(this, []);
                }
            })();
            __classPrivateFieldSet(this, _LighterProvider_accountChannelsPromise, setupPromise, "f");
            // A setup that never requested channels (no wallet account yet, or an
            // aborted switch) must not satisfy future ensure calls — clear it so
            // the next bind retries, without clobbering a newer session's promise.
            setupPromise
                .then(() => {
                if (!channelsRequested &&
                    __classPrivateFieldGet(this, _LighterProvider_accountChannelsPromise, "f") === setupPromise) {
                    __classPrivateFieldSet(this, _LighterProvider_accountChannelsPromise, null, "f");
                }
                return undefined;
            })
                .catch(() => undefined);
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
            const url = (0, lighterConfig_js_1.getLighterWsEndpoint)(__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet');
            const WebSocketCtor = __classPrivateFieldGet(this, _LighterProvider_webSocketCtor, "f");
            const ws = new WebSocketCtor(url);
            __classPrivateFieldSet(this, _LighterProvider_priceWs, ws, "f");
            __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, index_js_1.WebSocketConnectionState.Connecting);
            ws.onopen = () => {
                // Observe any external switch first, then drop if this socket was
                // replaced (by that rebind or an earlier one).
                __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
                if (__classPrivateFieldGet(this, _LighterProvider_priceWs, "f") !== ws) {
                    return;
                }
                const generationAtOpen = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
                __classPrivateFieldSet(this, _LighterProvider_wsReconnectAttempts, 0, "f");
                __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, index_js_1.WebSocketConnectionState.Connected);
                for (const [channel, meta] of __classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f")) {
                    if (meta.auth) {
                        // Auth tokens are short-lived; a reconnect after the deadline must
                        // re-mint instead of replaying the token captured at subscribe
                        // time. #getAuthToken reuses the cached token while it is fresh.
                        __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this)
                            .then((freshToken) => {
                            // The async continuation may resolve after an account switch
                            // replaced the socket or the channel set: never reinsert a
                            // stale channel or pair it with the new session's token.
                            if (__classPrivateFieldGet(this, _LighterProvider_priceWs, "f") !== ws ||
                                generationAtOpen !== __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f") ||
                                !__classPrivateFieldGet(this, _LighterProvider_wsWantedChannels, "f").has(channel)) {
                                return undefined;
                            }
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
                // Re-run the live binding first: an EXTERNAL account switch that no
                // provider call has observed yet must tear this socket down (the
                // rebind replaces it) before any frame routes into current UI.
                __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
                // Frames from a socket that was replaced (account rebind, reconnect)
                // must never reach the router — they carry the previous session's data.
                if (__classPrivateFieldGet(this, _LighterProvider_priceWs, "f") !== ws) {
                    return;
                }
                __classPrivateFieldGet(this, _LighterProvider_handleWsMessage, "f").call(this, String(event.data));
            };
            ws.onclose = () => {
                if (__classPrivateFieldGet(this, _LighterProvider_priceWs, "f") !== ws) {
                    return;
                }
                __classPrivateFieldSet(this, _LighterProvider_priceWs, null, "f");
                __classPrivateFieldGet(this, _LighterProvider_clearKeepalive, "f").call(this);
                __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, index_js_1.WebSocketConnectionState.Disconnected);
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
                message = (0, LighterClientService_js_1.convertKeysToCamelCase)(JSON.parse(raw));
            }
            catch (error) {
                __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] price stream message parse failed', { error: String(error) });
                return;
            }
            const type = message.type ?? '';
            if (type.includes('market_stats') && message.marketStats) {
                const timestamp = message.timestamp ?? Date.now();
                const updates = Object.values(message.marketStats).map((stat) => (0, lighterAdapter_js_1.adaptPriceUpdateFromLighterWsStat)(stat, timestamp));
                __classPrivateFieldGet(this, _LighterProvider_dispatchPriceUpdates, "f").call(this, updates, 'ws');
                __classPrivateFieldGet(this, _LighterProvider_dispatchOICaps, "f").call(this, Object.values(message.marketStats));
                return;
            }
            if (type.includes('user_stats') && message.stats) {
                const accountState = (0, lighterAdapter_js_1.adaptAccountStateFromLighterUserStats)(message.stats);
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
                    const adapted = (0, lighterAdapter_js_1.adaptPositionFromLighter)(position, __classPrivateFieldGet(this, _LighterProvider_maxLeverageForMarketId, "f").call(this, position.marketId));
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
                        const adapted = (0, lighterAdapter_js_1.adaptOrderFromLighter)(order, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(order.marketIndex)?.symbol ??
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
            let droppedUnsupportedFill = false;
            for (const marketTrades of Object.values(message.trades ?? {})) {
                for (const trade of marketTrades) {
                    const symbol = __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(trade.marketId)?.symbol ??
                        String(trade.marketId);
                    // One adapter serves REST history and the live stream so pnl,
                    // fees, and direction vocabulary can never diverge between them.
                    // A capability-refused fill (unverified nonzero fee) must never be
                    // rendered with a false zero fee, nor crash the event handler.
                    try {
                        fills.push((0, lighterAdapter_js_1.adaptFillFromLighterTrade)(trade, symbol, __classPrivateFieldGet(this, _LighterProvider_accountIndex, "f") ?? -1));
                    }
                    catch (error) {
                        droppedUnsupportedFill = true;
                        __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] dropped unsupported fill from stream', { tradeId: trade.tradeId, error: String(error) });
                    }
                }
            }
            if (fills.length === 0 && !isSnapshot) {
                return;
            }
            // A snapshot that lost fills to a capability refusal is PARTIAL:
            // emitting it would overwrite valid cached history with false
            // emptiness. Preserve what subscribers already have; REST reads
            // surface the capability error explicitly.
            if (isSnapshot && droppedUnsupportedFill) {
                __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] withholding partial fills snapshot (unsupported fills present)');
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
            __classPrivateFieldSet(this, _LighterProvider_pricePollTimer, setInterval(poll, lighterConfig_js_1.LIGHTER_PRICE_POLLING_INTERVAL_MS), "f");
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
            const updates = (response.orderBookDetails ?? []).map((detail) => (0, lighterAdapter_js_1.adaptPriceUpdateFromLighter)(detail, timestamp));
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
            __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, index_js_1.WebSocketConnectionState.Disconnected);
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
                const resolution = lighterConfig_js_1.LIGHTER_SUPPORTED_RESOLUTIONS.has(options.interval)
                    ? options.interval
                    : '15m';
                const intervalMs = lighterConfig_js_1.LIGHTER_RESOLUTION_MS[resolution] ?? lighterConfig_js_1.LIGHTER_RESOLUTION_MS['15m'];
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
            // Only the MAINNET bridge is ever advertised: the effective-testnet
            // branches return [] before reaching here (devnet L1 unreachable).
            const bridge = lighterConfig_js_1.LIGHTER_BRIDGE_CONFIG.mainnet;
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
        __classPrivateFieldSet(this, _LighterProvider_apiKeyIndex, options.lighterAuthConfig?.apiKeyIndex ?? lighterConfig_js_1.LIGHTER_DEFAULT_API_KEY_INDEX, "f");
        __classPrivateFieldSet(this, _LighterProvider_configuredAccountIndex, options.lighterAuthConfig?.accountIndex, "f");
        __classPrivateFieldSet(this, _LighterProvider_clientService, new LighterClientService_js_1.LighterClientService(__classPrivateFieldGet(this, _LighterProvider_deps, "f"), {
            isTestnet: __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f"),
        }), "f");
        __classPrivateFieldSet(this, _LighterProvider_walletService, new LighterWalletService_js_1.LighterWalletService(__classPrivateFieldGet(this, _LighterProvider_deps, "f"), {
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
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.initialize');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] initialize failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'initialize'),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    async disconnect() {
        // A disconnect (provider switch, shutdown) invalidates the whole
        // session: an in-flight write paused inside the lock must fail its
        // fences instead of submitting after the provider was torn down.
        __classPrivateFieldGet(this, _LighterProvider_invalidateSessionState, "f").call(this);
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
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.isReadyToTrade');
            return {
                ready: false,
                error: wrappedError.message,
                walletConnected: false,
                networkSupported: true,
            };
        }
    }
    /**
     * List TP/SL obligations parked in DURABLE manual-recovery state: the
     * venue removed (or rejected) protection in a way that cannot be
     * safely re-established automatically. Surfaced to callers/UI; each
     * entry resolves when the user issues a new explicit TP/SL update for
     * the symbol.
     *
     * @returns Parked manual-recovery entries.
     */
    async getPendingManualRecoveries() {
        __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
        const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
        // ONLY the bound identity's parked warnings: another account's (or
        // api key's) protection state must never leak into this session.
        const identityPrefix = `${__classPrivateFieldGet(this, _LighterProvider_boundAddress, "f") ?? 'unbound'}:${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}:`;
        const pending = [];
        const actionNeeded = 'Review the position and submit a new explicit TP/SL update for this symbol to re-establish protection';
        // Storage errors PROPAGATE — a corrupt index degrading to "nothing
        // pending" would hide a naked position.
        const manualIndex = await __classPrivateFieldGet(this, _LighterProvider_readTpslManualIndex, "f").call(this);
        for (const settlementKey of manualIndex) {
            if (!settlementKey.startsWith(identityPrefix)) {
                continue;
            }
            const doc = await __classPrivateFieldGet(this, _LighterProvider_loadTpslManualRecovery, "f").call(this, settlementKey);
            if (doc) {
                pending.push({
                    symbol: doc.symbol,
                    settlementKey,
                    recordedAt: doc.recordedAt,
                    reason: doc.reason,
                    priorIntent: doc.priorIntent,
                    survivingOrderIds: doc.survivingOrderIds,
                    actionNeeded,
                });
            }
        }
        // Legacy: journals parked 'manual' in the journal slot by an earlier
        // version (migrated to the doc on the next settle pass).
        const journalIndex = await __classPrivateFieldGet(this, _LighterProvider_readTpslJournalIndex, "f").call(this);
        for (const settlementKey of journalIndex) {
            if (!settlementKey.startsWith(identityPrefix) ||
                pending.some((entry) => entry.settlementKey === settlementKey)) {
                continue;
            }
            const journal = await __classPrivateFieldGet(this, _LighterProvider_loadTpslJournal, "f").call(this, settlementKey);
            if (journal?.phase === 'manual') {
                pending.push({
                    symbol: settlementKey.split(':').at(-1) ?? settlementKey,
                    settlementKey,
                    recordedAt: journal.recordedAt,
                    reason: 'TP/SL protection could not be safely re-established automatically (parked by an earlier session)',
                    priorIntent: journal.intent,
                    survivingOrderIds: [],
                    actionNeeded,
                });
            }
        }
        return pending;
    }
    /**
     * READ-ONLY view of the durable recovered-dispatch outcomes
     * (previously ambiguous submissions later resolved). Never mutates the
     * ledger — acknowledgment is a separate, per-outcome call so a crash
     * between reading and acting can never silently drop an outcome.
     *
     * @returns The pending recovered-dispatch outcomes.
     */
    async getRecoveredDispatches() {
        __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
        const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
        const doc = await __classPrivateFieldGet(this, _LighterProvider_readNonceLedger, "f").call(this, accountIndex);
        return doc.recovered.map((outcome) => ({ ...outcome }));
    }
    /**
     * Acknowledge ONE recovered-dispatch outcome by its stable id, after
     * the caller has refreshed venue state and decided how to proceed.
     * Runs under the ledger mutex and re-verifies the session generation
     * inside it so an account switch mid-acknowledge can never clear
     * another account's outcome.
     *
     * @param recoveryId - Stable id from {@link getRecoveredDispatches}.
     */
    async acknowledgeRecoveredDispatch(recoveryId) {
        __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
        const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
        const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
        await withProcessMutex(__classPrivateFieldGet(this, _LighterProvider_nonceLedgerKey, "f").call(this, accountIndex), async () => {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const doc = await __classPrivateFieldGet(this, _LighterProvider_readNonceLedger, "f").call(this, accountIndex);
            const remaining = doc.recovered.filter((outcome) => outcome.recoveryId !== recoveryId);
            if (remaining.length === doc.recovered.length) {
                throw new Error(`No pending recovered Lighter dispatch matches id ${recoveryId}; refresh and re-read before acknowledging`);
            }
            await __classPrivateFieldGet(this, _LighterProvider_writeNonceLedger, "f").call(this, accountIndex, {
                consumedFloor: doc.consumedFloor,
                entries: doc.entries,
                recovered: remaining,
            });
        });
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
                const adapted = (0, lighterAdapter_js_1.adaptMarketFromLighter)(market);
                const margins = __classPrivateFieldGet(this, _LighterProvider_marginBySymbol, "f").get(market.symbol);
                if (margins?.minInitial && margins.minInitial > 0) {
                    adapted.maxLeverage = Math.floor(10000 / margins.minInitial);
                }
                // The venue floor is the SAME base size placement enforces:
                // max(minBase, minQuote/price) rounded UP to the size grid —
                // grid rounding matters (ETH: $10/price = 0.005222 rounds up
                // to 0.0053 ETH ≈ $10.15), so a flat quote-minimum default
                // lands one grid tick below the floor. Report that binding
                // base size in USD, rounded UP to whole cents.
                if (margins?.lastTradePrice && margins.lastTradePrice > 0) {
                    const minBaseSize = (0, lighterConfig_js_1.computeLighterMinOrderSize)(market, margins.lastTradePrice);
                    const bindingUsd = minBaseSize * margins.lastTradePrice;
                    if (Number.isFinite(bindingUsd) && bindingUsd > 0) {
                        adapted.minimumOrderSize = Math.ceil(bindingUsd * 100) / 100;
                    }
                }
                return adapted;
            });
        }
        catch (caughtError) {
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.getMarkets');
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
                .map((detail) => (0, lighterAdapter_js_1.adaptMarketDataFromLighter)(detail, __classPrivateFieldGet(this, _LighterProvider_deps, "f").marketDataFormatters));
        }
        catch (caughtError) {
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.getMarketDataWithPrices');
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
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            // Per-market max leverage comes from the margin cache; warm it so
            // known markets never fall back to the global constant.
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarketMargins, "f").call(this).catch(() => undefined);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getAccountByIndex(accountIndex);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const account = response.accounts[0];
            if (!account?.positions) {
                return [];
            }
            // Adapt BEFORE filtering: the adapter strict-validates raw numeric
            // sizes, and a prefix-parsing filter would silently drop (or keep)
            // malformed entries like '0oops' before validation could fire.
            return account.positions
                .map((position) => (0, lighterAdapter_js_1.adaptPositionFromLighter)(position, __classPrivateFieldGet(this, _LighterProvider_maxLeverageForMarketId, "f").call(this, position.marketId)))
                .filter((position) => parseFloat(position.size) !== 0);
        }
        catch (caughtError) {
            if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, caughtError) ||
                __classPrivateFieldGet(this, _LighterProvider_isDataIntegrityError, "f").call(this, caughtError)) {
                // Capability gates and venue-data integrity failures must surface,
                // never degrade into empty state that can preserve stale views.
                throw caughtError;
            }
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.getPositions');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getPositions failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getPositions'),
            });
            return [];
        }
    }
    async getAccountState(_params) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getAccountByIndex(accountIndex);
            // A delayed response for the previous account must never surface as
            // the current account's state.
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const account = response.accounts[0];
            if (!account) {
                return EMPTY_ACCOUNT_STATE;
            }
            return (0, lighterAdapter_js_1.adaptAccountStateFromLighter)(account);
        }
        catch (caughtError) {
            if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, caughtError)) {
                // Capability gates must surface, never degrade into empty state.
                throw caughtError;
            }
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.getAccountState');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getAccountState failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getAccountState'),
            });
            return EMPTY_ACCOUNT_STATE;
        }
    }
    async getOpenOrders(_params) {
        // Public reads re-kick pending journal recovery (deduped, detached).
        __classPrivateFieldGet(this, _LighterProvider_kickTpslRecovery, "f").call(this);
        try {
            return await __classPrivateFieldGet(this, _LighterProvider_readOpenOrdersStrict, "f").call(this);
        }
        catch (caughtError) {
            if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, caughtError)) {
                // Capability gates must surface, never degrade into empty state.
                throw caughtError;
            }
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.getOpenOrders');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getOpenOrders failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getOpenOrders'),
            });
            return [];
        }
    }
    async getOrders(params, _options) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const authToken = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getInactiveOrders(accountIndex, authToken);
            // Both legs (historical + open) must come from one session — a
            // switch mid-way would merge account A's history with B's orders.
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            const historical = (response.orders ?? []).map((order) => (0, lighterAdapter_js_1.adaptOrderFromLighter)(order, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(order.marketIndex)?.symbol ??
                String(order.marketIndex)));
            // Full lifecycle: open orders first, then the historical states.
            const open = await this.getOpenOrders(params);
            // getOpenOrders swallows its own cancellation into []; the merge must
            // still refuse to pair A's history with B's session.
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            return [...open, ...historical];
        }
        catch (caughtError) {
            if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, caughtError)) {
                // Capability gates must surface, never degrade into empty state.
                throw caughtError;
            }
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.getOrders');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getOrders failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'getOrders'),
            });
            return [];
        }
    }
    async getCurrentAccountId() {
        const address = __classPrivateFieldGet(this, _LighterProvider_walletService, "f").getUserAddress();
        const chainId = (0, lighterConfig_js_1.getLighterChainId)(__classPrivateFieldGet(this, _LighterProvider_clientService, "f").network);
        return `eip155:${chainId}:${address}`;
    }
    async placeOrder(params, inheritedGeneration) {
        // Tracks a COMMITTED leverage change so an order failing afterwards
        // reports the partial venue state explicitly instead of implying no
        // mutation happened.
        let leverageCommitted = false;
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
            const leverageError = lighterLeverageError(params.leverage);
            if (leverageError) {
                return { success: false, error: leverageError };
            }
            // Bind the write to the wallet account it was INITIATED under; if the
            // wallet switches before the queued critical section runs, it aborts.
            // A composite caller (closePosition) passes ITS generation so the
            // whole read-then-write sequence shares one intent identity.
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generationAtIntent = inheritedGeneration ?? __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            // All intent validation below uses PUBLIC market data only; signer
            // and account setup are deferred until it passes so invalid intent
            // causes zero bridge calls (no client creation or key registration
            // side effects).
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
            if (params.leverage !== undefined) {
                // Authoritative metadata REQUIRED: the display fallback (global
                // 50x) must never approve leverage for a market whose published
                // bound is unavailable.
                const maxLeverage = await __classPrivateFieldGet(this, _LighterProvider_requireMarketMaxLeverage, "f").call(this, params.symbol);
                if (maxLeverage === null) {
                    return {
                        success: false,
                        error: `Cannot validate leverage for ${params.symbol}: venue margin metadata unavailable`,
                    };
                }
                if (params.leverage > maxLeverage) {
                    return {
                        success: false,
                        error: `Invalid leverage ${params.leverage}: exceeds the ${params.symbol} maximum of ${maxLeverage}x`,
                    };
                }
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
            let referencePrice;
            if (params.orderType === 'limit') {
                // STRICT full-string parse: '90000USD' prefix-parses under
                // parseFloat and must never become signed intent.
                const parsedLimitPrice = parseFinitePositive(params.price ?? '');
                if (parsedLimitPrice === null) {
                    return {
                        success: false,
                        error: `Invalid limit price ${params.price}: must be a positive number`,
                    };
                }
                referencePrice = parsedLimitPrice;
            }
            else {
                referencePrice = parseFloat(params.price ?? String(params.currentPrice ?? 0));
            }
            let executionPrice = referencePrice;
            if (params.orderType === 'market') {
                const resolved = await __classPrivateFieldGet(this, _LighterProvider_resolveMarketReferencePrice, "f").call(this, params.symbol, slippageFraction, params.priceAtCalculation);
                if (resolved.error !== null) {
                    return { success: false, error: resolved.error };
                }
                referencePrice = resolved.referencePrice;
                executionPrice = deriveLighterExecutionPrice(referencePrice, params.isBuy, slippageFraction);
            }
            // Finite AND positive: 'Infinity' passes a bare > 0 check but would
            // corrupt integerization/signing downstream.
            if (!Number.isFinite(referencePrice) ||
                !(referencePrice > 0) ||
                !Number.isFinite(executionPrice) ||
                !(executionPrice > 0)) {
                return {
                    success: false,
                    error: 'Unable to resolve a finite execution price for the order',
                };
            }
            // USD is the source of truth when provided (hybrid sizing contract),
            // converted at the reference price — not the protection price. A
            // provided-but-invalid usdAmount is an error, never a silent fallback
            // to the size field.
            let requestedSize;
            if (params.usdAmount === undefined) {
                const parsedSize = parseFinitePositive(params.size);
                if (parsedSize === null) {
                    return { success: false, error: 'Order size must be positive' };
                }
                requestedSize = parsedSize;
            }
            else {
                const usdAmount = parseFinitePositive(params.usdAmount);
                if (usdAmount === null) {
                    return {
                        success: false,
                        error: `Invalid usdAmount ${params.usdAmount}: must be a positive number`,
                    };
                }
                // A USD amount is approximate by contract (converted at the
                // reference price), so it is snapped onto the venue size grid the
                // way wire integerization will round it — an explicit size string
                // is exact user intent and is never adjusted here.
                requestedSize = snapToLighterSizeGrid(usdAmount / referencePrice, market.supportedSizeDecimals);
            }
            if (!(requestedSize > 0)) {
                return { success: false, error: 'Order size must be positive' };
            }
            const minSize = (0, lighterConfig_js_1.computeLighterMinOrderSize)(market, referencePrice);
            if (requestedSize < minSize) {
                // Only a LIVE-VERIFIED full close may be bumped to the venue
                // minimum: reduce-only execution clamps to the position, so no
                // extra exposure results and dust positions stay closable. The
                // isFullClose flag is a hint, never trusted — a partial close
                // bumped to the minimum would close more than the caller asked.
                const verifiedFullClose = params.reduceOnly
                    ? await __classPrivateFieldGet(this, _LighterProvider_isVerifiedFullClose, "f").call(this, params.symbol, requestedSize)
                    : false;
                if (!verifiedFullClose) {
                    return {
                        success: false,
                        error: `Order size ${requestedSize} is below the Lighter minimum of ${minSize} ${params.symbol}`,
                    };
                }
            }
            const size = Math.max(requestedSize, minSize);
            // Wire-format integerization runs BEFORE signer setup: overflow and
            // sub-tick rejections throw here, still with zero bridge calls.
            const priceInt = toSignerWirePriceInteger(executionPrice, market.supportedPriceDecimals);
            const sizeInt = toSignerWireInteger(size, market.supportedSizeDecimals);
            const leverageImfHundredths = await __classPrivateFieldGet(this, _LighterProvider_resolveLeverageIntent, "f").call(this, params);
            // Intent validated — only now do signer and account setup run.
            // Re-fence FIRST: the preflight awaited public/account reads during
            // which the wallet may have switched, and a stale intent must never
            // create or register the new account's venue key.
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            const [clientOrderIndex] = __classPrivateFieldGet(this, _LighterProvider_allocateClientOrderIndexes, "f").call(this, 1);
            // Leverage update and order placement share ONE lock acquisition so a
            // concurrent write can never interleave between the caller's leverage
            // intent and the order that depends on it.
            const result = await __classPrivateFieldGet(this, _LighterProvider_withVenueWriteLock, "f").call(this, accountIndex, async (nextNonce, submit) => {
                if (leverageImfHundredths !== null) {
                    const signedLeverage = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                        function: '_signUpdateLeverage',
                        // Contract: [accountIndex, marketId, imfHundredths,
                        // marginMode, nonce] — exactly five params.
                        params: [
                            accountIndex,
                            market.marketId,
                            leverageImfHundredths,
                            lighterConfig_js_1.LIGHTER_MARGIN_MODE_CROSS,
                            await nextNonce(),
                        ],
                    });
                    if (signedLeverage.error) {
                        throw new Error(`Lighter leverage update failed: ${signedLeverage.error}`);
                    }
                    await submit(lighterConfig_js_1.LIGHTER_TX_TYPE_UPDATE_LEVERAGE, signedLeverage.txInfo, undefined, {
                        ...extractDispatchIdentity(signedLeverage),
                        intent: `updateLeverage:${params.symbol}:${String(params.leverage)}`,
                    });
                    leverageCommitted = true;
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
                            ? lighterConfig_js_1.LIGHTER_ORDER_TYPE_LIMIT
                            : lighterConfig_js_1.LIGHTER_ORDER_TYPE_MARKET,
                        params.orderType === 'limit' && params.timeInForce !== 'IOC'
                            ? lighterConfig_js_1.LIGHTER_TIME_IN_FORCE_GOOD_TILL_TIME
                            : lighterConfig_js_1.LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
                        params.reduceOnly ? 1 : 0,
                        String(lighterConfig_js_1.LIGHTER_NO_TRIGGER_PRICE),
                        // GTT orders auto-expire in 28 days (signer sentinel -1);
                        // IOC orders must carry a zero expiry.
                        params.orderType === 'limit' && params.timeInForce !== 'IOC'
                            ? lighterConfig_js_1.LIGHTER_ORDER_EXPIRY_NONE
                            : 0,
                        await nextNonce(),
                    ],
                });
                if (signed.error) {
                    throw new Error(`Lighter order signing failed: ${signed.error}`);
                }
                return await submit(lighterConfig_js_1.LIGHTER_TX_TYPE_CREATE_ORDER, signed.txInfo, undefined, {
                    ...extractDispatchIdentity(signed),
                    intent: `placeOrder:${params.symbol}:${clientOrderIndex}`,
                });
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
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.placeOrder');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] placeOrder failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'placeOrder', { symbol: params.symbol }),
            });
            // PARTIAL VENUE STATE is contract-visible: a committed leverage
            // change followed by an order failure must never imply "nothing
            // happened".
            const partialPrefix = leverageCommitted
                ? `PARTIAL STATE: leverage for ${params.symbol} was already updated to ${String(params.leverage)}x before the order failed. `
                : '';
            return {
                success: false,
                error: `${partialPrefix}${wrappedError.message}`,
                ...(leverageCommitted
                    ? { partialState: { leverageUpdated: Number(params.leverage) } }
                    : {}),
            };
        }
    }
    async cancelOrder(params, inheritedGeneration) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generationAtIntent = inheritedGeneration ?? __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
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
            await __classPrivateFieldGet(this, _LighterProvider_withVenueNonce, "f").call(this, accountIndex, async (nonce, submit) => {
                const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signCancelOrder',
                    params: [accountIndex, market.marketId, params.orderId, nonce],
                });
                if (signed.error) {
                    throw new Error(`Lighter cancel signing failed: ${signed.error}`);
                }
                return await submit(lighterConfig_js_1.LIGHTER_TX_TYPE_CANCEL_ORDER, signed.txInfo, undefined, {
                    ...extractDispatchIdentity(signed),
                    intent: `cancelOrder:${params.symbol}:${params.orderId}`,
                });
            }, generationAtIntent);
            return {
                success: true,
                orderId: params.orderId,
                providerId: 'lighter',
            };
        }
        catch (caughtError) {
            const wrappedError = (0, errorUtils_js_1.ensureError)(caughtError, 'LighterProvider.cancelOrder');
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
    async closePosition(rawParams) {
        const params = __classPrivateFieldGet(this, _LighterProvider_normalizeCloseParams, "f").call(this, rawParams);
        try {
            // One intent identity from the position read through the final write:
            // an account switch mid-sequence aborts instead of trading the new
            // account with sizing derived from the old one.
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generationAtIntent = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const closeOrderType = params.orderType ?? 'market';
            const shapeError = __classPrivateFieldGet(this, _LighterProvider_validateCloseShape, "f").call(this, params);
            if (shapeError) {
                return { success: false, error: shapeError };
            }
            const positions = await this.getPositions();
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            const position = positions.find((entry) => entry.symbol === params.symbol);
            if (!position) {
                return {
                    success: false,
                    error: `No open Lighter position for ${params.symbol}`,
                };
            }
            const signedSize = parseFloat(position.size);
            const explicitSizing = params.size !== undefined || params.usdAmount !== undefined;
            const closeSize = params.size ?? String(Math.abs(signedSize));
            // Reduce-only order on the opposite side; the caller's full sizing
            // and protection intent (usdAmount, slippage, price snapshot, limit
            // price) rides through the placement path unchanged.
            return await this.placeOrder({
                symbol: params.symbol,
                isBuy: signedSize < 0,
                size: closeSize,
                usdAmount: params.usdAmount,
                orderType: closeOrderType,
                price: params.price,
                reduceOnly: true,
                // Without explicit sizing this is a full close and must never be
                // rejected by the minimum-notional check on a dust position.
                isFullClose: !explicitSizing,
                currentPrice: params.currentPrice,
                priceAtCalculation: params.priceAtCalculation,
                maxSlippageBps: params.maxSlippageBps,
            }, generationAtIntent);
        }
        catch (error) {
            const wrappedError = (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.closePosition');
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] closePosition failed', {
                error: String(wrappedError),
                ...__classPrivateFieldGet(this, _LighterProvider_getErrorContext, "f").call(this, 'closePosition'),
            });
            return { success: false, error: wrappedError.message };
        }
    }
    async updatePositionTPSL(params) {
        try {
            // Partial TP/SL sizes are NOT wired to this venue path: it always
            // covers the full position. Silently ignoring a requested partial
            // size would close the entire position when the trigger fires, so
            // the request is refused before any read, signer setup or mutation.
            if (params.takeProfitSize !== undefined ||
                params.stopLossSize !== undefined) {
                return {
                    success: false,
                    error: 'Lighter TP/SL covers the full position: partial takeProfitSize/stopLossSize are not supported',
                };
            }
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
            // The lifecycle boundary is captured BEFORE the position read: a
            // fill landing DURING the read belongs to the operation's window
            // and must count as lifecycle evidence.
            const lifecycleBoundary = Date.now();
            const positions = await this.getPositions();
            const position = positions.find((entry) => entry.symbol === params.symbol);
            if (!position) {
                return {
                    success: false,
                    error: `No open Lighter position for ${params.symbol}`,
                };
            }
            // FULL local preflight: construct the entire deterministic
            // replacement payload BEFORE signer setup, the open-orders read and
            // any cancellation. Everything that can fail locally — venue
            // position-size parsing/integerization, trigger/execution price
            // parsing/integerization, bounded client-id allocation — must fail
            // while the existing protection is still in place.
            const wantsReplacement = Boolean(params.takeProfitPrice) || Boolean(params.stopLossPrice);
            let groupedPayload = null;
            let createdClientIds = [];
            let createdIdsNeedingFinalCheck = [];
            let groupedOrderCount = 0;
            let groupedType = 0;
            if (wantsReplacement) {
                // getPositions does not validate venue sizes; a non-finite or
                // sub-tick size must abort here, not after the cancels.
                const signedSize = parseFloat(position.size);
                if (!Number.isFinite(signedSize) || signedSize === 0) {
                    return {
                        success: false,
                        error: `Invalid live position size ${position.size} for ${params.symbol}`,
                    };
                }
                const isLong = signedSize > 0;
                const coverSize = Math.abs(signedSize);
                const sizeInt = toSignerWireInteger(coverSize, market.supportedSizeDecimals);
                // Closing side is opposite the position; trigger market orders
                // execute at a protection price 5% beyond the trigger in the taker
                // direction.
                const isAsk = isLong ? 1 : 0;
                const orderIntents = [];
                if (params.takeProfitPrice) {
                    orderIntents.push({
                        orderType: lighterConfig_js_1.LIGHTER_ORDER_TYPE_TAKE_PROFIT,
                        raw: params.takeProfitPrice,
                        label: 'takeProfitPrice',
                    });
                }
                if (params.stopLossPrice) {
                    orderIntents.push({
                        orderType: lighterConfig_js_1.LIGHTER_ORDER_TYPE_STOP_LOSS,
                        raw: params.stopLossPrice,
                        label: 'stopLossPrice',
                    });
                }
                const validatedOrders = [];
                for (const intent of orderIntents) {
                    const trigger = parseFinitePositive(intent.raw);
                    if (trigger === null) {
                        return {
                            success: false,
                            error: `Invalid ${intent.label} ${intent.raw}: must be a positive number`,
                        };
                    }
                    const execution = isLong ? trigger * 0.95 : trigger * 1.05;
                    validatedOrders.push({
                        orderType: intent.orderType,
                        execInt: toSignerWirePriceInteger(execution, market.supportedPriceDecimals),
                        triggerInt: toSignerWirePriceInteger(trigger, market.supportedPriceDecimals),
                    });
                }
                // Only the ids actually required: allocation attempts are bounded
                // and a degenerate RNG must exhaust BEFORE any cancellation.
                const clientOrderIds = __classPrivateFieldGet(this, _LighterProvider_allocateClientOrderIndexes, "f").call(this, validatedOrders.length);
                createdClientIds = clientOrderIds;
                // VENUE CONTRACT (proven live: 'GroupingType is not valid'):
                // CreateGroupedOrders only accepts grouping types 1/2/3 and OCO
                // requires two siblings, so a SINGLE TP or SL must be an ordinary
                // CreateOrder trigger; grouped OCO is reserved for both together.
                groupedPayload = validatedOrders.flatMap((entry, index) => [
                    market.marketId,
                    clientOrderIds[index],
                    String(sizeInt),
                    String(entry.execInt),
                    isAsk,
                    entry.orderType,
                    lighterConfig_js_1.LIGHTER_TIME_IN_FORCE_IMMEDIATE_OR_CANCEL,
                    1,
                    String(entry.triggerInt),
                    // Trigger orders rest until fired: the signer expands the -1
                    // sentinel to the 28-day default expiry.
                    lighterConfig_js_1.LIGHTER_ORDER_EXPIRY_NONE,
                ]);
                groupedOrderCount = validatedOrders.length;
                groupedType =
                    groupedOrderCount === 2 ? lighterConfig_js_1.LIGHTER_GROUPING_ONE_CANCELS_THE_OTHER : 0;
            }
            // Re-fence BEFORE signer setup: the preflight awaited public reads
            // during which the wallet may have switched, and a stale intent must
            // never create or register the new account's venue key.
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            // Pre-mint the auth token OUTSIDE the write lock: #getAuthToken can
            // trigger signer setup, and signer setup queues on the write chain —
            // calling any setup-capable helper from inside the held section
            // would self-deadlock after a bridge reset or unobserved switch.
            const authToken = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            // Settlement identity: pending expectations are keyed by the
            // captured normalized address + account index + symbol so another
            // account can never consume (or be blocked by) this account's ids,
            // while a same-account bridge reset or switch-away-and-back retains
            // the reconciliation obligation.
            // Includes the API KEY SLOT: nonces are per key slot, so a journal
            // recorded under one slot must never be reconciled under another.
            const settlementKey = `${__classPrivateFieldGet(this, _LighterProvider_boundAddress, "f") ?? 'unbound'}:${accountIndex}:${__classPrivateFieldGet(this, _LighterProvider_apiKeyIndex, "f")}:${params.symbol}`;
            // The ENTIRE snapshot -> create -> cancel lifecycle runs as ONE
            // serialized transition on the account's write chain. Two concurrent
            // replacements would otherwise both snapshot the same old trigger,
            // each create a new set, and each cancel only the original — leaving
            // both protection sets live; a concurrent remove could miss a
            // just-created replacement. Cancels are INLINED (not this.cancelOrder)
            // so no nested lock acquisition can deadlock; nonce serialization is
            // preserved because every nonce comes from this section's nextNonce.
            await __classPrivateFieldGet(this, _LighterProvider_withVenueWriteLock, "f").call(this, accountIndex, async (nextNonce, submit) => {
                // STRICT direct read with the CAPTURED account/auth/generation:
                // a swallowed [] would make remove "succeed" cancelling nothing;
                // a setup-capable helper here could self-deadlock (see auth
                // pre-mint above). Session fences on every read.
                const readActiveRaw = async () => {
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                    const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getActiveOrders(accountIndex, authToken);
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                    return response.orders;
                };
                // Shared targeted inactive reader (cached, active-first callers,
                // one bounded deep cursor walk per section, market-scoped).
                const readInactiveFor = __classPrivateFieldGet(this, _LighterProvider_makeInactiveReader, "f").call(this, accountIndex, authToken, generationAtIntent, market.marketId);
                // VENUE LINEARIZABILITY: if a previous TP/SL transition's
                // settlement never became visible, run it through the SAME
                // obligation state machine as startup recovery — a pending
                // 'cancelling'/'restoring' journal may owe a rollback or a
                // RESTORE, and merely reconciling-then-clearing it here would
                // erase that obligation and leave the position naked.
                // Pending obligations survive provider death via the durable
                // journal. DISK IS AUTHORITATIVE: absence means the obligation
                // was resolved (possibly by another provider) — a stale
                // in-memory copy is dropped, never resurrected.
                const unsettled = await __classPrivateFieldGet(this, _LighterProvider_loadTpslJournal, "f").call(this, settlementKey);
                if (unsettled === null) {
                    __classPrivateFieldGet(this, _LighterProvider_tpslUnsettled, "f").delete(settlementKey);
                }
                if (unsettled) {
                    const resolved = await __classPrivateFieldGet(this, _LighterProvider_settleTpslObligation, "f").call(this, {
                        settlementKey,
                        symbol: params.symbol,
                        journalEntry: unsettled,
                        market,
                        accountIndex,
                        authToken,
                        generation: generationAtIntent,
                        readActiveRaw,
                        readInactiveFor,
                        nextNonce,
                        submit,
                    });
                    if (!resolved) {
                        // Keep both records for the next attempt.
                        __classPrivateFieldGet(this, _LighterProvider_tpslUnsettled, "f").set(settlementKey, unsettled);
                        throw new Error(`Lighter TP/SL settlement for ${params.symbol} is unresolved; refusing further protection changes until the venue reflects the previous update`);
                    }
                    // The machine may have PARKED the obligation into the
                    // durable manual-recovery doc (releasing the journal slot).
                    // The doc is NOT cleared here: only this operation's own
                    // SUCCESS — the successor protection authoritatively in
                    // force — clears the warning below.
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                }
                const rawOrders = await readActiveRaw();
                const openOrders = rawOrders.map((order) => (0, lighterAdapter_js_1.adaptOrderFromLighter)(order, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(order.marketIndex)?.symbol ??
                    String(order.marketIndex)));
                const staleTriggers = openOrders.filter((order) => order.symbol === params.symbol &&
                    order.reduceOnly &&
                    (Boolean(order.orderType?.includes('stop')) ||
                        Boolean(order.orderType?.includes('take')) ||
                        order.isTrigger === true));
                // The prior triggers' EXACT wire intents ride along with the
                // journal: a crash can still restore/rollback faithfully. A
                // stale trigger that CANNOT be faithfully restored (unknown
                // venue type/TIF) refuses the whole mutation BEFORE any cancel
                // or create — coercing its semantics on restore is worse than
                // rejecting the update.
                const priorTriggers = [];
                for (const stale of staleTriggers) {
                    const rawRow = rawOrders.find((order) => String(order.orderIndex) === stale.orderId);
                    const priorIntent = rawRow
                        ? mapRawTriggerToPriorIntent(rawRow, market)
                        : null;
                    if (!priorIntent) {
                        throw new Error(`Lighter TP/SL update for ${params.symbol} refused: existing trigger order ${stale.orderId} cannot be faithfully restored (unsupported type/time-in-force), so it will not be cancelled`);
                    }
                    priorTriggers.push(priorIntent);
                }
                // OCO grouping is decided by the VENUE'S OWN linkage fields —
                // never inferred from "one TP plus one SL". Linkage FAILS
                // CLOSED: ANY dangling or one-sided linkage (parent, to_cancel
                // or to_trigger references that do not form an exact mutual
                // two-leg pair among the triggers being replaced) is an order
                // relationship this integration cannot faithfully re-establish
                // — the mutation is refused BEFORE anything is touched, never
                // classified independent.
                const staleRawRows = staleTriggers.map((stale) => rawOrders.find((order) => String(order.orderIndex) === stale.orderId));
                // LIVE-VENUE contract (probed): ABSENT linkage is the string
                // sentinel '0' (parent_order_id, to_trigger_order_id_*), never
                // an empty string.
                const linkageSet = (value) => typeof value === 'string' && value.length > 0 && value !== '0';
                const hasAnyLinkage = (row) => row !== undefined &&
                    (linkageSet(row.toCancelOrderId0) ||
                        linkageSet(row.parentOrderId) ||
                        (typeof row.parentOrderIndex === 'number' &&
                            row.parentOrderIndex > 0) ||
                        linkageSet(row.toTriggerOrderId0) ||
                        linkageSet(row.toTriggerOrderId1));
                const rowLinksTo = (source, target) => source !== undefined &&
                    target !== undefined &&
                    linkageSet(source.toCancelOrderId0) &&
                    [String(target.orderIndex), target.orderId ?? ''].includes(source.toCancelOrderId0);
                const mutualPair = priorTriggers.length === 2 &&
                    rowLinksTo(staleRawRows[0], staleRawRows[1]) &&
                    rowLinksTo(staleRawRows[1], staleRawRows[0]) &&
                    // A mutual pair must not ALSO carry parent/OTO relations.
                    staleRawRows.every((row) => row !== undefined &&
                        !(linkageSet(row.parentOrderId) ||
                            (typeof row.parentOrderIndex === 'number' &&
                                row.parentOrderIndex > 0) ||
                            linkageSet(row.toTriggerOrderId0) ||
                            linkageSet(row.toTriggerOrderId1)));
                if (!mutualPair && staleRawRows.some(hasAnyLinkage)) {
                    throw new Error(`Lighter TP/SL update for ${params.symbol} refused: an existing trigger carries venue linkage (OCO/OTO/parent) this integration cannot faithfully re-establish, so it will not be cancelled`);
                }
                const priorGrouping = mutualPair
                    ? 'oco'
                    : 'independent';
                if (priorGrouping === 'oco') {
                    // Pinned grouped invariants (same closing side, size AND
                    // expiry): a linked pair violating them cannot be faithfully
                    // re-signed as one group — refuse BEFORE touching it.
                    if (priorTriggers[0].side !== priorTriggers[1].side ||
                        parseStrictDecimal(priorTriggers[0].remainingSize) !==
                            parseStrictDecimal(priorTriggers[1].remainingSize) ||
                        priorTriggers[0].orderExpiry !== priorTriggers[1].orderExpiry) {
                        throw new Error(`Lighter TP/SL update for ${params.symbol} refused: the existing linked OCO pair cannot be faithfully restored as a group, so it will not be cancelled`);
                    }
                }
                // Per-attempt mutation journal, persisted incrementally.
                // RESPONSE-LOSS safety: every attempt is recorded UNKNOWN with
                // its own venue nonce BEFORE submission (the venue may commit
                // even when the response is lost), flips to accepted inside
                // onAccepted (pre-fence), and reconciliation disambiguates each
                // attempt individually via books + nonce.
                const journal = {
                    attempts: [],
                    recordedAt: Date.now(),
                    // Collision-resistant across processes: time + counter + two
                    // independent random draws (~104 bits of entropy).
                    operationId: `op-${Date.now().toString(36)}-${(__classPrivateFieldSet(this, _LighterProvider_tpslOperationCounter, __classPrivateFieldGet(this, _LighterProvider_tpslOperationCounter, "f") + 1, "f")).toString(36)}-${randomIdSuffix()}`,
                    createdAt: lifecycleBoundary,
                    nextAttemptId: 1,
                    intent: wantsReplacement ? 'replace' : 'remove',
                    phase: 'creating',
                    priorGrouping,
                    priorTriggers,
                };
                const persistJournal = async () => {
                    journal.recordedAt = Date.now();
                    await __classPrivateFieldGet(this, _LighterProvider_persistTpslJournal, "f").call(this, settlementKey, journal);
                };
                // Sign+journal+submit one tracked cancel (stale protection or a
                // rollback of a surviving replacement leg).
                const submitTrackedCancel = async (orderId, role) => {
                    if (role === 'stale' && journal.intent === 'replace') {
                        // Durable phase transition BEFORE the old protection is
                        // touched: a crash from here on may require a RESTORE.
                        // (A 'remove' journal never restores — phase is moot.)
                        journal.phase = 'cancelling';
                    }
                    const cancelNonce = await nextNonce();
                    const signedCancel = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                        function: '_signCancelOrder',
                        params: [accountIndex, market.marketId, orderId, cancelNonce],
                    });
                    if (signedCancel.error) {
                        throw new Error(`Failed to cancel trigger order ${orderId}: ${signedCancel.error}`);
                    }
                    const cancelIdentity = requireSignedTxIdentity(signedCancel);
                    const cancelAttempt = {
                        kind: 'cancel',
                        attemptId: nextAttemptIdFor(journal),
                        nonce: cancelNonce,
                        outcome: 'unknown',
                        orderId,
                        txHash: cancelIdentity.txHash,
                        expiresAt: cancelIdentity.expiresAt,
                        role,
                    };
                    journal.attempts.push(cancelAttempt);
                    __classPrivateFieldGet(this, _LighterProvider_tpslUnsettled, "f").set(settlementKey, journal);
                    await persistJournal();
                    await submit(lighterConfig_js_1.LIGHTER_TX_TYPE_CANCEL_ORDER, signedCancel.txInfo, () => {
                        cancelAttempt.outcome = 'accepted';
                    }, {
                        txHash: cancelIdentity.txHash,
                        expiresAt: cancelIdentity.expiresAt,
                        owner: journal.operationId,
                    });
                };
                // CREATE FIRST, cancel after: if signing or submission of the
                // new protection fails, the old triggers were never touched and
                // the position is never left naked. The temporary overlap is
                // safe — both sets are reduce-only and clamp to the position.
                if (wantsReplacement && groupedPayload !== null) {
                    const payload = groupedPayload;
                    const isSingleTrigger = groupedOrderCount === 1;
                    const createNonce = await nextNonce();
                    // A lone trigger is an ordinary CreateOrder (same wire
                    // layout); only a TP+SL pair uses the grouped OCO transaction.
                    const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute(isSingleTrigger
                        ? {
                            function: '_signCreateOrder',
                            params: [accountIndex, ...payload, createNonce],
                        }
                        : {
                            function: '_signCreateGroupedOrders',
                            params: [
                                accountIndex,
                                groupedType,
                                groupedOrderCount,
                                ...payload,
                                createNonce,
                            ],
                        });
                    if (signed.error) {
                        throw new Error(signed.error);
                    }
                    // UNKNOWN recorded BEFORE the wire — in memory AND durably
                    // (awaited): a transport failure after venue commit, or
                    // provider/process death, must still leave a reconciliation
                    // obligation resolvable by EXACT tx hash. A failed durable
                    // write, or a signing result without hash/expiry, aborts the
                    // mutation before submission.
                    const createIdentity = requireSignedTxIdentity(signed);
                    const createAttempt = {
                        kind: 'create',
                        attemptId: nextAttemptIdFor(journal),
                        nonce: createNonce,
                        outcome: 'unknown',
                        clientIds: [...createdClientIds],
                        txHash: createIdentity.txHash,
                        expiresAt: createIdentity.expiresAt,
                        role: 'replacement',
                    };
                    journal.attempts.push(createAttempt);
                    __classPrivateFieldGet(this, _LighterProvider_tpslUnsettled, "f").set(settlementKey, journal);
                    await persistJournal();
                    await submit(isSingleTrigger
                        ? lighterConfig_js_1.LIGHTER_TX_TYPE_CREATE_ORDER
                        : lighterConfig_js_1.LIGHTER_TX_TYPE_CREATE_GROUPED_ORDERS, signed.txInfo, () => {
                        // Acceptance OBSERVED (pre-fence): absence from the books
                        // can now only mean visibility lag, never never-landed.
                        createAttempt.outcome = 'accepted';
                    }, {
                        txHash: createIdentity.txHash,
                        expiresAt: createIdentity.expiresAt,
                        owner: journal.operationId,
                    });
                    // PHASE BARRIER: prove the replacement is on the venue's books
                    // BEFORE touching the old protection. An accepted create can
                    // be asynchronously rejected/venue-cancelled; cancelling stale
                    // triggers first would strip valid protection and discover it
                    // afterwards.
                    const createVisibility = await __classPrivateFieldGet(this, _LighterProvider_awaitTpslVisibility, "f").call(this, readActiveRaw, readInactiveFor, {
                        createdClientIds,
                        cancelledOrderIds: [],
                    });
                    if (createVisibility.outcome === 'timeout') {
                        throw new Error(`Lighter TP/SL update for ${params.symbol} was submitted but its settlement is not yet visible; further protection changes are blocked until the venue reflects it`);
                    }
                    if (createVisibility.outcome === 'created-terminal-failed') {
                        // The replacement (or one OCO leg) failed before the old
                        // protection was touched. ROLL BACK any leg still resting
                        // active so the venue returns to exactly the prior
                        // protection, then resolve the obligation for a retry.
                        if (createVisibility.survivingActiveClientIds.length > 0) {
                            const activeNow = await readActiveRaw();
                            const survivorOrderIds = [];
                            for (const clientId of createVisibility.survivingActiveClientIds) {
                                const survivor = activeNow.find((order) => String(order.clientOrderIndex) === String(clientId));
                                if (survivor) {
                                    survivorOrderIds.push(String(survivor.orderIndex));
                                    await submitTrackedCancel(String(survivor.orderIndex), 'rollback');
                                }
                            }
                            const rollback = await __classPrivateFieldGet(this, _LighterProvider_awaitTpslVisibility, "f").call(this, readActiveRaw, readInactiveFor, { createdClientIds: [], cancelledOrderIds: survivorOrderIds });
                            if (rollback.outcome === 'timeout') {
                                throw new Error(`Lighter TP/SL update for ${params.symbol} was submitted but its settlement is not yet visible; further protection changes are blocked until the venue reflects it`);
                            }
                        }
                        await __classPrivateFieldGet(this, _LighterProvider_clearTpslJournal, "f").call(this, settlementKey, journal.operationId);
                        throw new Error(`Lighter replacement TP/SL for ${params.symbol} was cancelled or rejected by the venue before becoming active; the existing protection was left untouched`);
                    }
                    // Barrier-proved TERMINAL success is immutable: skip those ids
                    // in the final settlement check (no duplicate high-weight
                    // inactive read); active-at-barrier ids are still re-verified
                    // there (they can terminal-fail before the cancels settle).
                    createdIdsNeedingFinalCheck = createVisibility.executedCreated
                        ? []
                        : createdClientIds;
                    if (createVisibility.executedCreated) {
                        // The trigger EXECUTED before activation was observed (an
                        // immediate/crossed TP/SL): not a failure — the position may
                        // already be closed. Stale triggers below are still cleaned
                        // up as reduce-only leftovers.
                        __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] replacement trigger executed immediately', { symbol: params.symbol });
                    }
                }
                for (const order of staleTriggers) {
                    await submitTrackedCancel(order.orderId, 'stale');
                }
                // Await authoritative visibility of the CANCELS before releasing
                // the lock (created ids were proven at the phase barrier): the
                // next queued transition must never snapshot a stale book.
                if (journal.attempts.length > 0) {
                    const settled = await __classPrivateFieldGet(this, _LighterProvider_awaitTpslVisibility, "f").call(this, readActiveRaw, readInactiveFor, {
                        // Barrier-proved terminal successes are immutable and
                        // excluded; active-at-barrier ids are re-verified.
                        createdClientIds: createdIdsNeedingFinalCheck,
                        cancelledOrderIds: journal.attempts
                            .filter((attempt) => attempt.kind === 'cancel')
                            .map((attempt) => attempt.orderId),
                    });
                    if (settled.outcome === 'timeout') {
                        throw new Error(`Lighter TP/SL update for ${params.symbol} was submitted but its settlement is not yet visible; further protection changes are blocked until the venue reflects it`);
                    }
                    if (settled.outcome === 'created-terminal-failed') {
                        // Active at the phase barrier but venue-cancelled/rejected
                        // AFTER the old protection was already cancelled. The
                        // venue exposes no atomic primitive that could prove a
                        // re-created trigger attaches to the same position
                        // lifecycle, so nothing is auto-restored: the warning
                        // parks DURABLY in the manual-recovery doc (surfaced via
                        // getPendingManualRecoveries) and any surviving leg is
                        // deliberately left as the only remaining protection.
                        const rawNow = await readActiveRaw();
                        const survivingOrderIds = rawNow
                            .filter((order) => journal.attempts.some((attempt) => attempt.kind === 'create' &&
                            attempt.clientIds.some((clientId) => String(order.clientOrderIndex) === String(clientId))))
                            .map((order) => String(order.orderIndex));
                        await __classPrivateFieldGet(this, _LighterProvider_writeTpslManualRecovery, "f").call(this, {
                            settlementKey,
                            symbol: params.symbol,
                            reason: 'Replacement TP/SL order was cancelled or rejected by the venue after the previous protection was already removed',
                            priorIntent: journal.intent,
                            priorTriggers: journal.priorTriggers,
                            survivingOrderIds,
                            operationId: journal.operationId,
                            recordedAt: Date.now(),
                        });
                        await __classPrivateFieldGet(this, _LighterProvider_clearTpslJournal, "f").call(this, settlementKey, journal.operationId);
                        __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                        throw new Error(`Lighter replacement TP/SL for ${params.symbol} was cancelled or rejected by the venue after the previous protection was already removed; the position's protection could NOT be safely re-established automatically — MANUAL re-establishment is required (a new explicit TP/SL update resolves this state)`);
                    }
                    await __classPrivateFieldGet(this, _LighterProvider_clearTpslJournal, "f").call(this, settlementKey, journal.operationId);
                    // A switch DURING the final journal-clear await must not let
                    // stale A protection report success under B.
                    __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
                }
                // ONLY here — the successor protection intent authoritatively
                // in force (created and settled, or removal completed) — may a
                // parked manual-recovery warning for this symbol be cleared. A
                // failed successor leaves the warning untouched.
                await __classPrivateFieldGet(this, _LighterProvider_clearTpslManualRecovery, "f").call(this, settlementKey);
                __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            }, generationAtIntent);
            return { success: true };
        }
        catch (error) {
            const wrappedError = (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.updatePositionTPSL');
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
            // Strict full-string parse: '5USD' must not prefix-parse into
            // signed intent. Signed values are meaningful here (add/remove).
            const amount = parseStrictDecimal(params.amount) ?? Number.NaN;
            if (!Number.isFinite(amount) || amount === 0) {
                return {
                    success: false,
                    error: 'updateMargin requires a non-zero amount',
                };
            }
            // USDC uses 6 decimals. Integerize BEFORE signer setup so a huge
            // finite amount fails closed with zero bridge calls instead of
            // raw-scaling to an unsafe integer inside signer params.
            const marginAmountInt = toSignerWireInteger(Math.abs(amount), 6);
            // Re-fence before signer setup: the market lookup above awaited, and
            // a stale intent must never initialize the new account's signer.
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generationAtIntent);
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            // USDC uses 6 decimals; direction 1 adds isolated margin, 0 removes it
            // (types/txtypes/constants.go: RemoveFromIsolatedMargin=0, Add=1).
            await __classPrivateFieldGet(this, _LighterProvider_withVenueNonce, "f").call(this, accountIndex, async (nonce, submit) => {
                const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signUpdateMargin',
                    params: [
                        accountIndex,
                        market.marketId,
                        marginAmountInt,
                        amount > 0 ? 1 : 0,
                        nonce,
                    ],
                });
                if (signed.error) {
                    throw new Error(signed.error);
                }
                return await submit(lighterConfig_js_1.LIGHTER_TX_TYPE_UPDATE_MARGIN, signed.txInfo, undefined, {
                    ...extractDispatchIdentity(signed),
                    intent: `updateMargin:${params.symbol}:${params.amount}`,
                });
            }, generationAtIntent);
            return { success: true };
        }
        catch (error) {
            const wrappedError = (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.updateMargin');
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
            const amount = parseFinitePositive(params.amount);
            if (amount === null) {
                return { success: false, error: 'withdraw requires a positive amount' };
            }
            // Enforce the advertised route minimum: getWithdrawalRoutes reports
            // minWithdrawUsdc, and signing below it would either burn a nonce on
            // a venue rejection or strand dust.
            const minWithdraw = parseFloat(lighterConfig_js_1.LIGHTER_BRIDGE_CONFIG[__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet']
                .minWithdrawUsdc);
            if (amount < minWithdraw) {
                return {
                    success: false,
                    error: `Withdrawal amount ${params.amount} is below the Lighter minimum of ${minWithdraw} USDC`,
                };
            }
            // USDC uses 6 decimals on zkLighter. Integerize BEFORE signer setup:
            // overflow/sub-tick amounts fail closed with zero bridge calls,
            // matching validateWithdrawal exactly.
            const assetAmount = String(toSignerWireInteger(amount, 6));
            await __classPrivateFieldGet(this, _LighterProvider_ensureSignerReady, "f").call(this);
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const result = await __classPrivateFieldGet(this, _LighterProvider_withVenueNonce, "f").call(this, accountIndex, async (nonce, submit) => {
                const signed = await __classPrivateFieldGet(this, _LighterProvider_getSignerBridge, "f").call(this).execute({
                    function: '_signWithdraw',
                    params: [
                        accountIndex,
                        lighterConfig_js_1.LIGHTER_USDC_ASSET_INDEX,
                        0,
                        assetAmount,
                        nonce,
                    ],
                });
                if (signed.error) {
                    throw new Error(signed.error);
                }
                return await submit(lighterConfig_js_1.LIGHTER_TX_TYPE_WITHDRAW, signed.txInfo, undefined, {
                    ...extractDispatchIdentity(signed),
                    intent: `withdraw:${params.amount}`,
                });
            }, generationAtIntent);
            return { success: true, txHash: result.txHash };
        }
        catch (error) {
            const wrappedError = (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.withdraw');
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
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const token = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getTrades(accountIndex, token, params?.limit ?? 50);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            return (response.trades ?? []).map((trade) => (0, lighterAdapter_js_1.adaptFillFromLighterTrade)(trade, __classPrivateFieldGet(this, _LighterProvider_marketsById, "f").get(trade.marketId)?.symbol ??
                String(trade.marketId), accountIndex));
        }
        catch (error) {
            if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, error)) {
                // Capability gates must surface, never degrade into empty state.
                throw error;
            }
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
        // Capability-gated: the venue's PnLEntry carries trade, pool, spot, and
        // staking flows; reconstructing account value from the trade flows
        // alone is materially wrong for accounts using the other routes, and
        // no captured payload proves the full-flow semantics. Reporting a
        // plausible number would show false daily history — fail explicitly.
        throw new Error('Historical portfolio is unavailable for Lighter: account-value reconstruction requires pool/spot/staking flow semantics that are not yet verified against the venue');
    }
    async getFunding(_params, _options) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
            const accountIndex = await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
            const token = await __classPrivateFieldGet(this, _LighterProvider_getAuthToken, "f").call(this);
            await __classPrivateFieldGet(this, _LighterProvider_ensureMarkets, "f").call(this);
            const response = await __classPrivateFieldGet(this, _LighterProvider_clientService, "f").getPositionFundings(accountIndex, token);
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
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
            if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, error)) {
                // Capability gates must surface, never degrade into empty state.
                throw error;
            }
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getFunding failed', {
                error: String(error),
            });
            return [];
        }
    }
    async getUserNonFundingLedgerUpdates(params) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
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
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            return updates.filter((update) => (startTime === undefined || update.time >= startTime) &&
                (endTime === undefined || update.time <= endTime));
        }
        catch (error) {
            if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, error)) {
                // Capability gates must surface, never degrade into empty state.
                throw error;
            }
            __classPrivateFieldGet(this, _LighterProvider_deps, "f").debugLogger.log('[LighterProvider] getUserNonFundingLedgerUpdates failed', { error: String(error) });
            return [];
        }
    }
    async getUserHistory(params) {
        try {
            __classPrivateFieldGet(this, _LighterProvider_ensureSessionBinding, "f").call(this);
            const generation = __classPrivateFieldGet(this, _LighterProvider_sessionGeneration, "f");
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
            __classPrivateFieldGet(this, _LighterProvider_assertSession, "f").call(this, generation);
            return items.filter((item) => (startTime === undefined || item.timestamp >= startTime) &&
                (endTime === undefined || item.timestamp <= endTime));
        }
        catch (error) {
            if (__classPrivateFieldGet(this, _LighterProvider_isUnsupportedCapabilityError, "f").call(this, error)) {
                // Capability gates must surface, never degrade into empty state.
                throw error;
            }
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
        // ONE error-to-invalid boundary: a validator RESOLVES, never rejects,
        // whichever awaited venue read fails (markets, margin metadata, fresh
        // price, live positions, data integrity).
        try {
            return await __classPrivateFieldGet(this, _LighterProvider_validateOrderChecks, "f").call(this, params);
        }
        catch (error) {
            return {
                isValid: false,
                error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateOrder').message,
            };
        }
    }
    async validateClosePosition(params) {
        // Same single error-to-invalid boundary as validateOrder.
        try {
            return await __classPrivateFieldGet(this, _LighterProvider_validateClosePositionChecks, "f").call(this, params);
        }
        catch (error) {
            return {
                isValid: false,
                error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateClosePosition')
                    .message,
            };
        }
    }
    async validateWithdrawal(params) {
        const amount = parseFinitePositive(params.amount ?? '');
        if (amount === null) {
            return { isValid: false, error: 'Withdrawal amount must be positive' };
        }
        // Advertised route-minimum parity with withdraw.
        const minWithdraw = parseFloat(lighterConfig_js_1.LIGHTER_BRIDGE_CONFIG[__classPrivateFieldGet(this, _LighterProvider_isTestnet, "f") ? 'testnet' : 'mainnet']
            .minWithdrawUsdc);
        if (amount < minWithdraw) {
            return {
                isValid: false,
                error: `Withdrawal amount ${params.amount} is below the Lighter minimum of ${minWithdraw} USDC`,
            };
        }
        // Scaled wire-range parity with withdraw's own integerization.
        try {
            toSignerWireInteger(amount, 6);
        }
        catch (error) {
            return {
                isValid: false,
                error: (0, errorUtils_js_1.ensureError)(error, 'LighterProvider.validateWithdrawal').message,
            };
        }
        return { isValid: true };
    }
    // ============================================================================
    // Calculations (POC: coarse)
    // ============================================================================
    async calculateLiquidationPrice(_params) {
        // Capability-gated: Lighter cross-margin liquidation depends on total
        // account value and the aggregate maintenance requirement across all
        // positions — inputs this preview does not have. A plausible-looking
        // per-position estimate would feed stop-loss warnings with a wrong
        // number, so the calculation reports unavailable and clients render
        // their explicit fallback. Live positions carry the venue's own
        // liquidationPrice.
        throw new Error('Liquidation price preview is unavailable for Lighter: cross-margin liquidation depends on total account value and aggregate maintenance requirements');
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
        return 1 / (2 * lighterConfig_js_1.LIGHTER_MAX_LEVERAGE);
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
        return lighterConfig_js_1.LIGHTER_MAX_LEVERAGE;
    }
    async calculateFees(params) {
        // The market metadata's zero fee is only true for Standard accounts —
        // resolve and gate the account tier first so a Premium account can
        // never be quoted a false zero (throws for Premium/unverified).
        await __classPrivateFieldGet(this, _LighterProvider_ensureAccountIndex, "f").call(this);
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
        const resolution = lighterConfig_js_1.LIGHTER_SUPPORTED_RESOLUTIONS.has(params.interval)
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
            params.onError?.((0, errorUtils_js_1.ensureError)(error));
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
            return index_js_1.WebSocketConnectionState.Connected;
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
            __classPrivateFieldGet(this, _LighterProvider_setConnectionState, "f").call(this, index_js_1.WebSocketConnectionState.Disconnected);
        }
        if (__classPrivateFieldGet(this, _LighterProvider_wsReconnectTimer, "f")) {
            clearTimeout(__classPrivateFieldGet(this, _LighterProvider_wsReconnectTimer, "f"));
            __classPrivateFieldSet(this, _LighterProvider_wsReconnectTimer, null, "f");
        }
        if (__classPrivateFieldGet(this, _LighterProvider_hasAnySubscriber, "f").call(this)) {
            __classPrivateFieldGet(this, _LighterProvider_ensureStream, "f").call(this);
        }
    }
    getDepositRoutes(params) {
        // The params.isTestnet OVERRIDE is part of the route contract (HL
        // honors it too): DepositService requests { isTestnet: false } to
        // scaffold the deposit-and-trade transaction on a chain the wallet
        // can reach. Lighter TESTNET itself settles on a venue-hosted devnet
        // L1 (chain 123456) the wallet cannot reach — advertising it made
        // pay-with flows build a transaction on an unknown chain ("Invalid
        // chain ID 0x1e240") — so the effective-testnet answer is NO routes:
        // trade from the venue balance, top up via the venue faucet.
        const isTestnet = params?.isTestnet ?? __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f");
        if (isTestnet) {
            return [];
        }
        return __classPrivateFieldGet(this, _LighterProvider_bridgeRoute, "f").call(this, lighterConfig_js_1.LIGHTER_BRIDGE_CONFIG.mainnet.minDepositUsdc);
    }
    getWithdrawalRoutes(params) {
        // Same devnet-L1 reality and the same override contract as deposits.
        const isTestnet = params?.isTestnet ?? __classPrivateFieldGet(this, _LighterProvider_isTestnet, "f");
        if (isTestnet) {
            return [];
        }
        return __classPrivateFieldGet(this, _LighterProvider_bridgeRoute, "f").call(this, lighterConfig_js_1.LIGHTER_BRIDGE_CONFIG.mainnet.minWithdrawUsdc);
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
exports.LighterProvider = LighterProvider;
_LighterProvider_deps = new WeakMap(), _LighterProvider_clientService = new WeakMap(), _LighterProvider_walletService = new WeakMap(), _LighterProvider_messenger = new WeakMap(), _LighterProvider_signerBridge = new WeakMap(), _LighterProvider_isTestnet = new WeakMap(), _LighterProvider_apiKeyIndex = new WeakMap(), _LighterProvider_configuredAccountIndex = new WeakMap(), _LighterProvider_marketsBySymbol = new WeakMap(), _LighterProvider_marketsById = new WeakMap(), _LighterProvider_accountIndex = new WeakMap(), _LighterProvider_boundAddress = new WeakMap(), _LighterProvider_sessionGeneration = new WeakMap(), _LighterProvider_priceSubscribers = new WeakMap(), _LighterProvider_pricePollTimer = new WeakMap(), _LighterProvider_priceWs = new WeakMap(), _LighterProvider_pricePollCycle = new WeakMap(), _LighterProvider_webSocketCtor = new WeakMap(), _LighterProvider_wsWantedChannels = new WeakMap(), _LighterProvider_wsKeepaliveTimer = new WeakMap(), _LighterProvider_connectionState = new WeakMap(), _LighterProvider_wsReconnectAttempts = new WeakMap(), _LighterProvider_connectionListeners = new WeakMap(), _LighterProvider_setConnectionState = new WeakMap(), _LighterProvider_wsReconnectTimer = new WeakMap(), _LighterProvider_lastPriceBySymbol = new WeakMap(), _LighterProvider_wsPositions = new WeakMap(), _LighterProvider_wsOrders = new WeakMap(), _LighterProvider_oiCapSubscribers = new WeakMap(), _LighterProvider_accountSubscribers = new WeakMap(), _LighterProvider_positionSubscribers = new WeakMap(), _LighterProvider_orderSubscribers = new WeakMap(), _LighterProvider_fillSubscribers = new WeakMap(), _LighterProvider_orderBookSubscribers = new WeakMap(), _LighterProvider_orderBookState = new WeakMap(), _LighterProvider_candleSubscribers = new WeakMap(), _LighterProvider_candleSeries = new WeakMap(), _LighterProvider_accountChannelsPromise = new WeakMap(), _LighterProvider_venuePublicKey = new WeakMap(), _LighterProvider_signerReadyPromise = new WeakMap(), _LighterProvider_authToken = new WeakMap(), _LighterProvider_getErrorContext = new WeakMap(), _LighterProvider_rawSignerBridge = new WeakMap(), _LighterProvider_getSignerBridge = new WeakMap(), _LighterProvider_invalidateSignerSession = new WeakMap(), _LighterProvider_clearBridgeOwnership = new WeakMap(), _LighterProvider_ensureSessionBinding = new WeakMap(), _LighterProvider_rebuildStreamForSubscribers = new WeakMap(), _LighterProvider_ensureAccountIndex = new WeakMap(), _LighterProvider_assertStandardAccount = new WeakMap(), _LighterProvider_isUnsupportedCapabilityError = new WeakMap(), _LighterProvider_isDataIntegrityError = new WeakMap(), _LighterProvider_tpslUnsettled = new WeakMap(), _LighterProvider_nonceReservations = new WeakMap(), _LighterProvider_tpslOperationCounter = new WeakMap(), _LighterProvider_signerIdentity = new WeakMap(), _LighterProvider_signerRecreateParams = new WeakMap(), _LighterProvider_nonceLedgerKey = new WeakMap(), _LighterProvider_readNonceLedger = new WeakMap(), _LighterProvider_writeNonceLedger = new WeakMap(), _LighterProvider_withLedgerLock = new WeakMap(), _LighterProvider_resolveEntryPostDispatch = new WeakMap(), _LighterProvider_resolveNonceLedger = new WeakMap(), _LighterProvider_resolveNonceLedgerLocked = new WeakMap(), _LighterProvider_releaseNonceReservationIfUnconsumed = new WeakMap(), _LighterProvider_tpslJournalKey = new WeakMap(), _LighterProvider_tpslJournalOpKey = new WeakMap(), _LighterProvider_loadTpslJournal = new WeakMap(), _LighterProvider_tpslJournalIndexKey = new WeakMap(), _LighterProvider_readTpslJournalIndex = new WeakMap(), _LighterProvider_tpslManualKey = new WeakMap(), _LighterProvider_tpslManualIndexKey = new WeakMap(), _LighterProvider_readTpslManualIndex = new WeakMap(), _LighterProvider_writeTpslManualRecovery = new WeakMap(), _LighterProvider_loadTpslManualRecovery = new WeakMap(), _LighterProvider_clearTpslManualRecovery = new WeakMap(), _LighterProvider_persistTpslJournal = new WeakMap(), _LighterProvider_clearTpslJournal = new WeakMap(), _LighterProvider_makeInactiveReader = new WeakMap(), _LighterProvider_tpslRecoveryGeneration = new WeakMap(), _LighterProvider_tpslRecoveryInFlight = new WeakMap(), _LighterProvider_tpslRecoveryKickPending = new WeakMap(), _LighterProvider_kickTpslRecovery = new WeakMap(), _LighterProvider_recoverPendingTpslJournals = new WeakMap(), _LighterProvider_recoverTpslSymbol = new WeakMap(), _LighterProvider_settleTpslObligation = new WeakMap(), _LighterProvider_settleTpslObligationLocked = new WeakMap(), _LighterProvider_reconcilePriorTpsl = new WeakMap(), _LighterProvider_releaseNonceReservation = new WeakMap(), _LighterProvider_awaitTpslVisibility = new WeakMap(), _LighterProvider_assertSession = new WeakMap(), _LighterProvider_invalidateSessionState = new WeakMap(), _LighterProvider_ensureSignerReady = new WeakMap(), _LighterProvider_setupSigner = new WeakMap(), _LighterProvider_isVenueKeyRegistered = new WeakMap(), _LighterProvider_registerVenueKey = new WeakMap(), _LighterProvider_writeChain = new WeakMap(), _LighterProvider_issuedClientOrderIds = new WeakMap(), _LighterProvider_allocateClientOrderIndexes = new WeakMap(), _LighterProvider_withVenueWriteLock = new WeakMap(), _LighterProvider_withVenueNonce = new WeakMap(), _LighterProvider_reestablishSignerClient = new WeakMap(), _LighterProvider_getAuthToken = new WeakMap(), _LighterProvider_ensureMarkets = new WeakMap(), _LighterProvider_readOpenOrdersStrict = new WeakMap(), _LighterProvider_resolveLeverageIntent = new WeakMap(), _LighterProvider_resolveMarketReferencePrice = new WeakMap(), _LighterProvider_normalizeCloseParams = new WeakMap(), _LighterProvider_validateCloseShape = new WeakMap(), _LighterProvider_isVerifiedFullClose = new WeakMap(), _LighterProvider_validateOrderChecks = new WeakMap(), _LighterProvider_validateClosePositionChecks = new WeakMap(), _LighterProvider_marginBySymbol = new WeakMap(), _LighterProvider_maxLeverageForMarketId = new WeakMap(), _LighterProvider_requireMarketMaxLeverage = new WeakMap(), _LighterProvider_marginFetchedAt = new WeakMap(), _LighterProvider_marginRefreshInFlight = new WeakMap(), _LighterProvider_ensureMarketMargins = new WeakMap(), _LighterProvider_ensureAccountChannels = new WeakMap(), _LighterProvider_hasAnySubscriber = new WeakMap(), _LighterProvider_requestChannel = new WeakMap(), _LighterProvider_sendSubscribe = new WeakMap(), _LighterProvider_releaseChannelIfUnused = new WeakMap(), _LighterProvider_ensureStream = new WeakMap(), _LighterProvider_connectWs = new WeakMap(), _LighterProvider_handleWsMessage = new WeakMap(), _LighterProvider_handleOrderBookMessage = new WeakMap(), _LighterProvider_handleCandleMessage = new WeakMap(), _LighterProvider_handleTradesMessage = new WeakMap(), _LighterProvider_dispatchOICaps = new WeakMap(), _LighterProvider_emitToOrderSubscribers = new WeakMap(), _LighterProvider_logSubscriberError = new WeakMap(), _LighterProvider_startPricePolling = new WeakMap(), _LighterProvider_emitPolledPrices = new WeakMap(), _LighterProvider_dispatchPriceUpdates = new WeakMap(), _LighterProvider_deliverPrices = new WeakMap(), _LighterProvider_clearKeepalive = new WeakMap(), _LighterProvider_teardownStream = new WeakMap(), _LighterProvider_bridgeRoute = new WeakMap();
//# sourceMappingURL=LighterProvider.cjs.map