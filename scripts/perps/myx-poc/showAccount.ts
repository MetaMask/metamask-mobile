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
 * SDK AccountInfo type (from @myx-trade/sdk v1.0.6):
 *   freeMargin       — Free Margin (settled, withdrawable)
 *   walletBalance    — Wallet Balance (on-chain quote token)
 *   freeBaseAmount   — Withdrawable base token (e.g. META)
 *   baseProfit       — Locked Realized PnL in base token
 *   quoteProfit      — Locked Realized PnL in quote token (USDC)
 *   reservedAmount   — Margin locked in open positions
 *   releaseTime      — Unlock timer for locked PnL
 */
interface AccountData {
  freeMargin: string;
  walletBalance: string;
  freeBaseAmount: string;
  baseProfit: string;
  quoteProfit: string;
  reservedAmount: string;
  releaseTime: string;
}

function parseAccountData(data: unknown): AccountData {
  const s = (v: unknown) => String(v ?? '0');
  const obj = data as Record<string, unknown>;
  return {
    freeMargin: s(obj.freeMargin),
    walletBalance: s(obj.walletBalance),
    freeBaseAmount: s(obj.freeBaseAmount),
    baseProfit: s(obj.baseProfit),
    quoteProfit: s(obj.quoteProfit),
    reservedAmount: s(obj.reservedAmount),
    releaseTime: s(obj.releaseTime),
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
  const globalAcct = parseAccountData(globalInfo.data);
  const availableMarginRaw = (BigInt(globalAcct.freeMargin) + BigInt(globalAcct.walletBalance)).toString();
  const baseSymbol = firstPool.baseSymbol || 'BASE';

  console.log(`\n=== Account Summary (matches MYX UI) ===`);
  printLabeledRows([
    { label: 'Available Margin', value: formatUsd(availableMarginRaw, dec, sym) },
    { label: 'Free Margin', value: formatUsd(globalAcct.freeMargin, dec, sym) },
    { label: 'Wallet Balance', value: formatUsd(globalAcct.walletBalance, dec, sym) },
    { label: `Locked Realized PnL ${sym}`, value: formatUsd(globalAcct.quoteProfit, dec, sym) },
    { label: `Withdrawable ${baseSymbol}`, value: globalAcct.freeBaseAmount },
    { label: `Locked Realized PnL ${baseSymbol}`, value: globalAcct.baseProfit },
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

      const acct = parseAccountData(info.data);

      // Only show per-pool detail when there's position/order activity
      const hasActivity =
        acct.reservedAmount !== '0' ||
        acct.quoteProfit !== '0' ||
        acct.freeBaseAmount !== '0' ||
        acct.baseProfit !== '0';

      if (!hasActivity && !showAll) continue;
      poolsWithActivity++;

      const poolAvailMargin = (BigInt(acct.freeMargin) + BigInt(acct.walletBalance)).toString();

      console.log(`--- ${name}/${sym} Margin ---`);
      printLabeledRows([
        { label: 'Available Margin', value: formatUsd(poolAvailMargin, dec, sym) },
        { label: 'Free Margin', value: formatUsd(acct.freeMargin, dec, sym) },
        { label: 'Wallet Balance', value: formatUsd(acct.walletBalance, dec, sym) },
        { label: `Locked Realized PnL ${sym}`, value: formatUsd(acct.quoteProfit, dec, sym) },
        { label: `Withdrawable ${name}`, value: acct.freeBaseAmount },
        { label: `Locked Realized PnL ${name}`, value: acct.baseProfit },
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

    // Fetch open orders to find TP/SL trigger orders for each position
    const tpslByPosition: Record<string, { tp?: string; sl?: string }> = {};
    try {
      const ordersResult = await client.order.getOrders(ADDRESS);
      const orders = (ordersResult as { data?: { orderType: number; operation: number; positionId: string; direction: number; triggerType: number; price: string }[] }).data ?? [];
      for (const order of orders) {
        // Trigger orders: orderType 2 (Stop) or 3 (Conditional), operation 1 (decrease)
        if ((order.orderType === 2 || order.orderType === 3) && order.operation === 1 && order.positionId) {
          const existing = tpslByPosition[order.positionId] ?? {};
          const isLong = order.direction === 0;
          const isGTE = order.triggerType === 1;
          const isTakeProfit = isLong ? isGTE : !isGTE;
          if (isTakeProfit) {
            existing.tp = parseFloat(order.price).toFixed(2);
          } else {
            existing.sl = parseFloat(order.price).toFixed(2);
          }
          tpslByPosition[order.positionId] = existing;
        }
      }
    } catch {
      // Non-fatal
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

      const tpsl = tpslByPosition[p.positionId];

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
        TP: tpsl?.tp ? `$${tpsl.tp}` : '-',
        SL: tpsl?.sl ? `$${tpsl.sl}` : '-',
      };
    });
    printTable(rows, ['positionId', 'symbol', 'side', 'size', 'entry', 'mark', 'pnl', 'leverage', 'collateral', 'TP', 'SL']);

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
