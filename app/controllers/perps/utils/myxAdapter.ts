/**
 * MYX SDK Adapter Utilities
 *
 * Adapters for transforming between MetaMask Perps API types and MYX SDK types.
 * Includes adapters for market display, positions, orders, account state, and fills.
 *
 * Portable: no mobile-specific imports.
 * Formatters are injected via MarketDataFormatters interface (same pattern as marketDataTransform.ts).
 *
 * Key differences from HyperLiquid:
 * - REST API returns human-readable strings for prices, sizes, collateral, fees, PnL
 * - Only the SDK contract layer (createIncreaseOrder) uses 18/30-decimal scaling
 * - Multiple pools can exist per symbol (MPM model)
 * - USDT collateral (vs USDC)
 */

import {
  fromMYXPrice,
  fromMYXApiSize,
  fromMYXApiCollateral,
  fromMYXCollateral,
  MYX_MAX_LEVERAGE,
  MYX_MIN_ORDER_SIZE_BUFFER,
  MYX_MINIMUM_ORDER_SIZE_USD,
  MYX_PROVIDER_ID,
} from '../constants/myxConfig';
import { DECIMAL_PRECISION_CONFIG } from '../constants/perpsConfig';
import type {
  AccountState,
  CandleStick,
  Funding,
  MarketInfo,
  Order,
  OrderFill,
  PerpsMarketData,
  Position,
  MarketDataFormatters,
  UserHistoryItem,
} from '../types';
import {
  MYX_HL_OVERLAPPING_MARKETS,
  MYXDirection,
  MYXDirectionEnum,
  MYXOperationEnum,
  MYXOperationType,
  MYXOrderStatusEnum,
  MYXOrderType,
  MYXOrderTypeEnum,
  MYXExecTypeEnum,
  MYXTradeFlowTypeEnum,
  MYXTriggerType,
} from '../types/myx-types';
import type {
  MYXNetwork,
  MYXPoolSymbol,
  MYXPoolOpenOrder,
  MYXOrderItem,
  MYXTicker,
  MYXPositionType,
  MYXHistoryOrderItem,
  MYXTradeFlowItem,
  MYXKlineData,
  MYXKlineWsData,
} from '../types/myx-types';

/**
 * Format a price change value with sign prefix.
 * Uses injected formatters (same pattern as marketDataTransform.ts formatChange).
 *
 * @param change - The price change value to format.
 * @param formatters - Injectable formatters for platform-agnostic formatting.
 * @returns The formatted change string with sign and dollar symbol.
 */
function formatChange(
  change: number,
  formatters: MarketDataFormatters,
): string {
  if (isNaN(change) || !isFinite(change)) {
    return '$0.00';
  }
  if (change === 0) {
    return '$0.00';
  }

  const formatted = formatters.formatPerpsFiat(Math.abs(change), {
    ranges: formatters.priceRangesUniversal,
  });

  const valueWithoutDollar = formatted.replace('$', '');
  return change > 0 ? `+$${valueWithoutDollar}` : `-$${valueWithoutDollar}`;
}

// ============================================================================
// Market Transformation
// ============================================================================

/**
 * Transform MYX Pool/Market info to MetaMask Perps API MarketInfo format
 *
 * @param pool - Pool symbol data from MYX SDK (PoolSymbolAllResponse)
 * @param poolMinOrderSizeUsd - Per-pool minimum order size in USD (from getPoolLevelConfig)
 * @returns MetaMask Perps API market info object
 */
export function adaptMarketFromMYX(
  pool: MYXPoolSymbol,
  poolMinOrderSizeUsd?: number,
): MarketInfo {
  // Extract base symbol from pool data
  const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);

  // MYX has no exchange-defined size step (unlike HyperLiquid).
  // Use the app-wide fallback which caps at 6 decimals per perps-rules-decimals.md.
  return {
    name: symbol,
    szDecimals: DECIMAL_PRECISION_CONFIG.FallbackSizeDecimals,
    maxLeverage: MYX_MAX_LEVERAGE,
    marginTableId: 0, // MYX doesn't use margin tables like HyperLiquid
    minimumOrderSize: Math.round(
      Math.max(poolMinOrderSizeUsd ?? 0, MYX_MINIMUM_ORDER_SIZE_USD) *
        MYX_MIN_ORDER_SIZE_BUFFER,
    ),
    providerId: MYX_PROVIDER_ID,
  };
}

/**
 * Convert MYX ticker data to price and change values
 *
 * @param ticker - Ticker data from MYX SDK
 * @returns Object with price string and 24h change percentage
 */
export function adaptPriceFromMYX(ticker: MYXTicker): {
  price: string;
  change24h: number;
} {
  // MYX API returns normal float strings (e.g. "64854.76")
  const priceNum = fromMYXPrice(ticker.price);

  // Change is provided as a percentage string (e.g., "2.5" means 2.5%)
  const change24h = ticker.change ? parseFloat(ticker.change) : 0;

  return {
    price: priceNum.toString(),
    change24h,
  };
}

/**
 * Transform MYX pool and ticker to PerpsMarketData for UI display
 *
 * @param pool - Pool symbol data from MYX SDK
 * @param ticker - Optional ticker data for price info
 * @param formatters - Injectable formatters for platform-agnostic formatting
 * @returns Formatted market data for UI display
 */
export function adaptMarketDataFromMYX(
  pool: MYXPoolSymbol,
  ticker: MYXTicker | undefined,
  formatters: MarketDataFormatters,
): PerpsMarketData {
  const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);

  // Get price data from ticker if available
  let price = '0';
  let change24h = 0;
  let volume = '0';

  if (ticker) {
    const priceData = adaptPriceFromMYX(ticker);
    price = priceData.price;
    change24h = priceData.change24h;
    // Volume is already in USD (not 30-decimal format)
    volume = ticker.volume || '0';
  }

  // Format using injected formatters (consistent with HyperLiquid via marketDataTransform.ts)
  const priceNum = parseFloat(price);
  const formattedPrice = formatters.formatPerpsFiat(priceNum);
  const priceChange = priceNum * (change24h / 100);
  const formattedChange = formatChange(priceChange, formatters);
  const formattedChangePercent = formatters.formatPercentage(change24h);
  const formattedVolume = formatters.formatVolume(parseFloat(volume));

  return {
    symbol,
    name: getTokenName(symbol),
    maxLeverage: `${MYX_MAX_LEVERAGE}x`,
    price: formattedPrice,
    change24h: formattedChange,
    change24hPercent: formattedChangePercent,
    volume: formattedVolume,
    providerId: MYX_PROVIDER_ID,
  };
}

// ============================================================================
// Market Filtering
// ============================================================================

/**
 * Filter MYX markets to only include MYX-exclusive markets
 * Removes markets that overlap with HyperLiquid
 *
 * @param pools - Array of MYX pool symbols
 * @returns Filtered array with only MYX-exclusive markets
 */
export function filterMYXExclusiveMarkets(
  pools: MYXPoolSymbol[],
): MYXPoolSymbol[] {
  return pools.filter((pool) => {
    const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
    // Exclude markets that overlap with HyperLiquid
    return !MYX_HL_OVERLAPPING_MARKETS.includes(
      symbol as (typeof MYX_HL_OVERLAPPING_MARKETS)[number],
    );
  });
}

/**
 * Check if a symbol overlaps with HyperLiquid markets
 *
 * @param symbol - Market symbol to check
 * @returns true if the symbol is available on both MYX and HyperLiquid
 */
export function isOverlappingMarket(symbol: string): boolean {
  return MYX_HL_OVERLAPPING_MARKETS.includes(
    symbol as (typeof MYX_HL_OVERLAPPING_MARKETS)[number],
  );
}

// ============================================================================
// Pool ID Utilities
// ============================================================================

/**
 * Build a map of poolId to symbol for quick lookup
 *
 * @param pools - Array of MYX pool symbols
 * @returns Map of poolId to symbol
 */
export function buildPoolSymbolMap(
  pools: MYXPoolSymbol[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const pool of pools) {
    const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
    map.set(pool.poolId, symbol);
  }
  return map;
}

/**
 * Build a map of symbol to poolIds (for multi-pool support)
 *
 * @param pools - Array of MYX pool symbols
 * @returns Map of symbol to array of poolIds
 */
export function buildSymbolPoolsMap(
  pools: MYXPoolSymbol[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const pool of pools) {
    const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
    const existing = map.get(symbol) ?? [];
    existing.push(pool.poolId);
    map.set(symbol, existing);
  }
  return map;
}

/**
 * Extract symbol from pool ID
 * Pool IDs typically contain the symbol as a suffix or can be parsed.
 * When baseSymbol is unavailable, returns a truncated address for UI display.
 *
 * @param poolId - MYX pool ID string
 * @returns Extracted symbol or truncated poolId as fallback
 */
export function extractSymbolFromPoolId(poolId: string): string {
  // Pool IDs in MYX are hex addresses ("0x...")
  // The actual symbol comes from the pool's baseSymbol field
  // Truncate hex addresses so they're UI-friendly
  if (poolId.startsWith('0x') && poolId.length > 10) {
    return `${poolId.slice(0, 6)}...${poolId.slice(-4)}`;
  }
  return poolId;
}

/**
 * Get full token name from symbol
 * Returns the symbol as name if not found (MYX-specific tokens)
 *
 * @param symbol - The market symbol to look up.
 * @returns The human-readable token name, or the symbol itself if not found.
 */
function getTokenName(symbol: string): string {
  const tokenNames: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    BNB: 'BNB',
    MYX: 'MYX Protocol',
    RHEA: 'Rhea Finance',
    PARTI: 'Particle Network',
    SKYAI: 'SkyAI',
    PUMP: 'PumpFun',
    WLFI: 'World Liberty Financial',
  };

  return tokenNames[symbol] || symbol;
}

// ============================================================================
// Position Adapter
// ============================================================================

/**
 * Adapt MYX SDK PositionType to MetaMask Position
 *
 * @param pos - MYX position from SDK
 * @param poolSymbolMap - Map of poolId to symbol
 * @param markPrice - Optional current mark price for PnL/liq calculation
 * @returns MetaMask Position object
 */
export function adaptPositionFromMYX(
  pos: MYXPositionType,
  poolSymbolMap: Map<string, string>,
  markPrice?: number,
): Position {
  const symbol = poolSymbolMap.get(pos.poolId) ?? pos.poolId;
  const sizeNum = fromMYXApiSize(pos.size);
  const entryPriceNum = fromMYXPrice(pos.entryPrice);
  const collateralNum = fromMYXApiCollateral(pos.collateralAmount);

  // Direction: 0 = LONG (positive size), 1 = SHORT (negative size)
  const isLong = pos.direction === MYXDirection.LONG;
  const signedSize = isLong ? sizeNum : -sizeNum;

  // Position value = size * entry price
  const positionValue = Math.abs(sizeNum * entryPriceNum);

  // Leverage: prefer SDK runtime field, fall back to calculation
  const runtimePos = pos as unknown as { userLeverage?: number };
  const leverage =
    runtimePos.userLeverage ??
    (collateralNum > 0 ? Math.round(positionValue / collateralNum) : 1);

  // PnL: calculate from mark price if available
  const pnl = markPrice ? (markPrice - entryPriceNum) * signedSize : 0;

  // Liquidation price (isolated margin approximation)
  let liquidationPrice: string | null = null;
  if (leverage > 0 && entryPriceNum > 0) {
    const liqPrice = isLong
      ? entryPriceNum * (1 - 1 / leverage)
      : entryPriceNum * (1 + 1 / leverage);
    liquidationPrice = liqPrice.toString();
  }

  const roe = collateralNum > 0 ? pnl / collateralNum : 0;

  return {
    symbol,
    size: signedSize.toString(),
    entryPrice: entryPriceNum.toString(),
    positionValue: positionValue.toString(),
    unrealizedPnl: pnl.toString(),
    marginUsed: collateralNum.toString(),
    leverage: {
      type: 'isolated',
      value: leverage,
      rawUsd: collateralNum.toString(),
    },
    liquidationPrice,
    maxLeverage: MYX_MAX_LEVERAGE,
    returnOnEquity: roe.toString(),
    cumulativeFunding: {
      allTime: '0',
      sinceOpen: '0',
      sinceChange: '0',
    },
    takeProfitPrice: undefined,
    stopLossPrice: undefined,
    takeProfitCount: 0,
    stopLossCount: 0,
    providerId: MYX_PROVIDER_ID,
  };
}

// ============================================================================
// Order Adapter
// ============================================================================

/**
 * Adapt MYX SDK open order (PositionType-shaped from getOrders) to MetaMask Order.
 * Note: getOrders returns PositionType[] per the SDK types.
 * For richer order data, use getOrderHistory.
 *
 * @param historyOrder - MYX history order item
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask Order object
 */
export function adaptOrderFromMYX(
  historyOrder: MYXHistoryOrderItem,
  poolSymbolMap: Map<string, string>,
): Order {
  const symbol =
    historyOrder.baseSymbol ??
    poolSymbolMap.get(historyOrder.poolId) ??
    historyOrder.poolId;

  const priceNum = fromMYXPrice(historyOrder.price);
  const sizeNum = fromMYXApiSize(historyOrder.size);
  const filledSizeNum = fromMYXApiSize(historyOrder.filledSize);
  const remainingSize = Math.max(0, sizeNum - filledSizeNum);

  // Map direction
  const side: 'buy' | 'sell' =
    historyOrder.direction === MYXDirectionEnum.Long ? 'buy' : 'sell';

  // Map order type
  let orderType: 'market' | 'limit' = 'market';
  if (historyOrder.orderType === MYXOrderTypeEnum.Limit) {
    orderType = 'limit';
  }

  // Map status
  let status: Order['status'];
  switch (historyOrder.orderStatus) {
    case MYXOrderStatusEnum.Successful:
    case MYXOrderStatusEnum.PartialFilled:
      status = 'filled';
      break;
    case MYXOrderStatusEnum.Cancelled:
    case MYXOrderStatusEnum.Expired:
      status = 'canceled';
      break;
    default:
      status = 'open';
  }

  // Override: fully filled orders may have stale API status
  if (remainingSize === 0 && filledSizeNum > 0) {
    status = 'filled';
  }

  // Detect trigger orders
  const isTrigger =
    historyOrder.execType === MYXExecTypeEnum.TP ||
    historyOrder.execType === MYXExecTypeEnum.SL;
  let detailedOrderType: string | undefined;
  if (historyOrder.execType === MYXExecTypeEnum.TP) {
    detailedOrderType = 'Take Profit';
  } else if (historyOrder.execType === MYXExecTypeEnum.SL) {
    detailedOrderType = 'Stop Loss';
  } else if (historyOrder.execType === MYXExecTypeEnum.Liquidation) {
    detailedOrderType = 'Liquidation';
  }

  return {
    orderId: String(historyOrder.orderId),
    symbol,
    side,
    orderType,
    size: sizeNum.toString(),
    originalSize: sizeNum.toString(),
    price: priceNum.toString(),
    filledSize: filledSizeNum.toString(),
    remainingSize: remainingSize.toString(),
    status,
    timestamp: historyOrder.txTime,
    isTrigger,
    detailedOrderType,
    reduceOnly:
      historyOrder.operation === MYXOperationEnum.Decrease ? true : undefined,
    providerId: MYX_PROVIDER_ID,
  };
}

/**
 * Adapt MYX pool open order (pending limit/trigger) to MetaMask Order.
 *
 * PoolOpenOrder represents pending TP/SL or limit orders that can be cancelled.
 * This is the MYX equivalent of Hyperliquid's "open orders".
 *
 * @param order - MYX pool open order from getPoolOpenOrders
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask Order object
 */
export function adaptPoolOpenOrderFromMYX(
  order: MYXPoolOpenOrder,
  poolSymbolMap: Map<string, string>,
): Order {
  const symbol = poolSymbolMap.get(order.poolId) ?? order.poolId;
  const triggerPriceNum = fromMYXPrice(order.triggerPrice);
  const sizeNum = fromMYXApiSize(order.amount);

  // triggerType: 1 = TP, 2 = SL
  const isTP = order.triggerType === 1;
  const isTrigger = true;
  const detailedOrderType = isTP ? 'Take Profit' : 'Stop Loss';

  // PoolOpenOrder does not include direction; default to 'sell' (reduce-only).
  // TP/SL orders are always reduce-only, closing existing positions.
  const side: 'buy' | 'sell' = 'sell';

  return {
    orderId: String(order.orderId),
    symbol,
    side,
    orderType: 'limit',
    size: sizeNum.toString(),
    originalSize: sizeNum.toString(),
    price: triggerPriceNum.toString(),
    filledSize: '0',
    remainingSize: sizeNum.toString(),
    status: 'open',
    timestamp: order.txTime,
    isTrigger,
    detailedOrderType,
    reduceOnly: true,
    providerId: MYX_PROVIDER_ID,
  };
}

/**
 * Adapt MYX OrderItem (from order.getOrders) to MetaMask Order.
 *
 * order.getOrders() returns active/pending orders (limit, trigger).
 * Unlike getPoolOpenOrders (which requires an access token that may be null),
 * this endpoint works reliably with just the user address.
 *
 * @param order - MYX OrderItem from order.getOrders
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask Order object
 */
export function adaptOrderItemFromMYX(
  order: MYXOrderItem,
  poolSymbolMap: Map<string, string>,
): Order {
  const symbol =
    order.baseSymbol ?? poolSymbolMap.get(order.poolId) ?? order.poolId;

  const priceNum = fromMYXPrice(order.price);
  const sizeNum = fromMYXApiSize(order.size);
  const filledSizeNum = fromMYXApiSize(order.filledSize);
  const remainingSize = Math.max(0, sizeNum - filledSizeNum);

  const side: 'buy' | 'sell' =
    order.direction === MYXDirection.LONG ? 'buy' : 'sell';
  const isTrigger =
    order.orderType === MYXOrderType.STOP ||
    order.orderType === MYXOrderType.CONDITIONAL;
  const orderType: 'market' | 'limit' =
    order.orderType === MYXOrderType.LIMIT ? 'limit' : 'market';
  const reduceOnly =
    order.operation === MYXOperationType.DECREASE ? true : undefined;
  // TP/SL trigger orders are tied to the full position (decrease with trigger)
  const isPositionTpsl =
    isTrigger && order.operation === MYXOperationType.DECREASE;

  // Determine if this is a TP or SL based on triggerType:
  // For LONG positions: TP triggers when price >= target (GTE=1), SL when price <= target (LTE=2)
  // For SHORT positions: TP triggers when price <= target (LTE=2), SL when price >= target (GTE=1)
  let detailedOrderType: string | undefined;
  if (isTrigger) {
    const isLong = order.direction === MYXDirection.LONG;
    const isGTE = order.triggerType === MYXTriggerType.GTE;
    const isTakeProfit = isLong ? isGTE : !isGTE;
    detailedOrderType = isTakeProfit ? 'Take Profit' : 'Stop Loss';
  }

  return {
    orderId: String(order.orderId),
    symbol,
    side,
    orderType,
    size: sizeNum.toString(),
    originalSize: sizeNum.toString(),
    price: priceNum.toString(),
    filledSize: filledSizeNum.toString(),
    remainingSize: remainingSize.toString(),
    status: 'open',
    timestamp: order.txTime,
    isTrigger,
    isPositionTpsl,
    triggerPrice: isTrigger ? priceNum.toString() : undefined,
    detailedOrderType,
    reduceOnly,
    providerId: MYX_PROVIDER_ID,
  };
}

// ============================================================================
// Account State Adapter
// ============================================================================

/**
 * Parse MYX getAccountInfo response.
 *
 * SDK <1.0: 7-element array (tuple) [freeAmount, walletBalance, ...]
 * SDK 1.0.2+: keyed object with freeMargin, walletBalance, freeBaseAmount,
 * baseProfit, quoteProfit, reservedAmount, releaseTime
 *
 * @param data - Raw response data (array or object)
 * @returns Parsed account fields as strings
 */
// SDK AccountInfo type (from @myx-trade/sdk v1.0.6):
//   { freeMargin, walletBalance, freeBaseAmount, baseProfit, quoteProfit,
//     reservedAmount, releaseTime }
//
// Mapping to our internal representation:
//   SDK field        | MYX UI label              | Our field
//   -----------------|---------------------------|------------------
//   freeMargin       | Free Margin               | freeAmount
//   walletBalance    | Wallet Balance            | walletBalance
//   reservedAmount   | Reserved Amount           | reservedAmount
//   quoteProfit      | Locked Realized PnL USDC  | lockedRealizedPnl
//   freeBaseAmount   | Withdrawable META         | (not mapped)
//   baseProfit       | Locked Realized PnL META  | (not mapped)
//   releaseTime      | Unlock timer              | (not mapped)
//
// Note: the SDK does NOT return orderHoldInUSD, totalCollateral, or unrealizedPnl.
// Those were assumed in an earlier version. Unrealized PnL comes from positions,
// not from getAccountInfo().
function parseAccountTuple(data: unknown): {
  freeAmount: string;
  walletBalance: string;
  reservedAmount: string;
  orderHoldInUSD: string;
  totalCollateral: string;
  lockedRealizedPnl: string;
  unrealizedPnl: string;
} {
  const zero = {
    freeAmount: '0',
    walletBalance: '0',
    reservedAmount: '0',
    orderHoldInUSD: '0',
    totalCollateral: '0',
    lockedRealizedPnl: '0',
    unrealizedPnl: '0',
  };

  const str = (val: unknown): string =>
    typeof val === 'string' || typeof val === 'number' ? String(val) : '0';

  if (Array.isArray(data)) {
    return {
      freeAmount: str(data[0]),
      walletBalance: str(data[1]),
      reservedAmount: str(data[2]),
      orderHoldInUSD: str(data[3]),
      totalCollateral: str(data[4]),
      lockedRealizedPnl: str(data[5]),
      unrealizedPnl: str(data[6]),
    };
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    return {
      freeAmount: str(obj.freeMargin ?? obj.freeAmount),
      walletBalance: str(obj.walletBalance),
      reservedAmount: str(obj.reservedAmount),
      orderHoldInUSD: '0',
      totalCollateral: '0',
      lockedRealizedPnl: str(obj.quoteProfit ?? obj.lockedRealizedPnl),
      unrealizedPnl: '0',
    };
  }

  return zero;
}

/**
 * Adapt MYX account info response to MetaMask AccountState.
 *
 * Balance formula (validated via PoC showAccount.ts):
 * availableBalance = freeAmount + walletBalance
 * totalBalance = freeAmount + walletBalance + reservedAmount + unrealizedPnl
 * marginUsed = reservedAmount
 *
 * Tuple values are in token-native decimals (USDT=18, USDC=6).
 *
 * @param accountInfo - Raw account info from MYX SDK (7-element tuple or keyed object)
 * @param network - 'mainnet' or 'testnet' (for collateral decimal scaling)
 * @param positions - Active positions for weighted ROE calculation
 * @returns MetaMask AccountState
 */
export function adaptAccountStateFromMYX(
  accountInfo: unknown,
  network: MYXNetwork = 'mainnet',
  positions?: Position[],
): AccountState {
  // MYX getAccountInfo() returns an AccountInfo object. Mapping to AccountState:
  //
  //   SDK field        | MYX UI label              | AccountState field
  //   -----------------|---------------------------|-------------------
  //   freeMargin       | Free Margin               | (part of availableBalance)
  //   walletBalance    | Wallet Balance            | (part of availableBalance)
  //   reservedAmount   | Reserved Amount           | marginUsed
  //   quoteProfit      | Locked Realized PnL USDC  | NOT MAPPED (parsed but not in AccountState)
  //   freeBaseAmount   | Withdrawable META         | NOT MAPPED (base-asset, not quote)
  //   baseProfit       | Locked Realized PnL META  | NOT MAPPED (base-asset, not quote)
  //   releaseTime      | Unlock timer              | NOT MAPPED
  //
  // Unrealized PnL is NOT in getAccountInfo() — it comes from summing
  // position-level unrealized PnL via getPositions().
  //
  // The "NOT MAPPED" quote fields could be exposed via subAccountBreakdown
  // if the UI needs the full MYX margin breakdown.
  const acct = parseAccountTuple(accountInfo);

  const freeAmount = fromMYXCollateral(acct.freeAmount, network);
  const walletBal = fromMYXCollateral(acct.walletBalance, network);
  const reservedAmount = fromMYXCollateral(acct.reservedAmount, network);

  // Unrealized PnL is not in getAccountInfo() — sum from positions
  let unrealizedPnl = 0;
  let returnOnEquity = '0';
  if (positions && positions.length > 0) {
    let weightedRoe = 0;
    let totalMargin = 0;
    for (const pos of positions) {
      unrealizedPnl += Number.parseFloat(pos.unrealizedPnl || '0');
      const roe = Number.parseFloat(pos.returnOnEquity || '0');
      const margin = Number.parseFloat(pos.marginUsed || '0');
      weightedRoe += roe * margin;
      totalMargin += margin;
    }
    returnOnEquity =
      totalMargin > 0 ? ((weightedRoe / totalMargin) * 100).toString() : '0';
  }

  const availableBalance = freeAmount + walletBal;
  const totalBalance = freeAmount + walletBal + reservedAmount + unrealizedPnl;
  const marginUsed = reservedAmount;

  return {
    availableBalance: availableBalance.toString(),
    totalBalance: totalBalance.toString(),
    marginUsed: marginUsed.toString(),
    unrealizedPnl: unrealizedPnl.toString(),
    returnOnEquity,
  };
}

// ============================================================================
// Order Fill Adapter
// ============================================================================

/**
 * Adapt MYX history order item (filled) to MetaMask OrderFill
 *
 * @param order - MYX history order item
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask OrderFill
 */
export function adaptOrderFillFromMYX(
  order: MYXHistoryOrderItem,
  poolSymbolMap: Map<string, string>,
): OrderFill {
  const symbol =
    order.baseSymbol ?? poolSymbolMap.get(order.poolId) ?? order.poolId;
  const sizeNum = fromMYXApiSize(order.filledSize || order.size);
  const priceNum = fromMYXPrice(order.lastPrice || order.price);
  const side = order.direction === MYXDirectionEnum.Long ? 'buy' : 'sell';
  const feeNum = fromMYXApiCollateral(order.tradingFee || '0');
  const pnlNum = fromMYXApiCollateral(order.realizedPnl || '0');

  let orderType: OrderFill['orderType'] = 'regular';
  if (order.execType === MYXExecTypeEnum.TP) {
    orderType = 'take_profit';
  } else if (order.execType === MYXExecTypeEnum.SL) {
    orderType = 'stop_loss';
  } else if (order.execType === MYXExecTypeEnum.Liquidation) {
    orderType = 'liquidation';
  }

  // Map direction to UI-expected format: "Open Long", "Close Short", etc.
  const isIncrease = order.operation === MYXOperationEnum.Increase;
  const isLong = order.direction === MYXDirectionEnum.Long;
  const directionLabel = `${isIncrease ? 'Open' : 'Close'} ${isLong ? 'Long' : 'Short'}`;

  return {
    orderId: String(order.orderId),
    symbol,
    side,
    size: sizeNum.toString(),
    price: priceNum.toString(),
    pnl: pnlNum.toString(),
    direction: directionLabel,
    fee: feeNum.toString(),
    feeToken: 'USDT',
    timestamp: order.txTime,
    success: order.orderStatus === MYXOrderStatusEnum.Successful,
    orderType,
    providerId: MYX_PROVIDER_ID,
  };
}

// ============================================================================
// Funding Adapter
// ============================================================================

/**
 * Adapt MYX trade flow items (funding type) to MetaMask Funding
 *
 * @param flows - MYX trade flow items filtered to funding type
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns Array of MetaMask Funding objects
 */
export function adaptFundingFromMYX(
  flows: MYXTradeFlowItem[],
  poolSymbolMap: Map<string, string>,
): Funding[] {
  return flows
    .filter(
      (flow) =>
        flow.fundingFee && flow.fundingFee !== '0' && flow.fundingFee !== '',
    )
    .map((flow) => {
      const symbol = poolSymbolMap.get(flow.poolId) ?? flow.poolId;
      const amountUsd = fromMYXApiCollateral(flow.fundingFee);
      return {
        symbol,
        amountUsd: amountUsd.toString(),
        rate: undefined, // Funding rate not available in MYX trade flow data
        timestamp: flow.txTime,
        transactionHash: flow.txHash,
      };
    });
}

// ============================================================================
// User History Adapter
// ============================================================================

/**
 * Adapt MYX trade flow items to MetaMask UserHistoryItem
 *
 * @param flows - MYX trade flow items
 * @returns Array of UserHistoryItem
 */
export function adaptUserHistoryFromMYX(
  flows: MYXTradeFlowItem[],
): UserHistoryItem[] {
  return flows
    .filter(
      (flow) =>
        flow.type === MYXTradeFlowTypeEnum.MarginAccountDeposit ||
        flow.type === MYXTradeFlowTypeEnum.TransferToWallet,
    )
    .map((flow) => {
      const isDeposit = flow.type === MYXTradeFlowTypeEnum.MarginAccountDeposit;
      const amount = fromMYXApiCollateral(flow.collateralAmount || '0');
      return {
        id: String(flow.orderId),
        timestamp: flow.txTime,
        type: isDeposit ? 'deposit' : 'withdrawal',
        amount: Math.abs(amount).toString(),
        asset: 'USDT',
        txHash: flow.txHash,
        status: 'completed' as const,
        details: {
          source: 'myx',
        },
      };
    });
}

// ============================================================================
// Candle (Kline) Adapter
// ============================================================================

/**
 * Adapt MYX KlineDataItemType to MetaMask CandleStick.
 * KlineDataItemType fields (time, open, close, high, low) are already
 * human-readable strings — no 30-decimal conversion needed.
 *
 * @param item - MYX kline data item from SDK
 * @returns MetaMask CandleStick object
 */
export function adaptCandleFromMYX(item: MYXKlineData): CandleStick {
  return {
    time: item.time,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: '0', // KlineDataItemType has no volume field
  };
}

/**
 * Adapt MYX WebSocket KlineData to MetaMask CandleStick.
 * WS KlineData uses single-letter fields: {t, o, h, l, c, v}.
 *
 * @param data - MYX WebSocket kline data
 * @returns MetaMask CandleStick object
 */
export function adaptCandleFromMYXWebSocket(data: MYXKlineWsData): CandleStick {
  return {
    time: data.t,
    open: data.o,
    high: data.h,
    low: data.l,
    close: data.c,
    volume: data.v,
  };
}

/**
 * Map CandlePeriod values to MYX KlineResolution.
 * MYX SDK supports: '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'.
 * Unsupported CandlePeriod values are mapped to the nearest supported resolution.
 */
const CANDLE_PERIOD_TO_MYX_RESOLUTION: Record<string, string> = {
  '1m': '1m',
  '3m': '5m', // No 3m → use 5m
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '4h', // No 2h → use 4h
  '4h': '4h',
  '8h': '4h', // No 8h → use 4h
  '12h': '1d', // No 12h → use 1d
  '1d': '1d',
  '3d': '1w', // No 3d → use 1w
  '1w': '1w',
  '1M': '1M',
};

/**
 * Convert a CandlePeriod string to MYX KlineResolution.
 *
 * @param period - CandlePeriod value (e.g., '1m', '3m', '1h')
 * @returns MYX KlineResolution string
 */
export function toMYXKlineResolution(period: string): string {
  return CANDLE_PERIOD_TO_MYX_RESOLUTION[period] ?? '1h';
}

// ============================================================================
// Response Validation
// ============================================================================

/**
 * Assert MYX API response is successful.
 * MYX uses code 9200 or 0 for success.
 *
 * @param response - MYX API response with code field
 * @param response.code - Response code (9200 or 0 = success)
 * @param response.message - Optional error message
 * @param context - Context string for error messages
 */
export function assertMYXSuccess(
  response: { code: number; message?: string | null },
  context: string,
): void {
  if (response.code !== 9200 && response.code !== 0) {
    throw new Error(
      `MYX ${context} failed: code=${response.code} message=${response.message ?? 'unknown'}`,
    );
  }
}
