# MYX SDK & Protocol Reference

Learnings from integration work — useful context for the in-wallet implementation.

See also: [MYX-SDK-INCONSISTENCIES.md](MYX-SDK-INCONSISTENCIES.md) — type gaps, format mismatches, and issues reported to MYX team.

## Markets

MYX uses permissionless pool creation. `getPoolSymbolAll()` returns all pools (~26 on mainnet) including dead/spam ones (e.g. `m我踏马走了`). Only ~6 have active oracle feeds. The UI curates pools into tabs:

- **Contract** > **Blue Chips** (BTCB, WBTC, DOGE) | **Alpha** (MYX, quq, AMPL) | **Favorite**
- Testnet has one active market: **SGLT/USDC**

## Account Balance Model

Two layers of funds, both **global** (not per-pool):
1. **Wallet Balance** — quote token in wallet (not deposited)
2. **Free Margin** — deposited into MYX's on-chain Account contract

`Available Margin = Free Margin + Wallet Balance` (shown as "Balance" in UI)

Per-pool fields only diverge from zero when positions/orders exist in that pool.

### `getAccountInfo(chainId, address, poolId)` → `AccountInfo`

| SDK Field | MYX UI Label | Scope | Description |
|-----------|-------------|-------|-------------|
| `freeMargin` | Free Margin | Global | Settled balance, withdrawable anytime |
| `walletBalance` | Wallet Balance | Global | Quote token in on-chain wallet |
| `reservedAmount` | Reserved Amount | Per-pool | Margin locked for open positions |
| `quoteProfit` | Locked Realized PnL (USDC) | Per-pool | Realized PnL in unlocking cycle |
| `freeBaseAmount` | Withdrawable (base token) | Per-pool | Base token (e.g. META) available to withdraw |
| `baseProfit` | Locked Realized PnL (base) | Per-pool | Base token PnL in unlocking cycle |
| `releaseTime` | Unlock timer | Per-pool | Timestamp when locked PnL becomes withdrawable |

Note: `Available Margin = freeMargin + walletBalance`. Unrealized PnL is NOT in this response — it comes from `listPositions()` per-position data.

### Collateral decimals

| Network | Token | Decimals | Example |
|---------|-------|----------|---------|
| Mainnet (BSC 56) | USDT | 18 | `25731940913776519597` → 25.7319 |
| Testnet (Linea Sepolia 59141) | USDC | 6 | `488935694` → 488.9356 |

## Fee Model

### Fee rate precision
All fee rates use **1e8** precision (on-chain `RATE_PRECISION`).
- `55000` = 55000 / 100,000,000 = **0.055%** (standard taker fee)
- `-5000` = -5000 / 100,000,000 = **-0.005%** (negative = maker rebate)

### Getting fee rates
```typescript
const result = await client.utils.getUserTradingFeeRate(assetClass, riskTier, chainId, userAddress?);
// result.data: { takerFeeRate, makerFeeRate, baseTakerFeeRate, baseMakerFeeRate }
```

Parameters:
- `assetClass` (number): Asset classification (0 = standard perpetuals). Set per-broker at creation.
- `riskTier` (number, 0-255): Per-pool risk parameter. Not exposed in pool API responses.
- `userAddress` (optional): When passed, returns user-specific rates (tier discounts). Currently not used.

### Trading fee calculation
```
tradingFee = (collateralAmount * takerFeeRate) / 100,000,000
```
Passed as separate arg to `createIncreaseOrder(params, tradingFee, marketId)`.
The SDK adds `tradingFee` to `collateralAmount` before sending to the contract.

### Broker revenue model
MYX brokers earn through **referral rebates**, not a separate fee line:
1. Broker address is passed at `MyxClient({ brokerAddress })` — tags all trades
2. `setUserFeeData(address, chainId, deadline, { tier, referrer, totalReferralRebatePct, referrerRebatePct, nonce }, signature)` — links user to broker, sets rebate split (requires backend EIP-712 signature from MYX)
3. `referrals.claimRebate(tokenAddress)` — broker claims accumulated rebates
4. Trade data includes `referrerRebate`, `referralRebate`, `rebateClaimedAmount`

**Current status**: We pass `brokerAddress` (step 1) but have not set up referral relationships (step 2) or rebate claiming (step 3). This requires MYX team coordination.

## Value Format Inconsistency (read vs write)

The SDK returns **human-readable** values from read APIs but expects **scaled integers** for write APIs. This is the single biggest source of bugs.

### Read APIs (human-readable)

| Method | Field | Example value | Format |
|--------|-------|---------------|--------|
| `listPositions()` | `size` | `"0.04971274067443914"` | Human-readable (base asset units) |
| `listPositions()` | `entryPrice` | `"2302.913268906022499996"` | Human-readable USD |
| `getTickerList()` | `price` | `"2308.01"` | Human-readable USD |

### Write APIs (scaled integers)

| Param | Precision | Example | How to scale |
|-------|-----------|---------|-------------|
| `size` | 18 decimals | `"49712740674439140"` | `toSize(humanSize)` |
| `price` | 30 decimals | `"2189111290775253000000000000000000"` | `toContractPrice(humanPrice)` |
| `collateralAmount` | Token decimals (6 or 18) | `"120000000"` (6 dec) | `toCollateral(humanAmount, decimals)` |

### `getAccountInfo()` (scaled to collateral decimals)

Unlike positions/tickers, account balances come back as **scaled integers** in collateral token decimals:
- Testnet (USDC, 6 dec): `"488935694"` → 488.9356
- Mainnet (USDT, 18 dec): `"25731940913776519597"` → 25.7319

### Protocol constants (same across all assets/networks)

| Constant | Value | Usage |
|----------|-------|-------|
| `MYX_PRICE_DECIMALS` | 30 | Price scaling for write APIs |
| `MYX_SIZE_DECIMALS` | 18 | Position size scaling for write APIs |
| `MYX_RATE_PRECISION` | 1e8 | Fee rate divisor (e.g. `55000 / 1e8 = 0.00055 = 0.055%`) |

## Order Lifecycle

**Order** = instruction to trade. **Position** = actual exposure after fill.

Flow: Submit tx → On-chain confirmation → Keeper validates → Filled (position opens) or Rejected.

**Tx confirmation does NOT mean the order was filled** — it only means submitted. Always check `orderStatus` and `filledSize` after.

| Field | Values |
|-------|--------|
| `orderStatus` | `9` = filled, `1` = rejected/cancelled |
| `operation` | `0` = increase (open), `1` = decrease (close) |
| `cancelReason` | `"Order size out of range"`, hex blob (on-chain revert), etc. |

## Minimum Order Size

**Critical**: Each pool has a minimum size in **base asset units** (not USD). The effective minimum USD is **dynamic** — it shifts with the market price.

```
effective_min_usd = min_size_base * current_price
```

The SDK does not expose `minOrderSize` — it's enforced on-chain by the keeper. Rejected orders return `cancelReason: "Order size out of range"`.

### Testnet SGLT observations

| Size | Result |
|------|--------|
| >= 0.047 (~$108) | Filled |
| < 0.047 (~$100) | Rejected |

**Integration implications**: Cannot hardcode min USD — must compute from base size * price. Add ~10% safety margin for price movement.

## Opening a Position

```bash
NETWORK=testnet npx tsx placeOrder.ts --symbol SGLT --side long --usd 120 --leverage 10 --type market
npx tsx placeOrder.ts --symbol BTC --side long --usd 100 --leverage 10 --type market
```

### Internal flow

1. `getPoolSymbolAll()` → resolve symbol to `poolId`
2. `getMarketDetail({ chainId, poolId })` → get `marketId`
3. `getUserTradingFeeRate(0, 0, chainId)` → `takerFeeRate` (e.g. 55000 = 0.055%)
4. `getTickerList()` → current price (+5% slippage buffer for market buys, -5% for sells)
5. Compute `size = usd / price`
6. Scale: price ×10^30, size ×10^18, collateral ×10^decimals
7. `createIncreaseOrder(params, tradingFee, marketId)` → tx → keeper fills

### PlaceOrderParams

```typescript
{
  chainId, address, poolId,
  positionId: '',            // empty for new positions
  orderType: 0,              // 0=market, 1=limit
  triggerType: 0,
  direction: 0,              // 0=LONG, 1=SHORT
  collateralAmount: string,  // scaled to token decimals
  size: string,              // scaled to 18 decimals
  price: string,             // scaled to 30 decimals
  slippagePct: '100',        // BPS: 100=1%, 500=5%
  executionFeeToken: string, // collateral token address
  leverage: number,
  tpSize: '0', tpPrice: '0', slSize: '0', slPrice: '0',
}
```

The SDK adds `tradingFee` to `collateralAmount` before sending to contract.

## Closing a Position

```bash
npx tsx closeOrder.ts --close <positionId>              # market close
npx tsx closeOrder.ts --close <positionId> --price 2500  # limit close
npx tsx closeOrder.ts --cancel <orderId>                 # cancel pending order
```

Flow: `listPositions(address)` → build decrease order with full size → `createDecreaseOrder(params)` → keeper fills → collateral + PnL returned to Free Margin.

## Network Reference

| Config | Mainnet (BSC 56) | Testnet (Linea Sepolia 59141) |
|--------|-----------------|-------------------------------|
| Collateral | USDT (18 dec) | USDC (6 dec) |
| Broker | `0xEb8C74fF...` | `0x0FB08D3A...` |
| API | `api.myx.finance` | `api-test.myx.cash` |
| RPC | `bsc-dataseed.bnbchain.org` | `rpc.sepolia.linea.build` |
| Active markets | BTCB, DOGE, MYX, AMPL, quq | SGLT only |

## Script Quick Reference

```bash
npx tsx listMarkets.ts                    # list markets (no auth)
npx tsx showAccount.ts                    # balances + positions
npx tsx listOrders.ts                     # open orders + history
npx tsx placeOrder.ts --symbol BTC --side long --usd 100 --leverage 10 --type market
npx tsx closeOrder.ts --close <positionId>
npx tsx closeOrder.ts --cancel <orderId>
# Prefix any command with NETWORK=testnet for testnet
```
