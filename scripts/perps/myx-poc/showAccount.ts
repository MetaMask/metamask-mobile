/**
 * MYX PoC — Show Account
 *
 * Displays per-pool account breakdown matching MYX UI:
 *   Available Margin, Free Margin, Wallet Balance,
 *   Locked Realized PnL, Unrealized PnL
 *
 * Usage: npx tsx showAccount.ts
 *        NETWORK=testnet npx tsx showAccount.ts
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
import type { PositionData, PoolSymbolAllResponse, TickerDataItem } from './common';
import { formatUsd, formatPrice, printLabeledRows } from './format';

/**
 * getAccountInfo returns a 7-element tuple from the on-chain Account contract:
 *   [0] freeAmount        — available margin (can open new positions)
 *   [1] walletBalance     — quote token in wallet
 *   [2] reservedAmount    — margin locked in open positions
 *   [3] orderHoldInUSD    — margin reserved for pending orders
 *   [4] totalCollateral   — total collateral across positions
 *   [5] lockedRealizedPnl — realized PnL not yet settled
 *   [6] unrealizedPnl     — mark-to-market PnL on open positions
 */
interface AccountTuple {
  freeAmount: string;
  walletBalance: string;
  reservedAmount: string;
  orderHoldInUSD: string;
  totalCollateral: string;
  lockedRealizedPnl: string;
  unrealizedPnl: string;
}

function parseAccountTuple(data: string[]): AccountTuple {
  const s = (v: string | undefined) => String(v ?? '0');
  return {
    freeAmount: s(data[0]),
    walletBalance: s(data[1]),
    reservedAmount: s(data[2]),
    orderHoldInUSD: s(data[3]),
    totalCollateral: s(data[4]),
    lockedRealizedPnl: s(data[5]),
    unrealizedPnl: s(data[6]),
  };
}

async function main() {
  const config = getNetworkConfig();
  const dec = config.collateralDecimals;
  const sym = config.collateralSymbol;

  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Account: ${ADDRESS}\n`);

  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // Get all pools and tickers (to identify active pools)
  const pools: PoolSymbolAllResponse[] = await client.markets.getPoolSymbolAll();
  const chainPools = pools.filter((p) => (p.chainId ?? config.chainId) === config.chainId);
  const poolIds = chainPools.map((p) => p.poolId);
  const tickers: TickerDataItem[] = await client.markets.getTickerList({ chainId: config.chainId, poolIds });
  const activePoolIds = new Set(
    tickers.filter((t) => t.price && parseFloat(t.price) > 0).map((t) => t.poolId),
  );

  // Global balances — fetch from any active pool (values are the same across all pools)
  const firstPool = chainPools.find((p) => activePoolIds.has(p.poolId)) || chainPools[0];
  const globalInfo = await client.account.getAccountInfo(config.chainId, ADDRESS, firstPool.poolId);
  if (globalInfo.code !== 0) throw new Error(`Account info error: code=${globalInfo.code}`);
  // getAccountInfo returns { data: any } — SDK does not type the tuple
  const globalAcct = parseAccountTuple(globalInfo.data as unknown as string[]);
  const walletBalanceRaw = globalAcct.walletBalance;
  const freeMarginRaw = globalAcct.freeAmount;
  const availableMarginRaw = (BigInt(freeMarginRaw) + BigInt(walletBalanceRaw)).toString();

  console.log(`\n=== Account Summary ===`);
  printLabeledRows([
    { label: 'Available Margin', value: formatUsd(availableMarginRaw, dec, sym) },
    { label: 'Wallet Balance', value: formatUsd(walletBalanceRaw, dec, sym) },
    { label: 'Free Margin (deposited)', value: formatUsd(freeMarginRaw, dec, sym) },
  ]);
  console.log();

  // Per-pool breakdown — only show pools with non-zero position activity
  const showAll = process.argv.includes('--all');
  const displayPools = showAll ? chainPools : chainPools.filter((p) => activePoolIds.has(p.poolId));

  let poolsWithActivity = 0;
  for (const pool of displayPools) {
    const name = pool.baseSymbol || pool.poolId.slice(0, 10);
    try {
      const info = await client.account.getAccountInfo(config.chainId, ADDRESS, pool.poolId);
      if (info.code !== 0 || !info.data || !Array.isArray(info.data)) continue;

      const acct = parseAccountTuple(info.data as string[]);

      // Only show per-pool detail when there's position/order activity
      const hasActivity =
        acct.reservedAmount !== '0' ||
        acct.orderHoldInUSD !== '0' ||
        acct.totalCollateral !== '0' ||
        acct.lockedRealizedPnl !== '0' ||
        acct.unrealizedPnl !== '0';

      if (!hasActivity && !showAll) continue;
      poolsWithActivity++;

      const poolAvailMargin = (BigInt(acct.freeAmount) + BigInt(acct.walletBalance)).toString();

      console.log(`--- ${name}/${sym} Margin ---`);
      printLabeledRows([
        { label: 'Available Margin', value: formatUsd(poolAvailMargin, dec, sym) },
        { label: 'Free Margin', value: formatUsd(acct.freeAmount, dec, sym) },
        { label: 'Wallet Balance', value: formatUsd(acct.walletBalance, dec, sym) },
        { label: 'Locked Realized PnL', value: formatUsd(acct.lockedRealizedPnl, dec, sym) },
        { label: 'Unrealized PnL', value: formatUsd(acct.unrealizedPnl, dec, sym) },
      ]);
      console.log();
    } catch {
      // Skip pools that fail (inactive/broken)
    }
  }
  if (poolsWithActivity === 0 && !showAll) {
    console.log('No pools with active positions/orders (use --all to show all pools)\n');
  }

  // Positions
  console.log(`=== Open Positions ===\n`);
  const posResult = await client.position.listPositions(ADDRESS);
  const positions = (posResult.data ?? []) as PositionData[];

  if (positions.length > 0) {
    // Fetch current prices for PnL calculation
    const posPoolIds = [...new Set(positions.map((p) => p.poolId))];
    const posTickers = await client.markets.getTickerList({ chainId: config.chainId, poolIds: posPoolIds });
    const priceByPool: Record<string, number> = {};
    for (const t of posTickers) {
      if (t.poolId && t.price) priceByPool[t.poolId] = parseFloat(t.price);
    }

    console.log(`${positions.length} position(s)\n`);
    const rows = positions.map((p) => {
      const currentPrice = priceByPool[p.poolId];
      const size = parseFloat(p.size || '0');
      const entry = parseFloat(p.entryPrice || '0');

      // Unrealized PnL = (currentPrice - entryPrice) * size * direction
      let pnl = '-';
      if (currentPrice && entry && size) {
        const dir = p.direction === 0 ? 1 : -1;
        const pnlVal = (currentPrice - entry) * size * dir;
        pnl = `${pnlVal >= 0 ? '+' : ''}${pnlVal.toFixed(4)}`;
      }

      return {
        positionId: p.positionId,
        symbol: p.baseSymbol || p.poolId.slice(0, 8),
        side: p.direction === 0 ? 'LONG' : 'SHORT',
        size: p.size ?? '-',
        entry: formatPrice(p.entryPrice),
        mark: currentPrice ? `$${currentPrice.toFixed(2)}` : '-',
        pnl,
        leverage: `${p.userLeverage}x`,
        collateral: p.collateralAmount ? parseFloat(p.collateralAmount).toFixed(2) : '-',
      };
    });
    printTable(rows, ['positionId', 'symbol', 'side', 'size', 'entry', 'mark', 'pnl', 'leverage', 'collateral']);

    // Print full positionIds for use with closeOrder.ts
    console.log('\nPosition IDs (for closeOrder.ts --close):');
    for (const p of positions) {
      console.log(`  ${p.baseSymbol}: ${p.positionId}`);
    }
  } else {
    console.log('No open positions');
  }

  client.close();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
