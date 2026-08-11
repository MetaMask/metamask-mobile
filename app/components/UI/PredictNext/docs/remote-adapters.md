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

Before account-scoped routes or writes, adopt an explicit required-auth, method-capable transport. Prefer a shared uncached platform request primitive when available; do not silently reuse the public-read client's unauthenticated behavior.

## Canonical backend contract

The mobile/backend API exposes product capabilities, not raw Kalshi endpoints. Route names and schemas are defined by the implementing slice, but follow these rules:

- routes are Venue-qualified,
- mobile performs runtime response validation using canonical Superstruct parsers,
- unknown response fields are discarded while malformed known fields fail closed,
- raw Venue errors map to canonical Predict errors without retaining raw response bodies,
- every response contains canonical Venue context where relevant,
- credentials, PII, and raw KYC payloads never appear in canonical responses.

Contract-version header enforcement and cross-repository fixture tooling are deferred until their semantics and value are proven. The first read-only slice needs only Venue Status and Event list/detail; Event responses embed the initial optional Outcome Bid Price and Ask Price snapshot. Do not define a separate price, account, or write route until a slice requires it.

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
