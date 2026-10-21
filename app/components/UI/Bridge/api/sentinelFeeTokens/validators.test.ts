import { parseSentinelFeeTokensResponse } from './validators';

const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDC_ASSET_ID = `eip155:1/erc20:${USDC_ADDRESS}`;
const ETH_ASSET_ID = 'eip155:1/slip44:60';
const USDC_TOKEN = {
  assetId: USDC_ASSET_ID,
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  name: 'USD Coin',
  iconUrl: 'https://static.cx.metamask.io/usdc.png',
};

describe('parseSentinelFeeTokensResponse', () => {
  it('returns Sentinel fee-token metadata grouped by CAIP-2 chain', () => {
    const response = {
      'eip155:1': [
        USDC_TOKEN,
        {
          assetId: ETH_ASSET_ID,
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
        },
      ],
    };

    const result = parseSentinelFeeTokensResponse(response);

    expect(result).toStrictEqual(response);
  });

  it('accepts additional token metadata', () => {
    const response = {
      'eip155:1': [{ ...USDC_TOKEN, additionalMetadata: 'value' }],
    };

    const result = parseSentinelFeeTokensResponse(response);

    expect(result).toStrictEqual(response);
  });

  it('accepts an empty response', () => {
    const result = parseSentinelFeeTokensResponse({});

    expect(result).toStrictEqual({});
  });

  it('rejects a non-object response', () => {
    expect(() => parseSentinelFeeTokensResponse([])).toThrow(
      'Expected an object',
    );
  });

  it('rejects malformed CAIP-2 keys', () => {
    const response = {
      '0x1': [USDC_TOKEN],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'CaipChainId',
    );
  });

  it('rejects non-array chain values', () => {
    const response = {
      'eip155:1': USDC_TOKEN,
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'Expected an array',
    );
  });

  it('rejects non-object tokens', () => {
    const response = {
      'eip155:1': [USDC_ASSET_ID],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'Expected an object',
    );
  });

  it('rejects malformed CAIP-19 asset IDs', () => {
    const response = {
      'eip155:1': [{ ...USDC_TOKEN, assetId: USDC_ADDRESS }],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'CaipAssetType',
    );
  });

  it.each([
    ['missing', undefined, 'Expected a string'],
    ['empty', '', 'Expected a non-empty string'],
    ['non-string', 6, 'Expected a string'],
  ])('rejects a %s symbol', (_, symbol, expectedError) => {
    const response = {
      'eip155:1': [{ ...USDC_TOKEN, symbol }],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      expectedError,
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

  it('rejects an empty address', () => {
    const response = {
      'eip155:1': [{ ...USDC_TOKEN, address: '' }],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'Expected a non-empty string',
    );
  });

  it.each([-1, 1.5, '6'])('rejects invalid decimals %s', (decimals) => {
    const response = {
      'eip155:1': [{ ...USDC_TOKEN, decimals }],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(/integer/u);
  });

  it('rejects invalid optional metadata', () => {
    const response = {
      'eip155:1': [{ ...USDC_TOKEN, aliasAddress: 1 }],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'Expected a string',
    );
  });
});
