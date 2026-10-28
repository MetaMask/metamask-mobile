import type { CaipAssetType } from '@metamask/utils';
import { FEED_CAIP2_CHAINS } from './feed-constants';
import {
  socialFeedSourceFromAsset,
  toFeedAssetId,
  toSocialFeedRealtimeScope,
  toSocialFeedRequest,
  type FeedScope,
  type SocialFeedAssetRef,
  type SocialFeedQuery,
  type SocialFeedSource,
} from './socialFeedSource';

const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOLANA_MINT = 'HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ';

describe('toSocialFeedRequest', () => {
  it.each<FeedScope>(['trending', 'following', 'all', 'leaderboard'])(
    'sends the %s scope with every feed chain',
    (scope) => {
      expect(toSocialFeedRequest({ scope })).toStrictEqual({
        action: 'SocialService:fetchFeed',
        options: { scope, chains: FEED_CAIP2_CHAINS },
      });
    },
  );

  it('sends the chains it is given', () => {
    expect(
      toSocialFeedRequest({ scope: 'all', chains: ['eip155:999'] }),
    ).toStrictEqual({
      action: 'SocialService:fetchFeed',
      options: { scope: 'all', chains: ['eip155:999'] },
    });
  });

  it('sends assetIds alongside the chains', () => {
    const assetIds: CaipAssetType[] = [
      'eip155:999/perp:BTC',
      'eip155:8453/erc20:0xabc',
    ];

    expect(toSocialFeedRequest({ scope: 'trending', assetIds })).toStrictEqual({
      action: 'SocialService:fetchFeed',
      options: { scope: 'trending', chains: FEED_CAIP2_CHAINS, assetIds },
    });
  });

  it('omits an empty assetIds list and keeps the chains', () => {
    expect(
      toSocialFeedRequest({ scope: 'trending', assetIds: [] }),
    ).toStrictEqual({
      action: 'SocialService:fetchFeed',
      options: { scope: 'trending', chains: FEED_CAIP2_CHAINS },
    });
  });

  it('lowercases ERC-20 contracts and keeps perp markets and mints as given', () => {
    const request = toSocialFeedRequest({
      scope: 'all',
      assetIds: [
        'eip155:1/erc20:0x910037DC20FBDF3A347979A9553F3B8100B5EFEB',
        'eip155:999/perp:xyz.NVDA',
        `${SOLANA_MAINNET}/token:${SOLANA_MINT}`,
      ],
    });

    expect(request?.options).toHaveProperty('assetIds', [
      'eip155:1/erc20:0x910037dc20fbdf3a347979a9553f3b8100b5efeb',
      'eip155:999/perp:xyz.NVDA',
      `${SOLANA_MAINNET}/token:${SOLANA_MINT}`,
    ]);
  });

  it('sends an asset id once when two spellings normalise to it', () => {
    const request = toSocialFeedRequest({
      scope: 'all',
      assetIds: ['eip155:1/erc20:0xABC', 'eip155:1/erc20:0xabc'],
    });

    expect(request?.options).toHaveProperty('assetIds', [
      'eip155:1/erc20:0xabc',
    ]);
  });

  it('drops asset ids on chains the query does not request', () => {
    const request = toSocialFeedRequest({
      scope: 'all',
      chains: ['eip155:999'],
      assetIds: ['eip155:999/perp:BTC', 'eip155:1/erc20:0xabc'],
    });

    expect(request?.options).toHaveProperty('assetIds', [
      'eip155:999/perp:BTC',
    ]);
  });

  it.each<[string, SocialFeedQuery]>([
    [
      'asset ids all on untracked chains',
      { scope: 'all', assetIds: ['eip155:42161/erc20:0xabc'] },
    ],
    [
      'asset ids all outside the requested chains',
      {
        scope: 'all',
        chains: ['eip155:999'],
        assetIds: ['eip155:1/erc20:0xabc'],
      },
    ],
    ['a blank profile id', { scope: 'all', profileId: '  ' }],
  ])('has no feed for %s rather than widening', (_label, query) => {
    expect(toSocialFeedRequest(query)).toBeNull();
  });

  it('passes more than ten ids through for the server to reject', () => {
    const elevenIds = Array.from(
      { length: 11 },
      (_, index): CaipAssetType => `eip155:999/perp:T${index}`,
    );

    const request = toSocialFeedRequest({
      scope: 'all',
      assetIds: elevenIds,
    });

    expect(request?.options).toHaveProperty('assetIds', elevenIds);
  });

  it('sends a trimmed profile id and commentedOnly when set', () => {
    expect(
      toSocialFeedRequest({
        scope: 'all',
        profileId: ' profile-1 ',
        commentedOnly: true,
      }),
    ).toStrictEqual({
      action: 'SocialService:fetchFeed',
      options: {
        scope: 'all',
        chains: FEED_CAIP2_CHAINS,
        profileId: 'profile-1',
        commentedOnly: true,
      },
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
});

describe('toSocialFeedRealtimeScope', () => {
  const realtimeScopeOf = (source: SocialFeedSource) =>
    toSocialFeedRealtimeScope(toSocialFeedRequest(source));

  it.each<[string, SocialFeedQuery, 'all' | 'trending']>([
    ['the all scope', { scope: 'all' }, 'all'],
    ['the trending scope', { scope: 'trending' }, 'trending'],
    [
      'every feed chain given explicitly',
      { scope: 'all', chains: [...FEED_CAIP2_CHAINS].reverse() },
      'all',
    ],
    ['an empty asset filter', { scope: 'all', assetIds: [] }, 'all'],
  ])('streams %s', (_label, query, expected) => {
    expect(realtimeScopeOf(query)).toBe(expected);
  });

  it.each<[string, SocialFeedSource]>([
    ['the following scope, which has no channel', { scope: 'following' }],
    ['the leaderboard scope', { scope: 'leaderboard' }],
    [
      'a feed narrowed to some chains',
      { scope: 'all', chains: ['eip155:999'] },
    ],
    [
      'a feed filtered by asset',
      { scope: 'trending', assetIds: ['eip155:999/perp:BTC'] },
    ],
    ['one trader', { scope: 'all', profileId: 'profile-1' }],
    ['commented positions only', { scope: 'all', commentedOnly: true }],
    ['a perp market', { kind: 'perp', symbol: 'BTC' }],
    ['a trader', { kind: 'trader', addressOrId: 'profile-1' }],
    ['a native asset', { kind: 'token', assetId: 'eip155:1/slip44:60' }],
  ])('does not stream %s', (_label, source) => {
    expect(realtimeScopeOf(source)).toBeNull();
  });

  it('does not stream without a request', () => {
    expect(toSocialFeedRealtimeScope(null)).toBeNull();
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
