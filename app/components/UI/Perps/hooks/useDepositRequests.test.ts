import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { useDepositRequests } from './useDepositRequests';
import { usePerpsSelector } from './usePerpsSelector';
import type { PerpsControllerState } from '../controllers/PerpsController';
import type { RootState } from '../../../../reducers';
import {
  createMockInternalAccount,
  createMockUuidFromAddress,
} from '../../../../util/test/accountsControllerTestUtils';
import { useSelector } from 'react-redux';

// Mock dependencies
jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('./usePerpsSelector');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockUsePerpsSelector = usePerpsSelector as jest.MockedFunction<
  typeof usePerpsSelector
>;

describe('useDepositRequests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockAccountId = createMockUuidFromAddress(mockAddress.toLowerCase());
  const mockInternalAccount = createMockInternalAccount(
    mockAddress.toLowerCase(),
    'Account 1',
  );

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
      accountAddress: mockAddress,
      status: 'pending' as const,
      success: false,
      txHash: undefined,
      source: 'arbitrum',
      depositId: 'deposit1',
    },
    {
      id: 'bridging1',
      timestamp: 1640995201000,
      amount: '200',
      asset: 'USDC',
      accountAddress: mockAddress,
      status: 'bridging' as const,
      success: false,
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

    // Mock usePerpsSelector to execute the selector function with mock state
    mockUsePerpsSelector.mockImplementation((selector) =>
      selector({
        depositRequests: mockPendingDeposits,
      } as Partial<PerpsControllerState> as PerpsControllerState),
    );

    // Mock useSelector to return the mock account for selectSelectedInternalAccountByScope
    mockUseSelector.mockImplementation((selector) => {
      // Check if this is the selectSelectedInternalAccountByScope selector
      // It returns a function that takes a scope
      const result = selector(createMockState());
      if (typeof result === 'function') {
        // This is selectSelectedInternalAccountByScope, return the mock account
        return () => mockInternalAccount;
      }
      return result;
    });
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      expect(result.current.depositRequests).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('skips initial fetch when skipInitialFetch is true', () => {
      const { result } = renderHookWithProvider(
        () => useDepositRequests({ skipInitialFetch: true }),
        {
          state: createMockState(),
        },
      );

      expect(result.current.isLoading).toBe(false);
      expect(
        mockProvider.getUserNonFundingLedgerUpdates,
      ).not.toHaveBeenCalled();
    });
  });

  describe('fetchCompletedDeposits', () => {
    it('fetches completed deposits successfully', async () => {
      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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
      renderHookWithProvider(() => useDepositRequests({ startTime }), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockProvider.getUserNonFundingLedgerUpdates).toHaveBeenCalledWith({
        startTime,
        endTime: undefined,
      });
    });

    it('uses start of today when no startTime provided', async () => {
      renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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
      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should only include deposits, not withdrawals
      expect(result.current.depositRequests).toHaveLength(1);
      expect(result.current.depositRequests[0].amount).toBe('500');
    });

    it('transforms ledger updates to deposit requests', async () => {
      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const deposit = result.current.depositRequests[0];
      expect(deposit.id).toBe('deposit-0x456');
      expect(deposit.timestamp).toBe(1640995202000);
      expect(deposit.amount).toBe('500');
      expect(deposit.asset).toBe('USDC');
      expect(deposit.accountAddress).toBe(mockAddress);
      expect(deposit.txHash).toBe('0x456');
      expect(deposit.success).toBe(true);
      expect(deposit.status).toBe('completed');
      expect(deposit.depositId).toBe('123');
    });

    it('handles PerpsController not available', async () => {
      (
        mockEngine.context as unknown as { PerpsController: unknown }
      ).PerpsController = undefined;

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('PerpsController not available');
      expect(result.current.depositRequests).toEqual([]);
    });

    it('handles no active provider', async () => {
      mockController.getActiveProvider.mockReturnValue(undefined);

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('No active provider available');
      expect(result.current.depositRequests).toEqual([]);
    });

    it('handles provider without getUserNonFundingLedgerUpdates method', async () => {
      mockProvider = {} as unknown as typeof mockProvider;
      mockController.getActiveProvider.mockReturnValue(mockProvider);

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Failed to fetch completed deposits');
      expect(result.current.depositRequests).toEqual([]);
    });
  });

  describe('deposit filtering and combining', () => {
    it('filters deposits by current account address', () => {
      const depositsFromMultipleAccounts = [
        {
          id: 'deposit1',
          timestamp: 1640995200000,
          amount: '100',
          asset: 'USDC',
          accountAddress: mockAddress, // Current account
          status: 'pending' as const,
          success: false,
          source: 'arbitrum',
        },
        {
          id: 'deposit2',
          timestamp: 1640995201000,
          amount: '200',
          asset: 'USDC',
          accountAddress: '0xdifferentaccount000000000000000000000000', // Different account
          status: 'pending' as const,
          success: false,
          source: 'ethereum',
        },
      ];

      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          depositRequests: depositsFromMultipleAccounts,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      // Should only return deposits for the current account
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'useDepositRequests: Filtered deposits by account',
        expect.objectContaining({
          selectedAddress: mockAddress,
          totalCount: 2,
          filteredCount: 1,
        }),
      );
    });

    it('returns empty array when no selected address', () => {
      const stateWithoutAccount = {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {},
                selectedAccount: undefined,
              },
            },
          },
        },
      };

      // Override mock to return undefined for this test
      mockUseSelector.mockImplementation((selector) => {
        const result = selector(stateWithoutAccount);
        if (typeof result === 'function') {
          // This is selectSelectedInternalAccountByScope, return undefined
          return () => undefined;
        }
        return result;
      });

      renderHookWithProvider(() => useDepositRequests(), {
        state: stateWithoutAccount,
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'useDepositRequests: No selected address, returning empty array',
        expect.objectContaining({
          totalCount: 2,
        }),
      );
    });

    it('combines pending and completed deposits', async () => {
      mockUsePerpsSelector.mockImplementation((selector) =>
        selector({
          depositRequests: mockPendingDeposits,
        } as Partial<PerpsControllerState> as PerpsControllerState),
      );

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should include completed deposits with actual amounts
      expect(result.current.depositRequests).toHaveLength(1);
      expect(result.current.depositRequests[0].status).toBe('completed');
      expect(result.current.depositRequests[0].amount).toBe('500');
    });

    it('filters out deposits with zero amounts', async () => {
      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests[0].timestamp).toBe(1640995202000);
      expect(result.current.depositRequests[1].timestamp).toBe(1640995200000);
    });
  });

  describe('refetch functionality', () => {
    it('refetches completed deposits when refetch is called', async () => {
      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Refetch error');
      expect(result.current.depositRequests).toEqual([]);
    });
  });

  describe('logging', () => {
    it('logs filtered deposits by account', () => {
      renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'useDepositRequests: Filtered deposits by account',
        expect.objectContaining({
          selectedAddress: mockAddress,
          totalCount: 2,
          filteredCount: 2,
          deposits: expect.arrayContaining([
            expect.objectContaining({
              id: 'pending1',
              timestamp: expect.any(String),
              amount: '100',
              asset: 'USDC',
              status: 'pending',
              accountAddress: mockAddress,
            }),
          ]),
        }),
      );
    });

    it('logs final combined deposits', async () => {
      renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles undefined ledger updates', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(undefined);

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles null ledger updates', async () => {
      mockProvider.getUserNonFundingLedgerUpdates.mockResolvedValue(null);

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

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

      const { result } = renderHookWithProvider(() => useDepositRequests(), {
        state: createMockState(),
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.depositRequests).toHaveLength(1);
      expect(result.current.depositRequests[0].depositId).toBeUndefined();
    });
  });
});
