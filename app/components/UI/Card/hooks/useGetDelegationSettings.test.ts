import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useGetDelegationSettings from './useGetDelegationSettings';
import { useCardSDK } from '../sdk';
import { useWrapWithCache } from './useWrapWithCache';
import {
  DelegationSettingsResponse,
  DelegationSettingsNetwork,
} from '../types';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('./useWrapWithCache', () => ({
  useWrapWithCache: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseWrapWithCache = useWrapWithCache as jest.MockedFunction<
  typeof useWrapWithCache
>;

describe('useGetDelegationSettings', () => {
  const mockGetDelegationSettings = jest.fn();
  const mockFetchData = jest.fn();

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

  const mockCacheReturn = {
    data: null,
    isLoading: false,
    error: null,
    fetchData: mockFetchData,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockReturnValue(true); // isAuthenticated

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });

    mockUseWrapWithCache.mockImplementation((_key, fetchFn, _options) => {
      // Store the fetch function for later use
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockCacheReturn as any).actualFetchFn = fetchFn;
      return mockCacheReturn;
    });

    mockGetDelegationSettings.mockResolvedValue(mockDelegationSettingsResponse);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initial State', () => {
    it('returns cache data from useWrapWithCache', () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.fetchData).toBe(mockFetchData);
    });

    it('passes correct cache key to useWrapWithCache', () => {
      renderHook(() => useGetDelegationSettings());

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'delegation-settings',
        expect.any(Function),
        expect.any(Object),
      );
    });

    it('passes correct cache configuration to useWrapWithCache', () => {
      renderHook(() => useGetDelegationSettings());

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        {
          cacheDuration: 600000, // 10 minutes in milliseconds
          fetchOnMount: false,
        },
      );
    });

    it('uses 10 minute cache duration', () => {
      renderHook(() => useGetDelegationSettings());

      const call = mockUseWrapWithCache.mock.calls[0];
      const options = call[2];

      expect(options).toEqual({
        cacheDuration: 10 * 60 * 1000,
        fetchOnMount: false,
      });
    });
  });

  describe('Prerequisites Check', () => {
    it('returns null when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useGetDelegationSettings());

      // Get the fetch function from the mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result).toBeNull();
      expect(mockGetDelegationSettings).not.toHaveBeenCalled();
    });

    it('returns null when user is not authenticated', async () => {
      mockUseSelector.mockReturnValue(false);

      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result).toBeNull();
      expect(mockGetDelegationSettings).not.toHaveBeenCalled();
    });

    it('calls getDelegationSettings when SDK and authentication are available', async () => {
      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      await fetchFn();

      expect(mockGetDelegationSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fetching Delegation Settings', () => {
    it('returns delegation settings from SDK', async () => {
      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result).toEqual(mockDelegationSettingsResponse);
    });

    it('calls SDK getDelegationSettings without arguments', async () => {
      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      await fetchFn();

      expect(mockGetDelegationSettings).toHaveBeenCalledWith();
    });

    it('returns delegation settings with multiple networks', async () => {
      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.networks).toHaveLength(2);
      expect(result?.count).toBe(2);
    });

    it('returns delegation settings with network configurations', async () => {
      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.networks[0]).toMatchObject({
        network: 'linea',
        environment: 'production',
        chainId: '59144',
        delegationContract: '0xdelegation',
      });
    });

    it('returns delegation settings with token configurations', async () => {
      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.networks[0].tokens).toHaveProperty('USDC');
      expect(result?.networks[0].tokens.USDC).toMatchObject({
        symbol: 'USDC',
        decimals: 6,
        address: '0xusdc',
      });
    });

    it('returns delegation settings with links', async () => {
      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.networks).toHaveLength(1);
      expect(result?.count).toBe(1);
    });
  });

  describe('Cache Integration', () => {
    it('exposes fetchData function from useWrapWithCache', () => {
      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.fetchData).toBe(mockFetchData);
      expect(typeof result.current.fetchData).toBe('function');
    });

    it('returns data from cache when available', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: mockDelegationSettingsResponse,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.data).toEqual(mockDelegationSettingsResponse);
    });

    it('returns loading state from cache', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        fetchData: mockFetchData,
      });

      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns error state from cache', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Test error'),
        fetchData: mockFetchData,
      });

      const { result } = renderHook(() => useGetDelegationSettings());

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('uses consistent cache key across renders', () => {
      const { rerender } = renderHook(() => useGetDelegationSettings());

      const firstCallKey = mockUseWrapWithCache.mock.calls[0][0];

      rerender();

      const secondCallKey = mockUseWrapWithCache.mock.calls[1][0];

      expect(firstCallKey).toBe(secondCallKey);
      expect(firstCallKey).toBe('delegation-settings');
    });
  });

  describe('Callback Stability', () => {
    it('updates fetch callback when SDK changes', () => {
      const { rerender } = renderHook(() => useGetDelegationSettings());

      const firstCallback = mockUseWrapWithCache.mock.calls[0][1];

      // Change SDK instance
      const newMockSDK = {
        getDelegationSettings: jest.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: newMockSDK,
      });

      rerender();

      const secondCallback = mockUseWrapWithCache.mock.calls[1][1];

      expect(firstCallback).not.toBe(secondCallback);
    });

    it('updates fetch callback when authentication state changes', () => {
      const { rerender } = renderHook(() => useGetDelegationSettings());

      const firstCallback = mockUseWrapWithCache.mock.calls[0][1];

      // Change authentication state
      mockUseSelector.mockReturnValue(false);

      rerender();

      const secondCallback = mockUseWrapWithCache.mock.calls[1][1];

      expect(firstCallback).not.toBe(secondCallback);
    });

    it('maintains callback stability when unrelated state changes', () => {
      const { rerender } = renderHook(() => useGetDelegationSettings());

      const firstCallback = mockUseWrapWithCache.mock.calls[0][1];

      rerender();

      const secondCallback = mockUseWrapWithCache.mock.calls[1][1];

      // Callback should be stable since SDK and auth haven't changed
      expect(firstCallback).toBe(secondCallback);
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;

      await expect(fetchFn()).rejects.toThrow('API Error');
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network timeout');
      mockGetDelegationSettings.mockRejectedValue(networkError);

      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;

      await expect(fetchFn()).rejects.toThrow('Network timeout');
    });

    it('handles SDK method not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: {} as unknown as CardSDK, // SDK wi thout getDelegationSettings method
      });

      renderHook(() => useGetDelegationSettings());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;

      await expect(fetchFn()).rejects.toThrow();
    });
  });

  describe('Multiple Hook Instances', () => {
    it('can be used in multiple components independently', () => {
      const { result: result1 } = renderHook(() => useGetDelegationSettings());
      const { result: result2 } = renderHook(() => useGetDelegationSettings());

      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
      expect(mockUseWrapWithCache).toHaveBeenCalledTimes(2);
    });

    it('uses same cache key across multiple instances', () => {
      renderHook(() => useGetDelegationSettings());
      renderHook(() => useGetDelegationSettings());

      const firstKey = mockUseWrapWithCache.mock.calls[0][0];
      const secondKey = mockUseWrapWithCache.mock.calls[1][0];

      expect(firstKey).toBe(secondKey);
      expect(firstKey).toBe('delegation-settings');
    });

    it('uses same cache duration across multiple instances', () => {
      renderHook(() => useGetDelegationSettings());
      renderHook(() => useGetDelegationSettings());

      const firstOptions = mockUseWrapWithCache.mock.calls[0][2];
      const secondOptions = mockUseWrapWithCache.mock.calls[1][2];

      expect(firstOptions).toEqual(secondOptions);
      expect(firstOptions?.cacheDuration).toBe(600000);
    });
  });
});
