# PredictNext Migration Plan

## 1. Motivation

The Predict feature shipped fast. When it started, the product shape was unclear, the integration surface was unknown, and designs evolved as new designers joined. That speed was the right call at the time, but the codebase now carries the cost.

**What the current architecture looks like:**

- A **PredictController** with 2,600+ lines and 60+ public methods that grows with every feature.
- A **PolymarketProvider** with 2,000+ lines that mixes API calls, transaction building, caching, and data transformation in one file.
- **37 hooks** where many are thin wrappers around a single controller call. The buy flow alone requires importing 7 separate hooks that all talk about the same thing.
- **45 component directories** with multiple near-identical variants: 7 market card components, 6 bet button components, 6 skeleton components.
- **87,000 lines of test code** (2.38:1 test-to-source ratio) where 78% of test files duplicate the same mock setup. The controller test alone is 9,400 lines.
- **Inconsistent naming** that no longer matches the domain. What Polymarket and Kalshi both call an "event," our code calls a "market." What they call a "market," we call an "outcome."

**What this migration delivers:**

- **Deep modules with slim interfaces.** A PredictController with ~10 methods instead of 60+. Six focused services that each hide real complexity (state machines, caching, retry, WebSocket lifecycle) behind 3-5 method interfaces. Inspired by "A Philosophy of Software Design" by John Ousterhout.
- **A canonical data model** aligned with the industry (Event, Market, Outcome) and documented in a DDD ubiquitous language glossary that the whole team uses.
- **Composable UI.** Seven compound components replace 45 directories. One `EventCard` handles every variant internally. One `OutcomeButton` is the single place you bet in the entire app.
- **Modern data services.** Read-heavy services extend `BaseDataService` from `@metamask/base-data-service`, gaining built-in request deduplication, retry with circuit breaker, and shared cache between service layer and UI via TanStack Query. Custom caches like `GameCache` and `TeamsCache` are eliminated.
- **~85-90% test code reduction.** Component view tests (integration-level, real Redux, minimal mocking) replace hundreds of isolated unit tests. Service integration tests with a mock adapter replace thousands of lines of mock-heavy controller tests.
- **Clear module boundaries.** A single `index.ts` defines the public API. Internal modules (services, adapters, utils) are not exported. Other teams know exactly what they can import.
- **Provider-agnostic architecture.** Adding Kalshi (or any future provider) means implementing a ~15-method adapter interface. No service, hook, or component changes required.

The goal is not novelty. It is a codebase where a new team member can understand the Predict feature in a day, where adding a new provider takes a week instead of a quarter, and where the test suite runs fast and catches real bugs instead of breaking on every refactor.

## 2. Strategy

- Strangler fig migration: new code grows in `app/components/UI/PredictNext/`, old code shrinks in `app/components/UI/Predict/`.
- Bottom-up migration: data and orchestration move first, views move last.
- Every PR must be shippable, reviewable, and independently testable.
- External consumers make a clean cut with explicit import switches when a new module is ready.
- No shim, alias, or re-export layer between `Predict/` and `PredictNext/`.

## 3. PredictNext/ Approach

- New architecture lives in `app/components/UI/PredictNext/`.
- Existing production code in `app/components/UI/Predict/` remains the source of truth until a specific area is fully replaced.
- During the transition, new code is allowed to import old implementation details where that reduces risk, especially:
  - `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`
  - `app/components/UI/Predict/providers/polymarket/WebSocketManager.ts`
  - `app/components/UI/Predict/providers/polymarket/safe/*`
  - small pure utilities under `app/components/UI/Predict/utils/`
- External consumers outside the Predict feature should switch explicitly once the relevant `PredictNext/` screen or component is ready. The main switch points are expected to include:
  - `app/core/Engine/controllers/predict-controller/index.ts`
  - `app/core/Engine/messengers/predict-controller-messenger/index.ts`
  - `app/core/Engine/types.ts`
  - `app/core/NavigationService/types.ts`
  - `app/core/DeeplinkManager/handlers/legacy/handlePredictUrl.ts`
  - `app/components/Views/Homepage/Sections/Predictions/PredictionsSection.tsx`
  - `app/components/Views/Homepage/Sections/Predictions/components/PredictMarketCard.tsx`
  - `app/components/Views/TrendingView/sections.config.tsx`
  - `app/components/Views/Wallet/index.tsx`
  - `app/components/Views/WalletActions/WalletActions.tsx`
  - `app/components/Views/TradeWalletActions/TradeWalletActions.tsx`
  - `app/components/Views/BrowserTab/BrowserTab.tsx`
  - `tests/component-view/presets/predict.ts`
  - `tests/component-view/renderers/predict.tsx`
  - `tests/component-view/renderers/predictMarketDetails.tsx`
- Final cutover sequence:
  1. verify no production imports from old `Predict/` remain,
  2. delete `app/components/UI/Predict/`,
  3. `git mv app/components/UI/PredictNext/ app/components/UI/Predict/`,
  4. update the remaining external imports from `PredictNext` to `Predict`.

## 4. Phase Summary

| Phase | Name                | Goal                                                         | Est. PRs | Dependencies |
| ----- | ------------------- | ------------------------------------------------------------ | -------- | ------------ |
| 1     | Foundation          | Types, glossary, adapter interface, PredictError             | 2-3      | None         |
| 2     | Data Services       | MarketDataService, PortfolioService, messenger registration  | 3-4      | Phase 1      |
| 3     | Imperative Services | Trading, Transaction, LiveData, Analytics service extraction | 4-5      | Phase 1      |
| 4     | Controller          | Thin PredictController orchestrator                          | 1-2      | Phases 2, 3  |
| 5     | Hooks               | Consolidate 37 hooks into 7 deep hooks                       | 3-4      | Phase 4      |
| 6     | Components          | Build Tier 1 primitives and Tier 2 widgets                   | 5-7      | Phase 1      |
| 7     | Views               | Screen migration, route switches, component view tests       | 4-6      | Phases 5, 6  |
| 8     | Cleanup             | Delete old feature, rename folder, remove migration seams    | 1-2      | Phase 7      |

Note: Phases 2-3 and Phase 6 can run in parallel because service extraction depends on the canonical domain model, while component construction only needs the new types and ubiquitous language.

## 5. Parallel Work Streams

### Stream A: Data and orchestration

`Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5`

- Phase 1 defines the vocabulary and contracts.
- Phase 2 builds read/data services.
- Phase 3 extracts write and live-update services.
- Phase 4 composes those services behind a new controller.
- Phase 5 gives views a stable React interface.

### Stream B: UI primitives and widgets

`Phase 1 -> Phase 6`

- Phase 6 can start as soon as the `PredictEvent`, `PredictMarket`, `PredictOutcome`, `PredictPosition`, and `ActivityItem` types are stable.
- This stream should use mock data shaped from `PredictNext/types/index.ts`, not direct reads from controller state.

### Merge point

`Phase 7`

- Views need both the new hooks from Stream A and the new primitives/widgets from Stream B.

### Final stream

`Phase 8`

- Cleanup only starts after every routed screen and every external embed point has switched to `PredictNext/`.

## 6. Risk Mitigation

- Each phase has explicit acceptance criteria and should not proceed on partial completion.
- Old code remains functional throughout the migration; revertability is preserved until the final rename.
- `PredictNext/` may delegate to old provider/controller logic early in the migration to reduce blast radius.
- Route-by-route migration prevents a big-bang UI rewrite.
- Feature flags can gate new `PredictNext/views/*` route registration if rollout needs to be staged.
- Rollback strategy is simple for Phases 1-7: revert `PredictNext/` PRs and keep old `Predict/` active.
- Service extraction should favor adapter seams and deterministic unit tests before production route switches.

## 7. Definition of Done

- All routed Predict screens render from `app/components/UI/PredictNext/views/`.
- All external consumers switch away from `app/components/UI/Predict/`.
- All component view tests for Predict pass against the migrated views.
- Engine registration points instantiate the new Predict controller.
- No runtime imports from old `Predict/` remain.
- `UBIQUITOUS_LANGUAGE.md` is complete and reflected in code symbols.
- `PredictNext/README.md` and `PredictNext/docs/*` describe the shipped architecture rather than the transitional one.

## 8. Naming Conversion Rules

The migration is not a file move only; it also corrects the domain model:

| Old term in `Predict/` | Canonical term in `PredictNext/` | Migration note                                               |
| ---------------------- | -------------------------------- | ------------------------------------------------------------ |
| `Market`               | `Event`                          | Old `PredictMarket` often represented a top-level event card |
| `Outcome`              | `Market`                         | Old outcome collections frequently map to binary markets     |
| `OutcomeToken`         | `Outcome`                        | Tradeable yes/no token becomes the new outcome concept       |

These conversions must be applied consistently in:

- `PredictNext/types/index.ts`
- service method names
- adapter method names
- hook return shapes
- component prop names
- navigation params
- analytics event payloads

## 9. Recommended PR Order

1. Phase 1 contracts and error model
2. Phase 2 read/data services + registration
3. Phase 3 imperative services
4. Phase 4 thin controller + Engine switch
5. Phase 5 new hooks and hook consumers behind non-routed test surfaces
6. Phase 6 primitives/widgets in parallel
7. Phase 7 screen-by-screen route and consumer switches
8. Phase 8 deletion, rename, and final import cleanup

## 10. Review Expectations

- Review contracts first: `types/`, `adapters/types.ts`, `errors/`.
- Review extraction PRs by bounded context, not by file count.
- Keep route changes, service extraction, and large visual rewrites in separate PRs whenever possible.
- Prefer explicit temporary delegation comments over hidden coupling.
- Do not merge a phase PR without the acceptance criteria from its phase document being met.
