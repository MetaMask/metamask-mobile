# Epic 5 — Trading & Portfolio

**Outcome:** a funded user places an Immediate Order (buy and cash-out) via
preview → confirm → submit, and their positions/activity reconcile from
Kalshi Fills and Settlements. No Claim affordance, no cancel/amend.

**Dependencies:** Epic 4 (funded demo account, write-safety substrate).
**Scope assumption:** Immediate Orders only for v1 (fill-or-kill preferred).

**External gates:** current market-data/trading contract confirmation with
Kalshi; production per-user key enablement.

**ADR anchors:** `kalshi-mobile-architecture` (write safety, capability
adapters), `kalshi-funding-rails` inherited semantics.

---

## Stories

### 5.1 — Order preview vertical (Story, cross-stack)

- Backend: `orders/preview` — read current quote, compute fees/limits, return
  previewId + expiry + display values (server-authoritative).
- Mobile: trading capability on adapter; `TradingService` (BaseController)
  state machine (PREVIEWING → PLACING → SUCCESS/ERROR); order form UI with
  preview display; expired preview → re-preview.

### 5.2 — Order submit vertical (Story, cross-stack)

- Backend: revalidate account/price/quantity/fees/expiry/max-spend; submit
  with stable venue client-order ID signed by the per-user key (backend
  custody); idempotent on preview/key; canonical Order Receipt.
- Mobile: submit with previewId + idempotency key; lost-response retry reuses
  the same key and converges on one operation; `useTrading` hook.
- The backend never trusts a client-echoed mutable preview.

### 5.3 — Positions & activity vertical (Story, cross-stack)

- Backend: `portfolio/positions` + `portfolio/activity` derived from Fills
  and Settlements (never inferred from order records).
- Mobile: `usePositions`/`useActivity`; position cards; automatic Settlement
  shown as settlement activity; **no Claim path for Kalshi** (capability-
  gated, test-enforced).

### 5.4 — Cash-out flow (Story, cross-stack)

- Sell-side Immediate Order through the same preview/submit machinery;
  position → cash-out UI; balance/position invalidation on fill.

### 5.5 — Trading failure-scenario tests (Task, cross-stack)

- Expired preview cannot submit; duplicate submit returns the same receipt;
  app restart mid-order reconciles; stale prices disable commit while
  browsing continues; insufficient funds is actionable.

---

## Exit criteria

- Buy and cash-out complete on demo; positions/activity match venue state.
- Repeated submissions return one venue operation.
- No Claim or cancel/amend affordance exists for Kalshi (test-enforced).
