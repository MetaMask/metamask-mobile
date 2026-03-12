import { getPerpsMarketInsightsAssetMetadata } from './marketInsightsRegistry';

describe('getPerpsMarketInsightsAssetMetadata', () => {
  it('returns canonical market insights metadata for mapped crypto symbols', () => {
    expect(getPerpsMarketInsightsAssetMetadata('btc')).toEqual({
      caip19Id: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      tokenAddress: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      tokenChainId: 'bip122:000000000019d6689c085ae165831e93',
      tokenDecimals: 8,
      tokenName: 'Bitcoin',
      tokenImageUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
    });

    expect(getPerpsMarketInsightsAssetMetadata('ETH')).toEqual({
      caip19Id: 'eip155:1/slip44:60',
      tokenChainId: 'eip155:1',
      tokenDecimals: 18,
      tokenName: 'Ethereum',
      tokenImageUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
    });
  });

  it('returns null for unmapped or unsupported symbols', () => {
    expect(getPerpsMarketInsightsAssetMetadata('xyz:TSLA')).toBeNull();
    expect(getPerpsMarketInsightsAssetMetadata('')).toBeNull();
    expect(getPerpsMarketInsightsAssetMetadata(null)).toBeNull();
    expect(getPerpsMarketInsightsAssetMetadata(undefined)).toBeNull();
  });
});
