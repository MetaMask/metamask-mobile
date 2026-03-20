# MYX Write Integration — Validation Tracker

Branch: `feat/perps/myx-write-integration`

## Double Validation Approach

Each flow is validated twice:
1. **PoC script** — Standalone `scripts/perps/myx-poc/` script via `NETWORK=testnet npx tsx`. Isolates SDK behavior from app integration.
2. **CDP recipe** — `validate-recipe.sh` against the live app. Validates the full controller -> provider -> SDK chain.

## Validation Checklist

### Market Orders
- [ ] **01-place-market-order** — Place market buy, verify position created
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol SGLT --side long --usd 120 --leverage 10 --type market`
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
  - PoC: `cd scripts/perps/myx-poc && NETWORK=testnet npx tsx placeOrder.ts --symbol SGLT --side long --usd 120 --leverage 10 --type limit --price <50% of current>`
  - CDP: `bash scripts/perps/agentic/validate-recipe.sh scripts/perps/agentic/recipes/myx-validation/08-place-limit-order.json`
  - Evidence:
  - **NOTE**: If this fails with `0x613970e0`, limit orders are unsupported on SGLT testnet pool. Skip 06/07.
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

## Known Limitations

- **Limit orders (06, 07, 08)**: SGLT testnet pool may reject limit orders (`0x613970e0`). Unverified — test 08 first.
- **Wait times**: 5s between action and assertion. Increase if chain is slow.
- **Idempotency**: Recipes 02-04 auto-place a position if none exists.
