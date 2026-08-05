# PredictNext Testing Strategy

PredictNext tests behavior through the same interfaces callers use. Test volume is not a goal; confidence at identity, credential, Order, funding, and recovery seams is.

Follow repository conventions in `docs/testing/` and `tests/AGENTS.md` for the applicable test type.

## Principles

- test deep modules through their public interface,
- test remote contracts on both sides with shared fixtures/schemas,
- test user-visible behavior with component-view tests,
- test irreversible writes under duplicate, timeout, restart, and lost-response scenarios,
- mock only immediate external seams,
- use synthetic PII/credentials and assert redaction,
- delete a legacy test only after stronger replacement coverage exists,
- do not target a test-file count or test-to-source ratio.

## Test Surfaces

| Surface                       | Purpose                                                             | Typical seam                                       |
| ----------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| Component-view tests          | Complete user behavior with real Redux/navigation/query integration | service/Engine edges only                          |
| Service integration tests     | Workflow, cache, state, idempotency, recovery policy                | fake `PredictClient`/writer/backend operation port |
| Mobile adapter contract tests | Runtime validation and canonical transport mapping                  | mocked owned backend HTTP                          |
| Backend Kalshi adapter tests  | Kalshi signing, errors, DTO mapping, operation safety               | mocked Kalshi HTTP                                 |
| Shared contract tests         | Mobile/backend schema compatibility                                 | shared JSON/OpenAPI fixtures                       |
| Pure unit tests               | Decimal/ID/descriptor/mapper logic with real branches               | function interface                                 |
| E2E smoke tests               | Critical real demo flow                                             | built app + demo/controlled backend                |
| Security/privacy tests        | Secret/PII handling and authorization                               | auth/log/trace/storage seams                       |

Counts are determined by behavior and risk.

## Component-View Tests

Component-view tests are the primary UI safety net.

Rules:

- use existing `tests/component-view/` presets and renderers,
- exercise real Redux/query/navigation integration,
- mock only Engine/backend/native edges permitted by the framework,
- assert visible behavior and user actions, not hook internals,
- keep Venue and account scope explicit in fixtures,
- never put real personal data or credentials in fixtures.

### Kalshi-first scenarios

#### Account Setup

- unauthenticated Predict User is guarded,
- new-user setup advances through canonical steps,
- existing-user link path displays obfuscated destination,
- flat account-exists switches to link; duplicate external-user-ID does not,
- invalid-or-expired OTP offers resend without claiming which condition occurred,
- pending KYC can resume,
- KYC rejection produces unavailable behavior,
- app remount resumes from backend operation state,
- sensitive fields disappear with the view and never enter Redux.

#### Deposit and Balance

- prepare shows exact amount/network/recipient from the validated plan,
- normal wallet confirmation is used; no manual transaction-hash input,
- user rejection returns to a safe state,
- submitted transfer plus failed indication shows resumable/reconciling state,
- duplicate commit does not create duplicate visible operations,
- balance refreshes after authoritative prefunding,
- expired plan requires preparation again.

#### Trading and Portfolio

- Event/Market data is Venue-qualified,
- expired preview requests a new preview,
- insufficient Venue Balance points to explicit Deposit,
- submit uses preview/idempotency references,
- Immediate-Order-only Kalshi UI has no open/cancel/amend affordance,
- automatic Settlement appears as Settlement activity,
- Claim is absent for Kalshi,
- Activity renders Fills/Settlements rather than Order creation as execution.

#### Withdraw

- preparation is side-effect free,
- explicit confirmation precedes commit,
- destination/network validation is actionable,
- commit requires a completed step-up factor; a rejected/expired step-up blocks commit,
- payout registration requires a wallet-signed proof-of-control challenge,
- successful commit says submitted/processing until a confirmed terminal status, never completed early,
- a lost commit response surfaces as blocked pending manual reconciliation and is never automatically re-submitted,
- operation reference remains available for support/resume,
- repeated tap does not create a second withdrawal.

#### Degradation

- an ineligible venue remains browsable read-only; only actions are blocked,
- a broken identity mapping shows the recovery path, never an empty portfolio,
- Kalshi read-only surface remains usable when account writes are unavailable,
- Kalshi kill switch does not change legacy Polymarket,
- stale prices disable Order commit while browsing remains possible,
- polling fallback is represented honestly when live data is absent.

## Service Integration Tests

Treat each service as a deep module. Use a fake immediate dependency, not mocks of private helpers.

### PredictSessionService

- scope key includes Venue, Predict User, and optional canonical CAIP-10 wallet account without cross-namespace case normalization,
- wallet is not treated as person identity,
- session cache is isolated by account scope,
- account setup delegates through `client.account.setup`, never raw route paths,
- readiness blocker precedence is deterministic,
- setup projection excludes sensitive values,
- resume reads durable backend state,
- auth/session invalidation clears only affected scope.

### MarketDataService

- query descriptor includes `venueId`,
- public reads do not require account session,
- identical Venue-scoped reads dedupe,
- bounded retry/circuit policy applies to reads,
- one Venue failure does not invalidate another Venue's cache,
- optional capability absence is handled at composition/product level.

### PortfolioService

- every key and writer update includes `PredictAccountScope`,
- optimistic patches reconcile against authoritative Fills/Positions,
- rollback invalidates when it cannot be proven safe,
- Settlement invalidates Balance/Position/Activity,
- updates for another Venue/account never patch the current cache.

### TradingService

- state transition sequence is exhaustive,
- preview ID/expiry is respected,
- commit carries one stable idempotency key,
- lost response reconciles rather than resubmits,
- expired preview returns to previewing,
- Kalshi v1 requires explicit Deposit,
- Resting Order actions are absent when unsupported,
- writer milestones occur in correct order.

### TransactionService and FundingExecutor

- only safe operation ID/type/status projections persist by account scope,
- amount/destination/payload/signatures never enter the persisted slice,
- remount resumes a committed operation from the persisted reference and backend,
- prepare does not move funds,
- plan Venue/operation/amount/network/asset/recipient/expiry are checked against local intent,
- the decoded wallet payload matches `ExpectedAssetTransfer` before confirmation,
- explicit confirmation occurs before commit,
- wallet transaction uses the exact validated plan,
- commit reuses operation/idempotency references,
- transfer-submitted/indication-failed can resume,
- withdrawal lost response reconciles without duplicate commit,
- local cancel/teardown stops observation but not backend operation,
- unsupported Claim is absent for Kalshi,
- receipt remains submitted/processing when final status is unavailable.

### LiveDataService

Build only when a live capability is implemented. Test:

- multiplexing,
- reconnect/backoff,
- duplicate/out-of-order handling,
- Venue/account scope preservation,
- writer patch versus invalidate decisions,
- teardown.

Polling implementations are tested through read-service refresh behavior instead.

## Shared Mobile/Backend Contract Tests

The owned backend is a remote-but-owned seam. Mobile and backend CI validate the same versioned fixtures or generated schemas.

Minimum fixtures:

```text
fixtures/predict-api/v1/venue.status.json
fixtures/predict-api/v1/account.readiness.json
fixtures/predict-api/v1/account.setup.email-otp.json
fixtures/predict-api/v1/account.setup.link.json
fixtures/predict-api/v1/events.page.json
fixtures/predict-api/v1/portfolio.balance.json
fixtures/predict-api/v1/portfolio.positions.json
fixtures/predict-api/v1/portfolio.fills.json
fixtures/predict-api/v1/portfolio.settlements.json
fixtures/predict-api/v1/order.preview.json
fixtures/predict-api/v1/order.receipt.json
fixtures/predict-api/v1/funding.deposit.plan.json
fixtures/predict-api/v1/funding.withdraw.plan.json
fixtures/predict-api/v1/funding.receipt.json
fixtures/predict-api/v1/error.json
```

Required assertions:

- mobile rejects malformed required write fields,
- backend never returns raw Venue credential/PII fields,
- every entity/operation is Venue-qualified,
- account-scoped responses contain no client-authoritative identity field,
- compatibility version behavior is explicit,
- unknown optional fields follow schema policy,
- decimal strings stay strings.

Use existing runtime schema tooling; do not add a new validation dependency solely for Predict.

## Backend Kalshi Adapter Tests

### Request signing

- preimage is timestamp + uppercase method + path,
- host/query/body are excluded as specified,
- RSA-PSS SHA-256 and salt length are correct,
- milliseconds and clock-skew failures map correctly,
- admin credential cannot be used for trading/funding,
- per-user key scopes are enforced.

### Account Setup

- new user happy path,
- existing user detected at email and phone points,
- flat versus nested 409 behavior,
- link/verification lost-response success recovery,
- opaque KYC status handling,
- one-time key mint response stored atomically,
- key list/revoke/remint recovery,
- process restart resumes from durable store,
- duplicate requests do not duplicate identity/sub-account/key.

### Funding

- one-time amount-specific address mapping,
- Base network/token/address mapping from Venue response/config,
- prepare idempotency,
- indication idempotency and failure recovery,
- payout method register/reuse,
- Withdraw prepare/commit separation,
- no-status reconciliation behavior,
- amount/address/network validation,
- rate-limit/backoff behavior.

### Trading and Portfolio

- current V2 Order request/response mapping,
- preview fee/price/count calculation and expiry,
- submit revalidation and idempotent client order ID,
- Immediate Order terminal statuses,
- Resting/partial/cancel/amend only when enabled,
- Position mapping,
- Fill-derived activity,
- Settlement-derived activity,
- Venue Account auto-scoping and no client `subaccount` field.

### Error envelopes

- standard nested errors,
- flat account-exists and invalid-phone errors,
- combined invalid-or-expired OTP,
- authentication/permission/rate-limit mappings,
- unknown Venue errors preserve redacted cause and map safely.

## Security and Privacy Tests

These are launch gates.

### Authorization

- privileged routes reject missing/invalid bearer tokens,
- backend derives Predict User from auth,
- changing client `userId`, wallet address, email, or external ID cannot impersonate another Venue Account,
- Funding Wallet policy is enforced independently of person identity,
- cross-user operation IDs cannot be read or committed,
- withdrawal, payout registration, key minting, and identity remap reject a bearer-only session (step-up required); expired/replayed step-up factors are rejected,
- proof-of-control challenges are bound to profile ID + chain + address + expiry and cannot be replayed across profiles or addresses,
- action eligibility is enforced server-side: a modified client declaring a different venue/geolocation cannot act, while browsing remains available,
- standing per-user keys cannot execute a withdrawal (`write::transfer` absent); the ephemeral transfer key is revoked after use.

### Secret storage/logging

- admin/per-user private keys never enter logs, traces, errors, analytics, or responses,
- key-mint response body is never debug-logged,
- credentials are encrypted at rest and access is scoped,
- rotation/revocation paths work,
- no secret files are accepted by source-control checks.

### KYC / Encrypted Passthrough

- PII fields are encrypted on-device before leaving the client; the backend relay carries ciphertext only,
- a substituted/non-attributable session public key fails closed before encryption,
- ciphertext is bound to user/endpoint/freshness; replayed or cross-user blobs are rejected,
- status readback persists only the bounded non-PII projection (`last_step`, `digital_verification_status`, `digital_verification_result`, derived approval),
- the L2 Socure SDK path does not route through any MetaMask-controlled proxy or logging layer,
- the consent screen naming Kalshi and Socure precedes any PII collection.

### Recovery

- reinstall + re-authenticate restores access with no user-visible recovery,
- a changed profile ID drives the re-link flow with an explicit, audited backend remap — never a silent overwrite,
- remap events produce user-visible alerts and an audit trail.

### PII

Using synthetic markers, assert that email, phone, DOB, address, SSN, and OTP do not enter:

- Redux/persisted mobile storage,
- query keys/cache snapshots,
- analytics,
- logs/traces/Sentry context,
- support operation metadata,
- test snapshots.

## Pure Unit Tests

Use unit tests for pure logic with real branching value:

- decimal-string/cents conversion,
- normalized account-scope key construction,
- query descriptor factories,
- canonical Venue DTO mappers,
- preview expiry checks,
- idempotency request fingerprinting,
- error-envelope classification,
- display-model mapping and formatting.

Avoid isolated hook/presentational tests when a component-view test covers the same behavior more robustly. Design-system primitives with meaningful accessibility/interaction behavior may still deserve focused tests.

## E2E Smoke Tests

Use the smallest set that proves production wiring:

1. authenticate and resume/new Account Setup on Kalshi demo,
2. prepare/confirm/send Deposit and observe Balance,
3. preview/place one Immediate Order and observe Position/Fill,
4. observe automatic Settlement when practical or via controlled fixture environment,
5. prepare/confirm Withdraw and surface submitted operation reference,
6. disable Kalshi via flag/kill switch while Polymarket remains usable.

External enablement may make some flows scheduled/manual rather than per-PR CI. Keep deterministic contract/service/component-view coverage in CI.

## Migration Test Rule

During Polymarket strangling:

1. characterize current behavior at the capability seam,
2. add replacement adapter/service tests,
3. shadow or compare canonical output where useful,
4. switch one capability behind a flag,
5. observe production parity,
6. delete legacy implementation and its redundant tests only then.

A target such as “85–90% fewer test lines” is explicitly rejected. Less scaffolding is a possible outcome of deeper modules, not an acceptance criterion.

## Definition of Done for a Slice

- contract fixtures pass in mobile and backend,
- deep service/adapter tests pass,
- required component-view scenarios pass,
- duplicate, timeout, app-restart, and lost-response behavior is covered for writes,
- secret/PII redaction tests pass,
- E2E/demo evidence exists for the supported flow,
- feature flag, kill switch, and rollback are verified,
- no old test is removed without replacement evidence.
