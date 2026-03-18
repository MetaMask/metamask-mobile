# MYX Validation Flows

Agentic validation runbook for MYX write operations on testnet.
Follows `docs/perps/perps-agentic-feedback-loop.md`.

## Prerequisites

- App running on testnet, MYX provider active
- Wallet with >$500 USDC balance (covers all flows)
- Verify setup:
  ```bash
  scripts/perps/agentic/app-state.sh recipe myx/auth       # ready: true
  scripts/perps/agentic/app-state.sh recipe myx/account     # totalBalance > 0
  ```

## Read Smoke Test (~10s)

Run all three; all must pass before write flows:

| Recipe          | Pass Criteria                |
| --------------- | ---------------------------- |
| `myx/markets`   | SGLT present with price > 0  |
| `myx/account`   | freeMargin present and > 0   |
| `myx/positions` | Returns array (can be empty) |

## Write Flows (UI-Driven)

Each flow: `myx/pre-trade` snapshot → UI action → wait → `myx/post-trade` snapshot → assert delta.

**MYX testnet min order size: $110 USD** (anything <$100 fails on-chain).
**Testnet market: SGLT** (only active MYX testnet market).

### Flow 1: Market Long ($110)

| Step | Action                  | TestID / Target                         |
| ---- | ----------------------- | --------------------------------------- |
| 1    | Navigate to SGLT market | `PerpsMarketDetails` with SGLT          |
| 2    | Press Long              | `perps-market-details-long-button`      |
| 3    | Wait 1s                 | —                                       |
| 4    | Type 110 via keypad     | `perps-order-view-keypad` keys: 1, 1, 0 |
| 5    | Press Place Order       | `perps-order-view-place-order-button`   |
| 6    | Wait 5s                 | —                                       |
| 7    | Run `myx/post-trade`    | `positionCount > pre.positionCount`     |

### Flow 2: Market Short ($110)

Same as Flow 1, but press Short instead of Long.

| Step | Action      | TestID                              |
| ---- | ----------- | ----------------------------------- |
| 2    | Press Short | `perps-market-details-short-button` |

**Pass**: New SHORT position in post-trade snapshot.

### Flow 3: Limit Long ($110 @ -5%)

| Step | Action                                | TestID                                |
| ---- | ------------------------------------- | ------------------------------------- |
| 1    | Navigate to SGLT market               | `PerpsMarketDetails`                  |
| 2    | Press Long                            | `perps-market-details-long-button`    |
| 3    | Switch to Limit order type            | Order type selector                   |
| 4    | Set limit price (oracle price × 0.95) | Limit price input                     |
| 5    | Type 110 via keypad                   | `perps-order-view-keypad`             |
| 6    | Press Place Order                     | `perps-order-view-place-order-button` |
| 7    | Wait 5s                               | —                                     |
| 8    | Run `myx/orders`                      | New order in list                     |

**Pass**: Order appears in `getOpenOrders`.

### Flow 4: Close Position (100%)

| Step | Action                       | TestID                              |
| ---- | ---------------------------- | ----------------------------------- |
| 1    | Navigate to position details | Position from `myx/positions`       |
| 2    | Press Close                  | `perps-market-details-close-button` |
| 3    | Slide to 100%                | Close size slider                   |
| 4    | Press Close Position         | `close-position-confirm-button`     |
| 5    | Wait 5s                      | —                                   |
| 6    | Run `myx/post-trade`         | `positionCount < pre.positionCount` |

**Pass**: Position removed from post-trade snapshot.

### Flow 5: Set TP/SL

| Step | Action                       | TestID                               |
| ---- | ---------------------------- | ------------------------------------ |
| 1    | Navigate to position details | Existing position                    |
| 2    | Press Modify                 | `perps-market-details-modify-button` |
| 3    | Select TP/SL                 | TP/SL option                         |
| 4    | Set TP at +10% from entry    | TP price input                       |
| 5    | Set SL at -10% from entry    | SL price input                       |
| 6    | Press Set                    | `bottomsheetfooter-button`           |
| 7    | Wait 3s                      | —                                    |

**Pass**: Position has TP/SL prices in `myx/positions`.

### Flow 6: Add Margin ($20)

| Step | Action                       | TestID                               |
| ---- | ---------------------------- | ------------------------------------ |
| 1    | Navigate to position details | Existing position                    |
| 2    | Press Modify                 | `perps-market-details-modify-button` |
| 3    | Select Adjust Margin         | Adjust Margin option                 |
| 4    | Enter $20                    | Margin input                         |
| 5    | Press Confirm                | `bottomsheetfooter-button`           |
| 6    | Wait 3s                      | —                                    |

**Pass**: Position margin increased in post-trade vs pre-trade.

### Flow 7: Remove Margin ($20)

Same as Flow 6, but select "Remove" instead of "Add".

**Pass**: Position margin decreased in post-trade vs pre-trade.

### Flow 8: Cancel Order

Requires an open limit order (run Flow 3 first).

| Step | Action                      | TestID                                |
| ---- | --------------------------- | ------------------------------------- |
| 1    | Navigate to orders tab      | Orders tab                            |
| 2    | Press Cancel on first order | `perps-open-order-card-cancel-button` |
| 3    | Confirm cancellation        | Confirm button                        |
| 4    | Wait 3s                     | —                                     |
| 5    | Run `myx/orders`            | Order removed                         |

**Pass**: Order count decreased.

## Display Validation (Screenshot-Based)

After write flows, verify display correctness:

| Check                       | Expected                                     |
| --------------------------- | -------------------------------------------- |
| Market stats: oracle price  | Not `-` or `$0`                              |
| Market stats: USD volume    | Formatted number, not raw                    |
| Market stats: funding rate  | Present, not `-`                             |
| Recent activity: sizes      | Max 6 decimals (not raw 18-decimal)          |
| Close position dialog: size | Max 6 decimals                               |
| Account balance             | Includes freeMargin (not just walletBalance) |

## Execution Order

1. Read smoke test (all 3 recipes)
2. Flow 1: Market Long → verify position
3. Flow 5: Set TP/SL on the new position
4. Flow 6: Add Margin
5. Flow 7: Remove Margin
6. Flow 4: Close Position (cleans up Flow 1)
7. Flow 2: Market Short → verify position → close it
8. Flow 3: Limit Long → verify order
9. Flow 8: Cancel Order (cleans up Flow 3)
10. Display validation screenshots
