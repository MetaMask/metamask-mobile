import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { playImpact, ImpactMoment } from '../../util/haptics';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { selectSelectedInternalAccountAddress } from '../../selectors/accountsController';
import { selectIsUnlocked } from '../../selectors/keyringController';
import { selectFollowingProfileIds } from '../../selectors/socialController';
import {
  resetFollowingSyncForTests,
  syncFollowingState,
} from '../../util/social/followingSync';
import {
  resetFollowToggleSharedStateForTests,
  useFollowToggle,
  useFollowToggleMany,
} from './useFollowToggle';

jest.mock('react-redux', () => ({
  useSelector: jest.fn().mockReturnValue([]),
}));

jest.mock('../../selectors/socialController', () => ({
  selectFollowingProfileIds: jest.fn(),
}));

jest.mock('../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));

jest.mock('../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
}));

const mockTrack = jest.fn();
jest.mock(
  '../Views/SocialLeaderboard/analytics/useSocialLeaderboardAnalytics',
  () => ({
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  }),
);

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
jest.mock('../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    },
  },
}));

jest.mock('../../util/haptics', () => ({
  ...jest.requireActual<typeof import('../../util/haptics')>(
    '../../util/haptics',
  ),
  playImpact: jest.fn().mockResolvedValue(undefined),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockPlayImpact = jest.mocked(playImpact);

const DEFAULT_SELECTED_ADDRESS = '0xabc';

const selectorState = {
  followingProfileIds: [] as string[],
  isUnlocked: true,
  selectedAddress: DEFAULT_SELECTED_ADDRESS as string | undefined,
};

const mockFollowToggleSelectors = (): void => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectFollowingProfileIds) {
      return selectorState.followingProfileIds;
    }
    if (selector === selectIsUnlocked) {
      return selectorState.isUnlocked;
    }
    if (selector === selectSelectedInternalAccountAddress) {
      return selectorState.selectedAddress;
    }
    return undefined;
  });
};

describe('useFollowToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFollowToggleSharedStateForTests();
    resetFollowingSyncForTests();
    selectorState.followingProfileIds = [];
    selectorState.isUnlocked = true;
    selectorState.selectedAddress = DEFAULT_SELECTED_ADDRESS;
    mockFollowToggleSelectors();
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
      followed: [],
      unfollowed: [],
    });
    mockInvalidateQueries.mockResolvedValue(undefined);
    mockTrack.mockReset();
  });

  describe('isFollowing', () => {
    it('returns false when the trader is not in followingProfileIds', () => {
      const { result } = renderHook(() => useFollowToggle('trader-1'));

      expect(result.current.isFollowing).toBe(false);
    });

    it('returns true when the trader is in followingProfileIds', () => {
      selectorState.followingProfileIds = ['trader-1'];

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      expect(result.current.isFollowing).toBe(true);
    });
  });

  describe('toggleFollow', () => {
    it('calls followTrader when the trader is not currently followed', async () => {
      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'SocialController:followTrader',
        { targets: ['trader-1'] },
      );
    });

    it('calls unfollowTrader when the trader is currently followed', async () => {
      selectorState.followingProfileIds = ['trader-1'];

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'SocialController:unfollowTrader',
        { targets: ['trader-1'] },
      );
    });

    it('invalidates following and followers queries after a successful follow', async () => {
      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchFollowing'],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchMyFollowers'],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchFollowers'],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchTraderFollowing'],
      });
    });

    it('invalidates following and followers queries after a successful unfollow', async () => {
      selectorState.followingProfileIds = ['trader-1'];

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchFollowing'],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchMyFollowers'],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchFollowers'],
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchTraderFollowing'],
      });
    });

    it('refreshes the older following feed and leaves the v1 feed cached', async () => {
      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['SocialService:fetchFeed', { scope: 'following' }],
      });
      const v1FeedInvalidated = mockInvalidateQueries.mock.calls.some(
        ([query]) => query?.queryKey?.[1]?.scope === 'following_v1',
      );
      expect(v1FeedInvalidated).toBe(false);
    });

    it('does not invalidate the fetchFollowing query when the API call rejects', async () => {
      (Engine.controllerMessenger.call as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });

    it('flips isFollowing optimistically before the API call resolves', async () => {
      let resolveCall: (value: unknown) => void = () => undefined;
      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCall = resolve;
          }),
      );

      const { result } = renderHook(() => useFollowToggle('trader-1'));
      expect(result.current.isFollowing).toBe(false);

      await act(async () => {
        result.current.toggleFollow();
      });

      expect(result.current.isFollowing).toBe(true);

      await act(async () => {
        resolveCall({ followed: [], unfollowed: [] });
      });
    });

    it('reverts the optimistic value when the API call rejects', async () => {
      (Engine.controllerMessenger.call as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(result.current.isFollowing).toBe(false);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'follow',
            operation: 'follow_trader',
            endpoint: 'follow',
          }),
          extras: expect.objectContaining({
            message: 'Follow trader failed at useFollowToggle',
          }),
        }),
      );
    });

    it('fires a SOCIAL_TRADER_FOLLOW_INTERACTION analytics event when analyticsContext is provided', async () => {
      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow({
          source: 'leaderboard',
          traderAddress: '0xabc',
          traderUsername: 'alice',
          traderRank: 3,
          traderAvatarUri: 'https://example.com/avatar.png',
        });
      });

      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({ category: expect.any(String) }),
        expect.objectContaining({
          action: 'follow',
          source: 'leaderboard',
          trader_has_profile_picture_set: true,
        }),
      );
    });

    it('sets trader_has_profile_picture_set to false when avatar is a known placeholder', async () => {
      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow({
          source: 'trader_profile',
          traderAddress: '0xabc',
          traderAvatarUri:
            'https://daylight-images.s3.us-east-1.amazonaws.com/ens-fallback.png',
        });
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({ category: expect.any(String) }),
        expect.objectContaining({ trader_has_profile_picture_set: false }),
      );
    });

    it('fires follow toggle haptic when following a new trader', async () => {
      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.FollowToggle);
    });

    it('fires follow toggle haptic when unfollowing a currently followed trader', async () => {
      selectorState.followingProfileIds = ['trader-1'];

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.FollowToggle);
    });

    it('still fires haptic feedback when a toggle is debounced as in-flight', async () => {
      let resolveCall: (value: unknown) => void = () => undefined;
      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCall = resolve;
          }),
      );

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        result.current.toggleFollow();
      });
      await act(async () => {
        result.current.toggleFollow();
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);
      expect(mockPlayImpact).toHaveBeenCalledTimes(2);
      expect(mockPlayImpact).toHaveBeenNthCalledWith(
        1,
        ImpactMoment.FollowToggle,
      );
      expect(mockPlayImpact).toHaveBeenNthCalledWith(
        2,
        ImpactMoment.FollowToggle,
      );

      await act(async () => {
        resolveCall({ followed: [], unfollowed: [] });
      });
    });

    it('ignores concurrent toggle calls while one is in flight', async () => {
      let resolveCall: (value: unknown) => void = () => undefined;
      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCall = resolve;
          }),
      );

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        result.current.toggleFollow();
      });
      await act(async () => {
        result.current.toggleFollow();
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveCall({ followed: [], unfollowed: [] });
      });
    });
  });
});

describe('useFollowToggleMany', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFollowToggleSharedStateForTests();
    resetFollowingSyncForTests();
    selectorState.followingProfileIds = [];
    selectorState.isUnlocked = true;
    selectorState.selectedAddress = DEFAULT_SELECTED_ADDRESS;
    mockFollowToggleSelectors();
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
      followed: [],
      unfollowed: [],
    });
  });

  it('tracks follow state independently per trader id', async () => {
    const { result } = renderHook(() => useFollowToggleMany());

    expect(result.current.isFollowing('trader-1')).toBe(false);
    expect(result.current.isFollowing('trader-2')).toBe(false);

    await act(async () => {
      await result.current.toggleFollow('trader-1');
    });

    expect(result.current.isFollowing('trader-1')).toBe(true);
    expect(result.current.isFollowing('trader-2')).toBe(false);
  });

  it('reports a known-followed trader as followed when followingProfileIds is stale', () => {
    const { result } = renderHook(() => useFollowToggleMany());

    expect(result.current.isFollowing('trader-1', true)).toBe(true);
  });

  it('unfollows a known-followed trader on the first toggle when followingProfileIds is stale', async () => {
    const { result } = renderHook(() => useFollowToggleMany());

    await act(async () => {
      await result.current.toggleFollow('trader-1', undefined, true);
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);
    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'SocialController:unfollowTrader',
      { targets: ['trader-1'] },
    );
  });

  it('keeps an in-flight unfollow override after followingProfileIds already agrees', async () => {
    let resolveCall: (value: unknown) => void = () => undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = resolve;
        }),
    );
    selectorState.followingProfileIds = ['trader-1'];
    const { result, rerender } = renderHook(() => useFollowToggleMany());

    await act(async () => {
      result.current.toggleFollow('trader-1', undefined, true);
    });
    selectorState.followingProfileIds = [];
    rerender(undefined);
    await act(async () => undefined);

    expect(result.current.isFollowing('trader-1', true)).toBe(false);

    await act(async () => {
      resolveCall({ followed: [], unfollowed: [] });
    });
  });

  it('re-syncs following state after a toggle that lands during an in-flight sync', async () => {
    let resolveSync: (value: unknown) => void = () => undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      (action: string) =>
        action === 'SocialController:updateFollowing'
          ? new Promise((resolve) => {
              resolveSync = resolve;
            })
          : Promise.resolve({ followed: [], unfollowed: [] }),
    );
    syncFollowingState();
    const { result } = renderHook(() => useFollowToggleMany());

    await act(async () => {
      await result.current.toggleFollow('trader-1', undefined, true);
    });
    await act(async () => {
      resolveSync({ following: [] });
    });

    const updateFollowingCalls = (
      Engine.controllerMessenger.call as jest.Mock
    ).mock.calls.filter(
      ([action]) => action === 'SocialController:updateFollowing',
    );
    expect(updateFollowingCalls).toHaveLength(2);
  });

  it('does not re-sync following state when no sync is in flight', async () => {
    const { result } = renderHook(() => useFollowToggleMany());

    await act(async () => {
      await result.current.toggleFollow('trader-1');
    });

    expect(Engine.controllerMessenger.call).not.toHaveBeenCalledWith(
      'SocialController:updateFollowing',
    );
  });

  it('allows concurrent toggles for different traders', async () => {
    let resolveCount = 0;
    const pending: ((value: unknown) => void)[] = [];
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        }),
    );

    const { result } = renderHook(() => useFollowToggleMany());

    await act(async () => {
      result.current.toggleFollow('trader-1');
    });
    await act(async () => {
      result.current.toggleFollow('trader-2');
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(2);

    await act(async () => {
      pending.forEach((resolve) => {
        resolve({ followed: [], unfollowed: [] });
        resolveCount += 1;
      });
    });

    expect(resolveCount).toBe(2);
  });

  it('ignores concurrent toggle calls for the same trader', async () => {
    let resolveCall: (value: unknown) => void = () => undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = resolve;
        }),
    );

    const { result } = renderHook(() => useFollowToggleMany());

    await act(async () => {
      result.current.toggleFollow('trader-1');
    });
    await act(async () => {
      result.current.toggleFollow('trader-1');
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCall({ followed: [], unfollowed: [] });
    });
  });

  it('retains optimistic overrides that have not yet been matched by redux', async () => {
    // Simulate a pending follow for trader-1 that redux has not yet confirmed.
    // The optimistic state says trader-1 is followed (true), but redux still
    // reports an empty list — so the override should be kept.
    let resolveCall: (value: unknown) => void = () => undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = resolve;
        }),
    );

    const { result, rerender } = renderHook(() => useFollowToggleMany());

    // Kick off the follow (optimistic = true) without resolving the API call.
    await act(async () => {
      result.current.toggleFollow('trader-1');
    });

    // Redux updates to an empty list (hasn't caught up yet).
    selectorState.followingProfileIds = [];
    rerender(undefined);
    await act(async () => {
      resolveCall({ followed: [], unfollowed: [] });
    });

    // The optimistic override should still reflect the intended state.
    expect(result.current.isFollowing('trader-1')).toBe(true);
  });

  it('removes optimistic overrides once redux catches up with the intended value', async () => {
    const { result, rerender } = renderHook(() => useFollowToggleMany());

    // Follow the trader optimistically.
    await act(async () => {
      await result.current.toggleFollow('trader-1');
    });

    // Now redux reflects the follow — the optimistic override is no longer needed.
    selectorState.followingProfileIds = ['trader-1'];
    rerender(undefined);
    await act(async () => {
      // Trigger a re-render so the cleanup effect sees the updated selector.
    });

    // isFollowing should still be true (from redux now, not the optimistic map).
    expect(result.current.isFollowing('trader-1')).toBe(true);
  });

  it('shares optimistic follow state across hook instances', async () => {
    let resolveCall: (value: unknown) => void = () => undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = resolve;
        }),
    );

    const first = renderHook(() => useFollowToggleMany());
    const second = renderHook(() => useFollowToggleMany());

    await act(async () => {
      first.result.current.toggleFollow('trader-1');
    });

    expect(first.result.current.isFollowing('trader-1')).toBe(true);
    expect(second.result.current.isFollowing('trader-1')).toBe(true);

    await act(async () => {
      resolveCall({ followed: [], unfollowed: [] });
    });
  });

  it('ignores a second instance toggle for the same trader while in flight', async () => {
    let resolveCall: (value: unknown) => void = () => undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = resolve;
        }),
    );

    const first = renderHook(() => useFollowToggleMany());
    const second = renderHook(() => useFollowToggleMany());

    await act(async () => {
      first.result.current.toggleFollow('trader-1');
    });
    await act(async () => {
      second.result.current.toggleFollow('trader-1');
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);
    expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
      'SocialController:followTrader',
      { targets: ['trader-1'] },
    );

    await act(async () => {
      resolveCall({ followed: [], unfollowed: [] });
    });
  });

  it('clears optimistic follow after the selected account changes', async () => {
    let resolveCall: (value: unknown) => void = () => undefined;
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = resolve;
        }),
    );

    const { result, rerender } = renderHook(() => useFollowToggleMany());

    await act(async () => {
      result.current.toggleFollow('trader-1');
    });
    expect(result.current.isFollowing('trader-1')).toBe(true);

    selectorState.selectedAddress = '0xdef';
    await act(async () => {
      rerender(undefined);
    });

    expect(result.current.isFollowing('trader-1')).toBe(false);

    await act(async () => {
      resolveCall({ followed: [], unfollowed: [] });
    });
  });

  it('allows a follow after lock even when a prior request never settled', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
      () => new Promise(() => undefined),
    );

    const { result, rerender } = renderHook(() => useFollowToggleMany());

    await act(async () => {
      result.current.toggleFollow('trader-1');
    });
    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);

    selectorState.isUnlocked = false;
    await act(async () => {
      rerender(undefined);
    });
    selectorState.isUnlocked = true;
    await act(async () => {
      rerender(undefined);
    });

    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
      followed: [],
      unfollowed: [],
    });

    await act(async () => {
      await result.current.toggleFollow('trader-1');
    });

    expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(2);
  });
});
