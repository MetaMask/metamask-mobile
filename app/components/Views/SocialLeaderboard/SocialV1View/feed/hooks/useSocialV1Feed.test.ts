import { act, renderHook } from '@testing-library/react-native';
import {
  useTraderFeed,
  type TraderFeedRow,
} from '../../../FeedView/hooks/useTraderFeed';
import { mockPerpFeedItem } from '../../../FeedView/mocks/coreFeed.mock';
import { mapFeedItem } from '../../../FeedView/utils/mapFeedItem';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import {
  COMPOSER_POSTING_DELAY_MS,
  resetSocialV1ComposedFeedStore,
  startSocialV1PendingPostCountdown,
  submitSocialV1ComposedPost,
} from '../store/socialV1ComposedFeedStore';
import { useSocialV1Feed } from './useSocialV1Feed';

jest.mock('../../../FeedView/hooks/useTraderFeed');

const mockUseTraderFeed = jest.mocked(useTraderFeed);

const buildRow = (positionId: string): TraderFeedRow => {
  const core = mockPerpFeedItem({ positionId });
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error('fixture did not map to a FeedItem');
  }
  return { item, core };
};

const arrangeFeed = (
  rows: TraderFeedRow[],
  overrides: Partial<ReturnType<typeof useTraderFeed>> = {},
) => {
  mockUseTraderFeed.mockReturnValue({
    rows,
    items: rows.map((row) => row.item),
    sections: [],
    hasLoadedItems: rows.length > 0,
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: jest.fn(),
    error: null,
    refresh: jest.fn(),
    dataUpdatedAt: undefined,
    ...overrides,
  });
};

const composedPost = () => ({
  id: 'composed-1',
  authorHandle: 'giga-whale',
  timestampMs: Date.now(),
  reactions: [],
  item: mockOpenPerpsFeedItem({
    id: 'composed-item',
    comment: 'this is alpha',
  }),
});

describe('useSocialV1Feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    arrangeFeed([buildRow('pos-1'), buildRow('pos-2')]);
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

  describe('live data', () => {
    it('wraps every loaded row into a post, preserving order', () => {
      const { result } = renderHook(() => useSocialV1Feed('trending'));

      expect(result.current.posts.map((post) => post.id)).toEqual([
        'pos-1-1700000500',
        'pos-2-1700000500',
      ]);
    });

    it('copies the real trader onto the post envelope', () => {
      const { result } = renderHook(() => useSocialV1Feed('trending'));

      expect(result.current.posts[0].authorHandle).toBe('aparjey');
    });

    // The header reads the trader's stats off the item rather than the
    // envelope, and reports nothing when the actor sent nothing.
    it('carries the actor stats through without inventing a win rate', () => {
      const { result } = renderHook(() => useSocialV1Feed('trending'));

      expect(result.current.posts[0].item.author.winRatePercent).toBeNull();
    });

    it('reads the leaderboard scope on Trending', () => {
      renderHook(() => useSocialV1Feed('trending'));

      expect(mockUseTraderFeed).toHaveBeenCalledWith({ audience: 'all' });
    });

    // Following must hit its own scope, or both tabs would render one list.
    it('reads the following scope on Following', () => {
      renderHook(() => useSocialV1Feed('following'));

      expect(mockUseTraderFeed).toHaveBeenCalledWith({ audience: 'following' });
    });

    // Without these forwarded, the feed stops after page one and a failed
    // fetch has no recovery path.
    it('forwards the pagination controls', () => {
      const loadMore = jest.fn();
      const refresh = jest.fn();
      arrangeFeed([buildRow('pos-1')], {
        hasNextPage: true,
        isFetchingNextPage: true,
        loadMore,
        refresh,
      });

      const { result } = renderHook(() => useSocialV1Feed('trending'));

      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.isFetchingNextPage).toBe(true);
      result.current.loadMore();
      expect(loadMore).toHaveBeenCalled();
      result.current.refresh();
      expect(refresh).toHaveBeenCalled();
    });

    it('forwards the pagination controls on Following too', () => {
      const loadMore = jest.fn();
      arrangeFeed([buildRow('pos-1')], { hasNextPage: true, loadMore });

      const { result } = renderHook(() => useSocialV1Feed('following'));

      result.current.loadMore();
      expect(loadMore).toHaveBeenCalled();
    });

    it('surfaces the feed loading and error state', () => {
      arrangeFeed([], { isLoading: true, error: 'Network request failed' });

      const { result } = renderHook(() => useSocialV1Feed('trending'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Network request failed');
      expect(result.current.posts).toEqual([]);
    });
  });

  describe('composer', () => {
    it('keeps composed posts off the Following tab', () => {
      const composed = composedPost();
      submitSocialV1ComposedPost(composed);

      const { result } = renderHook(() => useSocialV1Feed('following'));

      expect(
        result.current.posts.every((post) => post.id !== composed.id),
      ).toBe(true);
      expect(result.current.pendingPost).toBeNull();
    });

    it('prepends a composed post on Trending after the posting delay', () => {
      const composed = composedPost();
      const { result } = renderHook(() => useSocialV1Feed('trending'));

      act(() => {
        submitSocialV1ComposedPost(composed);
      });

      expect(result.current.pendingPost?.item.comment).toBe('this is alpha');
      // The clock only starts once the banner is on screen, so the post is
      // still pending here no matter how much time passes.
      expect(result.current.pendingStartedAtMs).toBeNull();

      act(() => {
        startSocialV1PendingPostCountdown();
      });

      expect(result.current.pendingStartedAtMs).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);
      });

      expect(result.current.pendingPost).toBeNull();
      expect(result.current.posts[0].id).toBe(composed.id);
    });

    it('keeps live posts below a composed one', () => {
      const composed = composedPost();
      const { result } = renderHook(() => useSocialV1Feed('trending'));

      act(() => {
        submitSocialV1ComposedPost(composed);
        startSocialV1PendingPostCountdown();
      });
      act(() => {
        jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);
      });

      expect(result.current.posts.map((post) => post.id)).toEqual([
        composed.id,
        'pos-1-1700000500',
        'pos-2-1700000500',
      ]);
    });
  });
});
