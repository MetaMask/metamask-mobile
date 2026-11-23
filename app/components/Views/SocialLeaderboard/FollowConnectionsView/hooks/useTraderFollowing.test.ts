import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import Logger from '../../../../../util/Logger';
import { useTraderFollowing } from './useTraderFollowing';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/react-data-query');

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const mockRefetch = jest.fn();
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

const makeQueryResult = (
  overrides: Partial<ReturnType<typeof useQuery>> = {},
): ReturnType<typeof useQuery> =>
  ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: mockRefetch,
    ...overrides,
  }) as ReturnType<typeof useQuery>;

const fixtureFollowing = {
  following: [
    {
      profileId: 'trader-1',
      address: '0x1111111111111111111111111111111111111111',
      name: 'Signal Scout',
      imageUrl: 'https://example.com/scout.png',
    },
    {
      profileId: 'trader-2',
      address: '0x2222222222222222222222222222222222222222',
      name: 'Quiet Conviction',
      imageUrl: null,
    },
  ],
  count: 9,
};

describe('useTraderFollowing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
  });

  describe('query configuration', () => {
    it('passes fetchTraderFollowing queryKey with addressOrId', () => {
      renderHook(() => useTraderFollowing({ addressOrId: '0xabc' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: [
            'SocialService:fetchTraderFollowing',
            { addressOrId: '0xabc' },
          ],
          enabled: true,
        }),
      );
    });

    it('disables the query when enabled is false', () => {
      renderHook(() =>
        useTraderFollowing({ addressOrId: '0xabc', enabled: false }),
      );

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('disables the query when addressOrId is empty', () => {
      renderHook(() => useTraderFollowing({ addressOrId: '' }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });
  });

  describe('following list mapping', () => {
    it('returns an empty list when data is undefined', () => {
      const { result } = renderHook(() =>
        useTraderFollowing({ addressOrId: '0xabc' }),
      );

      expect(result.current.traders).toEqual([]);
      expect(result.current.count).toBe(0);
    });

    it('maps following profiles and uses the API count', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: fixtureFollowing as never }),
      );

      const { result } = renderHook(() =>
        useTraderFollowing({ addressOrId: '0xabc' }),
      );

      expect(result.current.count).toBe(9);
      expect(result.current.traders).toEqual([
        {
          id: 'trader-1',
          username: 'Signal Scout',
          address: '0x1111111111111111111111111111111111111111',
          avatarUri: 'https://example.com/scout.png',
        },
        {
          id: 'trader-2',
          username: 'Quiet Conviction',
          address: '0x2222222222222222222222222222222222222222',
          avatarUri: undefined,
        },
      ]);
    });
  });

  describe('loading state', () => {
    it('reports loading when useQuery is loading', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));

      const { result } = renderHook(() =>
        useTraderFollowing({ addressOrId: '0xabc' }),
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('reports not-loading when disabled', () => {
      const { result } = renderHook(() =>
        useTraderFollowing({ addressOrId: '0xabc', enabled: false }),
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns an error message string when useQuery errors', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: new Error('Network error') }),
      );

      const { result } = renderHook(() =>
        useTraderFollowing({ addressOrId: '0xabc' }),
      );

      expect(result.current.error).toBe('Network error');
    });

    it('logs query errors with feature:social tags', () => {
      const error = new Error('fetch failed');
      mockUseQuery.mockReturnValue(makeQueryResult({ error }));

      renderHook(() => useTraderFollowing({ addressOrId: '0xabc' }));

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'followed_traders',
            operation: 'fetch_trader_following',
            endpoint: 'following',
          }),
        }),
      );
    });
  });

  describe('refresh', () => {
    it('calls refetch when refresh is invoked', async () => {
      mockRefetch.mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useTraderFollowing({ addressOrId: '0xabc' }),
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('logs and rethrows when refetch rejects', async () => {
      const error = new Error('Network failure');
      mockRefetch.mockRejectedValue(error);
      const { result } = renderHook(() =>
        useTraderFollowing({ addressOrId: '0xabc' }),
      );

      await expect(
        act(async () => {
          await result.current.refresh();
        }),
      ).rejects.toThrow('Network failure');

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'followed_traders',
            operation: 'refresh',
            endpoint: 'following',
          }),
        }),
      );
    });
  });
});
