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
      expect(result.current.ordersLoaded).toBe(false);
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

  describe('progressive rendering', () => {
    it('fetches fills and funding first, then orders in background', async () => {
      // Track the order of calls
      const callOrder: string[] = [];
      mockProvider.getOrderFills.mockImplementation(async () => {
        callOrder.push('fills');
        return mockFills;
      });
      mockProvider.getFunding.mockImplementation(async () => {
        callOrder.push('funding');
        return mockFunding;
      });
      mockProvider.getOrders.mockImplementation(async () => {
        callOrder.push('orders');
        return mockOrders;
      });

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        // Wait for Phase 1 (fills + funding)
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Phase 1 should complete first
      expect(callOrder).toContain('fills');
      expect(callOrder).toContain('funding');

      // Wait for Phase 2 (orders in background)
      await waitFor(() => {
        expect(result.current.ordersLoaded).toBe(true);
      });

      expect(callOrder).toContain('orders');
    });

    it('sets ordersLoaded to true after orders fetch completes', async () => {
      const { result } = renderHook(() => usePerpsTransactionHistory());

      // Initially ordersLoaded should be false
      expect(result.current.ordersLoaded).toBe(false);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Wait for orders to load in background
      await waitFor(() => {
        expect(result.current.ordersLoaded).toBe(true);
      });
    });

    it('sets ordersLoaded to true even when orders fetch fails', async () => {
      mockProvider.getOrders.mockRejectedValue(
        new Error('Orders fetch failed'),
      );

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Wait for orders fetch attempt to complete
      await waitFor(() => {
        expect(result.current.ordersLoaded).toBe(true);
      });

      // Error should not be set (only Phase 1 errors set the error state)
      expect(result.current.error).toBeNull();
    });

    it('passes skipCache to provider methods on refetch', async () => {
      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.ordersLoaded).toBe(true);
      });

      // Clear mocks
      mockProvider.getOrderFills.mockClear();
      mockProvider.getFunding.mockClear();
      mockProvider.getOrders.mockClear();

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Verify skipCache was passed
      expect(mockProvider.getOrderFills).toHaveBeenCalledWith(
        expect.objectContaining({ skipCache: true }),
      );
      expect(mockProvider.getFunding).toHaveBeenCalledWith(
        expect.objectContaining({ skipCache: true }),
      );
    });
  });

  describe('fetchTransactions', () => {
    it('fetches and combines all transaction data', async () => {
      renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        // Wait for the effect to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getOrderFills).toHaveBeenCalledWith({
        accountId: undefined,
        aggregateByTime: false,
        skipCache: false,
      });
      // startTime default is handled in HyperLiquidProvider, not here
      expect(mockProvider.getFunding).toHaveBeenCalledWith({
        accountId: undefined,
        startTime: undefined,
        endTime: undefined,
        skipCache: false,
      });
      // Orders are fetched in Phase 2
      await waitFor(() => {
        expect(mockProvider.getOrders).toHaveBeenCalledWith({
          accountId: undefined,
          skipCache: false,
        });
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalled();
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
        skipCache: false,
      });
      expect(mockProvider.getFunding).toHaveBeenCalledWith({
        accountId: 'eip155:1:0x1234567890123456789012345678901234567890',
        startTime: 1640995200000,
        endTime: 1640995300000,
        skipCache: false,
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
        skipCache: false,
      });
      // startTime default is handled in HyperLiquidProvider, not here
      expect(mockProvider.getFunding).toHaveBeenCalledWith({
        accountId: undefined,
        startTime: undefined,
        endTime: undefined,
        skipCache: false,
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
        'Fetching transaction history (progressive)...',
      );
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Phase 1 complete - fills + funding fetched:',
        expect.objectContaining({
          fills: expect.any(Number),
          funding: expect.any(Number),
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

      const { result } = renderHook(() => usePerpsTransactionHistory());

      // Wait for orders to load in background (Phase 2)
      await waitFor(() => {
        expect(result.current.ordersLoaded).toBe(true);
      });

      // After Phase 2, fills should be enriched
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

      const { result } = renderHook(() => usePerpsTransactionHistory());

      // Wait for orders to load
      await waitFor(() => {
        expect(result.current.ordersLoaded).toBe(true);
      });

      // After Phase 2, should be called with undefined detailedOrderType
      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([
        {
          ...fillsWithoutMatch[0],
          detailedOrderType: undefined,
        },
      ]);
    });

    it('handles empty fills array', async () => {
      mockProvider.getOrderFills.mockResolvedValue([]);
      mockProvider.getOrders.mockResolvedValue(mockOrders);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await waitFor(() => {
        expect(result.current.ordersLoaded).toBe(true);
      });

      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([]);
    });

    it('handles empty orders array', async () => {
      mockProvider.getOrderFills.mockResolvedValue(mockFills);
      mockProvider.getOrders.mockResolvedValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await waitFor(() => {
        expect(result.current.ordersLoaded).toBe(true);
      });

      // After Phase 2 with empty orders, fills should have undefined detailedOrderType
      expect(mockTransformFillsToTransactions).toHaveBeenCalledWith([
        { ...mockFills[0], detailedOrderType: undefined },
      ]);
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
  });

  describe('edge cases', () => {
    it('handles empty transaction list', async () => {
      mockTransformFillsToTransactions.mockReturnValue([]);
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.transactions).toEqual([]);
    });

    it('handles large transaction list', async () => {
      const manyTransactions = Array.from({ length: 500 }, (_, i) => ({
        id: `tx-${i}`,
        type: 'trade' as const,
        category: 'position_open' as const,
        title: `Trade ${i}`,
        subtitle: `${i} ETH`,
        timestamp: 1640995200000 - i * 1000,
        asset: `ETH-${i}`,
      }));

      mockTransformFillsToTransactions.mockImplementation((fills) =>
        fills.length > 0 ? manyTransactions : [],
      );
      mockTransformOrdersToTransactions.mockReturnValue([]);
      mockTransformFundingToTransactions.mockReturnValue([]);
      mockTransformUserHistoryToTransactions.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsTransactionHistory());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // All 500 transactions should be present (no pagination)
      expect(result.current.transactions.length).toBe(500);
    });
  });
});
