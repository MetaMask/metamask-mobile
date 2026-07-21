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
      isSourcePicker: false,
    });

    expect(result.map((token) => token.symbol)).toStrictEqual(['ETH', 'USDC']);
  });

  it('hides zero-balance tokens for the source picker', () => {
    const result = filterWatchlistBridgeTokens(tokens, {
      isSourcePicker: true,
    });

    expect(result.map((token) => token.symbol)).toStrictEqual(['ETH', 'POL']);
  });

  it('keeps zero-balance tokens for the destination picker', () => {
    const result = filterWatchlistBridgeTokens(tokens, {
      isSourcePicker: false,
    });

    expect(result.map((token) => token.symbol)).toStrictEqual([
      'ETH',
      'POL',
      'USDC',
    ]);
  });

  it('filters tokens locally by search query', () => {
    const result = filterWatchlistBridgeTokens(tokens, {
      isSourcePicker: false,
      searchQuery: 'usd',
    });

    expect(result.map((token) => token.symbol)).toStrictEqual(['USDC']);
  });

  it('treats hex-encoded balances as positive for the source picker', () => {
    const result = filterWatchlistBridgeTokens(
      [
        makeToken({
          symbol: 'ETH',
          balance: '0xde0b6b3a7640000',
        }),
      ],
      {
        isSourcePicker: true,
      },
    );

    expect(result.map((token) => token.symbol)).toStrictEqual(['ETH']);
  });
});
