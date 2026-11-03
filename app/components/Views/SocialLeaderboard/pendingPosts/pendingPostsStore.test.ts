import type { Position } from '@metamask/social-controllers';
import type { SocialV1FeedPost } from '../../../UI/SocialFeed/types';
import { mockOpenPerpsFeedItem } from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import {
  addPendingPost,
  confirmPendingPosts,
  consumePostsTabFocus,
  dismissSettledPendingPosts,
  getPendingPostsSnapshot,
  PENDING_POST_CONFIRM_WINDOW_MS,
  requestPostsTabFocus,
  resetPendingPosts,
  subscribePendingPosts,
} from './pendingPostsStore';

const NOW = 1_700_000_000_000;
const OWNER = 'viewer-profile';

const buildPost = (
  commentId: string,
  overrides: Partial<SocialV1FeedPost> = {},
): SocialV1FeedPost & { commentId: string } => ({
  id: `pending-${commentId}`,
  commentId,
  authorHandle: 'Giga Whale',
  timestampMs: NOW,
  reactions: [],
  item: mockOpenPerpsFeedItem({ id: `item-${commentId}` }),
  position: { positionId: `position-${commentId}` } as Position,
  ...overrides,
});

describe('pendingPostsStore', () => {
  beforeEach(() => {
    resetPendingPosts();
  });

  describe('addPendingPost', () => {
    it('adds the post, marked pending, newest first', () => {
      addPendingPost({
        ownerProfileId: OWNER,
        post: buildPost('a'),
        nowMs: NOW,
      });
      addPendingPost({
        ownerProfileId: OWNER,
        post: buildPost('b'),
        nowMs: NOW + 1,
      });

      const entries = getPendingPostsSnapshot();
      expect(entries.map((entry) => entry.commentId)).toEqual(['b', 'a']);
      expect(entries[0]).toMatchObject({
        ownerProfileId: OWNER,
        positionId: 'position-b',
        createdAtMs: NOW + 1,
        confirmedPost: null,
        dismissedOn: { following: false, posts: false },
      });
      expect(entries[0].post.isPending).toBe(true);
    });

    it('replaces an entry for the same comment', () => {
      addPendingPost({ ownerProfileId: OWNER, post: buildPost('a') });
      addPendingPost({
        ownerProfileId: OWNER,
        post: buildPost('a', { authorHandle: 'Renamed' }),
      });

      expect(getPendingPostsSnapshot()).toHaveLength(1);
      expect(getPendingPostsSnapshot()[0].post.authorHandle).toBe('Renamed');
    });

    it('notifies subscribers with a new snapshot', () => {
      const listener = jest.fn();
      const unsubscribe = subscribePendingPosts(listener);
      const before = getPendingPostsSnapshot();

      addPendingPost({ ownerProfileId: OWNER, post: buildPost('a') });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(getPendingPostsSnapshot()).not.toBe(before);
      unsubscribe();
    });
  });

  describe('confirmPendingPosts', () => {
    it('records the server copy of a returned comment', () => {
      addPendingPost({ ownerProfileId: OWNER, post: buildPost('a') });
      const serverPost = buildPost('a', { id: 'server-row', isPending: false });

      confirmPendingPosts([serverPost]);

      expect(getPendingPostsSnapshot()[0].confirmedPost).toBe(serverPost);
    });

    it('leaves the snapshot alone when nothing new is returned', () => {
      addPendingPost({ ownerProfileId: OWNER, post: buildPost('a') });
      const before = getPendingPostsSnapshot();

      confirmPendingPosts([buildPost('other')]);

      expect(getPendingPostsSnapshot()).toBe(before);
    });
  });

  describe('dismissSettledPendingPosts', () => {
    it('releases confirmed entries from the refreshed surface only', () => {
      addPendingPost({
        ownerProfileId: OWNER,
        post: buildPost('a'),
        nowMs: NOW,
      });
      confirmPendingPosts([buildPost('a', { id: 'server-row' })]);

      dismissSettledPendingPosts('following', NOW + 1);

      expect(getPendingPostsSnapshot()[0].dismissedOn).toEqual({
        following: true,
        posts: false,
      });
    });

    it('keeps an unconfirmed entry inside the confirmation window', () => {
      addPendingPost({
        ownerProfileId: OWNER,
        post: buildPost('a'),
        nowMs: NOW,
      });

      dismissSettledPendingPosts('following', NOW + 1_000);

      expect(getPendingPostsSnapshot()[0].dismissedOn.following).toBe(false);
    });

    it('releases an unconfirmed entry past the confirmation window', () => {
      addPendingPost({
        ownerProfileId: OWNER,
        post: buildPost('a'),
        nowMs: NOW,
      });

      dismissSettledPendingPosts('posts', NOW + PENDING_POST_CONFIRM_WINDOW_MS);

      expect(getPendingPostsSnapshot()[0].dismissedOn.posts).toBe(true);
    });
  });

  describe('Posts tab focus', () => {
    it('is consumed once after a request', () => {
      requestPostsTabFocus(NOW);

      expect(consumePostsTabFocus(NOW + 500)).toBe(true);
      expect(consumePostsTabFocus(NOW + 600)).toBe(false);
    });

    it('expires when the profile is not reached soon after posting', () => {
      requestPostsTabFocus(NOW);

      expect(consumePostsTabFocus(NOW + 60_000)).toBe(false);
    });

    it('is cleared by a reset', () => {
      requestPostsTabFocus(NOW);
      resetPendingPosts();

      expect(consumePostsTabFocus(NOW)).toBe(false);
    });
  });
});
