/**
 * MYX PoC — Edit an existing open order (change price, size, TP/SL)
 *
 * Usage:
 *   npx tsx editOrder.ts --price 50000                   # Edit first order's price
 *   npx tsx editOrder.ts --orderId <id> --price 50000    # Edit specific order
 *   npx tsx editOrder.ts --price-pct 1                   # Bump price by +1%
 *   NETWORK=testnet npx tsx editOrder.ts --price-pct 1
 *
 * This calls the same SDK path as MYXProvider.editOrder / MYXClientService.updateOrderTpSl:
 *   client.order.updateOrderTpSl(params, quoteAddress, chainId, address, marketId)
 *
 * If --orderId is omitted, uses the first open order.
 * Auth required.
 */

import type { ChainId } from '@myx-trade/sdk';
import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  parseArgs,
  toContractPrice,
} from './common';

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));

  const priceArg = args.price ? parseFloat(args.price) : undefined;
  const pricePctArg = args['price-pct'] ? parseFloat(args['price-pct']) : undefined;

  if (!priceArg && pricePctArg === undefined) {
    console.error('Usage: npx tsx editOrder.ts --price <newPrice>');
    console.error('       npx tsx editOrder.ts --price-pct <percent>  # e.g. 1 = +1%');
    console.error('  --orderId    Order to edit (default: first open order)');
    console.error('  --price      New absolute price');
    console.error('  --price-pct  Price change percentage (e.g. 1 = +1%, -5 = -5%)');
    process.exit(1);
  }

  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Account: ${ADDRESS}\n`);

  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // Fetch open orders via getPoolOpenOrders (pending limit/trigger orders)
  const accessToken = await client.getAccessToken();
  const ordersResult = await client.api.getPoolOpenOrders(
    accessToken ?? '',
    ADDRESS,
    config.chainId as ChainId,
  );
  const orders = ordersResult.data ?? [];

  if (orders.length === 0) {
    console.error('No open orders to edit');
    process.exit(1);
  }

  const order = args.orderId
    ? orders.find((o: Record<string, unknown>) => o.orderId === args.orderId)
    : orders[0];

  if (!order) {
    console.error(`Order "${args.orderId}" not found`);
    console.error('Available:', orders.map((o: Record<string, unknown>) => String(o.orderId)).join(', '));
    process.exit(1);
  }

  // Extract order fields — SDK types are loose, use defensive access
  const orderId = String(order.orderId);
  const currentPrice = parseFloat(String(order.price ?? '0'));
  const currentSize = String(order.size ?? '0');
  const poolId = String(order.poolId ?? '');

  console.log(`Order: ${orderId}`);
  console.log(`  Pool: ${poolId}`);
  console.log(`  Current price: $${currentPrice}`);
  console.log(`  Size: ${currentSize}`);

  // Compute new price
  let newPrice: number;
  if (priceArg !== undefined) {
    newPrice = priceArg;
  } else {
    // pricePctArg is defined (checked above)
    newPrice = currentPrice * (1 + pricePctArg! / 100);
  }
  console.log(`  New price: $${newPrice.toFixed(6)}`);

  // Get market detail for marketId
  const detail = await client.markets.getMarketDetail({
    chainId: config.chainId,
    poolId,
  });
  const marketId = detail.marketId;
  console.log(`  MarketId: ${marketId}`);

  // Build update params matching MYXUpdateOrderParams
  const updateParams = {
    orderId,
    size: currentSize,
    price: toContractPrice(newPrice),
    tpSize: '0',
    tpPrice: '0',
    slSize: '0',
    slPrice: '0',
    useOrderCollateral: true,
    executionFeeToken: config.collateralToken,
  };

  console.log('\nUpdating order...');
  const result = await client.order.updateOrderTpSl(
    updateParams,
    config.collateralToken,
    config.chainId,
    ADDRESS,
    marketId,
  );
  console.log('\nResult:', JSON.stringify(result, null, 2));

  client.close();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
