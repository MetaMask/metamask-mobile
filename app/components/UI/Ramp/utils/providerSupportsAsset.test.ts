import { providerSupportsAsset } from './providerSupportsAsset';

describe('providerSupportsAsset', () => {
  const lowercaseAssetId =
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const checksummedAssetId =
    'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  it('returns true when assetId matches a lowercase key exactly', () => {
    const provider = {
      supportedCryptoCurrencies: { [lowercaseAssetId]: true },
    };
    expect(providerSupportsAsset(provider, lowercaseAssetId)).toBe(true);
  });

  it('returns true when checksummed assetId matches a lowercase key', () => {
    const provider = {
      supportedCryptoCurrencies: { [lowercaseAssetId]: true },
    };
    expect(providerSupportsAsset(provider, checksummedAssetId)).toBe(true);
  });

  it('returns false when assetId is not in the map', () => {
    const provider = {
      supportedCryptoCurrencies: { 'eip155:1/slip44:60': true },
    };
    expect(providerSupportsAsset(provider, checksummedAssetId)).toBe(false);
  });

  it('returns false when supportedCryptoCurrencies is undefined', () => {
    const provider = {};
    expect(providerSupportsAsset(provider, lowercaseAssetId)).toBe(false);
  });

  it('returns false when the map value is false', () => {
    const provider = {
      supportedCryptoCurrencies: { [lowercaseAssetId]: false },
    };
    expect(providerSupportsAsset(provider, lowercaseAssetId)).toBe(false);
  });

  it('handles native token assetIds (no hex address)', () => {
    const nativeAssetId = 'eip155:1/slip44:60';
    const provider = {
      supportedCryptoCurrencies: { [nativeAssetId]: true },
    };
    expect(providerSupportsAsset(provider, nativeAssetId)).toBe(true);
  });
});
