/**
 * MYX PoC — List Markets
 *
 * Usage: yarn tsx listMarkets.ts
 *        NETWORK=testnet yarn tsx listMarkets.ts
 *
 * No auth required.
 */

import { getNetworkConfig, createMyxClient, printTable } from './common';
import type { PoolSymbolAllResponse, TickerDataItem } from './common';

async function main() {
  const config = getNetworkConfig();
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);

  const client = createMyxClient(config);

  // Fetch all pools
  const pools: PoolSymbolAllResponse[] = await client.markets.getPoolSymbolAll();
  console.log(`\nFound ${pools.length} markets\n`);

  if (pools.length === 0) return;

  // Fetch tickers for all pools
  const poolIds = pools.map((p) => p.poolId);
  const tickers: TickerDataItem[] = await client.markets.getTickerList({
    chainId: config.chainId,
    poolIds,
  });

  // Build ticker lookup
  const tickerMap = new Map<string, TickerDataItem>();
  for (const t of tickers) {
    tickerMap.set(t.poolId, t);
  }

  // Print table
  const rows = pools.map((p) => {
    const t = tickerMap.get(p.poolId);
    return {
      symbol: p.baseSymbol || '?',
      poolId: p.poolId.slice(0, 10) + '...',
      chainId: p.chainId ?? config.chainId,
      price: t?.price ? parseFloat(t.price).toFixed(2) : '-',
      '24h%': t?.change ? `${parseFloat(t.change).toFixed(2)}%` : '-',
      volume: t?.volume
        ? `$${(parseFloat(t.volume) / 1e6).toFixed(2)}M`
        : '-',
    };
  });

  printTable(rows, ['symbol', 'poolId', 'chainId', 'price', '24h%', 'volume']);

  client.close();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
