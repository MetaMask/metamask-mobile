# tests/integration/ — AGENTS.md

Agent index for **integration tests** (`app/**/*.integration.test.ts`). Jest tests that exercise real controller / provider / service code with the I/O boundary mocked. Pointers only; details live in the canonical skill, the strategy doc, and references below.

---

## Scope

- **integration tests** — `app/**/*.integration.test.ts`. Tests that instantiate real controllers / providers / services and only mock the I/O boundary (SDK clients, network, native modules, keyring, websocket subscriptions). Shape B/C harnesses may also mock explicitly documented app-shell glue (Engine shim, navigation/runtime providers) when the real target chain still runs. Targeted at the bug class that today only e2e catches: bugs at the seam between controller behaviour and the app, where each piece works in isolation. Consume the [framework](#framework) (per-domain harnesses, dedicated jest config).

---

## Canonical guidance

- [Testing-layer policy](https://github.com/MetaMask/skills/blob/main/domains/testing/knowledge/testing-layers.md) — choose integration vs component-view, unit, or E2E by best fit.
- [`integration-test` skill](https://github.com/MetaMask/skills/tree/main/domains/testing/skills/integration-test) — workflow, decision tree, and golden rules.
- [`writing-tests.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/writing-tests.md) — test structure, scenarios, and assertions.
- [`harness-extension.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/harness-extension.md) — adding or extending a domain harness.
- [`reference.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/reference.md) — run commands, self-review, failure diagnosis, and antipatterns.

## Framework

- Tests live beside production code as `*.integration.test.ts?(x)`.
- `jest.config.integration.js` owns suite discovery and runtime settings.
- Reusable setup lives in `tests/integration/harnesses/`; the inventory below records the Mobile-specific real/mocked boundary and public factory for each harness.

---

## Per-domain harnesses

### Perps — [`harnesses/perps.ts`](harnesses/perps.ts)

- **Real:** `HyperLiquidProvider` (mobile), all of its order / close / validation logic, asset-map lookups, in-memory state transitions
- **Mocked:** `HyperLiquidClientService`, `HyperLiquidWalletService`, `HyperLiquidSubscriptionService`, `TradingReadinessCache`, injected `streamManager` platform dependency, `hyperLiquidValidation` utility module
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

### Money — [`harnesses/money.ts`](harnesses/money.ts)

- **Shape:** B — hook-flow harness over the Money balance seam
- **Real:** `moneyBalance` slice reducer + selectors over a real Redux store, `selectPrimaryMoneyAccount` over real MoneyAccountController / KeyringController state, `moneyTransactionGuards`, `invalidateMoneyAccountBalanceCaches`, the UI `QueryClient` built by the real `createUIQueryClient` (real cache, real `invalidateQueries` → `<Service>:invalidateQueries` forwarding → real refetch), a real `Messenger` on `Engine.controllerMessenger`
- **Mocked:** `MoneyAccountBalanceService:fetchBalanceWithFallback` (the balance API/RPC fetch), `MoneyAccountBalanceService:invalidateQueries` and `MoneyAccountApiDataService:invalidateQueries` (service-local caches), `Logger` (Sentry transport), plus the app-shell glue `app/core/ReactQueryService` (singleton swapped for the harness QueryClient) and the `app/core/Engine` / `app/store` shells from `testSetup.js`
- **Factory:** `buildMoneyIntegrationHarness({ hasMoneyAccount?, totalBalance? })`
- **Returns:** `{ store, getState, queryClient, messenger, renderMoneyHook, confirmTransaction, primeBalanceQuery, readBalance, setTotalBalance, setHasMoneyAccount, mocks }`
- **Use when:** a Money flow must prove it reaches real Redux state and the real balance query cache, e.g. `useRefreshMoneyBalanceOnTxConfirm` reacting to `TransactionController:transactionConfirmed`

When a harness is added or its public boundary changes, update this inventory. Follow the central [`harness-extension.md`](https://github.com/MetaMask/skills/blob/main/domains/testing/skills/integration-test/references/harness-extension.md) workflow rather than documenting authoring rules here.

---

## Strategy documents

- [`STRATEGY.md`](STRATEGY.md) — Four-layer testing strategy. Layer responsibilities, comparison tables (cost / efficiency / refactor sensitivity), perps coverage plan, six-phase rollout.
- [`perps-use-cases.md`](perps-use-cases.md) — Every perps user-facing flow mapped to its primary test layer. The authoritative driver for what gets tested where during the perps rollout.
- [`coverage-and-tracking.md`](coverage-and-tracking.md) — Per-layer coverage targets and bug-tracking mechanisms (CI tagging, pre/post comparison, mutation testing). What to measure, how to measure it.
- [`coverage.svg`](coverage.svg) — Diagram showing which test type runs real code at each layer of the stack.
