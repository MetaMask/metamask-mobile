import type { SentinelFeeTokensByChain } from '../api/sentinelFeeTokens';
import { validateSentinelFeeTokenPair } from './validateSentinelFeeTokenPair';

const ETH_ASSET_ID = 'eip155:1/slip44:60';
const USDC_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const DAI_ASSET_ID =
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';
const POLYGON_USDC_ASSET_ID =
  'eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';

const SENTINEL_FEE_TOKENS: SentinelFeeTokensByChain = {
  'eip155:1': [
    { assetId: ETH_ASSET_ID, symbol: 'DUM0' },
    { assetId: USDC_ASSET_ID, symbol: 'DUM8' },
  ],
};

describe('validateSentinelFeeTokenPair', () => {
  it('accepts a source asset listed by Sentinel', () => {
    const result = validateSentinelFeeTokenPair({
      sentinelFeeTokens: SENTINEL_FEE_TOKENS,
      chainId: 'eip155:1',
      sourceAssetId: USDC_ASSET_ID,
      destinationAssetId: DAI_ASSET_ID,
    });

    expect(result).toBe(true);
  });

  it('accepts a destination asset listed by Sentinel', () => {
    const result = validateSentinelFeeTokenPair({
      sentinelFeeTokens: SENTINEL_FEE_TOKENS,
      chainId: 'eip155:1',
      sourceAssetId: DAI_ASSET_ID,
      destinationAssetId: ETH_ASSET_ID,
    });

    expect(result).toBe(true);
  });

  it('rejects a pair when Sentinel lists neither asset', () => {
    const result = validateSentinelFeeTokenPair({
      sentinelFeeTokens: SENTINEL_FEE_TOKENS,
      chainId: 'eip155:1',
      sourceAssetId: DAI_ASSET_ID,
      destinationAssetId:
        'eip155:1/erc20:0x0000000000000000000000000000000000000001',
    });

    expect(result).toBe(false);
  });

  it('rejects a pair on a chain missing from the response', () => {
    const result = validateSentinelFeeTokenPair({
      sentinelFeeTokens: SENTINEL_FEE_TOKENS,
      chainId: 'eip155:137',
      sourceAssetId: POLYGON_USDC_ASSET_ID,
      destinationAssetId: 'eip155:137/slip44:966',
    });

    expect(result).toBe(false);
  });

  it('matches EVM asset addresses without case sensitivity', () => {
    const result = validateSentinelFeeTokenPair({
      sentinelFeeTokens: SENTINEL_FEE_TOKENS,
      chainId: 'eip155:1',
      sourceAssetId:
        'eip155:1/erc20:0xA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48',
      destinationAssetId: DAI_ASSET_ID,
    });

    expect(result).toBe(true);
  });

  it('does not match the same asset reference on another chain', () => {
    const result = validateSentinelFeeTokenPair({
      sentinelFeeTokens: SENTINEL_FEE_TOKENS,
      chainId: 'eip155:1',
      sourceAssetId:
        'eip155:137/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      destinationAssetId: DAI_ASSET_ID,
    });

    expect(result).toBe(false);
  });
});
