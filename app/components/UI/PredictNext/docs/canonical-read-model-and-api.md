# Predict canonical read model and REST API

- **Status:** Agreed working direction for team review; not yet implemented
- **Scope:** Public, read-only Predict navigation and Event detail
- **Venues:** Kalshi first, with a future Polymarket backend mapping

## Recommendation

Use one small canonical hierarchy everywhere:

```text
Feed
  └── Event *
       ├── Category 0..1
       ├── Series 0..1
       └── Market 1..*
            └── Outcome exactly 2 (Yes and No sides)
```

Feed and detail responses use the same complete `PredictEvent` model. Do not introduce separate summary/detail types until payload size or presentation requirements prove the need.

A canonical Event maps to exactly one Venue Event. A Feed may combine Events discovered through several Venue Series or metadata queries, but the backend must never merge Markets from multiple Venue Events into one canonical Event.

## Ubiquitous language

- **Feed** — a product-owned, ordered, paginated selection of Events for a navigation surface. A Feed can represent a Category, curated collection, or supported filter combination.
- **Event** — one Venue Event containing one or more related Markets.
- **Market** — one binary prediction question within an Event.
- **Outcome** — the Yes or No side of a Market. Labels may be customized.
- **Category** — the Event's optional primary MetaMask product classification, such as Sports, Crypto, or Politics.
- **Series** — an optional Venue-backed grouping of related Events.
- **Collection Series** — a Series whose Events can be independently current or browsable, such as NFL Games.
- **Rolling Series** — a Series for which the product follows one backend-selected current Event at a time, such as a five-minute BTC up-or-down Series.

`Trump` is not a second Category alongside `Politics`; it is a future Topic concept. Topic arrays are deferred until a product slice needs them.

## Canonical TypeScript sketch

Names are illustrative. Runtime schemas remain the executable trust boundary when this contract is implemented.

```ts
type PredictVenueId = string & { readonly __brand: 'PredictVenueId' };
type PredictEntityId = string & { readonly __brand: 'PredictEntityId' };
type PredictFeedId = string & { readonly __brand: 'PredictFeedId' };
type PredictTimestamp = string & { readonly __brand: 'PredictTimestamp' };

// Non-negative settlement-currency decimal string, for example "1250.45".
type PredictAmount = string & { readonly __brand: 'PredictAmount' };

// Decimal string in the inclusive range [0, 1], for example "0.42".
type PredictPrice = string & { readonly __brand: 'PredictPrice' };

type PredictHttpsUrl = string & { readonly __brand: 'PredictHttpsUrl' };

interface PredictCategory {
  id: PredictEntityId;
  label: string;
}

type PredictSeriesMode = 'collection' | 'rolling';

interface PredictSeries {
  id: PredictEntityId;
  title: string;
  mode: PredictSeriesMode;

  // ISO 8601 duration, for example PT5M or P1D. Informational when present.
  recurrence?: string;
}

type PredictMarketStatus =
  | 'initialized'
  | 'active'
  | 'inactive'
  | 'closed'
  | 'determined'
  | 'disputed'
  | 'amended'
  | 'finalized';

interface PredictOutcome {
  id: PredictEntityId;
  side: 'yes' | 'no';
  label: string;
  askPrice?: PredictPrice;
  bidPrice?: PredictPrice;
}

interface PredictMarket {
  id: PredictEntityId;
  question: string;
  status: PredictMarketStatus;
  outcomes: readonly [PredictOutcome, PredictOutcome];

  volume?: PredictAmount;
  volume24h?: PredictAmount;
  imageUrl?: PredictHttpsUrl;

  createdAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;
  opensAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  expectedResolutionAt?: PredictTimestamp;
  latestResolutionAt?: PredictTimestamp;
  finalizedAt?: PredictTimestamp;
}

interface PredictEvent {
  venueId: PredictVenueId;
  id: PredictEntityId;
  title: string;
  subtitle?: string;
  description?: string;

  category?: PredictCategory;
  series?: PredictSeries;

  volume?: PredictAmount;
  volume24h?: PredictAmount;
  imageUrl?: PredictHttpsUrl;

  startsAt?: PredictTimestamp;
  closesAt?: PredictTimestamp;
  updatedAt?: PredictTimestamp;

  markets: readonly PredictMarket[];
}

interface PredictFeed {
  venueId: PredictVenueId;
  id: PredictFeedId;
  title: string;
  events: readonly PredictEvent[];
  nextCursor?: string;
}
```

### Field semantics

- `volume` is total settlement currency traded for that Event or Market across all users.
- `volume24h` is settlement currency traded during the trailing 24-hour window at the backend observation time.
- Event and Market Volume are independent backend projections. Mobile must not sum Market Volume to invent Event Volume.
- Amounts and prices are decimal strings. Mobile must not use binary floating-point arithmetic for financial calculations.
- `imageUrl` is an optional backend-approved absolute HTTPS URL. Mobile must not derive media from titles, tickers, or slugs.
- Nested Category, Series, Market, and Outcome IDs inherit Venue scope from the containing Event.
- `recurrence` describes a regular cadence but is not authoritative current-Event selection logic.

## Series and rolling Events

An Event has zero or one Series. This deliberately normalizes Polymarket's array-shaped Series metadata to the one Series the product can use.

Backend mapping rules:

- Kalshi's explicit `series_ticker` maps naturally to the canonical Series.
- When Polymarket supplies several Series, the backend chooses at most one using deterministic product-owned rules; it must not select the first array element accidentally.
- If no Series has useful product meaning, the backend omits `series`.
- The backend never fabricates a singleton Series merely to make the hierarchy uniform.

A `rolling` Series tells mobile that the visible Event can rotate. The Feed still contains an ordinary Event; there is no `CurrentEvent` type and no mutable Event identity.

```text
12:02 feed snapshot                  12:06 feed snapshot

Series: btc-up-down-5m               Series: btc-up-down-5m
Event:  btc-1200-1205       ->       Event:  btc-1205-1210
```

For a rolling card or detail screen:

1. Render the Event returned by the Feed or current-Series endpoint.
2. Revalidate at or shortly after the Event's `closesAt`.
3. Revalidate when the app returns to the foreground after `closesAt`.
4. Ask the backend for the Series' current Event; mobile never lists all Series Events and chooses one itself.
5. Replace the rendered Event atomically only when the backend returns a different Event ID.
6. Keep the old Event cached under its immutable Event ID.
7. If the next Event is temporarily unavailable, retain the ended Event, show its ended state when designed, and retry safely.

A `collection` Series does not imply one current Event. NFL Games, for example, may contain many simultaneous or upcoming Events.

## Market lifecycle

Use Kalshi's precise lifecycle vocabulary as the canonical Market lifecycle:

| Status        | Canonical meaning                                     |
| ------------- | ----------------------------------------------------- |
| `initialized` | Created but not yet open for trading.                 |
| `active`      | Open for trading.                                     |
| `inactive`    | Temporarily paused by the Venue but not closed.       |
| `closed`      | Trading ended; determination is pending.              |
| `determined`  | Result is known; finalization is pending.             |
| `disputed`    | The determination has been challenged.                |
| `amended`     | The determination changed after a dispute.            |
| `finalized`   | Venue settlement is complete and the result is final. |

Polymarket lifecycle fields are mapped conservatively. The backend must not invent `disputed` or `amended` without authoritative Venue evidence. Whether a Predict User must perform a Claim is account/portfolio state, not Market lifecycle.

Do not add a generic Event lifecycle by deriving it from child Markets. Sports Game state, Event display timing, and Market trading lifecycle are separate concepts.

## REST API

All public reads are Venue-qualified and return canonical Predict data rather than Venue DTOs.

### Read a Feed

```http
GET /v1/venues/{venueId}/feeds/{feedId}?limit={limit}&cursor={cursor}
```

Response: `PredictFeed`

Examples:

```http
# Home previews
GET /v1/venues/kalshi/feeds/nfl-games?limit=2
GET /v1/venues/kalshi/feeds/college-football-games?limit=2

# Paginated MVP feeds
GET /v1/venues/kalshi/feeds/nfl-games?limit=20&cursor=opaque
GET /v1/venues/kalshi/feeds/nfl-props?limit=20&cursor=opaque

# Future broader feeds and canonical filters
GET /v1/venues/kalshi/feeds/sports?limit=20
GET /v1/venues/kalshi/feeds/sports?timing=live&limit=20
GET /v1/venues/kalshi/feeds/sports?sport=american-football&competition=nfl&content=games&limit=20
GET /v1/venues/kalshi/feeds/sports?sport=american-football&competition=nfl&content=props&limit=20
GET /v1/venues/kalshi/feeds/crypto?limit=20
```

Filter IDs are stable MetaMask product IDs. The backend maps them to current Venue Series, tags, catalogs, and metadata. Supported filter discovery is deferred until the UI requires a dynamic filter catalog; the backend rejects unsupported combinations rather than silently ignoring them.

The backend owns Feed membership, ordering, and opaque cursor semantics. For the first Games feeds, live/current Games precede future Games and future Games are ordered by scheduled time.

### Read one immutable Event

```http
GET /v1/venues/{venueId}/events/{eventId}
```

Response: `PredictEvent`

This route always returns the requested Event. It must never rotate to a newer Event in the same Series. Use it for ordinary cards, deep links, history, Positions, and fixed Event detail.

### Read the current Event in a rolling Series

```http
GET /v1/venues/{venueId}/series/{seriesId}/events/current
```

Responses:

- `200` with `PredictEvent` when the backend has selected a current Event;
- `204` when the Series exists but has no currently selectable Event;
- `404` when the Series does not exist for that Venue.

A card backed by a `rolling` Series opens detail in follow-Series mode and refreshes through this endpoint. A fixed Event link still uses the immutable Event endpoint.

### Read Venue status

The existing Venue-qualified status route remains:

```http
GET /v1/venues/{venueId}/status
```

## Backend normalization responsibilities

The MetaMask Predict backend must:

- map every canonical Event to exactly one Venue Event;
- never merge Markets from multiple Venue Events into one Event;
- build product-owned Feeds from one or more Venue discovery queries;
- assign at most one primary MetaMask Category to an Event;
- select at most one useful Series and classify it as `collection` or `rolling`;
- select the current Event for rolling Series;
- map Market lifecycle to the canonical eight-state vocabulary conservatively;
- normalize prices and Volume as validated decimal strings;
- provide Event and Market image URLs only from approved HTTPS sources;
- preserve Venue-qualified opaque identity without parsing tickers or slugs;
- own Feed ordering and stable opaque pagination across merged upstream calls;
- omit unavailable optional fields rather than inventing values;
- prevent raw Venue DTOs, credentials, PII, and protocol errors from reaching mobile.

### Kalshi

- Discover Events through explicit Series, sport catalog, category, tag, and product metadata relationships.
- Use `series_ticker`, `event_ticker`, and Market ticker fields explicitly; do not parse ticker structure.
- Map Kalshi Market statuses directly to the canonical lifecycle.
- Treat NFL Games-like Series as `collection` and interval contracts such as five-minute up/down as `rolling` when product configuration establishes that behavior.

### Polymarket

- Map one Gamma Event to one canonical Event.
- Select zero or one primary Series deterministically from Polymarket's optional Series array.
- Keep Gamma Event ID, Market ID, condition ID, and Outcome token IDs distinct internally.
- Map categories/tags to one primary MetaMask Category; do not expose an arbitrary array as peer Categories.
- Derive lifecycle only from authoritative Gamma/CLOB state.

## Relationship and behavior examples

### NFL Game

```text
Feed: nfl-games
  Event: Chiefs vs Bills
    Category: Sports
    Series: NFL Games (collection)
    Markets: winner, spread, total
```

The same Venue Event may later appear in a Props Feed when its own Markets support that treatment. Feed-specific featured-Market presentation is deferred until a concrete UI requires it.

### Standalone player prop

```text
Feed: nfl-props
  Event: Will Mahomes throw 3+ touchdowns this week?
    Category: Sports
    Series: optional
    Market: one binary question
```

No synthetic Game Event is created.

### Five-minute BTC up/down

```text
Feed: crypto
  Event: BTC Up or Down — 12:00–12:05
    Category: Crypto
    Series: BTC Up or Down 5m (rolling, PT5M)
```

After close, mobile reads `/series/{seriesId}/events/current`; the backend may return the 12:05–12:10 Event. The old Event ID remains immutable.

### Politics Event

```text
Event: Will Trump win the election?
  Category: Politics
```

`Trump` is not represented as another Category. Add Topics only when topic navigation becomes a real product requirement.

## Change from the walking-skeleton v1 contract

The implemented walking-skeleton contract currently returns paginated `PredictEvent` values directly and uses a reduced Market status enum. The next contract slice will need to:

1. add `PredictFeed`, `PredictCategory`, and `PredictSeries`;
2. add optional Event and Market `volume`, `volume24h`, and `imageUrl`;
3. replace the reduced Market status enum with the canonical Kalshi lifecycle;
4. replace Event-list reads with Feed reads where product Feed semantics are required;
5. add the rolling-Series current-Event read;
6. update runtime validation, adapter transport, query keys, service actions, fixtures, and tests together.

Until that implementation lands, code and tests remain the executable contract.

## Intentionally deferred

- Category arrays and Topic/tag models;
- public Series browsing or Series catalogs;
- dynamic Feed-filter discovery;
- separate Event summary/detail DTOs;
- Feed-item or Current-Event wrapper resources;
- cross-Venue-Event composition;
- multi-Venue aggregated Feeds;
- Feed-specific featured Market projections;
- non-binary canonical Markets;
- continuous live updates and WebSockets;
- charts, history, rules, Game/Team live state, and account-scoped data.
