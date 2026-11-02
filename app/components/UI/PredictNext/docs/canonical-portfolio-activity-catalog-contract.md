# Canonical portfolio, Activity, and Venue catalog contract

- **Status:** Proposed by PRED-1402. Rules marked _Proposed, needs product sign-off_ are recommended defaults, not agreements.
- **Scope:** Account-scoped Position, Portfolio Summary, and Activity reads, and the public Venue catalog.
- **Venues:** Kalshi implements it in the Predict API now (PRED-1378, PRED-1380, PRED-1403). Polymarket implements the same contract in the Predict API under PRED-1356.
- **Adoption:** PRED-1404 adopted it in mobile: `types/`, `contracts/v1/portfolio.ts`, `PredictPortfolioService` (including `getPortfolioSummary`), `portfolioQueries`, `usePortfolioSummary`, the fixtures in `contracts/v1/fixtures/portfolio-contract/`, and the Portfolio screen.

## Why

The implemented portfolio types follow Kalshi's native model. `PredictFill` has no buy or sell direction. `PredictPosition` has `marketExposure` but no current value, cost basis, or unrealized PnL. Home position rows, the Home PnL row, BalanceBreakdown, the Portfolio screen, and Activity cannot reach parity with production Polymarket from those types.

This contract is shaped by those surfaces. Both Venues supply it from the Predict API. The backend absorbs each Venue's native model. Mobile never adopts a Venue's native semantics, and it never computes valuations or totals.

## Principles

- **Product-shaped and small.** Every field cites a surface that needs it ([inventory](#surface-inventory)). Add a field only when a named surface needs it.
- **Strict.** Optionality reflects genuine source absence. Fields are never weakened to fit legacy client data loss ([ADR-0002](./adr/0002-permanent-public-api-private-legacy.md)).
- **Absent is not zero.** A value with no authoritative source is omitted. A known zero, such as a losing payout or a Venue without Claims, is `"0"`.
- **Server-computed.** Totals cover all holdings, never a loaded page. Mobile formats values and does not derive them.
- **Decimal strings.** Money is USD and prices are per-share USD in `[0, 1]`. Mobile must not use binary floating point for financial values.
- **No versioning.** PredictNext is unreleased. This is a coordinated breaking change, with no API version, negotiation, or dual parser.

## Surface inventory

Legacy Polymarket is the parity target. PredictNext surfaces are listed where they exist.

| Surface                                | Code                                                                                                                                                                | Needs                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home position rows                     | `Views/Homepage/Sections/Predictions/components/PredictPositionRow.tsx`                                                                                             | Title, outcome label, image, shares, cost basis (`initialValue`), current value, PnL percent, navigation target. The top Positions by value, not a page.     |
| Home PnL row                           | `Views/Homepage/Sections/Predictions/PredictionsSection.tsx`, `utils/getPredictHomepageUnrealizedPnlRowState.ts`                                                    | Unrealized PnL amount and percent over all open Positions                                                                                                    |
| BalanceBreakdown slice                 | `Views/Homepage/BalanceBreakdown/hooks/slices/usePredictSlice.ts` via `UI/Predict/hooks/usePredictPortfolio.ts`                                                     | Portfolio value: available Balance + open Positions value + claimable value                                                                                  |
| Legacy positions header and rows       | `UI/Predict/components/PredictPositionsViewHeader/`, `PredictPosition/`, `PredictPositionResolved/`, `PredictCryptoUpDownPositions/PredictCryptoUpDownPosition.tsx` | Available Balance, unrealized PnL amount and percent, open and resolved rows (current value, cost basis, PnL percent, won or lost), average price, Claim CTA |
| PredictNext Portfolio screen           | `PredictNext/views/PredictPortfolio/internal/PortfolioSummaryCard.tsx`, `PortfolioPositionRow.tsx`, `PortfolioActivityRow.tsx`                                      | Balance, Position rows with Cash Out, Activity rows                                                                                                          |
| Activity list rows                     | `PredictNext/activity/internal/legacy/usePredictActivityItems.ts`, `mapPredictActivity.ts`                                                                          | Shared kind, timestamp, USD amount and direction, Event title, image, stable identity                                                                        |
| Activity details                       | `PredictNext/activity/internal/legacy/details/PredictProviderActivityDetails.tsx`                                                                                   | Title, outcome, image, amount, shares, price per share, net PnL on sells, payout and PnL on Settlements                                                      |
| Rewards campaign rows                  | `UI/Rewards/components/Campaigns/PredictThePitchPositionRows.tsx`                                                                                                   | Data comes from the Rewards backend (`PredictThePitchPositionDto`). Only navigation to an Event couples to Predict.                                          |
| Venue sections, tabs, and entry points | `PredictNext/navigation/feedScreens.ts`, `PredictNext/views/PredictHome/internal/PortfolioActions.tsx`, PRED-1376 mapping table                                     | Supported actions, discovery Feeds by semantic key, search support                                                                                           |

Paths are relative to `app/components/`, except `util/`, which is relative to `app/`.

## Shapes

Names follow `types/index.ts`. PRED-1404 finalizes them. The existing brands are reused: `PredictAmount` is a non-negative decimal string, `PredictSignedAmount` is a signed decimal string, and `PredictDecimal` is a decimal string in `[0, 1]`. One new brand is added:

```ts
/** Signed decimal string in percent units: "-12.5" means -12.5%. */
type PredictSignedPercent = string & {
  readonly __brand: 'PredictSignedPercent';
};
```

### Shared catalog context

```ts
/** Catalog-derived presentation data. Present only when the entry's Market
 * exists in the canonical catalog. Never derived from tickers or labels. */
interface PredictEntryContext {
  eventId: PredictEntityId;
  eventTitle: string;
  marketQuestion: string;
  outcomeLabel: string;
  imageUrl?: PredictHttpsUrl;
}
```

| Field            | Rule                                                                                                                    | Needed by                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `eventId`        | Canonical Event ID for navigation to the Event Screen.                                                                  | Home rows `onPress`, Portfolio and Activity row navigation         |
| `eventTitle`     | Event title.                                                                                                            | Home rows, Portfolio rows, Activity `eventTitle`, Activity details |
| `marketQuestion` | Market question. Distinguishes Markets in multi-Market Events.                                                          | Portfolio rows, Activity rows and details                          |
| `outcomeLabel`   | Label of the held or traded Outcome. Required, because a catalog Market always has both Outcomes.                       | Home rows ("on Yes"), Portfolio rows, Activity details             |
| `imageUrl`       | Most specific approved image: the Market image, else the Event image. The backend chooses it. Replaces `eventImageUrl`. | Home rows, Portfolio rows, Activity `icon`                         |

When `context` is absent, mobile renders neutral fallback copy and the Outcome side. It never renders a raw Venue identifier as a title.

### Position

```ts
type PredictPositionStatus = 'open' | 'claimable' | 'settled';

interface PredictPosition {
  venueId: PredictVenueId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  status: PredictPositionStatus;
  shares: PredictAmount;
  averagePrice?: PredictDecimal;
  costBasis?: PredictAmount;
  currentValue?: PredictAmount;
  unrealizedPnl?: PredictSignedAmount;
  unrealizedPnlPercent?: PredictSignedPercent;
  context?: PredictEntryContext;
}
```

| Field                  | Unit and rule                                                                                                                                                                                                                                       | Optional when                                             | Needed by                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| `marketId`, `side`     | Position identity within the Venue. Also the Cash Out intent (`marketId` + `side`).                                                                                                                                                                 | Never                                                     | Row keys, Cash Out                                    |
| `status`               | `open`: the Market's result is not determined. `claimable`: resolved, and the Venue requires a Claim to pay out. `settled`: resolved, and no user action is needed (payout is automatic or zero). Only advances: `open` → `claimable` or `settled`. | Never                                                     | Open and resolved sections, won or lost, Claim CTA    |
| `shares`               | Decimal shares, exact, never rounded. Always greater than zero.                                                                                                                                                                                     | Never                                                     | Home rows, Portfolio rows, Cash Out                   |
| `averagePrice`         | Fee-exclusive, average-cost execution price of the held shares.                                                                                                                                                                                     | The backend's Order ledger cannot account for the holding | Crypto up/down position row, Position detail          |
| `costBasis`            | USD paid for the held shares, under the [fee](#open-decisions-for-product) and [PnL](#open-decisions-for-product) rules.                                                                                                                            | The backend's Order ledger cannot account for the holding | Home rows ("$X on Yes"), resolved rows (lost amount)  |
| `currentValue`         | USD. `open`: `shares` × best Bid of the held Outcome. Resolved: `shares` × the determined payout per share.                                                                                                                                         | No Bid, a stale Bid, or a disputed determination          | Home rows, Portfolio rows, resolved rows (won amount) |
| `unrealizedPnl`        | `currentValue` − `costBasis`.                                                                                                                                                                                                                       | `currentValue` is absent                                  | Row PnL tone                                          |
| `unrealizedPnlPercent` | `unrealizedPnl` / `costBasis` × 100.                                                                                                                                                                                                                | `currentValue` is absent, or `costBasis` is `0`           | Home rows, Portfolio rows, resolved rows              |
| `context`              | [Shared catalog context](#shared-catalog-context).                                                                                                                                                                                                  | The Market is not in the canonical catalog                | Titles, images, navigation                            |

### Portfolio Summary

```ts
interface PredictPortfolioSummary {
  venueId: PredictVenueId;
  currency: 'USD';
  availableBalance: PredictAmount;
  positionsValue: PredictAmount;
  claimableValue: PredictAmount;
  totalValue: PredictAmount;
  unrealizedPnl: PredictSignedAmount;
  unrealizedPnlPercent?: PredictSignedPercent;
  asOf: PredictTimestamp;
  complete: boolean;
}
```

| Field                  | Rule                                                                                                                                                          | Optional when              | Needed by                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------- |
| `availableBalance`     | Same value as the Balance read.                                                                                                                               | Never                      | Portfolio header                               |
| `positionsValue`       | Σ `currentValue` of `open` and `settled` Positions that have one.                                                                                             | Never                      | BalanceBreakdown (through `totalValue`)        |
| `claimableValue`       | Σ `currentValue` of `claimable` Positions. `"0"` for a Venue without Claims.                                                                                  | Never                      | Claim affordance, BalanceBreakdown             |
| `totalValue`           | `availableBalance` + `positionsValue` + `claimableValue`, summed after rounding so the identity holds exactly.                                                | Never                      | BalanceBreakdown, `usePredictPortfolioValue()` |
| `unrealizedPnl`        | Σ (`currentValue` − `costBasis`) over `open` Positions that have a `currentValue`. `"0"` when there are none.                                                 | Never                      | Home PnL row, Portfolio header                 |
| `unrealizedPnlPercent` | `unrealizedPnl` / Σ `costBasis` of the same Positions × 100.                                                                                                  | That cost-basis sum is `0` | Home PnL row, Portfolio header                 |
| `asOf`                 | Backend time at which the Summary was computed. Every input was observed within the [freshness bound](#open-decisions-for-product) before it.                 | Never                      | Stale-data handling                            |
| `complete`             | `true` only when every holding was traversed and every Position had a `currentValue`. When `false`, the sums cover only valued holdings and are lower bounds. | Never                      | Partial-value indicator                        |

The Summary is computed server-side over all holdings, never from a loaded Positions page. Mobile never adds row values to build or check it.

### Activity

Activity is the ordered, paginated projection of a Predict User's executed Trades and Settlements at one Venue. Order creation records, zero-fill Orders, Deposits, Withdraws, and rewards never appear in it.

```ts
interface PredictActivityEntryBase {
  venueId: PredictVenueId;
  id: PredictEntityId;
  marketId: PredictEntityId;
  side: PredictOutcomeSide;
  shares: PredictAmount;
  timestamp: PredictTimestamp;
  context?: PredictEntryContext;
}

/** The executed part of one Order: its Fills aggregated. */
interface PredictTradeEntry extends PredictActivityEntryBase {
  type: 'trade';
  action: 'buy' | 'sell';
  price: PredictDecimal;
  amount: PredictAmount;
  fee: PredictAmount;
  realizedPnl?: PredictSignedAmount;
}

interface PredictSettlementEntry extends PredictActivityEntryBase {
  type: 'settlement';
  result: 'yes' | 'no' | 'scalar';
  proceeds: PredictAmount;
  realizedPnl?: PredictSignedAmount;
}

type PredictActivityEntry = PredictTradeEntry | PredictSettlementEntry;
```

| Field                      | Rule                                                                                                                                                                       | Optional when                                                     | Needed by                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| `id`                       | Opaque and stable. Unique within `venueId` for the Predict User. `(venueId, id)` is the entry's identity. Mobile never parses it.                                          | Never                                                             | List keys, details lookup, shared item identity    |
| `marketId`, `side`         | The traded or settled Outcome.                                                                                                                                             | Never                                                             | Outcome fallback copy                              |
| `shares`                   | Trade: filled shares. Settlement: shares held at Settlement. Exact.                                                                                                        | Never                                                             | Details "shares bought/sold"                       |
| `timestamp`                | Trade: time of the Order's last Fill. Settlement: Venue settlement time. Never defaulted to "now".                                                                         | Never                                                             | Row date, ordering                                 |
| `action`                   | Authoritative Order Action from the backend's own Order records. Never inferred from a Venue Fill side.                                                                    | Never                                                             | Shared kind, row copy                              |
| `price`                    | Fee-exclusive VWAP of the Order's Fills.                                                                                                                                   | Never                                                             | Details "price per share"                          |
| `amount`                   | Balance movement. Buy: shares × price + fee (debit). Sell: shares × price − fee (credit). _Proposed, needs product sign-off._                                              | Never                                                             | Row amount, details amount                         |
| `fee`                      | All fees charged for the Order's Fills. `"0"` when the Venue charged none.                                                                                                 | Never                                                             | Details                                            |
| `realizedPnl` (trade)      | Sells only: `amount` − cost basis of the sold shares. Absent on buys. Kalshi always provides it on sells.                                                                  | Buys, or a sell whose cost basis the backend cannot establish     | Details "Net PnL" on sells                         |
| `result`                   | The Market's result. `scalar` means a non-binary payout per share, such as a 50/50 resolution.                                                                             | Never                                                             | Won or lost copy                                   |
| `proceeds`                 | USD credited by the Settlement. `"0"` for a losing Position.                                                                                                               | Never                                                             | Row amount, details hero                           |
| `realizedPnl` (settlement) | `proceeds` − cost basis of the settled shares. Settlement fees are already accounted for in the cost basis, so they are never subtracted twice. Kalshi always provides it. | The backend cannot establish the cost basis of the settled shares | Details PnL. Details omit the PnL row when absent. |

A Settlement is reported once per Market, for the side the Predict User **net** held: `|yes_count_fp − no_count_fp|` contracts. Those counts are lifetime acquisitions, not the quantity held at Settlement, so equal counts mean a flat Position and produce no entry. `market_result` names the winning side, which is often not the held one. Settlement entries carry no manual-Claim marker. PRED-1356 decides whether Polymarket needs one; it is not added speculatively.

### Venue catalog

The Venue catalog is the backend-supplied part of PRED-1376's internal `PredictVenueDescriptor`. The display name stays client configuration.

```ts
type PredictVenueAction = 'buy' | 'sell' | 'claim' | 'deposit' | 'withdraw';

/** Stable product key, kebab-case, for example "trending" or "nfl-games".
 * PRED-1376 owns the vocabulary and the surface-to-key mapping table. */
type PredictFeedKey = string & { readonly __brand: 'PredictFeedKey' };

interface PredictVenueCatalog {
  venueId: PredictVenueId;
  actions: readonly PredictVenueAction[];
  feeds: Readonly<Record<PredictFeedKey, PredictFeedId>>;
  searchSupported: boolean;
}
```

| Field             | Rule                                                                                                                   | Needed by                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `actions`         | The product actions the Venue supports. Unknown strings are dropped. A missing or malformed catalog enables no action. | Buy and Cash Out buttons, Claim CTA, funding affordances |
| `feeds`           | Discovery Feeds by semantic key. A section or tab renders only when its key is present. Unknown keys are ignored.      | Home slots, Trending tabs, Feed Screens                  |
| `searchSupported` | Whether `GET /search` is served for the Venue.                                                                         | Search entry points                                      |

The catalog describes support only. It is distinct from rollout flags, Venue Status, eligibility, and Account Readiness. The backend still authorizes every write independently. Feed labels are localized client copy keyed by semantic key, so the catalog sends no display strings.

PRED-1376 implements the client side:

- **Vocabulary.** `PREDICT_FEED_KEYS` in `types/index.ts`. Mobile types `PredictFeedKey` as that closed union rather than a branded string; the parser drops keys outside it, so the wire format is unchanged. Add a key there before the backend serves it.
- **Mapping table.** `capabilities/surfaceFeedKeys.ts` maps Homepage slots, Explore tabs, Rewards campaign rows, and PredictNext Home sections and Feed Screen tabs to keys.
- **Parsing.** `parsePredictVenueCatalog` (`contracts/v1/venueCatalog.ts`) drops unknown actions, Feed keys, and fields. A malformed known field, a known key without a Feed ID, or another Venue's `venueId` rejects the whole catalog.
- **Sources.** Polymarket is static client config (`config/venueCatalogs.ts`) until PRED-1356. Kalshi is read through `PredictMarketDataService:getVenueCatalog`, whose adapter method serves the static Kalshi catalog until PRED-1403 swaps in this route.
- **Failure.** `useVenueCapabilities` re-validates every catalog. A failed refresh keeps the last valid catalog. With no valid catalog, the result is `loading` or `unavailable` and enables no action, Feed, or search; there is no fallback to the bundled catalog or to another Venue. The Order flow refuses to open an action the Venue does not list.

## Invariants

- `PredictPosition.shares` > 0. Holdings are never rounded at the boundary.
- `PredictPosition.currentValue` is present only with an authoritative price: a fresh Bid, or a determined payout. A missing Bid never becomes `"0"`.
- `unrealizedPnl` and `unrealizedPnlPercent` are present only when `currentValue` is present.
- `claimable` never occurs for a Venue whose catalog lacks `claim`. Kalshi never reports it.
- A Position's `status` only advances: `open` → `claimable` or `settled`. It never returns to `open`.
- A resolved Position's payout is counted exactly once in the Summary: in `positionsValue` or `claimableValue` while the Position is reported, or in `availableBalance` once the payout is credited, never in both. A Position whose payout has been credited to the Balance is no longer returned by any Positions read and contributes to no Summary sum.
- `PredictPortfolioSummary.totalValue` = `availableBalance` + `positionsValue` + `claimableValue` exactly.
- `realizedPnl`, on sells and on Settlements, is absent only when the backend cannot establish the cost basis. It is never fabricated or defaulted to `"0"`. Kalshi always provides it.
- `complete` is `false` whenever a Position lacks `currentValue`, or the holdings traversal was bounded.
- A Trade's `action` comes from the backend's own Order records. An execution that cannot be joined to one is excluded and alerted on. It never appears without a direction.
- Activity is ordered by `timestamp` descending, then entry kind (`trade` before `settlement`), then `id` ascending. The order is total and deterministic, so a page boundary never reorders entries that share a timestamp.
- A paginated Positions pass returns every Position that is held throughout the pass at least once. It can repeat a Position but never skips one.
- Funding records never appear in Activity.
- Response `venueId` matches the requested Venue on the envelope and on every entry. Mobile rejects mismatches, as `KalshiRemoteAdapter` does today.

## REST API

All routes are Venue-qualified and return canonical data only. Account-scoped routes use the existing required-auth path. The catalog uses the same authentication as Feed reads.

### Read the Venue catalog

```http
GET /v1/venues/{venueId}/catalog
```

- `200` with `PredictVenueCatalog`. `404` for an unknown Venue.
- Not account-scoped. `Cache-Control: public, max-age=300`. Mobile stale time: 5 minutes. PRED-1376 owns the static fallback and failure behavior.

### Read the Portfolio Summary

```http
GET /v1/venues/{venueId}/portfolio/summary
```

- `200` with `PredictPortfolioSummary`.
- `503 venue_unavailable` when the Balance or the holdings traversal fails. The Summary is never served from a partial read except as flagged by `complete`.
- `Cache-Control: private, no-store`. Mobile stale time: 30 seconds.

### Read Positions

```http
GET /v1/venues/{venueId}/positions?status={status}&limit={limit}&cursor={cursor}
GET /v1/venues/{venueId}/positions?status={status}&sort=value&limit={limit}
```

- `status`: optional, comma-separated subset of `open,claimable,settled`. Default: all. Legacy surfaces read open and claimable Positions separately, and each section paginates.
- `sort`: `opened` (default) or `value`.
- `limit`: default 20, max 50.

**`sort=opened` (paginated).** This is the list read for the Portfolio screen and the legacy position sections.

- Order: `status` group (`open`, then `claimable`, then `settled`), then `openedAt` descending, then `marketId`, then `side`. The order is total.
- `openedAt` is internal to the backend and is not in the payload. It is the time of the first execution of the current holding, or, when that cannot be established, a fixed sentinel that sorts last in its status group (see the API repo's `docs/BACKLOG.md`). It is never recomputed, so prices, Fills that add to or reduce the holding, and Bid changes never move a Position in this order.
- The cursor is an opaque keyset over that order, bound to the `status` filter it was issued with. `nextCursor` is absent only when no Position follows the cursor.
- A Position held throughout a pass is returned at least once, and never skipped. Its key is stable, and its `status` only advances, which moves it later in the order, never behind the cursor. A Position can repeat after its status advances. Mobile de-duplicates by `marketId` + `side`, keeping the latest copy.
- A Position opened during a pass sorts ahead of the cursor and appears on the next refresh, as new Activity entries do. A Position closed and reopened during a pass is a new holding with a new `openedAt`. A Position whose status leaves a filtered section appears in its new section on the next refresh.

**`sort=value` (top N, unpaginated).** This is the read for Home position rows.

- Returns the `limit` Positions with the highest `currentValue` within the `status` filter, Positions without `currentValue` last, then `marketId`, then `side`.
- Computed over the same full holdings traversal as the Summary, so it is a single consistent read. It never returns `nextCursor`, and a `cursor` with `sort=value` is rejected with `400 invalid_request`. When the traversal is bounded, the Summary reports `complete: false`.

Value order is not paginated, because values move between page reads and a keyset over them can skip a Position. A snapshot cursor would allow paginated value order, but it needs a stored, expiring snapshot per pass and an expired-cursor failure path, and no surface needs more than one page in value order. Totals never depend on pages.

### Read Activity

```http
GET /v1/venues/{venueId}/activity?limit={limit}&cursor={cursor}
```

- `limit`: default 20, max 50.
- The cursor is an opaque keyset over `(timestamp, kind, id)`. Pages never duplicate or skip entries, including entries written between page reads, which sort ahead of the cursor.
- `nextCursor` is absent only when every source is exhausted below the cursor. A source that cannot be read fails the page with `503`. It never ends the list early.
- A page that can reach below the Venue's settlement archive horizon carries `settlementsCompleteFrom`: the instant from which Settlements are complete. Kalshi archives settled positions and stops serving their records, so below that horizon Trades stay complete and Settlements may not. It is absent when no page can reach the horizon.
- A cursor whose entry no longer exists stays valid, because it is a key, not a position.

### Balance

`GET /v1/venues/{venueId}/balance` is unchanged. Order flows keep using it as a cheap, independent read.

### Errors

Account-scoped and catalog routes return `{ code, message }`, as the trading routes already do. Mobile maps `code` and never parses `message`.

| Status | `code`              | Meaning                                                                                                                        |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 400    | `invalid_request`   | Malformed `limit`, `status`, `sort`, or `cursor`, a `cursor` with `sort=value`, or a `cursor` reused with a different `status` |
| 401    | `unauthorized`      | Missing or invalid bearer token                                                                                                |
| 404    | `venue_not_found`   | Unknown Venue                                                                                                                  |
| 429    | `rate_limited`      | Upstream rate limit. Retryable.                                                                                                |
| 503    | `venue_unavailable` | Upstream unavailable, or an upstream value failed mapping. Retryable.                                                          |

Balance, Positions, Activity, Summary, and catalog fail independently on the backend and in separate mobile service policies.

### Freshness and invalidation

- Mobile does not revalue Positions or the Summary from streamed quotes. REST is the only valuation source. _Proposed, needs product sign-off._
- A terminal Order Receipt invalidates the Balance, Positions, Activity, and Summary families. Funding operations add the same invalidation when they land.
- Account-scoped query keys stay as PRED-1381 defines them.

## OpenAPI diff

Against the served dev contract (`https://predict-api.dev-api.cx.metamask.io/docs-json`, `v0.0.0`), which matches the backend source at `va-mmcx-predict-api@594bba7`. The patterns for `PredictAmount`, `PredictSignedAmount`, and `PredictDecimal` are unchanged. `PredictSignedPercent` reuses the signed-amount pattern.

```diff
 paths:
+  /v1/venues/{venueId}/catalog:
+    get: # VenueCatalogResponseDto; 404 venue_not_found
+  /v1/venues/{venueId}/portfolio/summary:
+    get: # PortfolioSummaryResponseDto; 401, 404, 429, 503 with { code, message }
   /v1/venues/{venueId}/positions:
     get:
       parameters:
+        - status: string # comma-separated subset of open,claimable,settled
+        - sort: enum [opened, value] # default opened
         - limit # unchanged
         - cursor # semantics changed: keyset over (status group, openedAt desc,
                  #   marketId, side); bound to status; rejected with sort=value
+      responses.200: nextCursor never present with sort=value
   /v1/venues/{venueId}/activity:
     get: # parameters unchanged; response changed below
   /v1/venues/{venueId}/balance: # unchanged

 components.schemas:
+  VenueCatalogResponseDto:
+    required: [venueId, actions, feeds, searchSupported]
+    actions: array of enum [buy, sell, claim, deposit, withdraw]
+    feeds: object, additionalProperties: string (feed ID), keys: semantic Feed keys
+    searchSupported: boolean
+  PortfolioSummaryResponseDto:
+    required: [venueId, currency, availableBalance, positionsValue, claimableValue,
+               totalValue, unrealizedPnl, asOf, complete]
+    currency: enum [USD]
+    unrealizedPnlPercent: PredictSignedPercent # optional
+    asOf: timestamp
+    complete: boolean
   PositionsResponseDto.positions[]:
+    status: enum [open, claimable, settled] # required
+    averagePrice: PredictDecimal # optional; absent only without a ledger
+    costBasis: PredictAmount # optional; absent only without a ledger
+    currentValue: PredictAmount # optional
+    unrealizedPnl: PredictSignedAmount # optional
+    unrealizedPnlPercent: PredictSignedPercent # optional
-    marketExposure
-    realizedPnl
-    feesPaid
-    totalTraded
-    updatedAt
   ActivityResponseDto.activity[]:
-    oneOf[type=fill]: { outcomeSide, shares, price, fee?, ... }
+    oneOf[type=trade]:
+      required: [type, id, venueId, marketId, side, action, shares, price,
+                 amount, fee, timestamp]
+      action: enum [buy, sell]
+      realizedPnl: PredictSignedAmount # optional; sells only; absent only without cost basis
     oneOf[type=settlement]:
+      side, shares # now required
+      realizedPnl: PredictSignedAmount # optional; absent only without cost basis
-      costBasis
-      fee
   PredictEntryContext: # positions[].context and activity[].context
+    outcomeLabel # now required
+    imageUrl: https URL # optional
-    eventImageUrl # replaced by imageUrl
-    outcomeId
+  ErrorResponse: { code: string, message: string }
+    # now returned by balance, positions, activity, portfolio/summary, catalog
```

## Kalshi derivation

The backend's own records are the Venue Account's order ledger. A MetaMask ISV sub-account trades only through MetaMask, so every execution has an `OrderOperation`. PRED-1378 and PRED-1380 verify the Kalshi API behaviors marked _verify_.

### Position (PRED-1378)

| Field                                   | Derivation                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `marketId`, `side`, `shares`            | `GET /portfolio/positions?count_filter=position`: `ticker`, the sign of `position_fp`, and its absolute value, as today. All pages are traversed.                                                                                                                                                           |
| `status`                                | The catalog Market lifecycle: `initialized`, `active`, `inactive`, or `closed` → `open`. `determined`, `disputed`, `amended`, or `finalized` → `settled`. Never `claimable`.                                                                                                                                |
| `averagePrice`, `costBasis`             | Average cost of the held contracts, replayed from `OrderOperation` rows (`filledContracts`, `averageFillPrice`, `fee`) in execution order: buys add cost including fees, and sells remove cost pro rata. Cross-check against `market_exposure_dollars` (_verify_ whether it is fee-exclusive average cost). |
| `currentValue` (`open`)                 | `shares` × the held side's best Bid, read at request time for held tickers with one batched `GET /markets?tickers=…` (_verify_). The catalog quote may be used instead when its `quote_observed_at` is within the freshness bound. Never `market_exposure_dollars`.                                         |
| `currentValue` (resolved)               | `shares` × the payout per share: 1 for the result side, 0 for the other, or `settlement_value` for `scalar`. Absent while `disputed`.                                                                                                                                                                       |
| `unrealizedPnl`, `unrealizedPnlPercent` | Computed from the unrounded values above, then rounded.                                                                                                                                                                                                                                                     |
| `openedAt` (internal keyset)            | Execution time of the first `OrderOperation` Fill since the held contracts were last zero, from the same ledger. Persisted with the ledger.                                                                                                                                                                 |
| `sort=value`                            | Same traversal and valuation as the Summary, sorted, then cut to `limit`.                                                                                                                                                                                                                                   |
| `context`                               | `PortfolioEnrichmentService`, extended to return the Market image with an Event image fallback.                                                                                                                                                                                                             |

### Portfolio Summary (PRED-1378)

| Field                                         | Derivation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `availableBalance`                            | `GET /portfolio/balance`, as the Balance route does.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `positionsValue`, `unrealizedPnl` and percent | All Position pages valued as above. A safety bound on pages sets `complete: false` instead of failing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `claimableValue`                              | `"0"`. Kalshi settles automatically.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Payout counted once                           | Read all Position pages first, then `GET /portfolio/balance`. _Verify_ for PRED-1378 that a settled Position drops out of `GET /portfolio/positions?count_filter=position` atomically with the Balance credit. If the backend observes both, meaning a held Position whose Settlement in `GET /portfolio/settlements` has a `settled_time` at or before the Balance read, it treats the payout as credited: it drops the Position from the Positions read and from every sum, keeps the Balance, and alerts. With this read order, a credit between the two reads is seen at most twice, and the check removes the duplicate. |
| `asOf`, `complete`                            | Set by the valuation run. Kalshi's own `portfolio_value` is not used, because its marking rules are not this contract's.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### Activity (PRED-1380)

| Field                    | Derivation                                                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Trade source             | `OrderOperation` rows for the Venue Account with `filledContracts` > 0 (`filled`, `partially_filled`). Kalshi Fills (`GET /portfolio/fills`) only reconcile: a Fill whose `order_id` matches no operation is excluded and alerted on.                            |
| `id`                     | `OrderOperation.id`.                                                                                                                                                                                                                                             |
| `action`, `side`         | `OrderOperation.action` and `.side`, bound at preview and commit. Never `outcome_side` or the deprecated Fill `action` and `side`.                                                                                                                               |
| `shares`, `price`, `fee` | `filledContracts`, `averageFillPrice`, `fee`.                                                                                                                                                                                                                    |
| `amount`                 | Buy: `actualSpend`. Sell: `netProceeds`.                                                                                                                                                                                                                         |
| `realizedPnl` (sell)     | `netProceeds` − the average cost of the sold contracts from the same ledger as Positions. Always present, because the ledger covers every execution.                                                                                                             |
| `timestamp`              | Time of the Order's last Fill. Needs a new persisted execution time, because `resolvedAt` is the backend's observation time.                                                                                                                                     |
| Settlement source        | `GET /portfolio/settlements`. One entry per Market, for the net held side: `                                                                                                                                                                                     | yes_count_fp − no_count_fp | ` contracts, attributed to the side the counts favour. Both counts are lifetime acquisitions. Flat settlements are excluded. |
| Settlement `id`          | Deterministic from `ticker`, side, and `settled_time`.                                                                                                                                                                                                           |
| `result`, `proceeds`     | `market_result`. `revenue` in cents → dollars, attributed to the result side.                                                                                                                                                                                    |
| Settlement `realizedPnl` | `proceeds` − the ledger cost basis of the settled contracts. `fee_cost` is the market's **trading** fees, already inside that cost basis, and is never subtracted again. Always present. `yes_total_cost_dollars` and `no_total_cost_dollars` are a cross-check. |
| Pagination               | Merge trades (a database keyset) and Settlements (upstream, bounded by `max_ts` at the cursor timestamp, _verify_) per page. This removes the five-upstream-page bound and the "cursor aged out" early end in `kalshi-activity.service.ts`.                      |

## Polymarket feasibility (PRED-1356)

The Polymarket backend adapter supplies every field from upstream records, not from the legacy client mappers. These rows are PRED-1356 requirements, and they extend [Inputs for PRED-1356](./public-api-contract.md#inputs-for-pred-1356-polymarket-backend-adapter).

| Field                                         | Source                                                                                                                                                   | Risk                                                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Position `marketId`, `side`                   | Gamma Market and condition ID, CLOB token ID                                                                                                             | Custom outcomes have no authoritative Yes/No mapping. Identifier meanings differ across mappers.                                                                                               |
| `shares`                                      | Data API `/v2/positions` `current_size`                                                                                                                  | JSON numbers. Convert to exact decimal strings.                                                                                                                                                |
| `averagePrice`                                | `/v2/positions` `avg_price`                                                                                                                              | Confirm it is fee-exclusive.                                                                                                                                                                   |
| `costBasis`                                   | `entry_cost_usdc`, plus MetaMask fee-collection records for entry fees                                                                                   | MetaMask fees are separate transfers, not in the Data API. Needs a fee ledger keyed by Order.                                                                                                  |
| `currentValue` (`open`)                       | CLOB best Bid per token, batched                                                                                                                         | `current_price` is a Displayed Probability, not a Bid. The legacy mapper turns a missing price into `0`. Batch limits for large portfolios.                                                    |
| `status`, resolved `currentValue`             | Market resolution and payout (UMA or CTF payout) joined with `/v2/positions` status (`OPEN`, `REDEEMABLE`, `REDEEMABLE_LOST`)                            | `redeemable` flips before `current_price` pins to the payout (see `getPredictPositionStatus`). Status must come from the resolution payout, not from PnL heuristics.                           |
| Positions keyset `openedAt`                   | Earliest `TRADE` row for the token since its size was last zero, else the backend's persisted first-observed time                                        | Needs trade history or a persisted observation. Must never be recomputed from `/v2/positions` fields that change.                                                                              |
| Payout counted once                           | Redemption transactions joined with `/v2/positions`                                                                                                      | `/v2/positions` can still report a Position after its redeem credited the collateral on chain. Exclude Positions whose redemption is confirmed on chain.                                       |
| `context`                                     | Gamma Event and Market                                                                                                                                   | Markets outside the catalog sync scope have no context.                                                                                                                                        |
| Summary `availableBalance`                    | On-chain collateral of the Venue Account                                                                                                                 | Protocol V2 collateral (PRED-1342). Possibly two collateral tokens.                                                                                                                            |
| Summary totals, `complete`                    | Full `/v2/positions` cursor traversal, revalued as above                                                                                                 | The legacy traversal stops at a page cap without reporting completeness. Latency for large portfolios.                                                                                         |
| Summary `unrealizedPnl`                       | Computed from revalued Positions                                                                                                                         | Not `/v2/user-pnl`, which uses Polymarket's own marks. Figures differ from polymarket.com.                                                                                                     |
| Trade `id`, aggregation per Order             | CLOB trade records with order IDs, or Data API `TRADE` rows grouped by transaction                                                                       | Data API rows have no Order ID. The legacy `getPolymarketActivityId` composite is not an authoritative identity.                                                                               |
| Trade `action`                                | `TRADE` row `side` (`BUY`, `SELL`)                                                                                                                       | Rows with an empty `side` are mapped to Claims by the legacy mapper. They must fail closed.                                                                                                    |
| Trade `shares`, `price`, `amount`             | `size`, `price`, `usdc_size`                                                                                                                             | The legacy mapper defaults missing money to `0` and missing time to now.                                                                                                                       |
| Trade `fee`                                   | CLOB fee rate on trades, plus MetaMask fee-collection records                                                                                            | Neither is in Data API activity.                                                                                                                                                               |
| Trade `realizedPnl` (sell)                    | Average-cost ledger replayed from trades                                                                                                                 | Needs complete trade history. Absent when it is not complete. The same applies to Settlement `realizedPnl`.                                                                                    |
| Settlement                                    | `REDEEM` rows: `usdc_size` → `proceeds`, redeemed size → `shares`, resolution join → `result`. `realizedPnl` from the same average-cost ledger as sells. | Redemption history can lack a resolution result. A Settlement exists only after a manual Claim. Losing Positions are rarely redeemed, so they usually have no Settlement (see open decisions). |
| `MERGE`, `SPLIT`, `CONVERSION`, `REWARD` rows | None decided                                                                                                                                             | PRED-1356 decides each. `REWARD` is not trading Activity.                                                                                                                                      |
| Catalog                                       | Client configuration that matches legacy support (PRED-1376), moved to the backend in PRED-1356                                                          | None until PRED-1356.                                                                                                                                                                          |

## Shared Activity kinds

| Canonical entry           | Shared `ActivityKind` | `data.token`               |
| ------------------------- | --------------------- | -------------------------- |
| `trade`, `action: 'buy'`  | `predictionPlaced`    | `amount`, direction `out`  |
| `trade`, `action: 'sell'` | `predictionCashedOut` | `amount`, direction `in`   |
| `settlement`              | `predictionSettled`   | `proceeds`, direction `in` |

- Legacy Polymarket keeps `predictionClaimWinnings` until PRED-1356. Canonical types never use "claim winnings".
- `eventTitle` and `icon` come from `context` when present.
- `status` is `success`, because canonical Activity contains only executed Trades and completed Settlements.
- `hash` carries the canonical `id`, not a transaction hash.
- `predictionSettled` items also carry `outcomeLabel`, `marketQuestion`, `side`, `result`, `shares` and `realizedPnl` (when present) as plain decimal strings, so the details screen renders a Settlement without a lookup.
- Shared `ActivityItem` requires a CAIP-2 `chainId`. Kalshi has no chain, and a Polygon ID must not be fabricated. Kalshi items use the venue constant `KALSHI_VENUE_CHAIN_ID` (`kalshi:mainnet`) from `app/util/activity-adapters`, which only keys the details source. Rows hide the network badge for `prediction*` kinds, and only `eip155:` chains get a hex chain ID or a transaction fetch.
- Mobile declares `predictionSettled` locally in `app/util/activity-adapters/types.ts` (PRED-1405) and upstreams it to `@metamask/client-utils` in parallel. The local entry is deleted when a client-utils bump brings the kind in.

## Open decisions for product

Each default is _Proposed, needs product sign-off_. Implementation proceeds on the default and changes only if product decides otherwise.

| Decision                  | Proposed default                                                                                                                                                                                                                                                                           | Alternative and parity note                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fee inclusion             | `costBasis` includes entry fees. `averagePrice` excludes them. `currentValue` is gross of exit fees. Trade `amount` is the Balance movement, so it includes the fee. `realizedPnl` is net of all fees.                                                                                     | Legacy Home rows subtract an estimated exit fee from value when fee collection is on. Netting exit fees would make the value depend on fee schedules. Cash Out preview stays authoritative. |
| Rounding                  | Money is returned with at most two decimal places, rounded half up from exact intermediate values. Percentages use 2 decimals. Prices keep Venue precision (at most 4 decimals). Shares are exact. Aggregates are computed before rounding. `totalValue` is the sum of rounded components. | Row values can differ from Summary sums by a few cents. Display thresholds, such as legacy hiding PnL under $0.01, stay presentation rules.                                                 |
| Stale quotes              | A Bid used for valuation must have been observed within 60 seconds of `asOf`. Otherwise `currentValue` is absent and `complete` is `false`. Mobile does not revalue from streamed quotes.                                                                                                  | Legacy Home revalues from live prices. A longer bound means fewer upstream reads but older values.                                                                                          |
| Missing liquidity         | Mark at the best Bid regardless of depth, with no book walk. No Bid means `currentValue` is absent, never zero.                                                                                                                                                                            | Depth-walked liquidation value is more honest for large Positions but costs a book read per Position. Legacy uses a Displayed Probability, which overstates illiquid Positions.             |
| PnL definitions           | Average-cost method. Unrealized PnL = `currentValue` − `costBasis`, and the percent is relative to `costBasis`. The Summary's unrealized PnL covers `open` Positions only. Realized PnL is reported per sell and per Settlement. There is no lifetime realized-PnL total.                  | Legacy Home uses Polymarket's `/v2/user-pnl` series for the amount and Position sums for the percent. FIFO is the main alternative cost method.                                             |
| Positions list order      | The Portfolio screen and legacy sections list Positions by status, then newest first. Only Home position rows read value order, as an unpaginated top N.                                                                                                                                   | Legacy lists sort by current value throughout. Paginated value order needs snapshot cursors (see [Read Positions](#read-positions)).                                                        |
| Incomplete Summary        | Show `totalValue` with a partial indicator when `complete` is `false`. BalanceBreakdown includes it.                                                                                                                                                                                       | Hide the total. Legacy shows a silently truncated total.                                                                                                                                    |
| Losing Settlements        | Show Settlements with zero `proceeds` when the Predict User held shares.                                                                                                                                                                                                                   | Legacy Polymarket excludes lost redemptions. Kalshi losses would then never appear in Activity.                                                                                             |
| Values that may be absent | Only `currentValue`, `unrealizedPnl`, `unrealizedPnlPercent`, `realizedPnl` on sells and Settlements, and `context`, under the rules above.                                                                                                                                                | Anything else absent is a backend error, not a display state.                                                                                                                               |

## Examples

These payloads are synthetic. PRED-1404 turns them into contract fixtures. Mobile parsers must accept them, and backend tests must produce them.

### Multi-page holdings with a complete Summary

Both `open` Positions come first, newest first, then the `settled` one.

`GET /v1/venues/kalshi/positions?limit=2`

```json
{
  "venueId": "kalshi",
  "positions": [
    {
      "venueId": "kalshi",
      "marketId": "KXNFLGAME-26OCT25KCBUF-KC",
      "side": "yes",
      "status": "open",
      "shares": "40",
      "averagePrice": "0.55",
      "costBasis": "22.62",
      "currentValue": "24.40",
      "unrealizedPnl": "1.78",
      "unrealizedPnlPercent": "7.85",
      "context": {
        "eventId": "KXNFLGAME-26OCT25KCBUF",
        "eventTitle": "Kansas City at Buffalo",
        "marketQuestion": "Kansas City to win?",
        "outcomeLabel": "Yes",
        "imageUrl": "https://example.com/kc-buf.png"
      }
    },
    {
      "venueId": "kalshi",
      "marketId": "KXNCAAFGAME-25OCT25PSUOSU-PSU",
      "side": "no",
      "status": "open",
      "shares": "12",
      "averagePrice": "0.38",
      "costBasis": "4.74",
      "currentValue": "3.60",
      "unrealizedPnl": "-1.14",
      "unrealizedPnlPercent": "-24.05",
      "context": {
        "eventId": "KXNCAAFGAME-25OCT25PSUOSU",
        "eventTitle": "Penn State at Ohio State",
        "marketQuestion": "Penn State to win?",
        "outcomeLabel": "No"
      }
    }
  ],
  "nextCursor": "opaque-positions-cursor"
}
```

`GET /v1/venues/kalshi/positions?limit=2&cursor=opaque-positions-cursor`

```json
{
  "venueId": "kalshi",
  "positions": [
    {
      "venueId": "kalshi",
      "marketId": "KXNFLGAME-19OCT25LVKC-KC",
      "side": "yes",
      "status": "settled",
      "shares": "5",
      "averagePrice": "0.62",
      "costBasis": "3.22",
      "currentValue": "5.00",
      "unrealizedPnl": "1.78",
      "unrealizedPnlPercent": "55.28",
      "context": {
        "eventId": "KXNFLGAME-19OCT25LVKC",
        "eventTitle": "Las Vegas at Kansas City",
        "marketQuestion": "Kansas City to win?",
        "outcomeLabel": "Yes"
      }
    }
  ]
}
```

Home reads the top open Positions by value in one unpaginated read. The response has no `nextCursor`.

`GET /v1/venues/kalshi/positions?status=open&sort=value&limit=3`

```json
{
  "venueId": "kalshi",
  "positions": [
    {
      "venueId": "kalshi",
      "marketId": "KXNFLGAME-26OCT25KCBUF-KC",
      "side": "yes",
      "status": "open",
      "shares": "40",
      "averagePrice": "0.55",
      "costBasis": "22.62",
      "currentValue": "24.40",
      "unrealizedPnl": "1.78",
      "unrealizedPnlPercent": "7.85",
      "context": {
        "eventId": "KXNFLGAME-26OCT25KCBUF",
        "eventTitle": "Kansas City at Buffalo",
        "marketQuestion": "Kansas City to win?",
        "outcomeLabel": "Yes",
        "imageUrl": "https://example.com/kc-buf.png"
      }
    },
    {
      "venueId": "kalshi",
      "marketId": "KXNCAAFGAME-25OCT25PSUOSU-PSU",
      "side": "no",
      "status": "open",
      "shares": "12",
      "averagePrice": "0.38",
      "costBasis": "4.74",
      "currentValue": "3.60",
      "unrealizedPnl": "-1.14",
      "unrealizedPnlPercent": "-24.05",
      "context": {
        "eventId": "KXNCAAFGAME-25OCT25PSUOSU",
        "eventTitle": "Penn State at Ohio State",
        "marketQuestion": "Penn State to win?",
        "outcomeLabel": "No"
      }
    }
  ]
}
```

`GET /v1/venues/kalshi/portfolio/summary` covers all three Positions. `unrealizedPnl` covers the two `open` Positions, from unrounded values (1.776 − 1.14). `positionsValue` includes the `settled` Position awaiting automatic payout. Its payout is not yet in `availableBalance`, so it is counted once.

```json
{
  "venueId": "kalshi",
  "currency": "USD",
  "availableBalance": "120.50",
  "positionsValue": "33.00",
  "claimableValue": "0",
  "totalValue": "153.50",
  "unrealizedPnl": "0.64",
  "unrealizedPnlPercent": "2.32",
  "asOf": "2026-10-23T12:00:05.120Z",
  "complete": true
}
```

### Missing quote

The second Position's Market has no Bid. Its value and PnL are absent, and the Summary is flagged.

```json
{
  "venueId": "kalshi",
  "positions": [
    {
      "venueId": "kalshi",
      "marketId": "KXNFLGAME-26OCT25KCBUF-KC",
      "side": "yes",
      "status": "open",
      "shares": "40",
      "averagePrice": "0.55",
      "costBasis": "22.62",
      "currentValue": "24.40",
      "unrealizedPnl": "1.78",
      "unrealizedPnlPercent": "7.85"
    },
    {
      "venueId": "kalshi",
      "marketId": "KXNCAAFGAME-25OCT25ORPUR-PUR",
      "side": "yes",
      "status": "open",
      "shares": "10",
      "averagePrice": "0.21",
      "costBasis": "2.17"
    }
  ]
}
```

```json
{
  "venueId": "kalshi",
  "currency": "USD",
  "availableBalance": "50.00",
  "positionsValue": "24.40",
  "claimableValue": "0",
  "totalValue": "74.40",
  "unrealizedPnl": "1.78",
  "unrealizedPnlPercent": "7.85",
  "asOf": "2026-10-23T12:00:05.120Z",
  "complete": false
}
```

### Sell trade, buy trade, and a metadata-poor Settlement

The Predict User bought 50 contracts at 0.55 with a 0.78 fee, so the cost basis is 28.28 and the average cost is 0.5656 per contract. They then sold 10 at 0.61 with a 0.17 fee. The Settlement's Market is not in the catalog, so it has no `context`, but its financial fields are complete.

```json
{
  "venueId": "kalshi",
  "activity": [
    {
      "type": "trade",
      "venueId": "kalshi",
      "id": "0199f6a0-8c1e-7b3a-9d2e-4f1a2b3c4d5e",
      "marketId": "KXNFLGAME-26OCT25KCBUF-KC",
      "side": "yes",
      "action": "sell",
      "shares": "10",
      "price": "0.61",
      "amount": "5.93",
      "fee": "0.17",
      "realizedPnl": "0.27",
      "timestamp": "2026-10-22T18:04:11.532Z",
      "context": {
        "eventId": "KXNFLGAME-26OCT25KCBUF",
        "eventTitle": "Kansas City at Buffalo",
        "marketQuestion": "Kansas City to win?",
        "outcomeLabel": "Yes",
        "imageUrl": "https://example.com/kc-buf.png"
      }
    },
    {
      "type": "settlement",
      "venueId": "kalshi",
      "id": "settlement-utah-byu-no-20261019",
      "marketId": "KXNCAAFGAME-18OCT25UTAHBYU-UTAH",
      "side": "no",
      "shares": "8",
      "result": "yes",
      "proceeds": "0",
      "realizedPnl": "-3.36",
      "timestamp": "2026-10-19T04:12:00.000Z"
    },
    {
      "type": "trade",
      "venueId": "kalshi",
      "id": "0199e2b4-1f0d-7c55-8a10-6b7c8d9e0f1a",
      "marketId": "KXNFLGAME-26OCT25KCBUF-KC",
      "side": "yes",
      "action": "buy",
      "shares": "50",
      "price": "0.55",
      "amount": "28.28",
      "fee": "0.78",
      "timestamp": "2026-10-18T16:30:02.118Z",
      "context": {
        "eventId": "KXNFLGAME-26OCT25KCBUF",
        "eventTitle": "Kansas City at Buffalo",
        "marketQuestion": "Kansas City to win?",
        "outcomeLabel": "Yes",
        "imageUrl": "https://example.com/kc-buf.png"
      }
    }
  ],
  "nextCursor": "opaque-activity-cursor"
}
```

### Venue catalog

The Kalshi V1 catalog PRED-1376 ships as static client config. `sports` is the Venue's general sports discovery Feed, which for V1 is NFL Games.

```json
{
  "venueId": "kalshi",
  "actions": ["buy", "sell"],
  "feeds": {
    "sports": "sports-football-nfl-games",
    "nfl-games": "sports-football-nfl-games",
    "nfl-props": "sports-football-nfl-win-totals",
    "college-football-games": "sports-football-ncaa-games",
    "college-football-props": "sports-football-ncaa-win-totals"
  },
  "searchSupported": true
}
```

## Deliberately excluded

| Field or concept                                                                 | Reason                                                                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `marketExposure`, Position `realizedPnl`, `feesPaid`, `totalTraded`, `updatedAt` | Kalshi-native. No surface needs them once valuation fields exist. `marketExposure` is not a current value. |
| Directionless `fill` entries and `outcomeSide`                                   | Replaced by `trade` with an authoritative `action`.                                                        |
| Settlement `costBasis` and `fee`                                                 | Folded into `realizedPnl`.                                                                                 |
| `context.outcomeId`                                                              | No surface uses it. Cash Out uses `marketId` + `side`.                                                     |
| Position end date                                                                | Legacy resolved rows show it. The Event read supplies `closesAt` if Portfolio parity needs it.             |
| Open and claimable counts                                                        | Only legacy Claim analytics use them. Claims are out of scope until PRED-1356.                             |
| Claim totals across a Market (`totalNetPnlUsd`)                                  | Polymarket batch-Claim detail. Revisit with the manual-Claim marker in PRED-1356.                          |
| Venue web links (`slug`, "View on Polymarket")                                   | Venue-specific. Not part of this contract.                                                                 |
| Positions page `asOf`                                                            | No surface needs it. The Summary carries freshness.                                                        |
| Catalog display name and Feed labels                                             | Localized client copy, keyed by `venueId` and Feed key.                                                    |
| Funding history                                                                  | Funding records stay outside trading Activity.                                                             |

## Delivery

| Ticket    | Scope                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| PRED-1403 | Catalog route.                                                                                                            |
| PRED-1378 | Position valuation fields, the Summary route, and the shared average-cost ledger.                                         |
| PRED-1380 | Trade and Settlement entries and honest pagination.                                                                       |
| PRED-1405 | Shared Settlement kind and the `chainId` question.                                                                        |
| PRED-1404 | Mobile types, parsers, fixtures (from the examples above), services, queries, the Summary hook, and the Portfolio screen. |
| PRED-1356 | The Polymarket backend adapter against the feasibility table, and the manual-Claim marker decision.                       |
