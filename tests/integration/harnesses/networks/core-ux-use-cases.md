# Core UX use-case matrix

What Core UX network-management flows look like, and which test layer is responsible for proving them. Main happy paths first; edge cases live inside those tests.

Layer notation: **U** = Unit, **I** = Integration (Shape A = controller harness, Shape B = hook-flow harness). Primary layer is **bold**.

IDs match the delivery plan (`UX-NET-*`, `UX-POLY-*`). Shared four-layer model: [`../../STRATEGY.md`](../../STRATEGY.md). Domain rollout and shape detail: [`STRATEGY.md`](STRATEGY.md).

---

## Network management

| ID                | Use case                                                                  | U     | I     | Coverage notes                                                                                           |
| ----------------- | ------------------------------------------------------------------------- | ----- | ----- | -------------------------------------------------------------------------------------------------------- |
| UX-NET-HARNESS    | Controllers add/remove custom network with mocked fetch                   |       | **✓** | Shape A: real NC `addNetwork` / `removeNetwork`. Deliverable: Step 1.                                    |
| UX-NET-TOKEN-WIPE | Remove custom network → TokensController wipes that chain; mainnet intact |       | **✓** | Shape A: real TokensController on NC `stateChange`.                                                      |
| UX-NET-ADD        | Save custom network → config present + enabled                            |       | **✓** | Shape B via `useNetworkOperations.saveNetwork` → real NC + NEC. Deliverable: Step 2.                     |
| UX-NET-DEL        | Remove custom network → config gone                                       |       | **✓** | Shape B via `useNetworkOperations.removeNetwork`. Deliverable: Step 2.                                   |
| UX-NET-DEL-ACTIVE | Remove **active** custom RPC → falls back to mainnet client               |       | **✓** | Shape B active-fallback branch. Deliverable: Step 2 (skip + ticket only if Multichain messenger blocks). |
| UX-POLY-GATE      | Polygon mainnet cannot be deleted (`canDeleteNetwork` returns false)      | **✓** |       | Already covered in `app/util/networks/index.test.ts`. No new work.                                       |

---

## Delivery map

| ID                | Primary layer       | Deliverable | Status                             |
| ----------------- | ------------------- | ----------- | ---------------------------------- |
| UX-NET-HARNESS    | Integration Shape A | Step 1      | Done (`networks.ts` + smoke tests) |
| UX-NET-TOKEN-WIPE | Integration Shape A | —           | Done (token wipe on remove)        |
| UX-NET-ADD        | Integration Shape B | Step 2      | Done (`useNetworkOperations` flow) |
| UX-NET-DEL        | Integration Shape B | Step 2      | Done                               |
| UX-NET-DEL-ACTIVE | Integration Shape B | Step 2      | Done                               |
| UX-POLY-GATE      | **Unit** (exists)   | —           | Done                               |

---

## Decision rules used to assign these use cases

1. **Controller persistence / enablement / active-client fallback** (`saveNetwork` / `removeNetwork` → NC / NEC / MNC) → Integration Shape B. Real hook + real controllers; mock Engine shell and I/O.
2. **Harness construction only** (prove NC add/remove with mocked fetch) → Integration Shape A. Foundation for Shape B; not the product Test 2A by itself.
3. **Token wipe on network remove** (TokensController ← NC `stateChange`) → Integration Shape A with real TokensController on the same messenger.
4. `canDeleteNetwork` **pure gate** → Unit. Already covered; do not re-test the same boolean in Integration.

Where a use case fits multiple rules, pick the **cheapest sufficient layer** as primary. Prefer Shape A when a direct controller call is enough; use Shape B when hook → Engine wiring is part of the risk (same rule as `mms-mobile-testing` integration guidance).

---

## What's deliberately not in this matrix

- **Full Wallet /** `Engine.init` **bootstrap** — harnesses construct NC / NEC / MNC / TokensController with a test messenger; not a full Engine.
- **Appium network lifecycle** (custom add/delete on device) — Integration Shape B owns Test 2A; no Appium rewrite in this plan.
- **Snapshot tests** — out of scope (same as perps matrix).
