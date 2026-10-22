import type { Position } from '@metamask/social-controllers';
import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { mockOpenPerpsFeedItem } from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import {
  addPendingPost,
  confirmPendingPosts,
  getPendingPostsSnapshot,
  type PendingPostEntry,
  resetPendingPosts,
} from './pendingPostsStore';
import {
  getConfirmationSchedule,
  overlayPendingPosts,
  usePendingPostsOverlay,
} from './usePendingPostsOverlay';

jest.mock('react-redux', () => ({ useSelector: jest.fn(() => true) }));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => null,
}));

const OWNER = 'viewer-profile';

const buildPost = (
  id: string,
  overrides: Partial<SocialV1FeedPost> = {},
): SocialV1FeedPost => ({
  id,
  authorHandle: 'Giga Whale',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({ id: `item-${id}` }),
  ...overrides,
});

const buildEntry = (
  overrides: Partial<PendingPostEntry> = {},
): PendingPostEntry => ({
  commentId: 'comment-1',
  positionId: 'position-1',
  ownerProfileId: OWNER,
  post: buildPost('pending-comment-1', {
    commentId: 'comment-1',
    isPending: true,
  }),
  createdAtMs: 0,
  confirmedPost: null,
  dismissedOn: { following: false, posts: false },
  ...overrides,
});

const serverRow = (id: string, commentId: string, positionId: string) =>
  buildPost(id, {
    commentId,
    position: { positionId } as Position,
  });

describe('overlayPendingPosts', () => {
  const otherRow = serverRow('other', 'comment-9', 'position-9');

  it('passes the feed through on someone else’s surface', () => {
    const result = overlayPendingPosts('following', [buildEntry()], undefined, [
      otherRow,
    ]);

    expect(result).toEqual({ pinnedPosts: [], posts: [otherRow] });
  });

  it('ignores another profile’s entries', () => {
    const result = overlayPendingPosts(
      'posts',
      [buildEntry({ ownerProfileId: 'someone-else' })],
      OWNER,
      [otherRow],
    );

    expect(result.pinnedPosts).toEqual([]);
  });

  it('pins a pending post and hides the stale row for its position', () => {
    const staleRow = serverRow('stale', 'older-comment', 'position-1');

    const result = overlayPendingPosts('posts', [buildEntry()], OWNER, [
      staleRow,
      otherRow,
    ]);

    expect(result.pinnedPosts.map((post) => post.id)).toEqual([
      'pending-comment-1',
    ]);
    expect(result.posts).toEqual([otherRow]);
  });

  it('lets the Posts feed take over once it returns the comment', () => {
    const served = serverRow('served', 'comment-1', 'position-1');

    const result = overlayPendingPosts('posts', [buildEntry()], OWNER, [
      served,
      otherRow,
    ]);

    expect(result.pinnedPosts).toEqual([]);
    expect(result.posts).toEqual([served, otherRow]);
  });

  it('keeps the confirmed copy pinned on Following, under the pending id', () => {
    const served = serverRow('served', 'comment-1', 'position-1');

    const result = overlayPendingPosts(
      'following',
      [buildEntry({ confirmedPost: served })],
      OWNER,
      [otherRow, served],
    );

    expect(result.pinnedPosts).toEqual([
      { ...served, id: 'pending-comment-1' },
    ]);
    expect(result.posts).toEqual([otherRow]);
  });

  it('drops an entry dismissed on that surface', () => {
    const result = overlayPendingPosts(
      'following',
      [buildEntry({ dismissedOn: { following: true, posts: false } })],
      OWNER,
      [otherRow],
    );

    expect(result).toEqual({ pinnedPosts: [], posts: [otherRow] });
  });
});

describe('getConfirmationSchedule', () => {
  it('does not refetch without connectivity', () => {
    expect(getConfirmationSchedule('HIGH', 'NONE')).toEqual([]);
  });

  it('refetches rarely on a low-end device over slow cellular', () => {
    expect(getConfirmationSchedule('LOW', 'SLOW_CELLULAR')).toEqual([
      5_000, 15_000,
    ]);
  });

  it('refetches less over slow cellular', () => {
    expect(getConfirmationSchedule('HIGH', 'SLOW_CELLULAR')).toEqual([
      2_000, 6_000, 15_000,
    ]);
  });

  it.each([
    ['HIGH', 'WIFI'],
    ['LOW', 'WIFI'],
    [null, null],
    ['MID', null],
  ] as const)('uses the default cadence for %s / %s', (hardware, network) => {
    expect(getConfirmationSchedule(hardware, network)).toEqual([
      1_000, 2_000, 4_000, 8_000, 15_000,
    ]);
  });
});

describe('usePendingPostsOverlay', () => {
  beforeEach(() => {
    resetPendingPosts();
    jest.mocked(useSelector).mockReturnValue(true);
  });

  it('releases nothing when a surface without an owner is refreshed', async () => {
    addPendingPost({
      ownerProfileId: OWNER,
      post: { ...buildPost('pending-comment-1'), commentId: 'comment-1' },
    });
    confirmPendingPosts([
      { ...buildPost('server-row'), commentId: 'comment-1' },
    ]);
    const refetch = jest.fn(async () => undefined);
    const { result } = renderHook(() =>
      usePendingPostsOverlay({
        surface: 'posts',
        ownerProfileId: undefined,
        serverPosts: [],
        refetch,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(getPendingPostsSnapshot()[0].dismissedOn.posts).toBe(false);
  });

  it('releases the owner’s settled posts on their surface’s refresh', async () => {
    addPendingPost({
      ownerProfileId: OWNER,
      post: { ...buildPost('pending-comment-1'), commentId: 'comment-1' },
    });
    confirmPendingPosts([
      { ...buildPost('server-row'), commentId: 'comment-1' },
    ]);
    const { result } = renderHook(() =>
      usePendingPostsOverlay({
        surface: 'posts',
        ownerProfileId: OWNER,
        serverPosts: [],
        refetch: async () => undefined,
      }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(getPendingPostsSnapshot()[0].dismissedOn.posts).toBe(true);
  });

  it('clears every pending post when the wallet locks', () => {
    addPendingPost({
      ownerProfileId: OWNER,
      post: { ...buildPost('pending-comment-1'), commentId: 'comment-1' },
    });
    const { rerender } = renderHook(() =>
      usePendingPostsOverlay({
        surface: 'following',
        ownerProfileId: OWNER,
        serverPosts: [],
        refetch: async () => undefined,
      }),
    );

    jest.mocked(useSelector).mockReturnValue(false);
    act(() => {
      rerender({});
    });

    expect(getPendingPostsSnapshot()).toEqual([]);
  });
});
