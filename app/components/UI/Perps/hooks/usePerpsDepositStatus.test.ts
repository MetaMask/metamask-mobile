import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { usePerpsDepositStatus } from './usePerpsDepositStatus';
import { usePerpsTrading } from './usePerpsTrading';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import Engine from '../../../../core/Engine';

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

jest.mock('../../../../core/SDKConnect/utils/DevLogger');

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

jest.mock('../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((value) => `$${value}`),
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsAccountState: jest.fn(() => null),
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
  const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

  let mockShowToast: jest.Mock;
  let mockPerpsToastOptions: PerpsToastOptionsConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup DevLogger mock
    mockDevLogger.log = jest.fn();

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

    it('should handle successful deposit result', () => {
      const mockClearDepositResult = jest.fn();

      mockUsePerpsTrading.mockReturnValue({
        clearDepositResult: mockClearDepositResult,
      } as unknown as ReturnType<typeof usePerpsTrading>);

      // Start with no result
      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // Update to show successful deposit
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {
                PerpsController: {
                  depositInProgress: false,
                  lastDepositResult: {
                    success: true,
                    txHash: '0xtransaction123',
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

      // Fast forward timers to process the result
      jest.advanceTimersByTime(500);

      // Toast should NOT be shown for successful deposits (only shown via TransactionController events)
      expect(mockShowToast).not.toHaveBeenCalled();

      // But clearDepositResult should be called after timeout
      expect(mockClearDepositResult).toHaveBeenCalled();
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

    it('should clear stale deposit results on mount', () => {
      const mockClearDepositResult = jest.fn();

      mockUsePerpsTrading.mockReturnValue({
        clearDepositResult: mockClearDepositResult,
      } as unknown as ReturnType<typeof usePerpsTrading>);

      // Start with a stale result from previous session
      mockUseSelector.mockImplementation(
        (selector: (state: RootState) => unknown) => {
          const mockState = {
            engine: {
              backgroundState: {
                PerpsController: {
                  depositInProgress: false,
                  lastDepositResult: {
                    success: true,
                    txHash: '0xstale',
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

      renderHook(() => usePerpsDepositStatus());

      // Should clear stale result on mount
      expect(mockClearDepositResult).toHaveBeenCalled();
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'usePerpsDepositStatus: Clearing stale deposit result on mount',
      );
    });

    it('should subscribe to transaction controller events', () => {
      renderHook(() => usePerpsDepositStatus());

      // Should subscribe to transaction status updated and confirmed events
      expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
      expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionConfirmed',
        expect.any(Function),
      );
    });

    it('should unsubscribe from transaction controller events on unmount', () => {
      const { unmount } = renderHook(() => usePerpsDepositStatus());

      unmount();

      // Should unsubscribe from both events
      expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
      expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionConfirmed',
        expect.any(Function),
      );
    });
  });
});
