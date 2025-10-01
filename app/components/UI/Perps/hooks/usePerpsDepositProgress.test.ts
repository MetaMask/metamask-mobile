import { renderHook, act } from '@testing-library/react-native';
import { usePerpsDepositProgress } from './usePerpsDepositProgress';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import Engine from '../../../../core/Engine';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

// Mock dependencies
jest.mock('./stream/usePerpsLiveAccount');
jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
  typeof usePerpsLiveAccount
>;
const mockEngine = Engine as jest.Mocked<typeof Engine>;

describe('usePerpsDepositProgress', () => {
  let mockSubscribe: jest.Mock;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSubscribe = jest.fn();
    mockUnsubscribe = jest.fn();
    mockEngine.controllerMessenger.subscribe = mockSubscribe;
    mockEngine.controllerMessenger.unsubscribe = mockUnsubscribe;

    // Default mock for usePerpsLiveAccount
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        availableBalance: '1000.00',
        totalBalance: '10000.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
      },
      isInitialLoading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns false for isDepositInProgress initially', () => {
      // Act
      const { result } = renderHook(() => usePerpsDepositProgress());

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });

    it('subscribes to transaction status updates on mount', () => {
      // Act
      renderHook(() => usePerpsDepositProgress());

      // Assert
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('unsubscribes from transaction status updates on unmount', () => {
      // Act
      const { unmount } = renderHook(() => usePerpsDepositProgress());
      unmount();

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });
  });

  describe('Transaction Status Handling', () => {
    let transactionHandler: (data: {
      transactionMeta: TransactionMeta;
    }) => void;

    beforeEach(() => {
      // Capture the transaction handler function
      mockSubscribe.mockImplementation((event, handler) => {
        if (event === 'TransactionController:transactionStatusUpdated') {
          transactionHandler = handler;
        }
      });
    });

    it('sets deposit in progress when perpsDeposit transaction is approved', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDepositProgress());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.approved,
      } as TransactionMeta;

      // Act
      act(() => {
        transactionHandler({ transactionMeta });
      });

      // Assert
      expect(result.current.isDepositInProgress).toBe(true);
    });

    it('clears deposit in progress when perpsDeposit transaction fails', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDepositProgress());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.failed,
      } as TransactionMeta;

      // First set deposit in progress
      act(() => {
        transactionHandler({
          transactionMeta: {
            ...transactionMeta,
            status: TransactionStatus.approved,
          },
        });
      });
      expect(result.current.isDepositInProgress).toBe(true);

      // Act - Now fail the transaction
      act(() => {
        transactionHandler({ transactionMeta });
      });

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });

    it('ignores non-perpsDeposit transactions', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDepositProgress());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
      } as TransactionMeta;

      // Act
      act(() => {
        transactionHandler({ transactionMeta });
      });

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });

    it('ignores perpsDeposit transactions with non-approved/failed status', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDepositProgress());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.submitted,
      } as TransactionMeta;

      // Act
      act(() => {
        transactionHandler({ transactionMeta });
      });

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });
  });

  describe('Balance Monitoring', () => {
    it('clears deposit in progress when balance increases', () => {
      // Arrange
      const { result, rerender } = renderHook(() => usePerpsDepositProgress());

      // Set deposit in progress first
      act(() => {
        const transactionHandler = mockSubscribe.mock.calls.find(
          (call) =>
            call[0] === 'TransactionController:transactionStatusUpdated',
        )?.[1];
        if (transactionHandler) {
          transactionHandler({
            transactionMeta: {
              id: 'test-tx-id',
              type: TransactionType.perpsDeposit,
              status: TransactionStatus.approved,
            } as TransactionMeta,
          });
        }
      });

      expect(result.current.isDepositInProgress).toBe(true);

      // Act - Update balance to simulate deposit completion
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '1500.00', // Increased from 1000.00
          totalBalance: '10500.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
        },
        isInitialLoading: false,
      });

      rerender();

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });

    it('does not clear deposit in progress when balance decreases', () => {
      // Arrange
      const { result, rerender } = renderHook(() => usePerpsDepositProgress());

      // Set deposit in progress first
      act(() => {
        const transactionHandler = mockSubscribe.mock.calls.find(
          (call) =>
            call[0] === 'TransactionController:transactionStatusUpdated',
        )?.[1];
        if (transactionHandler) {
          transactionHandler({
            transactionMeta: {
              id: 'test-tx-id',
              type: TransactionType.perpsDeposit,
              status: TransactionStatus.approved,
            } as TransactionMeta,
          });
        }
      });

      expect(result.current.isDepositInProgress).toBe(true);

      // Act - Update balance to simulate decrease
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '500.00', // Decreased from 1000.00
          totalBalance: '9500.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
        },
        isInitialLoading: false,
      });

      rerender();

      // Assert
      expect(result.current.isDepositInProgress).toBe(true);
    });

    it('does not clear deposit in progress when balance stays the same', () => {
      // Arrange
      const { result, rerender } = renderHook(() => usePerpsDepositProgress());

      // Set deposit in progress first
      act(() => {
        const transactionHandler = mockSubscribe.mock.calls.find(
          (call) =>
            call[0] === 'TransactionController:transactionStatusUpdated',
        )?.[1];
        if (transactionHandler) {
          transactionHandler({
            transactionMeta: {
              id: 'test-tx-id',
              type: TransactionType.perpsDeposit,
              status: TransactionStatus.approved,
            } as TransactionMeta,
          });
        }
      });

      expect(result.current.isDepositInProgress).toBe(true);

      // Act - Update balance to same value
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '1000.00', // Same as initial
          totalBalance: '10000.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
        },
        isInitialLoading: false,
      });

      rerender();

      // Assert
      expect(result.current.isDepositInProgress).toBe(true);
    });

    it('handles null account gracefully', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: null,
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() => usePerpsDepositProgress());

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });

    it('handles undefined availableBalance gracefully', () => {
      // Arrange
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: undefined,
          totalBalance: '10000.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
        },
        isInitialLoading: false,
      });

      // Act
      const { result } = renderHook(() => usePerpsDepositProgress());

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple transaction status updates correctly', () => {
      // Arrange
      const { result } = renderHook(() => usePerpsDepositProgress());
      const transactionHandler = mockSubscribe.mock.calls.find(
        (call) => call[0] === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      // Act - Multiple status updates
      act(() => {
        if (transactionHandler) {
          // First: Approve transaction
          transactionHandler({
            transactionMeta: {
              id: 'test-tx-id',
              type: TransactionType.perpsDeposit,
              status: TransactionStatus.approved,
            } as TransactionMeta,
          });
        }
      });

      expect(result.current.isDepositInProgress).toBe(true);

      act(() => {
        if (transactionHandler) {
          // Second: Fail transaction
          transactionHandler({
            transactionMeta: {
              id: 'test-tx-id',
              type: TransactionType.perpsDeposit,
              status: TransactionStatus.failed,
            } as TransactionMeta,
          });
        }
      });

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });

    it('handles decimal balance comparisons correctly', () => {
      // Arrange
      const { result, rerender } = renderHook(() => usePerpsDepositProgress());

      // Set deposit in progress with decimal balance
      act(() => {
        const transactionHandler = mockSubscribe.mock.calls.find(
          (call) =>
            call[0] === 'TransactionController:transactionStatusUpdated',
        )?.[1];
        if (transactionHandler) {
          transactionHandler({
            transactionMeta: {
              id: 'test-tx-id',
              type: TransactionType.perpsDeposit,
              status: TransactionStatus.approved,
            } as TransactionMeta,
          });
        }
      });

      expect(result.current.isDepositInProgress).toBe(true);

      // Act - Small increase in decimal balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '1000.01', // Small increase
          totalBalance: '10000.01',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
        },
        isInitialLoading: false,
      });

      rerender();

      // Assert
      expect(result.current.isDepositInProgress).toBe(false);
    });
  });
});
