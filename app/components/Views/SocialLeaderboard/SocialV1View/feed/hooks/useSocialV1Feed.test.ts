import { act, renderHook } from '@testing-library/react-native';
import {
  useSocialFeed,
  type SocialFeedState,
} from '../../../../../UI/SocialFeed/data/useSocialFeed';
import { type TraderFeedRow } from '../../../../../UI/SocialFeed/types';
import { mockPerpFeedItem } from '../../../../../UI/SocialFeed/mocks/coreFeed.mock';
import { mapFeedItem } from '../../../../../UI/SocialFeed/utils/mapFeedItem';
import { toSocialFeedPosts } from '../../../../../UI/SocialFeed/utils/toSocialFeedPosts';
import { mockOpenPerpsFeedItem } from '../../../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import {
  addPendingPost,
  resetPendingPosts,
} from '../../../pendingPosts/pendingPostsStore';
import { useSocialV1Feed } from './useSocialV1Feed';

jest.mock('../../../../../UI/SocialFeed/data/useSocialFeed');

// Unlocked wallet, unknown network: the overlay's defaults.
let mockIsSocialV1Treatment = true;
jest.mock('react-redux', () => ({
  useSelector: () => mockIsSocialV1Treatment,
}));
jest.mock('../../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => null,
}));

const OWNER = 'viewer-profile';

const mockUseSocialFeed = jest.mocked(useSocialFeed);

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
  overrides: Partial<SocialFeedState> = {},
) => {
  mockUseSocialFeed.mockReturnValue({
    posts: toSocialFeedPosts(rows),
    rows,
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

const pendingPost = () => ({
  id: 'pending-comment-1',
  commentId: 'comment-1',
  authorHandle: 'Giga Whale',
  timestampMs: Date.now(),
  reactions: [],
  item: mockOpenPerpsFeedItem({
    id: 'pending-item',
    comment: 'this is alpha',
  }),
});

describe('useSocialV1Feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSocialV1Treatment = true;
    jest.useFakeTimers();
    arrangeFeed([buildRow('pos-1'), buildRow('pos-2')]);
    act(() => {
      resetPendingPosts();
    });
  });

  afterEach(() => {
    act(() => {
      resetPendingPosts();
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
      expect(result.current.posts[0].item.variant).toBe('perpsClosed');
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

    it('reads the trending scope on Trending', () => {
      renderHook(() => useSocialV1Feed('trending'));

      expect(mockUseSocialFeed).toHaveBeenCalledWith(
        { scope: 'trending' },
        {
          performance: { tab: 'trending' },
        },
      );
    });

    // Following must hit its own scope, or both tabs would render one list.
    it('reads the following scope on Following', () => {
      renderHook(() => useSocialV1Feed('following'));

      expect(mockUseSocialFeed).toHaveBeenCalledWith(
        { scope: 'following' },
        {
          performance: { tab: 'following' },
        },
      );
    });

    it('omits performance tracing outside the Social V1 treatment', () => {
      mockIsSocialV1Treatment = false;

      renderHook(() => useSocialV1Feed('trending'));

      expect(mockUseSocialFeed).toHaveBeenCalledWith(
        { scope: 'trending' },
        { performance: undefined },
      );
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

  describe('pending posts', () => {
    it('does not pin a local post on Following', () => {
      const { result } = renderHook(() => useSocialV1Feed('following'));

      act(() => {
        addPendingPost({ ownerProfileId: OWNER, post: pendingPost() });
      });

      expect(result.current.pinnedPosts).toEqual([]);
      expect(result.current.posts).toHaveLength(2);
    });

    it('shows the post on Following once the feed returns that comment', () => {
      const { result, rerender } = renderHook(() =>
        useSocialV1Feed('following'),
      );
      act(() => {
        addPendingPost({ ownerProfileId: OWNER, post: pendingPost() });
      });

      arrangeFeed([buildRow('pos-2')], {
        posts: [
          {
            ...toSocialFeedPosts([buildRow('pos-2')])[0],
            commentId: 'comment-1',
          },
        ],
      });
      rerender({});

      expect(result.current.pinnedPosts).toEqual([]);
      expect(result.current.posts[0].commentId).toBe('comment-1');
    });

    it('does not refetch Following because a local post is waiting', async () => {
      const refresh = jest.fn(async () => undefined);
      arrangeFeed([buildRow('pos-1')], { refresh });
      renderHook(() => useSocialV1Feed('following'));

      act(() => {
        addPendingPost({ ownerProfileId: OWNER, post: pendingPost() });
      });
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });

      expect(refresh).not.toHaveBeenCalled();
    });
  });
});
