import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import Logger from '../../../../../util/Logger';
import { useFollowedTraders } from './useFollowedTraders';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

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

const fixtureFollowing = {
  following: [
    {
      profileId: 'trader-1',
      address: '0x1',
      name: 'dutchiono',
      imageUrl: 'https://example.com/a1.png',
    },
    {
      profileId: 'trader-2',
      address: '0x2',
      name: 'Kien',
      imageUrl: null,
    },
  ],
  count: 2,
};

describe('useFollowedTraders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
  });

  describe('query configuration', () => {
    it('passes the correct queryKey to useQuery', () => {
      renderHook(() => useFollowedTraders());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['SocialService:fetchFollowing'],
        }),
      );
    });

    it('enables the query by default', () => {
      renderHook(() => useFollowedTraders());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });

    it('disables the query when the hook is called with enabled: false', () => {
      renderHook(() => useFollowedTraders({ enabled: false }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });
  });

  describe('trader list mapping', () => {
    it('returns an empty list when data is undefined', () => {
      const { result } = renderHook(() => useFollowedTraders());
      expect(result.current.traders).toEqual([]);
    });

    it('maps ProfileSummary[] to FollowedTrader[]', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: fixtureFollowing as never }),
      );
      const { result } = renderHook(() => useFollowedTraders());

      expect(result.current.traders).toEqual([
        {
          id: 'trader-1',
          username: 'dutchiono',
          avatarUri: 'https://example.com/a1.png',
        },
        { id: 'trader-2', username: 'Kien', avatarUri: undefined },
      ]);
    });
  });

  describe('loading state', () => {
    it('reports loading when useQuery is loading', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));
      const { result } = renderHook(() => useFollowedTraders());
      expect(result.current.isLoading).toBe(true);
    });

    it('reports not-loading when the query is idle', () => {
      const { result } = renderHook(() => useFollowedTraders());
      expect(result.current.isLoading).toBe(false);
    });

    it('reports not-loading when disabled', () => {
      const { result } = renderHook(() =>
        useFollowedTraders({ enabled: false }),
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns an error message string when useQuery errors', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: new Error('Network error') }),
      );
      const { result } = renderHook(() => useFollowedTraders());
      expect(result.current.error).toBe('Network error');
    });

    it('converts non-Error query errors to strings', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: 'raw error' as never }),
      );
      const { result } = renderHook(() => useFollowedTraders());
      expect(result.current.error).toBe('raw error');
    });

    it('logs query errors', () => {
      const error = new Error('fetch failed');
      mockUseQuery.mockReturnValue(makeQueryResult({ error }));
      renderHook(() => useFollowedTraders());
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'useFollowedTraders: following fetch failed',
      );
    });

    it('does not log when there is no error', () => {
      renderHook(() => useFollowedTraders());
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('calls refetch when refresh is invoked', async () => {
      mockRefetch.mockResolvedValue(undefined);
      const { result } = renderHook(() => useFollowedTraders());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('logs and rethrows when refetch rejects', async () => {
      const error = new Error('Network failure');

      mockRefetch.mockRejectedValue(error);
      const { result } = renderHook(() => useFollowedTraders());

      await expect(
        act(async () => {
          await result.current.refresh();
        }),
      ).rejects.toThrow('Network failure');

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'useFollowedTraders: refresh failed',
      );
    });
  });
});
