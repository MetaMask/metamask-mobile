/**
 * Types for Hydromancer's `l2Book` WebSocket feed.
 *
 * Modeled on the live vendor docs (checked 2026-10-21):
 * https://docs.hydromancer.xyz/readme/websocket/orderbook-streaming/l2book.md
 *
 * Hydromancer is a third-party Hyperliquid data vendor evaluated in the
 * "Perps HyperLiquid order-book depth investigation" doc as the first PoC
 * path to a 20-level, sub-second order book (the official Hyperliquid feed
 * caps `fast` mode at 5 levels and its 20-level slow mode is not fast
 * enough). See `../services/hydromancerOrderBookConnection.ts`.
 */

/** A single L2 price level as delivered by Hydromancer's `l2Book` stream. */
export interface HydromancerLevel {
  /** Price as a decimal string. */
  px: string;
  /** Total size resting at this price level, as a decimal string. */
  sz: string;
  /** Number of individual orders resting at this price level. */
  n: number;
}

/** Per-coin snapshot payload carried in the `data` field of an `l2Book` message. */
export interface HydromancerL2BookData {
  /** Market symbol (e.g. "ETH", "BTC"). */
  coin: string;
  /** Block timestamp, milliseconds since epoch. */
  time: number;
  /** Tuple of `[bids, asks]`. Bids sorted descending, asks ascending. */
  levels: [bids: HydromancerLevel[], asks: HydromancerLevel[]];
}

/**
 * Single-coin `l2Book` message envelope. Hydromancer batches `data` into an
 * array for multi-coin/firehose subscriptions; this PoC only ever subscribes
 * one coin at a time (mirroring `AggregatedOrderBookConnection`), so only the
 * single-coin shape is modeled.
 */
export interface HydromancerL2BookMessage {
  type: 'l2Book';
  channel: 'l2Book';
  /** Per-subscription sequence number. Gap-free; a jump means reconnect. */
  seq: number;
  /** Always "0" — l2Book is stateless, no replay. */
  cursor: '0';
  /** Present only on aggregated subscriptions; echoes the subscribe request. */
  nSigFigs?: 2 | 3 | 4 | 5;
  /** Present only when the subscribe request included `mantissa`. */
  mantissa?: 2 | 5;
  data: HydromancerL2BookData;
}

/** `{"method":"subscribe","subscription":{...}}` request body for `l2Book`. */
export interface HydromancerL2BookSubscribeRequest {
  method: 'subscribe' | 'unsubscribe';
  subscription: {
    type: 'l2Book';
    coins?: string[];
    nSigFigs?: 2 | 3 | 4 | 5;
    mantissa?: 2 | 5;
    /** `1` (BBO), `10`, `20` (default), or `50`. */
    nLevels?: 1 | 10 | 20 | 50;
  };
}
