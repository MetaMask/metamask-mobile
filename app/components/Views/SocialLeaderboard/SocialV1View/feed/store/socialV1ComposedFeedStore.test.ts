import {
  COMPOSER_COUNTDOWN_FALLBACK_MS,
  COMPOSER_POSTING_DELAY_MS,
  commitSocialV1PendingPost,
  consumeSocialV1FocusTrending,
  getSocialV1ComposedFeedSnapshot,
  getSocialV1ComposedPosts,
  getSocialV1PendingPost,
  getSocialV1PendingStartedAtMs,
  refreshSocialV1ComposedFeed,
  resetSocialV1ComposedFeedStore,
  startSocialV1PendingPostCountdown,
  submitSocialV1ComposedPost,
  subscribeSocialV1ComposedFeed,
} from './socialV1ComposedFeedStore';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';

const composedPost = {
  id: 'composed-1',
  authorHandle: 'giga-whale',
  timestampMs: Date.now(),
  reactions: [],
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

  it('holds the post pending until the countdown starts', () => {
    submitSocialV1ComposedPost(composedPost);

    expect(getSocialV1PendingStartedAtMs()).toBeNull();

    // Time passing before the banner is visible must not commit the post,
    // otherwise the progress bar is skipped entirely.
    jest.advanceTimersByTime(COMPOSER_COUNTDOWN_FALLBACK_MS - 1);

    expect(getSocialV1PendingPost()).not.toBeNull();
    expect(getSocialV1ComposedPosts()).toHaveLength(0);
  });

  it('starts the countdown itself if the banner never mounts', () => {
    submitSocialV1ComposedPost(composedPost);

    jest.advanceTimersByTime(COMPOSER_COUNTDOWN_FALLBACK_MS);

    expect(getSocialV1PendingStartedAtMs()).not.toBeNull();

    jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);

    expect(getSocialV1PendingPost()).toBeNull();
    expect(getSocialV1ComposedPosts()[0].id).toBe('composed-1');
  });

  it('does not let the fallback restart a countdown the banner began', () => {
    submitSocialV1ComposedPost(composedPost);
    startSocialV1PendingPostCountdown();
    const startedAtMs = getSocialV1PendingStartedAtMs();

    jest.advanceTimersByTime(COMPOSER_COUNTDOWN_FALLBACK_MS);

    expect(getSocialV1PendingStartedAtMs()).toBe(startedAtMs);
  });

  it('commits via the store posting timer once the countdown starts', () => {
    submitSocialV1ComposedPost(composedPost);
    startSocialV1PendingPostCountdown();

    expect(getSocialV1PendingStartedAtMs()).not.toBeNull();

    jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);

    expect(getSocialV1PendingPost()).toBeNull();
    expect(getSocialV1ComposedPosts()[0].id).toBe('composed-1');
  });

  it('keeps the original clock when the countdown is started twice', () => {
    submitSocialV1ComposedPost(composedPost);
    startSocialV1PendingPostCountdown();
    const startedAt = getSocialV1PendingStartedAtMs();

    jest.advanceTimersByTime(500);
    startSocialV1PendingPostCountdown();

    expect(getSocialV1PendingStartedAtMs()).toBe(startedAt);

    jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS - 500);

    expect(getSocialV1ComposedPosts()[0].id).toBe('composed-1');
  });

  it('no-ops starting the countdown with no pending post', () => {
    startSocialV1PendingPostCountdown();

    expect(getSocialV1PendingStartedAtMs()).toBeNull();
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

  // React Compiler is off under Jest, so these assertions are the only guard
  // against the feed reading mutable state that the compiler can cache: every
  // mutation must hand React a brand-new snapshot object.
  it('replaces the snapshot identity on every mutation', () => {
    const initial = getSocialV1ComposedFeedSnapshot();

    submitSocialV1ComposedPost(composedPost);
    const afterSubmit = getSocialV1ComposedFeedSnapshot();

    expect(afterSubmit).not.toBe(initial);
    expect(afterSubmit.pendingPost?.item.comment).toBe('this is alpha');

    startSocialV1PendingPostCountdown();
    const afterCountdown = getSocialV1ComposedFeedSnapshot();

    expect(afterCountdown).not.toBe(afterSubmit);
    expect(afterCountdown.pendingStartedAtMs).not.toBeNull();

    commitSocialV1PendingPost();
    const afterCommit = getSocialV1ComposedFeedSnapshot();

    expect(afterCommit).not.toBe(afterCountdown);
    expect(afterCommit.pendingPost).toBeNull();
    expect(afterCommit.composedPosts[0].id).toBe('composed-1');
  });

  it('keeps the snapshot stable between mutations', () => {
    submitSocialV1ComposedPost(composedPost);

    expect(getSocialV1ComposedFeedSnapshot()).toBe(
      getSocialV1ComposedFeedSnapshot(),
    );
  });
});
