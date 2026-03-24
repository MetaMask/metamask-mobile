/**
 * MYX PoC — Place Order
 *
 * Usage:
 *   npx tsx placeOrder.ts --symbol BTC --side long --usd 100 --leverage 10 --type market
 *   npx tsx placeOrder.ts --symbol ETH --side short --size 0.1 --type limit --price 3500 --leverage 5
 *   NETWORK=testnet npx tsx placeOrder.ts --symbol SGLT --side long --usd 120 --leverage 10 --type market
 *
 * Auth required. Uses real funds on mainnet!
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
  MYX_DEFAULT_TAKER_FEE_RATE,
} from './common';

async function main() {
  const config = getNetworkConfig();
  const args = parseArgs(process.argv.slice(2));

  const symbol = (args.symbol || '').toUpperCase();
  const side = (args.side || 'long').toLowerCase();
  const orderType = (args.type || 'market').toLowerCase();
  const leverage = parseInt(args.leverage || '10', 10);
  const usdAmount = args.usd ? parseFloat(args.usd) : undefined;
  const sizeArg = args.size ? parseFloat(args.size) : undefined;
  const priceArg = args.price ? parseFloat(args.price) : undefined;

  if (!symbol) {
    console.error('Usage: npx tsx placeOrder.ts --symbol BTC --side long --usd 100 --leverage 10 --type market');
    console.error('       --symbol   Required. e.g. BTC, ETH, SGLT');
    console.error('       --side     long|short (default: long)');
    console.error('       --type     market|limit (default: market)');
    console.error('       --usd      USD collateral amount');
    console.error('       --size     Position size in base asset');
    console.error('       --price    Limit price (required for limit orders)');
    console.error('       --leverage Leverage multiplier (default: 10)');
    process.exit(1);
  }

  if (orderType === 'limit' && !priceArg) {
    console.error('Limit orders require --price');
    process.exit(1);
  }

  console.log(`Network: ${config.isTestnet ? 'testnet' : 'mainnet'} (chainId ${config.chainId})`);
  console.log(`Order: ${side.toUpperCase()} ${symbol} | type=${orderType} | leverage=${leverage}x`);
  if (usdAmount) console.log(`  USD: $${usdAmount}`);
  if (sizeArg) console.log(`  Size: ${sizeArg}`);
  if (priceArg) console.log(`  Price: $${priceArg}`);
  console.log();

  const client = createMyxClient(config);
  await authenticateClient(client, config);

  // Resolve symbol -> poolId
  const pools = await client.markets.getPoolSymbolAll();
  const pool = pools.find(
    (p) =>
      p.baseSymbol.toUpperCase() === symbol ||
      p.baseSymbol.toUpperCase() === `${symbol}/USD` ||
      p.baseSymbol.toUpperCase() === `${symbol}/USDT` ||
      p.baseSymbol.toUpperCase() === `${symbol}/USDC`,
  );

  if (!pool) {
    const available = pools.map((p) => p.baseSymbol).join(', ');
    console.error(`Symbol "${symbol}" not found. Available: ${available}`);
    process.exit(1);
  }

  const poolId = pool.poolId;
  // Use the pool's own chainId — testnet spans multiple chains (e.g. 421614, 59141)
  const poolChainId = pool.chainId ?? config.chainId;
  console.log(`Resolved: ${symbol} -> poolId=${poolId} (chainId=${poolChainId})`);

  // Get market detail (for marketId)
  const detail = await client.markets.getMarketDetail({
    chainId: poolChainId,
    poolId,
  });
  const marketId = detail.marketId;
  console.log(`MarketId: ${marketId}`);

  // Get fee rate — may fail if broker contract isn't active on this chainId
  let takerFeeRate: bigint;
  try {
    const feeResult = await client.utils.getUserTradingFeeRate(0, 0, poolChainId);
    if (feeResult.code !== 0) throw new Error(`code=${feeResult.code}`);
    takerFeeRate = BigInt(feeResult.data?.takerFeeRate || String(MYX_DEFAULT_TAKER_FEE_RATE));
  } catch {
    takerFeeRate = MYX_DEFAULT_TAKER_FEE_RATE;
    console.log(`  (getUserTradingFeeRate failed, using default ${MYX_DEFAULT_TAKER_FEE_RATE})`);
  }
  console.log(`Taker fee rate: ${takerFeeRate}`);

  // Determine price
  let orderPrice: number;
  if (priceArg) {
    orderPrice = priceArg;
  } else {
    // Fetch current price
    const tickers = await client.markets.getTickerList({
      chainId: poolChainId,
      poolIds: [poolId],
    });
    const tickerPrice = parseFloat(tickers[0]?.price ?? '0');
    if (!tickerPrice) {
      console.error('Could not fetch current market price');
      process.exit(1);
    }
    // Apply 5% slippage buffer for market orders
    const slippage = side === 'long' ? 1.05 : 0.95;
    orderPrice = tickerPrice * slippage;
    console.log(`Market price: $${tickerPrice.toFixed(2)} (with slippage: $${orderPrice.toFixed(2)})`);
  }

  // Compute size and collateral
  let computedUsd = usdAmount;
  let computedSize: number;

  if (sizeArg) {
    computedSize = sizeArg;
    if (!computedUsd) {
      computedUsd = sizeArg * orderPrice;
    }
  } else if (computedUsd) {
    computedSize = computedUsd / orderPrice;
  } else {
    console.error('Provide --usd or --size');
    process.exit(1);
  }

  // Validate minimum $100 (mainnet safety)
  if (!config.isTestnet && computedUsd < 100) {
    console.error(`Minimum order size is $100 on mainnet (got $${computedUsd.toFixed(2)})`);
    process.exit(1);
  }

  const collateralAmount = toCollateral(computedUsd, config.collateralDecimals);
  const tradingFee = (
    (BigInt(collateralAmount) * takerFeeRate) / MYX_RATE_PRECISION
  ).toString();

  const direction = side === 'long' ? 0 : 1;
  const sdkOrderType = orderType === 'limit' ? 1 : 0;

  const sdkParams: PlaceOrderParams = {
    chainId: poolChainId,
    address: ADDRESS,
    poolId,
    positionId: '',
    orderType: sdkOrderType,
    triggerType: 0,
    direction,
    collateralAmount,
    size: toSize(computedSize),
    price: toContractPrice(orderPrice),
    timeInForce: 0,
    postOnly: false,
    slippagePct: '100',
    executionFeeToken: config.collateralToken,
    leverage,
    tpSize: '0',
    tpPrice: '0',
    slSize: '0',
    slPrice: '0',
  };

  console.log('\nSDK Params:');
  console.log(`  direction: ${direction === 0 ? 'LONG' : 'SHORT'}`);
  console.log(`  orderType: ${sdkOrderType === 0 ? 'MARKET' : 'LIMIT'}`);
  console.log(`  size: ${sdkParams.size}`);
  console.log(`  price (30-dec): ${sdkParams.price}`);
  console.log(`  collateral: ${collateralAmount}`);
  console.log(`  tradingFee: ${tradingFee}`);
  console.log(`  leverage: ${leverage}x`);

  console.log('\nPlacing order...');
  const result = await client.order.createIncreaseOrder(sdkParams, tradingFee, marketId);
  console.log('\nResult:', JSON.stringify(result, null, 2));

  client.close();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
