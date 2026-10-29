import {
  isFollowerCountAdjustmentAbsorbed,
  nextPendingFollowerCount,
  resolveDisplayedFollowerCount,
  type PendingFollowerCount,
} from './optimisticFollowerCount';

const pendingFollow = (
  baseline: number,
  delta: number,
): PendingFollowerCount => ({ baseline, delta });

describe('resolveDisplayedFollowerCount', () => {
  it('adds one while a follow is still missing from the server count', () => {
    const pending = pendingFollow(45, 1);

    const displayed = resolveDisplayedFollowerCount(45, pending);

    expect(displayed).toBe(46);
  });

  it('subtracts one while an unfollow is still missing from the server count', () => {
    const pending = pendingFollow(45, -1);

    const displayed = resolveDisplayedFollowerCount(45, pending);

    expect(displayed).toBe(44);
  });

  it('returns the server count once a refetch includes the follow', () => {
    const pending = pendingFollow(45, 1);

    const displayed = resolveDisplayedFollowerCount(46, pending);

    expect(displayed).toBe(46);
  });

  it('returns the server count once a refetch includes the unfollow', () => {
    const pending = pendingFollow(45, -1);

    const displayed = resolveDisplayedFollowerCount(44, pending);

    expect(displayed).toBe(44);
  });

  it('returns the server count when there is no pending adjustment', () => {
    const displayed = resolveDisplayedFollowerCount(45, undefined);

    expect(displayed).toBe(45);
  });

  it('does not drop the displayed count below zero', () => {
    const pending = pendingFollow(0, -1);

    const displayed = resolveDisplayedFollowerCount(0, pending);

    expect(displayed).toBe(0);
  });
});

describe('nextPendingFollowerCount', () => {
  it('opens a follow adjustment from the current server count', () => {
    const next = nextPendingFollowerCount(undefined, 45, 1);

    expect(next).toEqual({ baseline: 45, delta: 1 });
  });

  it('cancels a pending follow when unfollow uses the same server count', () => {
    const next = nextPendingFollowerCount(pendingFollow(45, 1), 45, -1);

    expect(next).toBeUndefined();
  });

  it('starts an unfollow from the refreshed count after the follow is included', () => {
    const next = nextPendingFollowerCount(pendingFollow(45, 1), 46, -1);

    expect(next).toEqual({ baseline: 46, delta: -1 });
  });
});

describe('isFollowerCountAdjustmentAbsorbed', () => {
  it('is false while the server count is still the follow baseline', () => {
    expect(isFollowerCountAdjustmentAbsorbed(pendingFollow(45, 1), 45)).toBe(
      false,
    );
  });

  it('is true when the server count has moved by at least the follow delta', () => {
    expect(isFollowerCountAdjustmentAbsorbed(pendingFollow(45, 1), 47)).toBe(
      true,
    );
  });
});
