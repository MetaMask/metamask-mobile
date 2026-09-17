import { renderHook, act } from '@testing-library/react-native';
import {
  MOCK_SOCIAL_V1_FEED_ITEMS,
  mockOpenPerpsFeedItem,
} from '../mocks/socialV1Feed.mock';
import {
  resetSocialV1ComposedFeedStore,
  submitSocialV1ComposedPost,
  COMPOSER_POSTING_DELAY_MS,
} from '../store/socialV1ComposedFeedStore';
import { useSocialV1Feed } from './useSocialV1Feed';

describe('useSocialV1Feed', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    act(() => {
      resetSocialV1ComposedFeedStore();
    });
  });

  afterEach(() => {
    act(() => {
      resetSocialV1ComposedFeedStore();
    });
    jest.useRealTimers();
  });

  it('returns wrapped mock posts on Trending', () => {
    const { result } = renderHook(() => useSocialV1Feed('trending'));

    expect(result.current.posts).toHaveLength(MOCK_SOCIAL_V1_FEED_ITEMS.length);
    expect(result.current.posts.map((post) => post.item.variant)).toEqual([
      'perpsOpen',
      'perpsClosed',
      'spotCompact',
    ]);
    expect(result.current.pendingPost).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('keeps composed posts off the Following tab', () => {
    const composed = {
      id: 'composed-1',
      authorHandle: 'giga-whale',
      timestampMs: Date.now(),
      likeCount: 0,
      commentCount: 0,
      item: mockOpenPerpsFeedItem({
        id: 'composed-item',
        comment: 'this is alpha',
      }),
    };

    submitSocialV1ComposedPost(composed);

    const { result } = renderHook(() => useSocialV1Feed('following'));

    expect(result.current.posts.every((post) => post.id !== composed.id)).toBe(
      true,
    );
    expect(result.current.pendingPost).toBeNull();
  });

  it('prepends a composed post on Trending after the posting delay', () => {
    const composed = {
      id: 'composed-1',
      authorHandle: 'giga-whale',
      timestampMs: Date.now(),
      likeCount: 0,
      commentCount: 0,
      item: mockOpenPerpsFeedItem({
        id: 'composed-item',
        comment: 'this is alpha',
      }),
    };

    const { result } = renderHook(() => useSocialV1Feed('trending'));

    act(() => {
      submitSocialV1ComposedPost(composed);
    });

    expect(result.current.pendingPost?.item.comment).toBe('this is alpha');

    act(() => {
      jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);
    });

    expect(result.current.pendingPost).toBeNull();
    expect(result.current.posts[0].id).toBe(composed.id);
  });
});
