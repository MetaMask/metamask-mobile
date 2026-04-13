import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import Logger from '../../../../../util/Logger';
import { useTraderProfile } from './useTraderProfile';

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

const mockProfileResponse = {
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

  describe('profile data', () => {
    it('returns null profile when data is undefined', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.profile).toBeNull();
    });

    it('returns profile data when useQuery resolves', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: mockProfileResponse as never }),
      );
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.profile).toEqual(mockProfileResponse);
    });

    it('forwards isLoading: true from useQuery', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.isLoading).toBe(true);
    });

    it('forwards isLoading: false from useQuery', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns null error when there is no error', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.error).toBeNull();
    });

    it('returns the error message string for an Error object', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: new Error('Network error') }),
      );
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.error).toBe('Network error');
    });

    it('converts a non-Error error value to string', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: 'raw string error' as never }),
      );
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.error).toBe('raw string error');
    });

    it('logs the error via Logger.error when useQuery returns an error', () => {
      const err = new Error('Network error');
      mockUseQuery.mockReturnValue(makeQueryResult({ error: err }));
      renderHook(() => useTraderProfile('trader-1'));
      expect(Logger.error).toHaveBeenCalledWith(
        err,
        'useTraderProfile: profile fetch failed',
      );
    });
  });

  describe('follow state', () => {
    it('isFollowing defaults to false', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));
      expect(result.current.isFollowing).toBe(false);
    });

    it('sets isFollowing to true on the first toggleFollow call', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));

      act(() => {
        result.current.toggleFollow();
      });

      expect(result.current.isFollowing).toBe(true);
    });

    it('toggles isFollowing back to false on a second toggleFollow call', () => {
      const { result } = renderHook(() => useTraderProfile('trader-1'));

      act(() => result.current.toggleFollow());
      act(() => result.current.toggleFollow());

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

    it('logs and re-throws when refetch rejects', async () => {
      const err = new Error('Network failure');
      mockRefetch.mockRejectedValue(err);
      const { result } = renderHook(() => useTraderProfile('trader-1'));

      await expect(
        act(async () => {
          await result.current.refresh();
        }),
      ).rejects.toThrow('Network failure');

      expect(Logger.error).toHaveBeenCalledWith(
        err,
        'useTraderProfile: refresh failed',
      );
    });
  });

  describe('query options', () => {
    it('calls useQuery with the correct queryKey', () => {
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

    it('sets enabled: false when addressOrId is an empty string', () => {
      renderHook(() => useTraderProfile(''));
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('sets enabled: true when addressOrId is a non-empty string', () => {
      renderHook(() => useTraderProfile('trader-1'));
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });
  });
});
