# Integration harness — strategy FAQ

How the domain harness fits the four-layer testing strategy, and how it compares to [React Native Harness](https://www.react-native-harness.dev/).

For the full strategy, see [`STRATEGY.md`](STRATEGY.md). For harness conventions, see [`AGENTS.md`](AGENTS.md).

---

## Strategy in one line

Each test layer covers what no other layer can cheaply:

- **Integration** owns controller-app wiring
- **CV** owns UI variants
- **Unit** owns pure logic
- **E2E** owns native runtime

CV tests are **not** reduced. They sit alongside integration tests, each owning a non-overlapping bug class.

---

## How the harness fits the strategy

The four-layer model only works if each layer has a repeatable way to set up its boundary. For integration, that's the **harness**.

The harness is not a separate test type. It is the **setup factory** that makes integration tests possible at scale:

- Lives in `tests/integration/harnesses/<domain>.ts`
- Owns the domain's standard `jest.mock(...)` for the **I/O boundary** (SDK, wallet, subscriptions, etc.)
- Exposes `build<Domain>IntegrationHarness()` so tests get **real production code** plus handles to mocks
- Documents what is **REAL vs MOCKED** so we do not accidentally turn integration tests into unit or CV tests

### Perps harness shapes

| Shape | Harness               | What it exercises              | Example                                     |
| ----- | --------------------- | ------------------------------ | ------------------------------------------- |
| **A** | `perps.ts`            | Provider contract              | `provider.placeOrder()` / `validateOrder()` |
| **B** | `perps-flow.ts`       | Hook → service → provider      | `usePerpsTrading` via `renderHook`          |
| **C** | `perps-component.tsx` | Rendered UI press → same chain | `PerpsOrderView` place-order button         |

Shapes stack: C builds on B builds on A.

### Strategy → harness mapping

| Layer           | Harness?                | What's real                 | What's mocked   |
| --------------- | ----------------------- | --------------------------- | --------------- |
| **Unit**        | No                      | One function                | Everything else |
| **CV**          | Component-view renderer | UI, selectors, Redux        | Engine          |
| **Integration** | **Domain harness**      | Controller, provider, hooks | I/O boundary    |
| **E2E**         | No                      | Full app + native runtime   | Almost nothing  |

The harness is what keeps integration **fast (~50–100ms)** and **deterministic** while still running real controller code — the bug class CV cannot see because CV mocks the controller away.

---

## React Native Harness — is it a replacement?

[React Native Harness](https://www.react-native-harness.dev/) is interesting, but it does **not** replace our integration harness.

**Correction on the common TL;DR:** it does not run native module tests _inside_ Jest/Node. It uses **Jest-like syntax**, but executes on a **real simulator/emulator** via Metro. See the [problem statement](https://www.react-native-harness.dev/docs/getting-started/problem-statement) and [feature comparison](https://www.react-native-harness.dev/docs/feature-comparison).

|                                 | Our integration harness                                      | React Native Harness                |
| ------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| **Runtime**                     | Jest in Node                                                 | Real device / simulator             |
| **Native modules**              | Mocked (out of scope)                                        | **Real** — that's the point         |
| **Controller / provider logic** | **Real** — that's the point                                  | Not the main focus                  |
| **Speed**                       | Milliseconds                                                 | Minutes (build + device)            |
| **Bug class**                   | Controller-app wiring, validation seams, multi-step JS flows | TurboModule / platform API behavior |

### Where they sit in the pyramid

```
Unit          → pure logic
CV            → UI variants (Engine mocked)
Integration   → controller wiring (I/O mocked)     ← our harness
[RN Harness]  → native module contracts (no mocks) ← different gap
E2E           → full user flows + native runtime
```

### Bottom line

- **RN Harness** is worth evaluating when we need to test **native module implementations** without mocking `NativeModules`.
- **Our harness** targets **MetaMask controller integration bugs** — the class that is too slow or flaky in E2E and structurally invisible in CV.

They are **complementary, not a replacement**.

---

## Related docs

- [`STRATEGY.md`](STRATEGY.md) — four-layer strategy, comparison tables, rollout plan
- [`AGENTS.md`](AGENTS.md) — harness pattern, per-domain inventory, run commands
- [`perps-use-cases.md`](perps-use-cases.md) — perps flows mapped to test layers
- [PR #29749](https://github.com/MetaMask/metamask-mobile/pull/29749) — integration test PoC (merged)
