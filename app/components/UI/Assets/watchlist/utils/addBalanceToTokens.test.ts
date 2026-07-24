import type { Asset } from '@metamask/assets-controllers';

import {
  addBalanceToTokens,
  buildAssetsByAssetId,
  type AssetsByChain,
} from './addBalanceToTokens';
import type { WatchlistTokenMetadata } from './getTokens';

const makeAsset = (overrides: Partial<Asset> = {}): Asset =>
  ({
    assetId: 'eip155:1/slip44:60',
    balance: '1.5',
    fiat: { balance: 3000, currency: 'usd', conversionRate: 1 },
    ...overrides,
  }) as Asset;

const makeToken = (
  overrides: Partial<WatchlistTokenMetadata> = {},
): WatchlistTokenMetadata => ({
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  ...overrides,
});

describe('buildAssetsByAssetId', () => {
  it('returns an empty object when given undefined', () => {
    expect(buildAssetsByAssetId(undefined)).toStrictEqual({});
  });

  it('returns an empty object when there are no assets across any chain', () => {
    const input: AssetsByChain = { 'eip155:1': [], 'solana:5eyk...': [] };

    expect(buildAssetsByAssetId(input)).toStrictEqual({});
  });

  it('flattens by-chain assets into a lowercased assetId map', () => {
    const eth = makeAsset({ assetId: 'eip155:1/slip44:60' });
    const usdc = makeAsset({ assetId: 'eip155:1/ERC20:0xABCDEF' });
    const sol = makeAsset({ assetId: 'solana:abc/slip44:501' });
    const input: AssetsByChain = {
      'eip155:1': [eth, usdc],
      'solana:abc': [sol],
    };

    const result = buildAssetsByAssetId(input);

    expect(result).toStrictEqual({
      'eip155:1/slip44:60': eth,
      'eip155:1/erc20:0xabcdef': usdc,
      'solana:abc/slip44:501': sol,
    });
  });

  it('skips assets without an assetId rather than throwing', () => {
    const valid = makeAsset({ assetId: 'eip155:1/slip44:60' });
    const invalid = { balance: '0' } as unknown as Asset;
    const input: AssetsByChain = { 'eip155:1': [valid, invalid] };

    const result = buildAssetsByAssetId(input);

    expect(Object.keys(result)).toStrictEqual(['eip155:1/slip44:60']);
  });
});

describe('addBalanceToTokens', () => {
  it('returns an empty array when no tokens are provided', () => {
    expect(addBalanceToTokens([], {})).toStrictEqual([]);
  });

  it('defaults missing tokens to a zero balance and isInWallet=false', () => {
    const tokens = [makeToken({ assetId: 'eip155:1/erc20:0xunheld' })];

    const result = addBalanceToTokens(tokens, {});

    expect(result).toStrictEqual([
      {
        ...tokens[0],
        balance: '0',
        balanceFiat: undefined,
        fiatCurrency: undefined,
        isInWallet: false,
      },
    ]);
  });

  it('attaches balance and fiat from the matching asset (case-insensitive lookup)', () => {
    const tokens = [makeToken({ assetId: 'eip155:1/ERC20:0xABCDEF' })];
    const assetsByAssetId = {
      'eip155:1/erc20:0xabcdef': makeAsset({
        assetId: 'eip155:1/erc20:0xabcdef',
        balance: '42',
        fiat: { balance: 99, currency: 'usd', conversionRate: 1 },
      }),
    };

    const result = addBalanceToTokens(tokens, assetsByAssetId);

    expect(result[0]).toStrictEqual({
      ...tokens[0],
      balance: '42',
      balanceFiat: 99,
      fiatCurrency: 'usd',
      isInWallet: true,
    });
  });

  it.each([
    {
      case: 'asset has no balance field (defaults to "0")',
      asset: makeAsset({ balance: undefined as unknown as string }),
      expectedBalance: '0',
    },
    {
      case: 'asset has explicit empty string balance (preserved)',
      asset: makeAsset({ balance: '' }),
      expectedBalance: '',
    },
  ])('falls back gracefully when $case', ({ asset, expectedBalance }) => {
    const tokens = [makeToken()];
    const assetsByAssetId = {
      'eip155:1/slip44:60': asset,
    };

    const result = addBalanceToTokens(tokens, assetsByAssetId);

    expect(result[0].balance).toStrictEqual(expectedBalance);
    expect(result[0].isInWallet).toStrictEqual(true);
  });

  it('omits balanceFiat and fiatCurrency when the asset has no fiat data', () => {
    const tokens = [makeToken()];
    const assetsByAssetId = {
      'eip155:1/slip44:60': makeAsset({ fiat: undefined }),
    };

    const result = addBalanceToTokens(tokens, assetsByAssetId);

    expect(result[0].balanceFiat).toBeUndefined();
    expect(result[0].fiatCurrency).toBeUndefined();
    expect(result[0].isInWallet).toStrictEqual(true);
  });

  it('preserves the order of the input tokens', () => {
    const tokens = [
      makeToken({ assetId: 'a', symbol: 'A' }),
      makeToken({ assetId: 'b', symbol: 'B' }),
      makeToken({ assetId: 'c', symbol: 'C' }),
    ];

    const result = addBalanceToTokens(tokens, {});

    expect(result.map((t) => t.symbol)).toStrictEqual(['A', 'B', 'C']);
  });
});
