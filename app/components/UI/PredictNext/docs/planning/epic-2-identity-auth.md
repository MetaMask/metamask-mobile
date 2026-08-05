# Epic 2 — Identity & Authenticated Reads

**Outcome:** an authenticated MetaMask user hits an account-scoped Predict API
route; the backend derives the canonical profile ID from the JWT (resolving
alias chains / pairing), stores the durable identity mapping, and returns a
real Account Readiness projection (`setup_required` for a new user). Mobile
renders readiness-driven UI states.

**Why second:** every regulated slice (setup, funding, trading, withdraw)
sits on this. It lands trust-model invariant 3 (identity from the session
only) and the `kalshi-identity` ADR decision (Canonical Profile ID as
`external_user_id`) as working code before any money or PII is involved.

**External gates:** none — the identity-platform docs (authentication,
profile management, canonical profile ID) are published. Privacy sign-off on
sharing the profile ID with Kalshi gates _Epic 3's_ link/create calls, not
this epic (nothing leaves for Kalshi here).

**ADR anchors:** `kalshi-identity`, `kalshi-security-trust-model`
(invariant 3), identity-platform docs (profile pairing, canonical election,
`X-MetaMask-Profile-Pairing` header).

---

## Stories

### 2.1 — Backend JWT validation & canonical profile resolution (Story, backend)

- Validate the Authentication-service JWT (signature, issuer, audience,
  expiry) on every account-scoped route.
- Resolve the **canonical** profile ID server-side: handle pre-pairing legacy
  `sub` values via alias-chain resolution / pairing header semantics; a
  client's raw `sub` is never used directly as the identity key.
- Middleware + test suite: expired/forged/wrong-audience tokens rejected;
  alias-presenting tokens resolve to the same canonical ID.

### 2.2 — Durable identity & user store (Story, backend)

- `profile_id ↔ venue user` mapping table (Kalshi user ID empty until Epic 3)
  plus user-record lifecycle.
- Detection hook: a stored ID that becomes an alias (pairing-time canonical
  change) is flagged for the audited remap path — recorded now, exercised in
  Epic 7 recovery work.
- Audit-log baseline for identity-touching operations.

### 2.3 — Mobile session wiring & authenticated transport (Story, mobile)

- Mobile obtains/refreshes the Authentication-service JWT via existing app
  auth infrastructure and attaches it to Predict API calls.
- `PredictSessionService` (BaseController) skeleton: `PredictUserContext`
  resolution, session-bound `PredictClient` creation, `PredictVenueSession`
  as a safe non-secret handle (typed `data`, forbidden-field rule).
- 401/refresh-once behavior per the retry matrix; `UNAUTHENTICATED` error
  surfaced through the guard.

### 2.4 — Account Readiness vertical (Story, cross-stack)

- `GET /predict/v1/venues/kalshi/account/readiness` returns a canonical
  `PredictAccountReadiness` (`setup_required` for everyone at this point).
- Contract fixtures + runtime validation like Epic 1.
- Mobile: readiness capability on the adapter, readiness projection in
  `PredictSessionService` state (StateMetadata reviewed against invariant 4),
  `usePredictGuard.canSetup/canTrade` driven by real data.
- UI: browse surface shows the "set up your account" entry point gated by
  readiness; cross-user authorization test (user A cannot read user B's
  readiness by any client-supplied identifier).

### 2.5 — Eligibility enforcement seam (Task, cross-stack)

- Backend eligibility check on account-scoped action routes (jurisdiction/
  geo policy stub now, real policy when compliance supplies it) — enforced
  server-side, independent of client-declared venue/geolocation/flags.
- Mobile `PredictEligibility` populated from the backend status route;
  browse never gated by eligibility (venue availability only).

---

## Exit criteria

- A real authenticated user gets `setup_required` readiness end to end.
- No privileged route trusts any client-supplied identifier (test-enforced).
- Canonical-vs-alias resolution proven by tests using paired test profiles.
- Identity mapping survives app reinstall (F3 = non-event, at the read level).
