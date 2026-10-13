import type { CaipAssetType } from '@metamask/utils';
import { FEED_CAIP2_CHAINS } from './feed-constants';
import {
  socialFeedSourceFromAsset,
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
