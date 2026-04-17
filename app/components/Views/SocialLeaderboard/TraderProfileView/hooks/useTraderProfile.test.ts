import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import Logger from '../../../../../util/Logger';
import { useTraderProfile } from './useTraderProfile';

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
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
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

const fixtureProfile = {
  profile: {
    profileId: 'trader-1',
    address: '0xabc',
    allAddresses: ['0xabc'],
    name: 'dutchiono',
    imageUrl: 'https://example.com/avatar.png',
  },
  stats: {
    pnl30d: 20610,
    winRate30d: 0.92,
    roiPercent30d: 1.5,
    tradeCount30d: 48,
  },
  perChainBreakdown: { perChainPnl: {}, perChainRoi: {}, perChainVolume: {} },
  socialHandles: {},
  followerCount: 45,
  followingCount: 12,
};

describe('useTraderProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
  });

  describe('query configuration', () => {
    it('passes the correct queryKey with addressOrId', () => {
      renderHook(() => useTraderProfile('trader-1'));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchTraderProfile',
            { addressOrId: 'trader-1' },
          ],
        }),
      );
    });

    it('enables the query when addressOrId is non-empty', () => {
      renderHook(() => useTraderProfile('trader-1'));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });

    it('disables the query when addressOrId is empty', () => {
      renderHook(() => useTraderProfile(''));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });
  });

  describe('profile data', () => {
    it('returns null profile when data is undefined', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.profile).toBeNull();
    });

    it('returns profile data when query succeeds', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: fixtureProfile as never }),
      );
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.profile).toEqual(fixtureProfile);
    });
  });

  describe('loading state', () => {
    it('exposes isLoading from useQuery', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when useQuery is not loading', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns error message string for Error objects', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: new Error('Network error') }),
      );
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.error).toBe('Network error');
    });

    it('converts non-Error values to strings', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: 'raw error' as never }),
      );
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.error).toBe('raw error');
    });

    it('returns null when there is no error', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.error).toBeNull();
    });

    it('logs errors when error is present', () => {
      const error = new Error('fetch failed');
      mockUseQuery.mockReturnValue(makeQueryResult({ error }));
      renderHook(() => useTraderProfile('trader-1'));
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'useTraderProfile: profile fetch failed',
      );
    });

    it('does not log when there is no error', () => {
      renderHook(() => useTraderProfile('trader-1'));
      expect(Logger.error).not.toHaveBeenCalled();
    });
  });

  describe('toggleFollow', () => {
    it('defaults isFollowing to false', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.isFollowing).toBe(false);
    });

    it('sets isFollowing to true on the first toggle', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));

      act(() => {
        result.current.toggleFollow();
      });

      expect(result.current.isFollowing).toBe(true);
    });

    it('toggles isFollowing back to false on the second call', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));

      act(() => {
        result.current.toggleFollow();
      });
      act(() => {
        result.current.toggleFollow();
      });

      expect(result.current.isFollowing).toBe(false);
    });
  });

  describe('refresh', () => {
    it('calls refetch when refresh is invoked', async () => {
      mockRefetch.mockResolvedValue(undefined);
      const { result } = renderHook(() => useTraderProfile('trader-1'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('logs and rethrows when refetch rejects', async () => {
      const error = new Error('Network failure');

      mockRefetch.mockRejectedValue(error);
      const { result } = renderHook(() => useTraderProfile('trader-1'));

      await expect(
        act(async () => {
          await result.current.refresh();
        }),
      ).rejects.toThrow('Network failure');

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'useTraderProfile: refresh failed',
      );
    });
  });
});
