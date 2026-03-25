/**
 * MYX PoC — Fee Breakdown
 *
 * Comprehensive analysis of MYX fee structure and MetaMask revenue model.
 *
 * Usage:
 *   NETWORK=testnet npx tsx feeBreakdown.ts                 # default $1000 trade
 *   NETWORK=testnet npx tsx feeBreakdown.ts --amount 500    # custom trade size
 *   NETWORK=testnet npx tsx feeBreakdown.ts --pool META     # specific pool
 *   NETWORK=mainnet npx tsx feeBreakdown.ts                 # mainnet comparison
 */

import {
  getNetworkConfig,
  createMyxClient,
  authenticateClient,
  ADDRESS,
  parseArgs,
  printTable,
  MYX_RATE_PRECISION,
  MYX_DEFAULT_TAKER_FEE_RATE,
} from './common';
import type { MarketInfo, TradeFlowItem } from '@myx-trade/sdk';

const DIVIDER = '='.repeat(72);
const THIN_DIVIDER = '-'.repeat(72);

// Typical perps taker fees are 0.02%-0.10%. If the computed rate exceeds
// 1%, it is flagged as suspicious — the precision constant may be wrong.
const SUSPICIOUS_FEE_THRESHOLD_PCT = 1; // flag if computed rate > 1%

function feeRateToPercent(rate: bigint): string {
  const pct = Number(rate) / Number(MYX_RATE_PRECISION) * 100;
  return `${pct.toFixed(4)}%`;
}

function feeRateToDecimal(rate: bigint): number {
  return Number(rate) / Number(MYX_RATE_PRECISION);
}

function isSuspiciousRate(rate: bigint): boolean {
  const pct = Number(rate) / Number(MYX_RATE_PRECISION) * 100;
  return pct > SUSPICIOUS_FEE_THRESHOLD_PCT;
}

function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));
  const tradeAmount = parseFloat(args.amount || '1000');
  const poolFilter = args.pool?.toUpperCase();

  console.log(DIVIDER);
  console.log('MYX Fee Breakdown Analysis');
  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Trade amount: ${usd(tradeAmount)}`);
  if (poolFilter) console.log(`Pool filter: ${poolFilter}`);
  console.log(`Address: ${ADDRESS}`);
  console.log(DIVIDER);

  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // ========================================================================
  // Section 1: Trading Fee Rates
  // ========================================================================
  console.log('\n' + DIVIDER);
  console.log('SECTION 1: Trading Fee Rates');
  console.log(DIVIDER);

  // Base rates (no user-specific override)
  const baseRates = await client.utils.getUserTradingFeeRate(0, 0, config.chainId);
  if (baseRates.code !== 0) {
    console.log('  Failed to fetch base fee rates:', (baseRates as { message?: string }).message);
  } else {
    const { takerFeeRate, makerFeeRate, baseTakerFeeRate, baseMakerFeeRate } = baseRates.data;
    console.log('\nBase rates (no user-specific override):');
    printTable([
      {
        type: 'Taker',
        'raw (1e8)': takerFeeRate,
        percent: feeRateToPercent(BigInt(takerFeeRate)),
        'base raw': baseTakerFeeRate,
        'base %': feeRateToPercent(BigInt(baseTakerFeeRate)),
      },
      {
        type: 'Maker',
        'raw (1e8)': makerFeeRate,
        percent: feeRateToPercent(BigInt(makerFeeRate)),
        'base raw': baseMakerFeeRate,
        'base %': feeRateToPercent(BigInt(baseMakerFeeRate)),
      },
    ]);
  }

  // User-specific rates
  const userRates = await client.utils.getUserTradingFeeRate(0, 0, config.chainId, ADDRESS);
  if (userRates.code === 0) {
    const { takerFeeRate, makerFeeRate } = userRates.data;
    console.log(`\nUser-specific rates (${ADDRESS.slice(0, 10)}...):`);
    printTable([
      { type: 'Taker', 'raw (1e8)': takerFeeRate, percent: feeRateToPercent(BigInt(takerFeeRate)) },
      { type: 'Maker', 'raw (1e8)': makerFeeRate, percent: feeRateToPercent(BigInt(makerFeeRate)) },
    ]);
  }

  const takerRate = baseRates.code === 0
    ? BigInt(baseRates.data.takerFeeRate)
    : MYX_DEFAULT_TAKER_FEE_RATE;

  // Provenance: explain exactly how the rate was obtained
  console.log(`\n  Source: client.utils.getUserTradingFeeRate(assetClass=0, riskTier=0, chainId=${config.chainId})`);
  console.log(`  Raw takerFeeRate from SDK: ${takerRate}`);
  console.log(`  Precision: MYX_RATE_PRECISION = ${MYX_RATE_PRECISION} (1e8)`);
  console.log(`  Computed: ${takerRate} / ${MYX_RATE_PRECISION} = ${feeRateToDecimal(takerRate)} (${feeRateToPercent(takerRate)})`);

  if (isSuspiciousRate(takerRate)) {
    console.log(`\n  *** WARNING: Computed taker rate (${feeRateToPercent(takerRate)}) exceeds ${SUSPICIOUS_FEE_THRESHOLD_PCT}%. ***`);
    console.log('  Typical perps taker fees are 0.02%-0.10%. This may indicate:');
    console.log('    - Testnet uses inflated rates for testing');
    console.log('    - The precision constant (1e8) needs re-verification');
    console.log('  ACTION: Verify on-chain RATE_PRECISION() constant via contract read');
  }

  const takerFeeForTrade = tradeAmount * feeRateToDecimal(takerRate);
  console.log(`\nFor ${usd(tradeAmount)} market buy: taker fee = ${usd(takerFeeForTrade)}`);

  // ========================================================================
  // Section 2: Network / Execution Fees (per pool)
  // ========================================================================
  console.log('\n' + DIVIDER);
  console.log('SECTION 2: Network / Execution Fees');
  console.log(DIVIDER);

  const pools = await client.markets.getPoolSymbolAll();
  const marketListResp = await client.api.getMarketList();
  const marketInfos: MarketInfo[] = marketListResp.code === 0 ? marketListResp.data : [];

  // Build marketId lookup by poolId
  const marketByPool = new Map<string, MarketInfo>();
  for (const m of marketInfos) {
    marketByPool.set(m.poolId, m);
  }

  const execFeeRows: Record<string, string | number>[] = [];

  for (const pool of pools) {
    const symbol = pool.baseSymbol || pool.poolId.slice(0, 10);
    if (poolFilter && symbol.toUpperCase() !== poolFilter) continue;

    const mktInfo = marketByPool.get(pool.poolId);
    let networkFee = 'N/A';
    try {
      if (mktInfo) {
        const nf = await client.utils.getNetworkFee(mktInfo.marketId, config.chainId);
        networkFee = nf != null ? JSON.stringify(nf) : 'null';
      }
    } catch {
      networkFee = 'error';
    }

    execFeeRows.push({
      symbol,
      'oracle fee (USD)': mktInfo?.oracleFeeUsd ?? 'N/A',
      'oracle refund (USD)': mktInfo?.oracleRefundFeeUsd ?? 'N/A',
      'network fee': networkFee,
    });
  }

  if (execFeeRows.length > 0) {
    printTable(execFeeRows);
  } else {
    console.log('(no pools found)');
  }

  // ========================================================================
  // Section 3: Per-Pool Fee Comparison Table
  // ========================================================================
  console.log('\n' + DIVIDER);
  console.log('SECTION 3: Per-Pool Fee Comparison');
  console.log(DIVIDER);

  const compRows: Record<string, string | number>[] = [];
  for (const pool of pools) {
    const symbol = pool.baseSymbol || pool.poolId.slice(0, 10);
    if (poolFilter && symbol.toUpperCase() !== poolFilter) continue;

    const mktInfo = marketByPool.get(pool.poolId);
    let minOrder = 'N/A';
    try {
      const poolConfig = await client.markets.getPoolLevelConfig(pool.poolId, config.chainId);
      minOrder = String(poolConfig?.levelConfig?.minOrderSizeInUsd ?? 'N/A');
    } catch {
      minOrder = 'error';
    }

    const effectiveTakerRate = baseRates.code === 0
      ? feeRateToPercent(BigInt(baseRates.data.takerFeeRate))
      : feeRateToPercent(MYX_DEFAULT_TAKER_FEE_RATE);
    const effectiveMakerRate = baseRates.code === 0
      ? feeRateToPercent(BigInt(baseRates.data.makerFeeRate))
      : 'N/A';

    compRows.push({
      symbol,
      'taker rate': effectiveTakerRate,
      'maker rate': effectiveMakerRate,
      'oracle fee': mktInfo ? `$${mktInfo.oracleFeeUsd}` : 'N/A',
      'min order': minOrder === 'N/A' ? minOrder : `$${minOrder}`,
    });
  }

  if (compRows.length > 0) {
    printTable(compRows);
  } else {
    console.log('(no pools matched)');
  }

  // ========================================================================
  // Section 4: Full Fee Breakdown for Hypothetical Trade
  // ========================================================================
  console.log('\n' + DIVIDER);
  console.log(`SECTION 4: Full Fee Breakdown for ${usd(tradeAmount)} Market Buy`);
  console.log(DIVIDER);

  const protocolFee = tradeAmount * feeRateToDecimal(takerRate);
  const samplePool = poolFilter
    ? pools.find((p) => p.baseSymbol?.toUpperCase() === poolFilter)
    : pools[0];
  const sampleMarket = samplePool ? marketByPool.get(samplePool.poolId) : undefined;
  const oracleFee = sampleMarket?.oracleFeeUsd ?? 0;

  if (isSuspiciousRate(takerRate)) {
    console.log(`\n  NOTE: Computed rate (${feeRateToPercent(takerRate)}) seems high — see Section 1 warning.`);
    console.log('  Fee amounts below may be overstated if the precision constant is wrong.\n');
  }

  console.log(`
  Protocol fee (taker):     ${usd(tradeAmount)} * ${feeRateToPercent(takerRate)} = ${usd(protocolFee)}
  MetaMask broker fee:      $0.00 (not configured -- referral rebate model)
  Execution fee (keeper):   Applies to limit/trigger orders only (varies by pool)
  Oracle fee:               ${usd(oracleFee)} (per ${samplePool?.baseSymbol || 'pool'})
  Gas fee:                  Paid in native token (ETH/BNB), varies by chain
  ${THIN_DIVIDER}
  Total visible fee:        ~${usd(protocolFee + oracleFee)} + gas
`);

  console.log('  Potential MetaMask revenue (referral rebate scenarios):');
  const rebateScenarios = [
    { label: '10% of protocol fee', pct: 0.10 },
    { label: '25% of protocol fee', pct: 0.25 },
    { label: '50% of protocol fee', pct: 0.50 },
  ];
  for (const s of rebateScenarios) {
    const revenue = protocolFee * s.pct;
    const effectiveRate = feeRateToDecimal(takerRate) * s.pct * 100;
    console.log(`    ${s.label.padEnd(25)} -> ${usd(tradeAmount)} * ${effectiveRate.toFixed(4)}% = ${usd(revenue)}/trade`);
  }

  // ========================================================================
  // Section 5: Broker Revenue Configuration Guide
  // ========================================================================
  console.log('\n' + DIVIDER);
  console.log('SECTION 5: Broker Revenue Configuration Guide');
  console.log(DIVIDER);

  console.log(`
  MYX uses a broker REFERRAL REBATE model (not a direct fee like HyperLiquid).

  4-step setup:

  1. MyxClient({ brokerAddress })
     Already done -- tags every trade with MetaMask broker address.
     Current broker: ${config.brokerAddress}

  2. utils.setUserFeeData(address, chainId, deadline, params, signature)
     Links user to broker with configurable rebate split.
     Parameters:
       - tier: number              Fee tier override for the user
       - referrer: string          Broker address (MetaMask)
       - totalReferralRebatePct: number  Total % of protocol fee rebated (0-100)
       - referrerRebatePct: number       How much goes to broker vs trader (0-100)
       - nonce: string             Replay protection

     *** Requires MYX team EIP-712 signature backend -- NOT YET AVAILABLE ***

  3. referrals.claimRebate(tokenAddress)
     Broker claims accumulated rebates from the contract.
     Callable any time after trades generate rebates.

  4. TradeFlowItem fields (per-trade rebate tracking):
       - referrerRebate:      Broker's share of the rebate
       - referralRebate:      Trader's share of the rebate
       - rebateClaimedAmount: Amount already claimed

  Configurable parameters:
    totalReferralRebatePct  0-100  Total % of protocol fee that is rebated
    referrerRebatePct       0-100  Split: how much goes to broker vs trader
    tier                    number Fee tier override (can lower effective rate)

  Comparison to HyperLiquid:
    HyperLiquid:  Direct 0.1% builder fee (BUILDER_FEE_CONFIG.MaxFeeDecimal)
                  Optional discount via userFeeDiscountBips
                  Revenue = amount * builderFeeRate per trade
    MYX:          Referral rebate of X% of protocol fee
                  Revenue = amount * takerRate * totalRebatePct * referrerPct
                  Requires MYX backend signature to activate
`);

  // ========================================================================
  // Section 6: Historical Trade Fee Analysis
  // ========================================================================
  console.log(DIVIDER);
  console.log('SECTION 6: Historical Trade Fee Analysis');
  console.log(DIVIDER);

  try {
    const tradeFlowResp = await client.account.getTradeFlow(
      { limit: 20, chainId: config.chainId },
      ADDRESS,
    );

    const trades: TradeFlowItem[] = tradeFlowResp.code === 0
      ? tradeFlowResp.data
      : [];

    if (trades.length === 0) {
      console.log('\n  (no trades found -- place an order first)\n');
    } else {
      console.log(`\n  Found ${trades.length} recent trades:\n`);

      const tradeRows: Record<string, string | number>[] = trades.map((t) => ({
        orderId: t.orderId,
        type: t.type,
        tradingFee: t.tradingFee,
        executionFee: t.executionFee,
        seamlessFee: t.seamlessFee || '0',
        referrerRebate: t.referrerRebate || '0',
        referralRebate: t.referralRebate || '0',
        rebateClaimed: t.rebateClaimedAmount || '0',
      }));
      printTable(tradeRows);

      // Totals
      let totalTradingFee = 0;
      let totalExecFee = 0;
      let totalSeamless = 0;
      let totalReferrerRebate = 0;
      let totalReferralRebate = 0;

      for (const t of trades) {
        totalTradingFee += parseFloat(t.tradingFee) || 0;
        totalExecFee += parseFloat(t.executionFee) || 0;
        totalSeamless += parseFloat(t.seamlessFee) || 0;
        totalReferrerRebate += parseFloat(t.referrerRebate) || 0;
        totalReferralRebate += parseFloat(t.referralRebate) || 0;
      }

      console.log(`\n  Totals across ${trades.length} trades:`);
      console.log(`    Trading fees:     ${usd(totalTradingFee)}`);
      console.log(`    Execution fees:   ${usd(totalExecFee)}`);
      console.log(`    Seamless fees:    ${usd(totalSeamless)}`);
      console.log(`    Referrer rebate:  ${usd(totalReferrerRebate)}`);
      console.log(`    Referral rebate:  ${usd(totalReferralRebate)}`);
    }
  } catch (err) {
    console.log(`\n  Failed to fetch trade history: ${err instanceof Error ? err.message : String(err)}`);
    console.log('  (this may require authentication with API key)\n');
  }

  console.log('\n' + DIVIDER);
  console.log('Done.');
  client.close();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
