import {
  COMPOSER_POSTING_DELAY_MS,
  commitSocialV1PendingPost,
  consumeSocialV1FocusTrending,
  getSocialV1ComposedPosts,
  getSocialV1PendingPost,
  refreshSocialV1ComposedFeed,
  resetSocialV1ComposedFeedStore,
  submitSocialV1ComposedPost,
  subscribeSocialV1ComposedFeed,
} from './socialV1ComposedFeedStore';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';

const composedPost = {
  id: 'composed-1',
  authorHandle: 'giga-whale',
  timestampMs: Date.now(),
  likeCount: 0,
  commentCount: 0,
  item: mockOpenPerpsFeedItem({ comment: 'this is alpha' }),
};

describe('socialV1ComposedFeedStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetSocialV1ComposedFeedStore();
  });

  afterEach(() => {
    resetSocialV1ComposedFeedStore();
    jest.useRealTimers();
  });

  it('exposes a pending post then commits it after the delay', () => {
    submitSocialV1ComposedPost(composedPost);

    expect(getSocialV1PendingPost()?.item.comment).toBe('this is alpha');
    expect(consumeSocialV1FocusTrending()).toBe(true);
    expect(consumeSocialV1FocusTrending()).toBe(false);

    commitSocialV1PendingPost();

    expect(getSocialV1PendingPost()).toBeNull();
    expect(getSocialV1ComposedPosts()[0].id).toBe('composed-1');
  });

  it('commits via the store posting timer', () => {
    submitSocialV1ComposedPost(composedPost);

    expect(getSocialV1PendingPost()).not.toBeNull();

    jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);

    expect(getSocialV1PendingPost()).toBeNull();
    expect(getSocialV1ComposedPosts()[0].id).toBe('composed-1');
  });

  it('no-ops when committing without a pending post', () => {
    commitSocialV1PendingPost();

    expect(getSocialV1ComposedPosts()).toHaveLength(0);
  });

  it('notifies subscribers when the feed is refreshed on focus', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSocialV1ComposedFeed(listener);

    refreshSocialV1ComposedFeed();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    refreshSocialV1ComposedFeed();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
