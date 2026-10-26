import type { CaipAssetType } from '@metamask/utils';
import { FEED_CAIP2_CHAINS } from './feed-constants';
import {
  socialFeedSourceFromAsset,
  toFeedAssetId,
  toSocialFeedRealtimeScope,
  toSocialFeedRequest,
  type SocialFeedAssetRef,
  type SocialFeedSource,
} from './socialFeedSource';

const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOLANA_MINT = 'HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ';

describe('toSocialFeedRequest', () => {
  it.each([
    ['all', 'leaderboard'],
    ['following', 'following'],
  ] as const)(
    'maps the %s audience to the global feed with the %s scope',
    (audience, scope) => {
      expect(toSocialFeedRequest({ kind: 'all', audience })).toStrictEqual({
        action: 'SocialService:fetchFeed',
        options: { scope, chains: FEED_CAIP2_CHAINS },
      });
    },
  );

  it('keeps the exact shared chain list when the asset class is all', () => {
    const request = toSocialFeedRequest({
      kind: 'all',
      audience: 'all',
      assetClass: 'all',
    });

    expect(request?.options).toHaveProperty('chains', FEED_CAIP2_CHAINS);
  });

  it('narrows the global feed to spot chains for tokens', () => {
    expect(
      toSocialFeedRequest({
        kind: 'all',
        audience: 'all',
        assetClass: 'tokens',
      }),
    ).toStrictEqual({
      action: 'SocialService:fetchFeed',
      options: {
        scope: 'leaderboard',
        chains: FEED_CAIP2_CHAINS.filter((chain) => chain !== 'eip155:999'),
      },
    });
  });

  it('narrows the global feed to Hyperliquid for perps', () => {
    expect(
      toSocialFeedRequest({
        kind: 'all',
        audience: 'following',
        assetClass: 'perps',
      }),
    ).toStrictEqual({
      action: 'SocialService:fetchFeed',
      options: { scope: 'following', chains: ['eip155:999'] },
    });
  });

  it('lowercases a checksummed EVM contract, which the token route requires', () => {
    const request = toSocialFeedRequest({
      kind: 'token',
      assetId: 'eip155:1/erc20:0x910037DC20FBDF3A347979A9553F3B8100B5EFEB',
    });

    expect(request).toStrictEqual({
      action: 'SocialService:fetchTokenFeed',
      options: {
        chain: 'ethereum',
        contractAddress: '0x910037dc20fbdf3a347979a9553f3b8100b5efeb',
      },
    });
  });

  it('keeps a Solana mint in its exact case', () => {
    const request = toSocialFeedRequest({
      kind: 'token',
      assetId: `${SOLANA_MAINNET}/token:${SOLANA_MINT}`,
    });

    expect(request).toStrictEqual({
      action: 'SocialService:fetchTokenFeed',
      options: { chain: 'solana', contractAddress: SOLANA_MINT },
    });
  });

  it.each([
    ['eip155:8453/erc20:0xabc', 'base'],
    ['eip155:56/erc20:0xabc', 'bsc'],
    ['eip155:4663/erc20:0xabc', 'robinhood'],
  ])('maps %s to the %s token route chain', (assetId, chain) => {
    expect(
      toSocialFeedRequest({ kind: 'token', assetId: assetId as CaipAssetType }),
    ).toStrictEqual({
      action: 'SocialService:fetchTokenFeed',
      options: { chain, contractAddress: '0xabc' },
    });
  });

  it.each([
    ['ETH on Ethereum', 'eip155:1/slip44:60', 'eip155:1'],
    ['ETH on Base', 'eip155:8453/slip44:60', 'eip155:8453'],
    ['SOL', `${SOLANA_MAINNET}/slip44:501`, SOLANA_MAINNET],
  ])(
    'maps the native asset %s to every trader on its chain',
    (_label, assetId, chainId) => {
      expect(
        toSocialFeedRequest({
          kind: 'token',
          assetId: assetId as CaipAssetType,
        }),
      ).toStrictEqual({
        action: 'SocialService:fetchFeed',
        options: { scope: 'leaderboard', chains: [chainId] },
      });
    },
  );

  it.each([
    [
      'a native asset on a chain the feed does not track',
      'eip155:42161/slip44:60',
    ],
    ['a chain the token route does not list', 'eip155:42161/erc20:0xabc'],
    ['an NFT namespace', 'eip155:1/erc721:0xabc'],
    ['a Solana asset in an EVM namespace', `${SOLANA_MAINNET}/erc20:0xabc`],
    ['a malformed asset id', 'not-a-caip-asset'],
  ])('returns null for %s', (_label, assetId) => {
    expect(
      toSocialFeedRequest({ kind: 'token', assetId: assetId as CaipAssetType }),
    ).toBeNull();
  });

  it('routes a perp market to the Hyperliquid token feed by its exact symbol', () => {
    expect(
      toSocialFeedRequest({ kind: 'perp', symbol: 'xyz:NVDA' }),
    ).toStrictEqual({
      action: 'SocialService:fetchTokenFeed',
      options: { chain: 'hyperliquid', contractAddress: 'xyz:NVDA' },
    });
  });

  it('returns null for a blank perp symbol', () => {
    expect(toSocialFeedRequest({ kind: 'perp', symbol: '  ' })).toBeNull();
  });

  it('maps a trader and only sends commentedOnly when it is set', () => {
    expect(
      toSocialFeedRequest({ kind: 'trader', addressOrId: 'profile-1' }),
    ).toStrictEqual({
      action: 'SocialService:fetchTraderFeed',
      options: { addressOrId: 'profile-1' },
    });
    expect(
      toSocialFeedRequest({
        kind: 'trader',
        addressOrId: '0xabc',
        commentedOnly: true,
      }),
    ).toStrictEqual({
      action: 'SocialService:fetchTraderFeed',
      options: { addressOrId: '0xabc', commentedOnly: true },
    });
  });

  it('returns null for a blank trader id', () => {
    expect(toSocialFeedRequest({ kind: 'trader', addressOrId: '' })).toBeNull();
  });

  describe('with filters', () => {
    const assetIds: CaipAssetType[] = [
      'eip155:999/perp:BTC',
      'eip155:8453/erc20:0xabc',
    ];

    it('sends assetIds alongside the chains of an all source', () => {
      expect(
        toSocialFeedRequest({ kind: 'all', audience: 'all' }, { assetIds }),
      ).toStrictEqual({
        action: 'SocialService:fetchFeed',
        options: { scope: 'leaderboard', chains: FEED_CAIP2_CHAINS, assetIds },
      });
    });

    it('omits an empty assetIds list and keeps the chains', () => {
      expect(
        toSocialFeedRequest({ kind: 'all', audience: 'all' }, { assetIds: [] }),
      ).toStrictEqual({
        action: 'SocialService:fetchFeed',
        options: { scope: 'leaderboard', chains: FEED_CAIP2_CHAINS },
      });
    });

    it('passes more than ten ids through for the server to reject', () => {
      const elevenIds = Array.from(
        { length: 11 },
        (_, index): CaipAssetType => `eip155:999/perp:T${index}`,
      );

      const request = toSocialFeedRequest(
        { kind: 'all', audience: 'all' },
        { assetIds: elevenIds },
      );

      expect(request?.options).toHaveProperty('assetIds', elevenIds);
    });

    it.each<[string, SocialFeedSource]>([
      [
        'a token',
        { kind: 'token', assetId: `${SOLANA_MAINNET}/token:${SOLANA_MINT}` },
      ],
      ['a perp market', { kind: 'perp', symbol: 'BTC' }],
      ['a trader', { kind: 'trader', addressOrId: 'profile-1' }],
    ])('ignores them for %s', (_label, source) => {
      expect(toSocialFeedRequest(source, { assetIds })).toStrictEqual(
        toSocialFeedRequest(source),
      );
    });
  });
});

describe('toSocialFeedRealtimeScope', () => {
  it.each<[string, SocialFeedSource, 'all' | 'trending']>([
    ['the all scope', { kind: 'all', audience: 'all', scope: 'all' }, 'all'],
    [
      'the trending scope',
      { kind: 'all', audience: 'all', scope: 'trending' },
      'trending',
    ],
    [
      'an asset class of all',
      { kind: 'all', audience: 'all', scope: 'all', assetClass: 'all' },
      'all',
    ],
  ])('streams %s', (_label, source, expected) => {
    expect(toSocialFeedRealtimeScope(source)).toBe(expected);
  });

  it.each<[string, SocialFeedSource]>([
    ['the leaderboard audience', { kind: 'all', audience: 'all' }],
    ['the following audience', { kind: 'all', audience: 'following' }],
    [
      'a narrowing asset class',
      { kind: 'all', audience: 'all', scope: 'all', assetClass: 'perps' },
    ],
    ['a perp market', { kind: 'perp', symbol: 'BTC' }],
    ['a trader', { kind: 'trader', addressOrId: 'profile-1' }],
  ])('does not stream %s', (_label, source) => {
    expect(toSocialFeedRealtimeScope(source)).toBeNull();
  });

  it('does not stream while filtering by asset', () => {
    expect(
      toSocialFeedRealtimeScope(
        { kind: 'all', audience: 'all', scope: 'all' },
        { assetIds: ['eip155:999/perp:BTC'] },
      ),
    ).toBeNull();
  });

  it('streams with an empty asset filter', () => {
    expect(
      toSocialFeedRealtimeScope(
        { kind: 'all', audience: 'all', scope: 'all' },
        { assetIds: [] },
      ),
    ).toBe('all');
  });
});

describe('toFeedAssetId', () => {
  it.each<[string, SocialFeedAssetRef, CaipAssetType]>([
    [
      'an EVM token, lowercased',
      {
        chain: 'ethereum',
        tokenAddress: '0x910037DC20FBDF3A347979A9553F3B8100B5EFEB',
      },
      'eip155:1/erc20:0x910037dc20fbdf3a347979a9553f3b8100b5efeb',
    ],
    [
      'a Base token with a padded chain name',
      { chain: ' Base ', tokenAddress: '0xabc' },
      'eip155:8453/erc20:0xabc',
    ],
    [
      'a Solana mint, in its exact case',
      { chain: 'solana', tokenAddress: SOLANA_MINT },
      `${SOLANA_MAINNET}/token:${SOLANA_MINT}`,
    ],
    [
      'a Hyperliquid perp by its symbol',
      { chain: 'hyperliquid', tokenAddress: '', tokenSymbol: 'BTC' },
      'eip155:999/perp:BTC',
    ],
    [
      'a Hyperliquid perp by its address',
      { chain: 'hyperliquid', tokenAddress: 'ETH' },
      'eip155:999/perp:ETH',
    ],
    [
      'a HIP-3 market, with the dex joined by a dot',
      { chain: 'Hyperliquid', tokenAddress: 'NVDA', tokenSymbol: 'xyz:NVDA' },
      'eip155:999/perp:xyz.NVDA',
    ],
  ])('builds the asset id for %s', (_label, assetRef, expected) => {
    expect(toFeedAssetId(assetRef)).toBe(expected);
  });

  it.each<[string, SocialFeedAssetRef]>([
    ['an unknown chain', { chain: 'unknown-chain', tokenAddress: '0xabc' }],
    ['a token with no address', { chain: 'ethereum', tokenAddress: '  ' }],
    ['a perp with no market', { chain: 'hyperliquid', tokenAddress: '' }],
    [
      'a perp market CAIP-19 cannot hold',
      { chain: 'hyperliquid', tokenAddress: '', tokenSymbol: '@107' },
    ],
    ['a blank chain', { chain: '', tokenAddress: '0xabc' }],
  ])('returns null for %s', (_label, assetRef) => {
    expect(toFeedAssetId(assetRef)).toBeNull();
  });
});

describe('socialFeedSourceFromAsset', () => {
  it.each<[string, SocialFeedAssetRef, SocialFeedSource | null]>([
    [
      'an Ethereum token',
      {
        chain: 'ethereum',
        tokenAddress: '0x910037dc20fbdf3a347979a9553f3b8100b5efeb',
      },
      {
        kind: 'token',
        assetId: 'eip155:1/erc20:0x910037dc20fbdf3a347979a9553f3b8100b5efeb',
      },
    ],
    [
      'a Solana token',
      { chain: 'solana', tokenAddress: SOLANA_MINT },
      { kind: 'token', assetId: `${SOLANA_MAINNET}/token:${SOLANA_MINT}` },
    ],
    [
      'a perp row with an empty address, by its symbol',
      { chain: 'hyperliquid', tokenAddress: '', tokenSymbol: 'ETH' },
      { kind: 'perp', symbol: 'ETH' },
    ],
    [
      'a HIP-3 perp row, preferring the symbol',
      { chain: 'Hyperliquid', tokenAddress: 'NVDA', tokenSymbol: 'xyz:NVDA' },
      { kind: 'perp', symbol: 'xyz:NVDA' },
    ],
    [
      'a perp row without a symbol, by its address',
      { chain: 'hyperliquid', tokenAddress: 'BTC' },
      { kind: 'perp', symbol: 'BTC' },
    ],
    [
      'a perp row with neither',
      { chain: 'hyperliquid', tokenAddress: '' },
      null,
    ],
    [
      'an unknown chain',
      { chain: 'unknown-chain', tokenAddress: '0xabc' },
      null,
    ],
    ['a token with no address', { chain: 'ethereum', tokenAddress: '' }, null],
  ])('builds the source for %s', (_label, asset, expected) => {
    expect(socialFeedSourceFromAsset(asset)).toStrictEqual(expected);
  });

  it('round-trips a feed row asset into the same token route request', () => {
    const source = socialFeedSourceFromAsset({
      chain: 'solana',
      tokenAddress: SOLANA_MINT,
    });

    expect(source && toSocialFeedRequest(source)).toStrictEqual({
      action: 'SocialService:fetchTokenFeed',
      options: { chain: 'solana', contractAddress: SOLANA_MINT },
    });
  });
});
