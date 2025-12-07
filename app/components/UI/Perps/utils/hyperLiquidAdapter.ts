import type {
  AssetPosition,
  FrontendOrder,
  ClearinghouseStateResponse,
  SpotClearinghouseStateResponse,
  MetaResponse,
  SDKOrderParams,
} from '../types/hyperliquid-types';
import { Hex, isHexString } from '@metamask/utils';
import type {
  AccountState,
  MarketInfo,
  Order,
  OrderParams as PerpsOrderParams,
  Position,
  UserHistoryItem,
} from '../controllers/types';
import { DECIMAL_PRECISION_CONFIG } from '../constants/perpsConfig';
import { HIP3_ASSET_ID_CONFIG } from '../constants/hyperLiquidConfig';

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
    // Extract available DEX names from asset map for helpful error message
    const availableDexs = new Set<string>();
    coinToAssetId.forEach((_, coin) => {
      if (coin.includes(':')) {
        const dex = coin.split(':')[0];
        availableDexs.add(dex);
      }
    });

    const dexHint =
      availableDexs.size > 0
        ? ` Available HIP-3 DEXs: ${Array.from(availableDexs).join(', ')}`
        : ' No HIP-3 DEXs currently available.';

    throw new Error(
      `Asset ${order.coin} not found in asset mapping.${dexHint} Check console logs for "HyperLiquidProvider: Asset mapping built" to see available assets.`,
    );
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
            limit: { tif: 'FrontendMarket' }, // Market orders use FrontendMarket
          },
    c:
      order.clientOrderId && isHexString(order.clientOrderId)
        ? (order.clientOrderId as Hex)
        : undefined,
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
  let takeProfitOrderId: string | undefined;
  let stopLossOrderId: string | undefined;

  // TODO: We assume that there can only be 1 TP and 1 SL as children but there can be several TPSLs as children
  // We need to handle this properly in the future
  if (rawOrder.children && rawOrder.children.length > 0) {
    rawOrder.children.forEach((child: FrontendOrder) => {
      if (child.isTrigger && child.orderType) {
        if (child.orderType.includes('Take Profit')) {
          takeProfitPrice = child.triggerPx || child.limitPx;
          takeProfitOrderId = child.oid.toString();
        } else if (child.orderType.includes('Stop')) {
          stopLossPrice = child.triggerPx || child.limitPx;
          stopLossOrderId = child.oid.toString();
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
    order.takeProfitOrderId = takeProfitOrderId;
  }
  if (stopLossPrice) {
    order.stopLossPrice = stopLossPrice;
    order.stopLossOrderId = stopLossOrderId;
  }

  return order;
}

/**
 * Transform SDK market info to MetaMask Perps API format
 * @param sdkMarket - Market metadata from HyperLiquid SDK
 * @returns MetaMask Perps API market info object
 */
export function adaptMarketFromSDK(
  sdkMarket: MetaResponse['universe'][number],
): MarketInfo {
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
 * @param perpsState - ClearinghouseState from HyperLiquid SDK
 * @param spotState - SpotClearinghouseState from HyperLiquid SDK (optional)
 * @returns MetaMask Perps API account state object
 */
export function adaptAccountStateFromSDK(
  perpsState: ClearinghouseStateResponse,
  spotState?: SpotClearinghouseStateResponse | null,
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
  const totalReturnOnEquityPercentage =
    totalMarginUsed > 0
      ? ((weightedReturnOnEquity / totalMarginUsed) * 100).toFixed(1)
      : '0.0';

  // marginSummary.accountValue includes both cross and isolated margin positions
  const perpsBalance = parseFloat(perpsState.marginSummary.accountValue);

  // Get Spot balance (if available)
  let spotBalance = 0;
  if (spotState?.balances && Array.isArray(spotState.balances)) {
    spotBalance = spotState.balances.reduce(
      (sum: number, balance: { total?: string }) =>
        sum + parseFloat(balance.total || '0'),
      0,
    );
  }

  // Calculate total account value (Spot + Perps)
  const totalBalance = (spotBalance + perpsBalance).toString();

  const accountState: AccountState = {
    availableBalance: perpsState.withdrawable || '0',
    totalBalance: totalBalance || '0',
    marginUsed: perpsState.marginSummary.totalMarginUsed || '0',
    unrealizedPnl: totalUnrealizedPnl.toString() || '0',
    returnOnEquity: totalReturnOnEquityPercentage || '0',
  };

  return accountState;
}

/**
 * Build asset symbol to ID mapping from HyperLiquid meta response
 * The API returns asset names already properly formatted (prefixed for HIP-3, unprefixed for main DEX)
 *
 * @param params - Configuration for asset mapping
 * @param params.metaUniverse - Array of asset metadata from HyperLiquid
 * @param params.dex - DEX name (kept for backward compatibility, but not used in mapping)
 * @param params.perpDexIndex - DEX index from perpDexs() array (required for HIP-3)
 * @returns Maps for bidirectional symbol/ID lookup
 *
 * @example Main DEX
 * buildAssetMapping({ metaUniverse: [{ name: "BTC" }, { name: "ETH" }], perpDexIndex: 0 })
 * // Returns: Map<"BTC", 0>, Map<"ETH", 1>
 *
 * @example HIP-3 DEX
 * buildAssetMapping({ metaUniverse: [{ name: "xyz:XYZ100" }, { name: "xyz:XYZ200" }], dex: "xyz", perpDexIndex: 1 })
 * // Returns: Map<"xyz:XYZ100", 110000>, Map<"xyz:XYZ200", 110001>
 * // Note: Uses global HIP-3 asset IDs via calculateHip3AssetId()
 */
export function buildAssetMapping(params: {
  metaUniverse: MetaResponse['universe'];
  dex?: string | null;
  perpDexIndex: number;
}): {
  coinToAssetId: Map<string, number>;
  assetIdToCoin: Map<number, string>;
} {
  const { metaUniverse, perpDexIndex } = params;
  const coinToAssetId = new Map<string, number>();
  const assetIdToCoin = new Map<number, string>();

  metaUniverse.forEach((asset, index) => {
    // Calculate global asset ID using HIP-3 formula
    // Main DEX (perpDexIndex=0): returns index directly (0, 1, 2, ...)
    // HIP-3 DEX (perpDexIndex>0): returns 100000 + perpDexIndex*10000 + index
    const assetId = calculateHip3AssetId(perpDexIndex, index);

    // HyperLiquid API returns asset names already correctly formatted:
    // - Main DEX: asset.name = "BTC", "ETH", etc. (no prefix)
    // - HIP-3 DEX: asset.name = "xyz:XYZ100", "xyz:XYZ200", etc. (already prefixed!)
    // We use asset.name as-is - no manual prefixing needed
    coinToAssetId.set(asset.name, assetId);
    assetIdToCoin.set(assetId, asset.name);
  });

  return { coinToAssetId, assetIdToCoin };
}

/**
 * Format price according to HyperLiquid validation rules
 * - Max 5 significant figures
 * - Max (MAX_PRICE_DECIMALS - szDecimals) decimal places for perps
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
  const maxDecimalPlaces =
    DECIMAL_PRECISION_CONFIG.MAX_PRICE_DECIMALS - szDecimals;

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
  const formatted = num.toFixed(szDecimals);

  // Only strip trailing zeros after decimal point, not from integers
  // e.g., "10.000" → "10", "10.5000" → "10.5", but "10" stays "10"
  if (!formatted.includes('.')) {
    return formatted; // Integer, keep as-is
  }

  // Has decimal, strip trailing zeros and decimal if needed
  return formatted.replace(/\.?0+$/, '');
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

/**
 * Calculate HIP-3 asset ID from perpDexIndex and market index
 * Formula: BASE_ASSET_ID + (perpDexIndex * DEX_MULTIPLIER) + index_in_meta
 *
 * @param perpDexIndex - DEX index from perpDexs() array (0=main, 1=xyz, 2=abc, etc.)
 * @param indexInMeta - Market index within the DEX's meta universe
 * @returns Global asset ID for HIP-3 order routing
 *
 * @example Main DEX
 * calculateHip3AssetId(0, 5) // Returns: 5 (main DEX uses index directly)
 *
 * @example xyz DEX
 * calculateHip3AssetId(1, 0) // Returns: 110000 (xyz:XYZ100)
 */
export function calculateHip3AssetId(
  perpDexIndex: number,
  indexInMeta: number,
): number {
  if (perpDexIndex === 0) {
    return indexInMeta;
  }
  return (
    HIP3_ASSET_ID_CONFIG.BASE_ASSET_ID +
    perpDexIndex * HIP3_ASSET_ID_CONFIG.DEX_MULTIPLIER +
    indexInMeta
  );
}

/**
 * Parse asset name to extract DEX and symbol
 * HIP-3 assets are prefixed with "dex:" (e.g., "xyz:XYZ100")
 * Main DEX assets have no prefix (e.g., "BTC")
 *
 * @param assetName - Asset name from HyperLiquid API
 * @returns Object with dex (null for main DEX) and symbol
 *
 * @example Main DEX
 * parseAssetName("BTC") // Returns: { dex: null, symbol: "BTC" }
 *
 * @example HIP-3 DEX
 * parseAssetName("xyz:XYZ100") // Returns: { dex: "xyz", symbol: "XYZ100" }
 */
export function parseAssetName(assetName: string): {
  dex: string | null;
  symbol: string;
} {
  const colonIndex = assetName.indexOf(':');
  if (colonIndex === -1) {
    return { dex: null, symbol: assetName };
  }
  return {
    dex: assetName.substring(0, colonIndex),
    symbol: assetName.substring(colonIndex + 1),
  };
}

/**
 * Raw HyperLiquid ledger update structure from SDK
 * This matches the actual SDK types for userNonFundingLedgerUpdates
 */
export interface RawHyperLiquidLedgerUpdate {
  hash: string;
  time: number;
  delta: {
    type: string;
    usdc?: string;
    coin?: string;
  };
}

/**
 * Transform raw HyperLiquid ledger updates to UserHistoryItem format
 * Filters for deposits and withdrawals only, extracting amount and asset information
 * @param rawLedgerUpdates - Array of raw ledger updates from HyperLiquid SDK
 * @returns Array of UserHistoryItem objects
 */
export function adaptHyperLiquidLedgerUpdateToUserHistoryItem(
  rawLedgerUpdates: RawHyperLiquidLedgerUpdate[],
): UserHistoryItem[] {
  return (rawLedgerUpdates || [])
    .filter(
      (update) =>
        // Only include deposits and withdrawals, skip other types
        update.delta.type === 'deposit' || update.delta.type === 'withdraw',
    )
    .map((update) => {
      // Extract amount and asset based on delta type
      let amount = '0';
      let asset = 'USDC';

      if ('usdc' in update.delta && update.delta.usdc) {
        amount = Math.abs(parseFloat(update.delta.usdc)).toString();
      }
      if ('coin' in update.delta && typeof update.delta.coin === 'string') {
        asset = update.delta.coin;
      }

      return {
        id: `history-${update.hash}`,
        timestamp: update.time,
        amount,
        asset,
        txHash: update.hash,
        status: 'completed' as const,
        type: update.delta.type === 'withdraw' ? 'withdrawal' : 'deposit',
        details: {
          source: '',
          bridgeContract: undefined,
          recipient: undefined,
          blockNumber: undefined,
          chainId: undefined,
          synthetic: undefined,
        },
      };
    });
}
