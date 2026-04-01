/**
 * MYX PoC — Close Position / Cancel Order
 *
 * Usage:
 *   yarn tsx closeOrder.ts --cancel <orderId>
 *   yarn tsx closeOrder.ts --close <positionId> [--price 65000]
 *   NETWORK=testnet yarn tsx closeOrder.ts --cancel <orderId>
 *
 * Auth required.
 */

import { ChainId } from '@myx-trade/sdk';
import type { PlaceOrderParams } from '@myx-trade/sdk';
import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  parseArgs,
  toContractPrice,
  toSize,
} from './common';
import type { PositionData } from './common';

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));

  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Account: ${ADDRESS}\n`);

  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // Cancel an open order
  if (args.cancel) {
    console.log(`Cancelling order: ${args.cancel}`);
    const result = await client.order.cancelOrder(args.cancel, config.chainId as ChainId);
    console.log('Result:', JSON.stringify(result, null, 2));
    client.close();
    return;
  }

  // Close a position
  if (args.close) {
    const positionId = args.close;
    const closePrice = args.price ? parseFloat(args.price) : undefined;

    console.log(`Closing position: ${positionId}`);

    // Fetch position details
    const posResult = await client.position.listPositions(ADDRESS);
    const positions = (posResult.data ?? []) as PositionData[];
    const position = positions.find((p) => p.positionId === positionId);

    if (!position) {
      console.error(`Position "${positionId}" not found`);
      const ids = positions.map((p) => p.positionId).join(', ') || '(none)';
      console.error(`Available positions: ${ids}`);
      process.exit(1);
    }

    // Determine close price
    let price: number;
    if (closePrice) {
      price = closePrice;
    } else {
      // Use market price with slippage
      const tickers = await client.markets.getTickerList({
        chainId: config.chainId,
        poolIds: [position.poolId],
      });
      const tickerPrice = parseFloat(tickers[0]?.price ?? '0');
      if (!tickerPrice) {
        console.error('Could not fetch market price. Provide --price manually.');
        process.exit(1);
      }
      // Reverse slippage: closing a LONG sells (want lower accepted price),
      // closing a SHORT buys (want higher accepted price)
      const slippage = position.direction === 0 ? 0.95 : 1.05;
      price = tickerPrice * slippage;
      console.log(`Market price: $${tickerPrice.toFixed(2)} (close at $${price.toFixed(2)})`);
    }

    const sdkParams: PlaceOrderParams = {
      chainId: config.chainId,
      address: ADDRESS,
      poolId: position.poolId,
      positionId,
      orderType: 0, // MARKET
      triggerType: 0, // NONE
      direction: position.direction,
      collateralAmount: '0',
      size: toSize(position.size), // Scale to 18-decimal integer string
      price: toContractPrice(price),
      timeInForce: 0,
      postOnly: false,
      slippagePct: '100',
      executionFeeToken: config.collateralToken,
      leverage: position.userLeverage,
      tpSize: '0',
      tpPrice: '0',
      slSize: '0',
      slPrice: '0',
    };

    console.log(`\nClosing ${position.direction === 0 ? 'LONG' : 'SHORT'} position`);
    console.log(`  Size: ${position.size}`);
    console.log(`  Entry: ${position.entryPrice}`);

    const result = await client.order.createDecreaseOrder(sdkParams);
    console.log('\nResult:', JSON.stringify(result, null, 2));

    client.close();
    return;
  }

  console.error('Usage:');
  console.error('  yarn tsx closeOrder.ts --cancel <orderId>');
  console.error('  yarn tsx closeOrder.ts --close <positionId> [--price 65000]');
  process.exit(1);
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
