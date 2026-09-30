import { renderHook } from '@testing-library/react-native';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../types';
import { useSocialV1HotTokens } from './useSocialV1HotTokens';

const post = (symbol: string, id: string): SocialV1FeedPost => ({
  id: `post-${id}`,
  authorHandle: 'trader',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({
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
  }),
});

describe('useSocialV1HotTokens', () => {
  it('ranks the loaded posts and reports a settled state', () => {
    const posts = [
      post('ETH', 'eth-1'),
      post('BTC', 'btc-1'),
      post('BTC', 'btc-2'),
    ];

    const { result } = renderHook(() => useSocialV1HotTokens(posts, false));

    expect(result.current.tokens.map((token) => token.label)).toEqual([
      'BTC',
      'ETH',
    ]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('stays on the skeleton while the first page has no posts yet', () => {
    const { result } = renderHook(() => useSocialV1HotTokens([], true));

    expect(result.current.tokens).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('keeps a selected asset that is outside the ranked chips', () => {
    const posts = [
      ...Array.from({ length: 10 }, (_, index) =>
        post(`T${String(index).padStart(2, '0')}`, `top-${index}`),
      ),
      post('ZZZ', 'zzz'),
    ];

    const { result } = renderHook(() =>
      useSocialV1HotTokens(posts, false, 'asset:ZZZ'),
    );

    expect(result.current.tokens[0]?.id).toBe('asset:ZZZ');
  });
});
