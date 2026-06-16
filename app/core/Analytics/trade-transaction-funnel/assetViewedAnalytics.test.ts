import {
  ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE,
  ASSET_VIEWED_PROPERTY,
  mergeAssetViewedProperties,
} from './assetViewedAnalytics';

describe('mergeAssetViewedProperties', () => {
  it('appends trade_type and implementation_type after base properties', () => {
    expect(
      mergeAssetViewedProperties('Swaps', { chain_id_source: '1' }),
    ).toEqual({
      chain_id_source: '1',
      [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: 'Swaps',
      [ASSET_VIEWED_PROPERTY.IMPLEMENTATION_TYPE]:
        ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE,
    });
  });

  it('does not let base properties override unified keys', () => {
    expect(
      mergeAssetViewedProperties('Predict', {
        trade_type: 'should-not-win',
        implementation_type: 'should-not-win',
      }),
    ).toEqual({
      trade_type: 'Predict',
      implementation_type: 'native',
    });
  });

  it('maps Perps open_position to open_positions_count on Asset Viewed', () => {
    expect(
      mergeAssetViewedProperties('Perps', {
        open_position: 3,
        screen_type: 'home',
      }),
    ).toEqual({
      screen_type: 'home',
      [ASSET_VIEWED_PROPERTY.OPEN_POSITIONS_COUNT]: 3,
      [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: 'Perps',
      [ASSET_VIEWED_PROPERTY.IMPLEMENTATION_TYPE]:
        ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE,
    });
  });

  it('keeps Predict open_positions_count under the unified Asset Viewed key', () => {
    expect(
      mergeAssetViewedProperties('Predict', {
        open_positions_count: 7,
        market_id: 'm1',
      }),
    ).toEqual({
      market_id: 'm1',
      [ASSET_VIEWED_PROPERTY.OPEN_POSITIONS_COUNT]: 7,
      [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: 'Predict',
      [ASSET_VIEWED_PROPERTY.IMPLEMENTATION_TYPE]:
        ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE,
    });
  });

  it('maps openPositionsCount camelCase to open_positions_count on Asset Viewed', () => {
    expect(
      mergeAssetViewedProperties('Predict', { openPositionsCount: 2 }),
    ).toEqual({
      [ASSET_VIEWED_PROPERTY.OPEN_POSITIONS_COUNT]: 2,
      [ASSET_VIEWED_PROPERTY.TRADE_TYPE]: 'Predict',
      [ASSET_VIEWED_PROPERTY.IMPLEMENTATION_TYPE]:
        ASSET_VIEWED_IMPLEMENTATION_TYPE_NATIVE,
    });
  });
});
