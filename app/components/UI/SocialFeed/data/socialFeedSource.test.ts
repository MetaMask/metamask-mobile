import type { CaipAssetType } from '@metamask/utils';
import {
  SOCIAL_FEED_CHANNELS,
  type FeedItem as CoreFeedItem,
  type SocialFeedRealtimeScope,
} from '@metamask/social-controllers';
import { mockPerpFeedItem, mockSpotFeedItem } from '../mocks/coreFeed.mock';
import { FEED_CAIP2_CHAINS } from './feed-constants';
import {
  socialFeedSourceFromAsset,
  toFeedAssetId,
  toSocialFeedItemMatcher,
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

  it.each(Object.keys(SOCIAL_FEED_CHANNELS) as SocialFeedRealtimeScope[])(
    'streams the %s scope, which has a channel',
    (scope) => {
      expect(realtimeScopeOf({ scope })).toBe(scope);
    },
  );

  it.each<[string, SocialFeedQuery, SocialFeedRealtimeScope]>([
    [
      'every feed chain given explicitly',
      { scope: 'all', chains: [...FEED_CAIP2_CHAINS].reverse() },
      'all',
    ],
    ['an empty asset filter', { scope: 'all', assetIds: [] }, 'all'],
    [
      "one trader's comments",
      { scope: 'all', profileId: 'profile-1', commentedOnly: true },
      'all',
    ],
    [
      'a feed narrowed to some chains',
      { scope: 'all', chains: ['eip155:999'] },
      'all',
    ],
    [
      'a trending feed filtered by asset',
      { scope: 'trending', assetIds: ['eip155:999/perp:BTC'] },
      'trending',
    ],
    [
      'one trader on a narrowed chain list',
      { scope: 'all', profileId: 'profile-1', chains: ['eip155:999'] },
      'all',
    ],
    [
      'one trader without comments',
      { scope: 'all', profileId: 'profile-1' },
      'all',
    ],
    [
      'one trader on the trending feed',
      { scope: 'trending', profileId: 'profile-1' },
      'trending',
    ],
    [
      'one trader filtered by asset',
      {
        scope: 'all',
        profileId: 'profile-1',
        assetIds: ['eip155:999/perp:BTC'],
      },
      'all',
    ],
    ['commented positions only', { scope: 'all', commentedOnly: true }, 'all'],
  ])('streams %s', (_label, query, expected) => {
    expect(realtimeScopeOf(query)).toBe(expected);
  });

  it.each<[string, SocialFeedSource]>([
    ['the following scope, which has no channel', { scope: 'following' }],
    ['the leaderboard scope', { scope: 'leaderboard' }],
    ['a perp market', { kind: 'perp', symbol: 'BTC' }],
    ['a trader', { kind: 'trader', addressOrId: 'profile-1' }],
    ['a native asset', { kind: 'token', assetId: 'eip155:1/slip44:60' }],
  ])('does not stream %s', (_label, source) => {
    expect(realtimeScopeOf(source)).toBeNull();
  });

  it('does not stream without a request', () => {
    expect(toSocialFeedRealtimeScope(null)).toBeNull();
  });

  it('streams whichever scopes the realtime service has channels for', () => {
    jest.isolateModules(() => {
      jest.doMock('@metamask/social-controllers', () => ({
        ...jest.requireActual('@metamask/social-controllers'),
        SOCIAL_FEED_CHANNELS: { following: 'social.v1.feed.following' },
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const isolated = require('./socialFeedSource');
      const scopeOf = (query: SocialFeedQuery) =>
        isolated.toSocialFeedRealtimeScope(isolated.toSocialFeedRequest(query));

      expect(scopeOf({ scope: 'following', profileId: 'profile-1' })).toBe(
        'following',
      );
      expect(scopeOf({ scope: 'all' })).toBeNull();
    });
  });
});

describe('toSocialFeedItemMatcher', () => {
  const PEPE = 'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933';
  const matcherOf = (source: SocialFeedSource) =>
    toSocialFeedItemMatcher(toSocialFeedRequest(source));
  const matches = (source: SocialFeedSource, item: CoreFeedItem) => {
    const matcher = matcherOf(source);
    if (!matcher) {
      throw new Error('Expected a matcher');
    }
    return matcher(item);
  };

  it.each<[string, SocialFeedSource]>([
    ['an unnarrowed feed', { scope: 'trending' }],
    [
      'every feed chain given explicitly',
      { scope: 'all', chains: [...FEED_CAIP2_CHAINS].reverse() },
    ],
    ['an empty asset filter', { scope: 'all', assetIds: [] }],
    ['a legacy route', { kind: 'perp', symbol: 'BTC' }],
  ])('returns null for %s', (_label, source) => {
    expect(matcherOf(source)).toBeNull();
  });

  it('returns null without a request', () => {
    expect(toSocialFeedItemMatcher(null)).toBeNull();
  });

  it('matches a spot item on a requested asset, whatever its address case', () => {
    const item = mockSpotFeedItem({
      tokenAddress: '0x6982508145454CE325DDBE47A25D4EC3D2311933',
    });

    expect(matches({ scope: 'trending', assetIds: [PEPE] }, item)).toBe(true);
  });

  it('rejects an item on another asset', () => {
    const item = mockSpotFeedItem({
      tokenAddress: '0x910037dc20fbdf3a347979a9553f3b8100b5efeb',
    });

    expect(matches({ scope: 'trending', assetIds: [PEPE] }, item)).toBe(false);
  });

  it('matches a HIP-3 perp item on its dotted market id', () => {
    const item = mockPerpFeedItem({ tokenSymbol: 'xyz:NVDA' });

    expect(
      matches({ scope: 'all', assetIds: ['eip155:999/perp:xyz.NVDA'] }, item),
    ).toBe(true);
  });

  it('matches items on a requested chain and rejects the others', () => {
    const query: SocialFeedQuery = { scope: 'all', chains: ['eip155:999'] };

    expect(matches(query, mockPerpFeedItem())).toBe(true);
    expect(matches(query, mockSpotFeedItem())).toBe(false);
  });

  it('rejects an item on a chain the feed does not know', () => {
    const query: SocialFeedQuery = { scope: 'all', chains: ['eip155:1'] };

    expect(matches(query, mockSpotFeedItem({ chain: 'fantom' }))).toBe(false);
  });

  it("matches only the requested trader's items", () => {
    const query: SocialFeedQuery = { scope: 'all', profileId: 'profile-1' };

    expect(matches(query, mockSpotFeedItem())).toBe(true);
    expect(
      matches(
        query,
        mockSpotFeedItem({
          actor: {
            profileId: 'profile-2',
            address: '0x2222222222222222222222222222222222222222',
            name: 'other',
            imageUrl: null,
          },
        }),
      ),
    ).toBe(false);
  });

  it('matches only comment items when commented only', () => {
    const query: SocialFeedQuery = { scope: 'all', commentedOnly: true };
    const comment = {
      uid: 'comment-1',
      text: 'this is alpha',
      timestamp: 1_700_000_000,
      engagement: { reactions: [], userReaction: null },
    };

    expect(matches(query, mockSpotFeedItem({ authorComment: comment }))).toBe(
      true,
    );
    expect(matches(query, mockSpotFeedItem({ authorComment: null }))).toBe(
      false,
    );
  });

  it("keeps a profile's Posts feed to that trader's comment items", () => {
    const query: SocialFeedQuery = {
      scope: 'all',
      profileId: 'profile-1',
      commentedOnly: true,
    };
    const comment = {
      uid: 'comment-1',
      text: 'this is alpha',
      timestamp: 1_700_000_000,
      engagement: { reactions: [], userReaction: null },
    };

    expect(matches(query, mockSpotFeedItem({ authorComment: comment }))).toBe(
      true,
    );
    expect(matches(query, mockSpotFeedItem({ authorComment: null }))).toBe(
      false,
    );
    expect(matches(query, mockPerpFeedItem({ authorComment: comment }))).toBe(
      false,
    );
  });

  it('requires every narrowing to match', () => {
    const query: SocialFeedQuery = {
      scope: 'all',
      assetIds: [PEPE],
      profileId: 'profile-2',
    };

    expect(matches(query, mockSpotFeedItem())).toBe(false);
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
