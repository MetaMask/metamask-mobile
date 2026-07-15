/**
 * Trade Transaction funnel — unified Segment "Asset Viewed" payload helpers.
 * "Asset Viewed" is emitted alongside legacy `Predict Market Details Opened`,
 * `Perp Screen Viewed`, and `Unified SwapBridge Page Viewed` events.
 */
export const ASSET_VIEWED_PROPERTY = {
  TRADE_TYPE: 'trade_type',
  IMPLEMENTATION_TYPE: 'implementation_type',
  OPEN_POSITIONS_COUNT: 'open_positions_count',
} as const;

export type AssetViewedTradeType = 'Predict' | 'Perps' | 'Swaps';

export const ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE = 'native' as const;

/**
 * Product-specific keys for open position count on legacy events.
 * Mapped to {@link ASSET_VIEWED_PROPERTY.OPEN_POSITIONS_COUNT} on Asset Viewed only.
 */
const ASSET_VIEWED_OPEN_POSITIONS_SOURCE_KEYS = [
  ASSET_VIEWED_PROPERTY.OPEN_POSITIONS_COUNT,
  'open_position',
  'openPositionsCount',
] as const;

function resolveOpenPositionsCount(
  properties: Record<string, unknown>,
): number | undefined {
  for (const key of ASSET_VIEWED_OPEN_POSITIONS_SOURCE_KEYS) {
    const value = properties[key];
    if (value === undefined || value === null) {
      continue;
    }
    const count = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(count)) {
      return count;
    }
  }
  return undefined;
}

function normalizeAssetViewedBaseProperties(
  baseProperties: Record<string, unknown>,
): Record<string, unknown> {
  const openPositionsCount = resolveOpenPositionsCount(baseProperties);
  const normalized = { ...baseProperties };

  for (const key of ASSET_VIEWED_OPEN_POSITIONS_SOURCE_KEYS) {
    delete normalized[key];
  }

  if (openPositionsCount !== undefined) {
    normalized[ASSET_VIEWED_PROPERTY.OPEN_POSITIONS_COUNT] = openPositionsCount;
  }

  return normalized;
}

export function mergeAssetViewedProperties(
  tradeType: AssetViewedTradeType,
  baseProperties: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...normalizeAssetViewedBaseProperties(baseProperties),
    [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: tradeType,
    [ASSET_VIEWED_PROPERTY.IMPLEMENTATION_TYPE]:
      ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE,
  };
}
