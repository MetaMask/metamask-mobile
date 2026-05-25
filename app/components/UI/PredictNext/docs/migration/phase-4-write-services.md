# Phase 4: Write Services

## Goal

Extract stateful and write-heavy business logic from the old controller into focused PredictNext services and primitives: TradingService (Stateful), TransactionService (Runtime — user-intent layer), the shared `TransactionExecutor` primitive (helper, not a service), and LiveDataService (Runtime). Construct the `predictAnalytics` helper module (injected, **not** registered as a first-class service). Hook old PredictController write methods to delegate to these new modules. Cache coordination between write/live services and read services flows through **direct method calls** on the cache-owning service — Service Events remain for observation only.

## Prerequisites

- Phase 2 complete (generic `PredictClient`, `PolymarketAdapter`, and `PredictSessionService` are functional).
- Phase 3 can run in parallel with this phase.

## Deliverables

- `TradingService.ts` managing the order lifecycle and trading state.
- `TransactionService.ts` exposing public `deposit`/`withdraw`/`claim` actions, wrapping the shared executor with user-intent semantics.
- `TransactionExecutor.ts` sibling module — feature primitive (helper, not a service) that owns batch building, submission, and confirmation tracking. Constructor-injected into both `TransactionService` and `TradingService`.
- `LiveDataService.ts` providing a unified interface for real-time updates.
- `predictAnalytics` helper module (`services/analytics/predictAnalytics.ts`) — **injected, not a first-class service**. Constructed by the composition root in Phase 5; this phase only builds the helper module.
- Refactored `PredictController.ts` where write methods delegate to these services.

## Step-by-Step Tasks

### 1. Build TradingService

Create `app/components/UI/PredictNext/services/trading/TradingService.ts`. This service handles the complexity of placing and managing orders.

- Move the active-order state machine from `PredictController.ts`.
- Extract logic from trading hooks such as `usePredictTrading`, `usePredictPlaceOrder`, and `usePredictOrderPreview`.
- Implement `previewOrder`, `placeOrder`, `cancelOrder`, `selectPaymentToken`, and `reset` methods.
- Move order rate limiting and active-order transitions out of the legacy `PolymarketProvider` and old controller into this service.
- For deposit-before-order funding, hold a constructor-injected reference to the shared `TransactionExecutor` primitive (sibling module, not a service) and call it directly. Do **not** invoke the public `TransactionService.deposit` action — that path is reserved for user-initiated deposits and includes user-facing analytics that should not fire during order funding.
- Obtain a `PredictClient` through `PredictSessionService.getClient(ownerAddress)`, then use `getOrderPreview()` and `submitOrder()` on the client; do not pass API keys, signers, or session objects through public trading methods.
- Register `TradingService` as a first-class Engine messenger client with a scoped messenger.
- For cache-relevant order lifecycle milestones, call **direct semantic methods** on `PortfolioService` (`onOrderSubmitted`, `onOrderConfirmed`, `onOrderFailed`) via a constructor-injected reference. Service Events for order lifecycle are emitted for observers (analytics, optional listeners), not for cache mutation.
- Inject the `predictAnalytics` helper through the constructor and call `analytics.track(...)` directly at preview, submit, success, and failure boundaries.
- Manage payment token selection and order validation logic.

### 2. Build TransactionExecutor (primitive) and TransactionService (user-intent wrapper)

Create two **sibling modules** under `app/components/UI/PredictNext/services/transactions/`:

- `TransactionExecutor.ts` — feature primitive (helper, not a service)
- `TransactionService.ts` — Runtime service that exposes the public user-intent layer

#### 2a. TransactionExecutor (primitive)

- Owns batch building, transaction-controller signing-hook coordination, submission, confirmation tracking, and venue-independent error normalization.
- No Engine.context entry. No messenger namespace. No Redux state. No analytics emission.
- Constructed once by `PredictController.initialize()` and injected by constructor reference into BOTH `TransactionService` (for user-intent flows) and `TradingService` (for order funding).
- Exposes a single method: `executeBatch(batch, opts?): Promise<TransactionResult>`. The `opts.reason` value (`'order_funding' | 'public_action'`) is for telemetry only; behaviour does not branch on it inside the executor.

#### 2b. TransactionService (Runtime service wrapping the primitive)

- Move workflow ownership for Safe, Permit2, deposit wallet preflight, transaction-controller signing hooks, claim before-sign/publish, and transaction status side effects out of the legacy `PolymarketProvider` and old controller.
- Reuse `PredictClient` transaction builders (`buildDepositTx`, `buildWithdrawTx`, `buildClaimTx`) after obtaining a client through `PredictSessionService.getClient(ownerAddress)`, instead of rebuilding or signing venue payloads in the service. Use `buildDepositTx({ mode: 'fixed-amount' })` and `buildWithdrawTx({ mode: 'fixed-amount' })` when the service already knows the final amount; keep `editable-template` only for flows that intentionally rely on confirmation / Transaction Pay editing.
- Implement the public messenger actions `deposit`, `withdraw`, and `claim` — each calls `transactionExecutor.executeBatch(batch, { reason: 'public_action' })` and layers on user-intent analytics, public retry policy, and user-facing error normalization via `PredictError.from(...)`.
- Pending transaction tracking stays view-local in `useTransactions` for screens that initiated the action. If a cross-screen requirement emerges, `TransactionService` would change shape from Runtime to Stateful at that point — not before.
- Ensure proper error handling for gas estimation and execution failures using `PredictError.from(...)` with codes from the canonical error registry.

### 3. Build LiveDataService

Create `app/components/UI/PredictNext/services/live-data/LiveDataService.ts`. This service unifies real-time data streams.

- Consolidate logic from parallel live hooks like `useLiveGameUpdates`, `useLiveMarketPrices`, and `usePredictLivePositions`.
- Use the client's typed `createSubscription` method to manage venue streams.
- Register `LiveDataService` as a first-class Engine messenger client with a scoped messenger.
- Normalize venue stream messages into canonical live update payloads.
- Hold constructor-injected references to `MarketDataService` and `PortfolioService`. For every normalized update, call **direct semantic methods** on the cache-owning service: `MarketDataService.applyPriceUpdates(updates)` and `PortfolioService.applyPortfolioUpdate(update)`. Patch caches only when updates include stable identifiers and complete-enough data; invalidate/refetch query families when matching or merge safety is uncertain.
- Service Events (`PredictLiveDataService:marketPricesUpdated`, `:portfolioUpdated`) are still emitted for **observers** (analytics, optional listeners). They are no longer the system of record for cache mutation.
- Replace `GameCache`-style overlay behavior with write-through cache updates for sports game state.
- Move optimistic position overlay behavior into `PortfolioService` cache patches and rollbacks keyed by workflow `optimisticId`, driven by direct calls from `TradingService` (not via Service Event subscription).
- Inject the `predictAnalytics` helper for live-data analytics (reconnections, prolonged disconnects).
- Provide a single point of entry for components to listen for market and portfolio updates.

### 4. Build the predictAnalytics helper

Create `app/components/UI/PredictNext/services/analytics/predictAnalytics.ts`. This is a **helper module**, not a service — it is not registered as a first-class `Engine.context` entry and has no messenger namespace.

- Move the event API from `app/components/UI/Predict/controllers/PredictAnalytics.ts`.
- Extract embedded analytics calls from the old controller and buy flow hooks.
- Provide a clean interface for logging user actions, errors, and performance metrics: `interface PredictAnalytics { track(event, properties): void }`.
- Export `createPredictAnalytics(deps): PredictAnalytics` so the composition root (Phase 5) can construct one instance and inject it into every service that emits analytics.

### 5. Update PredictController Write Methods

Modify `app/components/UI/Predict/controllers/PredictController.ts` to delegate to the new write services.

- Identify current write/session methods on the old controller, including:
  - `previewOrder`
  - `placeOrder`
  - `claimWithConfirmation`
  - `confirmClaim`
  - `clearOrderError`
  - `onPlaceOrderSuccess`
  - `clearActiveOrderTransactionId`
  - `selectPaymentToken`
  - `clearActiveOrder`
  - `setSelectedPaymentToken`
  - `depositWithConfirmation`
  - `initPayWithAnyToken`
  - `clearPendingDeposit`
  - `prepareWithdraw`
  - `beforePublish`
  - `beforeSign`
  - `publish`
  - `clearWithdrawTransaction`
- Replace their internal logic with calls to the appropriate new service.
- Translate legacy command parameters to canonical types at the controller boundary.
- Map service responses back to legacy state shapes to keep old hooks and UI functional.

## Files Created

| File Path                                                                         | Description                                                        | Estimated Lines |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------- |
| `app/components/UI/PredictNext/services/trading/TradingService.ts`                | Stateful service for order management and trading logic            | 400-700         |
| `app/components/UI/PredictNext/services/trading/TradingService.test.ts`           | Trading service tests                                              | 250-400         |
| `app/components/UI/PredictNext/services/transactions/TransactionService.ts`       | Runtime service: public user-intent layer (deposit/withdraw/claim) | 250-400         |
| `app/components/UI/PredictNext/services/transactions/TransactionExecutor.ts`      | Feature primitive (not a service): batch build/submit/track        | 250-400         |
| `app/components/UI/PredictNext/services/transactions/TransactionService.test.ts`  | TransactionService user-intent tests                               | 200-300         |
| `app/components/UI/PredictNext/services/transactions/TransactionExecutor.test.ts` | TransactionExecutor primitive tests                                | 150-250         |
| `app/components/UI/PredictNext/services/live-data/LiveDataService.ts`             | Runtime service for unified real-time data subscriptions           | 200-400         |
| `app/components/UI/PredictNext/services/live-data/LiveDataService.test.ts`        | Live data service tests                                            | 150-250         |
| `app/components/UI/PredictNext/services/analytics/predictAnalytics.ts`            | Injected analytics helper module (not a service)                   | 80-150          |
| `app/components/UI/PredictNext/services/analytics/predictAnalytics.test.ts`       | Analytics helper tests                                             | 60-120          |

## Files Affected in Old Code

| File Path                                                    | Expected Change                                                                  |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `app/components/UI/Predict/controllers/PredictController.ts` | Write methods refactored to delegate to new services.                            |
| `app/components/UI/Predict/controllers/PredictAnalytics.ts`  | Logic moved to the `predictAnalytics` helper module; file eventually deprecated. |

## Acceptance Criteria

- All new services pass service integration tests with mocked dependencies: `PredictSessionService` returning a mock `PredictClient` for venue operations.
- The trading flow remains functional from the user's perspective.
- Transactions (deposit, withdraw, claim) are processed correctly through the new service layer.
- Real-time updates continue to flow to the UI without interruption.
- Analytics events are still correctly reported to the backend.

## Estimated PRs

- **PR 1**: TradingService implementation and controller wiring.
- **PR 2**: TransactionService implementation and transaction workflow migration.
- **PR 3**: LiveDataService implementation and the `predictAnalytics` helper module.
- **PR 4**: Final controller cleanup and write method delegation.
