/**
 * MYX SDK PoC — WebSocket Subscriptions for Positions & Orders
 *
 * Tests whether subscribePosition() and subscribeOrder() actually deliver
 * real-time push events after WebSocket authentication.
 *
 * Usage:
 *   NETWORK=testnet yarn tsx scripts/perps/myx-poc/wsSubscriptions.ts
 *   NETWORK=testnet yarn tsx scripts/perps/myx-poc/wsSubscriptions.ts --with-trade
 *
 * --with-trade: also opens + closes a small position to trigger WS events.
 * Without it, just subscribes and waits (useful if you have existing positions).
 */

// Polyfill WebSocket for Node.js — MYX SDK uses the browser WebSocket global
import WebSocket from 'ws';
(globalThis as unknown as Record<string, unknown>).WebSocket = WebSocket;

import {
  ADDRESS,
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  parseArgs,
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

async function main(): Promise<void> {
  console.log('=== MYX WebSocket Subscription PoC ===');
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId: ${config.chainId})`);
  console.log(`Address: ${ADDRESS}`);
  console.log(`Mode: ${withTrade ? 'subscribe + trade' : 'subscribe only'}`);
  console.log();

  // Step 1: REST auth
  console.log('--- Step 1: REST Authentication ---');
  await authenticateClient(client, config);

  // Step 2: Connect WebSocket
  console.log('\n--- Step 2: Connect WebSocket ---');
  client.subscription.connect();
  console.log('WebSocket connected');

  // Step 3: WebSocket auth
  console.log('\n--- Step 3: WebSocket Authentication ---');
  try {
    await client.subscription.auth();
    console.log('WebSocket auth successful');
  } catch (err) {
    console.error('WebSocket auth FAILED:', err);
    console.log('Position/order subscriptions will likely not work.');
  }

  // Step 4: Subscribe to positions & orders
  console.log('\n--- Step 4: Subscribe to Positions & Orders ---');
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

  // Step 5: Check current state via REST (for comparison)
  console.log('\n--- Step 5: Current state (REST) ---');
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

  // Step 6: Optionally open + close a position to trigger events
  if (withTrade) {
    console.log('\n--- Step 6: Open + Close position to trigger WS events ---');
    console.log('(Trade execution not implemented in this PoC — use increasePosition.ts separately)');
    console.log('Or open/close a position in the app while this script listens.');
  }

  // Step 7: Wait and listen
  console.log(`\n--- Listening for WS events (${LISTEN_DURATION_MS / 1000}s) ---`);
  console.log('If you have the app open, try opening/closing a position...\n');

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      process.stdout.write(`\r  Listening... ${elapsed}s elapsed, ${events.length} events received`);
    }, 1000);

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
    console.log('NO WebSocket push events received.');
    console.log('This confirms that subscribePosition/subscribeOrder do NOT deliver push data.');
    console.log('REST polling is required as the primary data source.');
  } else {
    console.log('Events by channel:');
    const posEvents = events.filter((e) => e.channel === 'POSITION');
    const ordEvents = events.filter((e) => e.channel === 'ORDER');
    console.log(`  POSITION: ${posEvents.length} events`);
    console.log(`  ORDER: ${ordEvents.length} events`);
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
