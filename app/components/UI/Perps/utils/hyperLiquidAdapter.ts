import type { OrderParams as SDKOrderParams } from '@deeeed/hyperliquid-node20/esm/src/types/exchange/requests';
import type {
  AssetPosition,
  PerpsClearinghouseState,
  SpotClearinghouseState,
} from '@deeeed/hyperliquid-node20/esm/src/types/info/accounts';
import type { PerpsUniverse } from '@deeeed/hyperliquid-node20/esm/src/types/info/assets';
import type { FrontendOrder } from '@deeeed/hyperliquid-node20/esm/src/types/info/orders';
import { isHexString } from '@metamask/utils';
import type {
  AccountState,
  MarketInfo,
  Order,
  OrderParams as PerpsOrderParams,
  Position,
} from '../controllers/types';

/**
 * HyperLiquid SDK Adapter Utilities
 *
 * These functions transform between MetaMask Perps API types and HyperLiquid SDK types.
 * The SDK uses cryptic property names for efficiency, but our API uses descriptive names
 * to provide a consistent interface across different perps protocols.
 */

/**
 * Transform MetaMask Perps API OrderParams to HyperLiquid SDK format
 * @param order - MetaMask Perps order parameters
 * @param coinToAssetId - Mapping from coin symbols to asset IDs
 * @returns HyperLiquid SDK-compatible order parameters
 */
export function adaptOrderToSDK(
  order: PerpsOrderParams,
  coinToAssetId: Map<string, number>,
): SDKOrderParams {
  const assetId = coinToAssetId.get(order.coin);
  if (assetId === undefined) {
    throw new Error(`Unknown asset: ${order.coin}`);
  }

  return {
    a: assetId,
    b: order.isBuy,
    p: order.price || '0',
    s: order.size,
    r: order.reduceOnly || false,
    t:
      order.orderType === 'limit'
        ? {
            limit: { tif: 'Gtc' },
          }
        : {
            limit: { tif: 'Ioc' },
          },
    c:
      order.clientOrderId && isHexString(order.clientOrderId)
        ? (order.clientOrderId as `0x${string}`)
        : null,
  };
}

/**
 * Transform SDK AssetPosition to MetaMask Perps API format
 * @param assetPosition - AssetPosition data from HyperLiquid SDK
 * @returns MetaMask Perps API position object
 */
export function adaptPositionFromSDK(assetPosition: AssetPosition): Position {
  const pos = assetPosition.position;
  return {
    coin: pos.coin,
    size: pos.szi,
    entryPrice: pos.entryPx,
    positionValue: pos.positionValue,
    unrealizedPnl: pos.unrealizedPnl,
    marginUsed: pos.marginUsed,
    leverage: {
      type: pos.leverage.type,
      value: pos.leverage.value,
      rawUsd:
        pos.leverage.type === 'isolated' ? pos.leverage.rawUsd : undefined,
    },
    liquidationPrice: pos.liquidationPx,
    maxLeverage: pos.maxLeverage,
    returnOnEquity: pos.returnOnEquity,
    cumulativeFunding: pos.cumFunding,
    takeProfitCount: 0, // Default value, will be updated by provider logic
    stopLossCount: 0, // Default value, will be updated by provider logic
  };
}

/**
 * Transform HyperLiquid SDK order to MetaMask Perps API format
 * Handles both REST API responses (FrontendOrder) and WebSocket data formats
 * @param rawOrder - Raw order data from HyperLiquid SDK (frontendOpenOrders or webData2)
 * @returns MetaMask Perps API order object
 */
export function adaptOrderFromSDK(
  rawOrder: FrontendOrder,
  position?: Position,
): Order {
  // Extract basic fields with appropriate conversions
  const orderId = rawOrder.oid.toString();
  const symbol = rawOrder.coin;

  // Convert side: HyperLiquid uses 'B' for Buy and 'A' for Ask (Sell)
  const side: 'buy' | 'sell' = rawOrder.side === 'B' ? 'buy' : 'sell';

  // Get detailed order type from API
  const detailedOrderType = rawOrder.orderType;

  // Determine if this is a trigger order (TP/SL)
  const isTrigger = rawOrder.isTrigger;
  const reduceOnly = rawOrder.reduceOnly;

  // Determine basic order type
  let orderType: 'limit' | 'market' = 'market';
  if (detailedOrderType.toLowerCase().includes('limit') || rawOrder.limitPx) {
    orderType = 'limit';
  }

  // For trigger orders (TP/SL), use triggerPx as the price
  const price = rawOrder.limitPx || rawOrder.triggerPx || '0';

  // Sizes
  let size = rawOrder.sz;
  let originalSize = rawOrder.origSz || size;

  // Calculate filled and remaining size
  let currentSize = parseFloat(size);
  let origSize = parseFloat(originalSize);

  if (rawOrder.isPositionTpsl && origSize === 0 && position) {
    const absPositionSize = Math.abs(parseFloat(position.size));
    currentSize = absPositionSize;
    origSize = absPositionSize;
    size = absPositionSize.toString();
    originalSize = absPositionSize.toString();
  }

  const filledSize = origSize - currentSize;

  // Check for TP/SL in child orders (REST API feature)
  let takeProfitPrice: string | undefined;
  let stopLossPrice: string | undefined;

  if (rawOrder.children && rawOrder.children.length > 0) {
    rawOrder.children.forEach((child) => {
      if (child.isTrigger && child.orderType) {
        if (child.orderType.includes('Take Profit')) {
          takeProfitPrice = child.triggerPx || child.limitPx;
        } else if (child.orderType.includes('Stop')) {
          stopLossPrice = child.triggerPx || child.limitPx;
        }
      }
    });
  }

  // Build the order object
  const order: Order = {
    orderId,
    symbol,
    side,
    orderType,
    size,
    originalSize,
    price,
    filledSize: filledSize.toString(),
    remainingSize: size,
    status: 'open' as const, // All orders from frontendOpenOrders/webData2 are open
    timestamp: rawOrder.timestamp,
    detailedOrderType,
    isTrigger,
    reduceOnly,
  };

  // Add optional fields if they exist
  if (takeProfitPrice) {
    order.takeProfitPrice = takeProfitPrice;
  }
  if (stopLossPrice) {
    order.stopLossPrice = stopLossPrice;
  }

  return order;
}

/**
 * Transform SDK market info to MetaMask Perps API format
 * @param sdkMarket - Market metadata from HyperLiquid SDK
 * @returns MetaMask Perps API market info object
 */
export function adaptMarketFromSDK(sdkMarket: PerpsUniverse): MarketInfo {
  return {
    name: sdkMarket.name,
    szDecimals: sdkMarket.szDecimals,
    maxLeverage: sdkMarket.maxLeverage,
    marginTableId: sdkMarket.marginTableId,
    onlyIsolated: sdkMarket.onlyIsolated,
    isDelisted: sdkMarket.isDelisted,
  };
}

/**
 * Transform SDK clearinghouse state to MetaMask Perps API AccountState
 * @param perpsState - PerpsClearinghouseState from HyperLiquid SDK
 * @param spotState - SpotClearinghouseState from HyperLiquid SDK (optional)
 * @returns MetaMask Perps API account state object
 */
export function adaptAccountStateFromSDK(
  perpsState: PerpsClearinghouseState,
  spotState?: SpotClearinghouseState,
): AccountState {
  // Calculate total unrealized PnL from all positions
  const { totalUnrealizedPnl, weightedReturnOnEquity } =
    perpsState.assetPositions.reduce(
      (acc, assetPos: AssetPosition) => {
        const unrealizedPnl = parseFloat(
          assetPos.position.unrealizedPnl || '0',
        );
        const marginUsed = parseFloat(assetPos.position.marginUsed || '0');
        const returnOnEquity = parseFloat(
          assetPos.position.returnOnEquity || '0',
        );
        acc.totalUnrealizedPnl += unrealizedPnl;
        acc.weightedReturnOnEquity += returnOnEquity * marginUsed;
        return acc;
      },
      {
        totalUnrealizedPnl: 0,
        weightedReturnOnEquity: 0,
      },
    );
  const totalMarginUsed = parseFloat(
    perpsState.marginSummary.totalMarginUsed || '0',
  );
  const totalReturnOnEquityPercentage = (
    (weightedReturnOnEquity / totalMarginUsed) *
    100
  ).toFixed(1);

  // TODO: BALANCE DISPLAY DECISION NEEDED
  //
  // We need to decide what balance information to show to users:
  //
  // OPTIONS:
  // 1. Perps-only balance (current): Only show Perps account value
  //    - totalBalance: perpsState.crossMarginSummary.accountValue (~$31.13)
  //    - Pros: Focused on trading balance, matches other perps platforms
  //    - Cons: Doesn't show user's full HyperLiquid account value
  //
  // 2. Combined balance: Show Spot + Perps total account value
  //    - totalBalance: spotBalance + perpsBalance (~$81.39)
  //    - Pros: Shows complete account picture, matches HyperLiquid UI
  //    - Cons: May confuse users about available trading capital
  //
  // 3. Separate fields: Show both balances distinctly
  //    - spotBalance: $50.26, perpsBalance: $31.13, totalBalance: $81.39
  //    - Pros: Maximum clarity and transparency
  //    - Cons: More complex UI, need to update AccountState interface
  //
  // CURRENT IMPLEMENTATION: Option 2 (Combined balance)
  // This matches the HyperLiquid web UI behavior but should be reviewed

  // Get Perps balance
  const perpsBalance = parseFloat(perpsState.crossMarginSummary.accountValue);

  // Get Spot balance (if available)
  let spotBalance = 0;
  if (spotState?.balances) {
    spotBalance = spotState.balances.reduce(
      (sum: number, balance: { total?: string }) =>
        sum + parseFloat(balance.total || '0'),
      0,
    );
  }

  // Calculate total account value (Spot + Perps)
  const totalBalance = (spotBalance + perpsBalance).toString();

  const accountState: AccountState = {
    availableBalance: perpsState.withdrawable || '0', // Always Perps withdrawable
    totalBalance: totalBalance || '0', // Combined or Perps-only? See TODO above
    marginUsed: perpsState.marginSummary.totalMarginUsed || '0', // margin used including cross margin
    unrealizedPnl: totalUnrealizedPnl.toString() || '0',
    returnOnEquity: totalReturnOnEquityPercentage || '0',
    totalValue: perpsState.marginSummary.accountValue || '0', // vaults + margin + pnl + perps balance
  };

  return accountState;
}

/**
 * Build asset symbol to ID mapping from HyperLiquid meta response
 * @param metaUniverse - Array of asset metadata from HyperLiquid
 * @returns Maps for bidirectional symbol/ID lookup
 */
export function buildAssetMapping(metaUniverse: PerpsUniverse[]): {
  coinToAssetId: Map<string, number>;
  assetIdToCoin: Map<number, string>;
} {
  const coinToAssetId = new Map<string, number>();
  const assetIdToCoin = new Map<number, string>();

  metaUniverse.forEach((asset, index) => {
    coinToAssetId.set(asset.name, index);
    assetIdToCoin.set(index, asset.name);
  });

  return { coinToAssetId, assetIdToCoin };
}

/**
 * Format price according to HyperLiquid validation rules
 * - Max 5 significant figures
 * - Max (6 - szDecimals) decimal places for perps
 * - Integer prices always allowed
 * @param params - Price formatting parameters
 * @returns Properly formatted price string
 */
export function formatHyperLiquidPrice(params: {
  price: string | number;
  szDecimals: number;
}): string {
  const { price, szDecimals } = params;
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;

  // Integer prices are always allowed
  if (Number.isInteger(priceNum)) {
    return priceNum.toString();
  }

  // Calculate max decimal places allowed
  const maxDecimalPlaces = 6 - szDecimals;

  // Format with proper decimal places
  let formattedPrice = priceNum.toFixed(maxDecimalPlaces);

  // Remove trailing zeros
  formattedPrice = parseFloat(formattedPrice).toString();

  // Check significant figures (max 5)
  const [integerPart, decimalPart = ''] = formattedPrice.split('.');
  const significantDigits =
    integerPart.replace(/^0+/, '').length + decimalPart.length;

  if (significantDigits > 5) {
    // Need to reduce precision to maintain max 5 significant figures
    const totalDigits = integerPart.length + decimalPart.length;
    const digitsToRemove = totalDigits - 5;

    if (digitsToRemove > 0 && decimalPart.length > 0) {
      const newDecimalPlaces = Math.max(0, decimalPart.length - digitsToRemove);
      formattedPrice = priceNum.toFixed(newDecimalPlaces);
      formattedPrice = parseFloat(formattedPrice).toString();
    }
  }

  return formattedPrice;
}

/**
 * Format order size with asset-specific decimal precision
 * @param params - Size formatting parameters
 * @returns Properly formatted size string with trailing zeros removed
 */
export function formatHyperLiquidSize(params: {
  size: string | number;
  szDecimals: number;
}): string {
  const { size, szDecimals } = params;
  const num = typeof size === 'string' ? parseFloat(size) : size;

  if (isNaN(num)) return '0';

  // Use asset-specific decimal precision and remove trailing zeros
  return num.toFixed(szDecimals).replace(/\.?0+$/, '');
}

/**
 * Calculate position size for a given USD value and leverage
 * @param params - Position size calculation parameters
 * @returns Raw position size (before formatting)
 */
export function calculatePositionSize(params: {
  usdValue: number;
  leverage: number;
  assetPrice: number;
}): number {
  const { usdValue, leverage, assetPrice } = params;
  return (usdValue * leverage) / assetPrice;
}
