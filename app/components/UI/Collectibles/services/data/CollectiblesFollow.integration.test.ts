import { assert, createDeferredPromise } from '@metamask/utils';
import { QueryObserver } from '@tanstack/query-core';
import { waitFor } from '@testing-library/react-native';
import { buildCollectiblesSocialApiDataHarness } from '../../../../../../tests/integration/harnesses/collectibles-discovery/social-data-services';
import type { CollectiblesSocialApiClient } from '../clients/CollectiblesSocialApiClient';
import { collectiblesQueries } from './collectiblesQueries';

type Profile = Awaited<ReturnType<CollectiblesSocialApiClient['getProfile']>>;

describe('Social follow cache invalidation', () => {
  let harness: ReturnType<typeof buildCollectiblesSocialApiDataHarness>;
  beforeEach(() => {
    harness = buildCollectiblesSocialApiDataHarness();
  });
  afterEach(() => harness.destroy());

  it('refreshes a profile whose first read started before the follow completed', async () => {
    const { client, service, ui } = harness;
    const scope = 'devnet:viewer';
    const request = { profileId: 'alex' };
    const before = await client.getProfile(request);
    assert(before, 'The profile is available');
    const changed = { ...before, isFollowing: true, followerCount: 183 };
    const pending = createDeferredPromise<Profile>();
    const refreshed = createDeferredPromise<Profile>();
    const read = jest
      .spyOn(client, 'getProfile')
      .mockReturnValueOnce(pending.promise)
      .mockReturnValueOnce(refreshed.promise);
    const write = jest.spyOn(client, 'setFollow').mockResolvedValue(changed);
    const profile = new QueryObserver<Profile>(ui, {
      queryKey: collectiblesQueries.social('getProfile', scope, request),
    });
    harness.track(profile.subscribe(() => undefined));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));

    const follow = service.setFollow(scope, { ...request, following: true });
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    pending.resolve(before);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(Date.now()).toBeGreaterThan(
        profile.getCurrentResult().dataUpdatedAt,
      ),
    );
    refreshed.resolve(changed);
    await follow;

    await waitFor(() =>
      expect(profile.getCurrentResult().data).toEqual(changed),
    );
    expect(read).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('refreshes the affected profile without changing cached scores', async () => {
    const { client, service } = harness;
    const profileRead = jest.spyOn(client, 'getProfile');
    const scope = 'devnet:viewer';
    const request = { profileId: 'alex' };
    const before = await service.getProfile(scope, request);
    const ranked = await service.getLeaderboard(scope, {
      sort: 'collectiblesPacks',
    });
    assert(before, 'The profile is available');
    const changed = { ...before, isFollowing: true, followerCount: 183 };
    jest.spyOn(client, 'setFollow').mockResolvedValue(changed);
    profileRead.mockResolvedValue(changed);

    await service.setFollow(scope, { ...request, following: true });

    expect(await service.getProfile(scope, request)).toEqual(changed);
    expect(profileRead).toHaveBeenCalledTimes(2);
    expect(before?.isFollowing).toBe(false);
    expect(
      (
        await service.getLeaderboard(scope, { sort: 'collectiblesPacks' })
      ).items.map(({ rank, summary }) => ({ rank, summary })),
    ).toEqual(ranked.items.map(({ rank, summary }) => ({ rank, summary })));
  });

  it('does not invalidate or retry a rejected relationship change', async () => {
    const { client, service } = harness;
    const read = jest.spyOn(client, 'getProfile');
    const write = jest
      .spyOn(client, 'setFollow')
      .mockRejectedValueOnce(new Error('Follow unavailable'));
    const request = { profileId: 'alex' };
    await service.getProfile('devnet:viewer', request);

    await expect(
      service.setFollow('devnet:viewer', { ...request, following: true }),
    ).rejects.toThrow('Follow unavailable');

    await service.getProfile('devnet:viewer', request);
    expect(write).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
