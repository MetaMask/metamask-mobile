import { renderHook, act } from '@testing-library/react-native';
import { useWithdrawalRequests } from './useWithdrawalRequests';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

// Mock dependencies
jest.mock('../../../../core/Engine');
jest.mock('./usePerpsSelector');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('useWithdrawalRequests', () => {
  let mockController: {
    getActiveProvider: jest.MockedFunction<() => unknown>;
    updateWithdrawalStatus: jest.MockedFunction<
      (id: string, status: string, txHash?: string) => void
    >;
  };
  let mockProvider: {
    getUserNonFundingLedgerUpdates: jest.MockedFunction<
      (params: unknown) => Promise<unknown[]>
    >;
  };

  const mockPendingWithdrawals = [
    {
      id: 'withdrawal-1',
      timestamp: 1640995200000,
      amount: '100',
      asset: 'USDC',
      status: 'pending' as const,
      destination: '0x123',
    },
    {
      id: 'withdrawal-2',
      timestamp: 1640995201000,
      amount: '200',
      asset: 'USDC',
      status: 'bridging' as const,
      destination: '0x456',
      txHash: '0xabc',
    },
  ];

  const mockLedgerUpdates = [
    {
      delta: {
        coin: 'USDC',
        usdc: '100',
        type: 'withdraw',
        fee: '1',
        nonce: 456,
      },
      hash: '0xledger1',
      time: 1640995200000,
    },
    {
      delta: {
        coin: 'USDC',
        usdc: '200',
        type: 'withdraw',
        fee: '1',
        nonce: 789,
      },
      hash: '0xledger2',
      time: 1640995201000,
    },
    {
      delta: {
        coin: 'USDC',
        usdc: '50',
        type: 'deposit', // Not a withdrawal
        fee: '1',
        nonce: 101,
      },
      hash: '0xledger3',
      time: 1640995202000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock controller
    mockController = {
      getActiveProvider: jest.fn(),
      updateWithdrawalStatus: jest.fn(),
    };

    // Mock provider
    mockProvider = {
      getUserNonFundingLedgerUpdates: jest.fn(),
    };

    // Mock Engine
    (
      mockEngine as unknown as { context: { PerpsController: unknown } }
    ).context = {
      PerpsController: mockController,
    };

    // Mock usePerpsSelector
    mockUsePerpsSelector.mockReturnValue(mockPendingWithdrawals);

    // Mock provider methods
    mockController.getActiveProvider.mockReturnValue(mockProvider);
    mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
      mockLedgerUpdates,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns initial state with pending withdrawals', () => {
      const { result } = renderHook(() => useWithdrawalRequests());

      expect(result.current.withdrawalRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'withdrawal-1',
            status: 'pending',
          }),
          expect.objectContaining({
            id: 'withdrawal-2',
            status: 'bridging',
          }),
        ]),
      );
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('skips initial fetch when skipInitialFetch is true', () => {
      const { result } = renderHook(() =>
        useWithdrawalRequests({ skipInitialFetch: true }),
      );

      expect(result.current.isLoading).toBe(false);
      expect(
        mockProvider.getUserNonFundingLedgerUpdates,
      ).not.toHaveBeenCalled();
    });

    it('uses custom startTime when provided', async () => {
      const customStartTime = 1640995000000;
      renderHook(() => useWithdrawalRequests({ startTime: customStartTime }));

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledWith({
        startTime: customStartTime,
        endTime: undefined,
      });
    });

    it('uses start of today as default startTime', async () => {
      const mockNow = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockNow);

      renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const expectedStartOfToday = new Date(
        mockNow.getFullYear(),
        mockNow.getMonth(),
        mockNow.getDate(),
      ).getTime();

      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledWith({
        startTime: expectedStartOfToday,
        endTime: undefined,
      });

      jest.restoreAllMocks();
    });
  });

  describe('fetching completed withdrawals', () => {
    it('fetches completed withdrawals successfully', async () => {
      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // The hook matches pending withdrawals with completed ones and updates their status
      // So we should see the pending withdrawals updated to completed status
      expect(result.current.withdrawalRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'withdrawal-1',
            amount: '100',
            status: 'completed',
            txHash: '0xledger1',
            withdrawalId: '456',
          }),
          expect.objectContaining({
            id: 'withdrawal-2',
            amount: '200',
            status: 'completed',
            txHash: '0xledger2',
            withdrawalId: '789',
          }),
        ]),
      );
    });

    it('handles provider errors gracefully', async () => {
      mockController.getActiveProvider.mockReturnValue(null);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('No active provider available');
    });

    it('handles controller errors gracefully', async () => {
      (mockEngine as unknown as { context: unknown }).context = {};

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('PerpsController not available');
    });

    it('handles provider method not supported', async () => {
      const providerWithoutMethod = {};
      mockController.getActiveProvider.mockReturnValue(providerWithoutMethod);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(
        'Provider does not support non-funding ledger updates',
      );
    });

    it('handles API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockProvider.getUserNonFundingLedgerUpdates.mockRejectedValue(apiError);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('API Error');
    });

    it('handles non-Error exceptions', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockRejectedValue(
        'String error',
      );

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(
        'Failed to fetch completed withdrawals',
      );
    });

    it('handles non-array updates response', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        null as unknown as unknown[],
      );

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      // Should not crash and should handle gracefully
    });
  });

  describe('withdrawal data transformation', () => {
    it('transforms ledger updates to withdrawal requests correctly', async () => {
      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;

      // The hook matches pending withdrawals with completed ones
      // So we should see the pending withdrawals updated with ledger data
      const matchedWithdrawals = withdrawalRequests.filter((w) =>
        w.txHash?.startsWith('0xledger'),
      );

      expect(matchedWithdrawals).toHaveLength(2); // Only withdrawals, not deposits

      // Array is sorted by timestamp descending, so withdrawal-2 comes first
      expect(matchedWithdrawals[0]).toEqual(
        expect.objectContaining({
          id: 'withdrawal-2', // Original pending withdrawal ID
          timestamp: 1640995201000,
          amount: '200',
          asset: 'USDC',
          txHash: '0xledger2',
          status: 'completed',
          withdrawalId: '789',
        }),
      );

      expect(matchedWithdrawals[1]).toEqual(
        expect.objectContaining({
          id: 'withdrawal-1', // Original pending withdrawal ID
          timestamp: 1640995200000,
          amount: '100',
          asset: 'USDC',
          txHash: '0xledger1',
          status: 'completed',
          withdrawalId: '456',
        }),
      );
    });

    it('handles ledger updates without coin field', async () => {
      const updatesWithoutCoin = [
        {
          delta: {
            usdc: '100',
            type: 'withdraw',
            fee: '1',
            nonce: 456,
          },
          hash: '0xledger1',
          time: 1640995200000,
        },
      ];

      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        updatesWithoutCoin as unknown as unknown[],
      );

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      // Find the withdrawal that was matched with the ledger update
      const matchedWithdrawal = withdrawalRequests.find(
        (w) => w.txHash === '0xledger1',
      );

      expect(matchedWithdrawal?.asset).toBe('USDC'); // Default to USDC
    });

    it('handles ledger updates without nonce field', async () => {
      const updatesWithoutNonce = [
        {
          delta: {
            coin: 'USDC',
            usdc: '100',
            type: 'withdraw',
            fee: '1',
          },
          hash: '0xledger1',
          time: 1640995200000,
        },
      ];

      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        updatesWithoutNonce as unknown as unknown[],
      );

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      // Find the withdrawal that was matched with the ledger update
      const matchedWithdrawal = withdrawalRequests.find(
        (w) => w.txHash === '0xledger1',
      );

      expect(matchedWithdrawal?.withdrawalId).toBeUndefined();
    });

    it('handles negative USDC amounts correctly', async () => {
      const updatesWithNegativeAmount = [
        {
          delta: {
            coin: 'USDC',
            usdc: '-100', // Negative amount
            type: 'withdraw',
            fee: '1',
            nonce: 456,
          },
          hash: '0xledger1',
          time: 1640995200000,
        },
      ];

      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(
        updatesWithNegativeAmount as unknown as unknown[],
      );

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      // Find the withdrawal that was matched with the ledger update
      const matchedWithdrawal = withdrawalRequests.find(
        (w) => w.txHash === '0xledger1',
      );

      expect(matchedWithdrawal?.amount).toBe('100'); // Should be positive
    });
  });

  describe('withdrawal matching and deduplication', () => {
    it('matches pending withdrawals with completed ones', async () => {
      // Mock pending withdrawal that matches a completed one
      const matchingPendingWithdrawal = {
        id: 'withdrawal-match',
        timestamp: 1640995200000,
        amount: '100',
        asset: 'USDC',
        status: 'pending' as const,
        destination: '0x123',
      };

      mockUsePerpsSelector.mockReturnValue([matchingPendingWithdrawal]);
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([
        {
          delta: {
            coin: 'USDC',
            usdc: '100',
            type: 'withdraw',
            fee: '1',
            nonce: 456,
          },
          hash: '0xledger1',
          time: 1640995200000,
        },
      ] as unknown as unknown[]);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      const matchedWithdrawal = withdrawalRequests.find(
        (w) => w.id === 'withdrawal-match',
      );

      expect(matchedWithdrawal).toEqual({
        id: 'withdrawal-match',
        timestamp: 1640995200000,
        amount: '100',
        asset: 'USDC',
        status: 'completed',
        destination: '0x123',
        txHash: '0xledger1',
        withdrawalId: '456',
      });

      expect(mockController.updateWithdrawalStatus).toHaveBeenCalledWith(
        'withdrawal-match',
        'completed',
        '0xledger1',
      );
    });

    it('does not match withdrawals with different amounts', async () => {
      const pendingWithdrawal = {
        id: 'withdrawal-no-match',
        timestamp: 1640995200000,
        amount: '100',
        asset: 'USDC',
        status: 'pending' as const,
        destination: '0x123',
      };

      mockUsePerpsSelector.mockReturnValue([pendingWithdrawal]);
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([
        {
          delta: {
            coin: 'USDC',
            usdc: '200', // Different amount
            type: 'withdraw',
            fee: '1',
            nonce: 456,
          },
          hash: '0xledger1',
          time: 1640995200000,
        },
      ] as unknown as unknown[]);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      const pendingWithdrawalResult = withdrawalRequests.find(
        (w) => w.id === 'withdrawal-no-match',
      );

      expect(pendingWithdrawalResult?.status).toBe('pending');
      expect(mockController.updateWithdrawalStatus).not.toHaveBeenCalled();
    });

    it('does not match withdrawals with different timestamps', async () => {
      const pendingWithdrawal = {
        id: 'withdrawal-no-match',
        timestamp: 1640995200000,
        amount: '100',
        asset: 'USDC',
        status: 'pending' as const,
        destination: '0x123',
      };

      mockUsePerpsSelector.mockReturnValue([pendingWithdrawal]);
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([
        {
          delta: {
            coin: 'USDC',
            usdc: '100',
            type: 'withdraw',
            fee: '1',
            nonce: 456,
          },
          hash: '0xledger1',
          time: 1640995200000 + 1000000, // 16+ minutes later
        },
      ] as unknown as unknown[]);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      const pendingWithdrawalResult = withdrawalRequests.find(
        (w) => w.id === 'withdrawal-no-match',
      );

      expect(pendingWithdrawalResult?.status).toBe('pending');
      expect(mockController.updateWithdrawalStatus).not.toHaveBeenCalled();
    });

    it('does not match withdrawals with different assets', async () => {
      const pendingWithdrawal = {
        id: 'withdrawal-no-match',
        timestamp: 1640995200000,
        amount: '100',
        asset: 'USDC',
        status: 'pending' as const,
        destination: '0x123',
      };

      mockUsePerpsSelector.mockReturnValue([pendingWithdrawal]);
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([
        {
          delta: {
            coin: 'ETH', // Different asset
            usdc: '100',
            type: 'withdraw',
            fee: '1',
            nonce: 456,
          },
          hash: '0xledger1',
          time: 1640995200000,
        },
      ] as unknown as unknown[]);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      const pendingWithdrawalResult = withdrawalRequests.find(
        (w) => w.id === 'withdrawal-no-match',
      );

      expect(pendingWithdrawalResult?.status).toBe('pending');
      expect(mockController.updateWithdrawalStatus).not.toHaveBeenCalled();
    });

    it('allows small amount differences for matching', async () => {
      const pendingWithdrawal = {
        id: 'withdrawal-small-diff',
        timestamp: 1640995200000,
        amount: '100.00',
        asset: 'USDC',
        status: 'pending' as const,
        destination: '0x123',
      };

      mockUsePerpsSelector.mockReturnValue([pendingWithdrawal]);
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([
        {
          delta: {
            coin: 'USDC',
            usdc: '100.005', // Small difference (0.5 cents)
            type: 'withdraw',
            fee: '1',
            nonce: 456,
          },
          hash: '0xledger1',
          time: 1640995200000,
        },
      ] as unknown as unknown[]);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      const matchedWithdrawal = withdrawalRequests.find(
        (w) => w.id === 'withdrawal-small-diff',
      );

      expect(matchedWithdrawal?.status).toBe('completed');
      expect(mockController.updateWithdrawalStatus).toHaveBeenCalled();
    });

    it('does not match completed withdrawals without txHash', async () => {
      const pendingWithdrawal = {
        id: 'withdrawal-no-txhash',
        timestamp: 1640995200000,
        amount: '100',
        asset: 'USDC',
        status: 'pending' as const,
        destination: '0x123',
      };

      mockUsePerpsSelector.mockReturnValue([pendingWithdrawal]);
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([
        {
          delta: {
            coin: 'USDC',
            usdc: '100',
            type: 'withdraw',
            fee: '1',
            nonce: 456,
          },
          hash: '', // No txHash
          time: 1640995200000,
        },
      ] as unknown as unknown[]);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      const pendingWithdrawalResult = withdrawalRequests.find(
        (w) => w.id === 'withdrawal-no-txhash',
      );

      expect(pendingWithdrawalResult?.status).toBe('pending');
      expect(mockController.updateWithdrawalStatus).not.toHaveBeenCalled();
    });
  });

  describe('sorting and ordering', () => {
    it('sorts withdrawals by timestamp descending', async () => {
      mockUsePerpsSelector.mockReturnValue([]);
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([
        {
          delta: {
            coin: 'USDC',
            usdc: '100',
            type: 'withdraw',
            fee: '1',
            nonce: 1,
          },
          hash: '0xold',
          time: 1640995200000,
        },
        {
          delta: {
            coin: 'USDC',
            usdc: '200',
            type: 'withdraw',
            fee: '1',
            nonce: 2,
          },
          hash: '0xnew',
          time: 1640995202000,
        },
      ] as unknown as unknown[]);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      const withdrawalRequests = result.current.withdrawalRequests;
      expect(withdrawalRequests[0].timestamp).toBeGreaterThan(
        withdrawalRequests[1].timestamp,
      );
    });
  });

  describe('polling behavior', () => {
    it('polls when there are active withdrawals', async () => {
      const activeWithdrawals = [
        {
          id: 'withdrawal-active',
          timestamp: 1640995200000,
          amount: '100',
          asset: 'USDC',
          status: 'pending' as const,
          destination: '0x123',
        },
      ];

      mockUsePerpsSelector.mockReturnValue(activeWithdrawals);

      renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Initial call
      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        1,
      );

      // Advance timer to trigger polling
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Should have been called again for polling
      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        2,
      );
    });

    it('does not poll when there are no active withdrawals', async () => {
      const completedWithdrawals = [
        {
          id: 'withdrawal-completed',
          timestamp: 1640995200000,
          amount: '100',
          asset: 'USDC',
          status: 'completed' as const,
          txHash: '0x123',
        },
      ];

      mockUsePerpsSelector.mockReturnValue(completedWithdrawals);

      renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Initial call
      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        1,
      );

      // Advance timer - should not poll
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Should still only be called once
      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        1,
      );
    });

    it('stops polling when component unmounts', async () => {
      const activeWithdrawals = [
        {
          id: 'withdrawal-active',
          timestamp: 1640995200000,
          amount: '100',
          asset: 'USDC',
          status: 'pending' as const,
          destination: '0x123',
        },
      ];

      mockUsePerpsSelector.mockReturnValue(activeWithdrawals);

      const { unmount } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      unmount();

      // Advance timer after unmount
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Should still only be called once (initial call)
      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('refetch functionality', () => {
    it('refetches data when refetch is called', async () => {
      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Initial call
      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        1,
      );

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Should have been called again
      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledTimes(
        2,
      );
    });

    it('handles refetch errors gracefully', async () => {
      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Mock error on refetch
      mockProvider.getUserNonFundingLedgerUpdates.mockRejectedValue(
        new Error('Refetch error'),
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Refetch error');
    });
  });

  describe('logging', () => {
    it('logs pending withdrawals from controller state', () => {
      renderHook(() => useWithdrawalRequests());

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Pending withdrawals from controller state:',
        expect.objectContaining({
          count: 2,
          withdrawals: expect.arrayContaining([
            expect.objectContaining({
              id: 'withdrawal-1',
              timestamp: expect.any(String),
              amount: '100',
              asset: 'USDC',
              status: 'pending',
            }),
          ]),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty pending withdrawals', () => {
      mockUsePerpsSelector.mockReturnValue([]);

      const { result } = renderHook(() => useWithdrawalRequests());

      expect(result.current.withdrawalRequests).toEqual([]);
    });

    it('handles empty completed withdrawals', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue([]);

      const { result } = renderHook(() => useWithdrawalRequests());

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Should return pending withdrawals sorted by timestamp descending
      const expectedWithdrawals = [...mockPendingWithdrawals].sort(
        (a, b) => b.timestamp - a.timestamp,
      );
      expect(result.current.withdrawalRequests).toEqual(expectedWithdrawals);
    });

    it('handles failed withdrawals correctly', () => {
      const failedWithdrawals = [
        {
          id: 'withdrawal-failed',
          timestamp: 1640995200000,
          amount: '100',
          asset: 'USDC',
          status: 'failed' as const,
          destination: '0x123',
        },
      ];

      mockUsePerpsSelector.mockReturnValue(failedWithdrawals);

      const { result } = renderHook(() => useWithdrawalRequests());

      const failedWithdrawal = result.current.withdrawalRequests.find(
        (w) => w.id === 'withdrawal-failed',
      );

      expect(failedWithdrawal?.status).toBe('failed');
    });

    it('handles multiple withdrawals with same timestamp', async () => {
      const sameTimestampWithdrawals = [
        {
          id: 'withdrawal-1',
          timestamp: 1640995200000,
          amount: '100',
          asset: 'USDC',
          status: 'pending' as const,
          destination: '0x123',
        },
        {
          id: 'withdrawal-2',
          timestamp: 1640995200000,
          amount: '200',
          asset: 'USDC',
          status: 'pending' as const,
          destination: '0x456',
        },
      ];

      mockUsePerpsSelector.mockReturnValue(sameTimestampWithdrawals);

      const { result } = renderHook(() => useWithdrawalRequests());

      expect(result.current.withdrawalRequests).toHaveLength(2);
      expect(result.current.withdrawalRequests[0].id).toBe('withdrawal-1');
      expect(result.current.withdrawalRequests[1].id).toBe('withdrawal-2');
    });
  });
});
