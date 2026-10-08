import { renderHook, act } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import { addBreadcrumb } from '@sentry/react-native';
import Logger from '../../../../../util/Logger';
import { useFollowers } from './useFollowers';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../util/address', () => ({
  formatAddress: (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`,
}));

jest.mock('@metamask/react-data-query');

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

const mockAddBreadcrumb = addBreadcrumb as jest.Mock;
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

const fixtureFollowers = {
  followers: [
    {
      profileId: 'follower-1',
      address: '0x1111111111111111111111111111111111111111',
      name: 'Moon Rabbit',
      imageUrl: 'https://example.com/moon.png',
    },
    {
      profileId: 'follower-2',
      address: '0x2222222222222222222222222222222222222222',
      name: 'Hippo Maxi',
      imageUrl: null,
    },
  ],
  count: 12,
};

describe('useFollowers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResult());
    mockAddBreadcrumb.mockClear();
  });

  describe('query configuration', () => {
    it('passes the fetchMyFollowers queryKey to useQuery', () => {
      renderHook(() => useFollowers());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['SocialService:fetchMyFollowers'],
        }),
      );
    });

    it('enables the query by default', () => {
      renderHook(() => useFollowers());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });

    it('disables the query when the hook is called with enabled: false', () => {
      renderHook(() => useFollowers({ enabled: false }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });
  });

  describe('follower list mapping', () => {
    it('returns an empty list when data is undefined', () => {
      const { result } = renderHook(() => useFollowers());

      expect(result.current.followers).toEqual([]);
      expect(result.current.count).toBe(0);
    });

    it('maps ProfileSummary[] to FollowerConnection[] and uses the API count', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ data: fixtureFollowers as never }),
      );

      const { result } = renderHook(() => useFollowers());

      expect(result.current.count).toBe(12);
      expect(result.current.followers).toEqual([
        {
          id: 'follower-1',
          username: 'Moon Rabbit',
          handle: '0x1111...1111',
          address: '0x1111111111111111111111111111111111111111',
          avatarUri: 'https://example.com/moon.png',
        },
        {
          id: 'follower-2',
          username: 'Hippo Maxi',
          handle: '0x2222...2222',
          address: '0x2222222222222222222222222222222222222222',
          avatarUri: undefined,
        },
      ]);
    });
  });

  describe('loading state', () => {
    it('reports loading when useQuery is loading', () => {
      mockUseQuery.mockReturnValue(makeQueryResult({ isLoading: true }));

      const { result } = renderHook(() => useFollowers());

      expect(result.current.isLoading).toBe(true);
    });

    it('reports not-loading when disabled', () => {
      const { result } = renderHook(() => useFollowers({ enabled: false }));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns an error message string when useQuery errors', () => {
      mockUseQuery.mockReturnValue(
        makeQueryResult({ error: new Error('Network error') }),
      );

      const { result } = renderHook(() => useFollowers());

      expect(result.current.error).toBe('Network error');
    });

    it('logs query errors with feature:social tags', () => {
      const error = new Error('fetch failed');
      mockUseQuery.mockReturnValue(makeQueryResult({ error }));

      renderHook(() => useFollowers());

      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'social',
            surface: 'followed_traders',
            operation: 'fetch_my_followers',
            endpoint: 'followers',
          }),
        }),
      );
    });
  });

  describe('refresh', () => {
    it('calls refetch when refresh is invoked', async () => {
      mockRefetch.mockResolvedValue(undefined);
      const { result } = renderHook(() => useFollowers());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('logs and rethrows when refetch rejects', async () => {
      const error = new Error('Network failure');
      mockRefetch.mockRejectedValue(error);
      const { result } = renderHook(() => useFollowers());

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
            endpoint: 'followers',
          }),
        }),
      );
    });
  });
});
