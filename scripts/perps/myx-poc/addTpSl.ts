/**
 * MYX PoC — Add TP/SL to an existing position
 *
 * Usage:
 *   yarn tsx addTpSl.ts --tp 2500                          # Take profit at $2500 (full size)
 *   yarn tsx addTpSl.ts --sl 2000                          # Stop loss at $2000 (full size)
 *   yarn tsx addTpSl.ts --tp 2500 --sl 2000                # Both TP and SL
 *   yarn tsx addTpSl.ts --tp 2500 --tp-size 0.01           # TP for partial size
 *   yarn tsx addTpSl.ts --positionId <id> --tp 2500
 *   NETWORK=testnet yarn tsx addTpSl.ts --tp 2500 --sl 2100
 *
 * If --positionId is omitted, uses the first open position.
 * Auth required.
 */

import { TriggerType } from '@myx-trade/sdk';
import type { PositionTpSlOrderParams } from '@myx-trade/sdk';
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

  const tpPrice = args.tp ? parseFloat(args.tp) : undefined;
  const slPrice = args.sl ? parseFloat(args.sl) : undefined;
  const tpSizeArg = args['tp-size'];
  const slSizeArg = args['sl-size'];

  if (!tpPrice && !slPrice) {
    console.error('Usage: yarn tsx addTpSl.ts --tp <price> [--sl <price>]');
    console.error('  --positionId  Position to add TP/SL to (default: first open position)');
    console.error('  --tp          Take profit trigger price');
    console.error('  --sl          Stop loss trigger price');
    console.error('  --tp-size     TP size in base asset (default: full position)');
    console.error('  --sl-size     SL size in base asset (default: full position)');
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
    process.exit(1);
  }

  const isLong = pos.direction === 0;
  console.log(`Position: ${pos.baseSymbol} ${isLong ? 'LONG' : 'SHORT'}`);
  console.log(`  Size: ${pos.size}`);
  console.log(`  Entry: ${pos.entryPrice}`);
  console.log(`  Leverage: ${pos.userLeverage}x`);

  // Get current price for reference
  const tickers = await client.markets.getTickerList({
    chainId: config.chainId,
    poolIds: [pos.poolId],
  });
  const currentPrice = parseFloat(tickers[0]?.price ?? '0');
  console.log(`  Current price: $${currentPrice.toFixed(2)}`);

  // Validate TP/SL prices
  if (tpPrice) {
    if (isLong && tpPrice <= currentPrice) {
      console.warn(`  WARNING: TP $${tpPrice} is below current price $${currentPrice.toFixed(2)} for LONG`);
    }
    if (!isLong && tpPrice >= currentPrice) {
      console.warn(`  WARNING: TP $${tpPrice} is above current price $${currentPrice.toFixed(2)} for SHORT`);
    }
  }
  if (slPrice) {
    if (isLong && slPrice >= currentPrice) {
      console.warn(`  WARNING: SL $${slPrice} is above current price $${currentPrice.toFixed(2)} for LONG`);
    }
    if (!isLong && slPrice <= currentPrice) {
      console.warn(`  WARNING: SL $${slPrice} is below current price $${currentPrice.toFixed(2)} for SHORT`);
    }
  }

  // Build TP/SL params
  // TP trigger: for LONG, trigger when price >= tp (GTE=1), for SHORT, when price <= tp (LTE=2)
  // SL trigger: for LONG, trigger when price <= sl (LTE=2), for SHORT, when price >= sl (GTE=1)
  const tpTriggerType = isLong ? TriggerType.GTE : TriggerType.LTE;
  const slTriggerType = isLong ? TriggerType.LTE : TriggerType.GTE;

  // Default to full position size for TP/SL
  const tpSizeStr = tpPrice
    ? toSize(tpSizeArg || pos.size)
    : '0';
  const slSizeStr = slPrice
    ? toSize(slSizeArg || pos.size)
    : '0';
  const tpPriceStr = tpPrice ? toContractPrice(tpPrice) : '0';
  const slPriceStr = slPrice ? toContractPrice(slPrice) : '0';

  const sdkParams: PositionTpSlOrderParams = {
    chainId: config.chainId,
    address: ADDRESS,
    poolId: pos.poolId,
    positionId: pos.positionId,
    executionFeeToken: config.collateralToken,
    tpTriggerType: tpPrice ? tpTriggerType : TriggerType.NONE,
    slTriggerType: slPrice ? slTriggerType : TriggerType.NONE,
    direction: pos.direction,
    leverage: pos.userLeverage,
    tpSize: tpSizeStr,
    tpPrice: tpPriceStr,
    slSize: slSizeStr,
    slPrice: slPriceStr,
    slippagePct: '300', // 3% slippage for TP/SL execution
  };

  console.log('\nTP/SL params:');
  if (tpPrice) {
    console.log(`  TP: $${tpPrice} | size: ${tpSizeArg || pos.size} | trigger: ${tpTriggerType === 1 ? 'GTE' : 'LTE'}`);
  }
  if (slPrice) {
    console.log(`  SL: $${slPrice} | size: ${slSizeArg || pos.size} | trigger: ${slTriggerType === 1 ? 'GTE' : 'LTE'}`);
  }

  console.log('\nCreating TP/SL order...');
  const result = await client.order.createPositionTpSlOrder(sdkParams);
  console.log('\nResult:', JSON.stringify(result, null, 2));

  client.close();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
