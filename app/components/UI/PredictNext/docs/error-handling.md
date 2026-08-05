# PredictNext Error Handling

PredictNext removes avoidable errors, but never hides uncertainty around identity, Orders, or money movement.

Canonical codes and public shape are owned by [interface-ledger.md](./interface-ledger.md).

## Principles

1. **Absorb safe transient failures.** Retry reads, reconnect streams, and use safe cached data according to freshness policy.
2. **Never blind-retry writes.** Account Setup, Order, Deposit, Withdraw, Claim, and indication retries require an idempotency key and reconciliation contract.
3. **Preserve uncertainty honestly.** A lost response is not a failure or success until the durable operation is reconciled.
4. **Do not invent Venue facts.** If Kalshi reports “OTP invalid or expired,” surface the combined condition.
5. **Fail closed at trust boundaries.** Invalid auth, account scope, contract shape, preview expiry, or amount/context mismatch blocks the action.
6. **Never leak secrets or PII.** Error messages, metadata, logs, analytics, traces, and crash reports exclude credentials, OTPs, KYC fields, signatures, and raw request bodies.

## PredictError

```typescript
type PredictErrorCategory =
  | 'empty_state'
  | 'unavailable'
  | 'action_failed'
  | 'degraded';

interface PredictErrorInput {
  code: PredictErrorCode;
  message: string;
  recoverable: boolean;
  category: PredictErrorCategory;
  metadata?: Record<string, unknown>;
  cause?: unknown;
}

export class PredictError extends Error {
  readonly code: PredictErrorCode;
  readonly recoverable: boolean;
  readonly category: PredictErrorCategory;
  readonly metadata?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(input: PredictErrorInput);

  static from(
    codeOrError: PredictErrorCode | unknown,
    overrides?: Partial<Omit<PredictErrorInput, 'code'>>,
  ): PredictError;
}
```

Services prefer `PredictError.from(code, { metadata, cause })`. They do not author category/recoverability independently.

## Canonical Registry

Every code has one registry entry:

```typescript
interface PredictErrorRegistryEntry {
  category: PredictErrorCategory;
  recoverable: boolean;
  defaultMessage: string;
}

const PREDICT_ERROR_REGISTRY: Record<
  PredictErrorCode,
  PredictErrorRegistryEntry
>;
```

Core mappings:

| Code                           | Category      | Recoverable | Default product meaning                                                 |
| ------------------------------ | ------------- | ----------- | ----------------------------------------------------------------------- |
| `GEO_BLOCKED`                  | unavailable   | no          | Predict is unavailable in this region                                   |
| `FEATURE_DISABLED`             | unavailable   | no          | Venue/product surface is disabled                                       |
| `UNAUTHENTICATED`              | unavailable   | yes         | Authenticate before continuing                                          |
| `ACCOUNT_SCOPE_INVALID`        | action_failed | yes         | Selected user/wallet/Venue context is invalid                           |
| `NETWORK_MISMATCH`             | action_failed | yes         | Switch to the required funding network                                  |
| `VENUE_UNAVAILABLE`            | degraded      | yes         | Venue or owned backend is temporarily unavailable                       |
| `UNSUPPORTED_VENUE_CAPABILITY` | unavailable   | no          | Product attempted an unsupported capability                             |
| `RATE_LIMITED`                 | degraded      | yes         | Retry after bounded backoff/status guidance                             |
| `INSUFFICIENT_FUNDS`           | action_failed | yes         | Venue Account or Funding Wallet is insufficient                         |
| `ORDER_PREVIEW_EXPIRED`        | action_failed | yes         | Request a new preview                                                   |
| `ORDER_REJECTED`               | action_failed | yes         | Venue rejected the Order                                                |
| `ORDER_PLACEMENT_FAILED`       | action_failed | yes         | Order did not complete; reconcile if commit began                       |
| `ACCOUNT_SETUP_FAILED`         | action_failed | yes         | Setup step failed                                                       |
| `KYC_REJECTED`                 | unavailable   | no          | Verification was not approved                                           |
| `ACCOUNT_RECOVERY_REQUIRED`    | action_failed | yes         | Identity mapping broken; guided recovery path, never an empty portfolio |
| `STEP_UP_REQUIRED`             | action_failed | yes         | High-risk operation needs a fresh server-verifiable factor              |
| `OTP_INVALID`                  | action_failed | yes         | Venue explicitly guarantees invalid                                     |
| `OTP_EXPIRED`                  | action_failed | yes         | Venue explicitly guarantees expired                                     |
| `OTP_INVALID_OR_EXPIRED`       | action_failed | yes         | Venue does not distinguish; resend/retry                                |
| `OPERATION_EXPIRED`            | action_failed | yes         | Prepared operation/plan expired                                         |
| `OPERATION_CONFLICT`           | action_failed | no          | Idempotency key reused with different intent                            |
| `UNSUPPORTED_NETWORK`          | action_failed | yes         | Choose a supported funding network                                      |
| `INVALID_WITHDRAWAL_ADDRESS`   | action_failed | yes         | Correct destination/network                                             |
| `DEPOSIT_FAILED`               | action_failed | yes         | Deposit failed or requires reconciliation                               |
| `WITHDRAWAL_FAILED`            | action_failed | yes         | Withdraw failed or requires reconciliation                              |
| `CLAIM_FAILED`                 | action_failed | yes         | Claim failed                                                            |
| `SETTLEMENT_FAILED`            | degraded      | yes         | Settlement read/reconciliation unavailable                              |
| `TRANSACTION_REJECTED`         | action_failed | yes         | User rejected wallet confirmation                                       |
| `TRANSACTION_FAILED`           | action_failed | yes         | Wallet transaction failed                                               |
| `LIVE_DATA_DISCONNECTED`       | degraded      | yes         | Poll/cache fallback may remain usable                                   |
| `UNKNOWN`                      | degraded      | yes         | Unknown safe fallback; preserve cause internally                        |

Default messages are Venue-neutral. Do not hardcode “Polygon” in `NETWORK_MISMATCH` or “Claim” for an automatic-settlement Venue.

`GEO_BLOCKED` and jurisdiction restrictions block **actions**, not browsing: per the venue-selection policy (parent ADR), an ineligible venue remains read-only — markets and prices stay browsable while onboarding, trading, and funding are blocked.

Note on OTP codes: Kalshi returns a combined invalid-or-expired condition; `OTP_INVALID` and `OTP_EXPIRED` exist for venues that guarantee the distinction. Never map a combined venue condition to a specific code.

## UI Categories

| Category        | Meaning                                          | Treatment                                                     |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `empty_state`   | Valid query returned no content                  | Empty state; not logged as failure                            |
| `unavailable`   | User cannot use the surface/capability           | Guard, route, or unavailable view                             |
| `action_failed` | User intent did not complete or needs correction | Inline/action-level error and safe retry/reconcile affordance |
| `degraded`      | Partial/read-only/stale operation remains useful | Banner/status with unavailable actions disabled               |

`empty_state` is a display category, not an exception for an otherwise successful query.

## Retry Matrix

| Operation                 | Automatic retry?             | Requirement                                                                                                |
| ------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Public GET/read           | bounded yes                  | backoff, rate-limit handling, freshness policy                                                             |
| Account-scoped GET/read   | bounded yes                  | valid authenticated session; refresh once on auth expiry                                                   |
| WebSocket/SSE connect     | yes                          | bounded exponential backoff; polling/cache fallback                                                        |
| Account Setup step        | only with idempotency        | same operation/key; resume before repeating                                                                |
| Order preview             | safe to request again        | new preview ID; old preview expires                                                                        |
| Order submit              | only with idempotency        | same preview ID/key; reconcile operation                                                                   |
| Funding prepare           | only with idempotency        | avoid duplicate one-time address/preflight                                                                 |
| Wallet transaction submit | wallet infrastructure policy | never silently request a second user signature                                                             |
| Funding commit/indication | only with idempotency        | same operation/key/transaction hash                                                                        |
| Withdraw commit           | no                           | lost response blocks retry pending manual reconciliation; never auto-resubmit (see `kalshi-funding-rails`) |

A 429 without `Retry-After` uses bounded exponential backoff owned by the backend adapter. Mobile should not create independent retry storms.

## Layer Responsibilities

### Venue adapter / remote transport

- validate response shape at the boundary,
- map deterministic Venue errors to canonical codes,
- preserve HTTP/Venue context in redacted internal causes,
- distinguish authentication, rate limit, unsupported capability, validation, and outage,
- never log full credential-mint, KYC, setup, or financial request/response bodies,
- never retry an unkeyed write.

For remote adapters, malformed write responses fail closed. Unknown optional read fields may be tolerated only where the schema allows them.

### Services

- decide whether retry/reconciliation is safe,
- own state transitions and cache fallback,
- map low-level failures to `PredictError`,
- attach only non-sensitive metadata such as `venueId`, method, canonical code, and safe operation reference,
- preserve the same idempotency key across retry,
- expose an “unknown/reconciling” state when commit outcome is uncertain.

### Hooks

- expose stable loading/error/workflow state,
- do not parse Venue messages or HTTP status,
- do not implement retry policy,
- invoke explicit service retry/resume actions,
- do not put sensitive form values in error metadata.

### Product UI modules

- branch on category first and specific code only for meaningful action copy,
- distinguish “submitted/processing” from “complete,”
- never show Claim for automatic-settlement Venues,
- never show cancel/amend for Immediate-Order-only Venues,
- avoid exposing raw backend/Venue messages.

## Flow Examples

### Safe read retry

```text
MarketDataService GET
  -> transient 503
  -> bounded retry/backoff
  -> safe fresh-enough cache if policy permits
  -> degraded indicator only when freshness threshold is crossed
```

### Expired Order Preview

```text
submit(previewId)
  -> backend/adapter rejects expiry
  -> ORDER_PREVIEW_EXPIRED
  -> TradingService returns to PREVIEWING
  -> UI requests a new preview
```

The service does not submit the old mutable price payload.

### Lost Order response

```text
submit(previewId, idempotencyKey)
  -> Venue accepts
  -> network response lost
  -> service enters reconciling/error projection
  -> retry uses same idempotencyKey
  -> backend returns existing operation/receipt
```

A new client order ID is never generated for the retry.

### Deposit transfer succeeds, indication fails

```text
wallet transfer submitted -> txHash
  -> funding commit/indication times out
  -> DEPOSIT_FAILED with operationId, recoverable=true
  -> backend operation remains pending
  -> resume reuses operationId + txHash + idempotencyKey
  -> indication reconciles to prefunded/processing
```

Mobile teardown does not discard the external operation.

### Kalshi Withdraw

```text
prepare -> user confirms + step-up -> commit
  -> Kalshi returns transfer reference (transfer_id stored durably)
  -> FundingReceipt.status = submitted
  -> UI says submitted/processing
  -> backend polls Kalshi transfer-status endpoint
  -> UI shows completed only on a confirmed terminal status
```

Kalshi has confirmed a transfer-status endpoint for launch (shape unconfirmed); until it reports a terminal status the UI must not display completed. If the commit response is lost, the backend has no `transfer_id` and cannot distinguish “never submitted” from “submitted”: the operation surfaces as blocked pending manual reconciliation and is never automatically re-submitted. Support uses the operation and Venue references for reconciliation.

### Kalshi OTP

```text
Venue: invalid_or_expired_code
  -> OTP_INVALID_OR_EXPIRED
  -> UI: “The code is invalid or expired. Request a new code.”
```

Do not map it to one more specific code.

## Degraded States

Examples:

- public Events available but account backend unavailable → read-only Kalshi surface,
- live channel disconnected but bounded polling works → subtle degraded status,
- one Venue unavailable in a merged feed → preserve other Venue data and label partial results,
- cached price is stale → browsing may continue, Order preview/submit remains disabled until fresh backend validation,
- withdrawal status unavailable → keep submitted operation visible; do not report failure or completion without evidence,
- broken profile↔Kalshi identity mapping → explicit “your account needs recovery” state with the re-link path (`kalshi-account-recovery`), never an empty portfolio implying funds are gone.

A local Kalshi credential fallback is never a degraded mode.

## Logging, Monitoring, and Redaction

Allowed structured fields:

- `feature: predict`,
- `venueId`,
- service/action name,
- canonical error code/category,
- recoverability,
- HTTP status and redacted Venue error code,
- safe operation/preview reference when classified non-secret,
- app/contract version,
- timing/retry count.

Forbidden fields:

- PEM/private key/API key/token,
- OTP,
- SSN, date of birth, phone, email, address/profile payload,
- wallet signature or raw signed message,
- full request/response body,
- bearer token,
- unredacted Venue Session,
- secret-bearing URL/query parameters.

Special rule: key-mint responses are never body-logged, even in demo/debug mode.

## Testing Requirements

- every registry code has one complete entry,
- Kalshi flat/nested error envelopes map correctly,
- combined OTP behavior is covered,
- read retry is bounded,
- unkeyed writes are not retried,
- repeated keyed writes return one operation,
- conflicting idempotency reuse fails,
- app restart/lost response resumes the same operation,
- malformed remote write responses fail closed,
- logs/analytics/traces redact synthetic secret/PII fixtures,
- UI distinguishes failed, reconciling, submitted, processing, and complete.
