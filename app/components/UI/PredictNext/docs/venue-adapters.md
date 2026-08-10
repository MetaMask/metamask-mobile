# Venue Adapters

A Venue adapter is PredictNext's translation boundary for one prediction-market Venue. Kalshi is the first implementation. These rules preserve a seam that Polymarket can use later without requiring Polymarket migration code now.

## Capability shape

One registered adapter exposes focused capabilities that vary independently:

```typescript
interface VenueAdapter {
  readonly venueId: PredictVenueId;
  readonly marketData: VenueMarketDataAdapter;

  // Added only when account-scoped slices require them.
  readonly account?: VenueAccountAdapter;
  readonly portfolio?: VenuePortfolioAdapter;
  readonly trading?: VenueTradingAdapter;
  readonly funding?: VenueFundingAdapter;
  readonly liveData?: VenueLiveDataAdapter;
}
```

The exact implemented interfaces live in code. This sketch records grouping, not a requirement to scaffold every capability.

Structural presence is executable truth. Product capability metadata may control affordances, but contract tests must keep it consistent with the adapter structure. Do not add methods that only throw “unsupported.”

## Public and account-scoped data

Public Event, Market, Outcome, price, and Venue-status reads are scoped by `venueId`. They do not require a selected wallet or fake Venue Session.

If transport authentication is required for a nominally public endpoint, the remote adapter handles it internally. The visible query remains Venue-scoped unless its result is personalized.

Account Readiness, Account Setup, portfolio, trading, and funding are account-scoped. Product modules use a session-bound client or equivalent narrow handle; they never receive credentials or raw Venue sessions.

## Identity and identifiers

- Predict User identity is distinct from Funding Wallet and Venue Account.
- The backend authorizes account-scoped requests from authenticated MetaMask identity, not client-supplied identity fields.
- Every Event, Market, Outcome, Order, Position, query key, route, and durable Venue Operation is Venue-qualified.
- A raw Venue identifier is meaningful only with `venueId`.
- Canonical entities contain no raw credentials, PII/KYC values, or authentication subjects.

See [`../CONTEXT.md`](../CONTEXT.md) for terminology.

## Responsibilities

Adapters:

- call the Venue or MetaMask Predict backend,
- validate remote responses at runtime,
- map Venue DTOs and errors to canonical Predict models,
- prepare Venue-specific Order or Funding artifacts,
- expose only capabilities the Venue supports.

Adapters do not:

- own React or product workflow state,
- decide product sequencing such as automatic funding,
- own query caching or mutate another module's cache,
- emit product analytics,
- treat a wallet address as user identity,
- persist credentials or sensitive sessions on mobile,
- blindly retry writes.

Services orchestrate product workflows above this boundary.

## First slice: public market data

The first walking-skeleton adapter should implement only the reads required by [PRED-1158](https://consensyssoftware.atlassian.net/browse/PRED-1158). A minimal shape is:

```typescript
interface VenueMarketDataAdapter {
  fetchVenueStatus(): Promise<PredictVenueStatus>;
  fetchEvents(
    params: FetchEventsParams,
  ): Promise<PaginatedResult<PredictEvent>>;
  fetchEvent(eventId: string): Promise<PredictEvent>;
  fetchPrices(params: PriceQuery[]): Promise<MarketPrices>;
}
```

Only add price history, search, carousel, account, portfolio, trading, funding, or live-data operations when an active product slice requires them.

The market-data service resolves this capability by `venueId`:

```text
market-data service
  -> adapter registry.get(venueId).marketData
    -> Kalshi remote adapter
      -> MetaMask Predict backend
```

## Session-bound account capabilities

When the first authenticated slice arrives, the session service may bind private operational context to account capability calls and return a narrow `PredictClient`. Whether binding uses closures or a small class is an implementation detail; a JavaScript `Proxy` is not required.

A safe mobile session handle may contain only opaque, non-secret backend references. It must never contain:

- Kalshi credentials or API keys,
- bearer or refresh tokens,
- OTPs,
- PII/KYC values,
- transfer-authorization material.

Product modules never import concrete adapters or inspect session data.

## Write artifacts

Order Previews and Funding Plans are short-lived, server-issued artifacts:

- preparation is side-effect-free,
- the artifact is bound to Venue, account, amount/order intent, and expiry,
- mobile validates display/execution details against local intent,
- commit references an opaque preview/operation ID,
- backend and adapter revalidate before an external write,
- retry is allowed only where the Venue supplies verified idempotency or lookup semantics.

Do not freeze full trading or funding interfaces until their vertical slices begin.

## Adding another Venue

Add a second implementation by evidence:

1. identify the concrete product capability,
2. compare its semantics with the existing contract,
3. extend the canonical model only where the product meaning is genuinely shared,
4. keep protocol-only data in typed Venue metadata or the concrete adapter,
5. add capability contract tests,
6. avoid deployment-mode factories or generic signing frameworks until two implementations need the same behavior.

Polymarket remains on the legacy stack until an explicit migration ticket starts this process.
