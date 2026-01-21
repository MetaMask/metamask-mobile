# MYX Trade SDK Integration Guide

## Overview

MYX Trade SDK is a TypeScript/JavaScript SDK for derivatives trading. It provides order placement, position management, market data, subscriptions, account management, seamless wallet, and LP operations.

## Installation

```bash
npm install @myx-trade/sdk
# or
yarn add @myx-trade/sdk
# or
pnpm add @myx-trade/sdk
```

## Module: Initialization & Config

### Initialize SDK Client

```typescript
import { MyxClient } from '@myx-trade/sdk';
import { BrowserProvider } from 'ethers';

const provider = new BrowserProvider(walletClient.transport);
const signer = await provider.getSigner();

const myxClient = new MyxClient({
  chainId: 421614, // Testnet chain ID
  signer,
  brokerAddress: BROKER_ADDRESS, // Get from MYX team
  isTestnet: true, // true for testnet, false for beta
  isBetaMode: false, // true for beta environment
});
```

### Update Client Chain

```typescript
// Switch to different chain
myxClient.updateClientChainId(newChainId, NEW_BROKER_ADDRESS);
```

## Module: Order

### createIncreaseOrder

Create an increase position order (open or add to position).

```typescript
import { OrderType, TriggerType, Direction } from '@myx-trade/sdk';

const result = await myxClient.order.createIncreaseOrder(
  {
    chainId: 421614,
    address: userAddress as `0x${string}`,
    poolId: poolId, // Pool ID from market list
    positionId: '0', // 0 for new position, or existing positionId
    orderType: OrderType.LIMIT,
    triggerType: TriggerType.NONE,
    direction: Direction.LONG,
    collateralAmount: '1000000000', // in quote token decimals
    size: '1000000000000000000', // position size
    price: '3000000000000000000000000000000000', // 30 decimals
    postOnly: false,
    slippagePct: '100', // in bps
    executionFeeToken: quoteTokenAddress, // Quote token address (e.g., USDC)
    leverage: 10,
    tpSize: '0', // optional take profit size
    tpPrice: '0', // optional take profit price
    slSize: '0', // optional stop loss size
    slPrice: '0', // optional stop loss price
  },
  tradingFee,
);
```

### createDecreaseOrder

Create a decrease position order (close or reduce position).

```typescript
const result = await myxClient.order.createDecreaseOrder({
  chainId: 421614,
  address: userAddress as `0x${string}`,
  poolId: poolId,
  positionId: existingPositionId,
  orderType: OrderType.MARKET,
  triggerType: TriggerType.NONE,
  direction: Direction.SHORT,
  collateralAmount: '0',
  size: '500000000000000000',
  price: '3000000000000000000000000000000000',
  postOnly: false,
  slippagePct: '100',
  executionFeeToken: quoteTokenAddress,
  leverage: 10,
});
```

### closeAllPositions

Close all positions in a pool at once.

```typescript
const result = await myxClient.order.closeAllPositions(
  421614, // chainId
  [
    {
      /* PlaceOrderParams for position 1 */
    },
    {
      /* PlaceOrderParams for position 2 */
    },
  ],
);
```

### createPositionTpSlOrder

Create take profit and/or stop loss orders for an existing position.

```typescript
import { TriggerType, Direction } from '@myx-trade/sdk';

await myxClient.order.createPositionTpSlOrder({
  chainId: 421614,
  address: userAddress as `0x${string}`,
  poolId: poolId,
  positionId: existingPositionId,
  direction: Direction.LONG,
  leverage: 10,
  tpSize: '100000000000000000',
  tpPrice: '3500000000000000000000000000000000',
  tpTriggerType: TriggerType.GTE,
  slSize: '100000000000000000',
  slPrice: '2800000000000000000000000000000000',
  slTriggerType: TriggerType.LTE,
  executionFeeToken: quoteTokenAddress,
});
```

### updateOrderTpSl

Update take profit and stop loss for an existing order.

```typescript
await myxClient.order.updateOrderTpSl(
  {
    orderId: orderId,
    size: '1000000000000000000',
    price: '3000000000000000000000000000000000',
    tpSize: '500000000000000000',
    tpPrice: '3500000000000000000000000000000000',
    slSize: '500000000000000000',
    slPrice: '2800000000000000000000000000000000',
    useOrderCollateral: true,
    executionFeeToken: quoteTokenAddress,
  },
  quoteTokenAddress,
  chainId,
  userAddress,
);
```

### cancelOrder

Cancel a single order.

```typescript
await myxClient.order.cancelOrder(orderId, chainId);
```

### cancelOrders

Cancel multiple orders.

```typescript
await myxClient.order.cancelOrders([orderId1, orderId2, orderId3], chainId);
```

### cancelAllOrders

Cancel all open orders.

```typescript
await myxClient.order.cancelAllOrders([orderId1, orderId2, orderId3], chainId);
```

### getOrders

Get all open orders for the current account.

```typescript
const result = await myxClient.order.getOrders(userAddress);
if (result.code === 0) {
  console.log(result.data); // array of open orders
}
```

### getOrderHistory

Get historical orders.

```typescript
const result = await myxClient.order.getOrderHistory(
  {
    chainId: 421614,
    poolId: poolId, // optional filter by pool
    page: 1,
    limit: 20,
  },
  userAddress,
);
```

## Module: Position

### listPositions

Get all open positions for the current account.

```typescript
const result = await myxClient.position.listPositions(userAddress);
if (result.code === 0) {
  const positions = result.data;
  // positions array contains all open positions
}
```

### getPositionHistory

Get historical closed positions.

```typescript
const result = await myxClient.position.getPositionHistory(
  {
    chainId: 421614,
    poolId: poolId, // optional filter by pool
    page: 1,
    limit: 20,
  },
  userAddress,
);
```

### adjustCollateral

Add or remove collateral from a position.

```typescript
import { OracleType } from '@myx-trade/sdk';

await myxClient.position.adjustCollateral({
  poolId: poolId,
  positionId: positionId,
  adjustAmount: '100000000', // positive to add, negative to remove
  quoteToken: quoteTokenAddress,
  poolOracleType: OracleType.Pyth,
  chainId: 421614,
  address: userAddress,
});
```

## Module: Utils

### needsApproval

Check if token approval is needed.

```typescript
const needApproval = await myxClient.utils.needsApproval(
  userAddress,
  chainId,
  quoteTokenAddress,
  amount,
);
```

### approveAuthorization

Approve token spending.

```typescript
const result = await myxClient.utils.approveAuthorization({
  chainId: chainId,
  quoteAddress: quoteTokenAddress,
  amount: ethers.MaxUint256.toString(),
});
```

### getUserTradingFeeRate

Get user's trading fee rates.

```typescript
const result = await myxClient.utils.getUserTradingFeeRate(
  assetClass,
  riskTier,
  chainId,
);
// Returns: { takerFeeRate, makerFeeRate, baseTakerFeeRate, baseMakerFeeRate }
```

### getNetworkFee

Get the network execution fee for orders.

```typescript
const networkFee = await myxClient.utils.getNetworkFee(
  quoteTokenAddress,
  chainId,
);
```

### getOraclePrice

Get oracle price for a pool.

```typescript
const priceData = await myxClient.utils.getOraclePrice(poolId, chainId);
// Returns: { price, vaa, publishTime, poolId, value }
```

### checkSeamlessGas

Check if seamless account has enough gas.

```typescript
const hasEnoughGas = await myxClient.utils.checkSeamlessGas(
  userAddress,
  chainId,
);
```

### getLiquidityInfo

Get pool liquidity information.

```typescript
const result = await myxClient.utils.getLiquidityInfo({
  chainId: chainId,
  poolId: poolId,
  marketPrice: marketPrice, // 30 decimals
});
```

### formatErrorMessage

Format error messages from contract calls.

```typescript
const errorMsg = myxClient.utils.formatErrorMessage(error);
```

### getGasPriceByRatio

Get gas price with configured ratio.

```typescript
const gasPrice = await myxClient.utils.getGasPriceByRatio(chainId);
```

### getGasLimitByRatio

Get gas limit with configured ratio.

```typescript
const gasLimit = await myxClient.utils.getGasLimitByRatio(
  chainId,
  BigInt(100000),
);
```

## Module: Markets

### getPoolLevelConfig

Get pool level configuration.

```typescript
const poolConfig = await myxClient.markets.getPoolLevelConfig(poolId, chainId);
```

### getKlineList

Get kline/candlestick data.

```typescript
const klines = await myxClient.markets.getKlineList({
  poolId: poolId,
  chainId: chainId,
  interval: '1h', // '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'
  limit: 100,
  endTime: Date.now(),
});
```

### getKlineLatestBar

Get the latest kline bar.

```typescript
const latestBar = await myxClient.markets.getKlineLatestBar({
  poolId: poolId,
  chainId: chainId,
  interval: '1h',
});
```

### getTickerList

Get ticker data for multiple pools.

```typescript
const tickers = await myxClient.markets.getTickerList({
  chainId: chainId,
  poolIds: [poolId1, poolId2],
});
```

### searchMarket

Search markets (unauthenticated).

```typescript
const results = await myxClient.markets.searchMarket({
  chainId: chainId,
  keyword: 'BTC',
  limit: 10,
});
```

### searchMarketAuth

Search markets with authentication (shows favorites).

```typescript
const results = await myxClient.markets.searchMarketAuth(
  {
    chainId: chainId,
    keyword: 'BTC',
    limit: 10,
  },
  userAddress,
);
```

### getFavoritesList

Get user's favorite markets.

```typescript
const favorites = await myxClient.markets.getFavoritesList(
  {
    chainId: chainId,
    page: 1,
    limit: 20,
  },
  userAddress,
);
```

### addFavorite

Add a market to favorites.

```typescript
await myxClient.markets.addFavorite(
  {
    chainId: chainId,
    poolId: poolId,
  },
  userAddress,
);
```

### removeFavorite

Remove a market from favorites.

```typescript
await myxClient.markets.removeFavorite(
  {
    chainId: chainId,
    poolId: poolId,
  },
  userAddress,
);
```

### getBaseDetail

Get base token details.

```typescript
const baseDetail = await myxClient.markets.getBaseDetail({
  chainId: chainId,
  baseAddress: baseTokenAddress,
});
```

### getMarketDetail

Get market detail information.

```typescript
const marketDetail = await myxClient.markets.getMarketDetail({
  chainId: chainId,
  poolId: poolId,
});
```

### getPoolSymbolAll

Get all pool symbols.

```typescript
const pools = await myxClient.markets.getPoolSymbolAll();
```

## Module: Account

### getWalletQuoteTokenBalance

Get wallet's quote token balance.

```typescript
const result = await myxClient.account.getWalletQuoteTokenBalance(
  chainId,
  userAddress,
);
console.log(result.data); // balance in wei
```

### getAvailableMarginBalance

Get available margin balance for a pool.

```typescript
const availableBalance = await myxClient.account.getAvailableMarginBalance({
  poolId: poolId,
  chainId: chainId,
  address: userAddress,
});
```

### getTradeFlow

Get account trade flow history.

```typescript
const result = await myxClient.account.getTradeFlow(
  {
    chainId: chainId,
    page: 1,
    limit: 20,
  },
  userAddress,
);
```

### deposit

Deposit funds to trading account.

```typescript
const result = await myxClient.account.deposit({
  amount: amount,
  tokenAddress: quoteTokenAddress,
  chainId: chainId,
});
```

### withdraw

Withdraw funds from trading account.

```typescript
const result = await myxClient.account.withdraw({
  chainId: chainId,
  receiver: userAddress,
  amount: amount,
  poolId: poolId,
  isQuoteToken: true,
});
```

### getAccountInfo

Get account information for a pool.

```typescript
const result = await myxClient.account.getAccountInfo(
  chainId,
  userAddress,
  poolId,
);
// Returns: { freeMargin, quoteProfit, ... }
```

### getAccountVipInfo

Get account VIP information from chain.

```typescript
const result = await myxClient.account.getAccountVipInfo(chainId, userAddress);
// Returns: { tier, referrer, totalReferralRebatePct, referrerRebatePct, nonce, deadline }
```

### getAccountVipInfoByBackend

Get account VIP information from backend.

```typescript
const result = await myxClient.account.getAccountVipInfoByBackend(
  userAddress,
  chainId,
  deadline,
  nonce,
);
```

### setUserFeeData

Set user fee data with signature from backend.

```typescript
const result = await myxClient.account.setUserFeeData(
  userAddress,
  chainId,
  deadline,
  {
    tier: 1,
    referrer: referrerAddress,
    totalReferralRebatePct: 1000,
    referrerRebatePct: 500,
    nonce: nonce,
  },
  signature,
);
```

## Module: Seamless (Gasless Trading)

Seamless mode allows users to trade without paying gas fees by using a relayer account.

### createSeamless

Create a new seamless wallet.

```typescript
const result = await myxClient.seamless.createSeamless({
  password: userPassword,
  chainId: chainId,
});
// Returns: { masterAddress, seamlessAccount, authorized, apiKey }
```

### unLockSeamlessWallet

Unlock an existing seamless wallet.

```typescript
const result = await myxClient.seamless.unLockSeamlessWallet({
  masterAddress: userAddress,
  password: userPassword,
  apiKey: encryptedApiKey,
  chainId: chainId,
});
```

### authorizeSeamlessAccount

Authorize or revoke seamless account.

```typescript
const result = await myxClient.seamless.authorizeSeamlessAccount({
  approve: true, // false to revoke
  seamlessAddress: seamlessWalletAddress,
  chainId: chainId,
});
```

### startSeamlessMode

Enable or disable seamless mode.

```typescript
const result = await myxClient.seamless.startSeamlessMode({
  open: true, // false to disable
});
```

### exportSeamlessPrivateKey

Export seamless wallet private key.

```typescript
const result = await myxClient.seamless.exportSeamlessPrivateKey({
  password: userPassword,
  apiKey: encryptedApiKey,
});
// Returns: { privateKey }
```

### importSeamlessPrivateKey

Import seamless wallet from private key.

```typescript
const result = await myxClient.seamless.importSeamlessPrivateKey({
  privateKey: privateKey,
  password: userPassword,
  chainId: chainId,
});
// Returns: { masterAddress, seamlessAccount, authorized, apiKey }
```

## Module: Referrals

### claimRebate

Claim referral rebates.

```typescript
const receipt = await myxClient.referrals.claimRebate(
  tokenAddress, // token address to claim rebate in
);
```

## Module: LP (Liquidity Provider)

The LP module provides functionality for liquidity providers to manage pool liquidity.

### Pool Management

#### pool.createPool

Create a new liquidity pool.

```typescript
import { pool } from '@myx-trade/sdk';

const poolId = await pool.createPool({
  chainId: chainId,
  baseToken: baseTokenAddress,
  marketId: marketId,
});
```

**Parameters:**

```typescript
interface CreatePoolRequest {
  chainId: ChainId;
  baseToken: AddressLike;
  marketId: string;
}
```

#### pool.getPoolDetail

Get detailed information about a pool.

```typescript
const detail = await pool.getPoolDetail(poolId);
```

#### pool.getMarketPoolId

Get pool ID for a specific market.

```typescript
const poolId = await pool.getMarketPoolId({
  chainId: chainId,
  baseToken: baseTokenAddress,
  marketId: marketId,
});
```

#### pool.getMarketPools

Get all pools for a market.

```typescript
const pools = await pool.getMarketPools({
  chainId: chainId,
  marketId: marketId,
});
```

#### pool.getPoolInfo

Get pool information.

```typescript
const info = await pool.getPoolInfo(chainId, poolId);
```

#### pool.getUserGenesisShare

Get user's genesis share in a pool.

```typescript
const share = await pool.getUserGenesisShare({
  chainId: chainId,
  poolId: poolId,
  account: userAddress,
});
```

#### pool.addTpSl

Add take profit / stop loss orders for LP position.

```typescript
import { PoolType, TriggerType } from '@myx-trade/sdk';

await pool.addTpSl({
  chainId: chainId,
  poolId: poolId,
  poolType: PoolType.Quote, // PoolType.Quote or PoolType.Base
  slippage: 0.01,
  tpsl: [
    {
      amount: 100,
      triggerPrice: 3500,
      triggerType: TriggerType.TP,
    },
    {
      amount: 100,
      triggerPrice: 2800,
      triggerType: TriggerType.SL,
    },
  ],
});
```

**Parameters:**

```typescript
enum PoolType {
  Base = 0,
  Quote = 1,
}

enum TriggerType {
  TP = 1, // Take Profit
  SL = 2, // Stop Loss
}

interface TpSl {
  amount: number;
  triggerPrice: number;
  triggerType: TriggerType;
}

interface AddTpSLParams {
  chainId: ChainId;
  poolId: string;
  poolType: PoolType;
  slippage: number;
  tpsl: TpSl[];
}
```

#### pool.cancelTpSl

Cancel take profit / stop loss order.

```typescript
await pool.cancelTpSl({
  chainId: chainId,
  orderId: orderId,
});
```

#### pool.reprime

Reprime a pool.

```typescript
await pool.reprime({
  chainId: chainId,
  poolId: poolId,
});
```

#### pool.getOpenOrders

Get open LP orders.

```typescript
const orders = await pool.getOpenOrders({
  chainId: chainId,
  poolId: poolId,
  account: userAddress,
});
```

### Quote Pool Operations

#### quote.deposit

Deposit quote tokens (e.g., USDC) to provide liquidity.

```typescript
import { quote } from '@myx-trade/sdk';

const tx = await quote.deposit({
  chainId: chainId,
  poolId: poolId,
  amount: 2000,
  slippage: 0.01,
  tpsl: [
    // Optional
    {
      triggerPrice: 3500,
      triggerType: TriggerType.TP,
    },
  ],
});
```

**Parameters:**

```typescript
interface Deposit {
  chainId: ChainId;
  poolId: string;
  amount: number;
  slippage: number;
  tpsl?: DepositTpSl[]; // Optional take profit/stop loss
}

type DepositTpSl = Pick<TpSl, 'triggerType' | 'triggerPrice'>;
```

#### quote.withdraw

Withdraw quote tokens from the pool.

```typescript
const tx = await quote.withdraw({
  chainId: chainId,
  poolId: poolId,
  amount: 1000,
  slippage: 0.01,
});
```

**Parameters:**

```typescript
interface WithdrawParams {
  chainId: ChainId;
  poolId: string;
  amount: number;
  slippage: number;
}
```

#### quote.transfer

Transfer quote LP tokens.

```typescript
const tx = await quote.transfer({
  chainId: chainId,
  poolId: poolId,
  recipient: recipientAddress,
  amount: amount,
});
```

#### quote.getLpPrice

Get the current price of quote LP tokens.

```typescript
const price = await quote.getLpPrice(chainId, poolId);
```

#### quote.getRewards

Get pending rewards for quote LP.

```typescript
const rewards = await quote.getRewards({
  chainId: chainId,
  poolId: poolId,
  account: userAddress,
});
```

**Parameters:**

```typescript
interface RewardsParams {
  chainId: ChainId;
  poolId: string;
  account: string;
}
```

#### quote.claimQuotePoolRebate

Claim rebate from a single quote pool.

```typescript
const tx = await quote.claimQuotePoolRebate({
  chainId: chainId,
  poolId: poolId,
});
```

**Parameters:**

```typescript
interface ClaimParams {
  chainId: ChainId;
  poolId: string;
}
```

#### quote.claimQuotePoolRebates

Claim rebates from multiple quote pools.

```typescript
const tx = await quote.claimQuotePoolRebates({
  chainId: chainId,
  poolIds: [poolId1, poolId2, poolId3],
});
```

**Parameters:**

```typescript
interface ClaimRebatesParams {
  chainId: ChainId;
  poolIds: string[];
}
```

### Base Pool Operations

#### base.deposit

Deposit base tokens to provide liquidity.

```typescript
import { base } from '@myx-trade/sdk';

const tx = await base.deposit({
  chainId: chainId,
  poolId: poolId,
  amount: 0.01,
  slippage: 0.01,
  tpsl: [
    // Optional
    {
      triggerPrice: 3500,
      triggerType: TriggerType.TP,
    },
  ],
});
```

#### base.withdraw

Withdraw base tokens from the pool.

```typescript
const tx = await base.withdraw({
  chainId: chainId,
  poolId: poolId,
  amount: 0.005,
  slippage: 0.01,
});
```

#### base.getLpPrice

Get the current price of base LP tokens.

```typescript
const price = await base.getLpPrice(chainId, poolId);
```

#### base.getRewards

Get pending rewards for base LP.

```typescript
const rewards = await base.getRewards({
  chainId: chainId,
  poolId: poolId,
  account: userAddress,
});
```

#### base.claimBasePoolRebate

Claim rebate from a single base pool.

```typescript
const tx = await base.claimBasePoolRebate({
  chainId: chainId,
  poolId: poolId,
});
```

#### base.claimBasePoolRebates

Claim rebates from multiple base pools.

```typescript
const tx = await base.claimBasePoolRebates({
  chainId: chainId,
  poolIds: [poolId1, poolId2, poolId3],
});
```

#### base.previewUserWithdrawData

Preview withdrawal data before executing.

```typescript
const withdrawData = await base.previewUserWithdrawData({
  chainId: chainId,
  poolId: poolId,
  account: userAddress,
  amount: amount,
});
```

**Parameters:**

```typescript
interface PreviewWithdrawDataParams {
  chainId: ChainId;
  poolId: string;
  account: string;
  amount: string | number;
}
```

### Market Operations

#### market.getMarket

Get market information.

```typescript
import { market } from '@myx-trade/sdk';

const marketInfo = await market.getMarket(chainId);
```

#### market.getOracleFee

Get oracle fee for price updates.

```typescript
const oracleFee = await market.getOracleFee(chainId, poolId);
```

### Utility Functions

The LP module also exports useful utility functions:

```typescript
import {
  formatUnits,
  parseUnits,
  COMMON_PRICE_DECIMALS,
  COMMON_LP_AMOUNT_DECIMALS,
} from '@myx-trade/sdk';

// Format from wei to human-readable
const formattedAmount = formatUnits(bigIntAmount, decimals);

// Parse from human-readable to wei
const weiAmount = parseUnits('100', decimals);

// Common decimals constants
console.log(COMMON_PRICE_DECIMALS); // Price decimals (30)
console.log(COMMON_LP_AMOUNT_DECIMALS); // LP token decimals
```

### Complete LP Example

```typescript
import { pool, quote, base, formatUnits } from '@myx-trade/sdk';

// Create a pool
const poolId = await pool.createPool({
  chainId: 421614,
  baseToken: baseTokenAddress,
  marketId: marketId,
});

// Get pool details
const detail = await pool.getPoolDetail(poolId);

// Deposit quote tokens (USDC)
await quote.deposit({
  chainId: 421614,
  poolId,
  amount: 2000,
  slippage: 0.01,
});

// Deposit base tokens
await base.deposit({
  chainId: 421614,
  poolId,
  amount: 0.01,
  slippage: 0.01,
});

// Check LP token prices
const quoteLpPrice = await quote.getLpPrice(421614, poolId);
const baseLpPrice = await base.getLpPrice(421614, poolId);

// Check rewards
const quoteRewards = await quote.getRewards({
  chainId: 421614,
  poolId,
  account: userAddress,
});

// Claim rewards
await quote.claimQuotePoolRebate({
  chainId: 421614,
  poolId,
});

// Withdraw liquidity
await quote.withdraw({
  chainId: 421614,
  poolId,
  amount: 1000,
  slippage: 0.01,
});
```

## Module: Subscription (WebSocket)

The subscription module provides real-time updates for market data, orders, and positions via WebSocket.

### Connection Management

```typescript
// Connect to WebSocket
myxClient.subscription.connect();

// Disconnect from WebSocket
myxClient.subscription.disconnect();

// Reconnect to WebSocket
myxClient.subscription.reconnect();

// Check connection status
const isConnected = myxClient.subscription.isConnected;
```

### Public Subscriptions (No Auth Required)

#### subscribeTickers / unsubscribeTickers

Subscribe to ticker updates for one or multiple pools.

```typescript
const onTickers = (data) => {
  console.log('Ticker update:', data);
  // data: { type: 'ticker', globalId: number, data: { C, E, T, h, i, l, p, v } }
};

// Subscribe to single pool
myxClient.subscription.subscribeTickers(globalId, onTickers);

// Subscribe to multiple pools
myxClient.subscription.subscribeTickers(
  [globalId1, globalId2, globalId3],
  onTickers,
);

// Unsubscribe
myxClient.subscription.unsubscribeTickers(globalId, onTickers);
myxClient.subscription.unsubscribeTickers([globalId1, globalId2], onTickers);
```

#### subscribeKline / unsubscribeKline

Subscribe to kline/candlestick updates.

```typescript
const onKline = (data) => {
  console.log('Kline update:', data);
  // data: { type: 'candle', globalId, resolution, data: { E, T, c, h, l, o, t, v } }
};

// Subscribe
myxClient.subscription.subscribeKline(globalId, '1m', onKline);
// Resolutions: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'

// Unsubscribe
myxClient.subscription.unsubscribeKline(globalId, '1m', onKline);
```

### Private Subscriptions (Auth Required)

Private subscriptions require authentication. Call `auth()` before subscribing.

#### auth

Authenticate the WebSocket connection.

```typescript
await myxClient.subscription.auth();
```

#### subscribeOrder / unsubscribeOrder

Subscribe to order updates for the authenticated account.

```typescript
const onOrder = (data) => {
  console.log('Order update:', data);
  // Receives updates when orders are created, filled, cancelled, etc.
};

await myxClient.subscription.subscribeOrder(onOrder);

// Unsubscribe
myxClient.subscription.unsubscribeOrder(onOrder);
```

#### subscribePosition / unsubscribePosition

Subscribe to position updates for the authenticated account.

```typescript
const onPosition = (data) => {
  console.log('Position update:', data);
  // Receives updates when positions are opened, modified, or closed
};

await myxClient.subscription.subscribePosition(onPosition);

// Unsubscribe
myxClient.subscription.unsubscribePosition(onPosition);
```

### Event Listeners

Listen to WebSocket connection events.

```typescript
// Connection opened
myxClient.subscription.on('open', () => {
  console.log('WebSocket connected');
});

// Connection closed
myxClient.subscription.on('close', () => {
  console.log('WebSocket closed');
});

// Connection error
myxClient.subscription.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Reconnecting
myxClient.subscription.on('reconnecting', ({ detail }) => {
  console.log('Reconnecting...', detail);
});

// Max reconnection attempts reached
myxClient.subscription.on('maxreconnectattempts', () => {
  console.log('Max reconnection attempts reached');
});

// Remove event listener
const handler = () => console.log('opened');
myxClient.subscription.on('open', handler);
myxClient.subscription.off('open', handler);
```

### Complete Example

```typescript
// Connect and subscribe to public data
myxClient.subscription.connect();

// Subscribe to tickers
const tickerCallback = (data) => {
  console.log('Ticker:', data.globalId, data.data);
};
myxClient.subscription.subscribeTickers([1, 2, 3], tickerCallback);

// Subscribe to klines
const klineCallback = (data) => {
  console.log('Kline:', data.globalId, data.resolution, data.data);
};
myxClient.subscription.subscribeKline(1, '1h', klineCallback);

// Authenticate and subscribe to private data
await myxClient.subscription.auth();

// Subscribe to orders
const orderCallback = (data) => {
  console.log('Order update:', data);
};
await myxClient.subscription.subscribeOrder(orderCallback);

// Subscribe to positions
const positionCallback = (data) => {
  console.log('Position update:', data);
};
await myxClient.subscription.subscribePosition(positionCallback);

// Clean up
myxClient.subscription.unsubscribeTickers([1, 2, 3], tickerCallback);
myxClient.subscription.unsubscribeKline(1, '1h', klineCallback);
myxClient.subscription.unsubscribeOrder(orderCallback);
myxClient.subscription.unsubscribePosition(positionCallback);
myxClient.subscription.disconnect();
```

## Types Reference

### Enums

```typescript
// Order Types
export const OrderType = {
  MARKET: 0, // Market order
  LIMIT: 1, // Limit order
  STOP: 2, // Stop order
  CONDITIONAL: 3, // Conditional order
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];

// Trigger Types
export const TriggerType = {
  NONE: 0, // No trigger
  GTE: 1, // Greater than or equal (>=)
  LTE: 2, // Less than or equal (<=)
} as const;
export type TriggerType = (typeof TriggerType)[keyof typeof TriggerType];

// Operation Types
export const OperationType = {
  INCREASE: 0, // Increase position
  DECREASE: 1, // Decrease position
} as const;
export type OperationType = (typeof OperationType)[keyof typeof OperationType];

// Direction
export const Direction = {
  LONG: 0, // Long position
  SHORT: 1, // Short position
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

// Time in Force
export const TimeInForce = {
  IOC: 0, // Immediate or Cancel
} as const;
export type TimeInForce = (typeof TimeInForce)[keyof typeof TimeInForce];
```

### Interfaces

```typescript
// Place order parameters
export interface PlaceOrderParams {
  chainId: number;
  address: string;
  poolId: string;
  positionId: string;
  orderType: OrderType;
  triggerType: TriggerType;
  direction: Direction;
  collateralAmount: string; // in quote token decimals
  size: string; // position size
  price: string; // 30 decimals
  timeInForce: TimeInForce;
  postOnly: boolean;
  slippagePct: string; // basis points (bps)
  executionFeeToken: string;
  leverage: number;
  tpSize?: string; // optional take profit size
  tpPrice?: string; // optional take profit price (30 decimals)
  slSize?: string; // optional stop loss size
  slPrice?: string; // optional stop loss price (30 decimals)
}

// TP/SL for position
export interface PositionTpSlOrderParams {
  chainId: number;
  address: string;
  poolId: string;
  positionId: number;
  executionFeeToken: string;
  tpTriggerType: TriggerType;
  slTriggerType: TriggerType;
  direction: Direction; // position direction
  leverage: number;
  tpSize?: string; // take profit size
  tpPrice?: string; // take profit price (30 decimals)
  slSize?: string; // stop loss size
  slPrice?: string; // stop loss price (30 decimals)
}

// Update order TP/SL
export interface UpdateOrderParams {
  orderId: string;
  size: string;
  price: string; // 30 decimals
  tpSize: string;
  tpPrice: string; // 30 decimals
  slSize: string;
  slPrice: string; // 30 decimals
  useOrderCollateral: boolean;
  executionFeeToken: string;
}

// History query parameters
export interface GetHistoryOrdersParams {
  chainId: number;
  poolId?: string;
  page: number;
  limit: number;
}
```

### WebSocket Types

```typescript
// Kline resolution
export type KlineResolution =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d'
  | '1w'
  | '1M';

// Ticker data
export interface TickersDataResponse {
  type: 'ticker';
  globalId: number;
  data: {
    C: string; // Close price
    E: number; // Event time
    T: string; // Timestamp
    h: string; // High price
    i: string; // Index price
    l: string; // Low price
    p: string; // Price change percent
    v: string; // Volume
  };
}

// Kline data
export interface KlineDataResponse {
  type: 'candle';
  globalId: number;
  resolution: KlineResolution;
  data: {
    E: number; // Event time
    T: string; // Timestamp
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    o: string; // Open price
    t: number; // Time
    v: string; // Volume
  };
}
```

### Client Configuration

```typescript
export interface MyxClientConfig {
  chainId: number; // Chain ID (421614 for testnet)
  signer?: ethers.Signer; // Ethers signer
  walletClient?: any; // Wagmi wallet client
  brokerAddress: string; // Broker contract address
  isTestnet?: boolean; // true for testnet, false for beta (default: false)
  isBetaMode?: boolean; // true for beta environment (default: false)
  seamlessMode?: boolean; // Enable seamless (gasless) mode (default: false)
  logLevel?: 'debug' | 'info' | 'warn' | 'error'; // Log level (default: 'info')
  socketConfig?: {
    reconnectInterval?: number; // WebSocket reconnect interval in ms (default: 5000)
    maxReconnectAttempts?: number; // Max reconnection attempts (default: 5)
  };
  getAccessToken?: () => Promise<{
    // Optional: Access token getter function
    code: number;
    msg: string | null;
    data: {
      accessToken: string;
      expireAt: number;
      allowAccount: string;
      appId: string;
    };
  }>;
}
```

## Error Handling

### AccessToken Management

The SDK automatically manages AccessToken. If token expires (error code 9401), call `handleAccessToken()` again:

```typescript
try {
  const orders = await myxClient.order.getOrders(address);
} catch (error) {
  if (error.code === 9401) {
    await handleAccessToken();
    // Retry the request
    const orders = await myxClient.order.getOrders(address);
  }
}
```

### Transaction Errors

The SDK provides error formatting utilities:

```typescript
try {
  await myxClient.order.createIncreaseOrder(params, tradingFee);
} catch (error) {
  const errorMessage = myxClient.utils.formatErrorMessage(error);
  console.error('Transaction failed:', errorMessage);
}
```

### Common Error Codes

- `9401`: AccessToken expired
- `9403`: Unauthorized
- `-1`: General error (check message for details)
- `0`: Success

## Best Practices

### 1. Price and Amount Decimals

- **Prices**: Use 30 decimals (e.g., `"3000000000000000000000000000000000"` for $3000)
- **Amounts**: Use token decimals (typically 6 for USDC, 18 for ETH)
- **Slippage**: In basis points (100 = 1%)

```typescript
import { ethers } from 'ethers';

// Convert price to 30 decimals
const price = ethers.parseUnits('3000', 30).toString();

// Convert amount to token decimals
const amount = ethers.parseUnits('100', 6).toString(); // 100 USDC
```

### 2. Check Approval Before Trading

```typescript
const needApproval = await myxClient.utils.needsApproval(
  userAddress,
  chainId,
  quoteTokenAddress,
  collateralAmount,
);

if (needApproval) {
  await myxClient.utils.approveAuthorization({
    chainId,
    quoteAddress: quoteTokenAddress,
    amount: ethers.MaxUint256.toString(),
  });
}
```

### 3. Calculate Trading Fee

```typescript
const feeRate = await myxClient.utils.getUserTradingFeeRate(
  assetClass,
  riskTier,
  chainId,
);

const tradingFee =
  (BigInt(collateralAmount) * BigInt(feeRate.data.takerFeeRate)) / BigInt(1e6);
```

### 4. Monitor WebSocket Connection

```typescript
myxClient.subscription.on('close', () => {
  console.log('WebSocket closed, reconnecting...');
  myxClient.subscription.reconnect();
});

myxClient.subscription.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### 5. Use Seamless Mode for Better UX

Seamless mode allows gasless trading for better user experience:

```typescript
// Create seamless wallet
const result = await myxClient.seamless.createSeamless({
  password: userPassword,
  chainId,
});

// Enable seamless mode
await myxClient.seamless.startSeamlessMode({ open: true });

// Now all transactions will be gasless
```

## Dependencies

```json
{
  "dependencies": {
    "@myx-trade/sdk": "latest",
    "ethers": "^6.x.x",
    "crypto-js": "^4.x.x"
  }
}
```

## Network Configuration

### Environment Configuration Examples

```typescript
// Testnet
const testnetClient = new MyxClient({
  chainId: 421614,
  signer,
  brokerAddress: TESTNET_BROKER_ADDRESS,
  isTestnet: true,
  isBetaMode: false,
});

// Beta
const betaClient = new MyxClient({
  chainId: BETA_CHAIN_ID,
  signer,
  brokerAddress: BETA_BROKER_ADDRESS,
  isTestnet: false,
  isBetaMode: true,
});
```

> **Note**: Contact MYX team for specific chain IDs, broker addresses, and token addresses for each environment.

## Support

For issues, questions, or feature requests, please contact MYX team.
