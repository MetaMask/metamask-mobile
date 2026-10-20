import { parseSentinelFeeTokensResponse } from './validators';

const USDC_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ETH_ASSET_ID = 'eip155:1/slip44:60';

const USDC_TOKEN = {
  assetId: USDC_ASSET_ID,
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
  iconUrl: 'https://static.cx.metamask.io/usdc.png',
};
const ETH_TOKEN = {
  assetId: ETH_ASSET_ID,
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  name: 'Ether',
  iconUrl: 'https://static.cx.metamask.io/eth.png',
};

describe('parseSentinelFeeTokensResponse', () => {
  it('normalizes token objects into Sentinel fee tokens', () => {
    const response = {
      'eip155:1': [USDC_TOKEN, ETH_TOKEN],
    };

    const result = parseSentinelFeeTokensResponse(response);

    expect(result).toStrictEqual({
      'eip155:1': [
        { assetId: USDC_ASSET_ID, symbol: 'USDC' },
        { assetId: ETH_ASSET_ID, symbol: 'ETH' },
      ],
    });
  });

  it('accepts tokens with extra fields such as an alias address', () => {
    const response = {
      'eip155:1': [
        {
          ...USDC_TOKEN,
          aliasAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        },
      ],
    };

    const result = parseSentinelFeeTokensResponse(response);

    expect(result).toStrictEqual({
      'eip155:1': [{ assetId: USDC_ASSET_ID, symbol: 'USDC' }],
    });
  });

  it('accepts an empty response', () => {
    const result = parseSentinelFeeTokensResponse({});

    expect(result).toStrictEqual({});
  });

  it('rejects a non-object response', () => {
    expect(() => parseSentinelFeeTokensResponse([])).toThrow('expected object');
  });

  it('rejects malformed CAIP-2 keys', () => {
    const response = {
      '0x1': [USDC_TOKEN],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'invalid chain ID 0x1',
    );
  });

  it('rejects non-array chain values', () => {
    const response = {
      'eip155:1': USDC_TOKEN,
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'expected token array for eip155:1',
    );
  });

  it('rejects plain asset ID strings', () => {
    const response = {
      'eip155:1': [USDC_ASSET_ID],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'expected token object for eip155:1',
    );
  });

  it('rejects malformed CAIP-19 values', () => {
    const response = {
      'eip155:1': [
        {
          ...USDC_TOKEN,
          assetId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        },
      ],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'invalid asset ID for eip155:1',
    );
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['non-string', 6],
  ])('rejects a %s symbol', (_, symbol) => {
    const response = {
      'eip155:1': [{ ...USDC_TOKEN, symbol }],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      `invalid symbol for ${USDC_ASSET_ID}`,
    );
  });

  it('rejects an asset grouped under another chain', () => {
    const response = {
      'eip155:137': [USDC_TOKEN],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      `asset ${USDC_ASSET_ID} does not belong to eip155:137`,
    );
  });
});
