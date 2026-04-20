import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import { useTopTraders } from './useTopTraders';

jest.mock('react-redux', () => ({
  useSelector: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../../../../selectors/socialController', () => ({
  selectFollowingProfileIds: jest.fn(),
}));

jest.mock('../../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: jest
        .fn()
        .mockResolvedValue({ profileId: 'mock-profile-id' }),
    },
  },
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockTraders = [
  {
    rank: 1,
    profileId: 'trader-1',
    name: 'sniperliquid.hl',
    imageUrl: 'https://example.com/avatar1.png',
    pnl30d: 963146.8,
    roiPercent30d: 0.43,
    pnlPerChain: { base: 963146.8 },
  },
  {
    rank: 2,
    profileId: 'trader-2',
    name: 'nervousdegen',
    imageUrl: 'https://example.com/avatar2.png',
    pnl30d: 474751.45,
    roiPercent30d: 3.59,
    pnlPerChain: { ethereum: 474751.45 },
  },
  {
    rank: 3,
    profileId: 'trader-3',
    name: 'baznocap',
    imageUrl: 'https://example.com/avatar3.png',
    pnl30d: 374735.16,
    roiPercent30d: 6.17,
    pnlPerChain: { solana: 374735.16 },
  },
];

const mockLeaderboardResponse = { traders: mockTraders };

jest.mock('@metamask/react-data-query');

const mockRefetch = jest.fn();
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const makeQueryResult = (
  overrides: Partial<ReturnType<typeof useQuery>> = {},
): ReturnType<typeof useQuery> =>
  ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  }) as ReturnType<typeof useQuery>;

describe('useTopTraders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
    mockUseSelector.mockReturnValue([]);
  });

  describe('data mapping', () => {
    it('returns an empty array when data is undefined', () => {
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.traders).toEqual([]);
    });

    it('returns an empty array when traders array is missing', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ data: {} as never }));
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.traders).toEqual([]);
    });

    it('maps all entries to TopTrader objects', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: mockLeaderboardResponse as never }),
      );
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.traders).toHaveLength(mockTraders.length);
    });

    it('maps each field correctly for the first entry', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: mockLeaderboardResponse as never }),
      );
      const { result } = renderHook(() => useTopTraders());

      const first = mockTraders[0];
      expect(result.current.traders[0]).toEqual({
        id: first.profileId,
        rank: first.rank,
        username: first.name,
        avatarUri: first.imageUrl,
        percentageChange: first.roiPercent30d * 100,
        pnlValue: first.pnl30d,
        pnlPerChain: first.pnlPerChain ?? {},
        isFollowing: false,
      });
    });

    it('defaults percentageChange to 0 when roiPercent30d is null', () => {
      const entry = { ...mockTraders[0], roiPercent30d: null };
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: { traders: [entry] } as never }),
      );
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.traders[0].percentageChange).toBe(0);
    });

    it('sets avatarUri to undefined when imageUrl is null', () => {
      const entry = { ...mockTraders[0], imageUrl: null };
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: { traders: [entry] } as never }),
      );
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.traders[0].avatarUri).toBeUndefined();
    });
  });

  describe('loading and error states', () => {
    it('exposes isLoading from useQuery', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.isLoading).toBe(true);
    });

    it('returns the error message for an Error object', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: new Error('Network error') }),
      );
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.error).toBe('Network error');
    });

    it('logs the full error object via Logger.error', () => {
      const err = new Error('Network error');
      mockUseQuery.mockReturnValue(makeQueryResult({ error: err }));
      renderHook(() => useTopTraders());
      expect(Logger.error).toHaveBeenCalledWith(
        err,
        'useTopTraders: leaderboard fetch failed',
      );
    });

    it('converts a non-Error value to a string', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: 'raw string error' as never }),
      );
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.error).toBe('raw string error');
    });

    it('returns null when there is no error', () => {
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.error).toBeNull();
    });
  });

  describe('isFollowing seeding from controller state', () => {
    it('seeds isFollowing true for traders present in followingProfileIds', () => {
      mockUseSelector.mockReturnValue([mockTraders[0].profileId]);
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: mockLeaderboardResponse as never }),
      );
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.traders[0].isFollowing).toBe(true);
      expect(result.current.traders[1].isFollowing).toBe(false);
    });
  });

  describe('toggleFollow', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: mockLeaderboardResponse as never }),
      );
      (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue({
        followed: [],
        unfollowed: [],
      });
    });

    it('calls followTrader when trader is not followed', async () => {
      const { result } = renderHook(() => useTopTraders());

      await act(async () => {
        await result.current.toggleFollow(mockTraders[0].profileId);
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'SocialController:followTrader',
        {
          addressOrUid: 'mock-profile-id',
          targets: [mockTraders[0].profileId],
        },
      );
    });

    it('calls unfollowTrader when trader is already followed', async () => {
      mockUseSelector.mockReturnValue([mockTraders[0].profileId]);
      const { result } = renderHook(() => useTopTraders());

      await act(async () => {
        await result.current.toggleFollow(mockTraders[0].profileId);
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'SocialController:unfollowTrader',
        {
          addressOrUid: 'mock-profile-id',
          targets: [mockTraders[0].profileId],
        },
      );
    });

    it('flips isFollowing optimistically for the tapped trader', async () => {
      let resolveCall: (value: unknown) => void = () => undefined;
      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCall = resolve;
          }),
      );
      const { result } = renderHook(() => useTopTraders());

      expect(result.current.traders[0].isFollowing).toBe(false);

      await act(async () => {
        result.current.toggleFollow(mockTraders[0].profileId);
      });

      expect(result.current.traders[0].isFollowing).toBe(true);
      expect(result.current.traders[1].isFollowing).toBe(false);

      await act(async () => {
        resolveCall({ followed: [], unfollowed: [] });
      });
    });

    it('reverts optimistic isFollowing when the API call rejects', async () => {
      (Engine.controllerMessenger.call as jest.Mock).mockRejectedValue(
        new Error('boom'),
      );
      const { result } = renderHook(() => useTopTraders());

      await act(async () => {
        await result.current.toggleFollow(mockTraders[0].profileId);
      });

      expect(result.current.traders[0].isFollowing).toBe(false);
    });

    it('ignores concurrent toggleFollow calls for the same trader while in flight', async () => {
      let resolveCall: (value: unknown) => void = () => undefined;
      (Engine.controllerMessenger.call as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCall = resolve;
          }),
      );
      const { result } = renderHook(() => useTopTraders());

      await act(async () => {
        result.current.toggleFollow(mockTraders[0].profileId);
      });
      await act(async () => {
        result.current.toggleFollow(mockTraders[0].profileId);
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveCall({ followed: [], unfollowed: [] });
      });
    });
  });

  describe('refresh', () => {
    it('calls refetch when refresh is invoked', async () => {
      mockRefetch.mockResolvedValue(undefined);
      const { result } = renderHook(() => useTopTraders());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('logs and re-throws when refetch rejects', async () => {
      const err = new Error('Network failure');
      mockRefetch.mockRejectedValue(err);
      const { result } = renderHook(() => useTopTraders());

      await expect(
        act(async () => {
          await result.current.refresh();
        }),
      ).rejects.toThrow('Network failure');

      expect(Logger.error).toHaveBeenCalledWith(
        err,
        'useTopTraders: refresh failed',
      );
    });
  });

  describe('options', () => {
    it('includes limit in the query key when provided', () => {
      renderHook(() => useTopTraders({ limit: 5 }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['SocialService:fetchLeaderboard', { limit: 5 }],
        }),
      );
    });

    it('passes null fetch options in the query key when no limit is given', () => {
      renderHook(() => useTopTraders());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['SocialService:fetchLeaderboard', null],
        }),
      );
    });

    it('defaults enabled to true when the option is not provided', () => {
      renderHook(() => useTopTraders());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });

    it('forwards enabled: false to useQuery to prevent the API call', () => {
      renderHook(() => useTopTraders({ enabled: false }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('forwards enabled: true to useQuery when explicitly set', () => {
      renderHook(() => useTopTraders({ enabled: true }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });
  });
});
