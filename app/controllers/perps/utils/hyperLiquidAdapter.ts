import { Hex, isHexString } from '@metamask/utils';

import {
  countSignificantFigures,
  roundToSignificantFigures,
} from './significantFigures';
import { HIP3_ASSET_ID_CONFIG } from '../constants/hyperLiquidConfig';
import { DECIMAL_PRECISION_CONFIG } from '../constants/perpsConfig';
import type {
  AccountState,
  MarketInfo,
  Order,
  OrderParams as PerpsOrderParams,
  Position,
  RawLedgerUpdate,
  UserHistoryItem,
} from '../types';
import type {
  AssetPosition,
  FrontendOrder,
  ClearinghouseStateResponse,
  SpotClearinghouseStateResponse,
  MetaResponse,
  SDKOrderParams,
} from '../types/hyperliquid-types';

type FrontendOrderWithParentTpsl = FrontendOrder & {
  takeProfitPrice?: unknown;
  stopLossPrice?: unknown;
  takeProfitOrderId?: unknown;
  stopLossOrderId?: unknown;
};

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const readOptionalOrderId = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  return undefined;
};

const getParentTpslMetadata = (
  rawOrder: FrontendOrderWithParentTpsl,
): {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  takeProfitOrderId?: string;
  stopLossOrderId?: string;
} => ({
  takeProfitPrice: readOptionalString(rawOrder.takeProfitPrice),
  stopLossPrice: readOptionalString(rawOrder.stopLossPrice),
  takeProfitOrderId: readOptionalOrderId(rawOrder.takeProfitOrderId),
  stopLossOrderId: readOptionalOrderId(rawOrder.stopLossOrderId),
});

/**
 * HyperLiquid SDK Adapter Utilities
 *
 * These functions transform between MetaMask Perps API types and HyperLiquid SDK types.
 * The SDK uses cryptic property names for efficiency, but our API uses descriptive names
 * to provide a consistent interface across different perps protocols.
 */

export function adaptOrderToSDK(
  order: PerpsOrderParams,
  symbolToAssetId: Map<string, number>,
): SDKOrderParams {
  const assetId = symbolToAssetId.get(order.symbol);
  if (assetId === undefined) {
    const availableDexs = new Set<string>();
    symbolToAssetId.forEach((_, symbol) => {
      if (symbol.includes(':')) {
        const dex = symbol.split(':')[0];
        availableDexs.add(dex);
      }
    });

    const dexHint =
      availableDexs.size > 0
        ? ` Available HIP-3 DEXs: ${Array.from(availableDexs).join(', ')}`
        : ' No HIP-3 DEXs currently available.';

    throw new Error(
      `Asset ${order.symbol} not found in asset mapping.${dexHint} Check console logs for "HyperLiquidProvider: Asset mapping built" to see available assets.`,
    );
  }

  return {
    a: assetId,
    b: order.isBuy,
    p: order.price ?? '0',
    s: order.size,
    r: order.reduceOnly ?? false,
    t:
      order.orderType === 'limit'
        ? {
            limit: { tif: 'Gtc' },
          }
        : {
            limit: { tif: 'FrontendMarket' },
          },
    c:
      order.clientOrderId && isHexString(order.clientOrderId)
        ? (order.clientOrderId as Hex)
        : undefined,
  };
}

export function adaptPositionFromSDK(assetPosition: AssetPosition): Position {
  const pos = assetPosition.position;
  return {
    symbol: pos.coin,
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
    takeProfitCount: 0,
    stopLossCount: 0,
  };
}

export function adaptOrderFromSDK(
  rawOrder: FrontendOrder,
  position?: Position,
): Order {
  // TODO: Remove this widened boundary type when FrontendOrder includes
  // takeProfitPrice/stopLossPrice and takeProfitOrderId/stopLossOrderId.
  const parentTpslMetadata = getParentTpslMetadata(
    rawOrder as FrontendOrderWithParentTpsl,
  );

  // Extract basic fields with appropriate conversions
  const orderId = rawOrder.oid.toString();
  const symbol = rawOrder.coin;
  const side: 'buy' | 'sell' = rawOrder.side === 'B' ? 'buy' : 'sell';
  const detailedOrderType = rawOrder.orderType;
  const { isTrigger } = rawOrder;
  const { reduceOnly } = rawOrder;

  let orderType: 'limit' | 'market' = 'market';
  if (detailedOrderType.toLowerCase().includes('limit') || rawOrder.limitPx) {
    orderType = 'limit';
  }

  const price = rawOrder.limitPx || rawOrder.triggerPx || '0';

  let size = rawOrder.sz;
  let originalSize = rawOrder.origSz || size;

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

  let takeProfitPrice: string | undefined;
  let stopLossPrice: string | undefined;
  let takeProfitOrderId: string | undefined;
  let stopLossOrderId: string | undefined;

  // TODO: We assume that there can only be 1 TP and 1 SL as children but there can be several TPSLs as children
  if (rawOrder.children && rawOrder.children.length > 0) {
    rawOrder.children.forEach((childUnknown) => {
      const child = childUnknown as FrontendOrder;
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

  // Fallback: preserve parent-level TP/SL metadata when children are absent.
  takeProfitPrice ??= parentTpslMetadata.takeProfitPrice;
  stopLossPrice ??= parentTpslMetadata.stopLossPrice;
  takeProfitOrderId ??= parentTpslMetadata.takeProfitOrderId;
  stopLossOrderId ??= parentTpslMetadata.stopLossOrderId;

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
    status: 'open' as const,
    timestamp: rawOrder.timestamp,
    detailedOrderType,
    isTrigger,
    reduceOnly,
  };

  if (typeof rawOrder.isPositionTpsl === 'boolean') {
    order.isPositionTpsl = rawOrder.isPositionTpsl;
  }

  if (takeProfitPrice) {
    order.takeProfitPrice = takeProfitPrice;
    order.takeProfitOrderId = takeProfitOrderId;
  }
  if (stopLossPrice) {
    order.stopLossPrice = stopLossPrice;
    order.stopLossOrderId = stopLossOrderId;
  }
  if (rawOrder.triggerPx) {
    order.triggerPrice = rawOrder.triggerPx;
  }

  return order;
}

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

export function adaptAccountStateFromSDK(
  perpsState: ClearinghouseStateResponse,
  spotState?: SpotClearinghouseStateResponse | null,
): AccountState {
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
      ? ((weightedReturnOnEquity / totalMarginUsed) * 100).toString()
      : '0';

  const perpsBalance = parseFloat(perpsState.marginSummary.accountValue);

  let spotBalance = 0;
  if (spotState?.balances && Array.isArray(spotState.balances)) {
    spotBalance = spotState.balances.reduce(
      (sum: number, balance: { total?: string }) =>
        sum + parseFloat(balance.total ?? '0'),
      0,
    );
  }

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

export function buildAssetMapping(params: {
  metaUniverse: MetaResponse['universe'];
  dex?: string | null;
  perpDexIndex: number;
}): {
  symbolToAssetId: Map<string, number>;
  assetIdToSymbol: Map<number, string>;
} {
  const { metaUniverse, perpDexIndex } = params;
  const symbolToAssetId = new Map<string, number>();
  const assetIdToSymbol = new Map<number, string>();

  metaUniverse.forEach((asset, index) => {
    const assetId = calculateHip3AssetId(perpDexIndex, index);
    symbolToAssetId.set(asset.name, assetId);
    assetIdToSymbol.set(assetId, asset.name);
  });

  return { symbolToAssetId, assetIdToSymbol };
}

export function formatHyperLiquidPrice(params: {
  price: string | number;
  szDecimals: number;
}): string {
  const { price, szDecimals } = params;
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;

  if (Number.isInteger(priceNum)) {
    return priceNum.toString();
  }

  const maxDecimalPlaces =
    DECIMAL_PRECISION_CONFIG.MaxPriceDecimals - szDecimals;

  let formattedPrice = priceNum.toFixed(maxDecimalPlaces);
  formattedPrice = parseFloat(formattedPrice).toString();

  const significantDigits = countSignificantFigures(formattedPrice);

  if (significantDigits > DECIMAL_PRECISION_CONFIG.MaxSignificantFigures) {
    formattedPrice = roundToSignificantFigures(formattedPrice);
  }

  return formattedPrice;
}

export function formatHyperLiquidSize(params: {
  size: string | number;
  szDecimals: number;
}): string {
  const { size, szDecimals } = params;
  const number = typeof size === 'string' ? parseFloat(size) : size;

  if (isNaN(number)) {
    return '0';
  }

  const formatted = number.toFixed(szDecimals);

  if (!formatted.includes('.')) {
    return formatted;
  }

  return formatted.replace(/\.?0+$/u, '');
}

export function calculatePositionSize(params: {
  usdValue: number;
  leverage: number;
  assetPrice: number;
}): number {
  const { usdValue, leverage, assetPrice } = params;
  return (usdValue * leverage) / assetPrice;
}

export function calculateHip3AssetId(
  perpDexIndex: number,
  indexInMeta: number,
): number {
  if (perpDexIndex === 0) {
    return indexInMeta;
  }
  return (
    HIP3_ASSET_ID_CONFIG.BaseAssetId +
    perpDexIndex * HIP3_ASSET_ID_CONFIG.DexMultiplier +
    indexInMeta
  );
}

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

export function adaptHyperLiquidLedgerUpdateToUserHistoryItem(
  rawLedgerUpdates: RawLedgerUpdate[],
): UserHistoryItem[] {
  return (rawLedgerUpdates || [])
    .filter((update) => {
      if (update.delta.type === 'deposit') {
        return true;
      }
      if (update.delta.type === 'withdraw') {
        return true;
      }
      if (update.delta.type === 'internalTransfer') {
        const usdc = Number.parseFloat(update.delta.usdc ?? '0');
        if (Number.isNaN(usdc)) {
          return false;
        }
        return usdc > 0;
      }
      return false;
    })
    .map((update) => {
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
