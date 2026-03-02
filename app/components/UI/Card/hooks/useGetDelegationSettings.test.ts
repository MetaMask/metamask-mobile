import { renderHook, act } from '@testing-library/react-hooks';
import { useQuery } from '@tanstack/react-query';
import useGetDelegationSettings from './useGetDelegationSettings';
import { useCardSDK } from '../sdk';
import {
  DelegationSettingsResponse,
  DelegationSettingsNetwork,
} from '../types';
import { CardSDK } from '../sdk/CardSDK';
import { dashboardKeys } from '../queries';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockFetchQuery = jest.fn();
const mockQueryClient = {
  fetchQuery: (...args: unknown[]) => mockFetchQuery(...args),
};
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  }),
  useQueryClient: jest.fn(() => mockQueryClient),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('useGetDelegationSettings', () => {
  const mockGetDelegationSettings = jest.fn();

  const mockSDK = {
    getDelegationSettings: mockGetDelegationSettings,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const mockDelegationSettingsResponse: DelegationSettingsResponse = {
    networks: [
      {
        network: 'linea',
        environment: 'production',
        chainId: '59144',
        delegationContract: '0xdelegation',
        tokens: {
          USDC: {
            symbol: 'USDC',
            decimals: 6,
            address: '0xusdc',
          },
          USDT: {
            symbol: 'USDT',
            decimals: 6,
            address: '0xusdt',
          },
        },
      },
      {
        network: 'solana',
        environment: 'production',
        chainId: 'mainnet',
        delegationContract: '0xsolana',
        tokens: {
          USDC: {
            symbol: 'USDC',
            decimals: 6,
            address: 'usdc-solana',
          },
        },
      },
    ] as DelegationSettingsNetwork[],
    count: 2,
    _links: {
      self: 'https://api.example.com/delegation-settings',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { useQueryClient } = jest.requireMock('@tanstack/react-query');
    useQueryClient.mockReturnValue(mockQueryClient);

    mockFetchQuery.mockResolvedValue(mockDelegationSettingsResponse);
    mockGetDelegationSettings.mockResolvedValue(mockDelegationSettingsResponse);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initial State', () => {
    it('returns default state from useQuery', () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.fetchData).toBe('function');
    });

    it('passes correct query key to useQuery', () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.queryKey).toEqual(dashboardKeys.delegationSettings());
    });

    it('passes correct staleTime to useQuery', () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.staleTime).toBe(600000);
    });

    it('uses 10 minute staleTime', () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.staleTime).toBe(10 * 60 * 1000);
    });
  });

  describe('Prerequisites Check', () => {
    it('throws error from queryFn when SDK is not available', () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(() => queryConfig.queryFn()).toThrow('SDK not initialized');
      expect(mockGetDelegationSettings).not.toHaveBeenCalled();
    });

    it('query is always disabled (fetching is done via fetchData)', () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.enabled).toBe(false);
    });

    it('calls getDelegationSettings when SDK is available via fetchData', async () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      await act(async () => {
        await result.current.fetchData();
      });

      expect(mockFetchQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fetching Delegation Settings', () => {
    it('returns delegation settings from SDK', async () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result).toEqual(mockDelegationSettingsResponse);
    });

    it('calls SDK getDelegationSettings without arguments', async () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      await queryConfig.queryFn();

      expect(mockGetDelegationSettings).toHaveBeenCalledWith();
    });

    it('returns delegation settings with multiple networks', async () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.networks).toHaveLength(2);
      expect(result?.count).toBe(2);
    });

    it('returns delegation settings with network configurations', async () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.networks[0]).toMatchObject({
        network: 'linea',
        environment: 'production',
        chainId: '59144',
        delegationContract: '0xdelegation',
      });
    });

    it('returns delegation settings with token configurations', async () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.networks[0].tokens).toHaveProperty('USDC');
      expect(result?.networks[0].tokens.USDC).toMatchObject({
        symbol: 'USDC',
        decimals: 6,
        address: '0xusdc',
      });
    });

    it('returns delegation settings with links', async () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?._links).toHaveProperty('self');
      expect(result?._links.self).toBe(
        'https://api.example.com/delegation-settings',
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles empty networks array', async () => {
      mockGetDelegationSettings.mockResolvedValue({
        networks: [],
        count: 0,
        _links: {
          self: '',
        },
      });

      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.networks).toEqual([]);
      expect(result?.count).toBe(0);
    });

    it('handles network with empty tokens', async () => {
      mockGetDelegationSettings.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            environment: 'production',
            chainId: '59144',
            delegationContract: '0xdelegation',
            tokens: {},
          } as DelegationSettingsNetwork,
        ],
        count: 1,
        _links: {
          self: '',
        },
      });

      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.networks[0].tokens).toEqual({});
    });

    it('handles single network configuration', async () => {
      mockGetDelegationSettings.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            environment: 'production',
            chainId: '59144',
            delegationContract: '0xdelegation',
            tokens: {},
          } as DelegationSettingsNetwork,
        ],
        count: 1,
        _links: {
          self: '',
        },
      });

      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.networks).toHaveLength(1);
      expect(result?.count).toBe(1);
    });
  });

  describe('Cache Integration', () => {
    it('exposes fetchData function', () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      expect(typeof result.current.fetchData).toBe('function');
    });

    it('delegates cache freshness to fetchQuery with staleTime', async () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      await act(async () => {
        await result.current.fetchData();
      });

      expect(mockFetchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: dashboardKeys.delegationSettings(),
          staleTime: 10 * 60 * 1000,
        }),
      );
    });

    it('returns fetched data from fetchData', async () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      let fetchResult;
      await act(async () => {
        fetchResult = await result.current.fetchData();
      });

      expect(fetchResult).toEqual(mockDelegationSettingsResponse);
    });

    it('returns null when fetchQuery returns null', async () => {
      mockFetchQuery.mockResolvedValue(null);

      const { result } = renderHook(() => useGetDelegationSettings());

      let fetchResult;
      await act(async () => {
        fetchResult = await result.current.fetchData();
      });

      expect(fetchResult).toBeNull();
    });

    it('returns data from useQuery when available', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: mockDelegationSettingsResponse,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.data).toEqual(mockDelegationSettingsResponse);
    });

    it('returns loading state from useQuery', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns error state from useQuery', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Test error'),
      });

      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('uses consistent query key across renders', () => {
      const { rerender } = renderHook(() => useGetDelegationSettings());

      const firstCallKey = (useQuery as jest.Mock).mock.calls[0][0].queryKey;

      rerender();

      const secondCallKey = (useQuery as jest.Mock).mock.calls[1][0].queryKey;

      expect(firstCallKey).toEqual(secondCallKey);
      expect(firstCallKey).toEqual(dashboardKeys.delegationSettings());
    });
  });

  describe('Enabled Condition', () => {
    it('query is always disabled (manual fetching via fetchData)', () => {
      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.enabled).toBe(false);
    });
  });

  describe('Return Value Structure', () => {
    it('returns all required properties', () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchData');
    });

    it('returns properties with correct types', () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.error).toBe('object');
      expect(typeof result.current.fetchData).toBe('function');
    });
  });

  describe('Error Scenarios', () => {
    it('propagates errors from SDK getDelegationSettings', async () => {
      const apiError = new Error('API Error');
      mockGetDelegationSettings.mockRejectedValue(apiError);

      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];

      await expect(queryConfig.queryFn()).rejects.toThrow('API Error');
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network timeout');
      mockGetDelegationSettings.mockRejectedValue(networkError);

      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];

      await expect(queryConfig.queryFn()).rejects.toThrow('Network timeout');
    });

    it('handles SDK method not available', () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: {} as unknown as CardSDK,
      });

      renderHook(() => useGetDelegationSettings());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];

      expect(() => queryConfig.queryFn()).toThrow();
    });
  });

  describe('Multiple Hook Instances', () => {
    it('can be used in multiple components independently', () => {
      const { result: result1 } = renderHook(() => useGetDelegationSettings());
      const { result: result2 } = renderHook(() => useGetDelegationSettings());

      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
      expect(useQuery as jest.Mock).toHaveBeenCalledTimes(2);
    });

    it('uses same query key across multiple instances', () => {
      renderHook(() => useGetDelegationSettings());
      renderHook(() => useGetDelegationSettings());

      const firstKey = (useQuery as jest.Mock).mock.calls[0][0].queryKey;
      const secondKey = (useQuery as jest.Mock).mock.calls[1][0].queryKey;

      expect(firstKey).toEqual(secondKey);
      expect(firstKey).toEqual(dashboardKeys.delegationSettings());
    });

    it('uses same staleTime across multiple instances', () => {
      renderHook(() => useGetDelegationSettings());
      renderHook(() => useGetDelegationSettings());

      const firstStaleTime = (useQuery as jest.Mock).mock.calls[0][0].staleTime;
      const secondStaleTime = (useQuery as jest.Mock).mock.calls[1][0]
        .staleTime;

      expect(firstStaleTime).toBe(secondStaleTime);
      expect(firstStaleTime).toBe(600000);
    });
  });
});
