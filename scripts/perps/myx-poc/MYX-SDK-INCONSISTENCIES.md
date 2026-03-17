# MYX SDK Inconsistencies

Issues found during integration (SDK v0.1.270). Reported to MYX team — see `myx-telegram.txt` for the full message.

## 1. Incomplete TypeScript types

### `getAccountInfo()` returns `{ data: any }`

The 7-element account tuple has no type definition. We created our own:

```typescript
interface AccountTuple {
  freeAmount: string;
  walletBalance: string;
  reservedAmount: string;
  orderHoldInUSD: string;
  totalCollateral: string;
  lockedRealizedPnl: string;
  unrealizedPnl: string;
}
```

**Source**: `index.d.ts:2019` — `getAccountInfo(...): Promise<{ code: number; data: any }>`

### `PositionType` missing runtime fields

The SDK's `PositionType` only has: `poolId`, `positionId`, `direction`, `entryPrice`, `fundingRateIndex`, `size`, `riskTier`, `collateralAmount`, `txTime`.

The API actually returns these additional fields (confirmed at runtime):

| Field | Type | Present in SDK type? |
|-------|------|---------------------|
| `userLeverage` | `number` | No |
| `baseSymbol` | `string` | No |
| `quoteSymbol` | `string` | No |
| `tradingFee` | `string` | No |
| `freeAmount` | `string` | No |
| `lockedAmount` | `string` | No |
| `broker` | `string` | No |
| `earlyClosePrice` | `string` | No |
| `tokenId` | `string \| null` | No |

**Workaround**: Extended type in `common.ts`:
```typescript
export interface PositionData extends PositionType {
  userLeverage: number;
  baseSymbol: string;
  // ... etc
}
```

### `getOrders()` returns `PositionType[]`

**Source**: `index.d.ts:1852` and `index.d.ts:2377-2379`

Orders and positions are different concepts but share the same type. Should be a separate `OrderType` interface.

### `getUserTradingFeeRate()` returns `any`

**Source**: `index.d.ts:1411-1417`

```typescript
getUserTradingFeeRate(...): Promise<{
  data: {
    takerFeeRate: any;   // should be string or number
    makerFeeRate: any;   // should be string or number
    baseTakerFeeRate: any;
    baseMakerFeeRate: any;
  };
}>
```

### Missing SDK constants

The SDK exports `COMMON_PRICE_DECIMALS` (30) and `COMMON_LP_AMOUNT_DECIMALS` (18), but:

| What's needed | SDK export | Status |
|---------------|-----------|--------|
| Price decimals | `COMMON_PRICE_DECIMALS = 30` | Exported |
| Position size decimals | None (we reuse `COMMON_LP_AMOUNT_DECIMALS = 18`) | Missing — no `COMMON_SIZE_DECIMALS` |
| Fee rate precision | None | Missing — no `COMMON_RATE_PRECISION` (1e6) |

The integration guide (`SDK_INTEGRATION_GUIDE_EN_NEW.md`) mentions `COMMON_PRICE_DECIMALS` and `COMMON_LP_AMOUNT_DECIMALS` but doesn't document that position size also uses 18 decimals or that fee rates use 1e6 precision.

## 2. Read vs write format inconsistency

Read APIs return human-readable strings. Write APIs expect scaled integers. No documentation on which is which.

| API | Field | Returns | Expected by write API |
|-----|-------|---------|-----------------------|
| `listPositions()` | `size` | `"0.0497..."` (human) | `"49712740674439140"` (18 dec) |
| `listPositions()` | `entryPrice` | `"2302.91..."` (human) | `"2302913...000"` (30 dec) |
| `getTickerList()` | `price` | `"2308.01"` (human) | N/A (read only) |
| `getAccountInfo()` | balances | `"488935694"` (scaled to collateral dec) | N/A (read only) |

This caused a bug: passing `position.size` directly to `createDecreaseOrder()` fails with `"invalid BigNumberish string"` because the SDK doesn't scale it internally.

The integration guide documents write-side scaling (prices as 30 decimals, amounts in token decimals) but never mentions that read APIs return human-readable values, or that consumers must scale between the two formats.

## 3. ethers v6 hard dependency

- `package.json`: `"ethers": "^6.15.0"` as direct dependency (not peer)
- `index.d.ts:1-2`: imports `Signer`, `BrowserProvider` from `'ethers'` (v6 types)
- `auth()` expects `signer?: Signer` (ethers v6)

MetaMask uses ethers v5. Requires unsafe casts and bundles both versions.

## 4. SDK internal logging

The SDK logs `[MYX-SDK-INFO] createDecreaseOrder nft position params--->` to stdout with no way to disable or redirect. This pollutes application logs in production.
