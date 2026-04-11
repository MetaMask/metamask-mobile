# Phase 4: Controller

## Goal

Replace the 2,604-line legacy controller with a thin PredictNext orchestrator that delegates almost all work to the new services.

## Prerequisites

- Phases 2 and 3 complete.

## Deliverables

- `app/components/UI/PredictNext/controller/PredictController.ts`
- `app/components/UI/PredictNext/controller/PredictController.test.ts`
- Engine registration switched to the new controller

## Step-by-Step Tasks

1. Create the new controller module.
   - File: `app/components/UI/PredictNext/controller/PredictController.ts`.
   - Keep the public surface intentionally small, targeting roughly 10 methods.
   - Candidate controller methods:
     - `getEvents`
     - `getEvent`
     - `getPortfolio`
     - `previewOrder`
     - `placeOrder`
     - `deposit`
     - `withdraw`
     - `claim`
     - `subscribeLiveData`
     - `unsubscribeLiveData`
   - Any additional methods should exist only when required for route integration or transaction side effects.

2. Compose services through constructor injection.
   - Inject:
     - `MarketDataService`
     - `PortfolioService`
     - `TradingService`
     - `TransactionService`
     - `LiveDataService`
     - `AnalyticsService`
   - Avoid re-implementing business logic in the controller.
   - Keep controller state limited to what must be persisted or surfaced to Redux.

3. Define the PredictNext controller messenger types.
   - Export the messenger type from the new controller file or an adjacent `types.ts`.
   - Mirror the current wiring shape enough to fit Engine initialization patterns used by:
     - `app/core/Engine/controllers/predict-controller/index.ts`
     - `app/core/Engine/messengers/predict-controller-messenger/index.ts`
   - Narrow the allowed actions/events to what the services actually need.

4. Port only the state that still belongs in a controller.
   - Move long-lived persisted state such as account metadata if still needed.
   - Push transient state down into services whenever possible.
   - Keep selectors from Phase 5 in mind when deciding the final controller state shape.

5. Switch Engine initialization to the new controller.
   - Update:
     - `app/core/Engine/controllers/predict-controller/index.ts`
     - `app/core/Engine/messengers/predict-controller-messenger/index.ts`
     - `app/core/Engine/types.ts`
   - Instantiate the PredictNext controller while leaving routed UI on old hooks until Phase 5 and Phase 7 are ready.

6. Update Redux/background-state typing.
   - Ensure the new controller state is available where selectors and component view presets need it.
   - Review:
     - `app/reducers/*` only if the controller state shape requires typed updates,
     - `tests/component-view/presets/predict.ts` later in Phase 7.

7. Write a minimal controller test.
   - File: `app/components/UI/PredictNext/controller/PredictController.test.ts`.
   - Verify delegation only:
     - read calls forward to the correct data service,
     - write calls forward to the correct imperative service,
     - transaction events are routed to the appropriate service,
     - controller state updates remain slim and deterministic.

8. Keep route consumers on old hooks for the moment.
   - The production controller in Engine can switch before UI migration if the public behavior remains compatible.
   - If compatibility is not yet sufficient, land this phase behind a runtime flag or in a short-lived branch sequence.

## Files Created

| File path                                                            | Description                                | Estimated lines |
| -------------------------------------------------------------------- | ------------------------------------------ | --------------: |
| `app/components/UI/PredictNext/controller/PredictController.ts`      | Thin controller orchestrating six services |         180-260 |
| `app/components/UI/PredictNext/controller/PredictController.test.ts` | Delegation-focused controller tests        |         120-180 |
| `app/components/UI/PredictNext/controller/index.ts`                  | Controller barrel exports                  |            5-10 |

## Files Affected in Old Code

| File path                                                          | Expected change                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `app/core/Engine/controllers/predict-controller/index.ts`          | Switch import from old controller to `PredictNext/controller/PredictController` |
| `app/core/Engine/messengers/predict-controller-messenger/index.ts` | Point messenger typing to the new controller and adjust actions/events          |
| `app/core/Engine/types.ts`                                         | Keep Engine typing aligned with the new controller                              |
| `app/components/UI/Predict/controllers/PredictController.ts`       | No edits required if switch happens only in Engine wiring                       |

## Acceptance Criteria

- The new controller delegates almost all business logic to six services.
- Controller source size is closer to a coordinator than a monolith.
- Engine can instantiate the new controller successfully.
- Controller tests verify delegation paths instead of re-testing service logic.
- No routed screen is forced onto new hooks prematurely.

## Estimated PRs

- 1-2 PRs total.
  1. New PredictNext controller implementation and tests.
  2. Engine switch PR if reviewers prefer wiring changes to land separately.
