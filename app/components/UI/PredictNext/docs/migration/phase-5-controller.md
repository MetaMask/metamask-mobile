# Phase 5: PredictController Composition Root

## Goal

Build the new `PredictController` as a **stateless composition root** — `initialize` and `destroy` only. It instantiates and wires the six services plus the `predictAnalytics` helper module, then steps off every hot path. Read and write hooks address services directly through the Engine messenger and Redux selectors; `PredictController` is not on the read or write path.

Make the old `PredictController` a translation shim that forwards calls to the new services (not to the new `PredictController`, which has no methods to forward to). The old controller's state subscriptions become Redux subscriptions against the new services' `BaseController` slices, mapped back to the legacy state shape during the migration window.

By the end of this phase, the old controller contains no business logic — only legacy-to-canonical mapping at its boundary, forwarding to new service messenger actions, and state synthesis from new service slices.

## Prerequisites

- Phase 3 (Read Services) and Phase 4 (Write Services) complete.
- All six services (`PredictSessionService`, `MarketDataService`, `PortfolioService`, `TradingService`, `TransactionService`, `LiveDataService`) are fully implemented, tested, and registered as first-class `Engine.context` entries with their own `BaseController` / `BaseDataService` state slices where applicable. The `predictAnalytics` helper module is implemented and ready to be constructed by the composition root.

## Deliverables

- New `PredictController` in `app/components/UI/PredictNext/controller/PredictController.ts` — stateless composition root, `initialize` / `destroy` only.
- Controller init function in `app/core/Engine/controllers/predict-controller/index.ts` that wires the composition root into Engine alongside the six service init functions.
- Updated old `PredictController` in `app/components/UI/Predict/controllers/PredictController.ts` acting as a delegation shim.
- Composition-root tests in `app/components/UI/PredictNext/controller/PredictController.test.ts` — focused on instantiation order, dependency wiring, and teardown.

## Step-by-Step Tasks

1. Define the composition-root contract in `app/components/UI/PredictNext/controller/types.ts`.
   - `PredictController` exposes exactly two methods: `initialize(): Promise<void>` and `destroy(): void`.
   - There is no Redux state slice for `PredictController`, no `StateMetadata`, no messenger actions exposed by the controller itself.

2. Implement the new `PredictController` in `app/components/UI/PredictNext/controller/PredictController.ts`.
   - Constructor receives the scoped messenger and any persisted state slices needed by the services it will instantiate.
   - `initialize()` is **transactional and fail-closed**:
     - Constructs the `predictAnalytics` helper first (so every service that emits analytics receives a real reference, not a stub).
     - Constructs `PredictSessionService` (other services depend on it for client retrieval and Account Readiness).
     - Constructs `MarketDataService` and `PortfolioService` (`BaseDataService`-backed) wired to `PredictSessionService` via messenger actions.
     - Constructs the shared `TransactionExecutor` primitive (sibling module under `services/transactions/`, not a service) and injects it into both `TransactionService` and `TradingService`. Constructs `TransactionService` (Runtime service) — exposes public user-intent messenger actions that wrap the executor with analytics, retry policy, and user-facing error normalization.
     - Constructs `TradingService` (`BaseController`) with constructor-injected references to `PortfolioService` (for direct cache-coord calls), `TransactionService.executor` (for order funding), and the `predictAnalytics` helper. Wires to `PredictSessionService` via messenger actions.
     - Constructs `LiveDataService` (stateless) with constructor-injected references to `MarketDataService` and `PortfolioService` (for direct cache-coord calls) and the `predictAnalytics` helper.
     - If any construction fails: tear down every successfully-constructed service in reverse order, unregister every messenger client, release the `predictAnalytics` helper, and surface the feature as unavailable. No partial state is left behind.
   - Document which initialization failures are **boot-blocking** (feature does not start) versus **boot-degrading** (feature starts with reduced surface). Examples: missing signer provider → boot-blocking; analytics helper fails → boot-degrading.
   - `destroy()` is idempotent:
     - Tears down subscriptions (`LiveDataService` connection close, pending request cancellation in workflow services).
     - Unregisters messenger clients in reverse order of registration.
     - Drops any Service Events emitted between start of teardown and completion of `destroy()`.
     - Releases service references and the `predictAnalytics` helper.
   - Does **not** expose `previewOrder`, `placeOrder`, `deposit`, `withdraw`, `claim`, `subscribe`, or any other proxy method. Hooks already call those services directly via messenger.

3. Update the old `PredictController` to delegate to the new services.
   - Import the translation mappers from `PredictNext/compat/mappers.ts`.
   - For every public method in the old controller:
     - Map incoming legacy arguments to canonical types.
     - Forward writes via `messenger.call('PredictTradingService:placeOrder', ...)`, `messenger.call('PredictTransactionService:deposit', ...)`, etc.
     - Forward reads to `MarketDataService` or `PortfolioService` via messenger (the new read services already route through messenger from BaseDataService).
     - Forward Account Readiness reads to `PredictSessionService` (its readinessByOwner slice or `PredictSessionService:fetchAccountReadiness` action).
     - Map canonical results back to legacy types.
     - Return the legacy result to the caller.
   - The old controller's state slice is reconstructed by subscribing to the new services' `:stateChange` events (and to BaseDataService cache events) and synthesizing the legacy shape for old hooks/views that still subscribe.

4. Update Engine initialization in `app/core/Engine/controllers/predict-controller/index.ts` and surrounding init files.
   - Register the new `PredictController` composition root as an Engine.context entry.
   - Register each Predict service as its own first-class Engine.context entry alongside it.
   - Engine wires the dependencies via shared messengers; the composition root coordinates Predict-specific construction order.
   - Keep the old controller as the primary Engine-registered controller for legacy hooks/views to consume until Phase 6 migrates the UI.

5. Write tests for the new `PredictController`.
   - Verify that `initialize()` constructs the six services and the `predictAnalytics` helper in dependency order.
   - Verify that `initialize()` is transactional and fail-closed: simulate a failure during each construction step and assert that every previously-constructed service is torn down and the feature reports unavailable. No partial state should remain.
   - Verify that `destroy()` tears every service down without leaks (subscriptions closed, in-flight requests cancelled, messenger clients unregistered).
   - Verify that Service Events emitted during the teardown window are dropped.
   - Do not test method delegation — there are no methods to delegate. Service-level behavior is already covered by service tests.

## Files Created

| File path                                                            | Description                                                | Estimated lines |
| -------------------------------------------------------------------- | ---------------------------------------------------------- | --------------: |
| `app/components/UI/PredictNext/controller/PredictController.ts`      | Stateless composition root (`initialize` / `destroy` only) |          60-120 |
| `app/components/UI/PredictNext/controller/types.ts`                  | Composition-root contract types                            |           20-40 |
| `app/components/UI/PredictNext/controller/index.ts`                  | Controller barrel export                                   |            5-10 |
| `app/components/UI/PredictNext/controller/PredictController.test.ts` | Bootstrap and teardown tests                               |          80-140 |

## Files Affected in Old Code

| File path                                                    | Expected change                                                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/components/UI/Predict/controllers/PredictController.ts` | Replace all internal logic with delegation. Writes/session/readiness forward to the new services via messenger; reads forward to read services. |
| `app/core/Engine/controllers/predict-controller/index.ts`    | Update instantiation. New `PredictController` is the composition root; each new service registers as its own Engine.context entry alongside it. |

## Acceptance Criteria

- The new `PredictController` exposes only `initialize` and `destroy`. No proxy methods, no Redux state slice.
- `initialize()` is transactional and fail-closed: tests prove that any construction failure tears the partially-built graph back down without leaks.
- The six services are first-class `Engine.context` entries, each owning its own state (where applicable) and registering its own messenger actions. `predictAnalytics` is constructed as a helper and injected; it is **not** registered as an Engine.context entry.
- The old `PredictController` is a pure shim with zero internal business logic, forwarding all calls to the new services via messenger and synthesizing its legacy state slice from new service slices.
- All existing Predict features continue to work in the app using the old UI and hooks.
- No regressions in data fetching, trading, portfolio management, or Account Readiness gating.
- Composition-root tests verify bootstrap and teardown only, not method delegation.

## Estimated PRs

- 1-2 PRs total.
  1. New `PredictController` composition root, init functions for each service, Engine wiring.
  2. Old controller delegation shim, state synthesis from new service slices.
