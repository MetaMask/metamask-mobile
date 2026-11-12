import {
  convertTrendingAssetsToImporAssets,
  type ConvertibleAsset,
} from './utils';

describe('convertTrendingAssetsToImporAssets', () => {
  it('skips entries whose assetId is not a valid CAIP asset id', () => {
    const assets = [
      { assetId: 'not-a-caip-id', name: 'Bad', symbol: 'BAD', decimals: 6 },
      {
        assetId: 'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678',
        name: 'Good',
        symbol: 'GOOD',
        decimals: 18,
      },
    ] as unknown as ConvertibleAsset[];

    const result = convertTrendingAssetsToImporAssets(assets);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      symbol: 'GOOD',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: '0x1',
    });
  });
});
