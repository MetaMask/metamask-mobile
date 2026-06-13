# tests/integration/ — AGENTS.md

Agent index for **integration tests** (`app/**/*.integration.test.ts`). Jest tests that exercise real controller / provider / service code with the I/O boundary mocked. Pointers only; details live in the canonical skill, the strategy doc, and references below.

---

## Scope

- **integration tests** — `app/**/*.integration.test.ts`. Tests that instantiate real controllers / providers / services and only mock the I/O boundary (SDK clients, network, native modules, keyring, websocket subscriptions). Targeted at the bug class that today only e2e catches: bugs at the seam between controller behaviour and the app, where each piece works in isolation. Consume the [framework](#framework) (per-domain harnesses, dedicated jest config).

---

## Why this exists

Unit tests test pieces in isolation; component-view (CV) tests mock the controller; e2e exercises the whole stack but is slow and flaky. **Integration tests** run real controller code against mocked I/O — same speed as unit tests, catches the bugs CV tests structurally can't see (transition bugs, multi-step flows, validation seams, upstream behaviour drift).

The point is **not** "find bugs CV missed." It is "every flow a user can trigger has a deterministic ~50ms test that proves it works end-to-end through real controller code." Bug-finding falls out of that as a side effect.

For the full strategy — four-layer model, cost / efficiency / refactor-sensitivity tables, perps coverage plan, and the six-phase rollout — see [`STRATEGY.md`](STRATEGY.md). For the per-use-case layer assignments that drive the perps work, see [`perps-use-cases.md`](perps-use-cases.md). For coverage targets and bug-tracking mechanisms, see [`coverage-and-tracking.md`](coverage-and-tracking.md).

---

## Distinction from other test layers {#layers}

| Layer           | What's REAL                                                    | What's MOCKED                                             | Lives in                                                   |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| **Unit**        | One function under test                                        | Everything else                                           | `app/**/*.test.ts`                                         |
| **CV**          | Component, selectors, Redux state                              | Engine + select native modules                            | `app/**/*.view.test.tsx` (uses `tests/component-view/`)    |
| **Integration** | Controller, services, providers, validation, state transitions | I/O boundary (SDK, wallet, subscriptions, native modules) | `app/**/*.integration.test.ts` (uses `tests/integration/`) |
| **E2E**         | Everything including native runtime                            | Almost nothing                                            | `e2e/...` Detox flows                                      |

Integration tests **complement** CV tests, not replace them. CV owns UI variant rendering + accessibility + theming + component-level interactions. Integration owns controller wiring + validation seams + state transitions + multi-step flows. There is no overlap by construction; each layer asserts on its own surface.

If a test wants to mock anything inside the REAL list above, it's a unit test or a CV test — move it to `*.test.ts` or `*.view.test.tsx` and follow that layer's conventions, not the integration ones.

---

## Framework {#framework}

The integration test framework is the code and conventions in `tests/integration/`. It provides:

- **Per-domain harnesses** — one file per controller / feature. Each owns the standard `jest.mock(...)` declarations for the I/O boundary AND a `build<Domain>IntegrationHarness()` factory that returns a real instance + handles to the mocks.
- **Convention** — test files import the harness; the import side effect triggers the jest.mock hoisting; the named import is the factory. No setup boilerplate per test.
- **Dedicated jest config** — `jest.config.integration.js` runs the suite. Tests are matched by `*.integration.test.ts?(x)`.

Tests **must** follow the rules below: real controller code is exercised; only the I/O boundary is mocked; tests assert on observable outcomes (state, selector output, return values) and not on mock calls except where verifying a side effect is the point of the test.

### Framework structure {#framework-structure}

```
tests/integration/
├── AGENTS.md                  ← this file
├── STRATEGY.md                ← four-layer strategy + comparison tables + rollout plan
├── coverage.svg               ← which test type runs real code at which layer (diagram)
├── coverage-and-tracking.md   ← coverage targets per layer + bug-tracking mechanisms
├── perps-use-cases.md         ← every perps use case → primary test layer
└── harnesses/
    ├── perps.ts               ← Shape A: provider-level harness
    ├── perps-flow.ts          ← Shape B: hook-flow harness
    └── perps-component.tsx    ← Shape C: rendered-component harness
```

The actual test files live next to the code they test, named `<feature>.integration.test.ts`.

### Harness pattern {#framework-harness}

Every domain harness (perps, card, etc.) follows the same shape:

1. **`jest.mock(...)` declarations** at the top — the standard set for the I/O boundary services that domain depends on. These hoist to the top of the test file when the harness is imported.
2. **Imports** of the real production code (the controller class, the services it depends on).
3. **`build<Domain>IntegrationHarness(options)` factory** that returns `{ instance, mocks, ...helpers }`.
4. **Header comment** documenting the REAL/MOCKED split — what production code runs, what services are mocked, why.

When the harness pattern doesn't fit a particular flow, that's a signal to **extend the harness** (add a helper, expose a new mock, parameterise differently) — not to bypass it with one-off `jest.mock` calls in the test file. See [`.agents/skills/integration-test/references/harness-extension.md`](../../.agents/skills/integration-test/references/harness-extension.md).

### Mocks {#framework-mocks}

The harness mocks the I/O boundary. For perps that means `HyperLiquidClientService`, `HyperLiquidWalletService`, `HyperLiquidSubscriptionService`, `TradingReadinessCache`, `PerpsStreamManager`, and the `hyperLiquidValidation` utility module. The class methods on `HyperLiquidProvider` itself (including `validateOrder`) are NOT mocked — that's where production bugs live.

No `jest.mock` calls beyond what the harness declares are allowed in `*.integration.test.ts` files. If a test seems to need one, the right move is to extend the harness, not bypass it.

---

## Per-domain harnesses

### Perps — [`harnesses/perps.ts`](harnesses/perps.ts)

- **Real:** `HyperLiquidProvider` (mobile), all of its order / close / validation logic, asset-map lookups, in-memory state transitions
- **Mocked:** `HyperLiquidClientService`, `HyperLiquidWalletService`, `HyperLiquidSubscriptionService`, `TradingReadinessCache`, `PerpsStreamManager`, `hyperLiquidValidation` utility module
- **Factory:** `buildPerpsIntegrationHarness({ isTestnet?, assetMapping?, cachedPrices? })`
- **Returns:** `{ provider, setCachedPrice, mocks: { client, wallet, subscription } }`
- **Use cases the harness covers:** see [`perps-use-cases.md`](perps-use-cases.md) for the full enumeration

### Perps Flow — [`harnesses/perps-flow.ts`](harnesses/perps-flow.ts)

- **Shape:** B — hook-flow harness built on Shape A
- **Real:** `usePerpsTrading` consumers, `TradingService`, `HyperLiquidProvider`, validation and order/state transitions
- **Mocked:** Shape A I/O mocks plus `app/core/Engine` as a thin `PerpsController` shim and `usePerpsNetworkManagement`
- **Factory:** `buildPerpsFlowHarness({ isTestnet?, assetMapping?, cachedPrices? })`
- **Returns:** `{ harness, tradingService }`, where `harness` is the Shape A provider harness
- **Use when:** a hook call should prove the user-facing flow reaches the real `TradingService`/provider chain without rendering UI

### Perps Component Flow — [`harnesses/perps-component.tsx`](harnesses/perps-component.tsx)

- **Shape:** C — rendered-component harness built on Shape B
- **Real:** perps React components, Redux selectors, stream/provider contexts, `usePerpsTrading` → Shape B Engine shim → real `TradingService`/provider
- **Mocked:** Shape A/B I/O mocks, native rendering/runtime modules, toast ref, confirmation/payment app surface that is outside perps trading logic
- **Factory:** `buildPerpsComponentHarness({ isTestnet?, assetMapping?, cachedPrices? })`
- **Returns:** `{ renderWithFlow, renderScreenWithFlow, harness, tradingService, mocks, teardown }`
- **Use when:** the rendered button press is the integration surface, e.g. `PerpsOrderView` place-order or `PerpsFlipPositionConfirmSheet` reverse-position. Prefer CV tests for pure UI variants that do not need real controller code.

Add a new harness when the integration test surface for a domain is non-trivial enough to warrant reusable setup (3+ tests across the domain). For one-off tests, call the existing harness or inline the setup.

---

## How to write an integration test

```ts
// app/path/to/<feature>.integration.test.ts
import { buildPerpsIntegrationHarness } from '../../../../../tests/integration/harnesses/perps';
import { PERPS_ERROR_CODES } from '../../../../controllers/perps/perpsErrorCodes';

describe('Perps — open a long position', () => {
  it('opens a long market order', async () => {
    const { provider } = buildPerpsIntegrationHarness();

    const result = await provider.placeOrder({
      symbol: 'BTC',
      isBuy: true,
      size: '0.1',
      orderType: 'market',
      currentPrice: 50_000,
    });

    expect(result.success).toBe(true);
  });
});
```

To customise a mock for a specific test:

```ts
const { provider, mocks } = buildPerpsIntegrationHarness();
mocks.subscription.getCachedPrice.mockReturnValueOnce('60000');
```

For the full skill — golden rules, decision tree, file naming, AAA structure, what NOT to do — see [`.agents/skills/integration-test/SKILL.md`](../../.agents/skills/integration-test/SKILL.md).

### Run the tests

```bash
# A single integration test
yarn jest -c jest.config.integration.js app/components/UI/Perps/hooks/usePerpsFlipPosition.integration.test.ts --runInBand --silent --coverage=false

# All integration tests
yarn jest -c jest.config.integration.js
```

---

## Adding a new domain harness

1. Create `tests/integration/harnesses/<domain>.ts`.
2. At the top: `jest.mock(...)` for every I/O-boundary service that domain depends on.
3. Import the real production code.
4. Export a `build<Domain>IntegrationHarness(options) → { instance, mocks }` factory.
5. Document the REAL/MOCKED split in a header block (use `harnesses/perps.ts` as the template).
6. Add a section to this AGENTS.md under "Per-domain harnesses".
7. (Optional) Add a per-domain use-case file if there's a planned coverage rollout (e.g. `card-use-cases.md`).

For full guidance, see [`.agents/skills/integration-test/references/harness-extension.md`](../../.agents/skills/integration-test/references/harness-extension.md).

---

## Canonical skill (Mandatory)

Links to the skill content:

- [`.agents/skills/integration-test/SKILL.md`](../../.agents/skills/integration-test/SKILL.md) — Full workflow, decision tree, golden rules
- [`.agents/skills/integration-test/references/writing-tests.md`](../../.agents/skills/integration-test/references/writing-tests.md) — Test structure, scenarios, assertions
- [`.agents/skills/integration-test/references/harness-extension.md`](../../.agents/skills/integration-test/references/harness-extension.md) — Adding or extending a domain harness
- [`.agents/skills/integration-test/references/reference.md`](../../.agents/skills/integration-test/references/reference.md) — Run commands, self-review checklist, diagnosing failures, what NOT to do

---

## Strategy documents

- [`STRATEGY.md`](STRATEGY.md) — Four-layer testing strategy. Layer responsibilities, comparison tables (cost / efficiency / refactor sensitivity), perps coverage plan, six-phase rollout.
- [`perps-use-cases.md`](perps-use-cases.md) — Every perps user-facing flow mapped to its primary test layer. The authoritative driver for what gets tested where during the perps rollout.
- [`coverage-and-tracking.md`](coverage-and-tracking.md) — Per-layer coverage targets and bug-tracking mechanisms (CI tagging, pre/post comparison, mutation testing). What to measure, how to measure it.
- [`coverage.svg`](coverage.svg) — Diagram showing which test type runs real code at each layer of the stack.
