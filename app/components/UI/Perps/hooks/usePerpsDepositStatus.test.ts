import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { usePerpsDepositStatus } from './usePerpsDepositStatus';
import { usePerpsTrading } from './usePerpsTrading';
import type { RootState } from '../../../../reducers';
import Engine from '../../../../core/Engine';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import { TransactionStatus } from '@metamask/transaction-controller';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: jest.fn(() => ({
    clearDepositResult: jest.fn(),
  })),
}));

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: jest.fn(),
    PerpsToastOptions: {
      accountManagement: {
        deposit: {
          inProgress: jest.fn(() => ({ type: 'deposit-in-progress' })),
          success: jest.fn(() => ({ type: 'deposit-success' })),
          error: { type: 'deposit-error' },
        },
      },
    },
  })),
}));

jest.mock('./stream/usePerpsLiveAccount', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: null,
  })),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    PerpsController: {
      getAccountState: jest.fn(),
    },
  },
}));

import usePerpsToasts, { PerpsToastOptionsConfig } from './usePerpsToasts';

describe('usePerpsDepositStatus', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
    typeof usePerpsTrading
  >;
  const mockUsePerpsToasts = usePerpsToasts as jest.MockedFunction<
    typeof usePerpsToasts
  >;
  const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
    typeof usePerpsLiveAccount
  >;

  let mockShowToast: jest.Mock;
  let mockPerpsToastOptions: PerpsToastOptionsConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup usePerpsToasts mock
    mockShowToast = jest.fn();
    mockPerpsToastOptions = {
      accountManagement: {
        deposit: {
          inProgress: jest.fn(() => ({ type: 'deposit-in-progress' })),
          success: jest.fn(() => ({ type: 'deposit-success' })),
          error: { type: 'deposit-error' },
        },
      },
    } as unknown as PerpsToastOptionsConfig;

    mockUsePerpsToasts.mockReturnValue({
      showToast: mockShowToast,
      PerpsToastOptions: mockPerpsToastOptions as PerpsToastOptionsConfig,
    });

    // Default mock for usePerpsLiveAccount
    mockUsePerpsLiveAccount.mockReturnValue({
      account: null,
      isInitialLoading: false,
    });

    // Default Redux state - no deposit in progress
    mockUseSelector.mockImplementation(
      (selector: (state: RootState) => unknown) => {
        const mockState = {
          engine: {
            backgroundState: {
              PerpsController: {
                depositInProgress: false,
                lastDepositResult: null,
                lastDepositTransactionId: null,
                perpsAccountState: null,
              },
            },
          },
          confirmationMetrics: {
            transactionBridgeQuotesById: {},
          },
        } as unknown as RootState;
        return selector(mockState);
      },
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should return depositInProgress state', () => {
      // Test false state
      const { result, rerender } = renderHook(() => usePerpsDepositStatus());
      expect(result.current.depositInProgress).toBe(false);

      // Update to true state
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {
                PerpsController: {
                  depositInProgress: true,
                  lastDepositResult: null,
                  lastDepositTransactionId: null,
                  perpsAccountState: null,
                },
              },
            },
            confirmationMetrics: {
              transactionBridgeQuotesById: {},
            },
          } as unknown as RootState;
          return selector(mockState);
        },
      );

      rerender();
      expect(result.current.depositInProgress).toBe(true);
    });

    it('should handle successful deposit via balance increase', () => {
      // Setup initial live account with balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '100',
          totalBalance: '150',
          marginUsed: '50',
          unrealizedPnl: '5',
          returnOnEquity: '3.33',
          totalValue: '155',
        },
        isInitialLoading: false,
      });

      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // Get the transaction status update handler
      const transactionHandler = (
        Engine.controllerMessenger.subscribe as jest.Mock
      ).mock.calls[0][1];

      // Simulate deposit transaction approval
      transactionHandler({
        transactionMeta: {
          id: 'test-tx-123',
          type: 'perpsDeposit',
          status: TransactionStatus.approved,
        },
      });

      // Update live account balance to simulate successful deposit
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '200',
          totalBalance: '250',
          marginUsed: '50',
          unrealizedPnl: '5',
          returnOnEquity: '2',
          totalValue: '255',
        },
        isInitialLoading: false,
      });

      // Re-render to trigger balance increase detection
      rerender();

      // Success toast should be shown when balance increases
      expect(mockShowToast).toHaveBeenCalledWith(
        mockPerpsToastOptions.accountManagement.deposit.success('200'),
      );
    });

    it('should handle failed deposit result', () => {
      const mockClearDepositResult = jest.fn();

      mockUsePerpsTrading.mockReturnValue({
        clearDepositResult: mockClearDepositResult,
      } as unknown as ReturnType<typeof usePerpsTrading>);

      // Start with no result
      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // Update to show failed deposit
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {
                PerpsController: {
                  depositInProgress: false,
                  lastDepositResult: {
                    success: false,
                    error: 'Transaction failed',
                  },
                  lastDepositTransactionId: null,
                  perpsAccountState: null,
                },
              },
            },
            confirmationMetrics: {
              transactionBridgeQuotesById: {},
            },
          } as unknown as RootState;
          return selector(mockState);
        },
      );

      rerender();

      // Toast should have been shown for error
      expect(mockShowToast).toHaveBeenCalledWith(
        mockPerpsToastOptions.accountManagement.deposit.error,
      );

      // Fast forward timers to process the result
      jest.advanceTimersByTime(500);

      // clearDepositResult should be called after timeout
      expect(mockClearDepositResult).toHaveBeenCalled();
    });

    it('should handle missing PerpsController state gracefully', () => {
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {},
            },
            confirmationMetrics: {
              transactionBridgeQuotesById: {},
            },
          } as unknown as RootState;
          return selector(mockState);
        },
      );

      const { result } = renderHook(() => usePerpsDepositStatus());

      // Should default to false when state is missing
      expect(result.current.depositInProgress).toBe(false);
    });

    it('should subscribe to transaction controller events', () => {
      renderHook(() => usePerpsDepositStatus());

      // Should subscribe to transaction status updated event
      expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('should unsubscribe from transaction controller events on unmount', () => {
      const { unmount } = renderHook(() => usePerpsDepositStatus());

      unmount();

      // Should unsubscribe from the event
      expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });
  });
});
