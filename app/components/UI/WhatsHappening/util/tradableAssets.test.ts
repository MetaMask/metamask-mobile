import { isRelatedAssetTradable } from './tradableAssets';

const tradableSymbols = new Set(['BTC', 'ETH', 'xyz:TSLA', 'xyz:EUR']);

const btcAsset = {
  sourceAssetId: 'btc',
  symbol: 'BTC',
  name: 'Bitcoin',
  caip19: [],
  hlPerpsMarket: ['BTC'],
};

const dxyAsset = {
  sourceAssetId: 'dxy',
  symbol: 'DXY',
  name: 'Dollar Index',
  caip19: [],
  hlPerpsMarket: ['xyz:DXY'],
};

const eurAsset = {
  sourceAssetId: 'eur',
  symbol: 'EUR',
  name: 'Euro',
  caip19: [],
  hlPerpsMarket: ['xyz:EUR'],
};

const nonPerpsAsset = {
  sourceAssetId: 'usdc',
  symbol: 'USDC',
  name: 'USD Coin',
  caip19: ['eip155:1/erc20:0xusdc'],
};

describe('isRelatedAssetTradable', () => {
  it('returns true for a tradable perps asset', () => {
    expect(isRelatedAssetTradable(btcAsset, tradableSymbols)).toBe(true);
  });

  it('returns false for a perps asset whose market is not tradable (e.g. xyz:DXY)', () => {
    expect(isRelatedAssetTradable(dxyAsset, tradableSymbols)).toBe(false);
  });

  it('returns true for a tradable HIP-3 perps asset', () => {
    expect(isRelatedAssetTradable(eurAsset, tradableSymbols)).toBe(true);
  });

  it('returns true for a non-perps asset regardless of tradable set', () => {
    expect(isRelatedAssetTradable(nonPerpsAsset, tradableSymbols)).toBe(true);
  });

  it('returns true for a non-perps asset even with an empty tradable set', () => {
    expect(isRelatedAssetTradable(nonPerpsAsset, new Set())).toBe(true);
  });

  it('returns false for a perps asset when tradable set is empty (markets still loading)', () => {
    expect(isRelatedAssetTradable(btcAsset, new Set())).toBe(false);
  });

  it('returns false for a perps asset with an empty hlPerpsMarket array (edge case)', () => {
    const assetNoMarket = { ...btcAsset, hlPerpsMarket: [] };
    expect(isRelatedAssetTradable(assetNoMarket, tradableSymbols)).toBe(true);
  });
});
