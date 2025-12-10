import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useGetCardExternalWalletDetails, {
  mapCardExternalWalletDetailToCardTokenAllowance,
} from './useGetCardExternalWalletDetails';
import { useCardSDK } from '../sdk';
import { useWrapWithCache } from './useWrapWithCache';
import Logger from '../../../../util/Logger';
import {
  CardExternalWalletDetail,
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
  DelegationSettingsNetwork,
} from '../types';
import { ARBITRARY_ALLOWANCE } from '../constants';
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

describe('mapCardExternalWalletDetailToCardTokenAllowance', () => {
  const mockTotalAllowances = [
    { address: '0xtoken1', allowance: '1000' },
    { address: '0xtoken2', allowance: '2000' },
  ];

  const createMockWalletDetail = (
    overrides?: Partial<CardExternalWalletDetail>,
  ): CardExternalWalletDetail => ({
    id: 1,
    walletAddress: '0xwallet',
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
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Allowance State Mapping', () => {
    it('maps NotEnabled state when allowance is zero', () => {
      const walletDetail = createMockWalletDetail({ allowance: '0' });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.allowanceState).toBe(AllowanceState.NotEnabled);
    });

    it('maps Limited state when allowance is below arbitrary threshold', () => {
      const allowance = (ARBITRARY_ALLOWANCE - 1).toString();
      const walletDetail = createMockWalletDetail({ allowance });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.allowanceState).toBe(AllowanceState.Limited);
    });

    it('maps Enabled state when allowance is at or above arbitrary threshold', () => {
      const allowance = ARBITRARY_ALLOWANCE.toString();
      const walletDetail = createMockWalletDetail({ allowance });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.allowanceState).toBe(AllowanceState.Enabled);
    });
  });

  describe('Available Balance Calculation', () => {
    it('uses balance when balance is less than allowance', () => {
      const walletDetail = createMockWalletDetail({
        balance: '50',
        allowance: '100',
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.availableBalance).toBe('50');
    });

    it('uses allowance when allowance is less than balance', () => {
      const walletDetail = createMockWalletDetail({
        balance: '200',
        allowance: '100',
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.availableBalance).toBe('100');
    });

    it('uses same value when balance equals allowance', () => {
      const walletDetail = createMockWalletDetail({
        balance: '100',
        allowance: '100',
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.availableBalance).toBe('100');
    });
  });

  describe('Total Allowance Matching', () => {
    it('matches total allowance by token address case-insensitively', () => {
      const walletDetail = createMockWalletDetail({
        tokenDetails: {
          address: '0xTOKEN1',
          decimals: 6,
          symbol: 'USDC',
          name: 'USD Coin',
        },
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.totalAllowance).toBe('1000');
    });

    it('uses staging token address for matching when available', () => {
      const walletDetail = createMockWalletDetail({
        tokenDetails: {
          address: '0xtoken1',
          decimals: 6,
          symbol: 'USDC',
          name: 'USD Coin',
        },
        stagingTokenAddress: '0xtoken2',
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.totalAllowance).toBe('2000');
    });

    it('returns undefined total allowance when no match found', () => {
      const walletDetail = createMockWalletDetail({
        tokenDetails: {
          address: '0xtoken999',
          decimals: 6,
          symbol: 'USDC',
          name: 'USD Coin',
        },
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.totalAllowance).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('returns null for undefined wallet detail', () => {
      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [undefined],
        mockTotalAllowances,
      );

      expect(result).toEqual([null]);
    });

    it('handles missing allowance by defaulting to zero', () => {
      const walletDetail = createMockWalletDetail({
        allowance: '',
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.allowance).toBe('0');
      expect(result[0]?.allowanceState).toBe(AllowanceState.NotEnabled);
    });

    it('handles missing balance by defaulting to zero', () => {
      const walletDetail = createMockWalletDetail({
        balance: '',
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]?.availableBalance).toBe('0');
    });

    it('preserves all required fields from wallet detail', () => {
      const walletDetail = createMockWalletDetail({
        walletAddress: '0xwallet123',
        priority: 5,
        delegationContractAddress: '0xdelegation',
        stagingTokenAddress: '0xstaging',
      });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail],
        mockTotalAllowances,
      );

      expect(result[0]).toMatchObject({
        address: '0xtoken1',
        decimals: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        walletAddress: '0xwallet123',
        caipChainId: 'eip155:59144',
        priority: 5,
        delegationContract: '0xdelegation',
        stagingTokenAddress: '0xstaging',
      });
    });

    it('handles multiple wallet details', () => {
      const walletDetail1 = createMockWalletDetail({ id: 1, currency: 'USDC' });
      const walletDetail2 = createMockWalletDetail({ id: 2, currency: 'USDT' });

      const result = mapCardExternalWalletDetailToCardTokenAllowance(
        [walletDetail1, walletDetail2],
        mockTotalAllowances,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).not.toBeNull();
      expect(result[1]).not.toBeNull();
    });
  });
});

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
    it('triggers fetch when all prerequisites are ready and no data exists', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockFetchData).toHaveBeenCalledTimes(1);
    });

    it('does not trigger fetch when SDK is not available', () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it('does not trigger fetch when not authenticated', () => {
      mockUseSelector.mockReturnValue(false);

      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it('does not trigger fetch when delegation settings are null', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      renderHook(() => useGetCardExternalWalletDetails(null));

      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it('does not trigger fetch when already loading', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        fetchData: mockFetchData,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it('does not trigger fetch when data already exists', () => {
      mockUseWrapWithCache.mockReturnValue({
        data: {
          walletDetails: [mockWalletDetail1],
          mappedWalletDetails: [] as CardTokenAllowance[],
          priorityWalletDetail: null,
        },
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it('does not trigger fetch when error exists', () => {
      const mockError = new Error('Previous fetch failed');
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        fetchData: mockFetchData,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockFetchData).not.toHaveBeenCalled();
    });

    it('re-triggers fetch when prerequisites change from unavailable to available', () => {
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

      expect(mockFetchData).not.toHaveBeenCalled();

      // SDK becomes available
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: mockSDK,
      });

      rerender();

      expect(mockFetchData).toHaveBeenCalledTimes(1);
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
