import { renderHook, act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { useDepositRequests } from './useDepositRequests';
import { usePerpsSelector } from './usePerpsSelector';

// Mock dependencies
jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('./usePerpsSelector');

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;

describe('useDepositRequests', () => {
  let mockController: {
    getActiveProvider: jest.MockedFunction<() => unknown>;
  };
  let mockProvider: {
    getUserNonFundingLedgerUpdates: jest.MockedFunction<
      (...args: unknown[]) => Promise<unknown>
    >;
  };

  const mockPendingDeposits = [
    {
      id: 'pending1',
      timestamp: 1640995200000,
      amount: '100',
      asset: 'USDC',
      status: 'pending' as const,
      txHash: undefined,
      source: 'arbitrum',
      depositId: 'deposit1',
    },
    {
      id: 'bridging1',
      timestamp: 1640995201000,
      amount: '200',
      asset: 'USDC',
      status: 'bridging' as const,
      txHash: '0x123',
      source: 'ethereum',
      depositId: 'deposit2',
    },
  ];

  const mockLedgerUpdates = [
    {
      delta: {
        coin: 'USDC',
        usdc: '500',
        type: 'deposit',
        fee: '5',
        nonce: 123,
      },
      hash: '0x456',
      time: 1640995202000,
    },
    {
      delta: {
        coin: 'USDC',
        usdc: '0',
        type: 'deposit',
        fee: '0',
        nonce: 124,
      },
      hash: '0x789',
      time: 1640995203000,
    },
    {
      delta: {
        coin: 'USDC',
        usdc: '100',
        type: 'withdrawal',
        fee: '1',
        nonce: 125,
      },
      hash: '0xabc',
      time: 1640995204000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock provider
    mockProvider = {
      getUserNonFundingLedgerUpdates: jest
        .fn()
        .mockResolvedValue(mockLedgerUpdates),
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

    // Mock usePerpsSelector
    mockUsePerpsSelector.mockReturnValue(mockPendingDeposits);
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useDepositRequests());

      expect(result.current.depositRequests).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('skips initial fetch when skipInitialFetch is true', () => {
      const { result } = renderHook(() =>
        useDepositRequests({ skipInitialFetch: true }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(
        mockProvider.getUserNonFundingLedgerUpdates,
      ).not.toHaveBeenCalled();
    });
  });

  describe('fetchCompletedDeposits', () => {
    it('fetches completed deposits successfully', async () => {
      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledWith({
        startTime: expect.any(Number),
        endTime: undefined,
      });
      expect(result.current.depositRequests).toHaveLength(1); // Only completed with actual amount
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('uses provided startTime', async () => {
      const startTime = 1640995200000;
      renderHook(() => useDepositRequests({ startTime }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledWith({
        startTime,
        endTime: undefined,
      });
    });

    it('uses start of today when no startTime provided', async () => {
      renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const expectedStartTime = new Date();
      expectedStartTime.setHours(0, 0, 0, 0);

      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledWith({
        startTime: expectedStartTime.getTime(),
        endTime: undefined,
      });
    });

    it('filters only deposit transactions', async () => {
      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should only include deposits, not withdrawals
      expect(result.current.depositRequests).toHaveLength(1);
      expect(result.current.depositRequests[0].amount).toBe('500');
    });

    it('transforms ledger updates to deposit requests', async () => {
      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const deposit = result.current.depositRequests[0];
      expect(deposit.id).toBe('deposit-0x456');
      expect(deposit.timestamp).toBe(1640995202000);
      expect(deposit.amount).toBe('500');
      expect(deposit.asset).toBe('USDC');
      expect(deposit.txHash).toBe('0x456');
      expect(deposit.status).toBe('completed');
      expect(deposit.depositId).toBe('123');
    });

    it('handles PerpsController not available', async () => {
      (
        mockEngine.context as unknown as { PerpsController: unknown }
      ).PerpsController = undefined;

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('PerpsController not available');
      expect(result.current.depositRequests).toEqual([]);
    });

    it('handles no active provider', async () => {
      mockController.getActiveProvider.mockReturnValue(undefined);

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('No active provider available');
      expect(result.current.depositRequests).toEqual([]);
    });

    it('handles provider without getUserNonFundingLedgerUpdates method', async () => {
      mockProvider = {} as unknown as typeof mockProvider;
      mockController.getActiveProvider.mockReturnValue(mockProvider);

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe(
        'Provider does not support non-funding ledger updates',
      );
      expect(result.current.depositRequests).toEqual([]);
    });

    it('handles provider fetch errors', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockRejectedValue(
        new Error('Provider error'),
      );

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Provider error');
      expect(result.current.depositRequests).toEqual([]);
    });

    it('handles non-Error exceptions', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockRejectedValue(
        'String error',
      );

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Failed to fetch completed deposits');
      expect(result.current.depositRequests).toEqual([]);
    });
  });

  describe('deposit filtering and combining', () => {
    it('combines pending and completed deposits', async () => {
      mockUsePerpsSelector.mockReturnValue(mockPendingDeposits);

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should include completed deposits with actual amounts
      expect(result.current.depositRequests).toHaveLength(1);
      expect(result.current.depositRequests[0].status).toBe('completed');
      expect(result.current.depositRequests[0].amount).toBe('500');
    });

    it('filters out deposits with zero amounts', async () => {
      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should not include the deposit with amount '0'
      expect(result.current.depositRequests).toHaveLength(1);
      expect(result.current.depositRequests[0].amount).toBe('500');
    });

    it('filters out deposits with zero string amounts', async () => {
      const zeroAmountLedgerUpdates = [
        {
          delta: {
            coin: 'USDC',
            usdc: '0.00',
            type: 'deposit',
            fee: '0',
            nonce: 123,
          },
          hash: '0x456',
          time: 1640995202000,
        },
      ];

      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        zeroAmountLedgerUpdates,
      );

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toHaveLength(0);
    });

    it('filters out deposits without txHash', async () => {
      const noTxHashLedgerUpdates = [
        {
          delta: {
            coin: 'USDC',
            usdc: '500',
            type: 'deposit',
            fee: '5',
            nonce: 123,
          },
          hash: '',
          time: 1640995202000,
        },
      ];

      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        noTxHashLedgerUpdates,
      );

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toHaveLength(0);
    });

    it('sorts deposits by timestamp descending', async () => {
      const multipleDeposits = [
        {
          delta: {
            coin: 'USDC',
            usdc: '100',
            type: 'deposit',
            fee: '1',
            nonce: 123,
          },
          hash: '0x111',
          time: 1640995200000,
        },
        {
          delta: {
            coin: 'USDC',
            usdc: '200',
            type: 'deposit',
            fee: '2',
            nonce: 124,
          },
          hash: '0x222',
          time: 1640995202000,
        },
      ];

      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        multipleDeposits,
      );

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests[0].timestamp).toBe(1640995202000);
      expect(result.current.depositRequests[1].timestamp).toBe(1640995200000);
    });
  });

  describe('refetch functionality', () => {
    it('refetches completed deposits when refetch is called', async () => {
      const { result } = renderHook(() => useDepositRequests());

      // Initial fetch
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        1,
      );

      // Clear previous calls
      mockProvider.getUserNonFundingLedgerUpdates.mockClear();

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        1,
      );
    });

    it('refetch handles errors gracefully', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockRejectedValue(
        new Error('Refetch error'),
      );

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Refetch error');
      expect(result.current.depositRequests).toEqual([]);
    });
  });

  describe('logging', () => {
    it('logs pending deposits from controller state', () => {
      renderHook(() => useDepositRequests());

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Pending deposits from controller state:',
        expect.objectContaining({
          count: 2,
          deposits: expect.arrayContaining([
            expect.objectContaining({
              id: 'pending1',
              timestamp: expect.any(String),
              amount: '100',
              asset: 'USDC',
              status: 'pending',
            }),
          ]),
        }),
      );
    });

    it('logs final combined deposits', async () => {
      renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Final combined deposits:',
        expect.objectContaining({
          count: 1,
          deposits: expect.arrayContaining([
            expect.objectContaining({
              id: 'deposit-0x456',
              timestamp: expect.any(String),
              amount: '500',
              asset: 'USDC',
              status: 'completed',
              txHash: expect.any(String),
            }),
          ]),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty ledger updates', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([]);

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles undefined ledger updates', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles null ledger updates', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(null);

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles missing coin in ledger update', async () => {
      const ledgerUpdatesWithoutCoin = [
        {
          delta: {
            usdc: '500',
            type: 'deposit',
            fee: '5',
            nonce: 123,
          },
          hash: '0x456',
          time: 1640995202000,
        },
      ];

      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        ledgerUpdatesWithoutCoin,
      );

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toHaveLength(1);
      expect(result.current.depositRequests[0].asset).toBe('USDC'); // Default value
    });

    it('handles missing nonce in ledger update', async () => {
      const ledgerUpdatesWithoutNonce = [
        {
          delta: {
            coin: 'USDC',
            usdc: '500',
            type: 'deposit',
            fee: '5',
          },
          hash: '0x456',
          time: 1640995202000,
        },
      ];

      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        ledgerUpdatesWithoutNonce,
      );

      const { result } = renderHook(() => useDepositRequests());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toHaveLength(1);
      expect(result.current.depositRequests[0].depositId).toBeUndefined();
    });
  });
});
