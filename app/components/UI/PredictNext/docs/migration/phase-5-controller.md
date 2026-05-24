# Phase 5: New Controller

## Goal

Build the new `PredictController` as a thin orchestrator for write operations, lifecycle, subscriptions, and session state. It composes the services from Phases 3 and 4, but read queries should continue to go directly through `MarketDataService` and `PortfolioService` rather than through the new controller. Make the old `PredictController` a translation shim that forwards writes/session operations to the new controller and delegates reads to the new read services. At the end of this phase, the old controller contains no business logic — only legacy-to-canonical mapping, forwarding, state publication, and deletion notes.

## Prerequisites

- Phase 3 (Read Services) and Phase 4 (Write Services) complete.
- All six services (`MarketDataService`, `PortfolioService`, `TradingService`, `TransactionService`, `LiveDataService`, `AnalyticsService`) are fully implemented and tested.

## Deliverables

- New PredictController in `app/components/UI/PredictNext/controller/PredictController.ts`.
- New controller messenger types in `app/components/UI/PredictNext/controller/types.ts`.
- Updated old `PredictController` in `app/components/UI/Predict/controllers/PredictController.ts` acting as a delegation shim.
- Controller unit tests in `app/components/UI/PredictNext/controller/PredictController.test.ts`.

## Step-by-Step Tasks

1. Define the new controller messenger and state types in `app/components/UI/PredictNext/controller/types.ts`.
   - Narrow the action and event surface to only what the new architecture requires.
   - Use canonical types for all state and event payloads.

2. Implement the new `PredictController` in `app/components/UI/PredictNext/controller/PredictController.ts`.
   - Inject services via the constructor.
   - Implement the core write/lifecycle orchestration methods (~10 methods):
     - `previewOrder(params)`: delegates to `TradingService`
     - `placeOrder(params)`: delegates to `TradingService`
     - `cancelOrder(orderId)`: delegates to `TradingService`
     - `selectPaymentToken(token)`: delegates to `TradingService` or updates session state
     - `deposit(params)`: delegates to `TransactionService`
     - `withdraw(params)`: delegates to `TransactionService`
     - `claim(params)`: delegates to `TransactionService`
     - `subscribe(channel, params)`: delegates to `LiveDataService`
     - `initialize()`: initializes services and session state
     - `destroy()`: tears down subscriptions and service state
   - Do not add `getEvents`, `getEvent`, or `getPortfolio` to the new controller unless a lifecycle/write flow specifically needs them. Read hooks use the read services directly through BaseDataService/messenger.
   - Ensure the controller remains a thin coordinator with minimal logic of its own.

3. Update the old `PredictController` to delegate to the new controller.
   - Import the new controller and the translation mappers from `PredictNext/compat/mappers.ts`.
   - For every public method in the old controller:
     - Map incoming legacy arguments to canonical types.
     - Forward write/session methods to the new controller.
     - Forward read methods to `MarketDataService` or `PortfolioService`.
     - Map canonical results back to legacy types.
     - Return the legacy result to the caller.
   - Update the old controller's state by subscribing to the new controller's events and mapping the payloads back to the old state shape.

4. Update Engine initialization in `app/core/Engine/index.ts` (or the relevant controller setup file).
   - Ensure both controllers are instantiated correctly if they need to coexist, or switch the Engine to use the new controller if the messenger interface is compatible.
   - Typically, keep the old controller as the primary Engine-registered controller to avoid breaking external consumers until Phase 6.

5. Write unit tests for the new controller.
   - Focus on verifying that the controller correctly calls the underlying services.
   - Do not duplicate service logic tests; use mocks for all services.

## Files Created

| File path                                                            | Description                                      | Estimated lines |
| -------------------------------------------------------------------- | ------------------------------------------------ | --------------: |
| `app/components/UI/PredictNext/controller/PredictController.ts`      | New thin orchestrator controller                 |         150-250 |
| `app/components/UI/PredictNext/controller/types.ts`                  | Messenger and state types for the new controller |          60-100 |
| `app/components/UI/PredictNext/controller/index.ts`                  | Controller barrel export                         |            5-10 |
| `app/components/UI/PredictNext/controller/PredictController.test.ts` | Unit tests for the new controller                |         120-200 |

## Files Affected in Old Code

| File path                                                    | Expected change                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `app/components/UI/Predict/controllers/PredictController.ts` | Replace all internal logic with delegation to the new PredictNext controller. |
| `app/core/Engine/controllers/predict-controller/index.ts`    | Update instantiation logic if necessary.                                      |

## Acceptance Criteria

- The new `PredictController` implements the ~10 core write/lifecycle methods using injected services.
- The old `PredictController` is a pure shim with zero internal business logic, forwarding writes/session calls to the new controller and reads to the read services via the translation layer.
- All existing Predict features continue to work perfectly in the app using the old UI and hooks.
- No regressions in data fetching, trading, or portfolio management.
- Controller tests verify delegation and orchestration only.

## Estimated PRs

- 1-2 PRs total.
  1. New controller implementation and tests.
  2. Old controller delegation switch.
