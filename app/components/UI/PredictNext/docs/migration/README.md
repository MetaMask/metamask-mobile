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

Inside-out migration: replace the internals while keeping the external interface unchanged, then replace the interface once the internals are proven.

- **Bottom-up through the stack.** The new adapter grows first. The old PolymarketProvider progressively delegates API calls to it. Then new services grow, and the old PredictController progressively delegates to them. By the time UI migration starts, the entire data stack is battle-tested with real production traffic.
- **Translation layer as the seam.** A `compat/` module in PredictNext handles bidirectional mapping between canonical types (`PredictEvent`, `PredictMarket`, `PredictOutcome`) and legacy types (`Market`, `Outcome`, `OutcomeToken`). The data shapes are structurally identical — only the naming differs. Old code delegates down to new code, new code returns canonical types, the translation layer renames fields back to old shapes for old consumers.
- **Zero UI disruption during data migration.** Phases 2 through 5 touch only the data stack. Old hooks, components, and views continue working unchanged because the old controller's public interface and state shape remain stable throughout.
- **Vertical UI slices after data is proven.** Phase 6 replaces UI one screen at a time. Each slice includes new hooks, new components, and a new view for that screen. By then, the entire data layer is already in production.
- **Every PR is shippable.** Users see zero behavior change during Phases 1 through 5. UI changes appear gradually during Phase 6 as screens switch one by one.
- **No shim or re-export layer.** Old code delegates directly to new code via imports. New code never imports old code. The translation layer is the only bridge, and it gets deleted in Phase 7.

### How it works at each level

```
Phase 2 — Adapter replaces provider internals:
  Old Provider method → calls New Adapter → gets canonical types → translates back to old types → returns

Phase 3-4 — Services replace controller internals:
  Old Controller method → calls New Service → gets canonical types → translates back to old state shape → publishes

Phase 5 — New Controller replaces old controller internals:
  Old Controller method → forwards to New Controller → translation at the boundary

Phase 6 — New UI replaces old UI:
  New View → New Hooks → New Controller → New Services → New Adapter
  (translation layer no longer needed for migrated screens)
```

Inside-Out Migration Order:

```text
┌──────────────────────────────────────────────────────────┐
│ Inside-Out Migration Order                               │
│                                                          │
│      ┌────────────────────────────────────────────┐      │
│      │ Phase 6: UI (Hooks, Components, Views)     │      │
│      │    ┌──────────────────────────────────┐    │      │
│      │    │ Phase 5: PredictController       │    │      │
│      │    │    ┌────────────────────────┐    │    │      │
│      │    │    │ Phase 3-4: Services    │    │    │      │
│      │    │    │    ┌──────────────┐    │    │    │      │
│      │    │    │    │ Phase 2:     │    │    │    │      │
│      │    │    │    │ Adapter      │    │    │    │      │
│      │    │    │    └──────────────┘    │    │    │      │
│      │    │    └────────────────────────┘    │    │      │
│      │    └──────────────────────────────────┘    │      │
│      └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

## 3. PredictNext/ Approach

- New architecture lives in `app/components/UI/PredictNext/`.
- Old code in `app/components/UI/Predict/` progressively delegates to PredictNext internals rather than being replaced all at once.
- A `PredictNext/compat/` module provides bidirectional type mappers between canonical and legacy types. This module is intentionally temporary and will be deleted in Phase 7.
- During the data migration (Phases 2 through 5), old UI code is completely untouched. Old hooks subscribe to the same old controller messenger events, receive the same old state shapes, and render the same old components.
- During the UI migration (Phase 6), each screen is rebuilt as a vertical slice using new hooks, components, and views that talk directly to the new controller. No screen ever mixes old and new hooks.
- External consumers outside the Predict feature switch imports during Phase 6 as each screen or widget becomes available in PredictNext. The main switch points are expected to include:
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

| Phase | Name                           | Goal                                                                     | Est. PRs | Dependencies |
| ----- | ------------------------------ | ------------------------------------------------------------------------ | -------- | ------------ |
| 1     | Foundation                     | Types, adapter interface, error model, translation layer                 | 2-3      | None         |
| 2     | Adapter & Provider Migration   | New PolymarketAdapter, old provider delegates API calls to it            | 3-5      | Phase 1      |
| 3     | Read Services                  | MarketDataService, PortfolioService, old controller delegates reads      | 3-4      | Phase 2      |
| 4     | Write Services                 | TradingService, TransactionService, LiveDataService, AnalyticsService    | 4-5      | Phase 2      |
| 5     | New Controller                 | New PredictController, old controller becomes pure translation shim      | 1-2      | Phases 3, 4  |
| 6     | UI Migration (Vertical Slices) | Hooks + components + views, one screen at a time                         | 8-12     | Phase 5      |
| 7     | Cleanup                        | Delete old code, rename PredictNext to Predict, remove translation layer | 1-2      | Phase 6      |

Note: Phases 3 and 4 can run in parallel because read services and write services are independent. Both depend on the adapter from Phase 2.

## 5. Parallel Work Streams

Parallel Work Streams:

```text
┌──────────────────────────────────────────────────────────┐
│ Parallel Work Streams                                    │
│                                                          │
│ Phase 1 (Foundation)                                     │
│      │                                                   │
│      ▼                                                   │
│ Split Streams ──────────────────────────┐                │
│      │                                  │                │
│ Stream A (Read Path)             Stream B (Write Path)   │
│ Phase 2 → Phase 3                Phase 2 → Phase 4       │
│      │                                  │                │
│      └────────────────┬─────────────────┘                │
│                       ▼                                  │
│               Phase 5 (Merge Point)                      │
│                       │                                  │
│                       ▼                                  │
│               Phase 6 (UI Migration)                     │
│                       │                                  │
│                       ▼                                  │
│               Phase 7 (Cleanup)                          │
└──────────────────────────────────────────────────────────┘
```

### Stream A: Read path

`Phase 1 → Phase 2 → Phase 3`

- Phase 1 defines the vocabulary and contracts.
- Phase 2 builds the adapter and hollows out the old provider.
- Phase 3 builds read services and hollows out the old controller's read methods.

### Stream B: Write path

`Phase 1 → Phase 2 → Phase 4`

- Phase 4 can start as soon as the adapter from Phase 2 is stable.
- Write services (trading, transactions, live data, analytics) are independent of read services.

### Merge point

`Phase 5`

- The new controller composes all six services from both streams.
- The old controller becomes a pure translation shim.

### UI stream

`Phase 5 → Phase 6`

- UI migration starts only after the full data stack is proven in production.
- Within Phase 6, different screens can be migrated in parallel by different developers.

### Final stream

`Phase 7`

- Cleanup starts after every routed screen and every external embed point has switched to PredictNext.

## 6. Risk Mitigation

- **Zero UI disruption during data migration.** Phases 2 through 5 do not touch any view, hook, or component file in old code. If a service extraction causes a regression, the failure is isolated to the data path and the old code can stop delegating with a one-line revert.
- **Translation layer is structurally trivial.** The canonical types and legacy types are isomorphic — same nesting, different names. The translation layer is field renames, not structural transformation, so the risk of data loss is minimal.
- **Incremental provider delegation.** Each adapter method is wired one at a time in the old provider. If one method causes issues, only that method reverts. The rest of the provider continues delegating.
- **Incremental controller delegation.** Same pattern: each controller method delegates to new services one at a time. Partial delegation is a stable intermediate state.
- **Feature work goes in old code.** During Phases 2 through 5, all new features are built in old Predict code. They automatically benefit from new internals because the old code delegates underneath. No confusion about where new code goes.
- **UI migration is per-screen.** Phase 6 migrates one screen at a time. Each screen switch is independently revertable. If the event details screen has issues, the event feed screen is unaffected.
- **Rollback at any phase.** Phases 1 through 5: stop delegating and revert PredictNext PRs. Phase 6: revert route switch for the affected screen. Phase 7: do not start until all screens are stable.

## 7. Definition of Done

- All routed Predict screens render from `app/components/UI/PredictNext/views/`.
- All external consumers switch away from `app/components/UI/Predict/`.
- All component view tests for Predict pass against the migrated views.
- Engine registration points instantiate the new Predict controller.
- No runtime imports from old `Predict/` remain.
- Translation layer (`PredictNext/compat/`) is deleted.
- `UBIQUITOUS_LANGUAGE.md` is complete and reflected in code symbols.
- `PredictNext/README.md` and `PredictNext/docs/*` describe the shipped architecture rather than the transitional one.

## 8. Naming Conversion Rules

The migration is not a file move only; it also corrects the domain model:

| Old term in `Predict/` | Canonical term in `PredictNext/` | Migration note                                               |
| ---------------------- | -------------------------------- | ------------------------------------------------------------ |
| `Market`               | `Event`                          | Old `PredictMarket` often represented a top-level event card |
| `Outcome`              | `Market`                         | Old outcome collections frequently map to binary markets     |
| `OutcomeToken`         | `Outcome`                        | Tradeable yes/no token becomes the new outcome concept       |

These conversions are handled by the `PredictNext/compat/` translation layer during Phases 2 through 5. They must be applied consistently in:

- `PredictNext/types/index.ts`
- service method names
- adapter method names
- hook return shapes
- component prop names
- navigation params
- analytics event payloads

## 9. Recommended PR Order

1. Phase 1 contracts, error model, and translation layer
2. Phase 2 adapter implementation and initial provider delegation
3. Phase 2 continued provider delegation (method by method, as many PRs as needed)
4. Phase 3 read services plus old controller read delegation
5. Phase 4 write services plus old controller write delegation (can parallel with 4)
6. Phase 5 new controller plus old controller becomes shim
7. Phase 6 vertical slice: event feed (home screen)
8. Phase 6 vertical slice: event details
9. Phase 6 vertical slice: portfolio sections
10. Phase 6 vertical slice: order flow
11. Phase 6 vertical slice: modals and remaining screens
12. Phase 6 external consumer import switches
13. Phase 7 deletion, rename, and final import cleanup

## 10. Review Expectations

- Review contracts first: `types/`, `adapters/types.ts`, `errors/`, `compat/`.
- Review delegation PRs by verifying that old behavior is preserved: same state shape, same messenger events, same hook return values.
- Review service extraction PRs by bounded context, not by file count.
- Review UI vertical slices as complete screen replacements: hooks, components, view, and component view tests in one reviewable unit.
- Prefer explicit temporary delegation comments in old code over hidden coupling.
- Do not merge a phase PR without the acceptance criteria from its phase document being met.
