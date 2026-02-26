import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useWithdrawalRequests } from './useWithdrawalRequests';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type {
  PerpsControllerState,
  UserHistoryItem,
} from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import {
  createMockInternalAccount,
  createMockUuidFromAddress,
} from '../../../../util/test/accountsControllerTestUtils';
import { useSelector } from 'react-redux';

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
      type: 'deposit',
      amount: '50',
      asset: 'USDC',
      txHash: '0xhistory3',
      status: 'completed',
      details: {
        source: 'Arbitrum',
      },
    },
  ];

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

    mockController = {
      getActiveProvider: jest.fn(),
      completeWithdrawalFromHistory: jest.fn(),
    };

    mockProvider = {
      getUserHistory: jest.fn(),
    };

    (
      mockEngine as unknown as { context: { PerpsController: unknown } }
    ).context = {
      PerpsController: mockController,
    };

    mockUsePerpsSelector.mockImplementation((selector) =>
      selector({
        withdrawalRequests: mockPendingWithdrawals,
        lastWithdrawResult: null,
      } as Partial<PerpsControllerState> as PerpsControllerState),
    );

    mockUseSelector.mockImplementation((selector) => {
      const result = selector(createMockState());
      if (typeof result === 'function') {
        return () => mockInternalAccount;
      }
      return result;
    });

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
      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

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

      expect(mockProvider.getUserHistory).not.toHaveBeenCalled();
    });

    it('stops polling when component unmounts with pending queue', async () => {
      const { unmount } = renderHookWithProvider(
        () => useWithdrawalRequests(),
        { state: createMockState() },
      );

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      unmount();

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockProvider.getUserHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('withdrawal completion detection', () => {
    it('calls completeWithdrawalFromHistory when new withdrawal is detected in history', async () => {
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
          lastCompletedWithdrawalTimestamp: lastCompletedTimestamp,
          lastCompletedWithdrawalTxHashes: ['0xalreadyKnown'],
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

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

      renderHookWithProvider(() => useWithdrawalRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        jest.advanceTimersByTime(0);
      });

      expect(
        mockController.completeWithdrawalFromHistory,
      ).not.toHaveBeenCalled();
    });

    it('matches completion after lastCompletedTimestamp', async () => {
      const lastCompletedTimestamp = 1640995200100;

      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastCompletedWithdrawalTimestamp: lastCompletedTimestamp,
          lastCompletedWithdrawalTxHashes: ['0xoldWithdrawal'],
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

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

    it('matches same-timestamp completion with different txHash', async () => {
      const sameTimestamp = 1640995200500;

      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastCompletedWithdrawalTimestamp: sameTimestamp,
          lastCompletedWithdrawalTxHashes: ['0xfirstCompletion'],
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      mockProvider.getUserHistory.mockResolvedValue([
        {
          id: 'history-1',
          timestamp: sameTimestamp,
          type: 'withdrawal',
          amount: '200',
          asset: 'USDC',
          txHash: '0xsecondCompletion',
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

      expect(mockController.completeWithdrawalFromHistory).toHaveBeenCalledWith(
        'withdrawal-1',
        {
          txHash: '0xsecondCompletion',
          amount: '200',
          timestamp: sameTimestamp,
          asset: 'USDC',
        },
      );
    });

    it('skips same-timestamp completion with same txHash', async () => {
      const sameTimestamp = 1640995200500;

      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          withdrawalRequests: mockPendingWithdrawals,
          lastCompletedWithdrawalTimestamp: sameTimestamp,
          lastCompletedWithdrawalTxHashes: ['0xalreadyMatched'],
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      mockProvider.getUserHistory.mockResolvedValue([
        {
          id: 'history-1',
          timestamp: sameTimestamp,
          type: 'withdrawal',
          amount: '100',
          asset: 'USDC',
          txHash: '0xalreadyMatched',
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

      expect(
        mockController.completeWithdrawalFromHistory,
      ).not.toHaveBeenCalled();
    });

    it('handles recovery on mount when pending queue has items', async () => {
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

      expect(
        mockController.completeWithdrawalFromHistory,
      ).not.toHaveBeenCalled();
    });

    it('sorts withdrawals by timestamp descending for display', () => {
      const unsortedWithdrawals = [
        {
          id: 'withdrawal-old',
          timestamp: 1640995100000,
          amount: '50',
          asset: 'USDC',
          accountAddress: mockAddress,
          status: 'pending' as const,
        },
        {
          id: 'withdrawal-new',
          timestamp: 1640995300000,
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

      expect(result.current.withdrawalRequests[0].id).toBe('withdrawal-new');
      expect(result.current.withdrawalRequests[1].id).toBe('withdrawal-old');
    });
  });
});
