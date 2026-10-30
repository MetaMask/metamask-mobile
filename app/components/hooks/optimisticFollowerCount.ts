import { useEffect, useSyncExternalStore } from 'react';

/**
 * Local follower-count adjustment for one trader.
 *
 * The profile query keeps the last server `followerCount`. Follow state
 * updates immediately, so the profile screen applies `delta` until a refetch
 * has moved the server count far enough to include that change.
 */
export interface PendingFollowerCount {
  /** Profile `followerCount` when this adjustment was opened. */
  baseline: number;
  /** Net follows (+1) or unfollows (-1) still missing from `baseline`. */
  delta: number;
}

type OptimisticFollowerCountListener = () => void;

let pendingFollowerCounts: Record<string, PendingFollowerCount> = {};
let serverFollowerCountBaselines: Record<string, number> = {};
/**
 * Pending adjustment from before the in-flight toggle, so a failed request
 * can restore it. `null` means there was no adjustment.
 */
let followerCountSnapshots: Record<string, PendingFollowerCount | null> = {};
const followerCountListeners = new Set<OptimisticFollowerCountListener>();

const emitPendingFollowerCounts = (): void => {
  followerCountListeners.forEach((listener) => listener());
};

const subscribePendingFollowerCounts = (
  listener: OptimisticFollowerCountListener,
): (() => void) => {
  followerCountListeners.add(listener);
  return () => {
    followerCountListeners.delete(listener);
  };
};

const getPendingFollowerCounts = (): Record<string, PendingFollowerCount> =>
  pendingFollowerCounts;

/**
 * True when `serverCount` already includes this adjustment, so adding `delta`
 * again would double-count the same follow or unfollow.
 */
export const isFollowerCountAdjustmentAbsorbed = (
  pending: PendingFollowerCount,
  serverCount: number,
): boolean => {
  if (pending.delta > 0) {
    return serverCount >= pending.baseline + pending.delta;
  }
  if (pending.delta < 0) {
    return serverCount <= pending.baseline + pending.delta;
  }
  return true;
};

/** Server count, plus a still-pending local follow or unfollow. */
export const resolveDisplayedFollowerCount = (
  serverCount: number,
  pending: PendingFollowerCount | undefined,
): number => {
  if (!pending || isFollowerCountAdjustmentAbsorbed(pending, serverCount)) {
    return serverCount;
  }
  return Math.max(0, serverCount + pending.delta);
};

/**
 * Next pending adjustment after a follow (`+1`) or unfollow (`-1`).
 * `undefined` means the local change cancelled out against the same baseline.
 */
export const nextPendingFollowerCount = (
  current: PendingFollowerCount | undefined,
  baseline: number,
  delta: 1 | -1,
): PendingFollowerCount | undefined => {
  if (!current || isFollowerCountAdjustmentAbsorbed(current, baseline)) {
    return { baseline, delta };
  }
  const nextDelta = current.delta + delta;
  if (nextDelta === 0) {
    return undefined;
  }
  return { baseline: current.baseline, delta: nextDelta };
};

/**
 * Latest server follower count for `addressOrId`. Read synchronously when a
 * follow toggle starts, so the adjustment uses the count on screen.
 */
export const publishServerFollowerCount = (
  addressOrId: string,
  followerCount: number | null | undefined,
): void => {
  if (
    !addressOrId ||
    typeof followerCount !== 'number' ||
    !Number.isFinite(followerCount)
  ) {
    return;
  }
  serverFollowerCountBaselines[addressOrId] = followerCount;
};

/** Applies a follow or unfollow on top of the published server count. */
export const recordOptimisticFollowerCount = (
  addressOrId: string,
  delta: 1 | -1,
): void => {
  const baseline = serverFollowerCountBaselines[addressOrId];
  if (typeof baseline !== 'number') {
    return;
  }

  const current = pendingFollowerCounts[addressOrId];
  followerCountSnapshots = {
    ...followerCountSnapshots,
    [addressOrId]: current ?? null,
  };

  const next = nextPendingFollowerCount(current, baseline, delta);
  if (!next) {
    const pendingNext = { ...pendingFollowerCounts };
    delete pendingNext[addressOrId];
    pendingFollowerCounts = pendingNext;
  } else {
    pendingFollowerCounts = {
      ...pendingFollowerCounts,
      [addressOrId]: next,
    };
  }
  emitPendingFollowerCounts();
};

/** Restores the follower count from before the in-flight toggle. */
export const rollbackOptimisticFollowerCount = (addressOrId: string): void => {
  if (!Object.hasOwn(followerCountSnapshots, addressOrId)) {
    return;
  }

  const snapshot = followerCountSnapshots[addressOrId];
  const snapshotsNext = { ...followerCountSnapshots };
  delete snapshotsNext[addressOrId];
  followerCountSnapshots = snapshotsNext;

  if (snapshot) {
    pendingFollowerCounts = {
      ...pendingFollowerCounts,
      [addressOrId]: snapshot,
    };
  } else if (pendingFollowerCounts[addressOrId]) {
    const pendingNext = { ...pendingFollowerCounts };
    delete pendingNext[addressOrId];
    pendingFollowerCounts = pendingNext;
  } else {
    return;
  }
  emitPendingFollowerCounts();
};

/** Drops the rollback snapshot after the follow request succeeds. */
export const commitOptimisticFollowerCount = (addressOrId: string): void => {
  if (!Object.hasOwn(followerCountSnapshots, addressOrId)) {
    return;
  }
  const snapshotsNext = { ...followerCountSnapshots };
  delete snapshotsNext[addressOrId];
  followerCountSnapshots = snapshotsNext;
};

/**
 * Removes a pending delta once `serverCount` already includes it.
 * Leaving the entry in place would reapply it if a later refetch moved the
 * count back across `baseline + delta`.
 */
const releaseAbsorbedFollowerCount = (
  addressOrId: string,
  serverCount: number | null | undefined,
): void => {
  if (typeof serverCount !== 'number' || !Number.isFinite(serverCount)) {
    return;
  }
  const pending = pendingFollowerCounts[addressOrId];
  if (!pending || !isFollowerCountAdjustmentAbsorbed(pending, serverCount)) {
    return;
  }
  const pendingNext = { ...pendingFollowerCounts };
  delete pendingNext[addressOrId];
  pendingFollowerCounts = pendingNext;
  emitPendingFollowerCounts();
};

/** Drops adjustments when the wallet session changes. */
export const clearOptimisticFollowerCounts = (): void => {
  const hadPending = Object.keys(pendingFollowerCounts).length > 0;
  pendingFollowerCounts = {};
  followerCountSnapshots = {};
  serverFollowerCountBaselines = {};
  if (hadPending) {
    emitPendingFollowerCounts();
  }
};

/**
 * Follower count to render for a trader profile. Matches the server count
 * once a refetch has absorbed the optimistic follow or unfollow.
 */
export const useDisplayedFollowerCount = (
  addressOrId: string,
  serverCount: number | null | undefined,
): number | null | undefined => {
  const pending = useSyncExternalStore(
    subscribePendingFollowerCounts,
    getPendingFollowerCounts,
    getPendingFollowerCounts,
  );

  useEffect(() => {
    releaseAbsorbedFollowerCount(addressOrId, serverCount);
  }, [addressOrId, serverCount]);

  if (typeof serverCount !== 'number' || !Number.isFinite(serverCount)) {
    return serverCount;
  }

  return resolveDisplayedFollowerCount(serverCount, pending[addressOrId]);
};
