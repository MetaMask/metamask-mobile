import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useWithdrawalRequests } from './useWithdrawalRequests';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { PerpsControllerState } from '../controllers/PerpsController';
import type { RootState } from '../../../../reducers';
import {
  createMockInternalAccount,
  createMockUuidFromAddress,
} from '../../../../util/test/accountsControllerTestUtils';
import { useSelector } from 'react-redux';
import type { UserHistoryItem } from '../controllers/types';

// Mock dependencies
jest.mock('../../../../core/Engine');
jest.mock('./usePerpsSelector');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useWithdrawalRequests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockAccountId = createMockUuidFromAddress(mockAddress.toLowerCase());
  const mockInternalAccount = createMockInternalAccount(
    mockAddress.toLowerCase(),
    'Account 1',
  );

  let mockController: {
    getActiveProvider: jest.MockedFunction<() => unknown>;
    completeWithdrawalFromHistory: jest.MockedFunction<
      (
        withdrawalRequestId: string,
        completedWithdrawal: {
          txHash: string;
          amount: string;
          timestamp: number;
          asset?: string;
        },
      ) => void
    >;
  };
  let mockProvider: {
    getUserHistory: jest.MockedFunction<
      (params: unknown) => Promise<UserHistoryItem[]>
    >;
  };

  const mockPendingWithdrawals = [
    {
      id: 'withdrawal-1',
      timestamp: 1640995200000,
      amount: '100',
      asset: 'USDC',
      accountAddress: mockAddress,
      status: 'pending' as const,
      destination: '0x123',
    },
    {
      id: 'withdrawal-2',
      timestamp: 1640995201000,
      amount: '200',
      asset: 'USDC',
      accountAddress: mockAddress,
      status: 'bridging' as const,
      destination: '0x456',
      txHash: '0xabc',
    },
  ];

  // Mock user history items (same format as transaction history UI uses)
  const mockUserHistory: UserHistoryItem[] = [
    {
      id: 'history-1',
      timestamp: 1640995200000,
      type: 'withdrawal',
      amount: '100',
      asset: 'USDC',
      txHash: '0xhistory1',
      status: 'completed',
      details: {
        source: 'HyperLiquid',
        recipient: '0x123',
      },
    },
    {
      id: 'history-2',
      timestamp: 1640995201000,
      type: 'withdrawal',
      amount: '200',
      asset: 'USDC',
      txHash: '0xhistory2',
      status: 'completed',
      details: {
        source: 'HyperLiquid',
        recipient: '0x456',
      },
    },
    {
      id: 'history-3',
      timestamp: 1640995202000,
      type: 'deposit', // Not a withdrawal
      amount: '50',
      asset: 'USDC',
      txHash: '0xhistory3',
      status: 'completed',
      details: {
        source: 'Arbitrum',
      },
    },
  ];

  // Helper to create mock Redux state with account
  const createMockState = () =>
    ({
      engine: {
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              selectedAccountGroup: 'keyring:wallet1/1',
              wallets: {
                'keyring:wallet1': {
                  id: 'keyring:wallet1',
                  name: 'Wallet 1',
                  type: 'hd',
                  groups: [
                    {
                      id: 'keyring:wallet1/1',
                      name: 'Account 1',
                      accounts: [mockAccountId],
                    },
                  ],
                },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                [mockAccountId]: mockInternalAccount,
              },
              selectedAccount: mockAccountId,
            },
          },
        },
      },
    }) as unknown as RootState;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    jest.useFakeTimers();

    // Mock controller
    mockController = {
      getActiveProvider: jest.fn(),
      completeWithdrawalFromHistory: jest.fn(),
    };

    // Mock provider with getUserHistory (same API as transaction history UI)
    mockProvider = {
      getUserHistory: jest.fn(),
    };

    // Mock Engine
    (
      mockEngine as unknown as { context: { PerpsController: unknown } }
    ).context = {
      PerpsController: mockController,
    };

    // Mock usePerpsSelector - default to pending withdrawals in queue
    mockUsePerpsSelector.mockImplementation((selector) =>
      selector({
        withdrawalRequests: mockPendingWithdrawals,
        lastWithdrawResult: null,
      } as Partial<PerpsControllerState> as PerpsControllerState),
    );

    // Mock useSelector to return the mock account
    mockUseSelector.mockImplementation((selector) => {
      const result = selector(createMockState());
      if (typeof result === 'function') {
        return () => mockInternalAccount;
      }
      return result;
    });

    // Mock provider methods
    mockController.getActiveProvider.mockReturnValue(mockProvider);
    mockProvider.getUserHistory.mockResolvedValue(mockUserHistory);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns pending withdrawals from controller state', () => {
      const { result } = renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

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
      expect(typeof result.current.refetch).toBe('function');
    });

    it('skips initial fetch when skipInitialFetch is true', () => {
      const { result } = renderHookWithProvider(
        () => useWithdrawalRequests({ skipInitialFetch: true }),
        { state: createMockState() },
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockProvider.getUserHistory).not.toHaveBeenCalled();
    });
  });

  describe('polling behavior', () => {
    it('polls when pending queue has withdrawals', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Initial call
      expect(mockProvider.getUserHistory).toHaveBeenCalledTimes(1);

      // Advance timer to trigger polling (5 second interval)
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should have been called again for polling
      expect(mockProvider.getUserHistory).toHaveBeenCalledTimes(2);
    });

    it('does not poll when pending queue is empty', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: [],
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Should not call getUserHistory when queue is empty
      expect(mockProvider.getUserHistory).not.toHaveBeenCalled();
    });

    it('stops polling when component unmounts with pending queue', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      const { unmount } = renderHookWithProvider(
        () => useWithdrawalRequests(),
        { state: createMockState() },
      );

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      unmount();

      // Advance timer after unmount
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should still only be called once (initial call)
      expect(mockProvider.getUserHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('withdrawal completion detection', () => {
    it('calls completeWithdrawalFromHistory when new withdrawal is detected in history', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      // Mock history returns a completed withdrawal
      mockProvider.getUserHistory.mockResolvedValue([
        {
          id: 'history-1',
          timestamp: 1640995200500,
          type: 'withdrawal',
          amount: '100',
          asset: 'USDC',
          txHash: '0xnewWithdrawal',
          status: 'completed',
          details: { source: 'HyperLiquid' },
        },
      ]);

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Should call completeWithdrawalFromHistory with the new withdrawal data
      expect(mockController.completeWithdrawalFromHistory).toHaveBeenCalledWith(
        'withdrawal-1',
        {
          txHash: '0xnewWithdrawal',
          amount: '100',
          timestamp: 1640995200500,
          asset: 'USDC',
        },
      );
    });

    it('does not match completion when timestamp is not newer than lastCompletedTimestamp', async () => {
      const lastCompletedTimestamp = 1640995205000;

      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: {
            success: true,
            txHash: '0xalreadyKnown',
            amount: '100',
            asset: 'USDC',
            timestamp: lastCompletedTimestamp,
            error: '',
          },
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      // Mock history returns a completed withdrawal older than the last completed timestamp
      mockProvider.getUserHistory.mockResolvedValue([
        {
          id: 'history-1',
          timestamp: 1640995204000,
          type: 'withdrawal',
          amount: '100',
          asset: 'USDC',
          txHash: '0xalreadyKnown',
          status: 'completed',
          details: { source: 'HyperLiquid' },
        },
      ]);

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // No match because completion is not newer than lastCompletedTimestamp
      expect(
        mockController.completeWithdrawalFromHistory,
      ).not.toHaveBeenCalled();
    });

    it('does not call completeWithdrawalFromHistory when pending queue is empty', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: [],
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      mockProvider.getUserHistory.mockResolvedValue([
        {
          id: 'history-1',
          timestamp: 1640995200000,
          type: 'withdrawal',
          amount: '100',
          asset: 'USDC',
          txHash: '0xsomeWithdrawal',
          status: 'completed',
          details: { source: 'HyperLiquid' },
        },
      ]);

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Should NOT call - no pending withdrawals
      expect(
        mockController.completeWithdrawalFromHistory,
      ).not.toHaveBeenCalled();
    });

    it('matches completion after lastCompletedTimestamp', async () => {
      const lastCompletedTimestamp = 1640995200100;

      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: {
            success: true,
            txHash: '0xoldWithdrawal',
            amount: '50',
            asset: 'USDC',
            timestamp: lastCompletedTimestamp,
            error: '',
          },
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      // Mock history returns a NEW withdrawal after lastCompletedTimestamp
      mockProvider.getUserHistory.mockResolvedValue([
        {
          id: 'history-1',
          timestamp: 1640995200200,
          type: 'withdrawal',
          amount: '100',
          asset: 'USDC',
          txHash: '0xnewWithdrawal',
          status: 'completed',
          details: { source: 'HyperLiquid' },
        },
      ]);

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Should call completeWithdrawalFromHistory with the new withdrawal
      expect(mockController.completeWithdrawalFromHistory).toHaveBeenCalledWith(
        'withdrawal-1',
        {
          txHash: '0xnewWithdrawal',
          amount: '100',
          timestamp: 1640995200200,
          asset: 'USDC',
        },
      );
    });

    it('handles recovery on mount when pending queue has items', async () => {
      // Simulates app restart with a pending withdrawal
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: [
            {
              id: 'stuck-withdrawal',
              timestamp: 1640995200000,
              amount: '100',
              asset: 'USDC',
              accountAddress: mockAddress,
              status: 'bridging' as const,
            },
          ],
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      // The withdrawal completed while app was closed
      mockProvider.getUserHistory.mockResolvedValue([
        {
          id: 'history-1',
          timestamp: 1640995250000,
          type: 'withdrawal',
          amount: '100',
          asset: 'USDC',
          txHash: '0xcompletedWhileAway',
          status: 'completed',
          details: { source: 'HyperLiquid' },
        },
      ]);

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Should detect and complete the withdrawal on mount
      expect(mockController.completeWithdrawalFromHistory).toHaveBeenCalledWith(
        'stuck-withdrawal',
        {
          txHash: '0xcompletedWhileAway',
          amount: '100',
          timestamp: 1640995250000,
          asset: 'USDC',
        },
      );
    });
  });

  describe('error handling', () => {
    it('handles provider errors gracefully', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      mockController.getActiveProvider.mockReturnValue(null);

      const { result } = renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('No active provider available');
    });

    it('handles controller errors gracefully', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      (mockEngine as unknown as { context: unknown }).context = {};

      const { result } = renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('PerpsController not available');
    });

    it('handles provider method not supported', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      const providerWithoutMethod = {};
      mockController.getActiveProvider.mockReturnValue(providerWithoutMethod);

      const { result } = renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(
        'Provider does not support user history',
      );
    });

    it('handles API errors gracefully', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      mockProvider.getUserHistory.mockRejectedValue(new Error('API Error'));

      const { result } = renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('API Error');
    });
  });

  describe('logging', () => {
    it('logs when a new withdrawal is initialized', () => {
      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'Withdrawal initialized:',
        expect.objectContaining({
          id: 'withdrawal-1',
          timestamp: expect.any(String),
          amount: '100',
          asset: 'USDC',
          status: 'pending',
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty pending withdrawals', () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: [],
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      const { result } = renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      expect(result.current.withdrawalRequests).toEqual([]);
    });

    it('handles no completed withdrawals in history', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      // Only deposits in history, no withdrawals
      mockProvider.getUserHistory.mockResolvedValue([
        {
          id: 'history-1',
          timestamp: 1640995200000,
          type: 'deposit',
          amount: '100',
          asset: 'USDC',
          txHash: '0xdeposit',
          status: 'completed',
          details: { source: 'Arbitrum' },
        },
      ]);

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      // Should NOT call - no completed withdrawals found
      expect(
        mockController.completeWithdrawalFromHistory,
      ).not.toHaveBeenCalled();
    });

    it('sorts withdrawals by timestamp descending', () => {
      const unsortedWithdrawals = [
        {
          id: 'withdrawal-old',
          timestamp: 1640995100000, // older
          amount: '50',
          asset: 'USDC',
          accountAddress: mockAddress,
          status: 'pending' as const,
        },
        {
          id: 'withdrawal-new',
          timestamp: 1640995300000, // newer
          amount: '150',
          asset: 'USDC',
          accountAddress: mockAddress,
          status: 'pending' as const,
        },
      ];

      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: unsortedWithdrawals,
          lastWithdrawResult: null,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      const { result } = renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      // Should be sorted newest first
      expect(result.current.withdrawalRequests[0].id).toBe('withdrawal-new');
      expect(result.current.withdrawalRequests[1].id).toBe('withdrawal-old');
    });
  });
});
