// Regression: "Maximum update depth exceeded" after posting. Two mounted
// surfaces each serve their own object for the same comment, and a stale entry
// keeps the confirm effect armed, so identity-based confirmation ping-ponged.
import type { Position } from '@metamask/social-controllers';
import { renderHook } from '@testing-library/react-native';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { mockOpenPerpsFeedItem } from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import {
  addPendingPost,
  resetPendingPosts,
  subscribePendingPosts,
} from './pendingPostsStore';
import { usePendingPostsOverlay } from './usePendingPostsOverlay';

jest.mock('react-redux', () => ({ useSelector: jest.fn(() => true) }));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

const OWNER = 'viewer-profile';

const buildPost = (
  id: string,
  overrides: Partial<SocialV1FeedPost> = {},
): SocialV1FeedPost => ({
  id,
  authorHandle: 'Me',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({ id: `item-${id}` }),
  ...overrides,
});

const addEntry = (commentId: string, positionId: string) =>
  addPendingPost({
    ownerProfileId: OWNER,
    post: {
      ...buildPost(`pending-${commentId}`, {
        position: { positionId } as Position,
      }),
      commentId,
    },
  });

// What each feed returns for the new comment: equal content, distinct objects,
// like the Following feed and the profile Posts tab do.
const servedBy = (surface: string) => [
  buildPost(`${surface}-served`, {
    commentId: 'new-comment',
    position: { positionId: 'position-new' } as Position,
  }),
];

describe('pending posts: two surfaces + one stale entry', () => {
  beforeEach(() => resetPendingPosts());

  it.each([
    ['with a stale entry', true],
    ['without a stale entry', false],
  ])('settles without looping %s', (_label, withStale) => {
    // Earlier post of the session that no feed ever returned.
    if (withStale) {
      addEntry('stale-comment', 'position-stale');
    }
    // The post just made, which both feeds do return.
    addEntry('new-comment', 'position-new');

    let notifications = 0;
    const unsubscribe = subscribePendingPosts(() => {
      notifications += 1;
      if (notifications > 200) {
        // Stands in for React's "Maximum update depth exceeded" so the run
        // fails fast instead of running out of memory.
        throw new Error(
          `LOOP: pending-post store notified ${notifications} times`,
        );
      }
    });

    const followingServer = servedBy('following');
    const postsServer = servedBy('posts');
    const refetch = jest.fn().mockResolvedValue(undefined);

    // Profile Posts tab and the Following feed mounted behind it.
    renderHook(() =>
      usePendingPostsOverlay({
        surface: 'following',
        ownerProfileId: undefined,
        serverPosts: followingServer,
        refetch,
      }),
    );
    expect(() =>
      renderHook(() =>
        usePendingPostsOverlay({
          surface: 'posts',
          ownerProfileId: OWNER,
          serverPosts: postsServer,
          refetch,
        }),
      ),
    ).not.toThrow();

    unsubscribe();
    expect(notifications).toBeLessThan(10);
  });
});
