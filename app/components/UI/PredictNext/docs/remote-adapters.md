# Remote Venue Adapters

Kalshi uses a remote Venue adapter: mobile speaks a canonical MetaMask Predict API while the backend owns Kalshi protocol logic and credentials. This is a concrete Kalshi deployment shape, not a generic framework for every future Venue.

The governing Kalshi ADR set is currently proposed in [MetaMask/decisions PR #241](https://github.com/MetaMask/decisions/pull/241). This document captures the minimum mobile boundary and must be updated if accepted decisions differ.

## Topology

```text
Mobile product intent
  -> KalshiRemoteAdapter
    -> narrow Predict API transport
      -> MetaMask Predict backend
        -> Kalshi credentials + protocol adapter
          -> Kalshi
```

There is no local Kalshi fallback for account-scoped operations. A backend or Kalshi outage disables or degrades only the Kalshi surface; it must not alter legacy Polymarket.

The backend is not a Venue. Canonical entities remain `venueId: 'kalshi'`, never `venueId: 'metamask'`.

## Trust boundary

### Mobile owns

- user-visible intent and confirmation,
- selected Funding Wallet context,
- wallet transaction signing and submission,
- canonical rendering and safe local workflow projection,
- runtime validation of backend responses,
- client/contract compatibility headers.

### Mobile does not own

- Kalshi admin or per-user credentials,
- authoritative Predict User to Venue Account mapping,
- Kalshi request signing,
- durable external-operation outcomes,
- Venue retry/reconciliation policy.

### Backend owns

- validating authenticated MetaMask identity,
- deriving the authoritative Predict User and resolving the Venue Account,
- Kalshi credential custody and request signing,
- durable Account Setup and financial-operation records,
- Venue DTO normalization,
- protocol-specific rate limiting and safe reconciliation,
- redacted observability, kill switches, and support references.

A privileged backend route never authorizes from a client-supplied wallet address, email, profile ID, user ID, or Kalshi external user ID. Wallet addresses used for Deposit or Withdraw are validated operation parameters, not proof of person identity.

## Mobile transport

The installed MetaMask platform client has no supported generic request API. The first public-read slice therefore uses one narrow, injected Predict API GET transport. It is deliberately unauthenticated, forwards cancellation, retains no response bodies in errors, and performs no response caching or retry. The MarketDataService alone owns response caching, deduplication, and bounded retry.

Base URL and client version come from composition/configuration; environment differences do not create different Venue adapters. A concrete `KalshiRemoteAdapter` is preferable to a configurable remote-adapter factory while Kalshi is the only consumer.

Account-scoped Balance reads use an explicit required-auth path on the same narrow transport. It obtains a fresh MetaMask bearer token for each request and never stores or logs it. Public catalog reads remain unauthenticated here; PRED-1159/PRED-1175 owns migrating those routes to required authentication.

## Canonical backend contract

The mobile/backend API exposes product capabilities, not raw Kalshi endpoints. Route names and schemas are defined by the implementing slice, but follow these rules:

- routes are Venue-qualified,
- mobile performs runtime response validation using canonical Superstruct parsers,
- unknown response fields are discarded while malformed known fields fail closed,
- raw Venue errors map to canonical Predict errors without retaining raw response bodies,
- every response contains canonical Venue context where relevant,
- credentials, PII, and raw KYC payloads never appear in canonical responses.

Contract-version header enforcement and cross-repository fixture tooling are deferred until their semantics and value are proven. Public reads now include Venue Status, Event list/detail, and Market history; Event responses embed the initial optional Outcome Bid Price and Ask Price snapshot.

Market history uses `GET /v1/venues/{venueId}/markets/{marketId}/history?range={range}` with the supported ranges `LIVE`, `1D`, `1W`, `1M`, `1Y`, and `ALL`. The response contains the Venue and Market identity, range, backend observation time, and canonical timestamp/Yes-price/No-price points. The backend derives each binary Market No price as the exact fixed-point complement of the authoritative Yes trade price. Every range is a REST history snapshot through the backend observation time; mobile does not poll, interpolate, or generate points. `LIVE` alone is extended on the client: while the Event Screen shows the `LIVE` range, mobile appends one point per streamed quote (see below) after the snapshot's last timestamp, using the quote's `lastPrice` as the Yes price and its exact complement as the No price. The appended points are server-observed trades, not client-generated values; the trail is bounded, in-memory only, and discarded when the range or Outcome changes.

### Live data stream

The backend exposes one authenticated WebSocket at `/v1/stream/live-data` on the same base URL as REST. Mobile subscribes by Venue and topic: `game` for Event ids and `market` for Market ids. Frames carry canonical `PredictGame` and `PredictMarket` field names only; venue-native payloads never reach mobile. Two frame kinds patch the read model:

- **Game** frames are patches. Omitted fields mean "unchanged", so mobile accumulates frames per Event and applies each field only when its observation time is not older than the REST value it would replace.
- **Quote** frames are full price snapshots for one Market. Outcome `bidPrice`/`askPrice` patch onto the REST Outcome by `outcomes[].id`; an omitted side means that side of the book is empty right now. The quote also carries the stream-only `lastPrice`, a `volume` that shares REST's unit, and its observation time, which mobile writes to `PredictMarket.updatedAt`.

The stream is a patch layer over REST, never a replacement for it: REST remains the recovery path, the query cache is not mutated, and the parser rejects malformed known fields while accepting unknown ones so an added server field or Game status cannot black-hole live updates. Wire shapes are specified in the Predict API's `LIVE_DATA_STREAM*.md` documents and validated on mobile by `contracts/v1/liveData.ts`.

The agreed next public-read contract uses Venue-qualified Feed reads, immutable Event reads, and a Rolling Series current-Event read. All return complete canonical Events; the backend owns Feed selection/order, single Category and Series normalization, current-Event selection, Sports/Game snapshot normalization, Outcome Game Selection, Kalshi lifecycle mapping, decimal-string Volume, and approved HTTPS image URLs. No separate Game route is required initially. See [`canonical-read-model-and-api.md`](./canonical-read-model-and-api.md). Do not define a separate price, account, or write route until a slice requires it.

## Sensitive-data rule

The following never enter Redux, persisted mobile storage, logs, analytics, traces, crash breadcrumbs, snapshots, or committed fixtures:

- Kalshi credentials and private keys,
- MetaMask bearer or refresh tokens,
- OTP values,
- raw profile/authentication subjects,
- plaintext PII/KYC payloads,
- transfer-authorization material.

Sanitized fixtures must be demonstrably synthetic or redacted. Query/cache keys contain no sensitive payload data.

## Reads

The MarketDataService may apply to safe reads:

- bounded retry with backoff,
- request deduplication,
- cache stale times,
- circuit breaking,
- explicit degraded/unavailable states.

The adapter and transport perform one network attempt per invocation so these policies are not nested.

Rate limits and upstream outages are normalized below the UI. Browsing eligibility and Venue availability remain separate: an ineligible user may browse when policy permits, while an unavailable Venue cannot serve the surface.

## Writes

Every financial or account-changing write follows:

```text
prepare -> explicit confirmation -> commit -> reconcile
```

- Preparation may reserve a short-lived server artifact but does not perform the external write.
- Mobile validates the prepared Venue, account, amount/order, asset, network, recipient, and expiry against local intent where applicable.
- Commit references an opaque server-issued operation or preview ID.
- The backend records durable operation identity before irreversible work.
- A client idempotency key prevents local operation recreation but does not prove Kalshi accepts safe retries.
- External retry is allowed only with Venue-verified idempotency or lookup semantics.
- An ambiguous response remains pending/blocked and is reconciled from evidence or surfaced for support; it is not automatically resubmitted.
- App teardown may stop observation but must not erase a committed operation.

Detailed KYC, Deposit, Order, and Withdraw contracts belong to their accepted ADRs and active Jira slices rather than this scaffold.

## Eligibility and rollout

Client geolocation, feature flags, and selected Venue are UX inputs, not authorization. The backend independently enforces eligibility for account-changing actions.

Kalshi has Venue-specific feature flags and a kill switch. Rollback can disable writes or the whole Kalshi surface without moving credentials on-device or changing Polymarket.

## Verification expectations

Each capability includes:

- runtime parser tests with synthetic canonical values,
- adapter and transport tests that verify one uncached, non-retried request per invocation,
- cross-user authorization tests for account routes,
- secret/PII redaction tests,
- lost-response and duplicate-request tests for writes,
- failure isolation proving a Kalshi outage or kill switch does not affect Polymarket.
