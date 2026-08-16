import type { OrderBookData } from "../types/index.mjs";
/**
 * A single L2 book price level as delivered by Hyperliquid's `l2Book`
 * subscription. Declared locally to avoid coupling to the SDK's exported type
 * names (and to keep this the only file that references the SDK's shapes).
 */
type HyperliquidL2BookLevel = {
    /** Price. */
    px: string;
    /** Total size resting at this price. */
    sz: string;
    /** Number of individual orders. */
    n: number;
};
/** `l2Book` snapshot event (index 0 = bids, index 1 = asks). */
type HyperliquidL2BookEvent = {
    coin: string;
    time: number;
    levels: [bids: HyperliquidL2BookLevel[], asks: HyperliquidL2BookLevel[]];
    spread?: string;
};
/**
 * Health of the dedicated order-book socket, surfaced to the UI so the panel
 * can show a reconnect affordance.
 *
 * - `connecting`: socket opening or reconnecting after a transient drop.
 * - `connected`: subscription is live.
 * - `error`: dropped and automatic reconnection was exhausted; needs a manual reconnect.
 */
export type OrderBookConnectionStatus = 'connecting' | 'connected' | 'error';
export type SubscribeAggregatedOrderBookParams = {
    /** Market symbol (e.g. 'BTC'). */
    symbol: string;
    /** Number of levels per side to keep. */
    levels?: number;
    /**
     * Server-side aggregation significant figures. Required: omitting it would
     * request the raw, full-precision book instead of an aggregated one, which
     * contradicts this service's contract.
     */
    nSigFigs: 2 | 3 | 4 | 5;
    /** Mantissa refinement when `nSigFigs` is 5. */
    mantissa?: 2 | 5;
    /** Invoked with each processed snapshot. */
    callback: (data: OrderBookData) => void;
    /** Invoked when the underlying socket's health changes. */
    onStatusChange?: (status: OrderBookConnectionStatus) => void;
};
export type AggregatedOrderBookConnectionOptions = {
    /** Resolves the current network at subscribe time. */
    isTestnet: () => boolean;
};
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
export declare function processAggregatedOrderBook(data: HyperliquidL2BookEvent, levels: number): OrderBookData;
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
export declare class AggregatedOrderBookConnection {
    #private;
    constructor({ isTestnet }: AggregatedOrderBookConnectionOptions);
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
    subscribe(params: SubscribeAggregatedOrderBookParams): () => void;
    /** Closes the dedicated socket and drops all subscriptions. */
    close(): void;
}
export {};
//# sourceMappingURL=AggregatedOrderBookConnection.d.mts.map