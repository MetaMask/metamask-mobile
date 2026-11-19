import Engine from '../../core/Engine';

let inflightSync: Promise<void> | null = null;

/**
 * Replaces `SocialController.followingProfileIds` with the server's following
 * list, and records the request so a follow/unfollow that lands while it is in
 * flight can re-sync once it settles (see
 * {@link resyncFollowingIfSyncInFlight}).
 *
 * @returns The `SocialController:updateFollowing` promise.
 */
export const syncFollowingState = (): Promise<unknown> => {
  const sync = Engine.controllerMessenger.call(
    'SocialController:updateFollowing',
  );
  const settled: Promise<void> = sync.then(
    () => undefined,
    () => undefined,
  );
  const tracked = settled.then(() => {
    if (inflightSync === tracked) {
      inflightSync = null;
    }
  });
  inflightSync = tracked;
  return sync;
};

/**
 * Call after a follow/unfollow succeeds. A sync whose GET started before that
 * write can resolve after it and put the stale list back into state, so wait
 * for it and fetch again. `SocialService` dedupes in-flight fetches, so the
 * second request only starts once the first has settled.
 */
export const resyncFollowingIfSyncInFlight = async (): Promise<void> => {
  const pending = inflightSync;
  if (!pending) {
    return;
  }
  await pending;
  await syncFollowingState();
};

/** Forgets any tracked sync between unit tests. */
export const resetFollowingSyncForTests = (): void => {
  inflightSync = null;
};
