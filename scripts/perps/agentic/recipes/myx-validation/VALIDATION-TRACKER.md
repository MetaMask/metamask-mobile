# MYX Write Integration — Validation Tracker

Branch: `feat/perps/myx-write-integration`

## Double Validation Approach

Each flow is validated twice:
1. **PoC script** — Standalone `scripts/perps/myx-poc/` script via `NETWORK=testnet npx tsx`. Isolates SDK behavior from app integration.
2. **CDP recipe** — `validate-recipe.sh` against the live app. Validates the full controller -> provider -> SDK chain.

## Validation Checklist

### Market Orders
- [ ] **01-place-market-order** — Place market buy, verify position created
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 20 --leverage 5 --type market`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/01-place-market-order.json`
  - Evidence:

### Position Management
- [ ] **02-update-tpsl** — Set TP/SL on open position
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx addTpSl.ts --tp 2500 --sl 2000`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/02-update-tpsl.json`
  - Evidence:
- [ ] **03-add-margin** — Add $10 margin to open position
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx addMargin.ts --usd 10`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/03-add-margin.json`
  - Evidence:
- [ ] **04-close-position** — Close single position, verify removed
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx closeOrder.ts --close <positionId>`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/04-close-position.json`
  - Evidence:
- [ ] **05-place-and-close-all** — Place order -> close all -> verify zero positions
  - PoC: Use `placeOrder.ts` + `showAccount.ts` to verify, then batch close via CDP only
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/05-place-and-close-all.json`
  - Evidence:

### Limit Orders (test 08 first — determines if 06/07 are viable)
- [ ] **08-place-limit-order** — Place limit buy, verify in open orders
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol META --side long --usd 20 --leverage 5 --type limit --price <50% of current>`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/08-place-limit-order.json`
  - Evidence:
- [ ] **06-cancel-order** — Place limit -> cancel -> verify removed (depends on 08)
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx closeOrder.ts --cancel <orderId>`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/06-cancel-order.json`
  - Evidence:
- [ ] **07-edit-order** — Place limit -> edit price -> cleanup (depends on 08)
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx editOrder.ts --price-pct 1`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/07-edit-order.json`
  - Evidence:

### Full Lifecycle
- [ ] **full-cycle** — Place -> TP/SL -> margin -> close -> log check (no errors)
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/full-cycle.json`
  - Evidence:

## Execution Order

1. 01 (place market) -> 02 (TP/SL) -> 03 (add margin) -> 04 (close position) -> 05 (place + close all)
2. 08 (place limit) -> 06 (cancel order) -> 07 (edit order)
3. full-cycle (only after all individual recipes pass)

## How to Validate

### Per-recipe flow
```bash
# Step 1: PoC script (isolated SDK validation)
cd scripts/perps/myx-poc && NETWORK=testnet npx tsx <script>.ts <args>

# Step 2: CDP recipe (full app validation)
bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/<recipe>.json

# Step 3: DevLogger evidence
grep 'MYX-VAL\|PERPS_DEBUG' .agent/metro.log | tail -10

# Step 4: Update this tracker — change [ ] to [x], paste evidence
```

### Run all recipes
```bash
for f in scripts/perps/agentic/recipes/myx-validation/0*.json; do
  echo "=== $(basename $f) ==="
  bash scripts/perps/agentic/validate-recipe.sh "$f" --skip-manual || echo "FAILED: $f"
done
```

## Testnet Environment Status (2026-03-24)

**UNBLOCKED — MYX team provided new broker addresses for SDK 1.0.4+ contracts (2026-03-22).**

### Current state
- SDK upgraded from 1.0.4 → **1.0.6** (done, zero type errors).
- New broker addresses deployed against current contracts:
  - **Linea Sepolia (59141)**: `0x30b1bc9234fea72daba5253bf96d56a91483cbc0` (owner `0xAdA1c11226C0c1EFb001049334C14B0C70a0D84e`)
  - **Arb Sepolia (421614)**: `0xc777bf4cdd0afc3d2b4d0f46d23a1c1c25c39176` (owner `0x49F983F21379D70b7756588E6C9b11f26fF3a4Bd`)
- Active pool on Linea Sepolia: **META** (poolId `0x13b0abcc...`, chainId 59141, state=2/Trench, ticker ~$2130).
- **placeOrder validated** — tx `0x84eec8377f457cad85090eb3e71077ee70f1d6823d4d698805cdc75d730ba5d2` (block 27457190, LONG META $20 5x leverage).

### Previous blocker (resolved)
Old broker `0x0FB08D3A1Ea6bE515fe78D3e0CaEb6990b468Cf3` was registered against pre-1.0.4 contracts.
All order writes reverted with `PoolNotActive(bytes32)` (`0xba01b06f`).
New broker addresses from MYX team (2026-03-22) resolved this.

### Testnet pool survey
MarketPoolState: 0=Cook, 1=Primed, **2=Trench (trading enabled)**, 3=PreBench, 4=Bench (delisted)

| Pool  | Chain         | ChainId | State          | Ticker  | Tradeable? |
|-------|---------------|---------|----------------|---------|------------|
| META  | Linea Sepolia | 59141   | 2 (Trench)     | ~$2130  | Yes |
| CXY   | Linea Sepolia | 59141   | 4 (Bench)      | none    | No (delisted) |

### SDK upgrade history
- **1.0.3 → 1.0.4** (2026-03-21): `getWalletQuoteTokenBalance` signature changed, `PoolOpenOrder` type changed.
- **1.0.4 → 1.0.6** (2026-03-24): No breaking changes detected (zero type errors).

## Known Limitations

- **Wait times**: 5s between action and assertion. Increase if chain is slow.
- **Idempotency**: Recipes 02-04 auto-place a position if none exists.
