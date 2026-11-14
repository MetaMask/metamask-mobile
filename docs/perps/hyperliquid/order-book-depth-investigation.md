# Hyperliquid order book: 20 levels under 1 second

Date: 2026-10-07

## Goal

Show 20 order-book levels per side, with a visible update interval under 1
second at the 95th percentile. This is a display ladder, not a full-book or L4
feed.

## Executive summary

The official Hyperliquid API does not meet this goal. `fast: true` returns 5
levels. Slow mode returns 20 levels, and that feed is not fast enough to use.
REST polling and a different TypeScript SDK use the same hosted API, so they
do not change the result. The app's 100 ms and 250 ms throttles only limit
React updates.

The feeds that document both 20 levels and block-level snapshots are:

- Hydromancer `l2Book` with `nLevels: 20`, a JSON snapshot about every 70 ms.
- QuickNode, Dwellir, or HyperliquidRPC `StreamL2Book` with `n_levels: 20`, a
  gRPC snapshot on each block or coalesce window.

Hydromancer is the first proof of concept because the message is still a full
snapshot and the transport is JSON. The gRPC feeds are the comparison and
fallback. All of them require an API key, so a backend subscribes once per
active market and sends the app the 20 rows.

`l2BookDiff`, L4 streams, and a self-hosted node can build a deeper book. They
are out of scope until 20 levels under 1 second is proven.

## Scope

In scope: a 20-level aggregated ladder that replaces itself on each update.
Out of scope: more than the vendor snapshot cap, order-level L4 data, and user
addresses on each order.

Protocol behavior and vendor pages can change. The vendor pages were checked
on 2026-10-06. The goal and next steps were set on 2026-10-07.

## Current MetaMask Mobile implementation

### Data flow

`yarn.lock` resolves the ranges in `package.json` to:

- `@metamask/perps-controller` 19.0.0 (`^19.0.0`)
- `@nktkas/hyperliquid` 0.33.3 (`^0.33.3`)

There are two order-book paths:

1. The raw path starts in
   [`usePerpsLiveOrderBook`](../../../app/components/UI/Perps/hooks/stream/usePerpsLiveOrderBook.ts)
   and calls `PerpsController.subscribeToOrderBook`. It supplies the spread,
   midpoint, and slippage book. Its default `nSigFigs` is 5. That is finer than
   a grouped ladder, but it is not Hyperliquid's `nSigFigs: null` full-precision
   mode.
2. The Pro ladder's server-aggregated path uses a dedicated
   [`AggregatedOrderBookConnection`](../../../app/components/UI/Perps/services/aggregatedOrderBookConnection.ts).
   The separate socket prevents raw and aggregated subscriptions for the same
   coin from colliding because the SDK dispatches `l2Book` messages by coin.

Both paths ultimately subscribe to Hyperliquid `l2Book` through
`@nktkas/hyperliquid`.

### Limits selected by the app

[`orderBookGrouping.ts`](../../../app/components/UI/Perps/utils/orderBookGrouping.ts)
defines:

- `MAX_ORDER_BOOK_LEVELS = 20`
- `FAST_ORDER_BOOK_LEVELS = 5`
- `ORDER_BOOK_AGGREGATED_LEVELS = 20`

The focused order-book screen requests `FAST_ORDER_BOOK_LEVELS` with
`fast: true` in
[`PerpsOrderBookView.tsx`](../../../app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView.tsx).
The table renders every level it receives, so its five-row depth is imposed
upstream rather than by an additional render-time slice.

The Pro panel requests up to 20 levels, but its dedicated aggregated controller
connection uses `fast: true`; Hyperliquid therefore supplies no more than five
levels per side. The `levels` argument only slices the received snapshot and
cannot add levels that were not sent.

`usePerpsLiveOrderBook` defaults to a 100 ms UI throttle. Slippage uses the same
hook with `SlippageEstimateBookLevels: 10` and
`SlippageEstimateThrottleMs: 250`, and it does not set `fast`. The throttles cap
React publication frequency, and the level count only slices a snapshot that
has already arrived. Neither setting changes the Hyperliquid subscription.

### Effective current behavior

| Surface                      | Subscription                            | Depth requested by the app           | Documented server behavior              |
| ---------------------------- | --------------------------------------- | ------------------------------------ | --------------------------------------- |
| Focused order-book screen    | `l2Book` with `fast: true`              | 5 per side                           | 5 levels; `WsBook` snapshot             |
| Pro aggregated ladder        | Dedicated socket, `fast: true`          | Client cap 20; server fast mode is 5 | 5 levels; `WsBook` snapshot             |
| Pro raw spread/midpoint path | `l2Book`, `fast` omitted, `nSigFigs: 5` | 20 per side                          | Slow mode: 20 levels                    |
| Slippage calculation         | `l2Book`, `fast` omitted                | Client keeps 10                      | Slow mode: 20 levels, then sliced to 10 |

## Hyperliquid API constraints

### Hosted WebSocket

The official subscription schema accepts:

```json
{
  "type": "l2Book",
  "coin": "BTC",
  "nSigFigs": 5,
  "mantissa": 2,
  "fast": true
}
```

The [official subscription documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions)
states that `fast` returns 5 levels and slow mode returns 20. It lists
`nSigFigs` and `mantissa` as optional integers. The documented level counts are
attached to `fast`, not to those aggregation fields. The
[info endpoint](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#l2-book-snapshot)
defines the accepted aggregation values: `nSigFigs` is 2, 3, 4, 5, or `null`
for full precision, and `mantissa` is 1, 2, or 5 only when `nSigFigs` is 5.

`WsBook` contains `coin`, two arrays of levels, and `time`. Each message is a
complete snapshot. It has no sequence number, previous-sequence link, checksum,
or per-level insert/update/delete operation. A client must replace the visible
book with each message.

This has two important consequences:

1. A client cannot retain levels that leave the snapshot window. It cannot know
   whether those orders still exist.
2. Trades cannot reconstruct the missing depth because cancels and unfilled
   order changes do not appear in the trades feed.

The same official page defines `WsBook` as a "Snapshot feed, pushed on each
block that is at least 0.5 since last push." That is the only numeric push rule
in the `l2Book` documentation. It does not publish a separate interval for the
20-level mode.

The [WebSocket connection documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket)
says servers can disconnect without announcement and that clients must
reconnect. It also says missed data is present in the snapshot acknowledgement
on reconnect. Because every `l2Book` message is a `WsBook` snapshot, the
recovered book is the next snapshot.

### REST

`POST https://api.hyperliquid.xyz/info` with `type: "l2Book"` returns a
one-time snapshot with at most 20 levels per side. It supports the same
aggregation fields but has no `fast` option.

The endpoint has request weight 2 under the shared 1,200-weight-per-minute IP
limit. Polling could theoretically consume up to 600 requests per minute if the
IP did nothing else, but it would repeatedly transfer full snapshots, compete
with other clients behind the same IP, and still never exceed 20 levels.
Hyperliquid recommends WebSockets for lowest-latency real-time data.

REST polling is not a viable route to a full, frequently updated book.

### SDK versus direct API

The [official API page](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
lists the Python SDK as Hyperliquid's SDK and lists the TypeScript SDKs,
including `@nktkas/hyperliquid`, as community implementations. The hosted depth
and snapshot rules come from the API documentation above. Sending the same
`l2Book` payload on a direct WebSocket reaches the same endpoint and the same
documented limits.

`@nktkas/hyperliquid` 0.33.3 forwards `fast`, `nSigFigs`, and `mantissa`. Its
runtime schema accepts mantissa values 2 and 5, while the official info
endpoint also lists 1. That is a client-validator difference. It does not
change the server caps. The other listed community SDK,
`nomeida/hyperliquid`, exposes `subscribeToL2Book(coin, callback)` and sends
`{ "type": "l2Book", "coin" }`, so that helper cannot select `fast` or
aggregation either.

### Self-hosted deep-book server

This server is not described in the official API documentation. Its
[repository README](https://github.com/hyperliquid-dex/order_book_server)
states that it:

- adds an `n_levels` option up to 100 for `l2book`;
- adds `l4Book`, which starts with a full snapshot and then sends order diffs by
  block;
- requires a specially configured non-validating Hyperliquid node;
- does not currently support spot books;
- omits untriggered trigger orders;
- batches output by block, adding a few milliseconds of latency.

The README also states that the project was not written by the Hyperliquid Labs
core team, is unsupported, and may be incomplete or incompatible with future
systems.

## Third-party order-book feeds

These vendors are not part of Hyperliquid's official API. Each page below was
checked on 2026-10-06. Every feed requires a vendor API key. That key cannot
ship in the app. gRPC feeds also are not a React Native client protocol, so
those streams belong behind a MetaMask relay that publishes a bounded book.

### Hydromancer

[Hydromancer `l2Book`](https://docs.hydromancer.xyz/readme/websocket/orderbook-streaming/l2book.md)
documents a JSON WebSocket at `wss://api.hydromancer.xyz/ws?token=`. Each
message is a complete snapshot, sent every block (about 70 ms). `nLevels` is
`1`, `10`, `20` (default), or `50`. A per-coin or multi-coin subscription can
request 50 directly. On the all-markets firehose, 50 requires
`pushMode: "delta"`. The envelope `seq` increases per message. `cursor` is
always `"0"` because this stream has no replay. A lost `seq` means reconnect
and replace the book from the next snapshot.

[Hydromancer `l2BookDiff`](https://docs.hydromancer.xyz/readme/websocket/orderbook-streaming/l2bookdiff.md)
is an incremental stream Hydromancer adds on top of the official API. A message
contains only changed levels for one block. `sz: "0"` removes a level. The
client bootstraps from REST `l2BookDiffSnapshot`, then checks `height`,
`epoch`, and per-coin `prev_seq`. A gap or epoch change requires a new
snapshot. This is the vendor path to a full aggregated book. `l4BookUpdates`
also exists and includes a user address on each order. That address is not
needed for a price ladder.

The [Hydromancer docs homepage](https://docs.hydromancer.xyz/) lists Starter,
Growth, and Scale plans with 10, 50, and 100 order-book streams. Enterprise is
custom. Those caps are too small for one socket per mobile user, so the relay
subscribes once per active market and fans the result out.

### QuickNode

[QuickNode `StreamL2Book`](https://www.quicknode.com/docs/hyperliquid/grpc-api/StreamL2Book.md)
documents gRPC snapshots at each block. `n_levels` defaults to 20 and has a
maximum of 100. `n_sig_figs` is 2–5 and `mantissa` is 1, 2, or 5. Authentication
is an `x-token` metadata value. The method is metered by bytes. QuickNode also
documents `StreamL4Book` as one opening snapshot of individual orders followed
by per-block diffs.

### Dwellir

[Dwellir `StreamL2Book`](https://www.dwellir.com/docs/hyperliquid/stream_l2_book)
documents gRPC snapshots for one coin. Omitting `n_levels` returns 20 levels
per side. `1` through `100` selects a bounded depth. Explicit `0` requests full
depth when that endpoint supports it. An unsupported full-depth request returns
`FAILED_PRECONDITION`. Each frame replaces the previous frame. The stream sends
at most one snapshot per coalesce window, so block numbers can skip.
Authentication is `x-api-key`.

Dwellir's [order-book server guide](https://www.dwellir.com/guides/order-book-server)
documents a separate JSON WebSocket with `nLevels` up to 100 and an `l4Book`
subscription that returns individual orders, including wallet addresses.

### HyperliquidRPC

[HyperliquidRPC `StreamL2Book`](https://hyperliquidrpc.com/docs/streams/l2-book)
documents the same gRPC method with `n_levels` from 1 to 100. The first message
is a full snapshot, then one full refresh per block. Each message replaces the
local book. One subscription takes one coin. The docs say the proto is
wire-compatible with QuickNode's order-book proto. Authentication is
`x-api-key`.

### Other vendors checked

These sources do not add a deeper live ladder beyond the official API:

- [Tardis](https://docs.tardis.dev/historical-data-details/hyperliquid) records
  the official WebSocket. It documents `l2Book` as the 20-level stream and
  `fastBook` as the official `l2Book` subscription with `fast: true`.
- [Allium](https://docs.allium.so/api/developer/hyperliquid/orderbook-snapshot)
  documents a complete order-book snapshot with about 5-second freshness. Its
  [historical snapshots](https://docs.allium.so/historical-data/supported-blockchains/hyperliquid/raw/orderbook-snapshots)
  arrive about every 15 minutes.
- [Chainstack](https://docs.chainstack.com/reference/hyperliquid-info-l2-book)
  documents that `l2Book` is not served by its node and that the official info
  endpoint returns at most 20 levels per side.
- [0xArchive](https://docs.0xarchive.io/hyperliquid-order-book-data-api)
  documents native 20-level L2, full-depth L2 derived from L4, and L4 rows with
  `oid` and `user_address`, over REST, WebSocket, and Parquet. The page
  reviewed is a historical and reconstruction API. Its live stream contract
  still needs a separate check before treating it as a UI feed.

## Reference exchange architectures

Coinbase and OKX demonstrate the architecture needed for a true deep book.
Their feeds cannot be used to display Hyperliquid liquidity; they are protocol
references only.

### Coinbase Exchange

Coinbase `level2` starts with a snapshot of the entire aggregated book and then
sends absolute quantity updates by price level. A size of zero removes the
level. Coinbase says this channel guarantees delivery.
`level2_batch` uses the same schema and batches updates every 50 ms without
authentication. The `full` channel provides order-level events. Its documented
startup is to subscribe, buffer events, fetch a REST snapshot, discard events
at or before that snapshot's sequence, and replay the rest.

The [WebSocket overview](https://docs.cdp.coinbase.com/exchange/websocket-feed/overview)
says most messages carry per-product sequence numbers and that `level2` is the
channel that guarantees delivery. This model can maintain a deep book because
later changes within the subscribed scope are part of the feed.

### OKX

OKX `books` starts with a 400-level snapshot and then sends incremental updates
every 100 ms. Continuity means the new `prevSeqId` matches the previous
`seqId`. OKX documents two exceptions: an empty keepalive where the IDs are
equal, and a maintenance reset where `seqId` becomes smaller. Checksums are
deprecated and fixed at 0. A break outside those exceptions means the documented
sequence is no longer continuous.
`books-l2-tbt` is documented at 10 ms and is restricted to VIP4 and above in
live trading. `books` is the documented public 400-level channel.

These exchanges solve the problem at the protocol level with a deep initial
snapshot plus authoritative incremental changes. A mobile rendering
optimization or SDK swap cannot synthesize that property for Hyperliquid's
hosted snapshot feed.

## Options

| Option                            | Documented depth                  | Documented timing                              | Consistency                        | Mobile cost                    | Operational cost             | Assessment                                     |
| --------------------------------- | --------------------------------- | ---------------------------------------------- | ---------------------------------- | ------------------------------ | ---------------------------- | ---------------------------------------------- |
| Hosted fast WebSocket             | 5 per side                        | `WsBook`: at least 0.5 since previous push     | One replacement snapshot           | Low                            | Low                          | Documented fast subscription                   |
| Hosted slow WebSocket             | 20 per side                       | Same `WsBook` rule; no separate interval       | One replacement snapshot           | Low                            | Low                          | 20 levels, but not fast enough for this goal   |
| REST polling                      | At most 20 per side               | Client poll interval, within the weight limit  | One response snapshot              | Repeated full snapshots        | Low                          | Same 20-level cap, no `fast` parameter         |
| Direct hosted WebSocket           | Same 5/20 caps                    | Same `WsBook` rule                             | Same snapshot semantics            | Similar                        | Client owns the socket       | Same official subscription                     |
| Merge fast and slow subscriptions | 5 plus a separate 20-level book   | Each message has its own `time`                | Not one documented book            | Two subscriptions              | Client must reconcile them   | Official API does not define this as one book  |
| `order_book_server` relay         | README: up to 100 L2, or L4 diffs | README: batched by block                       | README: snapshot, then order diffs | Depends on the relay output    | Node plus local server       | Not in the official API documentation          |
| Hydromancer `l2Book`              | 1, 10, 20, or 50 per side         | Every block, documented as about 70 ms         | One replacement snapshot           | Low if the relay sends top N   | Vendor key and stream cap    | Closest drop-in for a deeper display book      |
| Hydromancer `l2BookDiff`          | Changed levels; snapshot is full  | Per block, only when a subscribed coin changes | Snapshot plus diffs; gap checks    | Keep reconstruction off-device | Vendor key and stream cap    | Full aggregated book, not an official channel  |
| QuickNode `StreamL2Book`          | Default 20, maximum 100           | One snapshot at each block                     | One replacement snapshot           | gRPC, so relay required        | Vendor key, metered by bytes | Display book up to 100 levels                  |
| Dwellir `StreamL2Book`            | 1–100, or 0 for full depth        | At most one snapshot per coalesce window       | Each frame replaces the last       | gRPC, so relay required        | Vendor key                   | 0 is full depth only if the endpoint allows it |
| HyperliquidRPC `StreamL2Book`     | 1–100                             | One full refresh per block                     | Each message replaces the book     | gRPC, so relay required        | Vendor key                   | Same shape as QuickNode's L2 proto             |

## Decision

Do not use the official Hyperliquid order-book feed for this goal. Fast mode
has 5 levels. Slow mode has 20 levels and is not fast enough. Do not switch
SDKs, poll REST, or merge the fast and slow subscriptions to try to produce one
book.

Use a vendor snapshot feed through a MetaMask backend:

1. First proof of concept: Hydromancer `l2Book` with `nLevels: 20`.
2. Comparison: one of QuickNode, Dwellir, or HyperliquidRPC `StreamL2Book` with
   `n_levels: 20`.
3. Leave `l2BookDiff`, L4, and `order_book_server` for a later goal that needs
   more than these snapshot caps.

If the vendor feed is down, the app keeps the current official fast feed: 5
levels. It does not fall back to the official slow feed.

## Next steps

1. Get a Hydromancer key and written confirmation of the order-book stream cap,
   price, and what happens when the cap is exceeded. The published plans list
   10, 50, or 100 streams. That is one backend subscription per active market,
   not one socket per phone.
2. Build a small relay. It holds the vendor token, subscribes to
   `{ "type": "l2Book", "coins": ["BTC"], "nLevels": 20 }`, and replaces its
   stored ladder on every snapshot. A gap in `seq` drops that ladder and waits
   for the next snapshot.
3. Publish the 20 bids and 20 asks to the app with the vendor `time` and the
   relay time. Keep the existing `OrderBookData` shape so the ladder can render
   it. Keep the 100 ms UI throttle.
4. Measure BTC and ETH, quiet and active, on Wi-Fi and cellular, as a headless
   collector and in the order-book UI. Include a disconnect and a return from
   background. Pass only if all of these hold:
   - 20 levels per side;
   - visible update interval p95 under 1 second;
   - no row kept after a disconnect or a `seq` gap;
   - no material drop in order-form frame rate.
5. Repeat the same measurement on one gRPC `StreamL2Book` at `n_levels: 20`.
   Keep the vendor that passes and has an acceptable stream cap and price.
6. Only after that passes, wire the relay into the order-book screen and the
   Pro ladder in place of `fast: true`. Slippage can stay on the official book
   until the relay numbers are checked against the current estimate.

## Sources

Hyperliquid:

- [WebSocket subscriptions](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket/subscriptions)
- [WebSocket connection and recovery](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/websocket)
- [Info endpoint: L2 book snapshot](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#l2-book-snapshot)
- [Rate limits](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits)
- [Supported SDKs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [`@nktkas/hyperliquid` v0.33.3 `l2Book` implementation](https://github.com/nktkas/hyperliquid/blob/v0.33.3/src/api/subscription/_methods/l2Book.ts)
- [`nomeida/hyperliquid` `subscribeToL2Book`](https://github.com/nomeida/hyperliquid/blob/master/src/websocket/subscriptions.ts)
- [Experimental `order_book_server`](https://github.com/hyperliquid-dex/order_book_server)

Third-party feeds:

- [Hydromancer `l2Book`](https://docs.hydromancer.xyz/readme/websocket/orderbook-streaming/l2book.md)
- [Hydromancer `l2BookDiff`](https://docs.hydromancer.xyz/readme/websocket/orderbook-streaming/l2bookdiff.md)
- [Hydromancer plans and stream caps](https://docs.hydromancer.xyz/)
- [QuickNode `StreamL2Book`](https://www.quicknode.com/docs/hyperliquid/grpc-api/StreamL2Book.md)
- [QuickNode `StreamL4Book`](https://www.quicknode.com/docs/hyperliquid/grpc-api/StreamL4Book.md)
- [Dwellir `StreamL2Book`](https://www.dwellir.com/docs/hyperliquid/stream_l2_book)
- [Dwellir order-book server guide](https://www.dwellir.com/guides/order-book-server)
- [HyperliquidRPC `StreamL2Book`](https://hyperliquidrpc.com/docs/streams/l2-book)
- [Tardis Hyperliquid capture](https://docs.tardis.dev/historical-data-details/hyperliquid)
- [Allium order-book snapshot](https://docs.allium.so/api/developer/hyperliquid/orderbook-snapshot)
- [Chainstack `l2Book`](https://docs.chainstack.com/reference/hyperliquid-info-l2-book)
- [0xArchive order-book API](https://docs.0xarchive.io/hyperliquid-order-book-data-api)
- [`@metamask/perps-controller` 19.0.0 aggregated connection](https://unpkg.com/@metamask/perps-controller@19.0.0/dist/services/AggregatedOrderBookConnection.js)

Reference exchanges:

- [Coinbase Exchange WebSocket channels](https://docs.cdp.coinbase.com/exchange/websocket-feed/channels)
- [Coinbase Exchange WebSocket overview and sequence behavior](https://docs.cdp.coinbase.com/exchange/websocket-feed/overview)
- [OKX order-book WebSocket channels](https://www.okx.com/docs-v5/en/#order-book-trading-market-data-ws-order-book-channel)
