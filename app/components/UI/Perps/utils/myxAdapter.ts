/**
 * MYX SDK Adapter Utilities
 *
 * These functions transform between MetaMask Perps API types and MYX SDK types.
 * MYX uses a Multi-Pool Model (MPM) with different data structures than HyperLiquid.
 *
 * Key differences from HyperLiquid:
 * - Prices use 30 decimals (same)
 * - Sizes use 18 decimals (vs HyperLiquid's szDecimals per asset)
 * - Positions have unsigned size + direction enum (vs signed size)
 * - Multiple pools can exist per symbol (MPM model)
 * - USDT collateral (vs USDC)
 */

import type { Hex } from '@metamask/utils';
import type {
  AccountState,
  MarketInfo,
  Order,
  OrderParams as PerpsOrderParams,
  Position,
  PriceUpdate,
  OrderFill,
  Funding,
} from '../controllers/types';
import {
  MYXDirection,
  MYXOrderType,
  MYXTriggerType,
  MYXTimeInForce,
  type MYXPosition,
  type MYXOrder,
  type MYXTicker,
  type MYXPoolSymbol,
  type MYXMarketDetail,
  type MYXAccountInfo,
  type MYXPlaceOrderParams,
  type MYXTickerWsResponse,
  type MYXKlineWsResponse,
  type MYXTradeFlow,
  type PoolSymbolMap,
  type SymbolPoolsMap,
} from '../types/myx-types';
import {
  fromMYXPrice,
  fromMYXSize,
  fromMYXCollateral,
  toMYXPrice,
  toMYXSize,
  toMYXCollateral,
  MYX_SIZE_DECIMALS,
} from '../constants/myxConfig';

// ============================================================================
// Order Transformation
// ============================================================================

/**
 * Transform MetaMask Perps API OrderParams to MYX SDK format
 *
 * Key mapping:
 * - isBuy + position context → direction (LONG/SHORT) + operation (INCREASE/DECREASE)
 * - orderType: 'market'/'limit' → MYXOrderType enum
 * - size → 18 decimal format
 * - price → 30 decimal format
 *
 * @param order - MetaMask Perps order parameters
 * @param context - Additional context needed for MYX order
 * @returns MYX SDK-compatible order parameters
 */
export function adaptOrderToMYX(
  order: PerpsOrderParams,
  context: {
    poolId: string;
    positionId: string;
    userAddress: Hex;
    chainId: number;
    executionFeeToken: string;
    existingPosition?: Position;
  },
): {
  params: MYXPlaceOrderParams;
  isIncrease: boolean;
} {
  const {
    poolId,
    positionId,
    userAddress,
    chainId,
    executionFeeToken,
    existingPosition,
  } = context;

  // Determine direction and operation
  // Long: buy to open/increase, sell to close/decrease
  // Short: sell to open/increase, buy to close/decrease
  let direction: (typeof MYXDirection)[keyof typeof MYXDirection];
  let isIncrease: boolean;

  if (existingPosition) {
    const isLongPosition = parseFloat(existingPosition.size) > 0;

    if (order.reduceOnly) {
      // Closing position
      isIncrease = false;
      direction = isLongPosition ? MYXDirection.LONG : MYXDirection.SHORT;
    } else if (order.isBuy === isLongPosition) {
      // Adding to position (same direction)
      isIncrease = true;
      direction = isLongPosition ? MYXDirection.LONG : MYXDirection.SHORT;
    } else {
      // Reducing or flipping position
      isIncrease = false;
      direction = isLongPosition ? MYXDirection.LONG : MYXDirection.SHORT;
    }
  } else {
    // No existing position - opening new
    isIncrease = true;
    direction = order.isBuy ? MYXDirection.LONG : MYXDirection.SHORT;
  }

  // Map order type
  const orderType =
    order.orderType === 'limit' ? MYXOrderType.LIMIT : MYXOrderType.MARKET;

  // Convert size to MYX format (18 decimals)
  const size = toMYXSize(order.size);

  // Convert price to MYX format (30 decimals)
  const price = order.price ? toMYXPrice(order.price) : '0';

  // Calculate collateral amount (for increase orders)
  // collateralAmount = size * price / leverage
  let collateralAmount = '0';
  if (isIncrease && order.leverage && order.usdAmount) {
    collateralAmount = toMYXCollateral(order.usdAmount);
  }

  // Slippage in basis points (default 1% = 100 bps)
  const slippagePct = order.slippage
    ? (order.slippage * 100).toString()
    : '100';

  const params: MYXPlaceOrderParams = {
    chainId,
    address: userAddress as string,
    poolId,
    positionId,
    orderType,
    triggerType: MYXTriggerType.NONE,
    direction,
    collateralAmount,
    size,
    price,
    timeInForce: MYXTimeInForce.IOC,
    postOnly: false,
    slippagePct,
    executionFeeToken,
    leverage: order.leverage || 1,
  };

  // Add TP/SL if provided
  if (order.takeProfitPrice) {
    params.tpSize = size;
    params.tpPrice = toMYXPrice(order.takeProfitPrice);
  }
  if (order.stopLossPrice) {
    params.slSize = size;
    params.slPrice = toMYXPrice(order.stopLossPrice);
  }

  return { params, isIncrease };
}

// ============================================================================
// Position Transformation
// ============================================================================

/**
 * Transform MYX Position to MetaMask Perps API format
 *
 * Key mapping:
 * - size (unsigned) + direction → signed size (+ for long, - for short)
 * - 30-decimal prices → string
 * - unrealizedPnl may need calculation from entry/current price
 *
 * @param myxPosition - Position data from MYX SDK
 * @param currentPrice - Current market price (for PnL calculation if needed)
 * @returns MetaMask Perps API position object
 */
export function adaptPositionFromMYX(
  myxPosition: MYXPosition,
  _currentPrice?: number,
): Position {
  // Convert unsigned size to signed based on direction
  const sizeNum = fromMYXSize(myxPosition.size);
  const isLong = myxPosition.direction === MYXDirection.LONG;
  const signedSize = isLong ? sizeNum : -sizeNum;

  // Convert entry price
  const entryPrice = fromMYXPrice(myxPosition.entryPrice);

  // SDK provides unrealizedPnl directly
  const unrealizedPnl = myxPosition.unrealizedPnl
    ? fromMYXCollateral(myxPosition.unrealizedPnl)
    : 0;

  // Calculate position value
  const positionValue = sizeNum * entryPrice;

  // Calculate margin used from collateral
  const marginUsed = fromMYXCollateral(myxPosition.collateral);

  // Calculate return on equity
  const returnOnEquity =
    marginUsed > 0 ? ((unrealizedPnl / marginUsed) * 100).toFixed(2) : '0';

  // Convert liquidation price (SDK provides this directly)
  const liquidationPrice = myxPosition.liquidationPrice
    ? fromMYXPrice(myxPosition.liquidationPrice).toString()
    : null;

  return {
    coin: extractSymbolFromPoolId(myxPosition.poolId),
    size: signedSize.toString(),
    entryPrice: entryPrice.toString(),
    positionValue: positionValue.toString(),
    unrealizedPnl: unrealizedPnl.toString(),
    marginUsed: marginUsed.toString(),
    leverage: {
      type: 'isolated', // SDK Position doesn't specify margin mode, assume isolated
      value: myxPosition.leverage,
      rawUsd: marginUsed.toString(),
    },
    liquidationPrice,
    maxLeverage: 100, // Will be updated from market info
    returnOnEquity,
    cumulativeFunding: {
      allTime: '0', // MYX doesn't provide this breakdown
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitPrice: undefined, // SDK Position doesn't include TP/SL
    stopLossPrice: undefined,
    takeProfitCount: 0,
    stopLossCount: 0,
  };
}

/**
 * Aggregate multiple MYX positions by symbol
 * Since MYX uses Multi-Pool Model, a user might have positions in multiple pools for the same symbol
 *
 * @param positions - Array of MYX positions
 * @param symbolPoolMap - Map of poolId to symbol
 * @param currentPrices - Map of symbol to current price
 * @returns Aggregated positions per symbol
 */
export function aggregatePositionsBySymbol(
  positions: MYXPosition[],
  symbolPoolMap: PoolSymbolMap,
  currentPrices?: Map<string, number>,
): Position[] {
  const aggregatedBySymbol = new Map<string, Position>();

  for (const myxPos of positions) {
    const symbol = symbolPoolMap.get(myxPos.poolId) || myxPos.poolId;
    const currentPrice = currentPrices?.get(symbol);

    const position = adaptPositionFromMYX(myxPos, currentPrice);
    position.coin = symbol; // Ensure correct symbol

    const existing = aggregatedBySymbol.get(symbol);
    if (existing) {
      // Aggregate positions for the same symbol
      const existingSize = parseFloat(existing.size);
      const newSize = parseFloat(position.size);
      const combinedSize = existingSize + newSize;

      // Weighted average entry price
      const existingValue =
        Math.abs(existingSize) * parseFloat(existing.entryPrice);
      const newValue = Math.abs(newSize) * parseFloat(position.entryPrice);
      const combinedEntryPrice =
        combinedSize !== 0
          ? (existingValue + newValue) / Math.abs(combinedSize)
          : 0;

      existing.size = combinedSize.toString();
      existing.entryPrice = combinedEntryPrice.toString();
      existing.unrealizedPnl = (
        parseFloat(existing.unrealizedPnl) + parseFloat(position.unrealizedPnl)
      ).toString();
      existing.marginUsed = (
        parseFloat(existing.marginUsed) + parseFloat(position.marginUsed)
      ).toString();
      existing.positionValue = (
        parseFloat(existing.positionValue) + parseFloat(position.positionValue)
      ).toString();
    } else {
      aggregatedBySymbol.set(symbol, position);
    }
  }

  return Array.from(aggregatedBySymbol.values());
}

// ============================================================================
// Order Transformation
// ============================================================================

/**
 * Transform MYX Order to MetaMask Perps API format
 *
 * @param myxOrder - Order data from MYX SDK
 * @param symbolPoolMap - Map of poolId to symbol
 * @returns MetaMask Perps API order object
 */
export function adaptOrderFromMYX(
  myxOrder: MYXOrder,
  symbolPoolMap: PoolSymbolMap,
): Order {
  const symbol = symbolPoolMap.get(myxOrder.poolId) || myxOrder.poolId;

  // Determine side based on direction and operation
  // For increase orders: LONG = buy, SHORT = sell
  // For decrease orders: LONG = sell, SHORT = buy
  const isLong = myxOrder.direction === MYXDirection.LONG;
  const isIncrease = parseFloat(myxOrder.collateralAmount) > 0;
  const side: 'buy' | 'sell' =
    (isLong && isIncrease) || (!isLong && !isIncrease) ? 'buy' : 'sell';

  // Map order type
  const orderType: 'market' | 'limit' =
    myxOrder.orderType === MYXOrderType.MARKET ? 'market' : 'limit';

  // Convert size (SDK Order has size, no filledSize/remainingSize)
  const size = fromMYXSize(myxOrder.size).toString();

  // Convert price (SDK uses orderPrice)
  const price = myxOrder.orderPrice
    ? fromMYXPrice(myxOrder.orderPrice).toString()
    : '0';

  // Map status (SDK uses numeric enum)
  // OrderStatus: PENDING=0, PARTIAL=1, FILLED=2, CANCELLED=3, REJECTED=4, EXPIRED=5
  const statusMap: Record<number, Order['status']> = {
    0: 'queued', // PENDING
    1: 'open', // PARTIAL
    2: 'filled', // FILLED
    3: 'canceled', // CANCELLED
    4: 'rejected', // REJECTED
    5: 'canceled', // EXPIRED
  };
  const status = statusMap[myxOrder.status] || 'open';

  // Determine if this is a trigger order (TP/SL)
  const isTrigger = myxOrder.triggerType !== MYXTriggerType.NONE;

  const order: Order = {
    orderId: myxOrder.orderId,
    symbol,
    side,
    orderType,
    size,
    originalSize: size, // SDK doesn't track original size separately
    price,
    filledSize: '0', // SDK Order doesn't have filledSize, default to 0
    remainingSize: size, // Default to full size
    status,
    timestamp: myxOrder.createdAt,
    lastUpdated: myxOrder.updatedAt,
    isTrigger,
    reduceOnly: false, // SDK Order doesn't have reduceOnly, infer from operation
  };

  // Add trigger price for trigger orders
  if (myxOrder.triggerPrice) {
    order.triggerPrice = fromMYXPrice(myxOrder.triggerPrice).toString();
  }

  return order;
}

// ============================================================================
// Market Transformation
// ============================================================================

/**
 * Transform MYX Pool/Market info to MetaMask Perps API format
 *
 * @param pool - Pool symbol data from MYX SDK
 * @param detail - Market detail data (optional)
 * @returns MetaMask Perps API market info object
 */
export function adaptMarketFromMYX(
  pool: MYXPoolSymbol,
  _detail?: MYXMarketDetail,
): MarketInfo {
  // Note: PoolSymbolAllResponse uses baseSymbol, not symbol
  // maxLeverage and minOrderSize come from PoolLevelConfig (separate API call)
  // For now use defaults, can be updated with getLevelConfig later
  return {
    name: pool.baseSymbol,
    szDecimals: MYX_SIZE_DECIMALS, // MYX uses 18 decimals for all sizes
    maxLeverage: 100, // Default max leverage - update from PoolLevelConfig
    marginTableId: 0, // MYX doesn't use margin tables
    minimumOrderSize: undefined, // Available via PoolLevelConfig.levelConfig.minOrderSizeInUsd
  };
}

// ============================================================================
// Account State Transformation
// ============================================================================

/**
 * Transform MYX Account Info to MetaMask Perps API AccountState
 * Aggregates balances across all pools
 *
 * @param accountInfos - Array of account info per pool from MYX SDK
 * @param positions - Current positions for unrealized PnL calculation
 * @returns MetaMask Perps API account state object
 */
export function adaptAccountStateFromMYX(
  accountInfos: MYXAccountInfo[],
  positions?: Position[],
): AccountState {
  // Aggregate across all pools
  let totalFreeMargin = 0;
  let totalLockedMargin = 0;

  for (const info of accountInfos) {
    totalFreeMargin += fromMYXCollateral(info.freeMargin);
    totalLockedMargin += fromMYXCollateral(info.lockedMargin);
    // info.quoteProfit is aggregated but not directly exposed in AccountState
  }

  // Calculate unrealized PnL from positions if provided
  let unrealizedPnl = 0;
  if (positions) {
    unrealizedPnl = positions.reduce(
      (sum, pos) => sum + parseFloat(pos.unrealizedPnl),
      0,
    );
  }

  // Total balance = free margin + locked margin + unrealized PnL
  const totalBalance = totalFreeMargin + totalLockedMargin + unrealizedPnl;

  // Available balance = free margin only
  const availableBalance = totalFreeMargin;

  // Margin used = locked margin
  const marginUsed = totalLockedMargin;

  // Calculate ROE
  const returnOnEquity =
    marginUsed > 0 ? ((unrealizedPnl / marginUsed) * 100).toFixed(2) : '0';

  return {
    availableBalance: availableBalance.toString(),
    totalBalance: totalBalance.toString(),
    marginUsed: marginUsed.toString(),
    unrealizedPnl: unrealizedPnl.toString(),
    returnOnEquity,
  };
}

// ============================================================================
// Price/Ticker Transformation
// ============================================================================

/**
 * Transform MYX Ticker to MetaMask Perps PriceUpdate format
 *
 * @param ticker - Ticker data from MYX SDK
 * @param symbolPoolMap - Map of poolId to symbol
 * @returns MetaMask Perps API price update object
 */
export function adaptTickerToPriceUpdate(
  ticker: MYXTicker,
  symbolPoolMap: PoolSymbolMap,
): PriceUpdate {
  // TickerDataItem properties: chainId, poolId, oracleId, price, change, high, low, volume, turnover
  const symbol = symbolPoolMap.get(ticker.poolId) || ticker.poolId;

  return {
    coin: symbol,
    price: ticker.price,
    timestamp: Date.now(),
    percentChange24h: ticker.change,
    // markPrice not available in TickerDataItem
    // funding not available in TickerDataItem
    // openInterest not available in TickerDataItem
    volume24h: parseFloat(ticker.volume),
  };
}

/**
 * Transform MYX WebSocket Ticker to PriceUpdate format
 *
 * @param wsData - WebSocket ticker data from MYX SDK
 * @param globalIdToSymbol - Map of globalId to symbol
 * @returns MetaMask Perps API price update object
 */
export function adaptWsTickerToPriceUpdate(
  wsData: MYXTickerWsResponse,
  globalIdToSymbol: Map<number, string>,
): PriceUpdate {
  const symbol =
    globalIdToSymbol.get(wsData.globalId) || wsData.globalId.toString();

  return {
    coin: symbol,
    price: wsData.data.C, // Close price
    timestamp: wsData.data.E,
    percentChange24h: wsData.data.p,
    // MYX WS ticker includes index price but not mark price
    // bestBid/bestAsk not available in ticker stream
  };
}

/**
 * Transform MYX WebSocket Ticker to PriceUpdate format using symbol directly
 * Used by MYXSubscriptionService when symbol is already known
 *
 * @param wsData - WebSocket ticker data from MYX SDK
 * @param symbol - The symbol string (already resolved)
 * @returns MetaMask Perps API price update object
 */
export function adaptPriceUpdateFromMYX(
  wsData: MYXTickerWsResponse,
  symbol: string,
): PriceUpdate {
  return {
    coin: symbol,
    price: wsData.data.C, // Close price
    timestamp: wsData.data.E,
    percentChange24h: wsData.data.p,
  };
}

// ============================================================================
// Trade Flow / History Transformation
// ============================================================================

/**
 * Transform MYX Trade Flow to OrderFill format
 * Note: This is a workaround since MYX doesn't have a dedicated fills API
 *
 * @param tradeFlow - Trade flow entry from MYX SDK
 * @param symbolPoolMap - Map of poolId to symbol
 * @returns MetaMask Perps API order fill object (or null if not a trade)
 */
export function adaptTradeFlowToOrderFill(
  tradeFlow: MYXTradeFlow,
  symbolPoolMap: PoolSymbolMap,
): OrderFill | null {
  if (tradeFlow.type !== 'trade') {
    return null;
  }

  const symbol = symbolPoolMap.get(tradeFlow.poolId) || tradeFlow.poolId;
  const details = tradeFlow.details || {};

  return {
    orderId: tradeFlow.id,
    symbol,
    side: (details.side as string) || 'buy',
    size: fromMYXSize(tradeFlow.amount).toString(),
    price: details.price
      ? fromMYXPrice(details.price as string).toString()
      : '0',
    pnl: details.pnl
      ? fromMYXCollateral(details.pnl as string).toString()
      : '0',
    direction: (details.direction as string) || 'long',
    fee: tradeFlow.fee ? fromMYXCollateral(tradeFlow.fee).toString() : '0',
    feeToken: 'USDT',
    timestamp: tradeFlow.timestamp,
    success: true,
  };
}

/**
 * Transform MYX Trade Flow to Funding format
 *
 * @param tradeFlow - Trade flow entry from MYX SDK
 * @param symbolPoolMap - Map of poolId to symbol
 * @returns MetaMask Perps API funding object (or null if not funding)
 */
export function adaptTradeFlowToFunding(
  tradeFlow: MYXTradeFlow,
  symbolPoolMap: PoolSymbolMap,
): Funding | null {
  if (tradeFlow.type !== 'funding') {
    return null;
  }

  const symbol = symbolPoolMap.get(tradeFlow.poolId) || tradeFlow.poolId;
  const details = tradeFlow.details || {};

  return {
    symbol,
    amountUsd: fromMYXCollateral(tradeFlow.amount).toString(),
    rate: (details.rate as string) || '0',
    timestamp: tradeFlow.timestamp,
    transactionHash: tradeFlow.txHash,
  };
}

// ============================================================================
// Pool/Symbol Mapping Utilities
// ============================================================================

/**
 * Build bidirectional mappings between pool IDs and symbols
 *
 * @param pools - Array of pool symbols from MYX SDK
 * @returns Maps for pool/symbol lookups
 */
export function buildPoolSymbolMaps(pools: MYXPoolSymbol[]): {
  poolToSymbol: PoolSymbolMap;
  symbolToPools: SymbolPoolsMap;
  globalIdToSymbol: Map<number, string>;
} {
  const poolToSymbol = new Map<string, string>();
  const symbolToPools = new Map<string, string[]>();
  const globalIdToSymbol = new Map<number, string>();

  for (const pool of pools) {
    // Pool ID → Symbol (using baseSymbol from PoolSymbolAllResponse)
    poolToSymbol.set(pool.poolId, pool.baseSymbol);

    // Symbol → Pool IDs (can be multiple in MPM)
    const existing = symbolToPools.get(pool.baseSymbol) || [];
    existing.push(pool.poolId);
    symbolToPools.set(pool.baseSymbol, existing);

    // Note: PoolSymbolAllResponse doesn't have globalId
    // globalIdToSymbol needs to be populated from MarketPool data
    // TODO: Update this when MarketPool data is available
  }

  return { poolToSymbol, symbolToPools, globalIdToSymbol };
}

/**
 * Get the default (highest liquidity) pool for a symbol
 * In Phase 1, we'll use the first pool; later we can implement liquidity ranking
 *
 * @param symbol - Asset symbol
 * @param symbolToPools - Symbol to pools mapping
 * @param poolLiquidity - Optional liquidity data for ranking
 * @returns Pool ID or undefined
 */
export function getDefaultPoolForSymbol(
  symbol: string,
  symbolToPools: SymbolPoolsMap,
  _poolLiquidity?: Map<string, number>,
): string | undefined {
  const pools = symbolToPools.get(symbol);
  if (!pools || pools.length === 0) {
    return undefined;
  }

  // TODO: In future, rank by liquidity
  // For now, return first pool
  return pools[0];
}

/**
 * Extract symbol from pool ID
 * Pool IDs in MYX may contain additional metadata
 *
 * @param poolId - Pool ID from MYX
 * @returns Extracted symbol
 */
export function extractSymbolFromPoolId(poolId: string): string {
  // MYX pool IDs may be in format "symbol_poolIndex" or just numeric
  // This is a placeholder - actual format TBD from MYX team
  if (poolId.includes('_')) {
    return poolId.split('_')[0];
  }
  return poolId;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate that a price is properly formatted for MYX
 *
 * @param price - Price string (in 30-decimal format)
 * @returns True if valid
 */
export function isValidMYXPrice(price: string): boolean {
  try {
    const priceNum = BigInt(price);
    return priceNum > 0n;
  } catch {
    return false;
  }
}

/**
 * Validate that a size is properly formatted for MYX
 *
 * @param size - Size string (in 18-decimal format)
 * @returns True if valid
 */
export function isValidMYXSize(size: string): boolean {
  try {
    const sizeNum = BigInt(size);
    return sizeNum > 0n;
  } catch {
    return false;
  }
}

// ============================================================================
// Kline/Candle Transformation
// ============================================================================

/**
 * Transform MYX WebSocket Kline data to CandleStick format
 *
 * @param wsData - WebSocket kline data from MYX SDK
 * @returns CandleStick object
 */
export function adaptWsKlineToCandle(wsData: MYXKlineWsResponse): {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
} {
  return {
    time: wsData.data.t,
    open: wsData.data.o,
    high: wsData.data.h,
    low: wsData.data.l,
    close: wsData.data.c,
    volume: wsData.data.v,
  };
}
