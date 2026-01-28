import { RootState } from '../../reducers';
import {
  selectAllWithdrawalRequests,
  selectWithdrawalRequestsBySelectedAccount,
  WithdrawalRequest,
} from './withdrawalRequests';

// Mock the multichainAccounts selector
jest.mock('../multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

import { selectSelectedInternalAccountByScope } from '../multichainAccounts/accounts';

const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;

// Helper to create a mock scope selector function
const createMockScopeSelector = (address: string | undefined) =>
  jest.fn().mockReturnValue(address ? { address } : undefined);

// Helper function to create test withdrawal requests
const createWithdrawalRequest = (
  overrides: Partial<WithdrawalRequest> = {},
): WithdrawalRequest => ({
  id: 'withdrawal-1',
  amount: '100.00',
  asset: 'USDC',
  timestamp: 1700000000000,
  status: 'pending',
  success: false,
  accountAddress: '0x1234567890abcdef1234567890abcdef12345678',
  ...overrides,
});

// Helper function to create mock root state
const createMockState = (withdrawalRequests?: WithdrawalRequest[]): RootState =>
  ({
    engine: {
      backgroundState: {
        PerpsController: withdrawalRequests
          ? { withdrawalRequests }
          : { withdrawalRequests: [] },
      },
    },
  }) as unknown as RootState;

// Helper function to create mock state without PerpsController
const createMockStateWithoutPerps = (): RootState =>
  ({
    engine: {
      backgroundState: {},
    },
  }) as unknown as RootState;

describe('Perps Withdrawal Requests Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear memoized selector caches
    selectAllWithdrawalRequests.memoizedResultFunc.clearCache?.();
    selectWithdrawalRequestsBySelectedAccount.memoizedResultFunc.clearCache?.();
  });

  describe('selectAllWithdrawalRequests', () => {
    it('returns withdrawal requests from PerpsController state', () => {
      const mockWithdrawals = [
        createWithdrawalRequest({ id: 'withdrawal-1' }),
        createWithdrawalRequest({ id: 'withdrawal-2', amount: '200.00' }),
      ];
      const mockState = createMockState(mockWithdrawals);

      const result = selectAllWithdrawalRequests(mockState);

      expect(result).toEqual(mockWithdrawals);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when withdrawalRequests is empty', () => {
      const mockState = createMockState([]);

      const result = selectAllWithdrawalRequests(mockState);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('returns empty array when PerpsController is undefined', () => {
      const mockState = createMockStateWithoutPerps();

      const result = selectAllWithdrawalRequests(mockState);

      expect(result).toEqual([]);
    });

    it('returns empty array when withdrawalRequests property is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            PerpsController: {},
          },
        },
      } as unknown as RootState;

      const result = selectAllWithdrawalRequests(mockState);

      expect(result).toEqual([]);
    });

    it('returns stable empty array reference when no requests exist', () => {
      const mockState = createMockState([]);

      const result1 = selectAllWithdrawalRequests(mockState);
      const result2 = selectAllWithdrawalRequests(mockState);

      expect(result1).toBe(result2);
    });

    it('returns requests with all status types', () => {
      const mockWithdrawals = [
        createWithdrawalRequest({ id: '1', status: 'pending' }),
        createWithdrawalRequest({
          id: '2',
          status: 'completed',
          success: true,
        }),
        createWithdrawalRequest({
          id: '3',
          status: 'failed',
          errorMessage: 'Transaction failed',
        }),
      ];
      const mockState = createMockState(mockWithdrawals);

      const result = selectAllWithdrawalRequests(mockState);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('completed');
      expect(result[2].status).toBe('failed');
    });
  });

  describe('selectWithdrawalRequestsBySelectedAccount', () => {
    const MOCK_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
    const MOCK_ADDRESS_2 = '0xabcdef1234567890abcdef1234567890abcdef12';

    it('returns withdrawal requests filtered by selected account address', () => {
      const mockWithdrawals = [
        createWithdrawalRequest({
          id: '1',
          accountAddress: MOCK_ADDRESS,
        }),
        createWithdrawalRequest({
          id: '2',
          accountAddress: MOCK_ADDRESS_2,
        }),
        createWithdrawalRequest({
          id: '3',
          accountAddress: MOCK_ADDRESS,
        }),
      ];
      const mockState = createMockState(mockWithdrawals);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(MOCK_ADDRESS),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('returns empty array when no address is selected', () => {
      const mockWithdrawals = [
        createWithdrawalRequest({ id: '1', accountAddress: MOCK_ADDRESS }),
      ];
      const mockState = createMockState(mockWithdrawals);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(undefined),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toEqual([]);
    });

    it('returns empty array when no matching requests exist for selected account', () => {
      const mockWithdrawals = [
        createWithdrawalRequest({
          id: '1',
          accountAddress: MOCK_ADDRESS_2,
        }),
      ];
      const mockState = createMockState(mockWithdrawals);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(MOCK_ADDRESS),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toEqual([]);
    });

    it('matches addresses case-insensitively', () => {
      const lowerCaseAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      const upperCaseAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const mockWithdrawals = [
        createWithdrawalRequest({
          id: '1',
          accountAddress: lowerCaseAddress,
        }),
      ];
      const mockState = createMockState(mockWithdrawals);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(upperCaseAddress),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('matches checksummed address with lowercase stored address', () => {
      const checksummedAddress = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const lowercaseAddress = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
      const mockWithdrawals = [
        createWithdrawalRequest({
          id: '1',
          accountAddress: lowercaseAddress,
        }),
      ];
      const mockState = createMockState(mockWithdrawals);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(checksummedAddress),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toHaveLength(1);
    });

    it('returns stable empty array reference when no address is selected', () => {
      const mockState = createMockState([]);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(undefined),
      );

      const result1 = selectWithdrawalRequestsBySelectedAccount(mockState);
      const result2 = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result1).toBe(result2);
    });

    it('returns stable empty array reference when no matching requests exist', () => {
      const mockWithdrawals = [
        createWithdrawalRequest({
          id: '1',
          accountAddress: MOCK_ADDRESS_2,
        }),
      ];
      const mockState = createMockState(mockWithdrawals);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(MOCK_ADDRESS),
      );

      const result1 = selectWithdrawalRequestsBySelectedAccount(mockState);
      const result2 = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result1).toBe(result2);
    });

    it('excludes requests with undefined accountAddress', () => {
      const mockWithdrawals = [
        createWithdrawalRequest({
          id: '1',
          accountAddress: MOCK_ADDRESS,
        }),
        createWithdrawalRequest({
          id: '2',
          accountAddress: undefined,
        }),
      ];
      const mockState = createMockState(mockWithdrawals);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(MOCK_ADDRESS),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('returns all requests for account with multiple withdrawal statuses', () => {
      const mockWithdrawals = [
        createWithdrawalRequest({
          id: '1',
          accountAddress: MOCK_ADDRESS,
          status: 'pending',
        }),
        createWithdrawalRequest({
          id: '2',
          accountAddress: MOCK_ADDRESS,
          status: 'completed',
          success: true,
          txHash: '0xabc123',
        }),
        createWithdrawalRequest({
          id: '3',
          accountAddress: MOCK_ADDRESS,
          status: 'failed',
          errorMessage: 'Insufficient funds',
        }),
      ];
      const mockState = createMockState(mockWithdrawals);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(MOCK_ADDRESS),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.status)).toEqual([
        'pending',
        'completed',
        'failed',
      ]);
    });

    it('preserves original withdrawal request properties', () => {
      const mockWithdrawal = createWithdrawalRequest({
        id: 'withdrawal-xyz',
        amount: '500.50',
        asset: 'ETH',
        timestamp: 1700000000000,
        status: 'completed',
        success: true,
        txHash: '0xdef456',
        accountAddress: MOCK_ADDRESS,
        transactionId: 'tx-123',
      });
      const mockState = createMockState([mockWithdrawal]);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(MOCK_ADDRESS),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockWithdrawal);
    });

    it('returns empty array when PerpsController state is undefined', () => {
      const mockState = createMockStateWithoutPerps();
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(MOCK_ADDRESS),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toEqual([]);
    });

    it('filters by EVM account when non-EVM account is globally selected', () => {
      // This test verifies the fix for the bug where selecting a non-EVM account
      // (Solana, Bitcoin, etc.) would cause withdrawal requests to not display
      // even though they exist for the user's EVM account in the same account group
      const mockWithdrawals = [
        createWithdrawalRequest({
          id: '1',
          accountAddress: MOCK_ADDRESS,
        }),
      ];
      const mockState = createMockState(mockWithdrawals);
      // The selector now uses selectSelectedInternalAccountByScope with EVM_SCOPE
      // which always returns the EVM account from the selected account group,
      // regardless of which chain type is globally selected
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        createMockScopeSelector(MOCK_ADDRESS),
      );

      const result = selectWithdrawalRequestsBySelectedAccount(mockState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });
});
