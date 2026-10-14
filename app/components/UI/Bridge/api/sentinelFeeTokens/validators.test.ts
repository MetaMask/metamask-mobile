import { parseSentinelFeeTokensResponse } from './validators';

const USDC_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const ETH_ASSET_ID = 'eip155:1/slip44:60';

describe('parseSentinelFeeTokensResponse', () => {
  it('normalizes CAIP-19 strings into Sentinel fee-token objects', () => {
    const response = {
      'eip155:1': [USDC_ASSET_ID, ETH_ASSET_ID],
    };

    const result = parseSentinelFeeTokensResponse(response);

    expect(result).toStrictEqual({
      'eip155:1': [
        { assetId: USDC_ASSET_ID, symbol: 'DUM8' },
        { assetId: ETH_ASSET_ID, symbol: 'DUM0' },
      ],
    });
  });

  it('preserves the final asset ID character casing in the placeholder symbol', () => {
    const mixedCaseAssetId =
      'eip155:1/erc20:0xA0b86991c6218b36c1d19d4A2e9Eb0cE3606eB4A';
    const response = {
      'eip155:1': [mixedCaseAssetId],
    };

    const result = parseSentinelFeeTokensResponse(response);

    expect(result['eip155:1']?.[0].symbol).toBe('DUMA');
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
      '0x1': [USDC_ASSET_ID],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'invalid chain ID 0x1',
    );
  });

  it('rejects non-array chain values', () => {
    const response = {
      'eip155:1': USDC_ASSET_ID,
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'expected token array for eip155:1',
    );
  });

  it('rejects malformed CAIP-19 values', () => {
    const response = {
      'eip155:1': ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      'invalid asset ID for eip155:1',
    );
  });

  it('rejects an asset grouped under another chain', () => {
    const response = {
      'eip155:137': [USDC_ASSET_ID],
    };

    expect(() => parseSentinelFeeTokensResponse(response)).toThrow(
      `asset ${USDC_ASSET_ID} does not belong to eip155:137`,
    );
  });
});
