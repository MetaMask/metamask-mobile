/**
 * MYX PoC — Check per-pool minimum order size
 *
 * Validates that each pool returns a minOrderSizeInUsd from getPoolLevelConfig.
 *
 * Usage: yarn tsx scripts/perps/myx-poc/checkPoolMinOrder.ts
 */

import { getNetworkConfig, createMyxClient, authenticateClient, printTable } from './common';

async function main() {
  const config = getNetworkConfig();
  const client = createMyxClient(config);
  await authenticateClient(client, config);

  console.log('\n--- Fetching pools ---');
  const pools = await client.markets.getPoolSymbolAll();
  console.log(`Found ${pools.length} pools\n`);

  const rows: Record<string, string | number>[] = [];

  for (const pool of pools) {
    const symbol = pool.baseSymbol || pool.poolId.slice(0, 10);
    try {
      const poolConfig = await client.markets.getPoolLevelConfig(pool.poolId, config.chainId);
      rows.push({
        symbol,
        poolId: pool.poolId.slice(0, 16) + '...',
        minOrderSizeInUsd: poolConfig?.levelConfig?.minOrderSizeInUsd ?? 'N/A',
        level: poolConfig?.level ?? 'N/A',
        levelName: poolConfig?.levelName ?? 'N/A',
      });
    } catch (err) {
      rows.push({
        symbol,
        poolId: pool.poolId.slice(0, 16) + '...',
        minOrderSizeInUsd: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
        level: '-',
        levelName: '-',
      });
    }
  }

  console.log('--- Per-pool minimum order sizes ---');
  printTable(rows, ['symbol', 'poolId', 'minOrderSizeInUsd', 'level', 'levelName']);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
