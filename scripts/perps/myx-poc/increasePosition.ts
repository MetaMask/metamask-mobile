/**
 * MYX PoC — Increase (add to) an existing position
 *
 * Usage:
 *   npx tsx increasePosition.ts --positionId <id> --usd 50
 *   npx tsx increasePosition.ts --positionId <id> --size 0.05
 *   NETWORK=testnet npx tsx increasePosition.ts --positionId <id> --usd 120
 *
 * If --positionId is omitted, uses the first open position.
 * Auth required.
 */

import type { PlaceOrderParams } from '@myx-trade/sdk';
import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  parseArgs,
  toContractPrice,
  toSize,
  toCollateral,
  MYX_RATE_PRECISION,
} from './common';
import type { PositionData } from './common';

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));

  const usdAmount = args.usd ? parseFloat(args.usd) : undefined;
  const sizeArg = args.size ? parseFloat(args.size) : undefined;
  const leverage = args.leverage ? parseInt(args.leverage, 10) : undefined; // inherit from position if not specified

  if (!usdAmount && !sizeArg) {
    console.error('Usage: npx tsx increasePosition.ts --positionId <id> --usd 50');
    console.error('       npx tsx increasePosition.ts --positionId <id> --size 0.05');
    console.error('  --positionId  Position to increase (default: first open position)');
    console.error('  --usd         USD collateral to add');
    console.error('  --size        Size in base asset to add');
    console.error('  --leverage    Override leverage (default: inherit from position)');
    process.exit(1);
  }

  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Account: ${ADDRESS}\n`);

  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // Find position
  const posResult = await client.position.listPositions(ADDRESS);
  const positions = (posResult.data ?? []) as PositionData[];

  if (positions.length === 0) {
    console.error('No open positions');
    process.exit(1);
  }

  const pos = args.positionId
    ? positions.find((p) => p.positionId === args.positionId)
    : positions[0];

  if (!pos) {
    console.error(`Position "${args.positionId}" not found`);
    console.error('Available:', positions.map((p) => `${p.baseSymbol}: ${p.positionId}`).join('\n  '));
    process.exit(1);
  }

  const posLeverage = leverage ?? pos.userLeverage;
  console.log(`Position: ${pos.baseSymbol} ${pos.direction === 0 ? 'LONG' : 'SHORT'}`);
  console.log(`  Current size: ${pos.size}`);
  console.log(`  Entry price: ${pos.entryPrice}`);
  console.log(`  Leverage: ${posLeverage}x`);

  // Get market detail for marketId and current price
  const detail = await client.markets.getMarketDetail({
    chainId: config.chainId,
    poolId: pos.poolId,
  });

  const tickers = await client.markets.getTickerList({
    chainId: config.chainId,
    poolIds: [pos.poolId],
  });
  const tickerPrice = parseFloat(tickers[0]?.price ?? '0');
  if (!tickerPrice) {
    console.error('Could not fetch market price');
    process.exit(1);
  }

  // Slippage for market order: LONG buys higher, SHORT sells lower
  const slippage = pos.direction === 0 ? 1.05 : 0.95;
  const orderPrice = tickerPrice * slippage;
  console.log(`  Market price: $${tickerPrice.toFixed(2)} (order at $${orderPrice.toFixed(2)})`);

  // Compute size and collateral
  let computedUsd = usdAmount;
  let computedSize: number;

  if (sizeArg) {
    computedSize = sizeArg;
    if (!computedUsd) {
      computedUsd = sizeArg * tickerPrice;
    }
  } else if (computedUsd) {
    computedSize = computedUsd / tickerPrice;
  } else {
    process.exit(1); // unreachable, checked above
    return;
  }

  // Get fee rate
  const feeResult = await client.utils.getUserTradingFeeRate(0, 0, config.chainId);
  if (feeResult.code !== 0) throw new Error(`Fee rate API error: ${feeResult.message}`);
  const takerFeeRate = BigInt(feeResult.data?.takerFeeRate || '1000');

  const collateralAmount = toCollateral(computedUsd, config.collateralDecimals);
  const tradingFee = (
    (BigInt(collateralAmount) * takerFeeRate) / MYX_RATE_PRECISION
  ).toString();

  const sdkParams: PlaceOrderParams = {
    chainId: config.chainId,
    address: ADDRESS,
    poolId: pos.poolId,
    positionId: pos.positionId, // existing position
    orderType: 0, // MARKET
    triggerType: 0,
    direction: pos.direction,
    collateralAmount,
    size: toSize(computedSize),
    price: toContractPrice(orderPrice),
    timeInForce: 0,
    postOnly: false,
    slippagePct: '100',
    executionFeeToken: config.collateralToken,
    leverage: posLeverage,
    tpSize: '0',
    tpPrice: '0',
    slSize: '0',
    slPrice: '0',
  };

  console.log(`\nIncreasing position by ${computedSize.toFixed(6)} ${pos.baseSymbol} ($${computedUsd.toFixed(2)})`);
  console.log(`  Collateral: ${collateralAmount} (${config.collateralDecimals} dec)`);
  console.log(`  Trading fee: ${tradingFee}`);

  const result = await client.order.createIncreaseOrder(sdkParams, tradingFee, detail.marketId);
  console.log('\nResult:', JSON.stringify(result, null, 2));

  // Show updated position
  const posResult2 = await client.position.listPositions(ADDRESS);
  const updated = (posResult2.data ?? []) as PositionData[];
  const updatedPos = updated.find((p) => p.positionId === pos.positionId);
  if (updatedPos) {
    console.log(`\nUpdated position:`);
    console.log(`  Size: ${updatedPos.size} (was ${pos.size})`);
    console.log(`  Entry: ${updatedPos.entryPrice}`);
  }

  client.close();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
