import { renderHook, act, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsTransactionHistory } from './usePerpsTransactionHistory';
import { useUserHistory } from './useUserHistory';
import { usePerpsLiveFills } from './stream/usePerpsLiveFills';
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
jest.mock('./stream/usePerpsLiveFills');

// Suppress act() warnings from auto-fetch behavior in useEffect
// These warnings occur because the hook auto-fetches on mount and the async
// state updates complete outside of act(). This is expected behavior for
// hooks with auto-fetch and doesn't affect test correctness.
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (typeof message === 'string' && message.includes('not wrapped in act')) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
});

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockUseUserHistory = useUserHistory as jest.MockedFunction<
  typeof useUserHistory
>;
const mockUsePerpsLiveFills = usePerpsLiveFills as jest.MockedFunction<
  typeof usePerpsLiveFills
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
      orderId: 'order1',
      symbol: 'BTC',
      side: 'buy',
      orderType: 'Limit',
      detailedOrderType: 'Market',
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
      refetch: jest.fn().mockResolvedValue(mockUserHistory),
    });

    // Mock live fills hook (returns empty by default, tests can override)
    mockUsePerpsLiveFills.mockReturnValue({
      fills: [],
      isInitialLoading: false,
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
    it('returns initial state correctly', async () => {
      // Override transform mock to return empty for initial state test
      mockTransformFillsToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      // Initial state: no WebSocket fills, no REST data yet
      expect(result.current.transactions).toEqual([]);
      // Initial loading state is false, becomes true when fetch starts
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');

      // Wait for initial fetch to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    });

    it('skips initial fetch when skipInitialFetch is true', () => {
      // Override transform mock to return empty for initial state test
      mockTransformFillsToTransactions.mockReturnValue([]);

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
      // startTime default is handled in HyperLiquidProvider, not here
      expect(mockProvider.getFunding).toHaveBeenCalledWith({
        accountId: undefined,
        startTime: undefined,
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

      // Verify accountId is passed to all provider methods
      expect(mockProvider.getOrderFills).toHaveBeenCalledWith({
        accountId: 'eip155:1:0x1234567890123456789012345678901234567890',
        aggregateByTime: false,
      });
      expect(mockProvider.getOrders).toHaveBeenCalledWith({
        accountId: 'eip155:1:0x1234567890123456789012345678901234567890',
      });
      expect(mockProvider.getFunding).toHaveBeenCalledWith({
        accountId: 'eip155:1:0x1234567890123456789012345678901234567890',
        startTime: 1640995200000,
        endTime: 1640995300000,
      });
    });

    it('passes accountId to useUserHistory hook', async () => {
      const accountId =
        'eip155:42161:0x1234567890123456789012345678901234567890' as CaipAccountId;

      renderHook(() =>
        usePerpsTransactionHistory({
          accountId,
        }),
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Verify useUserHistory was called with accountId
      expect(mockUseUserHistory).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: undefined,
        accountId,
      });
    });

    it('handles undefined accountId correctly', async () => {
      renderHook(() => usePerpsTransactionHistory({ accountId: undefined }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Verify all methods are called with undefined accountId
      expect(mockProvider.getOrderFills).toHaveBeenCalledWith({
        accountId: undefined,
        aggregateByTime: false,
      });
      expect(mockProvider.getOrders).toHaveBeenCalledWith({
        accountId: undefined,
      });
      // startTime default is handled in HyperLiquidProvider, not here
      expect(mockProvider.getFunding).toHaveBeenCalledWith({
        accountId: undefined,
        startTime: undefined,
        endTime: undefined,
      });
      expect(mockUseUserHistory).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: undefined,
        accountId: undefined,
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

      // Use mockImplementation to return transactions only for non-empty fills
      // Empty fills (from WebSocket) should return empty array
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? mockTransactions : [],
      );

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
      // WebSocket fills are empty for this test
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      // No live fills means transform returns empty
      mockTransformFillsToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('PerpsController not available');
      expect(result.current.transactions).toEqual([]);
    });

    it('handles no active provider', async () => {
      mockController.getActiveProvider.mockReturnValue(undefined);
      // WebSocket fills are empty for this test
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      // No live fills means transform returns empty
      mockTransformFillsToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('No active provider available');
      // With no REST data and no WebSocket data, transactions should be empty
      expect(result.current.transactions).toEqual([]);
    });

    it('handles provider fetch errors', async () => {
      mockProvider.getOrderFills.mockRejectedValue(new Error('Fetch error'));
      // WebSocket fills are empty for this test
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      // No live fills means transform returns empty
      mockTransformFillsToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Fetch error');
      // With no WebSocket data, transactions should be empty
      expect(result.current.transactions).toEqual([]);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Error fetching transaction history:',
        'Fetch error',
      );
    });

    it('handles non-Error exceptions', async () => {
      mockProvider.getOrderFills.mockRejectedValue('String error');
      // WebSocket fills are empty for this test
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      // No live fills means transform returns empty
      mockTransformFillsToTransactions.mockReturnValue([]);

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
        expect.objectContaining({
          total: expect.any(Number),
          displayed: expect.any(Number),
        }),
      );
    });
  });

  describe('fill enrichment with detailedOrderType', () => {
    it('enriches fills with detailedOrderType when matching order exists', async () => {
      const fillsWithoutDetailedType = [
        {
          direction: 'Open Long',
          orderId: 'order-123',
          symbol: 'ETH',
          size: '1',
          price: '2000',
          fee: '10',
          timestamp: 1640995200000,
          feeToken: 'USDC',
          pnl: '0',
          liquidation: false,
        },
      ];

      const ordersWithDetailedType = [
        {
          orderId: 'order-123',
          symbol: 'ETH',
          side: 'buy',
          orderType: 'Limit',
          detailedOrderType: 'Take Profit',
          size: '1',
          originalSize: '1',
          price: '2000',
          status: 'filled',
          timestamp: 1640995200000,
        },
      ];

      mockProvider.getOrderFills.mockResolvedValue(fillsWithoutDetailedType);
      mockProvider.getOrders.mockResolvedValue(ordersWithDetailedType);

      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([
        {
          ...fillsWithoutDetailedType[0],
          detailedOrderType: 'Take Profit',
        },
      ]);
    });

    it('leaves detailedOrderType as undefined when no matching order exists', async () => {
      const fillsWithoutMatch = [
        {
          direction: 'Open Long',
          orderId: 'fill-order-456',
          symbol: 'ETH',
          size: '1',
          price: '2000',
          fee: '10',
          timestamp: 1640995200000,
          feeToken: 'USDC',
          pnl: '0',
          liquidation: false,
        },
      ];

      const unrelatedOrders = [
        {
          orderId: 'different-order-789',
          symbol: 'BTC',
          side: 'sell',
          orderType: 'Market',
          detailedOrderType: 'Stop Loss',
          size: '0.5',
          originalSize: '0.5',
          price: '50000',
          status: 'filled',
          timestamp: 1640995201000,
        },
      ];

      mockProvider.getOrderFills.mockResolvedValue(fillsWithoutMatch);
      mockProvider.getOrders.mockResolvedValue(unrelatedOrders);

      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([
        {
          ...fillsWithoutMatch[0],
          detailedOrderType: undefined,
        },
      ]);
    });

    it('leaves detailedOrderType as undefined when matching order has no detailedOrderType', async () => {
      const fills = [
        {
          direction: 'Open Short',
          orderId: 'order-999',
          symbol: 'BTC',
          size: '0.5',
          price: '45000',
          fee: '5',
          timestamp: 1640995300000,
          feeToken: 'USDC',
          pnl: '0',
          liquidation: false,
        },
      ];

      const ordersWithoutDetailedType = [
        {
          orderId: 'order-999',
          symbol: 'BTC',
          side: 'sell',
          orderType: 'Market',
          size: '0.5',
          originalSize: '0.5',
          price: '45000',
          status: 'filled',
          timestamp: 1640995300000,
        },
      ];

      mockProvider.getOrderFills.mockResolvedValue(fills);
      mockProvider.getOrders.mockResolvedValue(ordersWithoutDetailedType);

      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([
        {
          ...fills[0],
          detailedOrderType: undefined,
        },
      ]);
    });

    it('enriches all fills from same order with matching detailedOrderType when order has multiple partial fills', async () => {
      const partialFills = [
        {
          direction: 'Open Long',
          orderId: 'partial-order-123',
          symbol: 'ETH',
          size: '0.5',
          price: '2000',
          fee: '5',
          timestamp: 1640995200000,
          feeToken: 'USDC',
          pnl: '0',
          liquidation: false,
        },
        {
          direction: 'Open Long',
          orderId: 'partial-order-123',
          symbol: 'ETH',
          size: '0.3',
          price: '2001',
          fee: '3',
          timestamp: 1640995201000,
          feeToken: 'USDC',
          pnl: '0',
          liquidation: false,
        },
        {
          direction: 'Open Long',
          orderId: 'partial-order-123',
          symbol: 'ETH',
          size: '0.2',
          price: '2002',
          fee: '2',
          timestamp: 1640995202000,
          feeToken: 'USDC',
          pnl: '0',
          liquidation: false,
        },
      ];

      const singleOrder = [
        {
          orderId: 'partial-order-123',
          symbol: 'ETH',
          side: 'buy',
          orderType: 'Limit',
          detailedOrderType: 'Stop Loss',
          size: '1',
          originalSize: '1',
          price: '2000',
          status: 'filled',
          timestamp: 1640995200000,
        },
      ];

      mockProvider.getOrderFills.mockResolvedValue(partialFills);
      mockProvider.getOrders.mockResolvedValue(singleOrder);

      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([
        { ...partialFills[0], detailedOrderType: 'Stop Loss' },
        { ...partialFills[1], detailedOrderType: 'Stop Loss' },
        { ...partialFills[2], detailedOrderType: 'Stop Loss' },
      ]);
    });

    it('handles empty fills array', async () => {
      mockProvider.getOrderFills.mockResolvedValue([]);
      mockProvider.getOrders.mockResolvedValue(mockOrders);

      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([]);
    });

    it('handles empty orders array', async () => {
      mockProvider.getOrderFills.mockResolvedValue(mockFills);
      mockProvider.getOrders.mockResolvedValue([]);

      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([
        { ...mockFills[0], detailedOrderType: undefined },
      ]);
    });
  });

  describe('loadMore functionality', () => {
    // Helper to create multiple mock transactions with unique assets to avoid dedup
    const createMockTransactions = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `tx-${i}`,
        type: 'trade' as const,
        category: 'position_open' as const,
        title: `Trade ${i}`,
        subtitle: `${i} ETH`,
        timestamp: 1640995200000 - i * 1000, // Descending timestamps
        asset: `ETH-${i}`, // Unique asset per transaction to avoid dedup in mergedTransactions
      }));

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns isLoadingMore as false initially', async () => {
      mockTransformFillsToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      expect(result.current.isLoadingMore).toBe(false);
    });

    it('returns hasMore as true when more transactions exist beyond PAGE_SIZE', async () => {
      // Create more transactions than PAGE_SIZE (50)
      const manyTransactions = createMockTransactions(75);
      // Return empty for live fills (empty array input), manyTransactions for REST fills
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
      expect(result.current.transactions.length).toBe(50); // PAGE_SIZE
    });

    it('returns hasMore as false when transactions fit within PAGE_SIZE', async () => {
      // Create fewer transactions than PAGE_SIZE
      const fewTransactions = createMockTransactions(25);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? fewTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
      expect(result.current.transactions.length).toBe(25);
    });

    it('loads next page of transactions when loadMore is called', async () => {
      // Create 75 transactions (more than PAGE_SIZE of 50)
      const manyTransactions = createMockTransactions(75);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      // Wait for initial fetch to complete
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initially should have PAGE_SIZE transactions
      expect(result.current.transactions.length).toBe(50);
      expect(result.current.hasMore).toBe(true);

      // Load more - must advance timers for the setTimeout in loadMore
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      // After loadMore, should have all 75 transactions
      expect(result.current.transactions.length).toBe(75);
      expect(result.current.hasMore).toBe(false);
    });

    it('does not load more when isLoadingMore is true', async () => {
      const manyTransactions = createMockTransactions(100);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Call loadMore twice rapidly - the second call should be blocked
      await act(async () => {
        const loadMorePromise1 = result.current.loadMore();
        // Second call should return early because isLoadingMore is true
        const loadMorePromise2 = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise1;
        await loadMorePromise2;
      });

      // Should only have loaded one additional page (50 + 50 = 100)
      // Second concurrent call was blocked by isLoadingMore check
      expect(result.current.transactions.length).toBe(100);
    });

    it('does not load more when hasMore is false', async () => {
      // Create exactly PAGE_SIZE transactions
      const exactTransactions = createMockTransactions(50);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? exactTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      const transactionsBeforeLoadMore = result.current.transactions.length;

      // loadMore should return early when hasMore is false
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      // Should not have changed - loadMore returned early
      expect(result.current.transactions.length).toBe(
        transactionsBeforeLoadMore,
      );
    });

    it('sets isLoadingMore to true during loading and false after', async () => {
      const manyTransactions = createMockTransactions(100);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoadingMore).toBe(false);

      // Start loadMore and check isLoadingMore is true during loading
      let loadMorePromise: Promise<void>;
      await act(async () => {
        loadMorePromise = result.current.loadMore();
      });

      // During the setTimeout, isLoadingMore should be true
      expect(result.current.isLoadingMore).toBe(true);

      // Advance timers and complete loadMore
      await act(async () => {
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      // After completion, isLoadingMore should be false
      expect(result.current.isLoadingMore).toBe(false);
    });

    it('loads multiple pages correctly', async () => {
      // Create 150 transactions (needs 3 pages of 50 each)
      const manyTransactions = createMockTransactions(150);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.transactions.length).toBe(50);
      expect(result.current.hasMore).toBe(true);

      // Load second page
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(result.current.transactions.length).toBe(100);
      expect(result.current.hasMore).toBe(true);

      // Load third page
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(result.current.transactions.length).toBe(150);
      expect(result.current.hasMore).toBe(false);
    });

    it('logs loading information when loadMore is called', async () => {
      const manyTransactions = createMockTransactions(75);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      jest.clearAllMocks();

      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Loading more transactions (client-side):',
        expect.objectContaining({
          previousCount: 50,
          newCount: 75,
          totalAvailable: 75,
        }),
      );
    });

    it('resets pagination state on refetch', async () => {
      const manyTransactions = createMockTransactions(100);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Load more to display all 100
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(result.current.transactions.length).toBe(100);
      expect(result.current.hasMore).toBe(false);

      // Refetch should reset pagination
      await act(async () => {
        const refetchPromise = result.current.refetch();
        await jest.runAllTimersAsync();
        await refetchPromise;
      });

      // After refetch, should be back to PAGE_SIZE
      expect(result.current.transactions.length).toBe(50);
      expect(result.current.hasMore).toBe(true);
    });

    it('updates displayedCountRef correctly after loadMore', async () => {
      // Create 75 transactions to test displayedCount tracking
      const manyTransactions = createMockTransactions(75);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First 50 displayed
      expect(result.current.transactions.length).toBe(50);

      // Load more should update displayedCount and show 75
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(result.current.transactions.length).toBe(75);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoadingMore).toBe(false);
    });

    it('slices transactions correctly from allFetchedTransactionsRef', async () => {
      // Create exactly 120 transactions (needs PAGE_SIZE slices of 50, 50, 20)
      const manyTransactions = createMockTransactions(120);
      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initial: 50 transactions
      expect(result.current.transactions.length).toBe(50);
      expect(result.current.hasMore).toBe(true);

      // First loadMore: 50 + 50 = 100 transactions
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(result.current.transactions.length).toBe(100);
      expect(result.current.hasMore).toBe(true);

      // Second loadMore: 100 + 20 = 120 transactions (all remaining)
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(result.current.transactions.length).toBe(120);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('merged transactions with live WebSocket fills', () => {
    it('returns only live fills when no REST transactions exist yet', async () => {
      const liveFillsData = [
        {
          direction: 'Open Long',
          orderId: 'live-order-1',
          symbol: 'ETH',
          side: 'buy',
          size: '1',
          price: '2500',
          fee: '5',
          timestamp: 1640995300000,
          feeToken: 'USDC',
          pnl: '0',
        },
      ];

      const liveTransactions = [
        {
          id: 'live-fill-0',
          type: 'trade' as const,
          category: 'position_open' as const,
          title: 'Opened long',
          subtitle: '1 ETH',
          timestamp: 1640995300000,
          asset: 'ETH',
        },
      ];

      mockUsePerpsLiveFills.mockReturnValue({
        fills: liveFillsData,
        isInitialLoading: false,
      });

      // Live fills transform returns liveTransactions
      mockTransformFillsToTransactions.mockImplementation((fills) => {
        if (fills === liveFillsData) {
          return liveTransactions;
        }
        return [];
      });

      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() =>
        usePerpsTransactionHistory({ skipInitialFetch: true }),
      );

      expect(result.current.transactions).toEqual(liveTransactions);
    });

    it('deduplicates trades using asset+timestamp instead of tx.id', async () => {
      const liveFillsData = [
        {
          direction: 'Open Long',
          orderId: 'order-1',
          symbol: 'ETH',
          side: 'buy',
          size: '1',
          price: '2500',
          fee: '5',
          timestamp: 1640995300000,
          feeToken: 'USDC',
          pnl: '0',
        },
      ];

      // Same trade from WebSocket (different ID due to array index)
      const liveTransaction = {
        id: 'fill-0', // Different ID from REST
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'Opened long (live)',
        subtitle: '1 ETH',
        timestamp: 1640995300000, // Same timestamp
        asset: 'ETH', // Same asset
      };

      // Same trade from REST (different ID due to array index)
      const restTransaction = {
        id: 'fill-5', // Different ID from WebSocket
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'Opened long (rest)',
        subtitle: '1 ETH',
        timestamp: 1640995300000, // Same timestamp
        asset: 'ETH', // Same asset
      };

      mockUsePerpsLiveFills.mockReturnValue({
        fills: liveFillsData,
        isInitialLoading: false,
      });

      // Track which call is for live vs REST fills
      let callCount = 0;
      mockTransformFillsToTransactions.mockImplementation(() => {
        callCount++;
        // First call during initial fetch returns REST transaction
        // Second call for live fills returns live transaction
        if (callCount === 1) {
          return [restTransaction];
        }
        return [liveTransaction];
      });

      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should deduplicate based on asset+timestamp, keeping the live version
      expect(result.current.transactions.length).toBe(1);
      // Live data overwrites REST data
      expect(result.current.transactions[0].title).toBe('Opened long (live)');
    });

    it('keeps non-trade transactions separate from trade deduplication', async () => {
      const fundingTransaction = {
        id: 'funding-1',
        type: 'funding' as const,
        category: 'funding_fee' as const,
        title: 'Funding fee',
        subtitle: '+$1.50',
        timestamp: 1640995300000,
        asset: 'ETH',
      };

      const depositTransaction = {
        id: 'deposit-1',
        type: 'deposit' as const,
        category: 'deposit' as const,
        title: 'Deposit',
        subtitle: '100 USDC',
        timestamp: 1640995200000,
        asset: 'USDC',
      };

      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });

      mockTransformFillsToTransactions.mockReturnValue([]);
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([fundingTransaction]);
      mockTransformUserHistoryToTransactions.mockReturnValue([
        depositTransaction,
      ]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Both non-trade transactions should be present
      expect(result.current.transactions.length).toBe(2);
      expect(result.current.transactions.map((t) => t.type)).toContain(
        'funding',
      );
      expect(result.current.transactions.map((t) => t.type)).toContain(
        'deposit',
      );
    });

    it('sorts merged transactions by timestamp descending', async () => {
      const liveFillsData = [
        {
          direction: 'Open Long',
          orderId: 'order-new',
          symbol: 'BTC',
          side: 'buy',
          size: '0.5',
          price: '50000',
          fee: '10',
          timestamp: 1640995400000, // Newest
          feeToken: 'USDC',
          pnl: '0',
        },
      ];

      // REST fills from provider.getOrderFills
      const restFillsData = [
        {
          direction: 'Open Long',
          orderId: 'order-old',
          symbol: 'ETH',
          side: 'buy',
          size: '1',
          price: '2000',
          fee: '5',
          timestamp: 1640995200000, // Older
          feeToken: 'USDC',
          pnl: '0',
        },
      ];

      const liveTransaction = {
        id: 'live-fill-0',
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'New live trade',
        subtitle: '0.5 BTC',
        timestamp: 1640995400000,
        asset: 'BTC',
      };

      const restTransaction = {
        id: 'rest-fill-0',
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'Old REST trade',
        subtitle: '1 ETH',
        timestamp: 1640995200000, // Older
        asset: 'ETH',
      };

      // Mock provider to return REST fills
      mockProvider.getOrderFills.mockResolvedValue(restFillsData);

      mockUsePerpsLiveFills.mockReturnValue({
        fills: liveFillsData,
        isInitialLoading: false,
      });

      // Use input-based mocking: check the input to determine output
      mockTransformFillsToTransactions.mockImplementation((fills) => {
        // Empty fills = return empty (shouldn't happen in this test)
        if (fills.length === 0) return [];
        // Check if it's live fills (symbol: BTC) or REST fills (symbol: ETH)
        const firstFill = fills[0];
        if (firstFill.symbol === 'BTC') {
          return [liveTransaction];
        }
        return [restTransaction];
      });

      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have 2 transactions (different assets, so no dedup)
      expect(result.current.transactions.length).toBe(2);
      // Sorted by timestamp descending
      expect(result.current.transactions[0].timestamp).toBe(1640995400000);
      expect(result.current.transactions[1].timestamp).toBe(1640995200000);
    });

    it('merges live fills with paginated REST transactions correctly', async () => {
      // Create 60 REST transactions
      const restTransactions = Array.from({ length: 60 }, (_, i) => ({
        id: `rest-${i}`,
        type: 'trade' as const,
        category: 'position_open' as const,
        title: `REST Trade ${i}`,
        subtitle: `${i} ETH`,
        timestamp: 1640995200000 - i * 1000,
        asset: `ASSET-${i}`, // Different assets to avoid dedup
      }));

      const liveFillsData = [
        {
          direction: 'Open Long',
          orderId: 'live-order',
          symbol: 'NEW',
          side: 'buy',
          size: '1',
          price: '100',
          fee: '1',
          timestamp: 1640995500000, // Newest
          feeToken: 'USDC',
          pnl: '0',
        },
      ];

      const liveTransaction = {
        id: 'live-0',
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'Live Trade',
        subtitle: '1 NEW',
        timestamp: 1640995500000,
        asset: 'NEW',
      };

      mockUsePerpsLiveFills.mockReturnValue({
        fills: liveFillsData,
        isInitialLoading: false,
      });

      // Return REST transactions for non-empty REST fills, live transaction for live fills
      mockTransformFillsToTransactions.mockImplementation((fills) => {
        if (fills.length === 0) return [];
        const firstFill = fills[0];
        if (firstFill.symbol === 'NEW') {
          return [liveTransaction];
        }
        return restTransactions;
      });

      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have 50 paginated + 1 live = 51 displayed
      // But mergedTransactions includes all trades (no pagination cap in merge)
      // The live transaction should be first (newest timestamp)
      expect(result.current.transactions[0].title).toBe('Live Trade');
    });
  });

  describe('pagination edge cases', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('handles empty transaction list', async () => {
      mockTransformFillsToTransactions.mockReturnValue([]);
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.transactions).toEqual([]);
      expect(result.current.hasMore).toBe(false);

      // loadMore should not error on empty list and return early
      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('handles exactly PAGE_SIZE transactions', async () => {
      const exactTransactions = Array.from({ length: 50 }, (_, i) => ({
        id: `tx-${i}`,
        type: 'trade' as const,
        category: 'position_open' as const,
        title: `Trade ${i}`,
        subtitle: `${i} ETH`,
        timestamp: 1640995200000 - i * 1000,
        asset: `ETH-${i}`, // Unique asset to avoid dedup
      }));

      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? exactTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.transactions.length).toBe(50);
      expect(result.current.hasMore).toBe(false);
    });

    it('handles PAGE_SIZE + 1 transactions', async () => {
      const transactions = Array.from({ length: 51 }, (_, i) => ({
        id: `tx-${i}`,
        type: 'trade' as const,
        category: 'position_open' as const,
        title: `Trade ${i}`,
        subtitle: `${i} ETH`,
        timestamp: 1640995200000 - i * 1000,
        asset: `ETH-${i}`, // Unique asset to avoid dedup
      }));

      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? transactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.transactions.length).toBe(50);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        const loadMorePromise = result.current.loadMore();
        await jest.runAllTimersAsync();
        await loadMorePromise;
      });

      expect(result.current.transactions.length).toBe(51);
      expect(result.current.hasMore).toBe(false);
    });
  });
});
