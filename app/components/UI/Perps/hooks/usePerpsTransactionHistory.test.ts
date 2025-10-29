import { renderHook, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTransactionHistory } from './usePerpsTransactionHistory';
import { useUserHistory } from './useUserHistory';
import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
  transformUserHistoryToTransactions,
} from '../utils/transactionTransforms';
import { FillType } from '../types/transactionHistory';
import type { CaipAccountId } from '@metamask/utils';

// Mock dependencies
jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('./useUserHistory');
jest.mock('../utils/transactionTransforms');

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockUseUserHistory = useUserHistory as jest.MockedFunction<
  typeof useUserHistory
>;
const mockTransformFillsToTransactions =
  transformFillsToTransactions as jest.MockedFunction<
    typeof transformFillsToTransactions
  >;
const mockTransformOrdersToTransactions =
  transformOrdersToTransactions as jest.MockedFunction<
    typeof transformOrdersToTransactions
  >;
const mockTransformFundingToTransactions =
  transformFundingToTransactions as jest.MockedFunction<
    typeof transformFundingToTransactions
  >;
const mockTransformUserHistoryToTransactions =
  transformUserHistoryToTransactions as jest.MockedFunction<
    typeof transformUserHistoryToTransactions
  >;

describe('usePerpsTransactionHistory', () => {
  let mockController: {
    getActiveProvider: jest.MockedFunction<() => unknown>;
  };
  let mockProvider: {
    getOrderFills: jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
    getOrders: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    getFunding: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  };

  const mockFills = [
    {
      direction: 'Open Long',
      orderId: 'order1',
      symbol: 'ETH',
      size: '1',
      price: '2000',
      fee: '10',
      timestamp: 1640995200000,
      feeToken: 'USDC',
      pnl: '0',
      liquidation: false,
      detailedOrderType: 'Market',
    },
  ];

  const mockOrders = [
    {
      orderId: 'order2',
      symbol: 'BTC',
      side: 'buy',
      orderType: 'Limit',
      size: '0.5',
      originalSize: '1',
      price: '50000',
      status: 'filled',
      timestamp: 1640995201000,
    },
  ];

  const mockFunding = [
    {
      symbol: 'ETH',
      amountUsd: '5.25',
      rate: '0.0001',
      timestamp: 1640995202000,
    },
  ];

  const mockUserHistory = [
    {
      id: 'deposit1',
      timestamp: 1640995203000,
      type: 'deposit' as const,
      amount: '1000',
      asset: 'USDC',
      status: 'completed' as const,
      txHash: '0x123',
      details: {
        source: 'ethereum',
        bridgeContract: '0x1234567890123456789012345678901234567890',
        recipient: '0x9876543210987654321098765432109876543210',
        blockNumber: '12345',
        chainId: '1',
        synthetic: false,
      },
    },
  ];

  const mockTransformedTransactions = [
    {
      id: 'fill-1',
      type: 'trade' as const,
      category: 'position_open' as const,
      title: 'Opened long',
      subtitle: '1 ETH',
      timestamp: 1640995200000,
      asset: 'ETH',
      fill: {
        shortTitle: 'Opened long',
        amount: '-$10.00',
        amountNumber: -10,
        isPositive: false,
        size: '1',
        entryPrice: '2000',
        pnl: '0',
        fee: '10',
        points: '0',
        feeToken: 'USDC',
        action: 'Opened',
        liquidation: undefined,
        isLiquidation: false,
        isTakeProfit: false,
        isStopLoss: false,
        fillType: FillType.Standard,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock provider
    mockProvider = {
      getOrderFills: jest.fn().mockResolvedValue(mockFills),
      getOrders: jest.fn().mockResolvedValue(mockOrders),
      getFunding: jest.fn().mockResolvedValue(mockFunding),
    };

    // Mock controller
    mockController = {
      getActiveProvider: jest.fn().mockReturnValue(mockProvider),
    };

    // Mock Engine context
    (
      mockEngine as unknown as { context: { PerpsController: unknown } }
    ).context = {
      PerpsController: mockController,
    };

    // Mock hooks
    mockUseUserHistory.mockReturnValue({
      userHistory: mockUserHistory,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    // Mock transform functions
    mockTransformFillsToTransactions.mockReturnValue(
      mockTransformedTransactions,
    );
    mockTransformOrdersToTransactions.mockReturnValue([]);
    mockTransformFundingToTransactions.mockReturnValue([]);
    mockTransformUserHistoryToTransactions.mockReturnValue([]);
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => usePerpsTransactionHistory());

      expect(result.current.transactions).toEqual([]);
      expect(result.current.isLoading).toBe(true); // Hook immediately starts fetching
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('skips initial fetch when skipInitialFetch is true', () => {
      const { result } = renderHook(() =>
        usePerpsTransactionHistory({ skipInitialFetch: true }),
      );

      expect(result.current.transactions).toEqual([]);
      expect(mockProvider.getOrderFills).not.toHaveBeenCalled();
    });
  });

  describe('fetchAllTransactions', () => {
    it('fetches and combines all transaction data', async () => {
      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        // Wait for the effect to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getOrderFills).toHaveBeenCalledWith({
        accountId: undefined,
        aggregateByTime: false,
      });
      expect(mockProvider.getOrders).toHaveBeenCalledWith({
        accountId: undefined,
      });
      expect(mockProvider.getFunding).toHaveBeenCalledWith({
        accountId: undefined,
        startTime: 0,
        endTime: undefined,
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith(mockFills);
      expect(mockTransformOrdersToTransactions).toHaveBeenCalledWith(
        mockOrders,
      );
      expect(mockTransformFundingToTransactions).toHaveBeenCalledWith(
        mockFunding,
      );
      expect(mockTransformUserHistoryToTransactions).toHaveBeenCalledWith(
        mockUserHistory,
      );
    });

    it('uses provided parameters', async () => {
      const params = {
        startTime: 1640995200000,
        endTime: 1640995300000,
        accountId:
          'eip155:1:0x1234567890123456789012345678901234567890' as CaipAccountId,
      };

      renderHook(() => usePerpsTransactionHistory(params));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getFunding).toHaveBeenCalledWith({
        accountId: 'eip155:1:0x1234567890123456789012345678901234567890',
        startTime: 1640995200000,
        endTime: 1640995300000,
      });
    });

    it('sorts transactions by timestamp descending', async () => {
      const mockTransactions = [
        {
          id: 'tx1',
          timestamp: 1000,
          type: 'deposit' as const,
          category: 'deposit' as const,
          title: 'Deposit',
          subtitle: '100 USDC',
          asset: 'USDC',
        },
        {
          id: 'tx2',
          timestamp: 2000,
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Trade',
          subtitle: '1 ETH',
          asset: 'ETH',
        },
        {
          id: 'tx3',
          timestamp: 1500,
          type: 'withdrawal' as const,
          category: 'withdrawal' as const,
          title: 'Withdrawal',
          subtitle: '50 USDC',
          asset: 'USDC',
        },
      ];

      mockTransformFillsToTransactions.mockReturnValue(mockTransactions);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.transactions[0].timestamp).toBe(2000);
      expect(result.current.transactions[1].timestamp).toBe(1500);
      expect(result.current.transactions[2].timestamp).toBe(1000);
    });

    it('removes duplicate transactions', async () => {
      const duplicateTransactions = [
        {
          id: 'tx1',
          timestamp: 1000,
          type: 'deposit' as const,
          category: 'deposit' as const,
          title: 'Deposit',
          subtitle: '100 USDC',
          asset: 'USDC',
        },
        {
          id: 'tx1',
          timestamp: 1000,
          type: 'deposit' as const,
          category: 'deposit' as const,
          title: 'Deposit',
          subtitle: '100 USDC',
          asset: 'USDC',
        },
        {
          id: 'tx2',
          timestamp: 2000,
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Trade',
          subtitle: '1 ETH',
          asset: 'ETH',
        },
      ];

      // Ensure all other transform functions return empty arrays for this test
      mockTransformFillsToTransactions.mockReturnValue([]);
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue(
        duplicateTransactions,
      );

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.transactions).toHaveLength(2);
    });

    it('combines transactions from different sources without duplicates', async () => {
      const userHistoryTx = {
        id: 'deposit-tx1',
        timestamp: 1000,
        type: 'deposit' as const,
        category: 'deposit' as const,
        title: 'Deposit',
        subtitle: '100 USDC',
        asset: 'USDC',
      };
      const fillTx = {
        id: 'fill-tx2',
        timestamp: 2000,
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'Trade',
        subtitle: '1 ETH',
        asset: 'ETH',
      };

      mockTransformUserHistoryToTransactions.mockReturnValue([userHistoryTx]);
      mockTransformFillsToTransactions.mockReturnValue([fillTx]);
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should contain both transactions (no duplicates since IDs are different)
      expect(result.current.transactions).toHaveLength(2);
      expect(result.current.transactions[0]).toEqual(fillTx); // Newest first (timestamp 2000)
      expect(result.current.transactions[1]).toEqual(userHistoryTx); // Older (timestamp 1000)
    });
  });

  describe('error handling', () => {
    it('handles PerpsController not available', async () => {
      (
        mockEngine as unknown as { context: { PerpsController: unknown } }
      ).context.PerpsController = undefined;

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('PerpsController not available');
      expect(result.current.transactions).toEqual([]);
    });

    it('handles no active provider', async () => {
      mockController.getActiveProvider.mockReturnValue(undefined);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('No active provider available');
      expect(result.current.transactions).toEqual([]);
    });

    it('handles provider fetch errors', async () => {
      mockProvider.getOrderFills.mockRejectedValue(new Error('Fetch error'));

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Fetch error');
      expect(result.current.transactions).toEqual([]);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error fetching transaction history:',
        'Fetch error',
      );
    });

    it('handles non-Error exceptions', async () => {
      mockProvider.getOrderFills.mockRejectedValue('String error');

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Failed to fetch transaction history');
    });
  });

  describe('loading states', () => {
    it('combines loading states from all hooks', () => {
      mockUseUserHistory.mockReturnValue({
        userHistory: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsTransactionHistory());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when all hooks are not loading', async () => {
      mockUseUserHistory.mockReturnValue({
        userHistory: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsTransactionHistory());

      // Wait for the initial fetch to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error states', () => {
    it('returns main error when present', () => {
      mockUseUserHistory.mockReturnValue({
        userHistory: [],
        isLoading: false,
        error: 'User history error',
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsTransactionHistory());

      expect(result.current.error).toBe('User history error');
    });

    it('returns user history error when main error is null', () => {
      mockUseUserHistory.mockReturnValue({
        userHistory: [],
        isLoading: false,
        error: 'User history error',
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsTransactionHistory());

      expect(result.current.error).toBe('User history error');
    });

    it('returns null when no errors', () => {
      mockUseUserHistory.mockReturnValue({
        userHistory: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsTransactionHistory());

      expect(result.current.error).toBeNull();
    });
  });

  describe('refetch functionality', () => {
    it('refetches all data sources', async () => {
      const mockRefetchUserHistory = jest.fn().mockResolvedValue(undefined);

      mockUseUserHistory.mockReturnValue({
        userHistory: [],
        isLoading: false,
        error: null,
        refetch: mockRefetchUserHistory,
      });

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRefetchUserHistory).toHaveBeenCalled();
      expect(mockProvider.getOrderFills).toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('logs transaction data fetching', async () => {
      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Fetching comprehensive transaction history...',
      );
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Transaction data fetched:',
        { fills: mockFills, orders: mockOrders, funding: mockFunding },
      );
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Combined transactions:',
        expect.any(Array),
      );
    });
  });
});
