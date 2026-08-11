# Perps integration strategy

Domain rollout and shape detail for **perps**. Shared four-layer rules live in [`../../STRATEGY.md`](../../STRATEGY.md). Use-case → layer assignments live in [`perps-use-cases.md`](perps-use-cases.md).

## TL;DR

Integration for perps proves every user-triggerable trading flow through real provider / `TradingService` / (optionally) rendered UI, with SDK / wallet / websocket I/O mocked. Bug-finding (including reverse-position–class seams) falls out of covering those happy paths.

See [`perps-use-cases.md`](perps-use-cases.md) for the full enumeration of perps use cases mapped to layers.

## Perps integration harness shapes

The harness shapes are additive. Each one exists for a different failure class, not as a replacement for the previous shape.

| Layer of the stack                                                         | Shape A: provider      | Shape B: flow                     | Shape C: rendered component               | Future Shape D: real controller/app       |
| -------------------------------------------------------------------------- | ---------------------- | --------------------------------- | ----------------------------------------- | ----------------------------------------- |
| External controller package                                                | ✓                      | ✓                                 | ✓                                         | ✓                                         |
| Messenger / app glue                                                       | ✗                      | shimmed                           | shimmed                                   | ✓                                         |
| Engine state + reducers                                                    | ✗                      | partial                           | ✓ minimal Redux fixture                   | ✓ fuller app fixture                      |
| `HyperLiquidProvider`                                                      | ✓                      | ✓                                 | ✓                                         | ✓                                         |
| `TradingService` validation seams and multi-step flows like `flipPosition` | ✗                      | ✓                                 | ✓                                         | ✓                                         |
| SDK / wallet / websocket I/O                                               | mocked                 | mocked                            | mocked                                    | mocked                                    |
| Selectors                                                                  | ✗                      | whatever the hook reads           | ✓ real selectors against fixture state    | ✓ real selectors against fuller app state |
| Hook: `usePerpsTrading`                                                    | ✗                      | ✓                                 | ✓                                         | ✓                                         |
| Perps UI hooks                                                             | ✗                      | partial                           | ✓                                         | ✓                                         |
| `Engine.context.PerpsController` orchestration                             | ✗                      | shimmed                           | shimmed                                   | ✓                                         |
| Component UI                                                               | ✗                      | ✗ (`renderHook`, not `render`)    | ✓                                         | ✓                                         |
| Navigation / theme / toast / providers                                     | ✗                      | ✗                                 | ✓ test providers                          | ✓ app-like providers                      |
| Confirmation/pay subsystem                                                 | ✗                      | ✗                                 | mocked as out-of-scope app-shell plumbing | preferably real fixture-backed            |
| Native runtime                                                             | ✗                      | ✗                                 | mocked                                    | mocked                                    |
| Best for                                                                   | Provider contract bugs | Hook → service/provider flow bugs | User click reaches real trading flow      | Controller/app orchestration bugs         |
| Cost                                                                       | low                    | medium                            | medium-high                               | high                                      |
| Maintenance burden                                                         | low                    | medium                            | medium-high                               | high                                      |

Shape C's boundary is deliberately narrow: real rendered perps UI, real perps hooks, real `TradingService`, real provider, mocked SDK/native runtime, and mocked confirmation/pay app-shell plumbing unless the test is explicitly about pay-with-token behaviour. Confirmation/pay should have its own integration harness where its providers, selectors, transaction confirmation paths, quote alerts, and token-selection behaviour are real with only their I/O boundary mocked.

The maintenance risk in Shape C is not rendering itself; it is letting the harness become "whatever mocks are needed to mount a large screen." Use Shape C only when the rendered interaction must prove it reaches real perps trading code. Keep pure visual states in CV tests, keep provider/service behaviour in Shape A/B, and add a future Shape D only when the target bug is in `PerpsController` orchestration, messenger integration, or app state glue that the current Engine shim intentionally bypasses.

## Coverage plan (summary)

Driven by [`perps-use-cases.md`](perps-use-cases.md):

| Area                                                        |   E2E | Integration |     CV |    Unit |   Total |
| ----------------------------------------------------------- | ----: | ----------: | -----: | ------: | ------: |
| Order lifecycle (open / edit / cancel / close / flip)       |     1 |          11 |      6 |         |      18 |
| Position management (collateral, TP/SL, leverage)           |       |           6 |      5 |         |      11 |
| Account / funds (deposit, withdraw, view balance)           |     2 |           2 |      6 |         |      10 |
| Market data / discovery                                     |       |             |      5 |       1 |       6 |
| Realtime / subscriptions                                    |       |           4 |      1 |         |       5 |
| Session / config (init, testnet, providers)                 |     2 |           5 |        |         |       7 |
| Pure helpers (`orderCalculations`, `hyperLiquidValidation`) |       |             |        |     ~25 |     ~25 |
| Composed selectors                                          |       |             |        |      ~5 |      ~5 |
| **Total**                                                   | **5** |      **28** | **23** | **~31** | **~87** |

Distribution: ~6% E2E, ~32% Integration, ~26% CV, ~36% Unit. The integration count is the meaningful one — every perps action a user can perform should have a deterministic ~50ms test through real controller/provider code.

## Implementation plan

Six phases, ~6 weeks total. Each phase is a **vertical slice** through one functional area — all four layers for that area, then pause for review. Functional areas come from [`perps-use-cases.md`](perps-use-cases.md).

### Phase 1 — Order lifecycle (week 1–2, ~20 hours)

Use cases: open long/short (market + limit), edit limit, cancel single, cancel multi, close full/partial/limit, flip.

- **Integration** (~12 tests). Shape A for provider actions, Shape B for the `TradingService`/hook seam, Shape C only where a rendered press must reach real trading code. Add helpers like `setupOpenPosition()` as repeated setup appears.
- **CV** (audit + add). Inventory existing order/close view tests against the matrix; add missing variants.
- **E2E** (1 test). One "open a market long on testnet" smoke for native-runtime concerns.
- **Unit**. `orderCalculations.ts` gaps as encountered.

**Pause and review** before phase 2: does the harness pattern scale? Are tests in the right layer?

### Phase 2 — Position management (week 3, ~12 hours)

Use cases: add/remove collateral, set TP/SL, update TP/SL, adjust leverage.

- **Integration** (~6 tests). Reuse phase 1 harnesses; add margin / TP-SL helpers if needed.
- **CV**. TP/SL input variants, leverage slider clamping, collateral form variants.
- **E2E**. None new.
- **Unit**. Margin/leverage pure helpers if any.

### Phase 3 — Account / funds (week 4, ~10 hours)

Use cases: deposit / withdraw USDC, view balance / positions / orders / history.

- **Integration** (~2 tests). Deposit & withdraw validation + state preparation.
- **CV** (~6 tests). Account surfaces and forms.
- **E2E** (up to 2). Real signing of deposit/withdraw if not already covered.
- **Unit**. Amount-formatting helpers if pure.

### Phase 4 — Realtime + market data (week 5, ~10 hours)

Use cases: live updates, markets list, market detail, funding rates.

- **Integration** (~4 tests). Subscription messages through real handlers.
- **CV** (~6 tests). Markets list / detail / funding / list reacting to ticks.
- **E2E**. None new.
- **Unit** (~1). Sort comparator if pure.

### Phase 5 — Session / config (week 6, ~6 hours)

Use cases: provider init, testnet ↔ mainnet, multi-provider routing, builder fee, referrer.

- **Integration** (~5 tests). Init, testnet toggle, provider switch, fee/referrer state.
- **CV**. None.
- **E2E** (2). Cold launch; testnet ↔ mainnet (SecureKeychain scope re-init).
- **Unit**. None.

### Phase 6 — Reconciliation + measurement (week 6, ~8 hours)

- **E2E audit.** Mark existing perps E2E as covered by integration/CV vs genuine native keepers; delete or nightly-downgrade redundant ones.
- **Measurement.** Optional CI tagging / mutation as described in [`../../STRATEGY.md`](../../STRATEGY.md#measurement-optional--future).
- **Outcome.** Smaller perps E2E suite; data to pitch wider domain rollouts.

## How to add a perps integration test

```ts
// app/path/to/myFeature.integration.test.ts
import { buildPerpsIntegrationHarness } from '../../../../../tests/integration/harnesses/perps/perps';
import { PERPS_ERROR_CODES } from '../../../../controllers/perps/perpsErrorCodes';

describe('My perps feature', () => {
  it('does the thing', async () => {
    const { provider } = buildPerpsIntegrationHarness();
    const result = await provider.placeOrder({
      /* real params */
    });
    expect(result.success).toBe(true);
  });
});
```

Three lines of setup. The harness mocks the I/O boundary; the rest runs real. See [`../../AGENTS.md`](../../AGENTS.md) for harness inventory and the central [`integration-test` skill](https://github.com/MetaMask/skills/tree/main/domains/testing/skills/integration-test) for authoring rules.

## Files in this folder

```
harnesses/perps/
├── perps.ts                 Shape A: provider-level harness
├── perps-flow.ts            Shape B: hook-flow harness
├── perps-component.tsx      Shape C: rendered-component harness
├── perps-use-cases.md       every perps use case → primary test layer
└── STRATEGY.md              this file
```
