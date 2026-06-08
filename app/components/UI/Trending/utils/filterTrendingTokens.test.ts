import type { TrendingAsset } from '@metamask/assets-controllers';
import { filterLowQualityTokens } from './filterTrendingTokens';

const buildToken = (overrides: Partial<TrendingAsset> = {}): TrendingAsset =>
  ({
    assetId: 'eip155:1/erc20:0xaaa',
    symbol: 'TOK',
    name: 'Token',
    decimals: 18,
    price: '1.00',
    aggregatedUsdVolume: 1_000_000,
    marketCap: 5_000_000,
    ...overrides,
  }) as unknown as TrendingAsset;

describe('filterLowQualityTokens', () => {
  it('keeps tokens with valid symbol, name, and no security issues', () => {
    const tokens = [
      buildToken({ symbol: 'ETH', name: 'Ether' }),
      buildToken({ symbol: 'USDC', name: 'USD Coin' }),
    ];

    expect(filterLowQualityTokens(tokens)).toHaveLength(2);
  });

  it('keeps Verified and Benign tokens', () => {
    const tokens = [
      buildToken({
        symbol: 'VER',
        securityData: {
          resultType: 'Verified',
        } as TrendingAsset['securityData'],
      }),
      buildToken({
        symbol: 'BEN',
        securityData: { resultType: 'Benign' } as TrendingAsset['securityData'],
      }),
    ];

    expect(filterLowQualityTokens(tokens).map((t) => t.symbol)).toEqual([
      'VER',
      'BEN',
    ]);
  });

  it('keeps unscanned tokens (no securityData)', () => {
    const tokens = [buildToken({ symbol: 'UNS', securityData: undefined })];

    expect(filterLowQualityTokens(tokens)).toHaveLength(1);
  });

  it('keeps Warning tokens', () => {
    const tokens = [
      buildToken({
        symbol: 'WRN',
        securityData: {
          resultType: 'Warning',
        } as TrendingAsset['securityData'],
      }),
    ];

    expect(filterLowQualityTokens(tokens)).toHaveLength(1);
  });

  it('keeps Spam tokens', () => {
    const tokens = [
      buildToken({
        symbol: 'SPM',
        securityData: { resultType: 'Spam' } as TrendingAsset['securityData'],
      }),
    ];

    expect(filterLowQualityTokens(tokens)).toHaveLength(1);
  });

  it('keeps Malicious tokens', () => {
    const tokens = [
      buildToken({
        symbol: 'MAL',
        securityData: {
          resultType: 'Malicious',
        } as TrendingAsset['securityData'],
      }),
    ];

    expect(filterLowQualityTokens(tokens)).toHaveLength(1);
  });

  it('removes tokens with empty symbol', () => {
    const tokens = [buildToken({ symbol: '' })];

    expect(filterLowQualityTokens(tokens)).toHaveLength(0);
  });

  it('removes tokens with whitespace-only symbol', () => {
    const tokens = [buildToken({ symbol: '   ' })];

    expect(filterLowQualityTokens(tokens)).toHaveLength(0);
  });

  it('removes tokens with empty name', () => {
    const tokens = [buildToken({ name: '' })];

    expect(filterLowQualityTokens(tokens)).toHaveLength(0);
  });

  it('removes tokens with whitespace-only name', () => {
    const tokens = [buildToken({ name: '   ' })];

    expect(filterLowQualityTokens(tokens)).toHaveLength(0);
  });

  it('only filters out tokens missing symbol/name, keeps risky tokens', () => {
    const tokens = [
      buildToken({ symbol: 'GOOD', name: 'Good Token' }),
      buildToken({ symbol: '', name: 'No Ticker' }),
      buildToken({
        symbol: 'RISKY',
        name: 'Risky Token',
        securityData: {
          resultType: 'Warning',
        } as TrendingAsset['securityData'],
      }),
      buildToken({
        symbol: 'SAFE',
        name: 'Safe Token',
        securityData: undefined,
      }),
    ];

    expect(filterLowQualityTokens(tokens).map((t) => t.symbol)).toEqual([
      'GOOD',
      'RISKY',
      'SAFE',
    ]);
  });

  it('returns empty array when all tokens lack symbol/name', () => {
    const tokens = [buildToken({ symbol: '' }), buildToken({ name: '' })];

    expect(filterLowQualityTokens(tokens)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterLowQualityTokens([])).toHaveLength(0);
  });
});
