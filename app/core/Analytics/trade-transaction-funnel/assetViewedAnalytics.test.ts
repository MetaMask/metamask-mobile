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
});
