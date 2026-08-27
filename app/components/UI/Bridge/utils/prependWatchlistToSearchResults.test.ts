import type { BridgeToken } from '../types';
import { prependWatchlistToSearchResults } from './prependWatchlistToSearchResults';

const makeToken = (
  overrides: Partial<BridgeToken & { assetId: string }> = {},
): BridgeToken & { assetId: string } => ({
  assetId: 'eip155:1/slip44:60',
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  chainId: '0x1',
  ...overrides,
});

describe('prependWatchlistToSearchResults', () => {
  it('places watchlist matches before search results', () => {
    const watchlistMatches = [
      makeToken({ assetId: 'eip155:1/slip44:60', symbol: 'ETH' }),
    ];
    const searchResults = [
      makeToken({
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
      }),
    ];

    const result = prependWatchlistToSearchResults(
      watchlistMatches,
      searchResults,
    );

    expect(result.map((token) => token.symbol)).toStrictEqual(['ETH', 'USDC']);
  });

  it('dedupes overlapping assets in favor of watchlist matches', () => {
    const watchlistMatches = [
      makeToken({ assetId: 'eip155:1/slip44:60', symbol: 'ETH' }),
    ];
    const searchResults = [
      makeToken({ assetId: 'eip155:1/slip44:60', symbol: 'ETH' }),
      makeToken({
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
      }),
    ];

    const result = prependWatchlistToSearchResults(
      watchlistMatches,
      searchResults,
    );

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe('ETH');
    expect(result[1].symbol).toBe('USDC');
  });
});
