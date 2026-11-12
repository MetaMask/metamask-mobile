import { InfiniteQueryObserver } from '@tanstack/query-core';
import { waitFor } from '@testing-library/react-native';
import { assert, createDeferredPromise } from '@metamask/utils';
import { buildCollectiblesSocialApiDataHarness } from '../../../../../../tests/integration/harnesses/collectibles-discovery/social-data-services';
import { collectiblesQueries } from './collectiblesQueries';
import { getCollectiblesCommentTarget } from './socialInvalidation';
import type { CollectiblesSocialApiClient } from '../clients/CollectiblesSocialApiClient';

type FeedPage = Awaited<ReturnType<CollectiblesSocialApiClient['getFeed']>>;
type CommentPage = Awaited<
  ReturnType<CollectiblesSocialApiClient['getComments']>
>;
const scope = 'devnet:alice';

describe('Social commands through the UI/service cache bridge', () => {
  let harness: ReturnType<typeof buildCollectiblesSocialApiDataHarness>;
  beforeEach(() => {
    harness = buildCollectiblesSocialApiDataHarness();
  });
  afterEach(() => harness.destroy());

  const watchFeed = (
    request: Parameters<CollectiblesSocialApiClient['getFeed']>[0] = {},
    viewer = scope,
  ) => {
    const observer = new InfiniteQueryObserver<FeedPage>(harness.ui, {
      queryKey: collectiblesQueries.social('getFeed', viewer, request),
      initialPageParam: null,
      getNextPageParam: (page) => page.nextCursor,
    });
    harness.track(observer.subscribe(() => undefined));
    return observer;
  };

  it('refreshes a reaction in a feed whose first response is still pending', async () => {
    const { client, service } = harness;
    const before = await client.getFeed({});
    const item = before.items[0];
    const updated = {
      ...item,
      engagement: { ...item.engagement, likes: 25, likedByViewer: true },
    };
    const pending = createDeferredPromise<FeedPage>();
    const refreshed = createDeferredPromise<FeedPage>();
    const read = jest
      .spyOn(client, 'getFeed')
      .mockReturnValueOnce(pending.promise)
      .mockReturnValueOnce(refreshed.promise);
    const write = jest.spyOn(client, 'setReaction').mockResolvedValue(updated);
    const feed = watchFeed();
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));

    const reaction = service.setReaction(scope, {
      ...getCollectiblesCommentTarget(item),
      liked: true,
    });
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    pending.resolve(before);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(Date.now()).toBeGreaterThan(feed.getCurrentResult().dataUpdatedAt),
    );
    refreshed.resolve({ items: [updated], nextCursor: null });
    await reaction;

    await waitFor(() =>
      expect(feed.getCurrentResult().data?.pages[0].items[0]).toEqual(updated),
    );
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('refreshes reaction projections while preserving another viewer and unrelated query families', async () => {
    const { client, service } = harness;
    const feedRead = jest.spyOn(client, 'getFeed');
    const profileRead = jest.spyOn(client, 'getProfile');
    const feed = watchFeed();
    const initial = await feed.refetch();
    assert(initial.data, 'The initial feed is available');
    const item = initial.data.pages[0].items[0];
    const otherViewer = watchFeed({}, 'devnet:bob');
    await otherViewer.refetch();
    await service.getProfile(scope, { profileId: 'alex' });
    const updated = {
      ...item,
      engagement: { ...item.engagement, likes: 25, likedByViewer: true },
    };
    jest.spyOn(client, 'setReaction').mockResolvedValue(updated);
    feedRead.mockResolvedValue({ items: [updated], nextCursor: null });
    await waitFor(() =>
      expect(Date.now()).toBeGreaterThan(feed.getCurrentResult().dataUpdatedAt),
    );

    await service.setReaction(scope, {
      ...getCollectiblesCommentTarget(item),
      liked: true,
    });

    await waitFor(() =>
      expect(feed.getCurrentResult().data?.pages[0].items[0]).toEqual(updated),
    );
    expect(otherViewer.getCurrentResult().data?.pages[0].items[0]).toEqual(
      item,
    );
    await service.getProfile(scope, { profileId: 'alex' });
    expect(profileRead).toHaveBeenCalledTimes(1);
    expect(feedRead).toHaveBeenCalledTimes(3);
  });

  it('refreshes a comment thread and its feed count without another thread', async () => {
    const { client, service } = harness;
    const read = jest.spyOn(client, 'getComments');
    const feedRead = jest.spyOn(client, 'getFeed');
    const feed = watchFeed();
    const initial = await feed.refetch();
    assert(initial.data, 'The initial feed is available');
    const [item, otherItem] = initial.data.pages[0].items;
    const target = getCollectiblesCommentTarget(item);
    const otherTarget = getCollectiblesCommentTarget(otherItem);
    const comments = new InfiniteQueryObserver<CommentPage>(harness.ui, {
      queryKey: collectiblesQueries.social('getComments', scope, target),
      initialPageParam: null,
      getNextPageParam: (page) => page.nextCursor,
    });
    harness.track(comments.subscribe(() => undefined));
    await comments.refetch();
    await service.getComments(scope, otherTarget);
    const comment = await client.addComment({
      ...target,
      text: 'A new comment',
    });
    jest.spyOn(client, 'addComment').mockResolvedValue(comment);
    read.mockResolvedValue({ items: [comment], nextCursor: null });
    feedRead.mockResolvedValue({
      items: [{ ...item, engagement: { ...item.engagement, comments: 2 } }],
      nextCursor: null,
    });
    await waitFor(() =>
      expect(Date.now()).toBeGreaterThan(
        comments.getCurrentResult().dataUpdatedAt,
      ),
    );

    await service.addComment(scope, { ...target, text: 'A new comment' });

    await waitFor(() =>
      expect(comments.getCurrentResult().data?.pages[0].items).toContainEqual(
        comment,
      ),
    );
    expect(
      feed.getCurrentResult().data?.pages[0].items[0].engagement.comments,
    ).toBe(2);
    await service.getComments(scope, otherTarget);
    expect(
      read.mock.calls.filter(
        ([request]) => request.targetId === otherTarget.targetId,
      ),
    ).toHaveLength(1);
  });

  it('refreshes global and author feeds after sharing cards without another profile or rankings', async () => {
    const { client, service } = harness;
    const read = jest.spyOn(client, 'getFeed');
    const leaderboard = jest.spyOn(client, 'getLeaderboard');
    const globalFeed = watchFeed();
    const own = watchFeed({ profileId: 'collector' });
    await globalFeed.refetch();
    await own.refetch();
    await service.getFeed(scope, { profileId: 'alex' });
    await service.getLeaderboard(scope, { sort: 'collectiblesPacks' });
    const request = {
      draftId: 'published-cards',
      cards: [
        {
          provider: 'pack-partner' as const,
          mint: 'mint',
          name: 'Card',
          imageUrl: null,
          insuredValueUsd: '10',
        },
      ],
    };
    const post = await client.shareCards(request);
    jest.spyOn(client, 'shareCards').mockResolvedValue(post);
    read.mockResolvedValue({ items: [post], nextCursor: null });
    await waitFor(() =>
      expect(Date.now()).toBeGreaterThan(own.getCurrentResult().dataUpdatedAt),
    );

    await service.shareCards(scope, request);

    await waitFor(() =>
      expect(globalFeed.getCurrentResult().data?.pages[0].items[0]).toEqual(
        post,
      ),
    );
    expect(own.getCurrentResult().data?.pages[0].items[0]).toEqual(post);
    await service.getFeed(scope, { profileId: 'alex' });
    await service.getLeaderboard(scope, { sort: 'collectiblesPacks' });
    expect(
      read.mock.calls.filter(([value]) => value.profileId === 'alex'),
    ).toHaveLength(1);
    expect(leaderboard).toHaveBeenCalledTimes(1);
  });

  it('does not retry a write or turn a committed write into a failure when refreshing fails', async () => {
    const { client, service } = harness;
    const feed = watchFeed();
    const initial = await feed.refetch();
    assert(initial.data, 'The initial feed is available');
    const item = initial.data.pages[0].items[0];
    const write = jest.spyOn(client, 'setReaction');
    const read = jest.spyOn(client, 'getFeed');
    const request = { ...getCollectiblesCommentTarget(item), liked: true };
    write.mockRejectedValueOnce(new Error('Write unavailable'));

    await expect(service.setReaction(scope, request)).rejects.toThrow(
      'Write unavailable',
    );
    expect(read).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
    read.mockRejectedValueOnce(new Error('Refresh unavailable'));
    await expect(service.setReaction(scope, request)).resolves.toMatchObject({
      engagement: { likedByViewer: true },
    });
    expect(write).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
