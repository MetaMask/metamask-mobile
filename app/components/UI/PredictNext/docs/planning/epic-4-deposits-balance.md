# Epic 4 — Deposits & Balance

**Outcome:** a KYC-approved user deposits Base USDC from their wallet into
their Kalshi sub-account through prepare → confirm → commit → reconcile, and
sees their venue balance. Interrupted flows resume.

**Dependencies:** Epic 2 (auth). Develops against a pre-KYC'd demo account,
so it does **not** wait for Epic 3's gated stories.

**External gates:** demo/production crypto-rail enablement (feature-gated
per user on Kalshi's side); deposit address lifetime + wrong-amount behavior
(open question with funds-loss potential — chase with Kalshi, don't block
build).

**ADR anchors:** `kalshi-funding-rails` (deposit semantics),
`kalshi-mobile-architecture` (write safety).

---

## Stories

### 4.1 — Funding operation store & write-safety plumbing (Story, backend)

- Durable operation records (deposit_id, tx_hash, status) stored **before**
  any external irreversible call; idempotency keys on prepare/commit;
  conflicting key reuse fails explicitly; operations survive restart and are
  traceable by support without secrets.
- This is the reusable write-safety substrate for orders (Epic 5) and
  withdrawals (Epic 6) — build it once here.

### 4.2 — Deposit prepare vertical (Story, cross-stack)

- Backend: `funding/prepare` → Kalshi one-time amount-specific Base address →
  durable record → `FundingPlan` (executable transaction, operationId,
  expiry).
- Mobile: `TransactionService` + `FundingExecutor` skeletons; plan validation
  against local intent (venue/operation/amount/network/asset/recipient/
  expiry) failing closed before signing; deposit amount UI.
- Repeated prepare with the same key does not reserve twice.

### 4.3 — Wallet transfer & commit vertical (Story, cross-stack)

- Mobile: hand the validated plan to the app's native transaction
  confirmation infra; display the exact backend-bound recipient; broadcast;
  report tx_hash via `funding/commit`.
- Backend: idempotent deposit indication (deposit_id + tx_hash); prefunded
  receipt.
- Transfer-succeeds/indication-fails stays resumable; teardown never erases
  or duplicates a committed operation.

### 4.4 — Balance & operation status (Story, cross-stack)

- Backend: `portfolio/balance` + `funding/:operationId` routes.
- Mobile: `PortfolioService` (BaseDataService) with `useBalance`;
  pending/processing operation UI; balance invalidation on deposit
  reconciliation; resume-from-record after app restart.

### 4.5 — Deposit failure-scenario test suite (Task, cross-stack)

The `kalshi-funding-rails` required scenarios, each an explicit test: app
death before/after broadcast, double indication, backend timeout after Kalshi
accepted, expired unused address/plan, transfer-succeeds/indication-fails.

---

## Exit criteria

- Deposit lands and balance reflects it on demo, end to end from the app.
- Every required failure scenario has a passing test.
- A duplicate request cannot double-credit; restart resumes cleanly.
