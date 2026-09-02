import {
  createMockIncludeAsset,
  createMockPopularToken,
} from '../testUtils/fixtures';
import { mergeIncludedAssetsWithApiResults } from './mergeIncludedAssetsWithApiResults';

describe('mergeIncludedAssetsWithApiResults', () => {
  it('appends included assets that are missing from the API response', () => {
    const apiResults = [
      createMockPopularToken({
        assetId: 'eip155:5042/slip44:5042',
        symbol: 'USDC',
        name: 'USDC',
      }),
    ];
    const includeAssets = [
      createMockIncludeAsset({
        assetId: 'eip155:5042/erc20:0x3600000000000000000000000000000000000000',
        symbol: 'USDC',
        name: 'USDC',
      }),
      createMockIncludeAsset({
        assetId: 'eip155:5042/erc20:0xbef5f6d51cb62b58e6a8f77868681825c6fe21c1',
        symbol: 'EURC',
        name: 'EURC',
      }),
    ];

    expect(
      mergeIncludedAssetsWithApiResults(apiResults, includeAssets),
    ).toEqual([...apiResults, ...includeAssets]);
  });

  it('dedupes exact asset-id overlaps while preserving API ordering', () => {
    const apiToken = createMockPopularToken({
      assetId: 'eip155:5042/erc20:0xbef5f6d51cb62b58e6a8f77868681825c6fe21c1',
      symbol: 'EURC',
      name: 'EURC',
    });
    const duplicateIncludeAsset = createMockIncludeAsset({
      assetId: 'eip155:5042/erc20:0xbef5f6d51cb62b58e6a8f77868681825c6fe21c1',
      symbol: 'EURC',
      name: 'EURC',
    });

    expect(
      mergeIncludedAssetsWithApiResults([apiToken], [duplicateIncludeAsset]),
    ).toEqual([apiToken]);
  });
});
