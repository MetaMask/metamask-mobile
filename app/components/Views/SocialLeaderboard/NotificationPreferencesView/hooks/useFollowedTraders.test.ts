import {
  renderHook,
  act,
  waitFor,
  cleanup,
} from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { useFollowedTraders } from './useFollowedTraders';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: jest
        .fn()
        .mockResolvedValue({ profileId: 'mock-profile-id' }),
    },
  },
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
    (
      Engine.context.AuthenticationController.getSessionProfile as jest.Mock
    ).mockResolvedValue({ profileId: 'mock-profile-id' });
  });

  // Flush pending microtasks (and the resulting setProfileId call) before
  // unmount to keep React Testing Library from emitting act() warnings on
  // tests that only care about the initial synchronous behavior.
  afterEach(async () => {
    await act(async () => {
      await Promise.resolve();
    });
    cleanup();
  });

  describe('query configuration', () => {
    it('waits for the session profileId before enabling the query', () => {
      mockUseQuery.mockReturnValue(makeQueryResult());
      renderHook(() => useFollowedTraders());

      // First render runs before the async session-profile resolves, so the
      // query is still gated.
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: false,
          queryKey: ['SocialService:fetchFollowing', null],
        }),
      );
    });

    it('enables the query with the session profileId once resolved', async () => {
      const { rerender } = renderHook(() => useFollowedTraders());

      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: true,
            queryKey: [
              'SocialService:fetchFollowing',
              { addressOrUid: 'mock-profile-id' },
            ],
          }),
        );
      });

      rerender({});
    });

    it('disables the query when the hook is called with enabled: false', () => {
      renderHook(() => useFollowedTraders({ enabled: false }));

      expect(mockUseQuery).toHaveBeenLastCalledWith(
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
    it('reports loading while the session profile is being resolved', () => {
      const { result } = renderHook(() => useFollowedTraders());
      expect(result.current.isLoading).toBe(true);
    });

    it('reports loading when useQuery is loading', async () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));
      const { result } = renderHook(() => useFollowedTraders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });

    it('reports not-loading when query is idle and profile resolved', async () => {
      const { result } = renderHook(() => useFollowedTraders());
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
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

    it('surfaces the session-profile fetch error', async () => {
      (
        Engine.context.AuthenticationController.getSessionProfile as jest.Mock
      ).mockRejectedValue(new Error('no session'));

      const { result } = renderHook(() => useFollowedTraders());

      await waitFor(() => {
        expect(result.current.error).toBe('no session');
      });

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'useFollowedTraders: getSessionProfile failed',
      );
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

    it('clears a stale profileIdError when a subsequent getSessionProfile call succeeds', async () => {
      const getSessionProfile = Engine.context.AuthenticationController
        .getSessionProfile as jest.Mock;

      getSessionProfile.mockRejectedValueOnce(new Error('no session'));

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useFollowedTraders({ enabled }),
        { initialProps: { enabled: true } },
      );

      await waitFor(() => {
        expect(result.current.error).toBe('no session');
      });

      // Now simulate a successful retry by re-enabling the hook (enabled
      // toggles false → true, triggering a fresh getSessionProfile call).
      getSessionProfile.mockResolvedValueOnce({
        profileId: 'mock-profile-id',
      });
      rerender({ enabled: false });
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
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
