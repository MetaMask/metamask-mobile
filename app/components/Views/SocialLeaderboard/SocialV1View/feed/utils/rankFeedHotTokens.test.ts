import {
  mockClosedSpotFeedItem,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../../../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type {
  SocialV1FeedItem,
  SocialV1FeedPost,
} from '../../../../../UI/SocialFeed/types';
import {
  getSocialV1HotTokenId,
  pinSelectedHotToken,
  rankFeedHotTokens,
  SOCIAL_V1_HOT_TOKEN_ASSET_ID_LIMIT,
  SOCIAL_V1_HOT_TOKEN_LIMIT,
} from './rankFeedHotTokens';

const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const PUMP_MINT = 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn';

const postFor = (item: SocialV1FeedItem): SocialV1FeedPost => ({
  id: `post-${item.id}`,
  authorHandle: 'trader',
  timestampMs: item.timestamp,
  reactions: [],
  item,
});

const ticker = (symbol: string, id: string = symbol): SocialV1FeedItem =>
  mockOpenPerpsFeedItem({
    id,
    asset: {
      symbol,
      avatar: {
        positionId: id,
        chain: 'hyperliquid',
        tokenAddress: '',
        tokenImageUrl: null,
        tokenSymbol: symbol,
      },
    },
  });

describe('rankFeedHotTokens', () => {
  it('orders assets by how often they appear in the feed', () => {
    const posts = [
      postFor(ticker('ETH', 'eth-1')),
      postFor(ticker('BTC', 'btc-1')),
      postFor(ticker('ETH', 'eth-2')),
      postFor(ticker('SOL', 'sol-1')),
      postFor(ticker('BTC', 'btc-2')),
      postFor(ticker('BTC', 'btc-3')),
    ];

    const tokens = rankFeedHotTokens(posts);

    expect(tokens.map((token) => token.label)).toEqual(['BTC', 'ETH', 'SOL']);
    expect(tokens.map((token) => token.id)).toEqual([
      'asset:BTC',
      'asset:ETH',
      'asset:SOL',
    ]);
  });

  it('counts spot and perp posts for one ticker as one asset', () => {
    const posts = [
      postFor(mockOpenSpotFeedItem()),
      postFor(
        mockOpenPerpsFeedItem({
          id: 'eth-perp',
          asset: {
            symbol: 'PUMP',
            avatar: {
              positionId: 'pump-perp',
              chain: 'hyperliquid',
              tokenAddress: '',
              tokenImageUrl: null,
              tokenSymbol: 'xyz:PUMP',
            },
          },
        }),
      ),
      postFor(ticker('BTC', 'btc-1')),
    ];

    const tokens = rankFeedHotTokens(posts);

    expect(tokens.map((token) => token.id)).toEqual([
      'asset:PUMP',
      'asset:BTC',
    ]);
    expect(tokens[0]?.symbol).toBe('xyz:PUMP');
    expect(tokens[0]?.assetIds).toEqual([
      `${SOLANA_MAINNET}/token:${PUMP_MINT}`,
      'eip155:999/perp:xyz.PUMP',
    ]);
    expect(tokens[1]?.assetIds).toEqual(['eip155:999/perp:BTC']);
  });

  it('collects the spot asset from a later row when the first row is a perp', () => {
    const posts = [
      postFor(
        mockOpenPerpsFeedItem({
          id: 'pump-perp',
          asset: {
            symbol: 'PUMP',
            avatar: {
              positionId: 'pump-perp',
              chain: 'hyperliquid',
              tokenAddress: '',
              tokenImageUrl: null,
              tokenSymbol: 'xyz:PUMP',
            },
          },
        }),
      ),
      postFor(mockOpenSpotFeedItem()),
    ];

    const [pump] = rankFeedHotTokens(posts);

    expect(pump?.assetIds).toEqual([
      'eip155:999/perp:xyz.PUMP',
      `${SOLANA_MAINNET}/token:${PUMP_MINT}`,
    ]);
    expect(pump?.symbol).toBe('xyz:PUMP');
  });

  it('orders a chip’s asset ids by how often each appears', () => {
    const basePump = (id: string) =>
      postFor(
        mockOpenSpotFeedItem({
          id,
          asset: {
            symbol: 'PUMP',
            avatar: {
              positionId: id,
              chain: 'base',
              tokenAddress: '0xABC',
              tokenImageUrl: null,
              tokenSymbol: 'PUMP',
            },
          },
        }),
      );
    const posts = [
      postFor(mockOpenSpotFeedItem()),
      basePump('base-pump-1'),
      basePump('base-pump-2'),
    ];

    const [pump] = rankFeedHotTokens(posts);

    expect(pump?.assetIds).toEqual([
      'eip155:8453/erc20:0xabc',
      `${SOLANA_MAINNET}/token:${PUMP_MINT}`,
    ]);
  });

  it('caps a chip at ten asset ids', () => {
    const posts = Array.from(
      { length: SOCIAL_V1_HOT_TOKEN_ASSET_ID_LIMIT + 1 },
      (_, index) =>
        postFor(
          mockOpenSpotFeedItem({
            id: `pepe-${index}`,
            asset: {
              symbol: 'PEPE',
              avatar: {
                positionId: `pepe-${index}`,
                chain: 'base',
                tokenAddress: `0x${String(index).padStart(40, '0')}`,
                tokenImageUrl: null,
                tokenSymbol: 'PEPE',
              },
            },
          }),
        ),
    );

    const [pepe] = rankFeedHotTokens(posts);

    expect(pepe?.assetIds).toHaveLength(SOCIAL_V1_HOT_TOKEN_ASSET_ID_LIMIT);
    expect(pepe?.assetIds).not.toContain(
      `eip155:8453/erc20:0x${String(SOCIAL_V1_HOT_TOKEN_ASSET_ID_LIMIT).padStart(40, '0')}`,
    );
  });

  it('skips a chip with no asset id the feed can filter by', () => {
    const posts = [
      postFor(
        mockOpenSpotFeedItem({
          id: 'arb-spot',
          asset: {
            symbol: 'ARB',
            avatar: {
              positionId: 'arb-spot',
              chain: 'arbitrum-nova',
              tokenAddress: '0x1',
              tokenImageUrl: null,
              tokenSymbol: 'ARB',
            },
          },
        }),
      ),
      postFor(ticker('ETH')),
    ];

    expect(rankFeedHotTokens(posts).map((token) => token.id)).toEqual([
      'asset:ETH',
    ]);
  });

  it('uses the asset name as the chip label when the feed has one', () => {
    const posts = [
      postFor(
        mockOpenPerpsFeedItem({
          asset: {
            symbol: 'ETH',
            name: 'Ethereum',
            avatar: {
              positionId: 'eth',
              chain: 'hyperliquid',
              tokenAddress: '',
              tokenImageUrl: null,
              tokenSymbol: 'ETH',
            },
          },
        }),
      ),
    ];

    expect(rankFeedHotTokens(posts)[0]?.label).toBe('Ethereum');
  });

  it('fills the chip label from a later post that carries a name', () => {
    const named = mockOpenPerpsFeedItem({
      id: 'eth-named',
      asset: {
        symbol: 'ETH',
        name: 'Ethereum',
        avatar: {
          positionId: 'eth-named',
          chain: 'hyperliquid',
          tokenAddress: '',
          tokenImageUrl: null,
          tokenSymbol: 'ETH',
        },
      },
    });

    const tokens = rankFeedHotTokens([
      postFor(ticker('ETH', 'eth-bare')),
      postFor(named),
    ]);

    expect(tokens[0]?.label).toBe('Ethereum');
  });

  it('keeps the raw perp market id for the icon', () => {
    const posts = [
      postFor(
        mockClosedSpotFeedItem({
          id: 'nvda-spot',
          asset: {
            symbol: 'NVDA',
            avatar: {
              positionId: 'nvda-spot',
              chain: 'ethereum',
              tokenAddress: '0x1',
              tokenImageUrl: null,
              tokenSymbol: 'NVDA',
            },
          },
        }),
      ),
      postFor(
        mockOpenPerpsFeedItem({
          id: 'nvda-perp',
          asset: {
            symbol: 'NVDA',
            name: 'NVIDIA',
            avatar: {
              positionId: 'nvda-perp',
              chain: 'hyperliquid',
              tokenAddress: '',
              tokenImageUrl: null,
              tokenSymbol: 'xyz:NVDA',
            },
          },
        }),
      ),
    ];

    const [nvidia] = rankFeedHotTokens(posts);

    expect(nvidia?.symbol).toBe('xyz:NVDA');
    expect(nvidia?.label).toBe('NVIDIA');
    expect(nvidia?.avatar.tokenSymbol).toBe('xyz:NVDA');
  });

  it('merges tickers that differ only by case', () => {
    const posts = [
      postFor(ticker('btc', 'btc-lower')),
      postFor(ticker('BTC', 'btc-upper')),
    ];

    const tokens = rankFeedHotTokens(posts);

    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.id).toBe('asset:BTC');
  });

  it('skips posts with a blank ticker', () => {
    const posts = [postFor(ticker('  ', 'blank')), postFor(ticker('ETH'))];

    expect(rankFeedHotTokens(posts).map((token) => token.id)).toEqual([
      'asset:ETH',
    ]);
  });

  it('returns at most the top 10 assets', () => {
    const posts = Array.from(
      { length: SOCIAL_V1_HOT_TOKEN_LIMIT + 1 },
      (_, index) =>
        postFor(ticker(`T${String(index).padStart(2, '0')}`, `id-${index}`)),
    );

    const tokens = rankFeedHotTokens(posts);

    expect(tokens).toHaveLength(SOCIAL_V1_HOT_TOKEN_LIMIT);
    expect(tokens.some((token) => token.id === 'asset:T10')).toBe(false);
    expect(getSocialV1HotTokenId(posts[10].item)).toBe('asset:T10');
  });

  it('breaks frequency ties by chip id', () => {
    const posts = [postFor(ticker('SOL')), postFor(ticker('BTC'))];

    expect(rankFeedHotTokens(posts).map((token) => token.id)).toEqual([
      'asset:BTC',
      'asset:SOL',
    ]);
  });
});

describe('pinSelectedHotToken', () => {
  it('prepends a selected asset that fell out of the top ranks', () => {
    const posts = Array.from(
      { length: SOCIAL_V1_HOT_TOKEN_LIMIT + 1 },
      (_, index) =>
        postFor(ticker(`T${String(index).padStart(2, '0')}`, `id-${index}`)),
    );
    const ranked = rankFeedHotTokens(posts);

    const tokens = pinSelectedHotToken(ranked, posts, 'asset:T10');

    expect(tokens[0]?.id).toBe('asset:T10');
    expect(tokens).toHaveLength(SOCIAL_V1_HOT_TOKEN_LIMIT + 1);
  });

  it('leaves the ranking in place when the selection is already visible', () => {
    const posts = [postFor(ticker('BTC')), postFor(ticker('ETH'))];
    const ranked = rankFeedHotTokens(posts);

    expect(pinSelectedHotToken(ranked, posts, 'asset:BTC')).toEqual(ranked);
  });

  it('leaves the ranking in place when nothing is selected', () => {
    const posts = [postFor(ticker('BTC'))];
    const ranked = rankFeedHotTokens(posts);

    expect(pinSelectedHotToken(ranked, posts, null)).toEqual(ranked);
  });
});
