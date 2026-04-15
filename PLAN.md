# Polymarket CLOB v2 Migration — POC Stage 1 Plan

> **Goal:** Place a successful v2 market buy order directly against `clob-v2.polymarket.com` through a Safe proxy wallet using pUSD collateral. No relayer, no fee collection.
>
> **Environment:** Polygon mainnet. No v2 testnet exists. Test with small amounts (~$5 USDC).
>
> **Approach:** Hard cutover on a POC branch — no feature flags, no v1 backward compatibility. Replace v1 logic in-place except where noted.

---

## Table of Contents

1. [Key Decisions](#key-decisions)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Steps](#implementation-steps)
   - [Step 1: Constants, Types, and Endpoint](#step-1-constants-types-and-endpoint)
   - [Step 2: Auth Validation](#step-2-auth-validation)
   - [Step 3: Safe Allowances and Deposit Flow](#step-3-safe-allowances-and-deposit-flow)
   - [Step 4: Order Signing and Submission](#step-4-order-signing-and-submission)
4. [Success Criteria](#success-criteria)
5. [What's Deferred](#whats-deferred)
6. [Stage 2 Outline](#stage-2-outline)
7. [Reference: Contract Addresses](#reference-contract-addresses)
8. [Reference: ABIs](#reference-abis)
9. [Reference: v2 EIP-712 Order Type](#reference-v2-eip-712-order-type)
10. [Reference: v1 → v2 Order Struct Diff](#reference-v1--v2-order-struct-diff)

---

## Key Decisions

| Decision                      | Resolution                                                                 | Rationale                                                                     |
| ----------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| SDK strategy                  | Custom implementation (no `@polymarket/clob-client-v2`)                    | Avoid bloating mobile app with SDK dependencies                               |
| POC staging                   | Stage 1: direct to Polymarket API. Stage 2: relayer + fee collection       | Isolate mobile signing validation from relayer changes                        |
| Environment                   | Mainnet, small amounts                                                     | No v2 testnet available; rejected orders cost nothing                         |
| Feature flag                  | None for POC                                                               | Hard cutover keeps code simple; flag added during productionization           |
| Deposit flow design           | Unified "ensure v2 readiness" — check what's missing, batch into MultiSend | Matches existing `prepareDeposit` pattern                                     |
| Wrap trigger                  | At deposit time only (for POC)                                             | Manual trigger; production will add order-time and auto-migration triggers    |
| Wrap scope                    | Wrap entire Safe USDC.e balance in one call                                | No split state — account fully migrated after one deposit                     |
| Deposit tx structure          | TX 1: EOA sends USDC.e → Safe. TX 2: Safe MultiSend (approvals + wrap)     | Consistent with current pattern where deposit and allowances are separate txs |
| Auth domain version           | Keep `'1'` for `ClobAuthDomain` (L1 headers)                               | Believed unchanged; fix to `'2'` if 401 errors occur                          |
| EIP-712 order domain          | Version `'1'` → `'2'`                                                      | Required by v2 contracts                                                      |
| `metadata` + `builder` fields | Both `HASH_ZERO_BYTES32`                                                   | No builder code registered yet; revisit in Stage 2                            |
| Fee display                   | Hardcode to zero                                                           | `getClobMarketInfo` wired up during productionization                         |
| Order submission              | New `submitClobV2Order` function (direct to Polymarket)                    | Keeps v1 `submitClobOrder` untouched for easy Stage 2 relayer swap            |
| Balance reading               | Switch to pUSD only                                                        | Sufficient for POC; production adds dual-balance display                      |
| Withdrawal                    | Deferred                                                                   | Same MultiSend pattern as deposit (unwrap instead of wrap); no new risk       |
| WebSocket                     | Deferred                                                                   | REST `/book` endpoint sufficient for POC                                      |
| v1 approval revocation        | Not needed                                                                 | v1 contracts will be deprecated; harmless approvals                           |

---

## Architecture Overview

### Current Flow (v1)

```
User EOA
  → [USDC.e transfer] → Safe Proxy
  → [USDC.e approved to v1 Exchange contracts]
  → placeOrder() signs EIP-712 v1 order
  → submitClobOrder() → MetaMask Relayer → clob.polymarket.com/order
```

### POC Flow (v2 Stage 1)

```
User EOA
  → [USDC.e transfer] → Safe Proxy                          (EOA tx)
  → Safe MultiSend:                                          (Safe execTransaction)
      [approve USDC.e → Onramp]
      [approve pUSD → v2 Exchange, NegRisk, Adapter, CTF, Permit2]
      [setApprovalForAll → v2 Exchange, NegRisk, Adapter]
      [Onramp.wrap(USDC.e, safe, fullBalance)]
  → placeOrder() signs EIP-712 v2 order
  → submitClobV2Order() → clob-v2.polymarket.com/order       (direct, no relayer)
```

---

## Implementation Steps

### Step 1: Constants, Types, and Endpoint

**Files to modify:**

#### `app/components/UI/Predict/providers/polymarket/constants.ts`

1. Update `MATIC_CONTRACTS` with v2 addresses and pUSD collateral:

```typescript
export const MATIC_CONTRACTS: ContractConfig = {
  exchange: '0xE111180000d2663C0091e4f400237545B87B996B', // CTF Exchange v2
  negRiskAdapter: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296', // unchanged
  negRiskExchange: '0xe2222d279d744050d28e00520010520000310F59', // Neg Risk Exchange v2
  collateral: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB', // pUSD (was USDC.e)
  conditionalTokens: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045', // unchanged
};
```

2. Add new constants for Onramp, Offramp, and the old USDC.e address:

```typescript
export const USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

export const COLLATERAL_ONRAMP_ADDRESS =
  '0x93070a847efEf7F70739046A929D47a521F5B8ee';
export const COLLATERAL_OFFRAMP_ADDRESS =
  '0x2957922Eb93258b93368531d39fAcCA3B4dC5854';
```

3. Update `POLYGON_USDC_CAIP_ASSET_ID` — this currently derives from `MATIC_CONTRACTS.collateral`. Since collateral is now pUSD, determine if this CAIP asset ID should reference pUSD or remain USDC.e (used for deposit flow). If it's used for the EOA deposit transfer, it should stay as USDC.e:

```typescript
export const POLYGON_USDC_CAIP_ASSET_ID =
  `${POLYGON_MAINNET_CAIP_CHAIN_ID}/erc20:${USDC_E_ADDRESS}` as const;
```

#### `app/components/UI/Predict/providers/polymarket/types.ts`

1. Update `OrderData` interface — remove `taker`, `feeRateBps`, `nonce`; add `timestamp`, `metadata`, `builder`:

```typescript
export interface OrderData {
  maker: string;
  signer?: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  side: UtilsSide;
  expiration?: string;
  signatureType?: SignatureType;
  // v2 new fields
  timestamp: string;
  metadata: string;
  builder: string;
}
```

2. Add `POLY_1271` to `SignatureType` enum:

```typescript
export enum SignatureType {
  EOA,
  POLY_PROXY,
  POLY_GNOSIS_SAFE,
  POLY_1271, // NEW: EIP-1271 smart contract wallet signatures
}
```

3. Update `ContractConfig` to include onramp/offramp (optional, or keep as separate constants):

```typescript
export interface ContractConfig {
  exchange: string;
  negRiskAdapter: string;
  negRiskExchange: string;
  collateral: string; // now pUSD
  conditionalTokens: string;
}
```

4. Update `UserMarketOrder` — remove `feeRateBps`, `nonce`, `taker` fields.

5. Update `SignedOrder`, `ClobOrderObject`, and related types to match the new `OrderData` shape. Ensure no references to removed fields remain.

#### `app/components/UI/Predict/providers/polymarket/utils.ts`

1. Update `getPolymarketEndpoints()` — change `CLOB_ENDPOINT`:

```typescript
export const getPolymarketEndpoints = () => ({
  GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
  CLOB_ENDPOINT: 'https://clob-v2.polymarket.com', // was clob.polymarket.com
  DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
  GEOBLOCK_API_ENDPOINT: 'https://polymarket.com/api/geoblock',
  HOMEPAGE_CAROUSEL_ENDPOINT: 'https://polymarket.com/api/homepage/carousel',
  CLOB_RELAYER:
    process.env.METAMASK_ENVIRONMENT === 'dev'
      ? 'https://predict.dev-api.cx.metamask.io'
      : 'https://predict.api.cx.metamask.io',
});
```

**Validate:** App compiles. TypeScript catches any remaining references to removed `OrderData` fields (`nonce`, `feeRateBps`, `taker`). Fix all compilation errors before proceeding.

---

### Step 2: Auth Validation

**Files involved:**

- `app/components/UI/Predict/providers/polymarket/utils.ts` — `getL1Headers()`, `deriveApiKey()`, `createApiKey()`

**Changes:** None initially. The `ClobAuthDomain` version stays at `'1'`. The auth functions already use `CLOB_ENDPOINT`, which now points to v2.

**Validation:**

1. Trigger the API key derivation flow (e.g., navigate to a market in the app, which calls `deriveApiKey` or `createApiKey`).
2. If `deriveApiKey` against `clob-v2.polymarket.com/auth/derive-api-key` returns a valid `ApiKeyCreds` object → **auth confirmed**.
3. If 401 error → change `getL1Headers` domain version from `'1'` to `'2'` and retry.

**Location of auth domain version (only change if 401):**

```typescript
// utils.ts, getL1Headers function (~line 87-89)
const domain = {
  name: 'ClobAuthDomain',
  version: '1', // <-- try '1' first, change to '2' only if auth fails
  chainId: POLYGON_MAINNET_CHAIN_ID,
};
```

---

### Step 3: Safe Allowances and Deposit Flow

This is the largest step. It updates the Safe onboarding to set v2 approvals and wrap USDC.e → pUSD.

#### 3a. Update Safe Constants

**File:** `app/components/UI/Predict/providers/polymarket/safe/constants.ts`

Replace `usdcSpenders` with **pUSD spenders** for v2 contracts, and add a new `usdcESpenders` list for the Onramp approval:

```typescript
import { MATIC_CONTRACTS, COLLATERAL_ONRAMP_ADDRESS } from '../constants';

// USDC.e needs approval to the Onramp (so the Safe can wrap)
export const usdcESpenders = [COLLATERAL_ONRAMP_ADDRESS];

// pUSD needs approval to all v2 exchange contracts
export const pUsdSpenders = [
  MATIC_CONTRACTS.conditionalTokens,
  MATIC_CONTRACTS.exchange, // CTF Exchange v2
  MATIC_CONTRACTS.negRiskExchange, // Neg Risk Exchange v2
  MATIC_CONTRACTS.negRiskAdapter,
];

// ERC-1155 Conditional Token approvals (setApprovalForAll)
export const outcomeTokenSpenders = [
  MATIC_CONTRACTS.exchange, // CTF Exchange v2
  MATIC_CONTRACTS.negRiskExchange, // Neg Risk Exchange v2
  MATIC_CONTRACTS.negRiskAdapter,
];
```

> **Note:** Permit2 approval for pUSD is added via `extraUsdcSpenders` in the existing pattern, passed from `PolymarketProvider.prepareDeposit()`.

#### 3b. Add Wrap/Unwrap Encoding Helpers

**File:** `app/components/UI/Predict/providers/polymarket/safe/utils.ts` (or `utils.ts`)

Add encoding functions for the Onramp `wrap()` call:

```typescript
import { Interface } from '@ethersproject/abi';

export const encodeWrap = ({
  asset,
  to,
  amount,
}: {
  asset: string;
  to: string;
  amount: bigint | string;
}): Hex =>
  new Interface([
    'function wrap(address _asset, address _to, uint256 _amount)',
  ]).encodeFunctionData('wrap', [asset, to, amount]) as Hex;
```

> For the POC, `unwrap` encoding is not needed (withdrawal deferred). Add it later.

#### 3c. Update `createAllowancesSafeTransaction`

**File:** `app/components/UI/Predict/providers/polymarket/safe/utils.ts`

The current function creates a MultiSend of USDC.e approvals + ERC-1155 approvals. Update it to:

1. Approve USDC.e → Onramp (so wrap can pull USDC.e)
2. Approve pUSD → all v2 exchange contracts + Permit2
3. `setApprovalForAll` on Conditional Tokens → v2 exchange contracts

```typescript
export const createAllowancesSafeTransaction = (options?: {
  extraPusdSpenders?: string[];
}) => {
  const safeTxns: SafeTransaction[] = [];

  // 1. Approve USDC.e to Onramp (for wrapping)
  for (const spender of usdcESpenders) {
    safeTxns.push({
      to: USDC_E_ADDRESS,
      data: encodeApprove({
        spender,
        amount: ethers.constants.MaxUint256.toBigInt(),
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  // 2. Approve pUSD to v2 exchange contracts
  const allPusdSpenders = [
    ...pUsdSpenders,
    ...(options?.extraPusdSpenders ?? []),
  ];
  for (const spender of allPusdSpenders) {
    safeTxns.push({
      to: MATIC_CONTRACTS.collateral, // pUSD address
      data: encodeApprove({
        spender,
        amount: ethers.constants.MaxUint256.toBigInt(),
      }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  // 3. setApprovalForAll on Conditional Tokens for v2 spenders
  for (const spender of outcomeTokenSpenders) {
    safeTxns.push({
      to: MATIC_CONTRACTS.conditionalTokens,
      data: encodeErc1155Approve({ spender, approved: true }),
      operation: OperationType.Call,
      value: '0',
    });
  }

  return aggregateTransaction(safeTxns);
};
```

> **Important:** The `extraPusdSpenders` parameter replaces the old `extraUsdcSpenders` and should include `PERMIT2_ADDRESS` when called from `prepareDeposit`.

#### 3d. Add Wrap Transaction to Deposit Flow

**File:** `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`

Update `prepareDeposit()` to add a wrap step after allowances. The wrap is a **separate Safe MultiSend** bundled into the same Safe `execTransaction` as the allowances.

The current flow in `prepareDeposit()`:

1. Check `accountState.isDeployed` → if not, add deploy tx
2. Check `accountState.hasAllowances` → if not, add allowances tx
3. Add USDC.e transfer tx (deposit from EOA → Safe)

Updated flow:

1. Check `accountState.isDeployed` → if not, add deploy tx
2. Check `accountState.hasAllowances` → if not, add allowances tx (now includes USDC.e→Onramp, pUSD→v2 contracts)
3. Add USDC.e transfer tx (deposit from EOA → Safe)
4. **NEW:** Add wrap tx — Safe calls `Onramp.wrap(USDC_E_ADDRESS, safeAddress, fullUsdcEBalance)` to convert all USDC.e in Safe to pUSD

**Implementation detail for the wrap transaction:**

The wrap needs to know the Safe's USDC.e balance to wrap the full amount. Options:

- **Option A:** Read the Safe's USDC.e balance on-chain before constructing the MultiSend, then add the deposit amount to get the total to wrap. This requires knowing the exact deposit amount at `prepareDeposit` time.
- **Option B:** Use `type(uint256).max` as the wrap amount if the Onramp supports it (unlikely — it uses `safeTransferFrom` with an exact amount).
- **Option C:** The wrap step is a separate Safe `execTransaction` that runs AFTER the deposit lands. The deposit tx sends USDC.e to the Safe, then a second tx wraps everything.

**Recommended approach (Option C — matches our agreed tx structure):**

```
TX 1 (EOA): Transfer USDC.e from user wallet → Safe
TX 2 (Safe execTransaction / MultiSend):
  - Allowances (if needed): approve USDC.e→Onramp, pUSD→v2 contracts, ERC-1155 approvals
  - Wrap: Onramp.wrap(USDC_E_ADDRESS, safeAddress, totalUsdcEBalance)
```

The wrap amount = Safe's current USDC.e balance + the deposit amount (since TX 1 lands before TX 2). Read the Safe's USDC.e balance at `prepareDeposit` time, add the deposit amount, and use that as the wrap amount.

**Note on `hasAllowances`:** If the account already has v2 allowances but has unwrapped USDC.e, you still need the wrap step. Consider adding a new account state check like `hasUnwrappedBalance` or always include the wrap in the MultiSend when USDC.e balance > 0.

#### 3e. Update `hasAllowances`

**File:** `app/components/UI/Predict/providers/polymarket/safe/utils.ts`

Update to check pUSD allowances against v2 spenders and USDC.e allowance to Onramp:

```typescript
export const hasAllowances = async ({
  address,
  extraPusdSpenders = [],
}: {
  address: string;
  extraPusdSpenders?: string[];
}) => {
  const allowanceCalls = [];
  const isApprovedForAllCalls = [];

  // Check USDC.e → Onramp approval
  for (const spender of usdcESpenders) {
    allowanceCalls.push(
      getAllowance({
        tokenAddress: USDC_E_ADDRESS,
        owner: address,
        spender,
      }),
    );
  }

  // Check pUSD → v2 exchange contracts + Permit2
  const allPusdSpenders = [...pUsdSpenders, ...extraPusdSpenders];
  for (const spender of allPusdSpenders) {
    allowanceCalls.push(
      getAllowance({
        tokenAddress: MATIC_CONTRACTS.collateral, // pUSD
        owner: address,
        spender,
      }),
    );
  }

  // Check ERC-1155 approvals for v2 contracts
  for (const spender of outcomeTokenSpenders) {
    isApprovedForAllCalls.push(
      getIsApprovedForAll({
        owner: address,
        operator: spender,
      }),
    );
  }

  const allowanceResults = await Promise.all(allowanceCalls);
  const isApprovedForAllResults = await Promise.all(isApprovedForAllCalls);

  return (
    allowanceResults.every((allowance) => allowance > 0) &&
    isApprovedForAllResults.every((isApproved) => isApproved)
  );
};
```

#### 3f. Update `getBalance`

**File:** `app/components/UI/Predict/providers/polymarket/utils.ts`

No code change needed — `getBalance` already calls `contractConfig.collateral`, which now points to pUSD after the `MATIC_CONTRACTS` update in Step 1. The balance will automatically read pUSD.

**Validate Step 3:**

1. Trigger a deposit in the app with a small amount (e.g., $5 USDC.e).
2. Verify on Polygonscan that the Safe has:
   - USDC.e allowance to Onramp ✓
   - pUSD allowances to all v2 contracts + Permit2 ✓
   - ERC-1155 `setApprovalForAll` for v2 contracts ✓
   - pUSD balance = previous USDC.e balance + deposit amount ✓
   - USDC.e balance = 0 ✓
3. Verify in the app that `getBalance` shows the correct pUSD amount.

---

### Step 4: Order Signing and Submission

#### 4a. Update EIP-712 Order Typed Data

**File:** `app/components/UI/Predict/providers/polymarket/utils.ts`

Update `getOrderTypedData` (~line 322):

```typescript
export const getOrderTypedData = ({
  order,
  chainId,
  verifyingContract,
}: {
  order: OrderData & { salt: string };
  chainId: number;
  verifyingContract: string;
}) => ({
  primaryType: 'Order',
  domain: {
    name: 'Polymarket CTF Exchange',
    version: '2', // was '1'
    chainId,
    verifyingContract,
  },
  types: {
    EIP712Domain: [
      ...EIP712Domain,
      { name: 'verifyingContract', type: 'address' },
    ],
    Order: [
      { name: 'salt', type: 'uint256' },
      { name: 'maker', type: 'address' },
      { name: 'signer', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'makerAmount', type: 'uint256' },
      { name: 'takerAmount', type: 'uint256' },
      { name: 'expiration', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }, // NEW (replaces nonce)
      { name: 'metadata', type: 'bytes32' }, // NEW
      { name: 'builder', type: 'bytes32' }, // NEW
      { name: 'side', type: 'uint8' },
      { name: 'signatureType', type: 'uint8' },
    ],
  },
  message: order,
});
```

> **Important:** Do NOT change `getL1Headers` domain version — that stays at `'1'` (auth domain, not order domain).

#### 4b. Update Order Construction

**File:** `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`

Update the order construction in `placeOrder()` (~line 1353):

```typescript
import { HASH_ZERO_BYTES32 } from './constants';

const order: OrderData & { salt: string } = {
  salt: generateSalt(),
  maker: makerAddress,
  signer: signer.address,
  tokenId: outcomeTokenId,
  makerAmount,
  takerAmount,
  expiration: '0',
  timestamp: `${Math.floor(Date.now() / 1000)}`, // NEW (was nonce: '0')
  metadata: HASH_ZERO_BYTES32, // NEW
  builder: HASH_ZERO_BYTES32, // NEW
  side: side === Side.BUY ? UtilsSide.BUY : UtilsSide.SELL,
  signatureType: SignatureType.POLY_GNOSIS_SAFE,
};
```

Remove all references to `feeRateBps` in the order flow. The fee is no longer part of the order struct.

#### 4c. Hardcode Fees

**File:** `app/components/UI/Predict/providers/polymarket/utils.ts`

Update `previewOrder` to skip the `getFeeRateBps` call:

```typescript
// In previewOrder(), replace:
//   const [book, feeRateBps] = await Promise.all([
//     getOrderBook({ tokenId: outcomeTokenId }),
//     getFeeRateBps({ tokenId: outcomeTokenId }),
//   ]);
// With:
const book = await getOrderBook({ tokenId: outcomeTokenId });
const feeRateBps = '0'; // hardcoded for POC; wire up getClobMarketInfo later
```

#### 4d. Create `submitClobV2Order`

**File:** `app/components/UI/Predict/providers/polymarket/utils.ts`

Add a new function that submits directly to Polymarket v2, bypassing the relayer. The payload is `{ order, owner, orderType }` with `POLY_*` auth headers — exactly what the relayer currently forwards:

```typescript
export const submitClobV2Order = async ({
  headers,
  clobOrder,
}: {
  headers: ClobHeaders;
  clobOrder: ClobOrderObject;
}): Promise<Result<OrderResponse>> => {
  const { CLOB_ENDPOINT } = getPolymarketEndpoints();
  const url = `${CLOB_ENDPOINT}/order`;

  const body = {
    order: clobOrder.order,
    owner: clobOrder.owner,
    orderType: clobOrder.orderType,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 403) {
      return {
        success: false,
        error: 'You are unable to access this provider.',
      };
    }

    let responseData;
    try {
      responseData = (await response.json()) as OrderResponse;
    } catch (error) {
      responseData = undefined;
    }

    if (!response.ok || !responseData || responseData?.success === false) {
      const error = responseData?.errorMsg ?? response.statusText;
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      response: responseData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
```

#### 4e. Wire Up `submitClobV2Order` in `placeOrder`

**File:** `app/components/UI/Predict/providers/polymarket/PolymarketProvider.ts`

In the `placeOrder()` method, replace the call to `submitClobOrder` with `submitClobV2Order`. Remove `feeAuthorization`, `executor`, and `allowancesTx` from the submission — those are relayer-only concerns:

```typescript
// Replace:
//   const { success, response, error } = await submitClobOrder({
//     headers,
//     clobOrder,
//     feeAuthorization,
//     executor,
//     allowancesTx,
//   });
// With:
const { success, response, error } = await submitClobV2Order({
  headers,
  clobOrder,
});
```

> **Note:** Keep the existing `submitClobOrder` function intact — it will be updated for Stage 2 when re-enabling the relayer path.

**Validate Step 4:**

1. Navigate to any active market in the app.
2. Place a small market BUY order (~$5).
3. Verify:
   - Order signed without errors
   - `POST /order` to `clob-v2.polymarket.com` returns `{ success: true, orderID: "..." }`
   - `transactionsHashes` returned
   - Transaction visible on Polygonscan
   - Position appears in the Gamma API / app positions view

---

## Success Criteria

Stage 1 is **done** when all of the following are confirmed:

| #   | Checkpoint                 | How to verify                                                     |
| --- | -------------------------- | ----------------------------------------------------------------- |
| 1   | Auth works                 | `deriveApiKey` succeeds against `clob-v2.polymarket.com` (no 401) |
| 2   | Deposit + onboarding works | EOA tx + Safe MultiSend confirm on-chain                          |
| 3   | Safe has correct state     | Polygonscan: pUSD balance > 0, USDC.e = 0, all v2 allowances set  |
| 4   | Order book works           | `/book` returns data from v2 endpoint                             |
| 5   | Order signing works        | v2 EIP-712 typed data signed through Safe proxy                   |
| 6   | Order accepted             | `POST /order` returns `{ success: true }`                         |
| 7   | Trade executes             | `transactionsHashes` on Polygonscan, position in Gamma API        |

---

## What's Deferred

These items are explicitly out of scope for POC Stage 1:

| Item                                                           | Reason                                                |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| Withdrawal flow (pUSD unwrap → USDC transfer)                  | Same MultiSend pattern; no new risk to validate       |
| Feature flag (`predictClobV2Enabled`)                          | Added during productionization before merging to main |
| Balance display for unmigrated users (dual USDC.e + pUSD read) | Production UX concern                                 |
| Auto-migration trigger at order time or predict tab load       | Production UX concern                                 |
| WebSocket endpoint verification                                | REST `/book` sufficient for POC                       |
| Fee display via `getClobMarketInfo`                            | Hardcoded to zero; wire up later                      |
| v1 approval revocation                                         | Harmless; cleanup later if Polymarket recommends      |
| Builder code registration                                      | Resolve with Polymarket in Stage 2                    |
| Relayer changes                                                | Stage 2                                               |
| Unit test updates                                              | After POC validates the flow                          |

---

## Stage 2 Outline

After Stage 1 validates, Stage 2 adds relayer + fee collection:

1. **Relayer:** Update `POLYMARKET_API_URL` in relayer config (`predict-fee-collection` repo, `packages/predict-order-relay/src/config.ts`) from `https://clob.polymarket.com` to `https://clob-v2.polymarket.com`.

2. **Builder code:** Register a MetaMask builder code with Polymarket. Embed in the `builder` field of the order struct (replaces `HASH_ZERO_BYTES32`). The v2 migration guide says builder attribution is now native in the order struct — remove `@polymarket/builder-signing-sdk` from the relayer and the builder header signing logic.

3. **Fee collection:** Re-enable Permit2 fee collection through the relayer. The relayer validates `feeAuthorization`, submits the order to Polymarket, then triggers async fee collection via SQS (existing pattern).

4. **Submission path:** Switch from `submitClobV2Order` (direct) back to `submitClobOrder` (through relayer), updated to forward v2 order format.

5. **Relayer order validation:** Update the relayer's `validateRequestBody` to accept the v2 order shape (no `nonce`/`feeRateBps`/`taker`, has `timestamp`/`metadata`/`builder`).

---

## Reference: Contract Addresses

| Contract                | Address                                      | Notes                                |
| ----------------------- | -------------------------------------------- | ------------------------------------ |
| CTF Exchange v2         | `0xE111180000d2663C0091e4f400237545B87B996B` | New                                  |
| Neg Risk Exchange v2    | `0xe2222d279d744050d28e00520010520000310F59` | New                                  |
| Neg Risk Adapter        | `0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296` | Unchanged                            |
| Conditional Tokens      | `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045` | Unchanged                            |
| pUSD (collateral)       | `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB` | New — replaces USDC.e                |
| USDC.e (old collateral) | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | Still used for deposit + wrap        |
| Collateral Onramp       | `0x93070a847efEf7F70739046A929D47a521F5B8ee` | New — wraps USDC.e → pUSD            |
| Collateral Offramp      | `0x2957922Eb93258b93368531d39fAcCA3B4dC5854` | New — unwraps pUSD → USDC (deferred) |
| Permit2                 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | Unchanged                            |

---

## Reference: ABIs

### Onramp — `wrap()`

```json
{
  "type": "function",
  "name": "wrap",
  "inputs": [
    { "name": "_asset", "type": "address" },
    { "name": "_to", "type": "address" },
    { "name": "_amount", "type": "uint256" }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
}
```

- `_asset`: USDC.e address (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`)
- `_to`: Safe proxy address (wraps to itself)
- `_amount`: Amount of USDC.e to wrap (full balance)

### Offramp — `unwrap()` (deferred, for reference)

```json
{
  "type": "function",
  "name": "unwrap",
  "inputs": [
    { "name": "_asset", "type": "address" },
    { "name": "_to", "type": "address" },
    { "name": "_amount", "type": "uint256" }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
}
```

---

## Reference: v2 EIP-712 Order Type

```typescript
Order: [
  { name: 'salt', type: 'uint256' },
  { name: 'maker', type: 'address' },
  { name: 'signer', type: 'address' },
  { name: 'tokenId', type: 'uint256' },
  { name: 'makerAmount', type: 'uint256' },
  { name: 'takerAmount', type: 'uint256' },
  { name: 'expiration', type: 'uint256' },
  { name: 'timestamp', type: 'uint256' }, // NEW — replaces nonce
  { name: 'metadata', type: 'bytes32' }, // NEW
  { name: 'builder', type: 'bytes32' }, // NEW
  { name: 'side', type: 'uint8' },
  { name: 'signatureType', type: 'uint8' },
];
```

Domain:

```typescript
{
  name: 'Polymarket CTF Exchange',
  version: '2',        // was '1'
  chainId: 137,
  verifyingContract: exchangeAddress,  // v2 CTF Exchange or Neg Risk Exchange
}
```

---

## Reference: v1 → v2 Order Struct Diff

```diff
  OrderData {
    salt: string;
    maker: string;
    signer?: string;
-   taker: string;
    tokenId: string;
    makerAmount: string;
    takerAmount: string;
    expiration?: string;
-   nonce: string;
-   feeRateBps: string;
+   timestamp: string;
+   metadata: string;    // bytes32, set to HASH_ZERO_BYTES32
+   builder: string;     // bytes32, set to HASH_ZERO_BYTES32
    side: UtilsSide;
    signatureType?: SignatureType;
  }
```
