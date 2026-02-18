# Predict: Permit2-Based Fee Collection for FAK Order Support

## Objective

Enable Fill and Kill (FAK) order support in the Predict feature by implementing a new fee collection mechanism using Uniswap's Permit2 SignatureTransfer, replacing the current exact-amount Safe transaction authorization with a "max allowance" pattern that supports partial fill fee collection.

## Product outcomes

- Users can place FAK orders, enabling partial fills and better price execution
- Fee collection accurately reflects actual fill amounts (proportional fees on partial fills)
- Reduced order failures from nonce collisions (bitmap-based nonces replace sequential nonces)
- Seamless migration for existing users (automatic Permit2 approval on next deposit, graceful fallback to FOK until then)

## R-A-P-I-D

| Role                  | Person | Context                                         |
| --------------------- | ------ | ----------------------------------------------- |
| **Recommend** (Owner) |        | Author of this proposal, Predict tech lead      |
| **Agree**             |        | Backend/relay architecture, fee collection flow |
| **Agree**             |        | Smart contract interactions, security review    |
| **Perform**           |        | Client-side implementation (MetaMask Mobile)    |
| **Perform**           |        | Backend relay + fee collector implementation    |
| **Input**             |        | Engineering leadership review                   |
| **Decide**            |        |                                                 |

| Field                | Value    |
| -------------------- | -------- |
| **Due date**         |          |
| **Review timeframe** | 1 week   |
| **Status**           | PROPOSED |
| **Decision**         |          |

---

## Background

The Predict feature integrates with Polymarket's CLOB (Central Limit Order Book) to place prediction market orders on behalf of MetaMask users. Users operate through Safe proxy accounts (1-of-1 multisig, GnosisSafeL2 v1.3.0) deployed on Polygon — the same proxy accounts used in the native Polymarket experience.

We collect a 4% fee on each order. The current fee collection mechanism works as follows:

1. **Client** (MetaMask Mobile): Calculates the exact fee amount, encodes a `USDC.transfer(splitsContract, exactFee)` call as Safe transaction data, signs the Safe `execTransaction` hash with the user's EOA (via `personal_sign` with Safe v-adjustment), and sends the signed fee authorization alongside the CLOB order to our relay.
2. **Relay** (`predict-order-relay` Lambda): Validates the fee authorization (structure, fee amount, on-chain state including Safe deployment, USDC balance, nonce, signature via `checkSignatures`) and submits the FOK order to Polymarket's CLOB API.
3. **Fee Collector** (`predict-fee-collector` Lambda): After the trade settles on-chain, a randomly-selected CubeSigner executor account calls `Safe.execTransaction()` to transfer the exact fee to a 0xSplits contract for distribution (50/50 split between MetaMask and the provider).

This mechanism is inherently tied to **FOK (Fill or Kill)** orders — the entire order fills or it all fails. The signed Safe transaction encodes an exact transfer amount because the fill amount is known upfront.

**Key infrastructure details:**

- Fee recipient is a 0xSplits contract (not the executor accounts)
- Multiple CubeSigner executor accounts are randomly selected for fee collection (for reliability/redundancy)
- Fee authorizations use a discriminated union pattern (`type: "erc3009"` for EOA users, `type: "safe-transaction"` for Safe users)
- Safe proxies are deployed via Polymarket's factory at `0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b` with master copy `0xE51abdf814f8854941b9Fe8e3A4F65CAB4e7A4a8`

## Problem Statement

**We cannot support FAK (Fill and Kill) orders with the current fee collection mechanism.**

With FAK orders, the order can be partially filled. If a user places a $100 order but only $60 fills, the fee should be 4% of $60 ($2.40), not 4% of $100 ($4.00). The current `Safe.execTransaction` pattern cannot accommodate this because:

- The Safe transaction data encodes an **exact** transfer amount at signing time
- The relay cannot modify the signed transaction to change the amount post-fill
- Safe has no native "transfer up to X" mechanism
- ERC20 doesn't support transitive or delegatable allowances

**What happens if we do nothing?** We remain limited to FOK orders, which means:

- Users get worse price execution (all-or-nothing fills miss partial liquidity)
- We cannot compete with Polymarket's native experience (which supports all order types)
- Large orders are more likely to fail entirely instead of partially filling

**Secondary problem:** The current sequential Safe nonce system causes nonce collision failures when users place multiple orders in quick succession. Each fee authorization requires the current Safe nonce, and concurrent orders can race for the same nonce value.

## Proposed solution(s) or change(s)

### Recommended Solution: Permit2 SignatureTransfer

We propose using [Uniswap's Permit2](https://github.com/Uniswap/permit2) SignatureTransfer to implement "up to X" fee collection semantics.

**What is Permit2?**

Permit2 is a canonical token approval contract deployed by Uniswap via CREATE2 at `0x000000000022D473030F116dDEE9F6B43aC78BA3` on all EVM chains including Polygon. It is immutable (no admin keys, no upgrades), heavily audited, and battle-tested across the DeFi ecosystem (Uniswap, 1inch, etc.).

Permit2's **SignatureTransfer** mode allows a token owner to sign an off-chain permit authorizing a specific spender to transfer **up to** a maximum amount, with the actual transfer amount determined at execution time. This is enforced on-chain:

```
requestedAmount <= permitted.amount   // reverts if violated
```

**Architecture:**

```
ONE-TIME SETUP (during deposit/onboarding):
  Safe → USDC.approve(Permit2, MAX_UINT256)
  (bundled with existing CTF Exchange / NegRisk approvals via MultiSend)

PER-TRADE:
  Client (MetaMask Mobile):
    1. Pick random executor from feature-flag config
    2. Read unused Permit2 nonce from chain (bitmap-based, non-sequential)
    3. Sign Permit2 PermitTransferFrom (Safe EIP-1271 wrapped):
       - permitted: {token: USDC, amount: maxFee}
       - spender: chosen executor address
       - nonce, deadline (1hr expiry)
    4. POST to relay: {
         order, orderType: "FAK",
         executor: "0xABC...",
         feeAuthorization: {type: "safe-permit2", authorization: {permit, signature}}
       }

  Relay (predict-order-relay):
    5. Validate: structure, amounts, deadline, known executor,
       on-chain (Safe deployed, USDC balance, Permit2 allowance set)
    6. Submit FAK order to Polymarket CLOB
    7. Queue fee collection to SQS with executor address + fill data

  Fee Collector (predict-fee-collector, async after settlement):
    8. Calculate actualFee from fill amount (4% of actual fill)
    9. Specified executor calls:
       Permit2.permitTransferFrom(
         permit,                                          // signed max fee
         {to: splitsContract, requestedAmount: actualFee}, // actual fee <= max
         safeAddress,
         signature
       )
```

**Permit2 SignatureTransfer contract call:**

```solidity
// Permit2 enforces: requestedAmount <= permit.permitted.amount
// Single atomic transaction — verify signature + transfer tokens
function permitTransferFrom(
    PermitTransferFrom calldata permit,       // {permitted: {token, amount}, nonce, deadline}
    SignatureTransferDetails calldata details, // {to: splitsContract, requestedAmount: actualFee}
    address owner,                            // safeAddress
    bytes calldata signature                  // Safe EIP-1271 signature
) external;
```

**Safe EIP-1271 Signature Flow:**

Since the token owner is a Safe contract, Permit2 verifies signatures via EIP-1271 (`Safe.isValidSignature`). The client-side signing flow:

1. Compute Permit2 EIP-712 typed data hash (domain: `{name: "Permit2", chainId: 137, verifyingContract: 0x000...BA3}`)
2. Wrap in Safe message format: `keccak256(0x19 || 0x01 || safeDomainSeparator || keccak256(SAFE_MSG_TYPEHASH || keccak256(permit2Hash)))`
3. EOA signs the wrapped hash via `personal_sign` with v-adjustment for Safe compatibility
4. Pack as `r || s || v` (65 bytes) — same format as current Safe fee authorization signatures

**Key Design Decisions:**

_1. SignatureTransfer over AllowanceTransfer_

Permit2 has two modes. We chose SignatureTransfer:

| Aspect                 | SignatureTransfer    | AllowanceTransfer         |
| ---------------------- | -------------------- | ------------------------- |
| On-chain txs per trade | **1**                | 2 (permit + transferFrom) |
| Gas cost               | **~123k**            | ~222k                     |
| Nonce model            | **Unordered bitmap** | Sequential                |
| Reusable               | No (one-time use)    | Yes (until expiration)    |

SignatureTransfer also eliminates nonce collisions: bitmap-based nonces mean concurrent orders pick independent nonce slots.

_2. Client-selected executor (spender)_

Permit2 requires `msg.sender == spender` (baked into the signed EIP-712 data). Rather than designating a single fixed executor:

- The executor list is provided to the client via feature flag configuration (`executors: string[]`)
- The client picks one at random per order and signs the permit with that executor as the spender
- The relay uses that specific executor for fee collection
- This preserves executor redundancy while satisfying Permit2's spender constraint

_3. Graceful fallback for existing users_

Users who already have all Polymarket allowances but lack the Permit2 USDC approval gracefully fall back to FOK / `safe-transaction` until their next deposit (which automatically batches the missing Permit2 approval). The client checks `USDC.allowance(safe, Permit2) > 0` before choosing the Permit2 path.

_4. New discriminated union type_

Rather than replacing `safe-transaction`, we add `safe-permit2` as a new entry in the existing discriminated union. The backend handles both types via the existing switch/case routing pattern.

**Feature Flag Control:**

```jsonc
{
  "predictFeeCollection": {
    "enabled": true,
    "collector": "0x...",
    "metamaskFee": 0.02,
    "providerFee": 0.02,
    "waiveList": [],
    "executors": ["0xABC...", "0xDEF..."], // NEW: CubeSigner executor addresses
    "permit2Enabled": true, // NEW: toggle Permit2/FAK mode
  },
}
```

### Alternative Solutions Considered

**A. ERC20 Approve + TransferFrom** — Safe signs `approve(executor, maxFee)`, then executor calls `USDC.transferFrom(safe, splits, actualFee)`. _Rejected:_ 2 on-chain transactions, sequential Safe nonce still required for the approve tx, no atomicity improvement.

**B. One-Time Unlimited Approval + Off-Chain Message** — Safe approves a fee operator for unlimited USDC, per-trade user signs a custom off-chain message. _Rejected:_ Unlimited approval to a hot key is a high security risk; off-chain message validation is relay-enforced only (not on-chain); custom message schema without audit history.

**C. Safe Allowance Module** — Official Safe module for delegated spending. _Rejected:_ Module enablement adds permanent execution surface on the Safe; per-trade `setAllowance` still requires on-chain Safe tx; `uint16` nonce (max 65,536); adds complexity to onboarding.

**D. Fee Escrow Contract** — Custom contract: deposit maxFee, settle with actualFee, refund difference. _Rejected:_ New contract requiring development + security audit; 2 on-chain txs; funds locked in escrow.

**E. Collect Max Fee + Refund** — Use current exact-transfer for maxFee, then refund overpayment. _Rejected:_ 2 on-chain txs; async refund can fail; misleading UX; wasted gas.

**F. ERC-3009 from Safe** — Already used for EOA users. _Rejected:_ USDC's `transferWithAuthorization` requires ECDSA from the token holder; Safe contracts can't produce ECDSA signatures (no EIP-1271 support in USDC's ERC-3009); exact amount only.

**G. Safe to EOA Allowance Chaining** — Safe approves EOA, EOA uses ERC-3009. _Rejected:_ ERC20 allowances are not transitive; ERC-3009 operates on balances (EOA holds 0 USDC); would require transferring funds to EOA first.

## Analysis

| Criteria                      | Current (Safe execTransaction) | Proposed (Permit2 SignatureTransfer)   |
| ----------------------------- | ------------------------------ | -------------------------------------- |
| **Order types**               | FOK only                       | FOK + FAK                              |
| **Fee accuracy**              | Exact (correct for FOK)        | Proportional to fill (correct for FAK) |
| **On-chain txs per trade**    | 1 (execTransaction)            | 1 (permitTransferFrom)                 |
| **Gas per fee collection**    | ~150k+                         | ~123k                                  |
| **Nonce model**               | Sequential (collision risk)    | Unordered bitmap (no collisions)       |
| **New contracts**             | None                           | None (Permit2 already deployed)        |
| **Audit required**            | N/A                            | None (Permit2 is audited + immutable)  |
| **One-time setup**            | Existing allowances            | +1 USDC approval to Permit2            |
| **User signatures per trade** | 2 (order + fee auth)           | 2 (order + fee auth) — same UX         |
| **Backwards compatible**      | N/A                            | Yes (existing flow untouched)          |
| **Rollback**                  | N/A                            | Feature flag toggle (instant)          |

**Benefits:**

- Enables FAK orders — the primary business objective
- Eliminates nonce collisions — an existing pain point causing order failures
- Lower gas costs per fee collection
- No new contracts to deploy, test, or audit
- Zero-downtime migration via feature flag

**Drawbacks/Limitations:**

- Existing users require Permit2 USDC approval before using FAK (handled automatically on next deposit, fallback to FOK until then)
- Spender must be specified at signing time — if the selected executor becomes unavailable, fee collection fails (mitigated by retry, same as current executor failure handling)
- EIP-1271 signature construction is more complex than direct Safe tx signing (contained in a single function, well-tested)
- Adds dependency on an external immutable contract (Permit2 is canonical and immutable — minimal risk)

**Success KPIs:**

- FAK orders execute successfully with proportional fee collection
- Nonce collision error rate drops to ~0%
- Fee collection success rate maintained or improved
- Gas cost per fee collection reduced

## Dependencies (services and libraries)

| Dependency               | Type                 | Details                                                                                                                   |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Permit2 contract**     | External (immutable) | `0x000000000022D473030F116dDEE9F6B43aC78BA3` on Polygon. Deployed by Uniswap via CREATE2. No admin keys, no upgrade path. |
| **Polymarket CLOB API**  | External             | Must accept `orderType: "FAK"` (already supported by their API)                                                           |
| **Safe v1.3.0 EIP-1271** | Existing             | Safe's `CompatibilityFallbackHandler.isValidSignature()` — already deployed, used by existing Safe proxies                |
| **CubeSigner**           | Existing             | Same executor key infrastructure, no changes needed                                                                       |
| **0xSplits**             | Existing             | Fee recipient unchanged                                                                                                   |
| **Feature Flag Service** | Existing             | New fields added to existing `predictFeeCollection` flag                                                                  |

**No new infrastructure dependencies.** All components either already exist or are immutable external contracts.

**Team interactions:** None required. All changes are within the Predict feature's codebase (MetaMask Mobile + predict-fee-collection repo).

## Security considerations

| Concern                       | Assessment                                                                                       | Mitigation                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Permit2 contract trust**    | Permit2 is immutable (no admin, no upgrades), audited, and used across DeFi                      | No mitigation needed — trust model is equivalent to trusting USDC contract itself                                                                                                      |
| **USDC approval to Permit2**  | Users approve Permit2 for max USDC — same pattern used for CTF Exchange approvals                | Permit2 only transfers when a valid permit signature is presented; approval alone is not exploitable                                                                                   |
| **Executor key compromise**   | A compromised executor could call `permitTransferFrom` with `requestedAmount = permitted.amount` | Same risk profile as current approach (compromised executor can call `Safe.execTransaction`). Permit2 adds on-chain max cap.                                                           |
| **EIP-1271 signature replay** | Safe v1.3.0 has a known cross-protocol EIP-1271 replay concern                                   | Not exploitable: Permit2's domain separator (`name: "Permit2"`, `chainId`, `verifyingContract`) differs from all other protocols; nonce is consumed on-chain; deadline enforces expiry |
| **Cross-chain replay**        | Could the same permit be used on another chain?                                                  | No: Permit2 domain includes `chainId: 137`; Safe only has Permit2 USDC approval on Polygon                                                                                             |
| **Fee overcharge**            | Could the relay collect more than the max signed fee?                                            | No: Permit2 reverts if `requestedAmount > permitted.amount` — this is enforced on-chain, not by relay trust                                                                            |
| **SOC2 impact**               | No new data flows, no new PII handling, no new external API integrations                         | No SOC2 impact                                                                                                                                                                         |

## Observability, monitoring and customer support considerations

**SLA:** Same as current fee collection — fee collection is async and best-effort after trade settlement.

**Monitoring additions:**

- Add `safe-permit2` authorization type to existing fee collection dashboards (alongside `safe-transaction` and `erc3009`)
- Alert on Permit2 `permitTransferFrom` revert reasons (nonce already used, deadline expired, insufficient allowance)
- Monitor Permit2 allowance check failures in the relay validation (indicates users without Permit2 approval)

**Runbook updates:**

- Add Permit2 fee collection troubleshooting section (nonce bitmap queries, allowance verification)
- Document executor-spender matching requirement (fee collection must use the executor the client signed for)

**Customer support:**

- No user-facing changes — the order UX is identical
- If a user reports failed FAK orders, check: Permit2 USDC approval exists, executor address matches signed spender

## Testing and rollout

**Testing approach:**

1. **Unit tests** — Permit2 authorization validation, schema parsing, fee calculation, nonce reading, EIP-1271 signature wrapping
2. **Integration test** — End-to-end on Polygon fork: client signs Permit2 auth, relay validates, collector executes `permitTransferFrom`
3. **Manual POC** — Already completed and validated. Permit2 flow works correctly and confirms nonce improvements over current approach.

**Rollout plan:**

| Phase                  | Action                                                                                                                                                                   | Risk                                 | Rollback                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------- |
| 1. Deploy backend      | Ship relay + collector changes. Fully backwards compatible — existing `safe-transaction` flow is unchanged. `safe-permit2` type accepted but not used by any client yet. | None — no behavior change            | N/A                                      |
| 2. Ship client         | Release mobile update with `permit2Enabled: false` (default). No behavior change until flag is enabled.                                                                  | None — disabled by default           | N/A                                      |
| 3. Enable for internal | Set `permit2Enabled: true` + `executors` for internal test accounts via feature flag                                                                                     | Low — limited blast radius           | Toggle `permit2Enabled: false`           |
| 4. Gradual rollout     | Enable for increasing % of users. Monitor fee collection success rate, gas costs, error rates.                                                                           | Medium — new code path in production | Toggle `permit2Enabled: false` (instant) |
| 5. Full rollout        | 100% of users on Permit2/FAK. Users without Permit2 allowance automatically fall back to FOK.                                                                            | Low — fallback ensures no breakage   | Toggle `permit2Enabled: false`           |

**Risk assessment:** Low. The backend is fully backwards compatible. The client has a feature-flag toggle with instant rollback. Existing users without Permit2 approval automatically fall back to the current FOK flow. The Permit2 contract is immutable and battle-tested.

## Next steps

1. **Review this ADR** — Collect feedback from R-A-P-I-D participants within the review timeframe
2. **Finalize POC** — Complete remaining unit tests for both codebases
3. **Deploy backend** — Ship relay + fee collector changes (backwards compatible)
4. **Ship client** — Release with `permit2Enabled: false` default
5. **Internal testing** — Enable for internal accounts, validate E2E on mainnet
6. **Gradual rollout** — Feature flag from 1% to 100%

## Reference materials

- [Uniswap Permit2 Repository](https://github.com/Uniswap/permit2)
- [Permit2 on Polygon (PolygonScan)](https://polygonscan.com/address/0x000000000022D473030F116dDEE9F6B43aC78BA3)
- [Permit2 Audit Reports](https://github.com/Uniswap/permit2/tree/main/audits)
- [Safe v1.3.0 CompatibilityFallbackHandler (EIP-1271)](https://github.com/safe-global/safe-smart-account/blob/v1.3.0/contracts/handler/CompatibilityFallbackHandler.sol)
- [Polymarket Safe Master Copy — GnosisSafeL2 v1.3.0 (PolygonScan)](https://polygonscan.com/address/0xE51abdf814f8854941b9Fe8e3A4F65CAB4e7A4a8)
- [predict-fee-collection relay repo](https://github.com/consensys-vertical-apps/predict-fee-collection)
- [EIP-1271: Standard Signature Validation](https://eips.ethereum.org/EIPS/eip-1271)

---

## Feedbacks

| Who?        | Feedback |
| ----------- | -------- |
| Agree:      |          |
| Agree:      |          |
| Perform:    |          |
| Perform:    |          |
| Input:      |          |
| Input:      |          |
| **Decider** |          |
