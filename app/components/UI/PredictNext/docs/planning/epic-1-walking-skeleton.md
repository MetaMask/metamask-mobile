# Epic 1 — Walking Skeleton: Read-Only Kalshi Market Data

**Outcome:** a user (behind the feature flag) opens the Kalshi surface and
browses a live list of Kalshi events with prices, served
`mobile → Predict API → Kalshi market APIs`. No authentication, no accounts,
no writes.

**Why first:** it forces every load-bearing seam to exist — canonical types,
capability adapter, read service, query descriptors, authenticated-capable API
client, versioned contract with shared fixtures, runtime validation, backend
service skeleton, backend Kalshi adapter, feature flag/kill switch — while
touching zero regulated surface. Everything later hangs off these seams.

**External gates:** none. Kalshi public market data is reachable today
(demo and/or production public endpoints).

**ADR anchors:** `kalshi-mobile-architecture` (all four decisions),
`kalshi-integration-overview` (topology, venue policy).

---

## Stories

### 1.1 — Backend service skeleton (Task, backend)

Stand up the Predict API service: repo, framework, CI, deploy pipeline to a
dev environment, health endpoint, structured redacted logging, config/secrets
plumbing (no secrets needed yet), error envelope.

- `GET /predict/v1/venues/:venueId/status` returns a real status payload.
- Contract version header (`X-Predict-Contract-Version`) present on every response.
- Deliberately venue-generic route shape from day one (`:venueId`).

**Sub-tasks:** framework/infra choice (ADR-light decision note), repo + CI,
deploy, logging/redaction baseline, error envelope.

### 1.2 — Backend Kalshi market-data adapter (Story, backend)

Backend module that calls Kalshi market APIs and normalizes DTOs to canonical
entities.

- `GET /predict/v1/venues/kalshi/events` (paginated) and
  `GET .../events/:eventId`, `GET .../markets/:marketId/prices`.
- Kalshi DTO → canonical `PredictEvent`/`PredictMarket`/`PredictOutcome`
  mapping with tests against recorded Kalshi payloads.
- Bounded retry/backoff, rate-limit handling, upstream-outage → `degraded`
  status mapping.
- No credentials on this path if the market endpoints are public; if signed,
  keys live in the backend secret store from day one.

### 1.3 — Shared contract & fixture tooling (Task, cross-stack)

Decide and implement how mobile and backend validate the same contract.

- Schema source of truth (OpenAPI/JSON-schema/zod-derived — decide here),
  generated or shared fixtures under `fixtures/predict-api/v1/`.
- Backend CI validates responses against fixtures; mobile CI validates
  runtime parsers against the same fixtures.
- Contract-version negotiation rule implemented (unsupported client → upgrade
  error).

This is the one "stage zero" survivor; it's built inside this slice because
this slice is its first real consumer.

### 1.4 — Canonical types, errors, and query descriptors (Task, mobile)

The minimal `types/`, `errors/`, `query-descriptors/` foundation per the
interface ledger — only what the read path needs.

- `PredictVenueId`, `PredictEvent`, `PredictMarket`, `PredictOutcome`,
  `PredictVenueStatus`, `PredictEligibility` (with `venueAvailable`/`eligible`
  split), scope/key types.
- `PredictError` + registry with the codes the read path can produce
  (`VENUE_UNAVAILABLE`, `RATE_LIMITED`, `GEO_BLOCKED`, `FEATURE_DISABLED`,
  `UNKNOWN`, …).
- `marketDataQueries` descriptors: venue-qualified keys, stale times,
  invalidation families.

### 1.5 — KalshiRemoteAdapter (marketData capability) + API client wiring (Story, mobile)

- `KalshiRemoteAdapter` implementing only the `marketData` capability against
  the Predict API via the existing authenticated MetaMask API client
  (`app/core/apiClient.ts`) — unauthenticated routes for now, but the
  transport is auth-capable from day one.
- Runtime validation of responses against the shared fixtures; malformed
  responses fail closed.
- Adapter registry keyed by `venueId`.

### 1.6 — MarketDataService + read hooks (Story, mobile)

- `PredictMarketDataService` (`BaseDataService`) consuming the descriptors:
  cache, dedupe, bounded retry, messenger registration.
- `useEventList`, `useEventDetail`, `usePrices` granular query hooks.
- `PredictController` composition root: `initialize`/`destroy`, wires
  registry + service, fail-closed bootstrap for this minimal graph.

### 1.7 — Feature flag, guard, and read-only browse UI (Story, mobile)

- Kalshi feature flag + kill switch (remote flag), venue defaulting from
  GeolocationController (US → Kalshi) per the venue-selection policy.
- Per PRED-953 (ported): venue switching is settings-only — no toggle in
  feed/portfolio/market detail; a user-changed selection persists and is
  re-validated against eligibility on app open; switching is a global
  context reset with a visible transition state. (Settings control itself
  can land in a later story; the persistence/validation seam starts here.)
- `usePredictGuard` with the `venueAvailable`/`isEligible`/`canSetup`/`canTrade`
  split; ineligible = browse-only (nothing to block yet — this slice is all
  browse).
- Minimal `PredictHome` + `EventFeed` + event detail view reusing existing
  design-system components. Unavailable state when flag off/kill-switched.

### 1.8 — E2E and rollout wiring (Task, cross-stack)

- One E2E smoke: flag on → browse events → open detail (against dev backend
  or mocked transport per repo E2E conventions).
- Internal-only flag cohort; dashboards for backend route health.

---

## Exit criteria

- Browsing works end to end on a device against the dev Predict API.
- Mobile and backend CI validate the same contract fixtures.
- Kill switch removes the surface without touching legacy Polymarket.
- No secrets or PII anywhere on this path (trivially true — enforced by
  redaction tests from day one).
