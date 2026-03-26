/**
 * MYX PoC — Add/Remove Margin (Collateral) on an existing position
 *
 * Usage:
 *   yarn tsx addMargin.ts --usd 10                        # Add $10 margin to first position
 *   yarn tsx addMargin.ts --usd -5                        # Remove $5 margin from first position
 *   yarn tsx addMargin.ts --positionId <id> --usd 10      # Add to specific position
 *   NETWORK=testnet yarn tsx addMargin.ts --usd 10
 *
 * This calls the same SDK path as MYXProvider.updateMargin / MYXClientService.adjustCollateral:
 *   client.position.adjustCollateral({ poolId, positionId, adjustAmount, quoteToken, chainId, address })
 *
 * If --positionId is omitted, uses the first open position.
 * Auth required.
 */

import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  parseArgs,
  toCollateral,
} from './common';
import type { PositionData } from './common';

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));

  const usdAmount = args.usd ? parseFloat(args.usd) : undefined;

  if (usdAmount === undefined || usdAmount === 0) {
    console.error('Usage: yarn tsx addMargin.ts --usd <amount>');
    console.error('  --positionId  Position to adjust (default: first open position)');
    console.error('  --usd         Amount in USD to add (positive) or remove (negative)');
    process.exit(1);
  }

  const isAdding = usdAmount > 0;
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Account: ${ADDRESS}`);
  console.log(`Action: ${isAdding ? 'ADD' : 'REMOVE'} $${Math.abs(usdAmount)} margin\n`);

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

  console.log(`Position: ${pos.baseSymbol} ${pos.direction === 0 ? 'LONG' : 'SHORT'}`);
  console.log(`  Size: ${pos.size}`);
  console.log(`  Entry: ${pos.entryPrice}`);
  console.log(`  Leverage: ${pos.userLeverage}x`);

  // Convert USD amount to collateral token native decimals
  const adjustAmount = toCollateral(Math.abs(usdAmount), config.collateralDecimals);
  // Negative means remove margin
  const signedAmount = isAdding ? adjustAmount : `-${adjustAmount}`;

  console.log(`\nAdjust collateral params:`);
  console.log(`  adjustAmount: ${signedAmount} (${config.collateralDecimals} decimals)`);
  console.log(`  quoteToken: ${config.collateralToken}`);

  console.log('\nAdjusting collateral...');
  const result = await client.position.adjustCollateral({
    poolId: pos.poolId,
    positionId: pos.positionId,
    adjustAmount: signedAmount,
    quoteToken: config.collateralToken,
    chainId: config.chainId,
    address: ADDRESS,
  });
  console.log('\nResult:', JSON.stringify(result, null, 2));

  // Show updated position
  const posResult2 = await client.position.listPositions(ADDRESS);
  const updated = (posResult2.data ?? []) as PositionData[];
  const updatedPos = updated.find((p) => p.positionId === pos.positionId);
  if (updatedPos) {
    console.log(`\nUpdated position:`);
    console.log(`  Size: ${updatedPos.size}`);
    console.log(`  Collateral: ${updatedPos.collateralAmount} (was ${pos.collateralAmount})`);
  }

  client.close();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
