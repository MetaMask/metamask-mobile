import { renderHook } from '@testing-library/react-hooks';
import { useQuery } from '@tanstack/react-query';
import useGetCardExternalWalletDetails from './useGetCardExternalWalletDetails';
import { useCardSDK } from '../sdk';
import Logger from '../../../../util/Logger';
import {
  CardExternalWalletDetail,
  DelegationSettingsResponse,
  DelegationSettingsNetwork,
} from '../types';
import { CaipChainId } from '@metamask/utils';
import { dashboardKeys } from '../queries';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockRefetch = jest.fn();
const mockGetQueryData = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useQueryClient: jest.fn().mockReturnValue({
    getQueryData: (...args: unknown[]) => mockGetQueryData(...args),
  }),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('useGetCardExternalWalletDetails', () => {
  const mockGetCardExternalWalletDetails = jest.fn();

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
      refetch: mockRefetch,
    });

    const { useQueryClient } = jest.requireMock('@tanstack/react-query');
    useQueryClient.mockReturnValue({
      getQueryData: mockGetQueryData,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initial State', () => {
    it('returns default state from useQuery', () => {
      const { result } = renderHook(() =>
        useGetCardExternalWalletDetails(mockDelegationSettings),
      );

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.fetchData).toBe('function');
    });

    it('passes correct query configuration to useQuery', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.queryKey).toEqual(
        dashboardKeys.externalWalletDetails(),
      );
      expect(queryConfig.staleTime).toBe(60000);
      expect(queryConfig.enabled).toBe(false);
    });
  });

  describe('SDK ref (stale closure)', () => {
    it('uses current SDK from ref when queryFn runs so refetch works after SDK becomes available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { rerender } = renderHook(() =>
        useGetCardExternalWalletDetails(mockDelegationSettings),
      );

      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: mockSDK,
      });
      mockGetCardExternalWalletDetails.mockResolvedValue([mockWalletDetail1]);

      rerender();

      const queryConfig = (useQuery as jest.Mock).mock.calls[1][0];
      const result = await queryConfig.queryFn();

      expect(mockGetCardExternalWalletDetails).toHaveBeenCalledWith(
        mockDelegationSettings.networks,
      );
      expect(result?.walletDetails).toEqual([mockWalletDetail1]);
    });

    it('throws when queryFn runs and SDK ref is still null', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];

      await expect(queryConfig.queryFn()).rejects.toThrow(
        'SDK not initialized',
      );
      expect(mockGetCardExternalWalletDetails).not.toHaveBeenCalled();
    });
  });

  describe('Prerequisites Check', () => {
    it('query is always disabled (fetching is done via fetchData)', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.enabled).toBe(false);
    });

    it('returns null from queryFn when delegation settings ref is null', async () => {
      renderHook(() => useGetCardExternalWalletDetails(null));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result).toBeNull();
      expect(mockGetCardExternalWalletDetails).not.toHaveBeenCalled();
    });
  });

  describe('Fetching External Wallet Details', () => {
    it('fetches wallet details with delegation settings networks', async () => {
      mockGetCardExternalWalletDetails.mockResolvedValue([mockWalletDetail1]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      await queryConfig.queryFn();

      expect(mockGetCardExternalWalletDetails).toHaveBeenCalledWith(
        mockDelegationSettings.networks,
      );
    });

    it('returns empty arrays when no wallet details found', async () => {
      mockGetCardExternalWalletDetails.mockResolvedValue([]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result).toEqual({
        walletDetails: [],
        mappedWalletDetails: [],
        priorityWalletDetail: undefined,
      });
    });

    it('returns mapped wallet details and priority detail', async () => {
      mockGetCardExternalWalletDetails.mockResolvedValue([mockWalletDetail1]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

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

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

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

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken2');
    });

    it('uses first wallet detail when all have zero balance', async () => {
      const wallet1 = { ...mockWalletDetail1, balance: '0' };
      const wallet2 = { ...mockWalletDetail2, balance: '0' };

      mockGetCardExternalWalletDetails.mockResolvedValue([wallet1, wallet2]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken1');
    });

    it('ignores balance string of 0.0', async () => {
      const wallet1 = { ...mockWalletDetail1, balance: '0.0' };
      const wallet2 = { ...mockWalletDetail2, balance: '50' };

      mockGetCardExternalWalletDetails.mockResolvedValue([wallet1, wallet2]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken2');
    });

    it('ignores NaN balance values', async () => {
      const wallet1 = { ...mockWalletDetail1, balance: 'invalid' };
      const wallet2 = { ...mockWalletDetail2, balance: '50' };

      mockGetCardExternalWalletDetails.mockResolvedValue([wallet1, wallet2]);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result?.priorityWalletDetail?.address).toBe('0xtoken2');
    });
  });

  describe('Error Handling', () => {
    it('throws error when getCardExternalWalletDetails fails', async () => {
      const apiError = new Error('API error');
      mockGetCardExternalWalletDetails.mockRejectedValue(apiError);

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];

      await expect(queryConfig.queryFn()).rejects.toThrow('API error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        apiError,
        'useGetCardExternalWalletDetails: Failed to fetch external wallet details',
      );
    });

    it('normalizes non-Error exceptions to Error objects', async () => {
      mockGetCardExternalWalletDetails.mockRejectedValue('string error');

      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];

      await expect(queryConfig.queryFn()).rejects.toThrow('string error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'string error' }),
        'useGetCardExternalWalletDetails: Failed to fetch external wallet details',
      );
    });
  });

  describe('Auto-fetch Behavior', () => {
    it('does not auto-fetch when all prerequisites are ready and no data exists', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      expect(mockGetCardExternalWalletDetails).not.toHaveBeenCalled();
    });

    it('does not auto-fetch when prerequisites change from unavailable to available', () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { rerender } = renderHook(() =>
        useGetCardExternalWalletDetails(mockDelegationSettings),
      );

      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: mockSDK,
      });

      rerender();

      expect(mockGetCardExternalWalletDetails).not.toHaveBeenCalled();
    });
  });

  describe('Cache Integration', () => {
    it('uses 60 second staleTime', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.staleTime).toBe(60000);
    });

    it('uses correct query key', () => {
      renderHook(() => useGetCardExternalWalletDetails(mockDelegationSettings));

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.queryKey).toEqual(
        dashboardKeys.externalWalletDetails(),
      );
    });
  });
});
