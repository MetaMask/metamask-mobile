/**
 * MYX SDK PoC — WebSocket Subscriptions for Positions & Orders
 *
 * Tests whether subscribePosition() and subscribeOrder() actually deliver
 * real-time push events after WebSocket authentication.
 *
 * Usage:
 *   NETWORK=testnet-arb npx tsx scripts/perps/myx-poc/wsSubscriptions.ts
 *   NETWORK=testnet-arb npx tsx scripts/perps/myx-poc/wsSubscriptions.ts --with-trade
 *
 * --with-trade: places a small market order to trigger WS events.
 * Without it, just subscribes and waits (useful if you have existing positions).
 */

// Polyfill WebSocket for Node.js — MYX SDK uses the browser WebSocket global
import WebSocket from 'ws';
(globalThis as unknown as Record<string, unknown>).WebSocket = WebSocket;

import type { PlaceOrderParams } from '@myx-trade/sdk';
import {
  ADDRESS,
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  parseArgs,
  toContractPrice,
  toSize,
  toCollateral,
  MYX_RATE_PRECISION,
  MYX_DEFAULT_TAKER_FEE_RATE,
} from './common';

const config = getNetworkConfig();
const client = createMyxClient(config);
const args = parseArgs(process.argv.slice(2));
const withTrade = args['with-trade'] === 'true';

const LISTEN_DURATION_MS = withTrade ? 120_000 : 60_000;

interface WsEvent {
  channel: string;
  timestamp: number;
  elapsed: string;
  dataType: string;
  isArray: boolean;
  length: number;
  sample: string;
}

const events: WsEvent[] = [];
let startTime = 0;

function logEvent(channel: string, data: unknown): void {
  const now = Date.now();
  const elapsed = `${((now - startTime) / 1000).toFixed(1)}s`;
  const isArray = Array.isArray(data);
  const sample = JSON.stringify(data).slice(0, 300);

  const event: WsEvent = {
    channel,
    timestamp: now,
    elapsed,
    dataType: typeof data,
    isArray,
    length: isArray ? data.length : -1,
    sample,
  };
  events.push(event);
  console.log(`\n[${elapsed}] WS ${channel} event:`);
  console.log(`  isArray: ${isArray}, length: ${isArray ? data.length : 'N/A'}`);
  console.log(`  sample: ${sample}`);
}

async function placeTrade(): Promise<void> {
  console.log('\n--- Placing a small market order to trigger WS events ---');

  // Find a pool on testnet
  const pools = await client.markets.getPoolSymbolAll();
  if (pools.length === 0) {
    console.log('No pools available on this network');
    return;
  }

  // Prefer ARB or first available
  const pool = pools.find((p) => p.baseSymbol.toUpperCase().includes('ARB')) || pools[0];
  const poolId = pool.poolId;
  const poolChainId = pool.chainId ?? config.chainId;
  console.log(`Using pool: ${pool.baseSymbol} (poolId=${poolId}, chainId=${poolChainId})`);

  // Get market detail
  const detail = await client.markets.getMarketDetail({ chainId: poolChainId, poolId });
  const marketId = detail.marketId;

  // Get current price
  const tickers = await client.markets.getTickerList({ chainId: poolChainId, poolIds: [poolId] });
  const tickerPrice = parseFloat(tickers[0]?.price ?? '0');
  if (!tickerPrice) {
    console.log('Could not fetch market price');
    return;
  }

  const slippage = 1.05; // LONG
  const orderPrice = tickerPrice * slippage;
  const usdAmount = 12; // small testnet order
  const computedSize = usdAmount / tickerPrice;
  const leverage = 2;

  // Get fee rate
  let takerFeeRate: bigint;
  try {
    const feeResult = await client.utils.getUserTradingFeeRate(0, 0, poolChainId);
    if (feeResult.code !== 0) throw new Error(`code=${feeResult.code}`);
    takerFeeRate = BigInt(feeResult.data?.takerFeeRate || String(MYX_DEFAULT_TAKER_FEE_RATE));
  } catch {
    takerFeeRate = MYX_DEFAULT_TAKER_FEE_RATE;
  }

  const collateralAmount = toCollateral(usdAmount, config.collateralDecimals);
  const tradingFee = (
    (BigInt(collateralAmount) * takerFeeRate) / MYX_RATE_PRECISION
  ).toString();

  const sdkParams: PlaceOrderParams = {
    chainId: poolChainId,
    address: ADDRESS,
    poolId,
    positionId: '',
    orderType: 0, // MARKET
    triggerType: 0,
    direction: 0, // LONG
    collateralAmount,
    size: toSize(computedSize),
    price: toContractPrice(orderPrice),
    timeInForce: 0,
    postOnly: false,
    slippagePct: '100',
    executionFeeToken: config.collateralToken,
    leverage,
    tpSize: '0',
    tpPrice: '0',
    slSize: '0',
    slPrice: '0',
  };

  console.log(`Placing LONG ${pool.baseSymbol}: $${usdAmount} @ $${orderPrice.toFixed(2)} (${leverage}x)`);

  try {
    const result = await client.order.createIncreaseOrder(sdkParams, tradingFee, marketId);
    console.log('Order result:', JSON.stringify(result, null, 2));
    console.log('Order placed — watching for WS events...\n');
  } catch (err) {
    console.log('Order failed:', err);
  }
}

async function main(): Promise<void> {
  console.log('=== MYX WebSocket Subscription PoC ===');
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId: ${config.chainId})`);
  console.log(`Address: ${ADDRESS}`);
  console.log(`Mode: ${withTrade ? 'subscribe + trade' : 'subscribe only'}`);
  console.log();

  // Step 1: Client auth (matches MYX example: await client.auth({ walletClient }))
  console.log('--- Step 1: Client Authentication ---');
  await authenticateClient(client, config);

  // Step 2: Connect WebSocket with event listeners for diagnostics
  console.log('\n--- Step 2: Connect WebSocket ---');

  // Add WS-level event listeners BEFORE connect
  client.subscription.on('open', () => {
    console.log('[WS-EVENT] open — WebSocket connection established');
  });
  client.subscription.on('close', (ev: unknown) => {
    console.log('[WS-EVENT] close —', JSON.stringify(ev));
  });
  client.subscription.on('error', (err: unknown) => {
    console.log('[WS-EVENT] error —', err);
  });
  client.subscription.on('message', (msg: unknown) => {
    const msgStr = typeof msg === 'object' && msg !== null && 'data' in msg
      ? String((msg as { data: unknown }).data).slice(0, 200)
      : JSON.stringify(msg).slice(0, 200);
    console.log(`[WS-EVENT] message — ${msgStr}`);
  });
  client.subscription.on('reconnecting', (detail: unknown) => {
    console.log('[WS-EVENT] reconnecting —', detail);
  });

  if (!client.subscription.isConnected) {
    client.subscription.connect();
  }
  console.log(`isConnected after connect(): ${client.subscription.isConnected}`);

  // Wait for WS to establish
  await new Promise((r) => setTimeout(r, 2000));
  console.log(`isConnected after 2s: ${client.subscription.isConnected}`);

  // Step 3: Explicit WS auth (SDK docs: "ensure auth is called before subscribePosition/Order")
  console.log('\n--- Step 3: WebSocket Authentication ---');
  try {
    await client.subscription.auth();
    console.log('subscription.auth() completed');
  } catch (err) {
    console.error('subscription.auth() FAILED:', err);
  }

  // Step 4: Subscribe to ticker (public, no auth) as control group
  console.log('\n--- Step 4: Subscribe to Ticker (control group, no auth needed) ---');
  const tickerCallback = (data: unknown) => logEvent('TICKER', data);
  try {
    // subscribeTickers takes numeric globalId
    client.subscription.subscribeTickers(1, tickerCallback);
    console.log('subscribeTickers(globalId=1): registered');
  } catch (err) {
    console.error('subscribeTickers FAILED:', err);
  }

  // Step 5: Subscribe to positions & orders (private, requires auth)
  console.log('\n--- Step 5: Subscribe to Positions & Orders ---');
  startTime = Date.now();

  const posCallback = (data: unknown) => logEvent('POSITION', data);
  const orderCallback = (data: unknown) => logEvent('ORDER', data);

  try {
    await client.subscription.subscribePosition(posCallback);
    console.log('subscribePosition: registered');
  } catch (err) {
    console.error('subscribePosition FAILED:', err);
  }

  try {
    await client.subscription.subscribeOrder(orderCallback);
    console.log('subscribeOrder: registered');
  } catch (err) {
    console.error('subscribeOrder FAILED:', err);
  }

  // Step 6: Check current state via REST (for comparison)
  console.log('\n--- Step 6: Current state (REST) ---');
  try {
    const posResult = await client.position.listPositions(ADDRESS);
    const positions = (posResult as { data?: unknown[] }).data ?? [];
    console.log(`Positions: ${positions.length}`);
  } catch (err) {
    console.log(`Positions fetch error: ${err}`);
  }

  try {
    const ordResult = await client.order.getOrders(ADDRESS);
    const orders = (ordResult as { data?: unknown[] }).data ?? [];
    console.log(`Open orders: ${orders.length}`);
  } catch (err) {
    console.log(`Orders fetch error: ${err}`);
  }

  // Step 7: Place a trade to trigger events
  if (withTrade) {
    await placeTrade();
  }

  // Step 8: Wait and listen
  console.log(`\n--- Listening for WS events (${LISTEN_DURATION_MS / 1000}s) ---`);
  console.log('If you have the app open, try opening/closing a position...\n');

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      process.stdout.write(`\r  Listening... ${elapsed}s elapsed, ${events.length} events received`);
    }, 5000);

    setTimeout(() => {
      clearInterval(interval);
      console.log('\n');
      resolve();
    }, LISTEN_DURATION_MS);
  });

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total WS events received: ${events.length}`);
  if (events.length === 0) {
    console.log('NO WebSocket push events received (including ticker control group).');
    console.log('This suggests a connection or fundamental WS issue, not just auth.');
  } else {
    console.log('Events by channel:');
    const tickerEvents = events.filter((e) => e.channel === 'TICKER');
    const posEvents = events.filter((e) => e.channel === 'POSITION');
    const ordEvents = events.filter((e) => e.channel === 'ORDER');
    console.log(`  TICKER (control): ${tickerEvents.length} events`);
    console.log(`  POSITION: ${posEvents.length} events`);
    console.log(`  ORDER: ${ordEvents.length} events`);

    if (tickerEvents.length > 0 && posEvents.length === 0 && ordEvents.length === 0) {
      console.log('\n  DIAGNOSIS: Ticker (public) works but position/order (private) do not.');
      console.log('  This confirms WS auth is failing for private subscriptions.');
    }

    for (const event of events) {
      console.log(`  [${event.elapsed}] ${event.channel}: isArray=${event.isArray} len=${event.length}`);
    }
  }

  // Cleanup
  client.subscription.unsubscribePosition(posCallback);
  client.subscription.unsubscribeOrder(orderCallback);
  client.subscription.disconnect();
  console.log('\nDone.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
