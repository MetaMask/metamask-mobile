import type {
  OrderParams as PerpsOrderParams,
  Position,
  MarketInfo,
  AccountState,
  HLAssetPosition,
  HLMarketInfo,
} from '../controllers/types';
import type {
  OrderParams as SDKOrderParams
} from '@deeeed/hyperliquid-node20/esm/src/types/exchange/requests';
import type { PerpsClearinghouseState, AssetPosition, SpotClearinghouseState } from '@deeeed/hyperliquid-node20/esm/src/types/info/accounts';

/**
 * HyperLiquid SDK Adapter Utilities
 *
 * These functions transform between human-readable API types and HyperLiquid SDK types.
 * The SDK uses cryptic property names for efficiency, but our API uses descriptive names.
 */

/**
 * Type guard to validate hex string format for client order ID
 */
function isValidHexString(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]+$/.test(value);
}

/**
 * Transform human-readable OrderParams to SDK format
 * @param order - Human-readable order parameters
 * @param coinToAssetId - Mapping from coin symbols to asset IDs
 * @returns SDK-compatible order parameters
 */
export function adaptOrderToSDK(
  order: PerpsOrderParams,
  coinToAssetId: Map<string, number>
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
    t: order.orderType === 'limit' ? {
      limit: { tif: 'Gtc' }
    } : {
      limit: { tif: 'Ioc' }
    },
    c: order.clientOrderId && isValidHexString(order.clientOrderId) ? order.clientOrderId : null
  };
}

/**
 * Transform SDK AssetPosition to human-readable format
 * @param assetPosition - AssetPosition data from HyperLiquid SDK
 * @returns Human-readable position object
 */
export function adaptPositionFromSDK(assetPosition: HLAssetPosition): Position {
  const pos = assetPosition.position;
  return {
    coin: pos.coin,
    size: pos.szi,
    entryPrice: pos.entryPx,
    positionValue: pos.positionValue,
    unrealizedPnl: pos.unrealizedPnl,
    marginUsed: pos.marginUsed,
    leverage: pos.leverage,
    liquidationPrice: pos.liquidationPx,
    maxLeverage: pos.maxLeverage,
    returnOnEquity: pos.returnOnEquity,
    cumulativeFunding: pos.cumFunding
  };
}

/**
 * Transform SDK market info to human-readable format
 * @param sdkMarket - Market metadata from HyperLiquid SDK
 * @returns Human-readable market info object
 */
export function adaptMarketFromSDK(sdkMarket: HLMarketInfo): MarketInfo {
  return {
    name: sdkMarket.name,
    szDecimals: sdkMarket.szDecimals,
    maxLeverage: sdkMarket.maxLeverage,
    marginTableId: sdkMarket.marginTableId,
    onlyIsolated: sdkMarket.onlyIsolated,
    isDelisted: sdkMarket.isDelisted
  };
}

/**
 * Transform SDK clearinghouse state to human-readable AccountState
 * @param perpsState - PerpsClearinghouseState from HyperLiquid SDK
 * @param spotState - SpotClearinghouseState from HyperLiquid SDK (optional)
 * @returns Human-readable account state object
 */
export function adaptAccountStateFromSDK(
  perpsState: PerpsClearinghouseState,
  spotState?: SpotClearinghouseState
): AccountState {
  // Calculate total unrealized PnL from all positions
  const totalUnrealizedPnl = perpsState.assetPositions
    .reduce((sum: number, assetPos: AssetPosition) => sum + parseFloat(assetPos.position.unrealizedPnl), 0)
    .toString();

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
    spotBalance = spotState.balances.reduce((sum: number, balance: { total?: string }) =>
      sum + parseFloat(balance.total || '0'), 0);
  }

  // Calculate total account value (Spot + Perps)
  const totalBalance = (spotBalance + perpsBalance).toString();

  return {
    availableBalance: perpsState.withdrawable, // Always Perps withdrawable
    totalBalance, // Combined or Perps-only? See TODO above
    marginUsed: perpsState.crossMarginSummary.totalMarginUsed,
    unrealizedPnl: totalUnrealizedPnl,
  };
}

/**
 * Build asset symbol to ID mapping from HyperLiquid meta response
 * @param metaUniverse - Array of asset metadata from HyperLiquid
 * @returns Maps for bidirectional symbol/ID lookup
 */
export function buildAssetMapping(metaUniverse: HLMarketInfo[]): {
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

