# Phase 4: Polymarket Write-Service Delegation

> **Track status:** post-Kalshi Polymarket strangler work. Not a Kalshi launch dependency. Kalshi builds the minimum write modules in its own vertical stages first.

## Goal

Move legacy Polymarket Order, funding/Claim, and live behavior into the deep PredictNext services without weakening the identity, idempotency, confirmation, or durability contracts proven by Kalshi.

## Preconditions

- corresponding Polymarket adapter capability exists,
- `PredictAccountScope` and Account Readiness are available,
- portfolio/market read-model writer interfaces are agreed,
- every write has explicit lost-response semantics and retries only with verified Venue idempotency/reconciliation support,
- current behavior has characterization coverage and rollback.

## TradingService

Move behavior incrementally:

- preview lifecycle and expiry,
- Order validation/rate limiting,
- idempotent submit/reconciliation,
- state transitions,
- optional Resting Order cancel/amend,
- optional automatic Order funding,
- portfolio writer milestones,
- analytics.

Rules:

- obtain `PredictClient` with `PredictSessionService.getClient(scope)`,
- submit `previewId + idempotencyKey`, not a mutable preview as authority,
- preserve the same key on retry,
- use `PortfolioReadModelWriter`, not full PortfolioService,
- expose cancel/amend only when the Venue/product supports Resting Orders,
- keep Venue credentials/signers/session objects out of service parameters.

Kalshi v1 uses explicit Deposit first. Automatic Deposit-before-Order remains optional long-term behavior, not a required TradingService path.

## TransactionService and FundingExecutor

Canonical flow:

```text
intent -> prepareFunding -> user confirmation -> FundingExecutor -> commitFunding -> reconcile
```

### FundingExecutor

- executes typed wallet transaction plans through app confirmation infrastructure,
- captures transaction hash,
- commits with original operation/idempotency references,
- manages local listeners/teardown,
- never owns durable external operation state,
- local cancel does not imply an external transaction/operation was cancelled.

### TransactionService

- exposes only supported Deposit/Withdraw/Claim actions,
- prepares through `client.funding`,
- obtains explicit confirmation before commit,
- layers user-intent analytics and error policy,
- resumes/reconciles by operation ID,
- sends writer milestones after authoritative results.

Polymarket-specific editable zero-amount transaction templates remain in migration compatibility until their confirmation flow is replaced. Do not add them back to canonical Funding Plans.

## LiveDataService

Build/migrate only when a live capability remains required.

- adapter normalizes transport payloads,
- service owns socket/reconnect/multiplexing lifecycle,
- every update retains `venueId` and account scope when applicable,
- read-model writers own cache patch/invalidation,
- Service Events are observation-only,
- bounded polling is valid where product requirements allow it.

## Analytics Helper

`predictAnalytics` remains an injected helper, not an Engine service. It receives only redacted canonical context. Never emit credentials, signatures, KYC values, or raw Venue/backend payloads.

## Legacy Delegation

Move one workflow at a time:

1. legacy call maps to canonical scope/intent,
2. old controller calls the new service action,
3. canonical receipt/state maps back to the old contract,
4. old UI remains unchanged,
5. feature flag controls rollback,
6. old workflow is deleted after parity.

Do not make the old controller a second workflow owner.

## Required Failure Tests

- expired Order preview,
- duplicate Order submit,
- Venue accepts but response is lost,
- app restarts during committed Order/funding,
- wallet transaction succeeds but Venue follow-up fails,
- duplicate funding commit,
- withdrawal/Claim lost response,
- local teardown while backend operation remains active,
- one account/Venue update cannot patch another,
- secret/PII redaction.

## Acceptance Criteria per Workflow

- `PredictAccountScope` is explicit,
- user confirmation precedes irreversible funding commit,
- writes are durably tracked and reconcilable; retry behavior matches verified Venue semantics,
- durable remote operation state does not depend on mobile memory,
- adapter/service/UI responsibilities remain separated,
- old callers retain behavior during delegation,
- rollback is independent,
- replacement integration/component-view tests pass before old tests/code are removed.
