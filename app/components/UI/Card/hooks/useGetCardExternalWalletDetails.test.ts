import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useGetCardExternalWalletDetails from './useGetCardExternalWalletDetails';
import { useCardSDK } from '../sdk';
import { useWrapWithCache } from './useWrapWithCache';
import Logger from '../../../../util/Logger';
import {
  CardExternalWalletDetail,
  DelegationSettingsResponse,
  DelegationSettingsNetwork,
} from '../types';
import { CaipChainId } from '@metamask/utils';

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

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseWrapWithCache = useWrapWithCache as jest.MockedFunction<
  typeof useWrapWithCache
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('useGetCardExternalWalletDetails', () => {
  const mockGetCardExternalWalletDetails = jest.fn();
  const mockFetchData = jest.fn();

  const mockSDK = {
    getCardExternalWalletDetails: mockGetCardExternalWalletDetails,
    lineaChainId: 'eip155:59144' as CaipChainId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  const mockDelegationSettings: DelegationSettingsResponse = {
    networks: [
      {
        network: 'linea',
        environment: 'production',
        chainId: '59144',
        delegationContract: '0xdelegation',
        tokens: {},
      },
    ] as DelegationSettingsNetwork[],
    count: 1,
    _links: {
      self: '',
    },
  };

  const mockWalletDetail1: CardExternalWalletDetail = {
    id: 1,
    walletAddress: '0xwallet1',
    currency: 'USDC',
    balance: '500',
    allowance: '100',
    priority: 1,
    tokenDetails: {
      address: '0xtoken1',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
    },
    caipChainId: 'eip155:59144' as CaipChainId,
    network: 'linea',
  };

  const mockWalletDetail2: CardExternalWalletDetail = {
    id: 2,
    walletAddress: '0xwallet2',
    currency: 'USDT',
    balance: '0',
    allowance: '200',
    priority: 2,
    tokenDetails: {
      address: '0xtoken2',
      decimals: 6,
      symbol: 'USDT',
      name: 'Tether',
    },
    caipChainId: 'eip155:59144' as CaipChainId,
    network: 'linea',
  };

  const mockCacheReturn = {
    data: null,
    isLoading: false,
    error: null,
    fetchData: mockFetchData,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

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
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('returns cache data from useWrapWithCache', () => {
      const { result } = renderHook(() =>
        useGetCardExternalWalletDetails(mockDelegationSettings),
      );

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.fetchData).toBe(mockFetchData);
    });

    it('passes correct cache configuration to useWrapWithCache', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'card-external-wallet-details',
        expect.any(Function),
        {
          cacheDuration: 60000,
          fetchOnMount: false,
        },
      );
    });
  });

  describe('Prerequisites Check', () => {
    it('returns null when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // Get the fetch function from the mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result).toBeNull();
      expect(mockGetCardExternalWalletDetails).not.toHaveBeenCalled();
    });

    it('returns null when user is not authenticated', async () => {
      mockUseSelector.mockReturnValue(false);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result).toBeNull();
      expect(mockGetCardExternalWalletDetails).not.toHaveBeenCalled();
    });

    it('returns null when delegation settings are not available', async () => {
      renderHook(() => useGetCardExternalWalletDetails(null));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result).toBeNull();
      expect(mockGetCardExternalWalletDetails).not.toHaveBeenCalled();
    });
  });

  describe('Fetching External Wallet Details', () => {
    it('fetches wallet details with delegation settings networks', async () => {
      mockGetCardExternalWalletDetails.mockResolvedValue([mockWalletDetail1]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      await fetchFn();

      expect(mockGetCardExternalWalletDetails).toHaveBeenCalledWith(
        mockDelegationSettings.networks,
      );
    });

    it('returns empty arrays when no wallet details found', async () => {
      mockGetCardExternalWalletDetails.mockResolvedValue([]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result).toEqual({
        walletDetails: [],
        mappedWalletDetails: [],
        priorityWalletDetail: null,
      });
    });

    it('returns mapped wallet details and priority detail', async () => {
      mockGetCardExternalWalletDetails.mockResolvedValue([mockWalletDetail1]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.walletDetails).toEqual([mockWalletDetail1]);
      expect(result?.mappedWalletDetails).toHaveLength(1);
      expect(result?.priorityWalletDetail).toMatchObject({
        address: '0xtoken1',
        symbol: 'USDC',
      });
    });
  });

  describe('Priority Wallet Detail Selection', () => {
    it('uses first wallet detail when only one exists', async () => {
      mockGetCardExternalWalletDetails.mockResolvedValue([mockWalletDetail1]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken1');
    });

    it('selects first wallet detail with non-zero balance when multiple exist', async () => {
      const walletDetailWithZeroBalance = {
        ...mockWalletDetail1,
        balance: '0',
      };
      const walletDetailWithBalance = {
        ...mockWalletDetail2,
        balance: '100',
      };

      mockGetCardExternalWalletDetails.mockResolvedValue([
        walletDetailWithZeroBalance,
        walletDetailWithBalance,
      ]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken2');
    });

    it('uses first wallet detail when all have zero balance', async () => {
      const wallet1 = { ...mockWalletDetail1, balance: '0' };
      const wallet2 = { ...mockWalletDetail2, balance: '0' };

      mockGetCardExternalWalletDetails.mockResolvedValue([wallet1, wallet2]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken1');
    });

    it('ignores balance string of 0.0', async () => {
      const wallet1 = { ...mockWalletDetail1, balance: '0.0' };
      const wallet2 = { ...mockWalletDetail2, balance: '50' };

      mockGetCardExternalWalletDetails.mockResolvedValue([wallet1, wallet2]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken2');
    });

    it('ignores NaN balance values', async () => {
      const wallet1 = { ...mockWalletDetail1, balance: 'invalid' };
      const wallet2 = { ...mockWalletDetail2, balance: '50' };

      mockGetCardExternalWalletDetails.mockResolvedValue([wallet1, wallet2]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;
      const result = await fetchFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken2');
    });
  });

  describe('Error Handling', () => {
    it('throws error when getCardExternalWalletDetails fails', async () => {
      const apiError = new Error('API error');
      mockGetCardExternalWalletDetails.mockRejectedValue(apiError);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;

      await expect(fetchFn()).rejects.toThrow('API error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        apiError,
        'useGetCardExternalWalletDetails: Failed to fetch external wallet details',
      );
    });

    it('normalizes non-Error exceptions to Error objects', async () => {
      mockGetCardExternalWalletDetails.mockRejectedValue('string error');

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchFn = (mockCacheReturn as any).actualFetchFn;

      await expect(fetchFn()).rejects.toThrow('string error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'string error' }),
        'useGetCardExternalWalletDetails: Failed to fetch external wallet details',
      );
    });
  });

  describe('Auto-fetch Behavior', () => {
    it('does not auto-fetch when all prerequisites are ready and no data exists', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      // Auto-fetch is intentionally disabled (fetchOnMount: false)
      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it('does not auto-fetch when prerequisites change from unavailable to available', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      // Start with SDK unavailable
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { rerender } = renderHook(() =>
        useGetCardExternalWalletDetails(mockDelegationSettings),
      );

      // SDK becomes available
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: mockSDK,
      });

      rerender();

      // Auto-fetch is intentionally disabled (fetchOnMount: false)
      expect(mockFetchData).not.toHaveBeenCalled();
    });
  });

  describe('Cache Integration', () => {
    it('uses 60 second cache duration', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          cacheDuration: 60000,
        }),
      );
    });

    it('disables fetch on mount', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          fetchOnMount: false,
        }),
      );
    });

    it('uses correct cache key', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'card-external-wallet-details',
        expect.any(Function),
        expect.any(Object),
      );
    });
  });
});
