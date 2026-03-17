/**
 * MYX PoC — List Orders
 *
 * Usage: npx tsx listOrders.ts
 *        NETWORK=testnet npx tsx listOrders.ts
 *
 * Auth required.
 */

import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  printTable,
} from './common';
import type { HistoryOrderItem } from './common';

async function main() {
  const config = getNetworkConfig();
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Account: ${ADDRESS}\n`);

  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // Open orders — SDK types this as PositionType[] which is incorrect,
  // but the runtime data has order-like fields (orderId, orderType, etc.)
  const ordersResult = await client.order.getOrders(ADDRESS);
  const orders = ordersResult.data ?? [];

  if (orders.length > 0) {
    console.log(`\nOpen orders: ${orders.length}\n`);
    const rows = orders.map((o) => ({
      orderId: String(o.positionId || '').slice(0, 12) + '...',
      symbol: o.poolId.slice(0, 12),
      side: o.direction === 0 ? 'LONG' : 'SHORT',
      size: o.size ?? '-',
    }));
    printTable(rows, ['orderId', 'symbol', 'side', 'size']);
  } else {
    console.log('No open orders');
  }

  // Order history — properly typed as HistoryOrderItem[]
  console.log('\n--- Recent Order History ---\n');
  const historyResult = await client.order.getOrderHistory(
    { chainId: config.chainId, limit: 20 },
    ADDRESS,
  );
  const history: HistoryOrderItem[] = historyResult.data ?? [];

  if (history.length > 0) {
    const rows = history.map((o) => ({
      orderId: String(o.orderId).slice(0, 12) + '...',
      symbol: o.baseSymbol || o.poolId.slice(0, 12),
      side: o.direction === 0 ? 'LONG' : 'SHORT',
      type: o.orderType === 0 ? 'MARKET' : o.orderType === 1 ? 'LIMIT' : String(o.orderType),
      size: o.size ?? '-',
      price: o.price ?? '-',
      status: o.orderStatus === 9 ? 'FILLED' : o.orderStatus === 1 ? 'REJECTED' : String(o.orderStatus),
      cancel: o.cancelReason || '',
    }));
    printTable(rows, ['orderId', 'symbol', 'side', 'type', 'size', 'price', 'status', 'cancel']);
  } else {
    console.log('No order history');
  }

  client.close();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
