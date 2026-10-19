# PredictNext Interface Ledger

This ledger records the implemented mobile canonical read contract stabilized by PRED-1168 and refined by PRED-1169. Venue DTO mapping belongs to the Predict API backend; mobile validates canonical Predict API responses only.

The earlier read-model direction is documented in [`canonical-read-model-and-api.md`](./canonical-read-model-and-api.md). PRED-1374's [permanent public API contract](./public-api-contract.md) defines external ownership, private legacy adaptation, and next financial/Activity additions. Proposed changes are not executable until types, runtime parsers, transport, services, fixtures, and tests change together. PredictNext is unreleased; coordinated breaking changes are allowed without another API version or negotiation for old unreleased clients.

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
marketDataQueries.searchEvents(venueId, { q, limit });
```

All descriptors have Venue-qualified keys, semantic invalidation families, explicit `venue` scope, and centralized stale-time policy. Market-history identity is additionally Market-qualified, while range is part of the exact query key and omitted from its invalidation family. Search keys carry the trimmed query text and limit; the invalidation family is Venue-wide. The first price-bearing Event list/detail, Market history, and Venue Status policy is one minute, with no background polling.

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

## Order preview and commit (action contract, PRED-1195)

The same route pair serves both Order Actions (ADR-0001). A sell Preview request carries `action: 'sell'` plus `contracts` — a positive-integer decimal string, whole contracts only — while a buy request keeps the exact PRED-1194 body with no `action` key. Version tolerance: deployments skew, and a strict backend schema rejects unknown keys, so an old client must keep working against a new backend and vice versa; a buy response that omits `action` parses as the buy variant (normalized to `action: 'buy'`), an explicit `action: 'sell'` parses as the sell variant, and a response carrying the other action's fields fails validation (absent, not null).

- The sell Preview reports `requestedContracts`, `estimatedContracts`, `averagePrice`, `limitPrice`, `fee` with its `feeBreakdown`, `estimatedProceeds` (gross), `estimatedNetProceeds` (Proceeds minus Fee), and `expiresAt`. `limitPrice` is a shared field on both Preview actions — the worst ask consumed on a buy, the worst bid on a sell: the Immediate Order's price floor — and the mobile buy schema masks it rather than rejecting it. Buy-only fields (`requestedAmount`, `orderAmount`, `totalDebit`, `potentialPayout`, `potentialProfit`) are absent, not null.
- The sell Receipt reports `quotedContracts` and, once the Venue reports fills, `filledContracts`, `averageFillPrice`, `fee`, `actualProceeds`, and `netProceeds` — fill fields are projected as fixed-point decimal strings, identical across actions (`filledContracts: '7.00'`). `requestedMaxSpend`, `actualSpend`, and `payoutExposure` are absent on sell receipts.
- Over-selling a Position fails closed with the canonical `insufficient_position` code; a failed position read reports `position_unavailable`. The backend ownership check validates the requested count against venue position evidence at preview and commit, but it is not a reservation — concurrent sells of the shared venue account can jointly exceed the position until fills settle. `reconciliation_required` observation and the idempotent re-POST of the same `previewId` are identical for both actions.

## PRED-1374 proposed external and account contracts

[ADR-0002](./adr/0002-permanent-public-api-private-legacy.md) governs the boundary. External callers use deliberate discovery, portfolio, Activity, navigation and operation APIs that resolve Active Venue. Existing internal query/service APIs remain Venue-qualified. Legacy Polymarket presentation and internal hooks stay unchanged. Private wrappers convert canonical inputs/results and can rehydrate legacy entities by reference; no raw-object sidecar or external legacy model.

### Account query identity amendment, PRED-1381

Current portfolio descriptors above are Venue-only and are insufficient for distinct Predict Users or wallet-scoped Venue Accounts. The required next account descriptor is:

```ts
queryKey: [serviceAction, venueId, personScopeId, accountScopeId, generation, params?];
family: [serviceAction, venueId, personScopeId, accountScopeId, generation];
scope: 'account';
```

`personScopeId` and `accountScopeId` are opaque, process-local identifiers, not raw profile subjects or wallet addresses. Kalshi follows the authenticated person's resolved Venue Account; wallet-scoped Polymarket additionally follows its Funding Wallet/account. Params include actual filters, limit and ordering; pagination stays owned by the query's chain. Public market-data keys stay Venue-qualified and person-independent.

A separate selection generation rejects late old-Venue visible results and invalidates unsubmitted previews. Account generation guards reject results from replaced/invalidated scopes even when cancellation is ignored. True identity replacement cancels reads, removes account cache/presentation state, rotates scope identifiers/generations and disposes old-person observers. Stale-marking alone is insufficient. Same-person context changes do not redirect or suppress submitted operations, which retain their original account scope and never acquire another person's token. See the public contract for token-refresh/alias continuity and lifecycle detail.

### Canonical additions, not implemented

- Distinct optional displayed probability with source basis/observation; no last/mid/mark-to-Ask fallback.
- Stable account-row/Outcome references, decimal holdings and public sell quantities, optional side for metadata-poor account entries. Event's exactly-two-Outcome invariant stays strict. Kalshi's integer sell wire remains unchanged.
- Optional independently available Position valuation fields and complete-population summary, including current value, entry cost, unrealized amount/percent and observation time. No `marketExposure` substitution or page-limited total. Kalshi methodology still requires PRED-1378 approval.
- Activity keeps `fill | settlement`; optional authoritative Fill execution direction, reported-side/price pair, source historical display/PnL, genuine transaction references, and explicit `claim | automatic` settlement mode. Settlement result is optional when unavailable, not fabricated. Catalog retirement does not remove a row. Supplied malformed money or enums still fail validation.
- Kalshi's reported `outcomeSide` plus matching-leg price is preserved with neutral copy under exposure/transacted-side skew. It does not prove bought/sold or held-Position side. Polymarket authoritative transacted action/Outcome evidence can support bought/sold copy.
- External operation presentation is mobile-only, scoped and protocol-free. Order completion observation remains process-local, with no new persistence/restart guarantee. Funding recovery remains with its owners.

Exact proposed fields, route changes, source mapping requirements, consumer APIs, prerequisites and deletion criteria are specified once in [the public API contract](./public-api-contract.md). The API source at `594bba7` still has Kalshi-only DTOs, no valuation/summary, shared demo portfolio reads pending PRED-1162, and bounded Activity fetches that can report early exhaustion. These are not new-contract guarantees. PRED-1374 changes none of them at runtime.

## Runtime boundary

Mobile parsers in `contracts/v1/marketData.ts` validate canonical Predict API responses using `@metamask/superstruct`. Parsers discard unknown fields, reject malformed known fields, and return generic errors that do not retain received payload values. Venue DTOs, status mapping, price-field mapping, and identifier derivation stay in their implementation adapters, not these canonical parsers. Kalshi normalization belongs to the backend. PRED-1340 temporarily permits private mobile Polymarket adaptation before PRED-1356; its protocol types still cannot enter public product contracts. Contract-version header enforcement and cross-repository fixture tooling are deferred.

## Testing boundary

Contract tests should validate canonical response parsing, binary outcome invariants, decimal price bounds, one-sided or missing quotes, recursive removal of unknown fields, malformed known fields failing closed, the complete pagination envelope, Venue Status, and descriptor behavior. Duplicate-ID validation is intentionally left to the backend. Adapter mapping and service integration tests belong to their respective delivery slices.
