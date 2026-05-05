# PoC: Controller-Contract Testing

A working demo of three layers that catch controller/component integration
bugs in jest, instead of pushing them out to e2e.

## Strategy at a glance

![Test coverage matrix: which test type exercises which layer of the stack](docs/coverage.svg)

The architecture stack runs top-to-bottom on the left: external controller
package → messenger / app glue → engine state → selectors → component →
native runtime. Each test type on the right exercises a vertical slice of
that stack. A blue cell means "this test type runs real code at this
layer"; an empty cell means "mocked or out of scope."

The three new layers introduced by this PoC — fixture verification,
CV + contract, and integration — collectively cover everything except the
native runtime, in milliseconds. The e2e column is the only one that
pays the device/simulator/network cost, and it shrinks to "things that
genuinely need a device" (native modules, real Reanimated, real keychain).

## Why this complements CV tests rather than replacing them

This pattern is designed to **sit alongside** existing component-view tests,
not displace them. Each layer addresses something CV tests can't.

- **CV tests own UI behaviour under arbitrary state.** Reaching "loading=true
  with 3 cached widgets and a stale sync timestamp" takes 4 lines as a
  state literal; producing it via real action sequences takes pages of
  setup. CV tests give you cheap, isolated coverage of every visual
  variant — empty, loading, populated, error, partial. Integration tests
  can't substitute for that economically.
- **Failure isolation.** When a CV test fails, the bug is in the component
  or its selector. When an integration test fails, the bug could be
  anywhere in the controller → messenger → reducer → selector → render
  chain. Keeping CV tests preserves a sharp bisect for UI regressions.
- **CV tests today silently consume stale shapes.** The contract layer
  fixes the one real failure mode of CV tests — that mocks drift from
  reality. After this PoC ships, CV tests are *more* reliable, not less
  necessary.
- **Integration tests catch what CV tests structurally cannot:**
  transition bugs (loading flag flips in the wrong order), cycle bugs
  (button click → action → state change → re-render), and inter-controller
  interactions. CV-with-fixture covers static state; integration covers
  dynamic flow.
- **The fixture is the bridge.** A single committed JSON file is consumed
  by both the controller's own test (which produces it) and every
  downstream CV test. That shared artifact is what stops the controller
  team and the UI team from drifting against each other in the first
  place.

The pragmatic split: fixture + contract on top of every existing CV test
(cheap, 60–70% of the value), integration tests added selectively on the
high-risk surfaces where e2e currently catches bugs, CV tests untouched
elsewhere for everything UI-only.

## Bug classes this PoC aims to cover

The three layers collectively close a gap that today only e2e catches —
real bugs in the controller-app integration, where neither pure unit
tests nor CV-with-mocked-state can reproduce the failure. This section
lists the bug classes by example, leading with the actual perps
reverse-position bug that motivated the PoC.

### Worked example: the perps "reverse position" bug

A user holds a 1-BTC long. They place a 2-BTC market sell order — the
expected behaviour is "close the long, open a 1-BTC short." Instead the
operation fails with `ORDER_PRICE_REQUIRED`.

The bug lives at the seam between the close-position path and the
order-validation path in `app/controllers/perps/providers/HyperLiquidProvider.ts`:

- In `closePosition` (around line 4630–4670), the fallback logic that
  derives a price for validation only fires for `orderType === 'limit'`.
  For market orders without an explicit `currentPrice` argument,
  `priceForValidation` stays undefined.
- In `validateOrder` (around line 6745–6770), if `priceForValidation` is
  undefined the validator rejects the order with `ORDER_PRICE_REQUIRED`.
- A reverse position decomposes into close-then-open. The first leg is
  a `reduceOnly: true` market order — which is exactly the case the
  fallback doesn't handle. The whole operation aborts.

Why none of the existing tests catch it:

- The CV test `usePerpsFlipPosition.test.ts` mocks the *result* of
  `flipPosition` wholesale. The validator code path is never exercised.
  No state literal you could write would cause this bug to surface
  through a CV test, by construction.
- `HyperLiquidProvider.test.ts` (~5,000 lines) tests `validateOrder`
  and `closePosition` in isolation. Neither suite combines "size > current
  position" with "missing currentPrice on market order" — that scenario
  only exists at the integration boundary.
- E2E does catch it, but only after the build pipeline runs, on a real
  simulator, against a live HyperLiquid testnet. Cycle time: minutes.

What an integration test (Layer 3) would look like:

```ts
describe('PerpsController flip position', () => {
  it('reverses a long via market order without explicit currentPrice', async () => {
    const controller = buildPerpsForTest({ hyperLiquidSdk: mockSdk });

    await controller.placeOrder({
      symbol: 'BTC', isBuy: true, size: '1', currentPrice: 50_000,
    });

    const result = await controller.flipPosition({
      symbol: 'BTC', size: '2', orderType: 'market',
    });

    expect(result.success).toBe(true);
    expect(controller.state.positions.BTC).toMatchObject({
      side: 'short', size: '1',
    });
  });
});
```

Today this fails with `ORDER_PRICE_REQUIRED` in ~50ms. After the fix
(auto-fill `currentPrice` from `state.positions[symbol].markPrice` when
`reduceOnly: true` triggers a reversal), the same test passes and
guards against regression. Same test file the developer is already
iterating in. No simulator. No testnet. No e2e wait.

### Other bug classes the same approach catches

The perps case is one shape of "integration bug." The rollout addresses
several adjacent classes that have similar economics — expensive to
catch today, cheap once the layers are in place:

- **Controller emits a different state shape than the app expects.**
  Fixture-verification re-runs the scenario through the real controller
  and diffs against committed JSON. Catches both intentional shape
  changes (Renovate bumps `@metamask/foo-controller`) and accidental
  refactors that drop a field.
- **Component-test mocks have drifted from reality.** A CV test author
  hand-writes a state literal based on stale assumptions about the
  controller's shape. The contract layer (`assert*State`) rejects it
  at test setup with a one-line error pointing at the bad field.
- **Action sequence / transition bugs.** A `loading` flag flips false
  before data arrives; a button dispatches the wrong action; an
  `useEffect` runs against a stale closure during a state transition.
  All of these need real action dispatch through real controller code,
  which Layer 3 provides.
- **Inter-controller wiring bugs.** Two controllers share an event bus;
  the receiver subscribes to the wrong event name, or unsubscribes too
  early. Caught by an integration test that wires both controllers
  through their real messengers.
- **Selector composition over real state.** A reselect-style selector
  composes outputs from multiple controllers; the composition is wrong
  for state shapes that no single hand-rolled mock would have
  produced. Layer 3 generates the state by running the real controllers,
  which exposes the cases hand-rolled mocks miss.
- **Constructor / initialisation bugs.** The app instantiates the
  controller with a slightly-wrong config or wires up subscriptions in
  the wrong order. Caught when `buildXForTest()` mirrors the production
  bootstrap and the integration test uses it.
- **Upstream package version-bump regressions.** Renovate bumps a
  controller package; the new version subtly changes behaviour. The
  fixture diff appears in the bump PR; the integration tests run
  the real new code path. Catches behaviour drift at the moment of
  the bump rather than weeks later in QA.

The common thread: every one of these bugs lives in the *interaction*
between code units, not inside any single unit. Unit tests can't see
them by definition; CV tests with mocked state structurally can't
reproduce them; e2e catches them but at 100–1000× the cost. The three
layers together fill exactly that gap.

## Run it

```bash
cd poc/controller-contract-testing
../../node_modules/.bin/jest --config jest.config.js
```

7 tests pass across 3 suites. To regenerate fixtures after an intentional
controller change: `UPDATE_FIXTURES=1 npm test`.

## What's in here

```
src/
  WidgetController.ts        Generic example — real BaseController, state + async action + I/O dep
  widgetSelectors.ts         Selectors a UI would consume
  PerpsMini.ts               Stand-in for PerpsController — reproduces the real reverse-position bug
  perpsSelectors.ts          Selectors for a perps "Position summary" view
test/
  WidgetController.test.ts          Layer 1 (widget): behaviour + fixture verification
  widgetStateContract.ts            Layer 2 (widget): runtime contract + mockWidgetState()
  widgetView.view.test.ts           Layer 3 (widget) — CV test: fixture + contract checked
  widgetView.integration.test.ts    Layer 3 (widget) — integration test
  PerpsMini.test.ts                 Layer 1 (perps): behaviour + fixture verification
  perpsMiniContract.ts              Layer 2 (perps): runtime contract + mockPerpsMiniState()
  perpsView.view.test.ts            Layer 3 (perps) — CV test: fixture + contract checked
  perpsView.integration.test.ts     Layer 3 (perps) — reproduces the bug + asserts the fix
  __fixtures__/twoWidgetsAdded.json   Committed fixture (widget)
  __fixtures__/perpsBtcLong.json      Committed fixture (perps)
```

18 tests across 6 suites, all green. The perps integration suite both
reproduces the production `ORDER_PRICE_REQUIRED` bug AND asserts the
proposed fix — toggle in `PerpsMini` (`new PerpsMini({ applyReverseFix: true })`).

## What each layer catches

| Bug class                                                         | Caught by                                | Speed |
|-------------------------------------------------------------------|------------------------------------------|-------|
| Controller logic bug (e.g. forgot to set a field)                 | Controller unit test                     | ms    |
| Controller emits a different state shape than before              | Fixture-verification test                | ms    |
| Component-test mock drifted from real controller shape            | `mockWidgetState()` contract check       | ms    |
| Reverse-position style bug (size > position with missing price)   | Integration test (real ctrl, mocked I/O) | ms    |
| Action sequence / transition bug (loading flag flips wrong order) | Integration test                         | ms    |
| Inter-controller wiring (subscribed to wrong event)               | Integration test                         | ms    |
| Upstream package version bump changes behaviour                   | Fixture verify + integration             | ms    |
| Native module / device / RN runtime issue                         | e2e (still needed, but for less)         | s–min |

## Drift demo (already verified)

Comment out `priceCents: Math.round(fetched.price * 100)` in
`src/WidgetController.ts` and run the suite. Three tests fail, in the order
you'd want them:

1. `WidgetController — behaviour > adds a widget and derives priceCents from price`
   — the cheapest signal, controller-level.
2. `WidgetController — fixtures > emits the documented state for "two widgets added"`
   — tells you the contract changed; every downstream component test is
   now operating against stale assumptions.
3. `WidgetSummary integration > updates the total when a widget is added`
   — `selectWidgetTotalCents` returns `NaN`. This is the e2e-class bug,
   caught in jest in milliseconds.

Restore the line; all 7 tests pass.

---

## How to apply this to a real mobile controller

Pick CardController as a worked example (similarly applies to RewardsController,
PerpsController, etc.). Files are in `app/core/Engine/controllers/card-controller/`.

### Layer 1 — Shared fixtures

In `CardController.test.ts`, add a `describe("fixtures")` block that, after
running a representative scenario (e.g. "user authenticated, two cards
loaded"), serializes `controller.state` to
`app/core/Engine/controllers/card-controller/__fixtures__/twoCardsLoaded.json`
using the same `UPDATE_FIXTURES` pattern as the PoC. Commit those JSON files.

In existing card-related component tests
(`app/components/UI/Card/Views/CardHome/CardHome.test.tsx` and friends),
replace ad-hoc state literals like

```ts
{ engine: { backgroundState: { CardController: { ...handRolled } } } }
```

with a fixture loader:

```ts
import twoCardsLoaded from '../../../../core/Engine/controllers/card-controller/__fixtures__/twoCardsLoaded.json';

renderWithProvider(<CardHome />, {
  state: { engine: { backgroundState: { CardController: twoCardsLoaded } } },
});
```

### Layer 2 — Contract in `renderWithProvider`

Add a contract module next to each controller, e.g.
`app/core/Engine/controllers/card-controller/state-contract.ts`, exporting
an `assertCardControllerState` function. Either hand-roll it (~30 lines per
controller, as in this PoC) or adopt `zod` and derive it from the real
state type.

Then patch `app/util/test/renderWithProvider.tsx` so that, in test mode,
each known controller slice in `providerValues.state.engine.backgroundState`
is run through its `assert*State` function before the store is built. A
mock with the wrong shape fails on render, not on first selector hit.

### Layer 3 — Integration tests

A new convention: `*.integration.test.ts` colocated with each controller,
or under `app/core/Engine/integration/`. Pattern:

```ts
const messenger = new Messenger({ namespace: 'CardController' });
const controller = new CardController({
  messenger,
  cardSdk: mockCardSdk,        // mock only the SDK / network boundary
  storage: mockStorage,
});

await controller.authenticate(...);

const view = renderWithProvider(<CardHome />, {
  state: { engine: { backgroundState: { CardController: controller.state } } },
});
expect(view.getByText('Authenticated')).toBeTruthy();
```

These are still jest tests — no Detox, no simulator — but the controller's
real reducer / actions / state transitions all run. A bug like the perps
one your e2e found would fail here in ~50ms.

## Effort estimate to roll out across mobile

| Layer | Per-controller cost | Per-component-test cost | Notes |
|-------|--------------------:|------------------------:|-------|
| 1: fixtures | ~30 min (one fixture-gen test, 2-3 scenarios) | ~5 min (swap literal for import) | Fixtures are committed JSON, reviewed in PRs |
| 2: contract | ~1-2 h (write `assert*State` once, plus `renderWithProvider` patch — done once for whole repo) | 0 (transparent) | Or ~half the time with zod/io-ts |
| 3: integration | ~2-4 h per controller for first 3 scenarios, ~1 h per scenario after | n/a | Highest-leverage: targets the bugs e2e currently owns |

Suggested rollout: pilot on one controller (Card or Rewards) end-to-end,
measure how many bugs the integration tests catch over a sprint, then
prioritise the rest by how often e2e catches integration bugs there today.
