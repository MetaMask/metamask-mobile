import { MOCK_CHAIN_IDS } from '../testUtils/fixtures';
import type { BridgeToken } from '../types';
import { filterWatchlistBridgeTokens } from './filterWatchlistBridgeTokens';

const makeToken = (
  overrides: Partial<BridgeToken & { assetId: string }> = {},
): BridgeToken & { assetId: string } => ({
  assetId: 'eip155:1/slip44:60',
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  chainId: '0x1',
  balance: '1',
  tokenFiatAmount: 100,
  ...overrides,
});

describe('filterWatchlistBridgeTokens', () => {
  const tokens = [
    makeToken({
      assetId: 'eip155:1/slip44:60',
      symbol: 'ETH',
      tokenFiatAmount: 3000,
      balance: '2',
    }),
    makeToken({
      assetId: 'eip155:137/slip44:60',
      symbol: 'POL',
      chainId: '0x89',
      tokenFiatAmount: 50,
      balance: '10',
    }),
    makeToken({
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      tokenFiatAmount: 0,
      balance: '0',
    }),
  ];

  it('filters by selected network', () => {
    const result = filterWatchlistBridgeTokens(tokens, {
      selectedChainId: MOCK_CHAIN_IDS.ethereum,
    });

    expect(result.map((token) => token.symbol)).toStrictEqual(['ETH', 'USDC']);
  });

  it('keeps zero-balance tokens', () => {
    const result = filterWatchlistBridgeTokens(tokens, {});

    expect(result.map((token) => token.symbol)).toStrictEqual([
      'ETH',
      'POL',
      'USDC',
    ]);
  });

  it('filters tokens locally by search query', () => {
    const result = filterWatchlistBridgeTokens(tokens, {
      searchQuery: 'usd',
    });

    expect(result.map((token) => token.symbol)).toStrictEqual(['USDC']);
  });

  it('sorts tokens by fiat balance descending', () => {
    const result = filterWatchlistBridgeTokens(tokens, {});

    expect(result.map((token) => token.symbol)).toStrictEqual([
      'ETH',
      'POL',
      'USDC',
    ]);
  });

  describe('allowedChainIds', () => {
    it('restricts results to the allowed chains when no specific chain is selected', () => {
      const result = filterWatchlistBridgeTokens(tokens, {
        allowedChainIds: [MOCK_CHAIN_IDS.ethereum],
      });

      expect(result.map((token) => token.symbol)).toStrictEqual([
        'ETH',
        'USDC',
      ]);
    });

    it('returns an empty list when no watchlist token is on an allowed chain', () => {
      const result = filterWatchlistBridgeTokens(tokens, {
        allowedChainIds: [MOCK_CHAIN_IDS.optimism],
      });

      expect(result).toStrictEqual([]);
    });

    it('combines with selectedChainId as an additional, narrower filter', () => {
      const result = filterWatchlistBridgeTokens(tokens, {
        allowedChainIds: [MOCK_CHAIN_IDS.ethereum, MOCK_CHAIN_IDS.polygon],
        selectedChainId: MOCK_CHAIN_IDS.polygon,
      });

      expect(result.map((token) => token.symbol)).toStrictEqual(['POL']);
    });

    it('does not restrict results when allowedChainIds is undefined', () => {
      const result = filterWatchlistBridgeTokens(tokens, {});

      expect(result.map((token) => token.symbol)).toStrictEqual([
        'ETH',
        'POL',
        'USDC',
      ]);
    });
  });
});
