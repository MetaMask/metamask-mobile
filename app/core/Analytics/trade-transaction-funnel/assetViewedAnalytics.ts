/**
 * Trade Transaction funnel — unified Segment "Asset Viewed" payload helpers.
 * "Asset Viewed" is emitted alongside legacy `Predict Market Details Opened`,
 * `Perp Screen Viewed`, and `Unified SwapBridge Page Viewed` events.
 */
export const ASSET_VIEWED_PROPERTY = {
  TRADE_TYPE: 'trade_type',
  IMPLEMENTATION_TYPE: 'implementation_type',
} as const;

export type AssetViewedTradeType = 'Predict' | 'Perps' | 'Swaps';

export const ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE = 'native' as const;

export function mergeAssetViewedProperties(
  tradeType: AssetViewedTradeType,
  baseProperties: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...baseProperties,
    [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: tradeType,
    [ASSET_VIEWED_PROPERTY.IMPLEMENTATION_TYPE]:
      ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE,
  };
}
