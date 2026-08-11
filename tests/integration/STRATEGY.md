# Integration testing strategy — combined four-layer approach

Shared plan for testing Mobile features using each test layer for what it uniquely covers — happy paths first, no overlap, no gaps. Domain-specific matrices and rollouts live beside each harness under `[harnesses/<domain>/](harnesses/)`.

## TL;DR

Four layers, each owning what no other can cover cheaply:

- **E2E** — real device, real keychain, real network. Owns native runtime concerns only.
- **Integration** — real controller / provider / service, mocked I/O. Owns public action happy paths + main rejection paths through real code.
- **CV** — real component render, mocked Engine. Owns UI variants and visual concerns.
- **Unit** — pure functions. Owns business logic correctness.

The point of Integration is _not_ "find bugs CV missed." It's "every flow a user can trigger has a deterministic ~50ms test that proves it works end-to-end through real controller (or equivalent) code." Bug-finding falls out of that as a side effect.

Each domain under `harnesses/<domain>/` owns its **use-case matrix** (flows → primary layer) and any domain rollout notes. This file only describes the shared layer model and folder convention.

## Strategy at a glance

Coverage matrix: which test type runs real code at which layer of the stack

Read top-to-bottom on the left for the architecture stack, left-to-right on the top for the test type. A blue cell means "this test type runs real code here"; an empty cell means "out of scope or mocked." The four layers stack so that anything reachable in jest stays in jest, and E2E only owns the bottom row (native runtime).

## Integration harness shapes (shared)

Harness shapes are additive. Each exists for a different failure class, not as a replacement for the previous shape. Domains implement the shapes they need (not every domain needs Shape C).

| Shape                         | What runs real                                           | Typical I/O / shell mocks                                   | Best for                                                          |
| ----------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| **A** — controller / provider | Domain controller, provider, or service under test       | SDK, fetch, RPC, websocket, native modules                  | Contract / validation / state-transition bugs at the I/O boundary |
| **B** — flow                  | Shape A + entry hook or orchestration that calls into it | Shape A mocks + Engine / nav / analytics shell as needed    | Hook → service/controller flow bugs without rendering UI          |
| **C** — rendered component    | Shape B + real React UI for that domain                  | Shape A/B mocks + native render / out-of-scope app surfaces | User click must prove it reaches real domain logic                |
| **D** (future)                | Fuller controller / messenger / app fixture              | Still mock external I/O                                     | Orchestration bugs that intentional Shape B/C shims bypass        |

Shape B/C may mock documented app-shell glue **inside the harness only**; tests still do not add one-off `jest.mock(...)`. Shape C is reserved for flows where the rendered interaction is part of the bug surface; CV still owns pure UI variants.

During a PoC, side-by-side Shape A/B/C tests may cover a similar flow to show what each shape catches. Long-term, the domain use-case matrix assigns **one primary owner** per use case and keeps secondary tests only when they prove a unique concern at another boundary.

Domain-specific shape tables (e.g. which perps classes are real vs shimmed) live in that domain's strategy doc — see `[harnesses/perps/STRATEGY.md](harnesses/perps/STRATEGY.md)`.

## Layer responsibilities — what each one uniquely covers

| Layer           | Owns (uniquely)                                                                                                                                                                                               | Excludes (cheaper elsewhere)                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **E2E**         | Native module init · real wallet signing · real keychain unlock · real network calls · chain switching across native re-init                                                                                  | Validation / controller logic reachable with mocked I/O · UI variants · pure calculations |
| **Integration** | Controller-app wiring · validation seams · state transitions across actions · multi-controller interactions · upstream package behaviour drift · targeted rendered flows that must reach real controller code | Visual variants · broad UI layout assertions · pure functions · device behaviour          |
| **CV**          | UI variant rendering · accessibility · theming · keyboard/focus · component-level interactions                                                                                                                | Anything requiring real controller code · cross-controller behaviour · native modules     |
| **Unit**        | Pure function correctness · edge cases (zero, NaN, big numbers, precision) · selector composition over hand-rolled state                                                                                      | Anything stateful or async · anything requiring the controller machinery                  |

## Comparison — cost & efficiency by bug class

Each row is a kind of bug. The cell shows the cheapest layer that can catch it, and what it costs.

| Bug class                                       | Cheapest layer      | Per-test cost | Speed  | Why                                                 |
| ----------------------------------------------- | ------------------- | ------------- | ------ | --------------------------------------------------- |
| Pure calculation wrong                          | Unit                | ~15 min       | ~5ms   | No state, no async.                                 |
| Public controller / provider action breaks      | Integration         | ~30 min       | ~50ms  | Real action through real code; CV mocks it away.    |
| Validation bug at the seam between two methods  | Integration         | ~30 min       | ~50ms  | Each method correct alone, broken together.         |
| Component renders wrong layout for a state      | CV                  | ~30 min       | ~20ms  | Variant coverage; real actions cost 5–10× more.     |
| Component handles loading/error/empty states    | CV                  | ~30 min       | ~20ms  | Same — variant coverage.                            |
| Button click triggers wrong controller action   | Integration Shape C | ~45 min       | ~100ms | Renders the button but keeps the real domain chain. |
| Native module init fails on cold launch         | E2E                 | ~1 day        | ~30s   | No other layer touches native code.                 |
| Real wallet signing flow                        | E2E                 | ~1 day        | ~60s   | Needs real keychain + native bridge.                |
| Multi-step user flow (action → action → action) | Integration         | ~1 hour       | ~100ms | Real actions and state transitions; UI optional.    |
| Upstream package version-bump regression        | Integration         | ~0 (existing) | ~50ms  | Real package code runs on the bump PR.              |

## Comparison — refactor sensitivity

| Refactor                                | Unit       | CV                  | Integration             | E2E                 |
| --------------------------------------- | ---------- | ------------------- | ----------------------- | ------------------- |
| Rename a pure function                  | Some break | None                | None                    | None                |
| Rename a controller method              | None       | None                | **Many break**          | None                |
| Split a controller into two             | None       | None                | **Harness surgery**     | None                |
| Add a new field to controller state     | None       | Some break (mocks)  | Some break (assertions) | None                |
| Move a button on screen                 | None       | **Break**           | None                    | **Break**           |
| Redesign a UI flow                      | None       | **Wholesale break** | None                    | **Wholesale break** |
| Bump upstream package, behaviour change | None       | None                | **Break (good catch)**  | Maybe (delayed)     |
| Native module API change                | None       | None                | None                    | **Break**           |

Each layer is robust to refactors that don't affect what it covers. Integration is sensitive to internal code structure (its job); CV and E2E are sensitive to UI structure (theirs).

## Coverage targets (useful, not vanity)

100% integration coverage is the wrong goal — diminishing returns hit hard past ~85%. Target **per-layer**, not aggregate:

| Layer                            | Target           | Rationale                                          |
| -------------------------------- | ---------------- | -------------------------------------------------- |
| Controllers, providers, services | 85–95%           | Highest-risk surfaces, easiest to integration-test |
| Selectors                        | 95–100%          | Every integration test reads through them          |
| User-flow hooks (entry points)   | ~80%             | One integration happy path per hook                |
| Components                       | 50–70%           | Rest covered by CV for variants                    |
| Utilities / pure functions       | 0% (integration) | Use unit tests                                     |
| Native module wrappers           | 0% (integration) | Isolate and unit-test wrappers                     |

Coverage % means a line ran — not that the test was meaningful. Optimise for useful assertions, not a dashboard number.

## Measurement (optional / future)

If you need leading indicators that integration is paying off:

- **CI failure tagging** — label PRs where an `*.integration.test.ts` failed; aggregate weekly.
- **Pre/post comparison** — classify bugs that would have been caught by integration before vs after a domain rollout.
- **Quarterly mutation** — reintroduce a known controller bug on a branch; confirm integration still catches it.

Track `it.skip` counts separately (skipped tests are worse than no tests). Prefer consistent failures over flaky noise when counting "catches."

## Domain strategy convention

Every domain folder under `harnesses/<domain>/` should include:

1. **Harness files** (`*.ts` / `*.tsx`) with a REAL/MOCKED header — inventory in `[AGENTS.md](AGENTS.md)`.
2. **A use-case matrix** (`*-use-cases.md` or equivalent) mapping user-facing flows → primary test layer. This is the authoritative driver for what gets tested where in that domain.
3. **Optional domain strategy** (`STRATEGY.md` or sections in the use-case doc) for rollout phases, shape tables, and estimates that are domain-specific.

### New domain checklist

When adding `harnesses/<domain>/`:

| Step | Artifact                                         | Required?                                              |
| ---- | ------------------------------------------------ | ------------------------------------------------------ |
| 1    | Harness file(s) + REAL/MOCKED header + factory   | Yes                                                    |
| 2    | Use-case matrix (`*-use-cases.md` or equivalent) | Yes                                                    |
| 3    | Inventory entry in `[AGENTS.md](AGENTS.md)`      | Yes                                                    |
| 4    | Row in this file’s domain table                  | Yes                                                    |
| 5    | Domain `STRATEGY.md`                             | Only if rollout / shape detail does not fit the matrix |

Do **not** put domain rollout plans or coverage estimates at the `tests/integration/` root. Do **not** create a separate checklist file.

| Domain             | Use-case matrix                                                                      | Domain strategy                                                    |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Perps              | `[harnesses/perps/perps-use-cases.md](harnesses/perps/perps-use-cases.md)`           | `[harnesses/perps/STRATEGY.md](harnesses/perps/STRATEGY.md)`       |
| Networks / Core UX | `[harnesses/networks/core-ux-use-cases.md](harnesses/networks/core-ux-use-cases.md)` | `[harnesses/networks/STRATEGY.md](harnesses/networks/STRATEGY.md)` |

## Where things live

```
tests/integration/                           ← shared framework (mirrors tests/component-view/)
├── AGENTS.md                                  framework rules + per-domain harness inventory
├── STRATEGY.md                                this file (shared four-layer model)
├── coverage.svg                               shared coverage diagram
└── harnesses/
    ├── <domain>/
    │   ├── <domain>.ts                        Shape A (and/or flow/component harnesses)
    │   ├── *-use-cases.md                     required: flows → primary layer
    │   └── STRATEGY.md                        optional: domain rollout / shape detail
    ├── perps/                                 (use-cases + STRATEGY + harnesses)
    └── networks/                              (use-cases + STRATEGY + harnesses)

app/**/*.integration.test.ts?(x)             ← tests live beside production code
jest.config.integration.js                   ← yarn jest -c jest.config.integration.js
```

See `[AGENTS.md](AGENTS.md)` for harness inventory and the central `[integration-test` skill](https://github.com/MetaMask/skills/tree/main/domains/testing/skills/integration-test) for authoring rules.

Run a single integration test:

```bash
yarn jest -c jest.config.integration.js <path-to>.integration.test.ts
```

Run all integration tests:

```bash
yarn jest -c jest.config.integration.js
```
