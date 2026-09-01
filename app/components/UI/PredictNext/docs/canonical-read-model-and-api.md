# Predict canonical read model and REST API

- **Status:** Agreed working direction; implemented slices remain executable truth
- **Scope:** Public, read-only Predict navigation and Event Screens
- **Venues:** Kalshi first, with a future Polymarket backend mapping

## Recommendation

Use one small canonical hierarchy everywhere:

```text
Feed
  └── Event *
       ├── Category 0..1
       ├── Series 0..1
       ├── Sports Context 0..1
       │    └── Game 0..1
       └── Market 1..*
            ├── Group 0..1
            └── Outcome exactly 2 (Yes and No sides)
```

Feed and detail responses use the same complete `PredictEvent` model. Do not introduce separate summary/detail types until payload size or presentation requirements prove the need.

A canonical Feed Event normally maps to one Venue Event. A Game detail read may
compose Markets from authoritative sibling Venue Events while retaining the
requested Game Event as the parent. Mobile receives one canonical Event and
never performs this join.

## Ubiquitous language

- **Feed** — a product-owned, ordered, paginated selection of Events for a navigation surface. A Feed can represent a Category, curated collection, or supported filter combination.
- **Event** — one canonical Event with one parent Venue Event and one or more
  related Markets. A Game detail read can append validated Markets from
  authoritative sibling Venue Events without changing that parent identity.
- **Market** — one binary prediction question within an Event.
- **Market Group** — optional metadata on each Market that tells the Event
  Screen how related Markets can be presented together.
- **Outcome** — the Yes or No side of a Market. Labels may be customized.
- **Category** — the Event's optional primary MetaMask product classification, such as Sports, Crypto, or Politics.
- **Series** — an optional Venue-backed grouping of related Events.
- **Collection Series** — a Series whose Events can be independently current or browsable, such as NFL Games.
- **Rolling Series** — a Series for which the product follows one backend-selected current Event at a time, such as a five-minute BTC up-or-down Series.
- **Sport** — a stable product classification for one kind of athletic competition, such as American football.
- **Competition** — a league or tournament within a Sport, such as the NFL or college football.
- **Game** — an optional snapshot of the sports contest associated with an Event. Game status is independent of Market lifecycle.
- **Team** — the home or away participant in a Game.
- **Game Selection** — an Outcome's optional authoritative association with the home Team, away Team, or draw.

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
type PredictHexColor = string & { readonly __brand: 'PredictHexColor' };

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

interface PredictSport {
  // Stable MetaMask product ID, for example "american-football".
  id: PredictEntityId;
  label: string;
}

interface PredictCompetition {
  // Stable MetaMask product ID, for example "nfl" or "college-football".
  id: PredictEntityId;
  label: string;
}

interface PredictTeam {
  name: string;
  abbreviation?: string;
  logoUrl?: PredictHttpsUrl;
  primaryColor?: PredictHexColor;
}

type PredictGameStatus =
  | 'scheduled'
  | 'in_progress'
  | 'delayed'
  | 'suspended'
  | 'postponed'
  | 'completed'
  | 'canceled';

interface PredictGame {
  status: PredictGameStatus;
  homeTeam: PredictTeam;
  awayTeam: PredictTeam;
  score?: {
    home: string;
    away: string;
  };
  period?: string;
  clock?: string;
  observedAt: PredictTimestamp;
}

interface PredictSportsContext {
  sport: PredictSport;
  competition?: PredictCompetition;
  game?: PredictGame;
}

interface PredictSettlementSource {
  name: string;
  url: PredictHttpsUrl;
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

  // Present only when this Outcome authoritatively represents a Game selection.
  gameSelection?: 'home' | 'away' | 'draw';
}

type PredictMarketType = 'spread' | 'total' | (string & {});
type PredictMarketGroupType = 'marketSelector' | (string & {});

interface PredictMarketOption {
  type: 'number';
  value: number;
}

interface PredictMarketGroup {
  // Stable within the containing Event. Markets with the same key are one
  // presentation group. Mobile never derives this value.
  key: string;
  groupType: PredictMarketGroupType;
  marketType?: PredictMarketType;
  option?: PredictMarketOption;
  displayOrder?: number;
}

interface PredictMarket {
  id: PredictEntityId;
  question: string;
  rules?: string;
  status: PredictMarketStatus;
  outcomes: readonly [PredictOutcome, PredictOutcome];
  group?: PredictMarketGroup;

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
  rules?: string;
  description?: string;

  category?: PredictCategory;
  series?: PredictSeries;
  sports?: PredictSportsContext;
  settlementSources?: readonly PredictSettlementSource[];

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
- `rules` contains authoritative resolution criteria. Event rules apply to the Event, while Market rules refine one Market. Rules are not generated from descriptive copy.
- If Event and Market rules are identical, the UI presents the content once. Missing rules are omitted.
- `settlementSources` contains optional approved sources for outcome verification. Each source has a non-empty name and an absolute HTTPS URL.
- Amounts and prices are decimal strings. Mobile must not use binary floating-point arithmetic for financial calculations.
- `imageUrl` and `logoUrl` are optional backend-approved absolute HTTPS URLs. Mobile must not derive media from titles, tickers, or slugs.
- `primaryColor` is a backend-approved six-digit hexadecimal RGB color such as `#E31837`; it is decorative and must not be the only way UI communicates meaning.
- Nested Category, Series, Market, and Outcome IDs inherit Venue scope from the containing Event.
- `recurrence` describes a regular cadence but is not authoritative current-Event selection logic.
- For a Game Event, `Event.startsAt` is the scheduled Game start; the Game does not duplicate that timestamp.
- A composed Game detail keeps the requested Game Event's identity, title,
  Sports/Game metadata, and `startsAt`. It may append only validated Markets
  from authoritative sibling Venue Events.
- A composed Event's `closesAt` and `updatedAt` describe the complete returned
  Market set. Its `volume` and `volume24h` are present only when every returned
  Market has the corresponding volume; otherwise that aggregate is omitted.
- `Game.score`, `period`, and `clock` are display-safe strings because their formats vary by Sport. Mobile must not parse them to recover Venue semantics.
- `Game.observedAt` records when the backend observed the Game snapshot so mobile can identify stale REST data.
- `Outcome.gameSelection` is authoritative when present. Mobile must not infer a Team or draw association from an Outcome label, Market question, title, ticker, or array order.
- A `no` Outcome opposite a Team's `yes` Outcome does not automatically represent the other Team; draws and Venue resolution rules can make that inference false.
- `Market.group` is optional. The backend owns its key, group type, market type,
  option value, and display order. Mobile does not parse Market questions,
  titles, labels, slugs, tickers, or strike text to create this metadata.
- `group.groupType` selects the presentation behavior. The current supported
  value is `marketSelector`; unknown values remain standard Markets until a
  supported composition exists.
- `group.key` identifies one presentation group within the Event. Markets with
  the same key may share one selector; different keys must remain separate.
- A `marketSelector` group has a `marketType` and a numeric `option`. For a
  total, the option is the point threshold. For a spread, it is the canonical
  signed handicap for the `yes` Outcome's target. The `no` Outcome displays the
  opposite handicap. The option type is explicit so another representation can
  be added later without changing `groupType`.
- `displayOrder` orders alternate Markets inside one group. It does not order
  groups or Events. When it is absent, response order is authoritative. A
  single Market renders without a selector. Multiple Markets select the first
  Market after ordering, without an `isDefault` flag.
- A spread selector may show the absolute option value without a sign. This is
  presentation of the backend option only. It does not change the canonical
  signed value or define a second ordering rule.
- A missing or unsupported group falls back to the standard Market
  presentation. Malformed known group fields fail runtime validation.
- Winner UI uses unique ungrouped `gameSelection` quotes. Markets that carry
  `group` are not winner Markets.

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

For a rolling card or Event Screen:

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

## Sports and Game metadata

Sports metadata is an optional Event projection rather than another resource hierarchy. This allows Game Events, Game-specific props, season props, and futures to share one Event model:

| Event                              | Sports context                                    |
| ---------------------------------- | ------------------------------------------------- |
| Chiefs vs Bills                    | American football, NFL, and Game snapshot         |
| Mahomes touchdowns against Buffalo | American football, NFL, and the same Game context |
| Mahomes season passing yards       | American football and NFL; no Game                |
| Super Bowl winner                  | American football and NFL; no Game                |

A Game snapshot is initially limited to one home Team and one away Team. Sports with more than two competitors require a later contract change driven by a concrete product slice.

Game status and Market lifecycle are independent:

```text
Game:   scheduled -> in_progress -> completed
Market: initialized -> active -> closed -> determined -> finalized
```

For example, a Game can be `scheduled` while its Markets are already `active`, or `completed` while a Market remains `determined` pending finalization. Mobile never derives one lifecycle from the other.

The backend maps authoritative Venue status into this small Game vocabulary. Overtime, shootout, forfeit, or other display detail can remain in `period` while `status` is `completed`. Unsupported or ambiguous Venue values fail closed rather than being guessed.

`gameSelection` lets Game cards associate a displayed Outcome with `home`, `away`, or `draw` without replacing the canonical `yes | no` side used for trading. It is optional for totals, spreads, player props, and any Outcome without an authoritative Game-side association.

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

The backend owns Feed membership, ordering, and opaque cursor semantics. For the first Games feeds, in-progress Games precede future Games and future Games are ordered by scheduled time.

### Read one immutable Event

```http
GET /v1/venues/{venueId}/events/{eventId}
```

Response: `PredictEvent`

This route always returns the requested Event. It must never rotate to a newer
Event in the same Series. For a football Game Event, the backend may append
Markets from its related Total and Spread Events. The response still keeps the
requested Game Event as its identity and parent metadata. Use this route for
ordinary cards, deep links, history, Positions, and immutable Event Screens.

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

### Read Market history

```http
GET /v1/venues/{venueId}/markets/{marketId}/history?range={range}
```

Supported ranges are `LIVE`, `1D`, `1W`, `1M`, `1Y`, and `ALL`. The response is Market-qualified and contains `venueId`, `marketId`, `range`, `observedAt`, and ordered `{ timestamp, yesPrice, noPrice }` points. `yesPrice` is the last traded Yes probability for the period, falling back to the previous trade when a period has no trade. For a binary Market, `noPrice` is the exact complementary representation of the same trade (`1 - yesPrice`), derived by the backend with fixed-point arithmetic. `LIVE` remains an authoritative REST snapshot through `observedAt`; continuous updates and client-generated points are not part of this route.

### Refresh Game snapshots

No Game-specific endpoint is required initially. Feed and immutable Event reads return the complete embedded Game snapshot. REST clients refresh the existing Feed or Event query according to the product's snapshot policy; a later live-data slice may patch the same canonical Game shape while REST remains the recovery path.

## Backend normalization responsibilities

The MetaMask Predict backend must:

- map every Feed Event to one Venue Event;
- compose related Markets only when a product-owned detail read requires it;
- build product-owned Feeds from one or more Venue discovery queries;
- assign at most one primary MetaMask Category to an Event;
- select at most one useful Series and classify it as `collection` or `rolling`;
- select the current Event for rolling Series;
- normalize optional Sport, Competition, Game, Team, Game status, score, period, clock, and Game Selection data only from authoritative sources;
- map Market lifecycle to the canonical eight-state vocabulary conservatively;
- normalize prices and Volume as validated decimal strings;
- provide Event and Market image URLs only from approved HTTPS sources;
- preserve Venue-qualified opaque identity without parsing tickers or slugs;
- own Feed ordering and stable opaque pagination across merged upstream calls;
- omit unavailable optional fields rather than inventing values;
- prevent raw Venue DTOs, credentials, PII, and protocol errors from reaching mobile.

### Kalshi

- Discover Events through explicit Series, sport catalog, category, tag, and product metadata relationships.
- Join Event metadata and authoritative milestone/live-data sources when constructing Sports and Game snapshots.
- For a football Game detail read, use the `football_game` milestone to discover
  related Total and Spread Events. Keep the Game Event as the parent and append
  only validated sibling Markets.
- Use `series_ticker`, `event_ticker`, and Market ticker fields explicitly; do not parse ticker structure or display text to recover Team or Game identity.
- Map Kalshi Market statuses directly to the canonical lifecycle.
- Treat NFL Games-like Series as `collection` and interval contracts such as five-minute up/down as `rolling` when product configuration establishes that behavior.

### Polymarket

- Map one Gamma Event to one canonical Event.
- Select zero or one primary Series deterministically from Polymarket's optional Series array.
- Keep Gamma Event ID, Market ID, condition ID, and Outcome token IDs distinct internally.
- Map categories/tags to one primary MetaMask Category; do not expose an arbitrary array as peer Categories.
- Normalize structured Gamma sports metadata and sports-stream updates, including splitting combined scores into canonical home and away values.
- Derive Game Selection and both Game and Market lifecycles only from authoritative structured data.

## Relationship and behavior examples

### NFL Game

```text
Feed: nfl-games
  Event: Chiefs vs Bills
    Category: Sports
    Series: NFL Games (collection)
    Sports:
      Sport: American football
      Competition: NFL
      Game: in progress, BUF home 17, KC away 21, Q3 08:42
    Markets: winner
      Winner Outcomes: BUF (home), KC (away)
Detail for the same Event:
    Markets: winner, spread, total
      Spread and Total Markets come from authoritative sibling Venue Events.
```

The same Venue Event may later appear in a Props Feed when its own Markets support that treatment. Feed-specific featured-Market presentation is deferred until a concrete UI requires it.

### Standalone player prop

```text
Feed: nfl-props
  Event: Will Mahomes throw 3+ touchdowns this week?
    Category: Sports
    Series: optional
    Sports: American football, NFL, and Game when the prop is Game-specific
    Market: one binary question
```

No synthetic Game Event is created. A season prop or future has Sport and Competition context but omits Game.

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
3. add optional Sports, Competition, Game, Team, Game status, and Game Selection metadata;
4. replace the reduced Market status enum with the canonical Kalshi lifecycle;
5. replace Event-list reads with Feed reads where product Feed semantics are required;
6. add the rolling-Series current-Event read;
7. update runtime validation, adapter transport, query keys, service actions, fixtures, and tests together.

Until that implementation lands, code and tests remain the executable contract.

## Intentionally deferred

- Category arrays and Topic/tag models;
- public Series browsing or Series catalogs;
- dynamic Feed-filter discovery;
- separate Event summary/detail DTOs;
- Feed-item or Current-Event wrapper resources;
- multi-Venue aggregated Feeds;
- Feed-specific featured Market projections;
- non-binary canonical Markets;
- continuous live updates and WebSockets;
- play-by-play, possession, down and distance, per-period scores, player entities and statistics, Games with more than two competitors, independently cached Team resources, and account-scoped data.
