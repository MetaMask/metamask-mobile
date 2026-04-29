import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { useFollowToggle, useFollowToggleMany } from './useFollowToggle';

jest.mock('react-redux', () => ({
  useSelector: jest.fn().mockReturnValue([]),
}));

jest.mock('../../selectors/socialController', () => ({
  selectFollowingProfileIds: jest.fn(),
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

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useFollowToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue([]);
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
      followed: [],
      unfollowed: [],
    });
    mockTrack.mockReset();
  });

  describe('isFollowing', () => {
    it('returns false when the trader is not in followingProfileIds', () => {
      const { result } = renderHook(() => useFollowToggle('trader-1'));

      expect(result.current.isFollowing).toBe(false);
    });

    it('returns true when the trader is in followingProfileIds', () => {
      mockUseSelector.mockReturnValue(['trader-1']);

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
      mockUseSelector.mockReturnValue(['trader-1']);

      const { result } = renderHook(() => useFollowToggle('trader-1'));

      await act(async () => {
        await result.current.toggleFollow();
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'SocialController:unfollowTrader',
        { targets: ['trader-1'] },
      );
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
        'useFollowToggle: toggleFollow failed',
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
        });
      });

      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({ category: expect.any(String) }),
        expect.objectContaining({ action: 'follow', source: 'leaderboard' }),
      );
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
    mockUseSelector.mockReturnValue([]);
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

    const { result } = renderHook(() => useFollowToggleMany());

    // Kick off the follow (optimistic = true) without resolving the API call.
    await act(async () => {
      result.current.toggleFollow('trader-1');
    });

    // Redux updates to an empty list (hasn't caught up yet).
    mockUseSelector.mockReturnValue([]);
    await act(async () => {
      resolveCall({ followed: [], unfollowed: [] });
    });

    // The optimistic override should still reflect the intended state.
    expect(result.current.isFollowing('trader-1')).toBe(true);
  });

  it('removes optimistic overrides once redux catches up with the intended value', async () => {
    const { result } = renderHook(() => useFollowToggleMany());

    // Follow the trader optimistically.
    await act(async () => {
      await result.current.toggleFollow('trader-1');
    });

    // Now redux reflects the follow — the optimistic override is no longer needed.
    mockUseSelector.mockReturnValue(['trader-1']);
    await act(async () => {
      // Trigger a re-render so the cleanup effect sees the updated selector.
    });

    // isFollowing should still be true (from redux now, not the optimistic map).
    expect(result.current.isFollowing('trader-1')).toBe(true);
  });
});
