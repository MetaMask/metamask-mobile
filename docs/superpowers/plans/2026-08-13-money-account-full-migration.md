# Money Account Full Footprint Migration (function only)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a resumable, idempotent migration function that moves a Money Account’s entire on-chain and off-chain footprint from an old Money address to a new Money address (new key), with no UI.

**Architecture:** A persisted `MoneyAccountMigrationController` owns the state machine (`INVENTORIED → TORN_DOWN → BATCH_EXECUTED → RE_PROVISIONED → VERIFIED_INERT`). Pure helpers in `app/lib/Money/migration/` do inventory, gates, teardown, batch calldata, execute, re-provision, and verify. On-chain exit is **Option B only**: one EIP-7702 delegator atomic batch via `TransactionController.addTransactionBatch` (`atomic: true`, `disableSequential: true`). There is no sequential A-W fallback. If the source cannot batch-from-self, migration does not start.

**Tech Stack:** TypeScript, `BaseController`, `TransactionController.addTransactionBatch`, `@metamask/money-account-controller`, `@metamask/money-account-upgrade-controller`, `@metamask/chomp-api-service`, `@metamask/authenticated-user-storage`, `CardController.linkMoneyAccountCard`, MetaMask Delegation Framework 1.3.0 (`EIP7702StatelessDeleGatorImpl`).

## Global Constraints

- **No UI** in this plan: no consent screen, no wizard, no archive copy. The function is invoked *after* consent. `planHash` and destination are still pinned in persisted state so a later UI can display them.
- **Destination is already created.** Caller must have a new entropy source and a Money account from `MoneyAccountController.createMoneyAccount(newEntropyId)`. This function never creates an SRP or a MoneyKeyring.
- **MoneyKeyring is one account per entropy** (`addAccounts(1)` only, path `m/44'/4392018'/0'/0`). A new Money address always means a different entropy id.
- **Vault position moves as ERC-20.** Transfer vmUSD shares (`boringVault.transfer`). Do **not** call teller `withdraw`/`deposit`.
- **Gas token last** in the batch. Skip zero-amount ERC-20 transfers. Rebuild balances immediately before submit.
- **Keep 7702 on old.** Do not type-4 reset to `0x0`. Authorize the new Money address to operate the old account (see Gate 2).
- **No N-day watch.** After `VERIFIED_INERT`, the new Money address already operates the old one (residual Delegation, empty caveats). Sweep is on-demand via `sweepFormerAccount` — any time, no `watchUntil`, no scheduled poll, no payroll window. The ADR’s “watch N days / 30+ day straggler window” is skipped.
- **Perps/Predict protocol accounts are out of scope.** Only block in-flight Money↔Perps/Predict MM Pay txs. After re-provision, MM Pay Money funding must resolve to the new address.
- **Resumable.** Crash, kill, offline, or keyring lock must never submit a second exit batch or change destination. `resume()` reconciles persisted status against chain and continues. See **Resume contract**.
- **Point of no return:** `BATCH_EXECUTED`. Before that, abort/restore is allowed. After that, resume only.
- **Option B only.** One atomic 7702 batch for the whole on-chain exit. No sequential txs, no `executeSequential`, no `sequentialIndex`. If Gate 1 fails, stay `IDLE` with blocker `atomic-batch-unsupported`.
- **Programmatic signing** uses the Card pattern: `addTransactionBatch({ requireApproval: false, disableSequential: true, atomic: true, isGasFeeSponsored })`.
- **Tests:** AAA, no “should” in names, mock every external controller/RPC. `yarn jest <file>`.
- **No `any`.** All new code is TypeScript.

## Locked decisions (from current code, not the ADR)

These are the facts this plan is written against. If they change, update the matching task — do not silently reinterpret.

1. **Upgrade sequence on the new address already exists and is idempotent:** `associate-address` → `eip-7702-authorization` → `build-delegation` → `register-intents` (`MoneyAccountUpgradeController.upgradeAccount`). Re-provision calls this; it does not reimplement it.
2. **CHOMP client has no revoke-intents method today.** `IntentEntry.status` is `'active' | 'revoked'`, so the backend concept exists. Task 4 adds `ChompApiService.revokeIntents`. Until that lands in `@metamask/chomp-api-service`, mobile can vendor a thin wrapper that calls the same HTTP path the package will use: `POST /v1/intent/revoke` with `{ delegationHashes: Hex[] }` (confirm with CHOMP if the path differs; do not invent a second client).
3. **CHOMP delegations in user storage can already be revoked:** `AuthenticatedUserStorageService.revokeDelegation(delegationHash)`.
4. **Do not disassociate the old CHOMP address.** Durable old→new history needs the old association to remain. Teardown = stop automation (revoke intents + storage delegations), not unlink the profile address.
5. **Card unlink already exists:** `CardController.linkMoneyAccountCard({ moneyAccountAddress, delegationAmountHuman: '0' })`. Re-link is the same method with a positive amount on the **new** address.
6. **Deployed 7702 impl is `EIP7702StatelessDeleGatorImpl`** (upgrade controller resolves it from `@metamask/delegation-deployments` 1.3.0). That impl has **no on-chain `addSigner`**, so the Option B batch cannot include an add-signer inner call. After the batch confirms, sign a **root Delegation old→new** and persist it (Task 8). New key sweeps residuals via `DelegationManager.redeemDelegations`. 7702 on old stays live. Unknown impl = hard blocker, not a sequential fallback.
7. **Batch-from-self already works** for Money addresses: Card link uses `TransactionController:addTransactionBatch` with `from: moneyAccountAddress`. Gate 1 is a **hard preflight**: `isAtomicBatchSupported` plus `eth_getCode` matching `0xef0100 || delegatorImpl`. Fail = do not migrate (no A-W).
8. **`selectPrimaryMoneyAccount` today is “Money account whose entropy id equals the primary HD keyring”.** After migration, MM Pay funding will still point at the old address unless we persist an explicit active Money account id. That pointer is part of this function (not UI).
9. **Skip the ADR N-day watch.** Residual Delegation + kept 7702 already give the new account full execute on the old one. There is no timed watch, one-tap prompt window, or `watchUntil`. Persist the signed residual blob **on `formerMoneyAccounts[old]`** (not only on the in-flight controller fields) so a later migrate does not wipe the sweep key. `sweepFormerAccount(old)` can run at any time after completion.

## Out of scope (this plan)

- Consent / review-plan UI, freeze banners, “Former Money Account” archive chrome, cross-device “migration in progress” read-only chrome.
- ADR Appendix B **N-day watch** (timed poll, 30+ day payroll window, one-tap sweep prompt). Residual sweep is an on-demand function, not a scheduled watch.
- Creating the destination wallet / SRP.
- Backend “migration lock” endpoint (call it when it exists; local freeze is the mobile lock).
- Extracting this into `@metamask/money-account-migration-controller`. Keep domain logic in `app/lib/Money/migration/` so extraction is mechanical later.
- Option A / A-W sequential orchestration. If atomic batch is unsupported, the function refuses to start.

## File map

| File | Responsibility |
| ---- | -------------- |
| `app/lib/Money/migration/types.ts` | Status enum, inventory, plan, blockers, result types |
| `app/lib/Money/migration/planHash.ts` | Canonical JSON → keccak plan hash |
| `app/lib/Money/migration/inventory.ts` | Deterministic RPC + backend inventory |
| `app/lib/Money/migration/blockers.ts` | Pending Money txs, card spend, in-flight MM Pay |
| `app/lib/Money/migration/gates.ts` | Gate 1 hard preflight (batch-from-self) + Gate 2 (signer strategy) |
| `app/lib/Money/migration/encodeCalls.ts` | ERC-20 transfer/approve(0), native sweep (inner calls of the one atomic batch) |
| `app/lib/Money/migration/teardown.ts` | CHOMP intents + storage delegations + Card unlink |
| `app/lib/Money/migration/restore.ts` | Inverse of teardown (abort from `TORN_DOWN`) |
| `app/lib/Money/migration/executeBatch.ts` | Option B: one atomic `addTransactionBatch`; await existing `exitBatchId` on resume |
| `app/lib/Money/migration/reconcile.ts` | Jump persisted status forward from live chain/backend (never backward) |
| `app/lib/Money/migration/residualDelegation.ts` | Sign + persist root Delegation old→new after the batch (Stateless “add signer”) |
| `app/lib/Money/migration/sweepFormer.ts` | On-demand residual sweep after completion (`redeemDelegations` as new key). No timer. |
| `app/lib/Money/migration/reprovision.ts` | `upgradeAccount(new)` + Card re-link + active pointer |
| `app/lib/Money/migration/verify.ts` | Old address inert checks |
| `app/lib/Money/migration/freeze.ts` | `assertNotFrozen` used by Money tx builders |
| `app/core/Engine/controllers/money-account-migration/MoneyAccountMigrationController.ts` | State machine + persist + `migrate` / `resume` / `abort` |
| `app/core/Engine/controllers/money-account-migration/money-account-migration-controller-init.ts` | Engine init + auto-resume on unlock |
| `app/core/Engine/messengers/money-account-migration-controller-messenger.ts` | Restricted messenger |
| `app/selectors/moneyAccountController/index.ts` | Prefer `activeMoneyAccountId` when set |
| `app/components/UI/Money/utils/moneyAccountTransactions.ts` | Call `assertNotFrozen` at the top of builders |

---

## Resume contract

This is required behavior, not a later enhancement. Every task’s helpers must be safe to call twice.

**Never on resume:**
- Submit a second Option B batch if one is in-flight, confirmed, or already reflected on chain
- Change `plan.destination`
- Re-sign a residual Delegation with a new salt when a signed blob is already persisted
- Jump status **backward**

**Always on resume:**
- Re-read chain + backend (`collectInventory`) as source of truth
- Run `reconcile(persisted, live)` which may jump status **forward**
- Continue from the effective status; every helper is idempotent
- Hold a mutex so `migrate` / `resume` / `abort` cannot overlap

### Persist before the irreversible wait

Status advances **after** a step’s side effects complete, except the exit batch:

1. `addTransactionBatch` returns `batchId`
2. Persist `exitBatchId` **immediately**, status stays `TORN_DOWN`
3. Await confirmation
4. Persist `exitTxHash` and advance to `BATCH_EXECUTED`

A crash between (1) and (4) must await the existing batch, not submit another.

### Per-status resume

| Persisted status | Reconcile (chain wins) | Then do |
| ---------------- | ---------------------- | ------- |
| `IDLE` / `VERIFIED_INERT` | no-op | return |
| `INVENTORIED` | if `fundsMoved(plan, live)` → jump `BATCH_EXECUTED` | else `teardown()` (idempotent) then continue |
| `TORN_DOWN` | if `fundsMoved` → jump `BATCH_EXECUTED`. Else if `exitBatchId` set → **await that batch** (confirmed → `BATCH_EXECUTED`; failed/dropped → clear `exitBatchId` and submit once). Else if `now - tornDownAt >= AUTO_RESTORE_AFTER_MS` → `restore()` → `IDLE`. Else re-check blockers, rebuild amounts, submit one new batch, persist `exitBatchId` first | never submit while a batch id is live |
| `BATCH_EXECUTED` | if `residualDelegationHash` already set or storage already has the residual type for this pair → skip sign | else `persistResidualDelegation` (reuse persisted signed blob if present) then `reprovision` |
| `RE_PROVISIONED` | — | `sweepIfNeeded` (leftover vmUSD/mUSD from receives after tx 1), then `verifyOldInert`; on pass write `formerMoneyAccounts[source]` (incl. residual blob) + `activeMoneyAccountId` → `VERIFIED_INERT` |

`fundsMoved(plan, live)` is true when every token that was > 0 on the pinned plan is now 0 on source (vmUSD and mUSD). Native dust does not count. If the pinned plan had 0 vmUSD and 0 mUSD, treat as moved only when known allowances are already 0 (empty-account migrate).

### `migrate()` vs `resume()`

```ts
async migrate({ source, destination }: { source: Hex; destination: Hex }): Promise<void> {
  if (this.state.status !== 'IDLE' && this.state.status !== 'VERIFIED_INERT') {
    const plan = this.state.plan;
    if (
      plan &&
      equalsIgnoreCase(plan.inventory.source, source) &&
      equalsIgnoreCase(plan.destination, destination)
    ) {
      return this.resume();
    }
    throw new Error('migration-in-progress');
  }
  // ... inventory, persist INVENTORIED, then the same run loop as resume()
}
```

A second `migrate()` for the same pair after a crash is resume, not a new plan. Destination stays the pinned one.

Init: if persisted status is in-flight and the keyring is unlocked, call `resume()`. Errors are logged, not thrown. Subscribe to `KeyringController:unlock` so a locked crash still resumes after unlock.

### Crash / kill / offline (where the process died)

tx 1 is atomic for **funds + approval revokes + native sweep**. Residual Delegation is after the batch (Stateless impl has no add-signer inner call), so a crash can be “funds moved, signer blob not stored yet” — that is still `BATCH_EXECUTED` on reconcile via `fundsMoved`, then Task 8 runs. Never half-moved balances.

| Died during | Typical persisted state | On relaunch (`resume`) |
| ----------- | ----------------------- | ---------------------- |
| Inventory / gates | `IDLE` | `migrate()` starts a new run |
| After `INVENTORIED`, during teardown | `INVENTORIED` | `teardown()` again (idempotent). If `fundsMoved` (shouldn't be), jump `BATCH_EXECUTED` |
| After `TORN_DOWN`, before submit | `TORN_DOWN`, `exitBatchId == null` | Re-check blockers (mempool / card), rebuild amounts, submit **once**. If abandoned ≥ 7 days, **auto-restore** instead (see FAQ) |
| After persist `exitBatchId`, before/during confirm (incl. offline) | `TORN_DOWN` + `exitBatchId` | **Await that batch.** Confirmed → `BATCH_EXECUTED`. Failed/dropped → clear id, rebuild, submit once. Do not submit a parallel batch. Offline RPC failure: stay `TORN_DOWN`, log, retry next `resume`/unlock |
| Confirmed on chain, status not yet `BATCH_EXECUTED` | `TORN_DOWN` (+ maybe `exitBatchId`) | `fundsMoved` → jump `BATCH_EXECUTED` |
| Residual Delegation sign/store | `BATCH_EXECUTED` | Reuse persisted signed blob or sign once; never a new exit batch |
| `upgradeAccount` / Card re-link | `BATCH_EXECUTED` | Idempotent retry from failed step; funds already on dest |
| `verifyOldInert` | `RE_PROVISIONED` | Sweep leftovers if any, then verify again |
| After `VERIFIED_INERT` | done | no-op |
| During `abort()` restore | still `TORN_DOWN` (IDLE not persisted yet) | Treat as in-flight migrate: `resume()` continues toward the batch. Safer than leaving Card/CHOMP half-restored. User can `abort()` again once restore finished |

Kill during `abort()` does **not** persist an “aborting” flag. Next launch resumes the migration.

### ADR Appendix B → function behavior

UI chrome (consent copy, banners, settings path) stays out of scope. The function still implements the non-UI part of every row **except N-day watch**, which is skipped entirely (on-demand sweep instead).

| FAQ | Function |
| --- | -------- |
| **Cancel mid-migration** | `abort()`: `INVENTORIED` → clear → `IDLE`. `TORN_DOWN` with no `exitBatchId` → `restore()` then `IDLE`. `TORN_DOWN` with `exitBatchId` → throw `batch-in-flight`. `BATCH_EXECUTED`+ → throw `point-of-no-return` |
| **App killed / crash / offline** | Persist plan + status; `resume()` on init/unlock; chain is source of truth; table above. Offline await stays `TORN_DOWN` and retries |
| **Abandons after teardown** | Persist `tornDownAt`. `resume()` if `TORN_DOWN`, no `exitBatchId`, and `now - tornDownAt >= 7d` → `restore()` → `IDLE` (auto-restore). Banner is UI; this is the function timeout. Constant: `AUTO_RESTORE_AFTER_MS = 7 * 24 * 60 * 60 * 1000` |
| **Can user send txs?** | Frozen from `INVENTORIED` through `RE_PROVISIONED`: Money deposit/withdraw builders throw. CHOMP intents already revoked in teardown so automation cannot spend. Do not wrap KeyringController globally |
| **Tx already in mempool?** | Inventory blocker `pending-money-tx`. **Re-check blockers immediately before a new submit** from `TORN_DOWN` (crash could have left a user tx in mempool) |
| **Card swipe mid-migration?** | `in-flight-card-spend` blocker before consent. Post-teardown: intents/Card unlink → swipe declines. Delayed capture of a pre-teardown auth: before tx 1, `collectBlockers` again; if still in-flight, stay `TORN_DOWN` and throw (resume later). Do not submit on unconfirmed card capture. Function does not sleep an auth window |
| **Second device?** | Backend migration lock is a dependency (out of scope). Mobile: freeze + revoked intents. No local cross-device lock |
| **Automation pause?** | Teardown revokes intents **before** the batch; re-created on dest in `upgradeAccount` |
| **Receive during migration?** | Can't block receives. Rebuild amounts from live inventory immediately before a **new** submit. At `RE_PROVISIONED`, `sweepIfNeeded` (another atomic batch from old, dest locked, same persist-`*BatchId` rules) then `verifyOldInert`. Native dust after unsponsored gas is allowed |
| **Receive after completion?** | No N-day watch. Persist `formerMoneyAccounts[old]` with the signed residual Delegation. `sweepFormerAccount(old)` may run **any time** — new key `redeemDelegations` leftover vmUSD/mUSD/native to the pinned dest. Native dust is allowed to sit until a sweep is called. |
| **Recurring senders?** | After `VERIFIED_INERT`, `activeMoneyAccountId` is the new address (MM Pay). External payroll to the **old** address is not a timed window: call `sweepFormerAccount(old)` whenever leftovers appear. No function to rewrite external recipients. |
| **Perps/Predict open mid-migrate?** | Allowed. Only `in-flight-mm-pay` is a blocker |
| **tx 1 reverts** | Atomic: nothing moved. Clear `exitBatchId`, stay `TORN_DOWN`, rebuild, retry same atomic batch. No cleanup |
| **Signer add unsupported** | **Not A-W.** Stateless = residual Delegation after the batch. Unknown impl = blocker `unsupported-delegator-impl`, stay `IDLE` |
| **Re-provision fails partway** | Stay `BATCH_EXECUTED`. `upgradeAccount` is idempotent; `resume()` retries. Funds already on dest |
| **New wallet compromised pre-tx 1** | `abort()` while before `BATCH_EXECUTED` (and no live `exitBatchId`). After tx 1: flow is repeatable — `migrate({ source: current, destination: newer })` once `VERIFIED_INERT` or as a new run |
| **Rollback after completion?** | No. A reverse migrate is a new `migrate()` call. Old key remains in the MoneyKeyring; new key can sweep via residual Delegation |
| **Who pays gas?** | Sponsorship flag; else `insufficient-gas` blocker at inventory **and** again before submit |

---

### Task 1: Types, plan hash, controller skeleton

**Files:**
- Create: `app/lib/Money/migration/types.ts`
- Create: `app/lib/Money/migration/planHash.ts`
- Create: `app/lib/Money/migration/planHash.test.ts`
- Create: `app/core/Engine/controllers/money-account-migration/MoneyAccountMigrationController.ts`
- Create: `app/core/Engine/controllers/money-account-migration/MoneyAccountMigrationController.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: types below; controller methods `getState`, `isFrozen(address)`, `clearState`

```ts
import type { Hex } from '@metamask/utils';

export type MigrationStatus =
  | 'IDLE'
  | 'INVENTORIED'
  | 'TORN_DOWN'
  | 'BATCH_EXECUTED'
  | 'RE_PROVISIONED'
  | 'VERIFIED_INERT';

/** ADR: auto-restore a degraded (TORN_DOWN, no batch) account after this timeout. */
export const AUTO_RESTORE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type MigrationBlocker =
  | { kind: 'pending-money-tx'; txIds: string[] }
  | { kind: 'in-flight-card-spend' }
  | { kind: 'in-flight-mm-pay'; txIds: string[] }
  | { kind: 'insufficient-gas'; requiredWei: bigint; actualWei: bigint }
  | { kind: 'destination-missing' }
  | { kind: 'source-not-7702' }
  | { kind: 'atomic-batch-unsupported' }
  | { kind: 'unsupported-delegator-impl'; impl: Hex }
  | { kind: 'destination-equals-source' };

export type TokenAmount = { address: Hex; symbol: string; amount: bigint };

export type MigrationInventory = {
  chainId: Hex;
  source: Hex;
  destination: Hex;
  vmUsd: TokenAmount; // boringVault share token
  musd: TokenAmount;
  nativeWei: bigint;
  allowances: { token: Hex; spender: Hex; amount: bigint }[];
  code: Hex; // eth_getCode(source)
  delegatorImpl: Hex;
  chompIntentHashes: Hex[];
  chompDelegationHashes: Hex[];
  cardLinked: boolean;
  cardDelegationContract: Hex | null;
  /** Human-readable Card spend cap to re-grant on restore / re-link. Null if not linked. */
  cardDelegationAmountHuman: string | null;
};

export type MigrationPlan = {
  inventory: MigrationInventory;
  destination: Hex; // hard-locked
  createdAt: number;
};

export type MoneyAccountMigrationControllerState = {
  status: MigrationStatus;
  plan: MigrationPlan | null;
  planHash: Hex | null;
  /** Survives completion so MM Pay / selectors point at the new account. */
  activeMoneyAccountId: string | null;
  formerMoneyAccounts: {
    [oldAddress: Hex]: {
      newAddress: Hex;
      newAccountId: string;
      migratedAt: number;
      planHash: Hex;
      /** Copy of the residual blob so a later migrate does not wipe the sweep key. */
      residualDelegationHash: Hex;
      residualDelegation: {
        signedDelegation: unknown;
        chainId: Hex;
      };
      /** In-flight leftover sweep after completion. Same persist-before-await as exitBatchId. */
      sweepBatchId: Hex | null;
    };
  };
  lastError: string | null;
  /** Set immediately after addTransactionBatch returns; still TORN_DOWN until confirmed. */
  exitBatchId: Hex | null;
  exitTxHash: Hex | null;
  /** Optional leftover sweep after the main exit (incoming funds during/after batch). Same persist-before-await rules. */
  sweepBatchId: Hex | null;
  /** Unix ms when status became TORN_DOWN. Used for 7-day auto-restore. */
  tornDownAt: number | null;
  residualDelegationHash: Hex | null;
  /** Full signed blob so resume does not re-sign with a new salt. */
  residualDelegation: {
    signedDelegation: unknown;
    chainId: Hex;
  } | null;
};
```

- [ ] **Step 1: Write the plan-hash test**

Canonical hash is keccak256 of stable JSON: lowercase addresses, bigint as decimal strings, keys sorted. Changing destination or any amount must change the hash.

```ts
import { keccak256, bytesToHex } from '@metamask/utils';
import { hashMigrationPlan } from './planHash';
import { makePlan } from './testHelpers'; // local fixture in the test file

it('returns a different hash when destination changes', () => {
  const a = makePlan({ destination: '0x1111...1111' });
  const b = makePlan({ destination: '0x2222...2222' });

  expect(hashMigrationPlan(a)).not.toBe(hashMigrationPlan(b));
});

it('is stable across key insertion order', () => {
  const plan = makePlan();
  const reversed = { ...plan, inventory: { ...plan.inventory } };

  expect(hashMigrationPlan(plan)).toBe(hashMigrationPlan(reversed));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn jest app/lib/Money/migration/planHash.test.ts`
Expected: FAIL — `Cannot find module './planHash'`

- [ ] **Step 3: Implement `hashMigrationPlan`**

Sort keys recursively, encode bigints as `amount.toString(10)`, lowercase every `0x` string, then `keccak256(utf8(JSON.stringify(canonical)))`.

- [ ] **Step 4: Controller default state + `isFrozen`**

`isFrozen(address)` is `true` when `status` is one of `INVENTORIED | TORN_DOWN | BATCH_EXECUTED | RE_PROVISIONED` **and** `plan.inventory.source` matches `address` (case-insensitive). `VERIFIED_INERT` and `IDLE` are not frozen. After completion the old address stays recoverable but must not block residual sweeps signed by the new key.

Metadata: persist `status`, `plan`, `planHash`, `activeMoneyAccountId`, `formerMoneyAccounts`, `exitBatchId`, `exitTxHash`, `sweepBatchId`, `tornDownAt`, `residualDelegationHash`, `residualDelegation`. Do not include `lastError` in debug snapshots.

- [ ] **Step 5: Run tests and commit**

Run: `yarn jest app/lib/Money/migration/planHash.test.ts app/core/Engine/controllers/money-account-migration/MoneyAccountMigrationController.test.ts`

```bash
git add app/lib/Money/migration app/core/Engine/controllers/money-account-migration
git commit -m "$(cat <<'EOF'
feat: add Money Account migration types and controller skeleton

EOF
)"
```

---

### Task 2: Inventory + blockers

**Files:**
- Create: `app/lib/Money/migration/inventory.ts`
- Create: `app/lib/Money/migration/inventory.test.ts`
- Create: `app/lib/Money/migration/blockers.ts`
- Create: `app/lib/Money/migration/blockers.test.ts`

**Interfaces:**
- Consumes: `MigrationInventory`, vault config (`selectMoneyAccountVaultConfig` / `getMoneyAccountVaultConfig`), `MUSD_TOKEN_ADDRESS_BY_CHAIN` from `@metamask/money-account-utils`
- Produces: `collectInventory(deps, source, destination): Promise<MigrationInventory>`, `collectBlockers(deps, inventory): Promise<MigrationBlocker[]>`

Inventory is **deterministic** — no indexer. Use these RPCs against the Money vault chain (today Monad, `vaultConfig.chainId`):

| Item | How |
| ---- | --- |
| vmUSD | `boringVault.balanceOf(source)` |
| mUSD | `musd.balanceOf(source)` |
| native | `eth_getBalance(source)` |
| allowances | `musd.allowance(source, boringVault)` and `musd.allowance(source, cardDelegationContract)` when Card config exists |
| 7702 code | `eth_getCode(source)` |
| CHOMP intents | `ChompApiService.getIntentsByAddress(source)` → hashes with `status === 'active'` |
| CHOMP delegations | `AuthenticatedUserStorageService.listDelegations()` filtered to `delegator === source` |
| Card | `isMoneyAccountDelegatedForCard` / `CardController` home data |

Inject RPC via a `MigrationRpc` interface so tests never touch Engine:

```ts
export type MigrationRpc = {
  getBalance(address: Hex): Promise<bigint>;
  getCode(address: Hex): Promise<Hex>;
  balanceOf(token: Hex, owner: Hex): Promise<bigint>;
  allowance(token: Hex, owner: Hex, spender: Hex): Promise<bigint>;
};
```

- [ ] **Step 1: Failing inventory tests**

```ts
it('reads vmUSD from boringVault.balanceOf and mUSD from musd.balanceOf', async () => {
  const rpc = makeRpc({
    balanceOf: jest.fn(async (token, owner) => {
      if (token === BORING_VAULT) return 5n * 10n ** 18n;
      if (token === MUSD) return 12n * 10n ** 6n;
      return 0n;
    }),
    getBalance: jest.fn(async () => 1n * 10n ** 16n),
    getCode: jest.fn(async () => DELEGATED_CODE),
    allowance: jest.fn(async () => 0n),
  });

  const inventory = await collectInventory(makeDeps({ rpc }), SOURCE, DEST);

  expect(inventory.vmUsd.amount).toBe(5n * 10n ** 18n);
  expect(inventory.musd.amount).toBe(12n * 10n ** 6n);
  expect(inventory.nativeWei).toBe(1n * 10n ** 16n);
});

it('throws when source equals destination', async () => {
  await expect(
    collectInventory(makeDeps(), SOURCE, SOURCE),
  ).rejects.toThrow('destination-equals-source');
});
```

- [ ] **Step 2: Implement `collectInventory`**

Known spenders only: `vaultConfig.boringVault`, Card `delegationContract` from `getVedaTokenConfig`. Skip Card allowance if Card is not linked / no delegation contract.

- [ ] **Step 3: Failing blocker tests**

In-flight statuses for Money and MM Pay: `unapproved`, `approved`, `signed`, `submitted` (same set Money activity already treats as live). Match:

- Money deposit/withdraw via `isMoneyAccountTx`
- Perps/Predict Money rail via `isPerpsPredictMoneyActivity`
- Card: `CardController.state.moneyAccountCardLinkInProgress` OR in-flight card withdrawal (`ChompApiService` has `createWithdrawal` — treat any pending card home `FundingStatus` that is not settled as `in-flight-card-spend` if the provider exposes it; if the provider has no pending-auth API, use `moneyAccountCardLinkInProgress` only and document that delayed-capture wait is a later UI/blocker enhancement)

```ts
it('returns pending-money-tx when a submitted moneyAccountDeposit exists from source', async () => {
  const blockers = await collectBlockers(
    makeDeps({
      transactions: [
        {
          id: 'tx-1',
          status: TransactionStatus.submitted,
          type: TransactionType.moneyAccountDeposit,
          txParams: { from: SOURCE },
        },
      ],
    }),
    makeInventory(),
  );

  expect(blockers).toEqual([
    { kind: 'pending-money-tx', txIds: ['tx-1'] },
  ]);
});

it('returns in-flight-mm-pay for a perpsDeposit paid with Monad mUSD', async () => {
  const blockers = await collectBlockers(
    makeDeps({
      transactions: [
        {
          id: 'tx-pay',
          status: TransactionStatus.submitted,
          type: TransactionType.perpsDeposit,
          metamaskPay: { tokenAddress: MUSD, chainId: MONAD },
        },
      ],
    }),
    makeInventory(),
  );

  expect(blockers[0]?.kind).toBe('in-flight-mm-pay');
});
```

- [ ] **Step 4: Implement `collectBlockers`**

Also emit `insufficient-gas` when sponsorship is off and `nativeWei` cannot cover a conservative gas ceiling (use the same Monad sponsorship flag Card uses: `getGasFeesSponsoredNetworkEnabled`). When sponsorship is on, do **not** block on native.

Emit `source-not-7702` when `eth_getCode` is empty (`0x` / `'0x'`).

- [ ] **Step 5: Run tests and commit**

Run: `yarn jest app/lib/Money/migration/inventory.test.ts app/lib/Money/migration/blockers.test.ts`

---

### Task 3: Gates (atomic-batch preflight + signer strategy)

**Files:**
- Create: `app/lib/Money/migration/gates.ts`
- Create: `app/lib/Money/migration/gates.test.ts`

**Interfaces:**
- Consumes: `MigrationInventory`, `TransactionController.isAtomicBatchSupported`, `getDeleGatorEnvironment(chainId)`
- Produces: `assertAtomicBatchSupported(inventory, atomicBatchResult): MigrationBlocker | null`, `assertStatelessDelegator(code, env): MigrationBlocker | null`

Gate 1 — batch-from-self. **Hard preflight.** Failure is a blocker, not a fallback:

```ts
const support = await isAtomicBatchSupported({
  address: inventory.source,
  chainIds: [inventory.chainId],
});
const chain = support.find((s) => s.chainId.toLowerCase() === inventory.chainId.toLowerCase());
const batchOk = Boolean(chain && (!chain.delegationAddress || chain.isSupported));
```

Plus `inventory.code` must start with `0xef0100` (EIP-7702 designation) and the impl suffix must equal `environment.EIP7702StatelessDeleGatorImpl`. If `!batchOk` or code is not 7702-delegated to that impl, return `{ kind: 'atomic-batch-unsupported' }` (or `source-not-7702` / `unsupported-delegator-impl`). `migrate()` stays `IDLE`.

Gate 2 — Stateless DeleGator required. Live Money accounts use Stateless DeleGator, which cannot add an on-chain signer inside the batch. Option B still keeps 7702 on old; “new address is a signer” is a **root Delegation old→new** signed after the batch (Task 8). That is an off-chain signature, not a second exit tx.

```ts
export function assertStatelessDelegator(
  code: Hex,
  env: DeleGatorEnvironment,
): MigrationBlocker | null {
  const impl = implFrom7702Code(code); // bytes 10..29 of 0xef0100 || address
  if (impl === env.EIP7702StatelessDeleGatorImpl.toLowerCase()) {
    return null;
  }
  return { kind: 'unsupported-delegator-impl', impl: impl as Hex };
}
```

- [ ] **Step 1: Failing tests for 7702 code parsing, batch-ok, batch-unsupported, unknown impl**
- [ ] **Step 2: Implement `implFrom7702Code` + `assertAtomicBatchSupported` + `assertStatelessDelegator`**
- [ ] **Step 3: Run `yarn jest app/lib/Money/migration/gates.test.ts` and commit**

---

### Task 4: CHOMP revoke-intents client

**Files:**
- Modify: `node_modules` is not the place — this is a **core package** change to `@metamask/chomp-api-service`. Until that ships, create a mobile adapter:
- Create: `app/lib/Money/migration/chompRevoke.ts`
- Create: `app/lib/Money/migration/chompRevoke.test.ts`

**Interfaces:**
- Produces: `revokeChompIntents({ getBearerToken, baseUrl, hashes: Hex[] }): Promise<void>`

```ts
export async function revokeChompIntents(params: {
  baseUrl: string;
  getBearerToken: () => Promise<string>;
  hashes: Hex[];
}): Promise<void> {
  if (params.hashes.length === 0) return;
  const token = await params.getBearerToken();
  const response = await fetch(`${params.baseUrl}/v1/intent/revoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ delegationHashes: params.hashes }),
  });
  if (!response.ok) {
    throw new Error(`CHOMP revoke intents failed: ${response.status}`);
  }
}
```

Idempotent: a hash that is already `revoked` must not throw. If the API returns 404/409 for already-revoked, treat as success.

When `@metamask/chomp-api-service` gains `revokeIntents`, delete this adapter and call `ChompApiService:revokeIntents` through the messenger.

- [ ] **Step 1: Tests with nock/fetch mock — empty hashes no-op; 200 ok; 500 throws; 409 already-revoked succeeds**
- [ ] **Step 2: Implement adapter**
- [ ] **Step 3: Run `yarn jest app/lib/Money/migration/chompRevoke.test.ts` and commit**

---

### Task 5: Teardown + restore

**Files:**
- Create: `app/lib/Money/migration/teardown.ts`
- Create: `app/lib/Money/migration/teardown.test.ts`
- Create: `app/lib/Money/migration/restore.ts`
- Create: `app/lib/Money/migration/restore.test.ts`

**Interfaces:**
- Consumes: Task 4, `AuthenticatedUserStorageService.revokeDelegation`, `CardController.linkMoneyAccountCard`
- Produces: `teardown(deps, inventory): Promise<void>`, `restore(deps, inventory): Promise<void>`

Teardown order (ADR: stop automation **before** funds move):

1. `revokeChompIntents` for `inventory.chompIntentHashes`
2. `revokeDelegation` for each `inventory.chompDelegationHashes` (user-storage CHOMP auto-deposit/withdraw delegations)
3. If `inventory.cardLinked`: `linkMoneyAccountCard({ moneyAccountAddress: source, delegationAmountHuman: '0' })`

Do **not** call `approve(0)` here — that is on-chain and belongs in the batch.

Restore (abort from `TORN_DOWN` only):

1. `MoneyAccountUpgradeController.upgradeAccount(source)` — idempotent; re-creates missing delegations + intents
2. If `inventory.cardLinked` was true: `linkMoneyAccountCard` with the previous positive cap. Persist the pre-teardown cap on the plan (`inventory` should include `cardDelegationAmountHuman: string | null` — add this field in Task 1 if missing; snapshot it during inventory from Card home data / current allowance).

```ts
it('revokes intents then storage delegations then unlinks card', async () => {
  const deps = makeTeardownDeps();

  await teardown(deps, makeInventory({
    chompIntentHashes: ['0xint'],
    chompDelegationHashes: ['0xdel'],
    cardLinked: true,
  }));

  expect(deps.revokeChompIntents).toHaveBeenCalledWith(
    expect.objectContaining({ hashes: ['0xint'] }),
  );
  expect(deps.revokeDelegation).toHaveBeenCalledWith('0xdel');
  expect(deps.linkMoneyAccountCard).toHaveBeenCalledWith({
    moneyAccountAddress: SOURCE,
    delegationAmountHuman: '0',
  });
});

it('skips card unlink when card was not linked', async () => {
  await teardown(makeTeardownDeps(), makeInventory({ cardLinked: false }));

  expect(makeTeardownDeps().linkMoneyAccountCard).not.toHaveBeenCalled();
});
```

Make teardown idempotent: already-revoked hashes succeed; Card unlink when allowance is already 0 succeeds (Card controller already allows amount `"0"`).

`restore()` is also used by **7-day auto-restore** when `resume()` finds `TORN_DOWN`, no `exitBatchId`, and `tornDownAt` is stale. Same path as user `abort()` from `TORN_DOWN`.

- [ ] **Step 1: Write failing teardown/restore tests**
- [ ] **Step 2: Implement**
- [ ] **Step 3: Run `yarn jest app/lib/Money/migration/teardown.test.ts app/lib/Money/migration/restore.test.ts` and commit**

---

### Task 6: Encode batch calls

**Files:**
- Create: `app/lib/Money/migration/encodeCalls.ts`
- Create: `app/lib/Money/migration/encodeCalls.test.ts`

**Interfaces:**
- Consumes: `MigrationInventory`
- Produces: `buildExitCalls(inventory, nativeSweepWei): BatchCall[]`

```ts
export type BatchCall = { to: Hex; data: Hex; value: Hex };

const ERC20_IFACE = new ethers.utils.Interface([
  'function transfer(address to, uint256 amount)',
  'function approve(address spender, uint256 amount)',
]);
```

Call order (ADR):

1. `vmUSD.transfer(destination, amount)` if amount > 0 — `to` = `boringVault`
2. `mUSD.transfer(destination, amount)` if amount > 0
3. For each allowance > 0: `token.approve(spender, 0)` (mUSD → boringVault, mUSD → cardDelegationContract)
4. Native sweep last: `{ to: destination, data: '0x', value: toHex(nativeSweepWei) }` if `nativeSweepWei > 0`

These are the **inner calls of the one Option B batch**. No add-signer inner call (Stateless impl has none). Residual Delegation is Task 8, after the batch confirms.

```ts
it('puts native sweep last and skips zero vmUSD', () => {
  const calls = buildExitCalls(
    makeInventory({ vmUsd: 0n, musd: 10n, nativeWei: 5n }),
    5n,
  );

  expect(calls[0]?.to).toBe(MUSD);
  expect(calls[calls.length - 1]).toEqual({
    to: DEST,
    data: '0x',
    value: '0x5',
  });
});

it('encodes approve(spender, 0) for each non-zero allowance', () => {
  const calls = buildExitCalls(
    makeInventory({
      allowances: [{ token: MUSD, spender: BORING_VAULT, amount: 99n }],
    }),
    0n,
  );

  expect(calls.some((c) => c.to === MUSD && c.data.startsWith(APPROVE_SELECTOR))).toBe(true);
});
```

Native sweep amount is **not** `inventory.nativeWei` when the user pays gas. `executeBatch` computes `nativeSweepWei`:

- Sponsored: `nativeWei` (relay pays gas)
- Unsponsored: `max(0, nativeWei - estimatedGasCost)` — if 0, omit the sweep; residuals are swept later via the residual delegation

- [ ] **Step 1: Write failing encode tests (known calldata hex for transfer/approve)**
- [ ] **Step 2: Implement**
- [ ] **Step 3: Run `yarn jest app/lib/Money/migration/encodeCalls.test.ts` and commit**

---

### Task 7: Execute the Option B atomic batch

**Files:**
- Create: `app/lib/Money/migration/executeBatch.ts`
- Create: `app/lib/Money/migration/executeBatch.test.ts`

**Interfaces:**
- Consumes: `buildExitCalls`, `TransactionController.addTransactionBatch`, Card’s `awaitTransactionConfirmed`
- Produces: `executeAtomicExit(deps, plan, persisted): Promise<{ batchId: Hex; txHash: Hex }>`

`persisted` is `{ exitBatchId: Hex | null }`. Resume must not double-submit:

```ts
if (persisted.exitBatchId) {
  const outcome = await awaitExistingBatch(persisted.exitBatchId);
  if (outcome.status === 'confirmed') return { batchId: persisted.exitBatchId, txHash: outcome.txHash };
  if (outcome.status === 'failed' || outcome.status === 'dropped') {
    // caller clears exitBatchId, then this function submits once
  }
}
if (fundsMoved(plan, await recollectInventory())) {
  throw new FundsAlreadyMovedError(); // caller jumps to BATCH_EXECUTED, does not submit
}
```

This is the only on-chain exit. Copy the Card link submit shape, which already works from a Money address:

```ts
const { batchId } = await addTransactionBatch({
  from: plan.inventory.source,
  networkClientId,
  origin: 'metamask:money-account-migration',
  requireApproval: false,
  disableHook: false, // allow 7702 publish / sponsorship
  disableSequential: true, // never fall through to n txs
  isGasFeeSponsored: sponsored,
  atomic: true,
  transactions: calls.map((call) => ({
    params: { to: call.to, data: call.data, value: call.value },
    type: TransactionType.contractInteraction,
  })),
});
```

Wait for confirmation via `awaitTransactionConfirmed` (reuse `app/core/Engine/controllers/card-controller/utils/awaitTransactionConfirmed.ts`). The **controller** must persist `exitBatchId` before that wait (see Resume contract). On revert: throw; caller stays in `TORN_DOWN`, **clears** `exitBatchId`, and a later `resume()` may submit once more. Do not advance status on revert. Do not submit inner calls one-by-one.

Immediately before encoding a **new** submit, **re-collect balances** (incoming funds during freeze) and rebuild calls. **Re-run `collectBlockers`** on that live inventory: pending mempool txs or delayed card capture stay `TORN_DOWN` and throw (resume later). Destination stays the pinned `plan.destination`. If destination on the rebuilt inventory differs from `plan.destination`, throw — never retarget.

```ts
it('submits one atomic batch from source with destination-locked transfer calldata', async () => {
  const addTransactionBatch = jest.fn().mockResolvedValue({ batchId: '0xbatch' });

  await executeAtomicExit(makeExecDeps({ addTransactionBatch }), plan);

  expect(addTransactionBatch).toHaveBeenCalledTimes(1);
  const request = addTransactionBatch.mock.calls[0][0];
  expect(request.from).toBe(SOURCE);
  expect(request.atomic).toBe(true);
  expect(request.disableSequential).toBe(true);
  expect(request.requireApproval).toBe(false);
});

it('does not change destination when rebuilt inventory has a different dest field', async () => {
  const plan = makePlan({ destination: DEST_A });
  const deps = makeExecDeps({
    recollectInventory: async () => makeInventory({ destination: DEST_B }),
  });

  await expect(executeAtomicExit(deps, plan)).rejects.toThrow('destination-locked');
});

it('awaits an existing exitBatchId instead of submitting a second batch', async () => {
  const addTransactionBatch = jest.fn();
  const awaitExistingBatch = jest.fn().mockResolvedValue({
    status: 'confirmed',
    txHash: '0xhash',
  });

  const result = await executeAtomicExit(
    makeExecDeps({ addTransactionBatch, awaitExistingBatch }),
    plan,
    { exitBatchId: '0xbatch' },
  );

  expect(addTransactionBatch).not.toHaveBeenCalled();
  expect(result).toEqual({ batchId: '0xbatch', txHash: '0xhash' });
});
```

- [ ] **Step 1: Write failing execute tests**
- [ ] **Step 2: Implement `executeAtomicExit` only**
- [ ] **Step 3: Run `yarn jest app/lib/Money/migration/executeBatch.test.ts` and commit**

---

### Task 8: Residual Delegation (Stateless “add signer”)

**Files:**
- Create: `app/lib/Money/migration/residualDelegation.ts`
- Create: `app/lib/Money/migration/residualDelegation.test.ts`

**Interfaces:**
- Consumes: `DelegationController:signDelegation`, `AuthenticatedUserStorageService:createDelegation`, `hashDelegation` from `@metamask/delegation-core`
- Produces: `persistResidualDelegation(deps, source, destination, chainId): Promise<Hex>` (returns delegation hash)

This runs **after** the single Option B batch confirms (`BATCH_EXECUTED`). It is not a second exit tx and not A-W. Stateless DeleGator cannot put an add-signer call inside the batch; this signed root Delegation is how the new key sweeps residuals **at any later time** while 7702 stays on old. There is no N-day expiry on the Delegation (empty caveats). On `VERIFIED_INERT`, copy `{ residualDelegation, residualDelegationHash }` onto `formerMoneyAccounts[source]` so the blob survives a later migrate.

Resume rules:
- If `residualDelegationHash` is already set, return it (no sign, no store).
- Else if `residualDelegation` signed blob is persisted, re-call `createDelegation` with that blob (idempotent store), do **not** sign a new salt.
- Else sign once, persist `{ signedDelegation, chainId }` **before** the storage call, then store, then persist the hash.

If the app crashes between batch and this step, `resume` retries it; the old key is still in the MoneyKeyring.

Delegation shape: root authority, `delegator: source`, `delegate: destination`, **empty caveats** (full execute on old). Salt: 32 random bytes.

```ts
const unsigned = {
  delegate: destination,
  delegator: source,
  authority: ROOT_AUTHORITY,
  caveats: [] as Caveat[],
  salt,
};
const signature = await signDelegation({ delegation: unsigned, chainId });
await createDelegation({
  signedDelegation: { ...unsigned, signature },
  metadata: {
    delegationHash,
    chainIdHex: chainId,
    type: 'money-account-migration-residual',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    tokenSymbol: 'native',
    allowance: '0x0',
  },
});
```

If user-storage metadata `type` is a closed enum and rejects `'money-account-migration-residual'`, store as `'cash-withdrawal'` **only if** CHOMP would then auto-execute it — it must not. Prefer a dedicated type; if the API rejects unknown types, persist locally on the migration controller (`residualDelegationHash`) and still keep the signed blob in controller state so sweeps do not depend on CHOMP picking it up.

```ts
it('reuses a persisted signed blob and does not sign again', async () => {
  const signDelegation = jest.fn();
  const createDelegation = jest.fn().mockResolvedValue(undefined);
  const blob = { signedDelegation: { signature: '0xsig' }, chainId: CHAIN_ID };

  await persistResidualDelegation(
    makeDeps({ signDelegation, createDelegation }),
    SOURCE,
    DEST,
    CHAIN_ID,
    { residualDelegation: blob, residualDelegationHash: null },
  );

  expect(signDelegation).not.toHaveBeenCalled();
  expect(createDelegation).toHaveBeenCalledWith(
    expect.objectContaining({ signedDelegation: blob.signedDelegation }),
  );
});
```

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Implement**
- [ ] **Step 3: Run `yarn jest app/lib/Money/migration/residualDelegation.test.ts` and commit**

---

### Task 9: Re-provision + verify inert + primary pointer

**Files:**
- Create: `app/lib/Money/migration/reprovision.ts`
- Create: `app/lib/Money/migration/reprovision.test.ts`
- Create: `app/lib/Money/migration/verify.ts`
- Create: `app/lib/Money/migration/verify.test.ts`
- Modify: `app/selectors/moneyAccountController/index.ts`
- Modify: `app/selectors/moneyAccountController/index.test.ts`

**Interfaces:**
- Consumes: `MoneyAccountUpgradeController.upgradeAccount`, `CardController.linkMoneyAccountCard`, `collectInventory`
- Produces: `reprovision(deps, plan): Promise<void>`, `verifyOldInert(deps, plan): Promise<void>`

Re-provision:

1. `upgradeAccount(destination)` — associate + 7702 + CHOMP delegations + intents. Existing retry helper: `upgradeAccountWithRetry` from `app/lib/Money/upgrade-account-with-retry.ts`. Pass a dedicated `AbortSignal` that is **not** tied to screen focus (this is not UI). For the function-only milestone, use a signal the controller owns and abort only on `abort()`.
2. If `plan.inventory.cardLinked`: `linkMoneyAccountCard({ moneyAccountAddress: destination, delegationAmountHuman: plan.inventory.cardDelegationAmountHuman })`.
3. Set `activeMoneyAccountId` to the destination Money account id (from `MoneyAccountController.getMoneyAccount({ entropySource })` or by scanning `moneyAccounts` for `address === destination`).

Verify old inert (all must hold):

| Check | Pass |
| ----- | ---- |
| vmUSD | `balanceOf == 0` |
| mUSD | `balanceOf == 0` |
| allowances | each known spender `== 0` |
| 7702 | code still delegated (not `0x`) |
| CHOMP intents | no `active` intents on source |
| Card | source not in this session’s funding wallets |

Native dust may remain if unsponsored; that is **not** a failure.

**Incoming funds after tx 1 (still in this migrate):** before verify, `sweepIfNeeded(live)` — if source vmUSD or mUSD > 0, run another Option B atomic batch of leftover transfers (dest locked). Persist `sweepBatchId` with the same submit-then-await rules as `exitBatchId`. Crash during sweep: stay `RE_PROVISIONED`, await `sweepBatchId` or submit once if leftovers remain. Then `verifyOldInert`.

**Incoming funds after `VERIFIED_INERT`:** not a watch. Task 12 `sweepFormerAccount`.

Selector change:

```ts
export const selectPrimaryMoneyAccount = createSelector(
  selectMoneyAccounts,
  selectPrimaryHDKeyring,
  selectActiveMoneyAccountId, // from MoneyAccountMigrationController.state
  (moneyAccounts, primaryHDKeyring, activeId) => {
    if (activeId && moneyAccounts[activeId]) {
      return moneyAccounts[activeId];
    }
    const primaryKeyringId = primaryHDKeyring?.metadata?.id;
    if (!primaryKeyringId) return undefined;
    return Object.values(moneyAccounts).find(
      (account) => account.options.entropy.id === primaryKeyringId,
    );
  },
);
```

This is the MM Pay funding pointer. No Perps/Predict protocol re-onboard.

```ts
it('calls upgradeAccount with the destination address', async () => {
  const upgradeAccount = jest.fn().mockResolvedValue(undefined);

  await reprovision(makeDeps({ upgradeAccount }), plan);

  expect(upgradeAccount).toHaveBeenCalledWith(DEST);
});

it('throws when old vmUSD balance is not zero', async () => {
  await expect(
    verifyOldInert(makeDeps({ inventory: makeInventory({ vmUsd: 1n }) }), plan),
  ).rejects.toThrow('old-not-inert');
});
```

- [ ] **Step 1: Write failing tests including selector override**
- [ ] **Step 2: Implement**
- [ ] **Step 3: Run the test files and commit**

---

### Task 10: Freeze hook in Money tx builders

**Files:**
- Create: `app/lib/Money/migration/freeze.ts`
- Create: `app/lib/Money/migration/freeze.test.ts`
- Modify: `app/components/UI/Money/utils/moneyAccountTransactions.ts`
- Modify: `app/components/UI/Money/utils/moneyAccountTransactions.test.ts`

**Interfaces:**
- Consumes: `MoneyAccountMigrationController.isFrozen`
- Produces: `assertMoneyAccountNotFrozen(address: Hex): void`

```ts
export function assertMoneyAccountNotFrozen(address: Hex): void {
  const frozen = Engine.context.MoneyAccountMigrationController.isFrozen(address);
  if (frozen) {
    throw new Error('Money Account is frozen for migration');
  }
}
```

Call at the start of `buildMoneyAccountDepositBatch` and `buildMoneyAccountWithdrawBatch`. That blocks new Money tx types from being constructed. Concurrent `addTransaction` from other paths should also be covered by checking freeze inside the controller’s `migrate` start (and by teardown having already revoked CHOMP intents). Do not wrap KeyringController globally.

- [ ] **Step 1: Test that builders throw when frozen**
- [ ] **Step 2: Implement assert + wire into builders**
- [ ] **Step 3: Run the moneyAccountTransactions tests + freeze tests and commit**

---

### Task 11: State machine — `migrate`, `resume`, `abort`

**Files:**
- Create: `app/lib/Money/migration/reconcile.ts`
- Create: `app/lib/Money/migration/reconcile.test.ts`
- Modify: `app/core/Engine/controllers/money-account-migration/MoneyAccountMigrationController.ts`
- Modify: `app/core/Engine/controllers/money-account-migration/MoneyAccountMigrationController.test.ts`
- Create: `app/core/Engine/controllers/money-account-migration/money-account-migration-controller-init.ts`
- Create: `app/core/Engine/controllers/money-account-migration/money-account-migration-controller-init.test.ts`
- Create: `app/core/Engine/messengers/money-account-migration-controller-messenger.ts`
- Modify: `app/core/Engine/messengers/index.ts` (register messenger)
- Modify: `app/core/Engine/Engine.ts` (register init + persist state)

**Interfaces:**
- Consumes: all previous helpers
- Produces:

```ts
class MoneyAccountMigrationController {
  migrate(params: {
    source: Hex;
    destination: Hex;
  }): Promise<void>;
  resume(): Promise<void>;
  abort(): Promise<void>;
  isFrozen(address: Hex): boolean;
  /** After VERIFIED_INERT: new key sweeps leftovers on a former Money address. No timer. */
  sweepFormerAccount(oldAddress: Hex): Promise<void>;
}
```

State transitions (persist after each completed step; persist `exitBatchId` at submit):

```
IDLE
  migrate() → inventory + gates + blockers
    blockers? throw, stay IDLE
    else persist plan+planHash → INVENTORIED
INVENTORIED
  teardown() → persist TORN_DOWN + tornDownAt
TORN_DOWN
  persist exitBatchId → await confirm → persist BATCH_EXECUTED
  revert: clear exitBatchId, stay TORN_DOWN
BATCH_EXECUTED
  persist signed residual blob → store → persist hash
  reprovision() → persist RE_PROVISIONED
RE_PROVISIONED
  verifyOldInert() → write formerMoneyAccounts[source] (incl. residual blob) + activeMoneyAccountId → persist VERIFIED_INERT
```

`resume()` implements the **Resume contract** table. `reconcile(status, plan, live)`:

```ts
export function reconcile(params: {
  status: MigrationStatus;
  plan: MigrationPlan;
  live: MigrationInventory;
  residualDelegationHash: Hex | null;
}): MigrationStatus {
  if (params.status === 'IDLE' || params.status === 'VERIFIED_INERT') {
    return params.status;
  }
  if (
    (params.status === 'INVENTORIED' || params.status === 'TORN_DOWN') &&
    fundsMoved(params.plan, params.live)
  ) {
    return 'BATCH_EXECUTED';
  }
  return params.status; // never backward
}
```

`abort()`:

| Status | Behavior |
| ------ | -------- |
| `IDLE` / `INVENTORIED` | clear plan + `exitBatchId`, back to `IDLE` |
| `TORN_DOWN` | if `exitBatchId` is set, **do not abort** (batch may still confirm) — throw `'batch-in-flight'` or wait then treat as `BATCH_EXECUTED`. If no batch id: `restore()`, then `IDLE` |
| `BATCH_EXECUTED`+ | throw `'point-of-no-return'` |

Rebuild amounts before a **new** submit on `resume` from `TORN_DOWN`. Destination never changes.

Init: if persisted status is in-flight and keyring is unlocked, call `resume()` (errors logged, not thrown — same pattern as upgrade bootstrap). Also subscribe to unlock.

Controller tests (table-driven):

```ts
it('stays IDLE when Gate 1 reports atomic-batch-unsupported', async () => { ... });
it('moves INVENTORIED → TORN_DOWN → BATCH_EXECUTED on a successful atomic batch', async () => { ... });
it('does not advance past TORN_DOWN when the batch reverts', async () => { ... });
it('retries the same atomic batch on resume from TORN_DOWN, never sequential inner calls', async () => { ... });
it('awaits exitBatchId on resume from TORN_DOWN and does not submit a second batch', async () => { ... });
it('jumps INVENTORIED to BATCH_EXECUTED when live inventory shows funds already moved', async () => { ... });
it('calls resume when migrate is invoked for the same source and destination while in-flight', async () => { ... });
it('resumes from BATCH_EXECUTED into upgradeAccount without submitting another batch', async () => { ... });
it('skips residual sign on resume when residualDelegationHash is already set', async () => { ... });
it('restores CHOMP and Card when abort is called from TORN_DOWN with no exitBatchId', async () => { ... });
it('throws batch-in-flight when abort is called from TORN_DOWN with exitBatchId set', async () => { ... });
it('throws point-of-no-return when abort is called from BATCH_EXECUTED', async () => { ... });
it('auto-restores from TORN_DOWN when tornDownAt is older than 7 days and exitBatchId is null', async () => { ... });
it('does not auto-restore when exitBatchId is set even if tornDownAt is stale', async () => { ... });
it('re-checks blockers before a new submit on resume from TORN_DOWN', async () => { ... });
it('sweeps leftover vmUSD on resume from RE_PROVISIONED then verifies inert', async () => { ... });
it('stays TORN_DOWN when awaitExistingBatch throws offline and does not submit a second batch', async () => { ... });
```

Messenger actions to delegate (minimum):

- `TransactionController:addTransactionBatch`
- `TransactionController:getState`
- `TransactionController:isAtomicBatchSupported`
- `NetworkController:findNetworkClientIdByChainId`
- `NetworkController:getNetworkClientById`
- `ChompApiService:getIntentsByAddress`
- `ChompApiService:getServiceDetails`
- `AuthenticatedUserStorageService:listDelegations`
- `AuthenticatedUserStorageService:revokeDelegation`
- `AuthenticatedUserStorageService:createDelegation`
- `DelegationController:signDelegation`
- `MoneyAccountUpgradeController:upgradeAccount`
- `MoneyAccountController:getState` (and `getMoneyAccount` if exposed as action)
- `KeyringController:getState`

Card unlink/relink is **not** on the messenger today (`linkMoneyAccountCard` is a class method). Inject it as a constructor hook:

```ts
new MoneyAccountMigrationController({
  messenger,
  state,
  linkMoneyAccountCard: (params) =>
    Engine.context.CardController.linkMoneyAccountCard(params),
});
```

Wire the hook in `money-account-migration-controller-init.ts` so the controller stays testable.

- [ ] **Step 1: Write reconcile tests + the state-machine tests first (all helpers mocked)**
- [ ] **Step 2: Implement `reconcile`, `migrate` / `resume` / `abort`**
- [ ] **Step 3: Wire Engine init, messenger, persisted state next to `MoneyAccountUpgradeController`**
- [ ] **Step 4: Run controller + init tests**

Run: `yarn jest app/core/Engine/controllers/money-account-migration app/core/Engine/messengers/money-account-migration-controller-messenger.ts`

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: run Money Account footprint migration via a resumable state machine

EOF
)"
```

---

### Task 12: On-demand former-account sweep (no N-day watch)

**Files:**
- Create: `app/lib/Money/migration/sweepFormer.ts`
- Create: `app/lib/Money/migration/sweepFormer.test.ts`
- Modify: `app/core/Engine/controllers/money-account-migration/MoneyAccountMigrationController.ts`

**Interfaces:**
- Consumes: `formerMoneyAccounts[old]`, persisted residual Delegation, `collectInventory`, `DelegationManager.redeemDelegations` (or the existing Delegation redeem helper if one is already wired)
- Produces: `sweepFormerAccount(oldAddress: Hex): Promise<void>`

This is **not** part of `migrate()` / `resume()`. It runs after `VERIFIED_INERT` when leftovers appear on a former Money address (payroll, late receive, native dust). No `watchUntil`. No poll. Caller (or later UI) invokes it whenever it wants.

Rules:
- Look up `formerMoneyAccounts[old]`. Missing → throw `unknown-former-account`.
- Destination is the **pinned** `newAddress` from that record. Do not take a dest argument (same lock as the exit batch).
- Reuse the **persisted** signed residual blob. Do not re-sign. Empty caveats already grant full execute.
- Collect live inventory on `old`. If vmUSD, mUSD, and sweepable native are all 0, return (no-op).
- Submit one atomic leftover batch **as the new key redeeming the residual Delegation** (not as the old key). Persist a per-former `sweepBatchId` on that record with the same submit-then-await rules as `exitBatchId`. Destination locked.
- `isFrozen(old)` is false after `VERIFIED_INERT` so this path is not blocked. Do not freeze the new account while sweeping.
- Concurrent `sweepFormerAccount` for the same `old`: await the existing `sweepBatchId` if set; never a second submit.
- Does not change `status` / `activeMoneyAccountId`. Migration stays `VERIFIED_INERT` (or `IDLE` after a later run).

```ts
it('returns without submitting when former balances are already zero', async () => { ... });
it('redeems the persisted residual Delegation and does not re-sign', async () => { ... });
it('sends leftovers to the pinned former newAddress, not a caller dest', async () => { ... });
it('awaits an in-flight former sweepBatchId instead of submitting again', async () => { ... });
```

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Implement `sweepFormerAccount`**
- [ ] **Step 3: Run `yarn jest app/lib/Money/migration/sweepFormer.test.ts` and commit**

---

## Engine wiring checklist (Task 11)

Follow the upgrade controller’s existing registration exactly:

1. Messenger factory in `app/core/Engine/messengers/money-account-migration-controller-messenger.ts`
2. Entry in `app/core/Engine/messengers/index.ts`
3. Init function returning `{ controller }`
4. `Engine.ts`: add to the init map, `context`, and persisted `backgroundState`
5. Persist metadata: `status`, `plan`, `planHash`, `activeMoneyAccountId`, `formerMoneyAccounts`, `exitBatchId`, `exitTxHash`, `sweepBatchId`, `tornDownAt`, `residualDelegationHash`, `residualDelegation`

No Redux reducer of our own — Engine background state is enough. Selectors read `state.engine.backgroundState.MoneyAccountMigrationController`.

---

## Spec coverage (self-review)

| ADR requirement | Task |
| --------------- | ---- |
| Deterministic inventory (vmUSD, mUSD, native, allowances, 7702, CHOMP, Card, blockers) | 2 |
| Gate 1 batch-from-self (hard preflight; no A-W) | 3 |
| Gate 2 keep 7702; residual Delegation after the batch | 3, 8 |
| Teardown before funds (CHOMP intents/delegations, Card unlink) | 5 |
| Atomic batch: transfer vmUSD+mUSD, revoke approvals, native last, keep 7702 | 6, 7 |
| No teller withdraw/deposit | 6 |
| Destination hard-locked / plan pinned | 1, 7, 11 |
| Re-provision = existing `upgradeAccount` + Card re-link + MM Pay pointer | 9 |
| Durable old→new link | 9 (`formerMoneyAccounts` + residual blob) + 11 |
| Verify old inert | 9 |
| Resume after crash; no double-submit; abort rules; point of no return | Resume contract, 7, 8, 11 |
| ADR FAQ: cancel / crash / abandon 7d / freeze / mempool / card / incoming / revert / re-provision | Resume contract FAQ map |
| ADR FAQ: N-day watch / 30+ day payroll window | **skipped** — Task 12 on-demand `sweepFormerAccount` |
| Freeze Money tx construction | 10 |
| Rebuild balances before tx 1 | 7, 11 |
| Gas sponsored where possible | 2 (blocker), 7 |
| Perps/Predict: block in-flight pay only, no protocol drain | 2, 9 |
| UI wizard / consent / archive chrome | skipped by request |

## Backend / package dependencies (not implemented here, but the function needs them)

1. **CHOMP `POST /v1/intent/revoke`** — Task 4 adapter. Confirm path/body with CHOMP; swap to `ChompApiService.revokeIntents` when published.
2. **User-storage metadata `type` for residual Delegation** — must not be ingested as a CHOMP auto-intent.
3. **Accounts API old→new alias (optional)** — local `formerMoneyAccounts` is sufficient for mobile selectors and activity stitching later. A backend alias is a separate CHOMP/Accounts API change so earnings history is continuous across clients.
4. **Hybrid/MultiSig on-chain add-signer ABI** — out of scope. Live impl is Stateless; residual Delegation (Task 8) covers residual sweeps.

## How to invoke (no UI)

After the destination Money account exists:

```ts
await Engine.context.MoneyAccountMigrationController.migrate({
  source: oldMoneyAddress,
  destination: newMoneyAddress,
});
```

On app launch / unlock, init calls `resume()` if status is in-flight. A later `migrate({ source, destination })` for the **same** pair also resumes.

Anytime after completion, leftovers on a former address:

```ts
await Engine.context.MoneyAccountMigrationController.sweepFormerAccount(
  oldMoneyAddress,
);
```

No watch timer. Call when leftovers exist (or from a later UI). Destination is the pinned `formerMoneyAccounts[old].newAddress`.
