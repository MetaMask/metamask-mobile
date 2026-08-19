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
var _AggregatedOrderBookConnection_instances, _AggregatedOrderBookConnection_isTestnet, _AggregatedOrderBookConnection_transport, _AggregatedOrderBookConnection_transportIsTestnet, _AggregatedOrderBookConnection_activeCount, _AggregatedOrderBookConnection_payloads, _AggregatedOrderBookConnection_activeSubscriptions, _AggregatedOrderBookConnection_terminated, _AggregatedOrderBookConnection_ensureTransport, _AggregatedOrderBookConnection_closeTransport;
import { SubscriptionClient, WebSocketTransport } from "@nktkas/hyperliquid";
import { HYPERLIQUID_TRANSPORT_CONFIG } from "../constants/hyperLiquidConfig.mjs";
// Fast mode streams 5 levels per side (slow mode streams 20). We run fast mode
// for lower-latency ladder updates, so the book never carries more than this.
const DEFAULT_LEVELS = 5;
/**
 * Transforms a raw Hyperliquid `l2Book` snapshot into the `OrderBookData` shape
 * the UI consumes. Mirrors the subscription service's internal
 * `processOrderBookData` so this dedicated connection is a drop-in replacement
 * for `subscribeToOrderBook` on the aggregated channel.
 *
 * @param data - Raw `l2Book` event.
 * @param levels - Number of levels per side to keep.
 * @returns Processed order-book snapshot.
 */
export function processAggregatedOrderBook(data, levels) {
    const bidsRaw = data?.levels?.[0] ?? [];
    const asksRaw = data?.levels?.[1] ?? [];
    let bidCumulativeSize = 0;
    let bidCumulativeNotional = 0;
    const bids = bidsRaw.slice(0, levels).map((level) => {
        const price = Number.parseFloat(level.px);
        const size = Number.parseFloat(level.sz);
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
    let askCumulativeSize = 0;
    let askCumulativeNotional = 0;
    const asks = asksRaw.slice(0, levels).map((level) => {
        const price = Number.parseFloat(level.px);
        const size = Number.parseFloat(level.sz);
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
    const bestBid = bids[0];
    const bestAsk = asks[0];
    const bidPrice = bestBid ? Number.parseFloat(bestBid.price) : 0;
    const askPrice = bestAsk ? Number.parseFloat(bestAsk.price) : 0;
    const spread = askPrice > 0 && bidPrice > 0 ? askPrice - bidPrice : 0;
    const midPrice = askPrice > 0 && bidPrice > 0 ? (askPrice + bidPrice) / 2 : 0;
    const spreadPercentage = midPrice > 0 ? ((spread / midPrice) * 100).toFixed(4) : '0';
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
}
/**
 * Owns a dedicated Hyperliquid WebSocket connection used solely for the
 * order-book panel's server-aggregated `l2Book` subscription.
 *
 * The main connection (managed by the subscription service) multiplexes every
 * subscription onto a single socket. The Hyperliquid SDK dispatches `l2Book`
 * events by `coin` only, so running the raw (full-precision) and the aggregated
 * (`nSigFigs`) subscriptions for the same coin on that shared socket
 * cross-contaminates them — the coarse ladder and the precise spread/slippage
 * clobber each other. Giving the aggregated subscription its own socket removes
 * the collision entirely: this socket only ever carries a single `l2Book`
 * stream, and the main socket is never touched by the panel's grouping.
 *
 * The socket is created lazily on the first subscription and torn down once the
 * last subscription is removed, so it exists only while an order-book panel is
 * open. Because network is a global setting, the transport is recreated if
 * `isTestnet` changes between (re)subscriptions.
 */
export class AggregatedOrderBookConnection {
    constructor({ isTestnet }) {
        _AggregatedOrderBookConnection_instances.add(this);
        _AggregatedOrderBookConnection_isTestnet.set(this, void 0);
        _AggregatedOrderBookConnection_transport.set(this, null);
        _AggregatedOrderBookConnection_transportIsTestnet.set(this, false);
        _AggregatedOrderBookConnection_activeCount.set(this, 0);
        // Tracks the single `l2Book` payload the dedicated socket carries per asset,
        // keyed by symbol. The SDK dispatches `l2Book` events by `coin` only, so two
        // subscriptions for the same asset with different params (e.g. `nSigFigs`)
        // would cross-contaminate on this shared socket — exactly the collision this
        // connection exists to avoid. `count` refcounts the (identical) subscriptions
        // sharing a payload so the entry is dropped once the last one unsubscribes.
        _AggregatedOrderBookConnection_payloads.set(this, new Map());
        // Force-terminate callback for every currently-active subscription. When a
        // transport rebuild (`#closeTransport`) shuts the socket down out from under
        // live subscriptions, these tear each one down — notifying the caller and
        // releasing its SDK subscription / socket listeners — instead of orphaning
        // them (stale handle, no more updates, and no further status because
        // reporting is suppressed once `transport !== this.#transport`).
        _AggregatedOrderBookConnection_activeSubscriptions.set(this, new Set());
        // Set when the socket's auto-reconnection is exhausted (its
        // `terminationSignal` aborts). A terminated socket cannot recover, so the next
        // subscribe must build a fresh transport instead of reusing the dead one.
        _AggregatedOrderBookConnection_terminated.set(this, false);
        __classPrivateFieldSet(this, _AggregatedOrderBookConnection_isTestnet, isTestnet, "f");
    }
    /**
     * Opens an aggregated `l2Book` subscription on the dedicated socket.
     *
     * Mirrors the subscription service's synchronous-unsubscribe contract: the
     * returned function can be called before the async subscribe resolves and
     * will cancel the pending subscription.
     *
     * Only one `l2Book` payload per asset may be active at a time. Subscribing to
     * an asset that already has a live subscription with different params (e.g. a
     * different `nSigFigs` or `mantissa`) throws, because the shared socket
     * dispatches by `coin` and the conflicting streams would clobber each other.
     *
     * @param params - Subscription parameters.
     * @returns An unsubscribe function.
     * @throws If the asset already has an active subscription with different params.
     */
    subscribe(params) {
        const levels = params.levels ?? DEFAULT_LEVELS;
        // The `l2Book` subscription params the socket carries. `levels` is
        // client-side only (it slices each snapshot), so it is deliberately excluded
        // from the params and their signature.
        const l2BookParams = {
            coin: params.symbol,
            nSigFigs: params.nSigFigs,
            mantissa: params.mantissa ?? null,
            fast: true,
        };
        const signature = JSON.stringify(l2BookParams);
        const transport = __classPrivateFieldGet(this, _AggregatedOrderBookConnection_instances, "m", _AggregatedOrderBookConnection_ensureTransport).call(this, __classPrivateFieldGet(this, _AggregatedOrderBookConnection_isTestnet, "f").call(this));
        // Reject a conflicting payload for an asset already on this socket. A
        // recreated transport (first use, network change, or terminate) starts with
        // an empty payload map, so this can only trip on the reuse path — the shared
        // socket that would actually suffer the collision.
        const existingPayload = __classPrivateFieldGet(this, _AggregatedOrderBookConnection_payloads, "f").get(params.symbol);
        if (existingPayload && existingPayload.signature !== signature) {
            throw new Error(`AggregatedOrderBookConnection: "${params.symbol}" is already subscribed with different params; only one l2Book payload per asset is allowed on the dedicated socket.`);
        }
        const { socket } = transport;
        let cancelled = false;
        let subscription = null;
        __classPrivateFieldSet(this, _AggregatedOrderBookConnection_activeCount, __classPrivateFieldGet(this, _AggregatedOrderBookConnection_activeCount, "f") + 1, "f");
        if (existingPayload) {
            existingPayload.count += 1;
        }
        else {
            __classPrivateFieldGet(this, _AggregatedOrderBookConnection_payloads, "f").set(params.symbol, { signature, count: 1 });
        }
        // Set once this subscription's socket terminates (reconnection exhausted).
        // The `error` state is terminal until teardown/resubscribe, so once set we
        // suppress any late `connected`/`connecting` — e.g. from a subscribe promise
        // that resolves *after* the socket died — which would otherwise flip the UI
        // back to a healthy state on a dead socket and hide the manual-reconnect
        // affordance.
        let terminated = false;
        const reportStatus = (status) => {
            // Suppress reports from a subscription that no longer drives the UI: it
            // was unsubscribed (`cancelled`), its transport was replaced by a network
            // flip or recreate (`transport !== this.#transport`, so its socket is
            // dead), or its socket permanently terminated and `error` is now sticky
            // until teardown (`terminated`).
            if (cancelled ||
                transport !== __classPrivateFieldGet(this, _AggregatedOrderBookConnection_transport, "f") ||
                (terminated && status !== 'error')) {
                return;
            }
            params.onStatusChange?.(status);
        };
        // Reflect the socket's live health. Every drop dispatches a `close` event;
        // the reconnecting socket only exposes permanent termination through its
        // `terminationSignal` (an `AbortSignal`), which it aborts *before* the final
        // close. So an aborted signal on close — unless it was our own `close()`
        // (`TERMINATED_BY_USER`) — means automatic reconnection is exhausted: the
        // unrecoverable state the UI surfaces with a manual reconnect button. A
        // still-live signal means a transient drop the socket will auto-reconnect.
        const handleOpen = () => reportStatus('connected');
        const handleClose = () => {
            // A torn-down subscription must not mutate shared connection state. Its
            // listeners are normally detached before the socket closes, but guard
            // anyway so a late `close` (e.g. from `transport.close()` racing listener
            // removal) can't wrongly flip `#terminated`.
            if (cancelled) {
                return;
            }
            const { terminationSignal } = socket;
            const terminatedByUser = terminationSignal.reason?.code ===
                'TERMINATED_BY_USER';
            if (terminationSignal.aborted && !terminatedByUser) {
                __classPrivateFieldSet(this, _AggregatedOrderBookConnection_terminated, true, "f");
                terminated = true;
                reportStatus('error');
                return;
            }
            reportStatus('connecting');
        };
        socket.addEventListener('open', handleOpen);
        socket.addEventListener('close', handleClose);
        const removeSocketListeners = () => {
            socket.removeEventListener('open', handleOpen);
            socket.removeEventListener('close', handleClose);
        };
        // Ends this subscription when its transport is torn down beneath it (network
        // flip, post-termination resubscribe, or `close()`). Unlike `teardown` it
        // leaves the shared refcount/payload state alone — `#closeTransport` clears
        // those wholesale — but still notifies the caller and releases this
        // subscription's resources so nothing leaks on the dead socket.
        const forceTerminate = () => {
            if (cancelled) {
                return;
            }
            // Notify directly rather than via `reportStatus`: `#closeTransport`
            // detaches `#transport` before invoking these callbacks (so a reentrant
            // subscribe from this handler builds a fresh transport instead of binding
            // to the dying one), which would otherwise trip `reportStatus`'s
            // stale-transport guard. A subscription whose socket already terminated
            // has reported `error`; a still-live one (abandoned by a network flip or
            // `close()`) needs the terminal signal so the caller stops trusting a
            // now-dead book.
            if (!terminated) {
                params.onStatusChange?.('error');
            }
            cancelled = true;
            removeSocketListeners();
            __classPrivateFieldGet(this, _AggregatedOrderBookConnection_activeSubscriptions, "f").delete(forceTerminate);
            if (subscription) {
                subscription.unsubscribe().catch(() => undefined);
                subscription = null;
            }
        };
        __classPrivateFieldGet(this, _AggregatedOrderBookConnection_activeSubscriptions, "f").add(forceTerminate);
        // Releases this subscription's refcount and tears down the socket once no
        // subscriptions remain. Idempotent via `cancelled`, so it's safe whether it
        // runs from the returned unsubscribe or from a failed subscribe.
        const teardown = () => {
            if (cancelled) {
                return;
            }
            cancelled = true;
            removeSocketListeners();
            __classPrivateFieldGet(this, _AggregatedOrderBookConnection_activeSubscriptions, "f").delete(forceTerminate);
            if (subscription) {
                subscription.unsubscribe().catch(() => undefined);
                subscription = null;
            }
            // Only touch the refcount/current socket if this subscription still
            // belongs to the active transport. If the transport was recreated (network
            // change or terminate), this subscription's socket is already dead and
            // `#activeCount` now tracks only the new transport's subscriptions — so an
            // older unsubscribe must not decrement it and tear down the live socket.
            if (transport === __classPrivateFieldGet(this, _AggregatedOrderBookConnection_transport, "f")) {
                __classPrivateFieldSet(this, _AggregatedOrderBookConnection_activeCount, Math.max(0, __classPrivateFieldGet(this, _AggregatedOrderBookConnection_activeCount, "f") - 1), "f");
                const entry = __classPrivateFieldGet(this, _AggregatedOrderBookConnection_payloads, "f").get(params.symbol);
                if (entry) {
                    entry.count -= 1;
                    if (entry.count <= 0) {
                        __classPrivateFieldGet(this, _AggregatedOrderBookConnection_payloads, "f").delete(params.symbol);
                    }
                }
                if (__classPrivateFieldGet(this, _AggregatedOrderBookConnection_activeCount, "f") === 0) {
                    __classPrivateFieldGet(this, _AggregatedOrderBookConnection_instances, "m", _AggregatedOrderBookConnection_closeTransport).call(this);
                }
            }
        };
        // Surfaces a subscription failure the same way regardless of when it
        // happens: report `error` (before teardown flips `cancelled`, which gates
        // status updates) then release the refcount so the dead subscription doesn't
        // keep the dedicated socket open. Used for both the initial subscribe
        // rejection (`.catch`) and post-confirmation failures the SDK reports only
        // through `onError` — e.g. the server rejecting the re-subscription after a
        // reconnect, which removes the listener and stops all further events (a
        // frozen order book that would otherwise still read as `connected`).
        // Idempotent via `teardown`'s `cancelled` guard.
        const handleSubscriptionError = () => {
            reportStatus('error');
            teardown();
        };
        reportStatus('connecting');
        // Subscribe through the typed `l2Book` client so the params are validated
        // before they reach the wire (`fast: true` requests fast mode — 5 levels at
        // ~0.5s). The listener receives the decoded snapshot directly.
        new SubscriptionClient({ transport })
            .l2Book(l2BookParams, (data) => {
            if (cancelled || data?.coin !== params.symbol || !data?.levels) {
                return;
            }
            params.callback(processAggregatedOrderBook(data, levels));
        }, 
        // `onError` fires at most once for an *already confirmed* subscription
        // that later fails (rejected re-subscription after reconnect, permanent
        // termination, or a drop while re-subscription is disabled). The SDK
        // removes the listener and emits nothing further, so treat it exactly
        // like an initial failure.
        { onError: handleSubscriptionError })
            .then(async (sub) => {
            // Stale if this subscription was unsubscribed (`cancelled`) or its
            // transport was replaced (network flip / recreate) before the subscribe
            // settled — either way the captured socket is dead, so clean up the SDK
            // subscription instead of storing it or announcing `connected`.
            if (cancelled || transport !== __classPrivateFieldGet(this, _AggregatedOrderBookConnection_transport, "f")) {
                try {
                    await sub.unsubscribe();
                }
                catch {
                    // Ignore cleanup errors on an already-cancelled/stale subscription.
                }
                return undefined;
            }
            subscription = sub;
            reportStatus('connected');
            return undefined;
        })
            .catch(handleSubscriptionError);
        return teardown;
    }
    /** Closes the dedicated socket and drops all subscriptions. */
    close() {
        __classPrivateFieldGet(this, _AggregatedOrderBookConnection_instances, "m", _AggregatedOrderBookConnection_closeTransport).call(this);
    }
}
_AggregatedOrderBookConnection_isTestnet = new WeakMap(), _AggregatedOrderBookConnection_transport = new WeakMap(), _AggregatedOrderBookConnection_transportIsTestnet = new WeakMap(), _AggregatedOrderBookConnection_activeCount = new WeakMap(), _AggregatedOrderBookConnection_payloads = new WeakMap(), _AggregatedOrderBookConnection_activeSubscriptions = new WeakMap(), _AggregatedOrderBookConnection_terminated = new WeakMap(), _AggregatedOrderBookConnection_instances = new WeakSet(), _AggregatedOrderBookConnection_ensureTransport = function _AggregatedOrderBookConnection_ensureTransport(isTestnet) {
    if (__classPrivateFieldGet(this, _AggregatedOrderBookConnection_transport, "f") &&
        __classPrivateFieldGet(this, _AggregatedOrderBookConnection_transportIsTestnet, "f") === isTestnet &&
        !__classPrivateFieldGet(this, _AggregatedOrderBookConnection_terminated, "f")) {
        return __classPrivateFieldGet(this, _AggregatedOrderBookConnection_transport, "f");
    }
    // First use, the network changed, or the previous socket was terminated —
    // (re)create the dedicated transport. Reuse the package's transport config
    // so this socket shares the finite five-attempt reconnection policy; without
    // it the SDK defaults `maxRetries` to Infinity and a sustained outage would
    // never exhaust reconnection to reach the `error`/manual-reconnect state.
    __classPrivateFieldGet(this, _AggregatedOrderBookConnection_instances, "m", _AggregatedOrderBookConnection_closeTransport).call(this);
    // `#closeTransport` notifies subscribers, which may synchronously re-enter
    // `subscribe` and build a matching transport. Reuse it instead of orphaning
    // it (which would leak the reentrant subscription on an unreferenced socket).
    if (__classPrivateFieldGet(this, _AggregatedOrderBookConnection_transport, "f") &&
        __classPrivateFieldGet(this, _AggregatedOrderBookConnection_transportIsTestnet, "f") === isTestnet &&
        !__classPrivateFieldGet(this, _AggregatedOrderBookConnection_terminated, "f")) {
        return __classPrivateFieldGet(this, _AggregatedOrderBookConnection_transport, "f");
    }
    const transport = new WebSocketTransport({
        isTestnet,
        ...HYPERLIQUID_TRANSPORT_CONFIG,
        reconnect: HYPERLIQUID_TRANSPORT_CONFIG.reconnect,
    });
    __classPrivateFieldSet(this, _AggregatedOrderBookConnection_transport, transport, "f");
    __classPrivateFieldSet(this, _AggregatedOrderBookConnection_transportIsTestnet, isTestnet, "f");
    return transport;
}, _AggregatedOrderBookConnection_closeTransport = function _AggregatedOrderBookConnection_closeTransport() {
    const transport = __classPrivateFieldGet(this, _AggregatedOrderBookConnection_transport, "f");
    // Snapshot the subscriptions to force-terminate, then detach ALL shared
    // state (the set, `#transport`, refcounts) *before* invoking any callback.
    // Those callbacks notify subscribers via `onStatusChange`, which can
    // synchronously re-enter `subscribe`; detaching first guarantees a reentrant
    // subscribe builds a fresh transport (rather than reusing this dying one)
    // and registers itself in a clean set (rather than being swept up by, or
    // lingering past, this teardown). Subscriptions torn down normally have
    // already removed themselves, so their entry is a no-op here.
    const subscriptions = [...__classPrivateFieldGet(this, _AggregatedOrderBookConnection_activeSubscriptions, "f")];
    __classPrivateFieldGet(this, _AggregatedOrderBookConnection_activeSubscriptions, "f").clear();
    __classPrivateFieldSet(this, _AggregatedOrderBookConnection_transport, null, "f");
    __classPrivateFieldSet(this, _AggregatedOrderBookConnection_activeCount, 0, "f");
    __classPrivateFieldGet(this, _AggregatedOrderBookConnection_payloads, "f").clear();
    __classPrivateFieldSet(this, _AggregatedOrderBookConnection_terminated, false, "f");
    // Force-terminate (which detaches each subscription's socket listeners)
    // BEFORE closing the transport. `close()` on an already-exhausted socket
    // dispatches a final `close`; if a stale `handleClose` were still attached
    // it would re-set `#terminated` right after we cleared it, making the next
    // `#ensureTransport` tear down the healthy replacement socket.
    for (const forceTerminate of subscriptions) {
        forceTerminate();
    }
    if (transport) {
        transport.close();
    }
};
//# sourceMappingURL=AggregatedOrderBookConnection.mjs.map