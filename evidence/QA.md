# TAT-3016 — QA Validation Plan

Incident: [TAT-3016](https://consensyssoftware.atlassian.net/browse/TAT-3016) — HyperLiquid users whose collateral is spot USDC (Unified Account Mode, `withdrawable = 0`) cannot place orders in MetaMask Mobile even though Phantom / HL web correctly show the account as tradeable.

Fix: mobile adds `AccountState.availableToTradeBalance = withdrawable + spot USDC/USDH` and rewires order-entry UI to gate on it. `availableBalance = withdrawable` is preserved for the withdraw path.

This doc drives manual QA for the hotfix branch `perps/fix-avail-balance-order-entry`. Companion automated recipe lives at `evidence/recipe.json` (run via `bash scripts/perps/agentic/validate-recipe.sh evidence`).

---

## Fixture matrix

| Fixture                   | HL account mode        | `withdrawable` | spot USDC     | expected `availableToTradeBalance`                | expected order-entry UI                                                                |
| ------------------------- | ---------------------- | -------------- | ------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **dev1** `0x8Dc6…9003`    | Standard (Unified OFF) | > $11          | any (ignored) | = `availableBalance`                              | Regression baseline: form opens, submit enabled, max = `availableBalance`              |
| **Trading** `0x316B…01fA` | Unified ON             | variable       | variable      | `withdrawable + spotUSDC (+ USDH if allowlisted)` | Combined buying power; submit gates on sum                                             |
| **dev2** _manual setup_   | Unified ON             | 0              | ≥ $11         | `spotUSDC`                                        | **THE FIX**: form opens, `Perps balance` selected (not external token), submit enabled |
| **dev3** _manual setup_   | Unified ON             | 0              | 0             | 0                                                 | Add Funds CTA shown, amount input disabled                                             |

`PERPS_MIN_BALANCE_THRESHOLD` is the minimum amount gate for UI affordances.

Fixture identities mirror `.agent/wallet-fixture-inventory.md`. `dev2` / `dev3` are not pre-provisioned — see §Manual setup.

---

## Manual setup per fixture

All setup is performed against **mainnet** HyperLiquid via https://app.hyperliquid.xyz (not testnet). Automation cannot toggle Unified Mode or move funds between perps / spot, so these steps must be run by hand before the recipe.

### dev1 — Standard mode baseline

Already provisioned. Verify on HL web:

1. Open https://app.hyperliquid.xyz with `0x8Dc6…9003` connected.
2. Settings gear → ensure `Disable Unified Account Mode` is **checked** (Standard mode).
3. Ensure `withdrawable > $11` on the perps clearinghouse.

### Trading — Unified mode mixed balance

Already provisioned. Verify on HL web:

1. Connect `0x316B…01fA`.
2. Settings gear → `Disable Unified Account Mode` **unchecked** (Unified ON).
3. Record the current split: `withdrawable`, spot USDC, spot USDH (screenshot).

### dev2 — Unified mode, spot-only (THE FIX)

No pre-provisioned account matches this shape. Use Account 6 from the shared mnemonic (`0xB9b9E1c2d011C8edbEf8F56b40C1901d1A0742c2`) or a fresh mnemonic account:

1. In MetaMask Mobile, ensure the target account exists (Account → Add account if needed).
2. On HL web with that address:
   - Settings gear → `Disable Unified Account Mode` **unchecked** (Unified ON).
   - Deposit at least $15 USDC so the account is active.
   - Use Portfolio → Transfer to move all perps USDC into spot USDC. Verify `withdrawable == 0` and `spot USDC ≥ $11` on the account balance breakdown.

### dev3 — Unified mode, empty

Pick a fresh mnemonic account (Account 2–5 if unused). On HL web:

1. Settings gear → `Disable Unified Account Mode` **unchecked**.
2. Confirm both `withdrawable == 0` and `spot USDC == 0`.

### Pre-run sanity check

After each fixture is set up:

```
bash scripts/perps/agentic/app-state.sh eval-async \
  "Engine.context.PerpsController.getAccountState().then(function(r){ return JSON.stringify(r) })"
```

Confirm the reported `availableBalance`, `availableToTradeBalance`, and `totalBalance` match the expected column in the fixture matrix.

---

## Validation scenarios

Run in the order below. Record one `.mp4` per scenario via `xcrun simctl io mm-2 recordVideo --codec h264 evidence/<scenario>.mp4 &`. Close PerpsOrderView between scenarios so `useInitPerpsPaymentToken` fires fresh.

### A. Standard mode regression — dev1

**Goal**: prove the hotfix does not change Standard-mode behavior.

1. Switch to `dev1`.
2. Open any market (BTC).
3. Tap Long. Enter amount = `0.5 × availableBalance`.
4. Expect: submit enabled, max amount = `availableBalance × leverage`.
5. Record `after-dev1.mp4`.

### B. Unified mode mixed balance — Trading

**Goal**: confirm combined buying power.

1. Switch to `Trading`.
2. Open BTC.
3. Balance row should show `availableToTradeBalance = withdrawable + spot`.
4. Max amount input accepts the combined sum × leverage.
5. Tap Long, enter amount between `withdrawable` and `availableToTradeBalance`, submit enabled.
6. Cross-check the mobile `Available to trade` readout against HL web's displayed total.
7. Record `after-trading.mp4`.

### C. Unified mode spot-only — THE FIX — dev2

**Goal**: the incident scenario. Must succeed post-fix.

1. Switch to `dev2`.
2. Open BTC.
3. Confirm:
   - Pay source = `Perps balance` (NOT auto-selected external USDC token).
   - `Available to trade` row shows spot USDC amount (not $0).
   - Submit button enabled.
   - Max amount input = `spot USDC × leverage`.
4. Tap Long, submit a small order ($11 min) to confirm the order actually places on HL (optional; cancels the need for a before/after video if it lands).
5. Record `after-dev2.mp4`.

Optional **before** recording:

- `git stash` the strip commits, rebuild mobile, repeat steps 1–3 against the same dev2 state. Expect submit disabled / external-token auto-selected.
- Record `before-dev2.mp4`.
- Restore: `git stash pop`.

### D. Unified mode empty — dev3

**Goal**: verify empty-state UX unchanged.

1. Switch to `dev3`.
2. Open BTC.
3. Confirm Add Funds CTA surfaces; amount input disabled.
4. Record `after-dev3.mp4`.

### E. Withdraw path non-regression — dev1 + Trading

**Goal**: withdraw flow stays on `availableBalance` only (per `fix-prompt.md` §L66-69). Critical.

1. Switch to `Trading`. Open PerpsWithdrawView.
2. Max input should equal `withdrawable`, NOT `availableToTradeBalance`.
3. Switch to `dev1`. Repeat — same invariant.
4. Record `after-withdraw.mp4` covering both accounts.

---

## Evidence capture

Commit the following under `evidence/` alongside this file:

- `after-dev1.mp4`, `after-trading.mp4`, `after-dev2.mp4`, `after-dev3.mp4`, `after-withdraw.mp4`.
- `before-dev2.mp4` (optional, strongest proof of the fix).
- `setup/trading-hl-settings.png`, `setup/dev1-hl-settings.png`, `setup/dev2-hl-settings.png`, `setup/dev3-hl-settings.png` — HL web UI settings panels matching the toggles documented above.
- `setup/<fixture>-hl-balances.png` — HL web balance readout screenshots for each fixture.
- `metro.log` excerpt containing the `availableToTradeBalance` values streamed during scenarios B and C (grep for `availableToTradeBalance`).
- `validation-run-<date>/` folder produced by `validate-recipe.sh` (workflow.mmd, trace.json, summary.json).

---

## Recipe hook

`evidence/recipe.json` automates the pre_condition assertions from scenarios A, B, C, E (state-level). It cannot drive HL web settings or transfer funds — those remain manual. Recipe will fail-with-hint if a fixture's on-chain state doesn't match the expected matrix row.

Run:

```
node scripts/perps/agentic/validate-flow-schema.js evidence/recipe.json
bash scripts/perps/agentic/validate-recipe.sh evidence --dry-run
bash scripts/perps/agentic/validate-recipe.sh evidence \
  --artifacts-dir evidence/validation-run-$(date +%Y%m%d-%H%M)
```

See recipe comments for the skip conditions when dev2 / dev3 are not provisioned.
