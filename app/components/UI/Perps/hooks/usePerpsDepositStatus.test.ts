import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsDepositStatus } from './usePerpsDepositStatus';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import usePerpsToasts, { PerpsToastOptionsConfig } from './usePerpsToasts';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NotificationFeedbackType } from 'expo-haptics';
import { USDC_ARBITRUM_MAINNET_ADDRESS } from '../constants/hyperLiquidConfig';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./stream/usePerpsLiveAccount');
jest.mock('./usePerpsToasts');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      clearDepositResult: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
  typeof usePerpsLiveAccount
>;
const mockUsePerpsToasts = usePerpsToasts as jest.MockedFunction<
  typeof usePerpsToasts
>;
const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

describe('usePerpsDepositStatus', () => {
  let mockSubscribe: jest.Mock;
  let mockUnsubscribe: jest.Mock;
  let mockShowToast: jest.Mock;
  let mockClearDepositResult: jest.Mock;
  let mockPerpsToastOptions: PerpsToastOptionsConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSubscribe = jest.fn();
    mockUnsubscribe = jest.fn();
    mockShowToast = jest.fn();
    mockClearDepositResult = jest.fn();

    mockEngine.controllerMessenger.subscribe = mockSubscribe;
    mockEngine.controllerMessenger.unsubscribe = mockUnsubscribe;
    mockEngine.context.PerpsController.clearDepositResult =
      mockClearDepositResult;

    // Default mock for usePerpsLiveAccount
    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        availableBalance: '1000.00',
        totalBalance: '10000.00',
        marginUsed: '9000.00',
        unrealizedPnl: '100.00',
        returnOnEquity: '0.15',
        totalValue: '10100.00',
      },
      isInitialLoading: false,
    });

    // Default mock for usePerpsToasts
    mockPerpsToastOptions = {
      accountManagement: {
        deposit: {
          success: jest.fn(() => ({
            variant: ToastVariants.Icon,
            iconName: IconName.CheckBold,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Deposit successful', isBold: true },
              { label: 'Your deposit has been processed' },
            ],
            hapticsType: NotificationFeedbackType.Success,
          })),
          error: {
            variant: ToastVariants.Icon,
            iconName: IconName.Warning,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Deposit failed', isBold: true },
              { label: 'Your deposit could not be processed' },
            ],
            hapticsType: NotificationFeedbackType.Error,
          },
          inProgress: jest.fn(() => ({
            variant: ToastVariants.Icon,
            iconName: IconName.Loading,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Deposit in progress', isBold: true },
              { label: 'Processing your deposit...' },
            ],
            hapticsType: NotificationFeedbackType.Success,
          })),
        },
        withdrawal: {
          withdrawalInProgress: {
            variant: ToastVariants.Icon,
            iconName: IconName.Loading,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Withdrawal in progress', isBold: true },
              { label: 'Processing your withdrawal...' },
            ],
            hapticsType: NotificationFeedbackType.Success,
          },
          withdrawalSuccess: jest.fn(() => ({
            variant: ToastVariants.Icon,
            iconName: IconName.CheckBold,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Withdrawal successful', isBold: true },
              { label: 'Your withdrawal has been processed' },
            ],
            hapticsType: NotificationFeedbackType.Success,
          })),
          withdrawalFailed: jest.fn(() => ({
            variant: ToastVariants.Icon,
            iconName: IconName.Warning,
            hasNoTimeout: false,
            labelOptions: [
              { label: 'Withdrawal failed', isBold: true },
              { label: 'Your withdrawal could not be processed' },
            ],
            hapticsType: NotificationFeedbackType.Error,
          })),
        },
      },
      // Add minimal stubs for other required properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderManagement: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      positionManagement: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formValidation: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dataFetching: {} as any,
    };

    mockUsePerpsToasts.mockReturnValue({
      showToast: mockShowToast,
      PerpsToastOptions: mockPerpsToastOptions,
    });

    // Default mock for useSelector
    mockUseSelector.mockImplementation((selector) => {
      const state = {
        engine: {
          backgroundState: {
            PerpsController: {
              lastDepositResult: null,
            },
          },
        },
      };
      return selector(state as RootState);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => usePerpsDepositStatus());

      expect(result.current.depositInProgress).toBe(false);
    });

    it('should subscribe to transaction status updates on mount', () => {
      renderHook(() => usePerpsDepositStatus());

      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('should unsubscribe from transaction status updates on unmount', () => {
      const { unmount } = renderHook(() => usePerpsDepositStatus());

      unmount();

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

    it('should show in-progress toast when perpsDeposit transaction is approved', () => {
      const { result } = renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.approved,
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        hasNoTimeout: false,
        labelOptions: [
          { label: 'Deposit in progress', isBold: true },
          { label: 'Processing your deposit...' },
        ],
        hapticsType: NotificationFeedbackType.Success,
      });
      expect(
        mockPerpsToastOptions.accountManagement.deposit.inProgress,
      ).toHaveBeenCalledWith(60, 'test-tx-id');
      expect(result.current.depositInProgress).toBe(true);
    });

    it('should show in-progress toast when perpsDeposit transaction is submitted', () => {
      const { result } = renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.submitted,
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        hasNoTimeout: false,
        labelOptions: [
          { label: 'Deposit in progress', isBold: true },
          { label: 'Processing your deposit...' },
        ],
        hapticsType: NotificationFeedbackType.Success,
      });
      expect(
        mockPerpsToastOptions.accountManagement.deposit.inProgress,
      ).toHaveBeenCalledWith(60, 'test-tx-id');
      expect(result.current.depositInProgress).toBe(true);
    });

    it('should show in-progress toast when perpsDeposit transaction is confirmed', () => {
      const { result } = renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.confirmed,
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        hasNoTimeout: false,
        labelOptions: [
          { label: 'Deposit in progress', isBold: true },
          { label: 'Processing your deposit...' },
        ],
        hapticsType: NotificationFeedbackType.Success,
      });
      expect(
        mockPerpsToastOptions.accountManagement.deposit.inProgress,
      ).toHaveBeenCalledWith(60, 'test-tx-id');
      expect(result.current.depositInProgress).toBe(true);
    });

    it('should stop waiting for funds when transaction fails', () => {
      const { result } = renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.failed,
      } as TransactionMeta;

      // First set up waiting for funds
      act(() => {
        transactionHandler({
          transactionMeta: {
            ...transactionMeta,
            status: TransactionStatus.submitted,
          },
        });
      });

      expect(result.current.depositInProgress).toBe(true);

      // Now fail the transaction
      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(result.current.depositInProgress).toBe(false);
    });

    it('should ignore non-perpsDeposit transactions', () => {
      renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.simpleSend,
        status: TransactionStatus.submitted,
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should prevent duplicate in-progress toasts for same transaction', () => {
      renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.submitted,
      } as TransactionMeta;

      // First call
      act(() => {
        transactionHandler({ transactionMeta });
      });

      // Second call with same transaction
      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('should show instant processing time for arb.USDC deposits', () => {
      renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.submitted,
        txParams: {
          to: USDC_ARBITRUM_MAINNET_ADDRESS,
        },
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(
        mockPerpsToastOptions.accountManagement.deposit.inProgress,
      ).toHaveBeenCalledWith(0, 'test-tx-id'); // 0 seconds for arb.USDC
    });

    it('should show 1 minute processing time for non-arb.USDC deposits', () => {
      renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.submitted,
        txParams: {
          to: '0x1234567890123456789012345678901234567890', // Different token
        },
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(
        mockPerpsToastOptions.accountManagement.deposit.inProgress,
      ).toHaveBeenCalledWith(60, 'test-tx-id'); // 60 seconds for other tokens
    });
  });

  describe('Balance Monitoring', () => {
    it('should show success toast when balance increases', () => {
      const { result, rerender } = renderHook(() => usePerpsDepositStatus());

      // Set up waiting for funds first
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
              status: TransactionStatus.submitted,
            } as TransactionMeta,
          });
        }
      });

      expect(result.current.depositInProgress).toBe(true);

      // Update balance to simulate deposit completion
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '1500.00', // Increased from 1000.00
          totalBalance: '10500.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
          totalValue: '10600.00',
        },
        isInitialLoading: false,
      });

      rerender({});

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        hasNoTimeout: false,
        labelOptions: [
          { label: 'Deposit successful', isBold: true },
          { label: 'Your deposit has been processed' },
        ],
        hapticsType: NotificationFeedbackType.Success,
      });
      expect(
        mockPerpsToastOptions.accountManagement.deposit.success,
      ).toHaveBeenCalledWith('500.00'); // Deposit amount (1500 - 1000)
      expect(result.current.depositInProgress).toBe(false);
    });

    it('should not show success toast when balance decreases', () => {
      const { result, rerender } = renderHook(() => usePerpsDepositStatus());

      // Set up waiting for funds first
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
              status: TransactionStatus.submitted,
            } as TransactionMeta,
          });
        }
      });

      expect(result.current.depositInProgress).toBe(true);

      // Update balance to simulate decrease
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '500.00', // Decreased from 1000.00
          totalBalance: '9500.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
          totalValue: '9600.00',
        },
        isInitialLoading: false,
      });

      rerender({});

      expect(mockShowToast).not.toHaveBeenCalledWith({ success: true });
      expect(result.current.depositInProgress).toBe(true);
    });

    it('should not monitor balance when not waiting for funds', () => {
      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // Update balance without setting up waiting for funds
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '1500.00',
          totalBalance: '10500.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
          totalValue: '10600.00',
        },
        isInitialLoading: false,
      });

      rerender({});

      expect(mockShowToast).not.toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Controller Result Handling', () => {
    it('should show error toast when lastDepositResult indicates failure', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastDepositResult: {
                  success: false,
                  error: 'Test error message',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsDepositStatus());

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: ToastVariants.Icon,
        iconName: IconName.Warning,
        hasNoTimeout: false,
        labelOptions: [
          { label: 'Deposit failed', isBold: true },
          { label: 'Your deposit could not be processed' },
        ],
        hapticsType: NotificationFeedbackType.Error,
      });
    });

    it('should not show error toast when lastDepositResult indicates success', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastDepositResult: {
                  success: true,
                  txHash: '0x123',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsDepositStatus());

      expect(mockShowToast).not.toHaveBeenCalledWith({ error: true });
    });

    it('should not show error toast when lastDepositResult is null', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastDepositResult: null,
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsDepositStatus());

      expect(mockShowToast).not.toHaveBeenCalledWith({ error: true });
    });

    it('should prevent duplicate error toasts for same error', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastDepositResult: {
                  success: false,
                  error: 'Test error message',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // First render
      expect(mockShowToast).toHaveBeenCalledTimes(1);

      // Re-render with same error
      rerender({});

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('should clear deposit result after showing error toast', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastDepositResult: {
                  success: false,
                  error: 'Test error message',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsDepositStatus());

      // Fast-forward timeout
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockClearDepositResult).toHaveBeenCalled();
    });
  });

  describe('Return Value', () => {
    it('should return depositInProgress true when lastDepositResult exists', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastDepositResult: {
                  success: true,
                  txHash: '0x123',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      const { result } = renderHook(() => usePerpsDepositStatus());

      expect(result.current.depositInProgress).toBe(true);
    });

    it('should return depositInProgress true when waiting for funds', () => {
      const { result } = renderHook(() => usePerpsDepositStatus());

      // Set up waiting for funds
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
              status: TransactionStatus.submitted,
            } as TransactionMeta,
          });
        }
      });

      expect(result.current.depositInProgress).toBe(true);
    });

    it('should return depositInProgress false when neither condition is met', () => {
      const { result } = renderHook(() => usePerpsDepositStatus());

      expect(result.current.depositInProgress).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should clear timeouts on unmount', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastDepositResult: {
                  success: false,
                  error: 'Test error message',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      const { unmount } = renderHook(() => usePerpsDepositStatus());

      // Fast-forward timeout
      act(() => {
        jest.advanceTimersByTime(500);
      });

      unmount();

      expect(mockClearDepositResult).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log when showing deposit in progress toast', () => {
      renderHook(() => usePerpsDepositStatus());

      const transactionHandler = mockSubscribe.mock.calls.find(
        (call) => call[0] === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      act(() => {
        transactionHandler?.({
          transactionMeta: {
            id: 'test-tx-id',
            type: TransactionType.perpsDeposit,
            status: TransactionStatus.submitted,
          } as TransactionMeta,
        });
      });

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'usePerpsDepositStatus: Transaction approved/submitted/confirmed, triggering in-progress toast',
        {
          transactionId: 'test-tx-id',
          status: TransactionStatus.submitted,
        },
      );
    });

    it('should log when balance increases', () => {
      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // Set up waiting for funds first
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
              status: TransactionStatus.submitted,
            } as TransactionMeta,
          });
        }
      });

      // Update balance
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '1500.00',
          totalBalance: '10500.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
          totalValue: '10600.00',
        },
        isInitialLoading: false,
      });

      rerender({});

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'usePerpsDepositStatus: Balance increased, funds are now available',
        {
          previousBalance: 1000,
          currentBalance: 1500,
          increase: 500,
        },
      );
    });

    it('should log when processing error result', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                lastDepositResult: {
                  success: false,
                  error: 'Test error message',
                },
              },
            },
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsDepositStatus());

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        'usePerpsDepositStatus: Processing error result',
        {
          lastDepositResult: {
            success: false,
            error: 'Test error message',
          },
          resultId: 'error-Test error message',
        },
      );
    });
  });
});
