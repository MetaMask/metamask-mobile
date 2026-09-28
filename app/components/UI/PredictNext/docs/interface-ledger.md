# PredictNext Interface Ledger

This ledger records the implemented mobile canonical read contract stabilized by PRED-1168 and refined by PRED-1169. Venue DTO mapping belongs to the Predict API backend; mobile validates canonical Predict API responses only.

The agreed next-contract direction is documented in [`canonical-read-model-and-api.md`](./canonical-read-model-and-api.md). It is not executable until the types, runtime parsers, transport, service, fixtures, and tests are updated together.

## Canonical read models

- `PredictFeed` is returned by `getFeed` and contains the Feed identity, title, Events, and optional pagination cursor.
- `PredictEvent` is returned within a Feed and by `getEvent`, and contains one or more `PredictMarket` values.
- Feed pagination uses `{ venueId, id, title, events, nextCursor? }`; cursors are opaque.
- `PredictMarket` contains exactly two `PredictOutcome` values: one `yes` and one `no`.
- `PredictMarket.group` is optional backend-owned presentation metadata. Mobile supports `marketSelector` groups with a key, Market type, numeric option, and optional display order. Unknown group types remain standard Markets, and mobile never derives group values.
- Each Event, Market, and Outcome retains its own opaque ID. Only the root Event carries `venueId`; nested scope and parent relationships come from containment.
- Each Outcome may contain independent `askPrice` and `bidPrice` decimal strings in the inclusive range `[0, 1]`. Missing means no current quote, not zero.
- Event responses provide the initial Bid Price and Ask Price snapshot. Market history is read separately with `venueId + marketId + range`; it returns the last traded Yes probability observed by the backend and its exact complementary No probability.
- Market status is a small browse projection, not a lossless Venue lifecycle.
- Event status is intentionally absent.
- `PredictVenueStatus` contains the root `venueId`, an `available | degraded | unavailable` status, and the backend observation time as `PredictTimestamp`.
- `PredictEntityId` is venue-local and opaque. An Outcome ID may be native or adapter-derived.
- `PredictTimestamp` is an RFC 3339/ISO-8601 UTC string.

## Live data patch contract

`PredictLiveDataService` streams canonical patches over one WebSocket (`/v1/stream/live-data`) and exposes them through `useEventsWithLiveData`, which returns the same Events with Game fields and Market prices patched. The stream never writes to the query cache; REST is the recovery path.

- Topics are `game` (keyed by Event id) and `market` (keyed by Market id), both Venue-qualified. The server sends a snapshot on first subscription, then deltas.
- `PredictGameLive` is a patch onto `PredictGame`: `status`, `score`, `period`, `clock` under the canonical names, plus `observedAt`. Omitted fields are unchanged. Mobile accumulates frames per Event and applies a field only when its observation time is not older than the REST value; an unknown `status` string leaves the current status in place.
- `PredictQuote` is a full snapshot onto `PredictMarket`, matched by `marketId` and then `outcomes[].id`. On a live-patched Market:
  - `PredictOutcome.bidPrice` / `askPrice` are the streamed values; an omitted side clears the REST price, because absence means no current quote.
  - `PredictMarket.lastPrice` is stream-only: the last traded Yes price as of the quote. The REST read model never carries it, and it is absent until the Market has traded.
  - `PredictMarket.volume` takes the streamed value when present; stream and REST share the contract-count unit.
  - `PredictMarket.updatedAt` becomes the quote's observation time. On a REST-only Market it stays the Venue's market-metadata update time, so the field has two sources and the type's JSDoc records both.
- `PredictOutcome.label` and `gameSelection` are REST-only and survive a quote untouched.
- Only the Event Screen's `LIVE` history range consumes quotes as chart points, appending one per `lastPrice`/`updatedAt` pair after the REST snapshot's last timestamp; the trail is bounded and lives in component state.

Runtime validation lives in `contracts/v1/liveData.ts`: unknown fields are discarded, malformed known fields fail closed, and Game `status` is deliberately validated as a string so a new server status cannot reject the frame.

## Agreed next-contract changes

The next public-read contract will use `Feed → Event → Market → Outcome`, with the same complete Event shape in Feed and detail responses. It will add an optional single Category and Series to Event; optional Event and Market Volume, 24-Hour Volume, and image URL; optional Sport, Competition, Game, Team, Game status, and Game Selection metadata; product-owned Feed reads; and a current-Event read for Rolling Series. Every Event has one parent Venue Event. An immutable Game detail read may append validated Markets from authoritative sibling Venue Events without changing that parent identity.

The reduced browse status will be replaced by the Kalshi lifecycle vocabulary: `initialized`, `active`, `inactive`, `closed`, `determined`, `disputed`, `amended`, and `finalized`. The existing binary Outcome invariant remains unchanged: Game Selection complements rather than replaces an Outcome's `yes | no` side.

## Query descriptors

```ts
marketDataQueries.getVenueStatus(venueId);
marketDataQueries.getFeed(venueId, feedId, params);
marketDataQueries.getEvent(venueId, eventId);
marketDataQueries.getMarketHistory(venueId, marketId, range);
```

All descriptors have Venue-qualified keys, semantic invalidation families, explicit `venue` scope, and centralized stale-time policy. Market-history identity is additionally Market-qualified, while range is part of the exact query key and omitted from its invalidation family. The first price-bearing Event list/detail, Market history, and Venue Status policy is one minute, with no background polling.

## Portfolio

`portfolioQueries.getBalance(venueId)` is owned by `PredictPortfolioService`. Its query key and invalidation family are `['PredictPortfolioService:getBalance', venueId]`, its stale time is 60 seconds, and its scope is `venue`. Portfolio and public market-data reads use separate service policies and circuits, so a Balance outage cannot open the market-data circuit and a Feed outage cannot open the portfolio circuit.

## Order commit (write contract, PRED-1194)

The implemented write contract is one authenticated route: `POST /v1/venues/{venueId}/orders/commit`, carrying the bearer token and a strict `{ previewId }` body — nothing else, so the client cannot alter Market, Outcome, spend, quantity, price, or fee at commit time. The backend derives every executable detail from the stored, expiring Order Preview.

- The response is one canonical Order Receipt, validated by `parsePredictOrderReceipt` in `contracts/v1/trading.ts`. It reports the durable operation identity (`operationId`, `venueOrderId`), the quoted values, and, once reported, the execution values: filled contracts, actual spend, average Fill price, Fee, and payout exposure.
- The route is idempotent by `previewId`: the first accepted call creates one durable Order operation with a stable Venue `client_order_id` and submits it; repeated calls converge on that operation's receipt and never submit twice. A re-POST is therefore an observation and Reconciliation trigger, not a retry.
- Receipt statuses: `pending` and `submitted` are in-progress; the mobile `PredictOrderService` observes them with a small bounded number of re-POSTs. `filled`, `partially_filled`, `not_filled`, and `rejected` are terminal; `partially_filled` is a success with honest partial copy, and `not_filled` reuses the Order-not-filled treatment.
- `reconciliation_required` means the submission outcome is ambiguous and the backend resolves it by looking up the stable `client_order_id` or the resulting Venue Order; the UI renders it as in-progress and the keep-checking affordance re-POSTs the same Commit. A verified venue absence re-arms exactly one submission; there is never a blind second Order.
- Pre-operation failures (expired Preview, untradeable Market, insufficient Balance, unavailable venue) are canonical error codes and never create an operation; once an operation exists, every outcome — including rejection and zero Fill — is a receipt, never an error.
- A terminal receipt invalidates the authoritative Balance, Positions, and Activity reads. Mobile persists nothing about the operation: after a screen closure or app restart the outcome surfaces through those authoritative reads (restart-observation persistence is descoped on PRED-1194).

## Runtime boundary

Mobile parsers in `contracts/v1/marketData.ts` validate canonical Predict API responses using `@metamask/superstruct`. Parsers discard unknown fields, reject malformed known fields, and return generic errors that do not retain received payload values. Kalshi and Polymarket DTOs, status mapping, price-field mapping, and identifier derivation are backend adapter responsibilities and must not enter this module. Contract-version header enforcement and cross-repository fixture tooling are deferred.

## Testing boundary

Contract tests should validate canonical response parsing, binary outcome invariants, decimal price bounds, one-sided or missing quotes, recursive removal of unknown fields, malformed known fields failing closed, the complete pagination envelope, Venue Status, and descriptor behavior. Duplicate-ID validation is intentionally left to the backend. Adapter mapping and service integration tests belong to their respective delivery slices.
