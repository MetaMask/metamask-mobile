# Perps use-case matrix

What every perps user-facing flow looks like, and which test layer is responsible for proving it works. The framing is "main happy paths first" — the bug-finding stuff lives in those tests as edge cases, not as their reason for existing.

Layer notation: **U** = Unit, **CV** = Component View, **I** = Integration, **E2E** = End-to-end. Primary layer is **bold**.

---

## Order lifecycle

| Use case                                 |  U  | CV  |   I   | E2E | Coverage notes                                                                                                           |
| ---------------------------------------- | :-: | :-: | :---: | :-: | ------------------------------------------------------------------------------------------------------------------------ |
| Open long, market order                  |     |  ✓  | **✓** |  ✓  | I: real `placeOrder` flow incl. validation. CV: order-screen variant. E2E: one happy-path on testnet for native signing. |
| Open short, market order                 |     |  ✓  | **✓** |     | Same as above; one CV variant covers both sides. E2E doesn't need duplication.                                           |
| Open long, limit order                   |     |  ✓  | **✓** |     | I: limit-price branch through validation + asset-info lookup. CV: limit-price input UI.                                  |
| Open short, limit order                  |     |     | **✓** |     | I only — short-limit doesn't need separate CV; covered by long-limit variant.                                            |
| Edit existing limit order                |     |  ✓  | **✓** |     | I: real `editOrder` flow (price + size update). CV: edit-screen UI.                                                      |
| Cancel single open order                 |     |  ✓  | **✓** |     | I: real `cancelOrder` action. CV: cancel button + confirmation.                                                          |
| Cancel multiple open orders (cancel-all) |     |     | **✓** |     | Multi-cancel logic is purely controller; no UI variant beyond a button.                                                  |
| Close position — full (market)           |     |  ✓  | **✓** |     | I: full-close branch (skips USD validation). CV: close-screen.                                                           |
| Close position — partial (market)        |     |  ✓  | **✓** |     | I: partial-close size handling. CV: partial-size slider.                                                                 |
| Close position — limit order             |     |     | **✓** |     | I: limit-close validation path. UI is shared with open-limit; no extra CV needed.                                        |
| Reverse / flip position                  |     |     | **✓** |     | I: multi-step (close + open opposite). The "two functions correct alone, broken together" case.                          |

## Position management

| Use case                             |  U  | CV  |   I   | E2E | Coverage notes                                                              |
| ------------------------------------ | :-: | :-: | :---: | :-: | --------------------------------------------------------------------------- |
| Add collateral (increase margin)     |     |  ✓  | **✓** |     | I: state transition on margin-update. CV: input form + confirmation.        |
| Remove collateral (decrease margin)  |     |  ✓  | **✓** |     | Same; covers the rejection path when margin would drop below maintenance.   |
| Set take-profit                      |     |  ✓  | **✓** |     | I: TP-price validation, state update. CV: TP input.                         |
| Set stop-loss                        |     |  ✓  | **✓** |     | Same shape as TP.                                                           |
| Update existing TP/SL                |     |     | **✓** |     | Edit-of-existing path; UI is shared with create.                            |
| Adjust leverage on existing position |     |  ✓  | **✓** |     | I: leverage validation against position size. CV: leverage slider clamping. |

## Account / funds

| Use case                         |  U  |  CV   |   I   | E2E | Coverage notes                                                                                            |
| -------------------------------- | :-: | :---: | :---: | :-: | --------------------------------------------------------------------------------------------------------- |
| Deposit USDC into perps account  |     |   ✓   | **✓** |  ✓  | I: deposit validation, state preparation. CV: deposit form. E2E: real signing of the deposit transaction. |
| Withdraw USDC from perps account |     |   ✓   | **✓** |  ✓  | Same shape as deposit.                                                                                    |
| View account balance / equity    |     | **✓** |       |     | Pure rendering of state; selectors do composition. CV is the right scope.                                 |
| View open positions list         |     | **✓** |       |     | Same.                                                                                                     |
| View open orders list            |     | **✓** |       |     | Same.                                                                                                     |
| View order history / fills       |     | **✓** |       |     | Same. CV with mocked state per variant (empty, populated, paginated).                                     |

## Market data / discovery

| Use case                          |  U  |  CV   |  I  | E2E | Coverage notes                                                 |
| --------------------------------- | :-: | :---: | :-: | :-: | -------------------------------------------------------------- |
| View markets list                 |     | **✓** |     |     | Pure variant rendering.                                        |
| Sort markets (volume, change %)   |  ✓  | **✓** |     |     | U: sort comparator if it's a pure helper. CV: list re-renders. |
| Search markets by symbol          |     | **✓** |     |     | Pure UI filtering.                                             |
| View market detail (chart, depth) |     | **✓** |     |     | Variant rendering with live + cached data states.              |
| View funding rate for a market    |     | **✓** |     |     | Selector composition + visual.                                 |

## Realtime / subscriptions

| Use case                                  |  U  |  CV   |   I   | E2E | Coverage notes                                                                       |
| ----------------------------------------- | :-: | :---: | :---: | :-: | ------------------------------------------------------------------------------------ |
| Live price updates flow into state        |     |       | **✓** |     | I: drive a price-update event through the subscription handler, assert state update. |
| Live position updates flow into state     |     |       | **✓** |     | Same shape.                                                                          |
| Live order-fill notifications             |     |       | **✓** |     | Same.                                                                                |
| Live account balance updates              |     |       | **✓** |     | Same.                                                                                |
| Component re-renders on subscription tick |     | **✓** |       |     | CV with redux state mutated via dispatch — verifies the consumer reacts.             |

E2E for live data is impractical (timing-dependent, needs real WS); rely on integration with mocked subscription messages.

## Session / config

| Use case                                    |  U  | CV  |   I   |  E2E  | Coverage notes                                                                           |
| ------------------------------------------- | :-: | :-: | :---: | :---: | ---------------------------------------------------------------------------------------- |
| Initialize provider on login                |     |     | **✓** |   ✓   | I: real init with mocked SDK, assert ready state. E2E: real keychain read on cold start. |
| Toggle testnet ↔ mainnet                   |     |     | **✓** | **✓** | I: state transition. E2E: native re-init across SecureKeychain scope change.             |
| Switch active provider (HyperLiquid ↔ MYX) |     |     | **✓** |       | I: routing logic, both providers exist in harness.                                       |
| Approve builder fee                         |     |     | **✓** |       | I: one-time approval flow.                                                               |
| Set referrer code                           |     |     | **✓** |       | I: referrer state update.                                                                |

## Pure helpers (utility functions)

These don't have user-facing flows; they're consumed by the layers above. Unit is the right home for all of them.

| Module                                         | Tests | Notes                                                                                        |
| ---------------------------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| `orderCalculations.ts`                         | ~15   | `calculateFinalPositionSize`, `calculateOrderPriceAndSize`, slippage, BPS, decimal precision |
| `hyperLiquidValidation.ts` (utility functions) | ~10   | `validateOrderParams`, `validateBalance`, `validateDepositParams`, etc.                      |
| Composed selectors (perps area)                | ~5    | Position with market data joined for PnL display                                             |

---

## Distribution

| Layer           | Count | Role                                                        |
| --------------- | ----: | ----------------------------------------------------------- |
| **Unit**        |   ~30 | Pure helpers, calculations, selector composition            |
| **CV**          |   ~22 | UI variant coverage; user actions on the screen             |
| **Integration** |   ~32 | Every controller action that has user-visible state effects |
| **E2E**         |    ~5 | Cold launch, real signing, network re-init, testnet toggle  |
| **Total**       |   ~89 |                                                             |

The shape: one CV test per UI variant, one integration test per public controller action (happy path + main rejection paths), one E2E per native-runtime concern, unit tests for everything pure. No use case is covered redundantly across layers; every use case is covered exactly where it's cheapest to detect a regression.

---

## Decision rules used to assign use cases

When in doubt, the layer choice for a use case follows these rules:

1. **Native modules involved (keychain, signing, deep links, real network)?** → E2E. There's no other layer that can run real native code.
2. **State changes triggered by a controller action?** → Integration. Real action through real reducer is the only way to catch the seams between intent and effect.
3. **Same UI rendering across many states (loading, empty, populated, error)?** → CV. Cheap variant coverage, sharp failure isolation.
4. **Pure function on values (no async, no state)?** → Unit. Fast, precise, robust to refactor.
5. **Multi-step user flow (open → close → flip)?** → Integration. Tests state transitions across actions, which CV can't reach.

Where a use case fits multiple rules, pick the one with the **cheapest sufficient layer** as the primary, and add secondaries only when there's a _unique_ concern at another layer (e.g. real signing for deposit → secondary E2E even if integration covers the validation).

## What's deliberately not in the matrix

- **Snapshot tests** — out of scope; team killed them previously for reasons that still apply.
- **Hook-level integration tests** — not currently planned. If a particular flow proves hard to cover via the controller-level integration harness, we'd add one as an exception, not as a default.
- **Visual regression / Storybook** — orthogonal; if it gets adopted, it owns "did the rendered pixels change?" and CV continues to own "did the structure render correctly?"
