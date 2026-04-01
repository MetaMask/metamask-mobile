import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import { useTopTraders } from './useTopTraders';

const mockTraders = [
  {
    rank: 1,
    profileId: 'trader-1',
    name: 'sniperliquid.hl',
    imageUrl: 'https://example.com/avatar1.png',
    pnl30d: 963146.8,
    roi30d: 0.43,
  },
  {
    rank: 2,
    profileId: 'trader-2',
    name: 'nervousdegen',
    imageUrl: 'https://example.com/avatar2.png',
    pnl30d: 474751.45,
    roi30d: 3.59,
  },
  {
    rank: 3,
    profileId: 'trader-3',
    name: 'baznocap',
    imageUrl: 'https://example.com/avatar3.png',
    pnl30d: 374735.16,
    roi30d: 6.17,
  },
];

const mockLeaderboardResponse = { traders: mockTraders };

jest.mock('@metamask/react-data-query');

const mockRefetch = jest.fn();
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

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
        percentageChange: first.roi30d * 100,
        pnlValue: first.pnl30d,
        isFollowing: false,
      });
    });

    it('defaults percentageChange to 0 when roi30d is null', () => {
      const entry = { ...mockTraders[0], roi30d: null };
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

    it('converts an Error object to a string', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: new Error('Network error') }),
      );
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.error).toBe('Error: Network error');
    });

    it('returns null when there is no error', () => {
      const { result } = renderHook(() => useTopTraders());
      expect(result.current.error).toBeNull();
    });
  });

  describe('toggleFollow', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: mockLeaderboardResponse as never }),
      );
    });

    it('sets isFollowing to true on the first toggle', () => {
      const { result } = renderHook(() => useTopTraders());
      const traderId = mockTraders[0].profileId;

      act(() => {
        result.current.toggleFollow(traderId);
      });

      expect(result.current.traders[0].isFollowing).toBe(true);
    });

    it('toggles isFollowing back to false on a second call', () => {
      const { result } = renderHook(() => useTopTraders());
      const traderId = mockTraders[0].profileId;

      act(() => result.current.toggleFollow(traderId));
      act(() => result.current.toggleFollow(traderId));

      expect(result.current.traders[0].isFollowing).toBe(false);
    });

    it('does not affect other traders when one is toggled', () => {
      const { result } = renderHook(() => useTopTraders());

      act(() => {
        result.current.toggleFollow(mockTraders[0].profileId);
      });

      result.current.traders.slice(1).forEach((trader) => {
        expect(trader.isFollowing).toBe(false);
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
  });
});
