/**
 * MYX PoC — Edit an existing open order (change price)
 *
 * Usage:
 *   yarn tsx editOrder.ts --price 50000                   # Edit first order's price
 *   yarn tsx editOrder.ts --orderId <id> --price 50000    # Edit specific order
 *   yarn tsx editOrder.ts --price-pct 1                   # Bump price by +1% (uses triggerPrice)
 *   NETWORK=testnet yarn tsx editOrder.ts --price-pct 1
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
  MYX_PRICE_DECIMALS,
} from './common';

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));

  const priceArg = args.price ? parseFloat(args.price) : undefined;
  const pricePctArg = args['price-pct'] ? parseFloat(args['price-pct']) : undefined;

  if (priceArg === undefined && pricePctArg === undefined) {
    console.error('Usage: yarn tsx editOrder.ts --price <newPrice>');
    console.error('       yarn tsx editOrder.ts --price-pct <percent>  # e.g. 1 = +1%');
    console.error('  --orderId    Order to edit (default: first open order)');
    console.error('  --price      New absolute price');
    console.error('  --price-pct  Price change percentage relative to triggerPrice');
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
    ? orders.find((o) => String(o.orderId) === args.orderId)
    : orders[0];

  if (!order) {
    console.error(`Order "${args.orderId}" not found`);
    console.error('Available:', orders.map((o) => String(o.orderId)).join(', '));
    process.exit(1);
  }

  const orderId = String(order.orderId);
  const poolId = order.poolId;

  // triggerPrice is in 30-decimal format — convert to human-readable for display/pct calc
  const triggerPriceRaw = BigInt(order.triggerPrice ?? '0');
  const currentPriceHuman = Number(triggerPriceRaw) / 10 ** MYX_PRICE_DECIMALS;

  console.log(`Order: ${orderId}`);
  console.log(`  Pool: ${poolId}`);
  console.log(`  Trigger price (raw): ${order.triggerPrice}`);
  console.log(`  Trigger price (human): $${currentPriceHuman.toFixed(4)}`);
  console.log(`  Amount: ${order.amount}`);

  // Compute new price
  let newPrice: number;
  if (priceArg !== undefined) {
    newPrice = priceArg;
  } else {
    newPrice = currentPriceHuman * (1 + pricePctArg! / 100);
  }
  console.log(`  New price: $${newPrice.toFixed(4)}`);

  // Get market detail for marketId
  const detail = await client.markets.getMarketDetail({
    chainId: config.chainId,
    poolId,
  });
  const marketId = detail.marketId;
  console.log(`  MarketId: ${marketId}`);

  // Build update params — size is set to '0' since we're only changing price
  const updateParams = {
    orderId,
    size: '0',
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
