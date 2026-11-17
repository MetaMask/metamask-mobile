import { commissionTokenAvatar } from './commissionTokenAvatar';

const USDC = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

describe('commissionTokenAvatar', () => {
  it('maps a perps token onto the Hyperliquid logo', () => {
    expect(
      commissionTokenAvatar({
        key: 'perps:BTC',
        symbol: 'BTC',
        source: 'PERPS',
      }),
    ).toEqual({
      positionId: 'perps:BTC',
      chain: 'hyperliquid',
      tokenAddress: '',
      tokenImageUrl: null,
      tokenSymbol: 'BTC',
    });
  });

  it('keeps a HIP-3 market symbol after the perps prefix', () => {
    expect(
      commissionTokenAvatar({
        key: 'perps:xyz:NVDA',
        symbol: null,
        source: 'PERPS',
      }).tokenSymbol,
    ).toBe('xyz:NVDA');
  });

  it('maps a swaps asset id onto its CAIP chain and address', () => {
    expect(
      commissionTokenAvatar({
        key: `swaps:${USDC}`,
        symbol: 'USDC',
        source: 'SWAPS',
      }),
    ).toEqual({
      positionId: `swaps:${USDC}`,
      chain: 'eip155:1',
      tokenAddress: USDC,
      tokenImageUrl: null,
      tokenSymbol: 'USDC',
    });
  });

  it('falls back to a letter when a swaps key is not an asset id', () => {
    expect(
      commissionTokenAvatar({
        key: 'swaps:eth',
        symbol: null,
        source: 'SWAPS',
      }),
    ).toEqual({
      positionId: 'swaps:eth',
      chain: '',
      tokenAddress: '',
      tokenImageUrl: null,
      tokenSymbol: 'swaps:eth',
    });
  });
});
