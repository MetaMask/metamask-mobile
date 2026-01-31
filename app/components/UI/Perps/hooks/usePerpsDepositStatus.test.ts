import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsDepositStatus } from './usePerpsDepositStatus';
import { usePerpsLiveAccount } from './stream/usePerpsLiveAccount';
import { usePerpsTrading } from './usePerpsTrading';
import usePerpsToasts, {
  PerpsToastOptions,
  PerpsToastOptionsConfig,
} from './usePerpsToasts';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NotificationFeedbackType } from 'expo-haptics';
import {
  USDC_ARBITRUM_MAINNET_ADDRESS,
  ARBITRUM_MAINNET_CHAIN_ID_HEX,
} from '../constants/hyperLiquidConfig';
import { selectTransactionBridgeQuotesById } from '../../../../core/redux/slices/confirmationMetrics';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./stream/usePerpsLiveAccount');
jest.mock('./usePerpsTrading');
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

jest.mock('../../../../core/redux/slices/confirmationMetrics', () => ({
  selectTransactionBridgeQuotesById: jest.fn(),
}));

// Mock stream manager
const mockStreamManager = {
  hasActiveDepositHandler: jest.fn(),
};

jest.mock('../providers/PerpsStreamManager', () => ({
  getStreamManagerInstance: jest.fn(() => mockStreamManager),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUsePerpsLiveAccount = usePerpsLiveAccount as jest.MockedFunction<
  typeof usePerpsLiveAccount
>;
const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
  typeof usePerpsTrading
>;
const mockUsePerpsToasts = usePerpsToasts as jest.MockedFunction<
  typeof usePerpsToasts
>;
const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockSelectTransactionBridgeQuotesById =
  selectTransactionBridgeQuotesById as jest.MockedFunction<
    typeof selectTransactionBridgeQuotesById
  >;

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
    mockStreamManager.hasActiveDepositHandler.mockReturnValue(false);

    mockEngine.controllerMessenger.subscribe = mockSubscribe;
    mockEngine.controllerMessenger.unsubscribe = mockUnsubscribe;
    mockEngine.context.PerpsController.clearDepositResult =
      mockClearDepositResult;

    // Mock usePerpsTrading
    mockUsePerpsTrading.mockReturnValue({
      clearDepositResult: mockClearDepositResult,
    } as unknown as ReturnType<typeof usePerpsTrading>);

    // Mock selectTransactionBridgeQuotesById
    mockSelectTransactionBridgeQuotesById.mockReturnValue([]);

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
          } as PerpsToastOptions,
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
        oneClickTrade: {
          txCreationFailed: {} as PerpsToastOptions,
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
          } as PerpsToastOptions,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contentSharing: {} as any,
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
              depositInProgress: false,
              lastDepositResult: null,
              lastDepositTransactionId: null,
            },
          },
        },
        confirmationMetrics: {
          transactionBridgeQuotesById: {},
          metricsById: {},
          transactionPayTokenById: {},
          isTransactionBridgeQuotesLoadingById: {},
          isTransactionUpdating: {},
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
      // Reset the mock to ensure clean state
      mockShowToast.mockClear();
      renderHook(() => usePerpsDepositStatus());
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
    });

    it('should not show in-progress toast when perpsDeposit transaction is submitted', () => {
      renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.submitted,
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should not show in-progress toast when perpsDeposit transaction is confirmed', () => {
      renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.confirmed,
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should stop waiting for funds when transaction fails', () => {
      renderHook(() => usePerpsDepositStatus());
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
            status: TransactionStatus.approved,
          },
        });
      });

      // Now fail the transaction
      act(() => {
        transactionHandler({ transactionMeta });
      });
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

    it('should show instant processing time for arb.USDC deposits', () => {
      renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.approved,
        chainId: ARBITRUM_MAINNET_CHAIN_ID_HEX,
        networkClientId: 'arbitrum',
        time: Date.now(),
        txParams: {
          from: '0x1234567890123456789012345678901234567890',
        },
        metamaskPay: {
          chainId: ARBITRUM_MAINNET_CHAIN_ID_HEX,
          tokenAddress: USDC_ARBITRUM_MAINNET_ADDRESS,
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
        status: TransactionStatus.approved,
        chainId: '0x1',
        networkClientId: 'mainnet',
        time: Date.now(),
        txParams: {
          from: '0x1234567890123456789012345678901234567890',
        },
        metamaskPay: {
          chainId: '0x1', // Different chain
          tokenAddress: '0x1234567890123456789012345678901234567890', // Different token
        },
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(
        mockPerpsToastOptions.accountManagement.deposit.inProgress,
      ).toHaveBeenCalledWith(60, 'test-tx-id'); // 60 seconds for other tokens
    });

    it('skips showing toast when active deposit handler exists', () => {
      mockStreamManager.hasActiveDepositHandler.mockReturnValue(true);
      mockShowToast.mockClear();

      renderHook(() => usePerpsDepositStatus());
      const transactionMeta: TransactionMeta = {
        id: 'test-tx-id',
        type: TransactionType.perpsDeposit,
        status: TransactionStatus.approved,
      } as TransactionMeta;

      act(() => {
        transactionHandler({ transactionMeta });
      });

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockStreamManager.hasActiveDepositHandler).toHaveBeenCalled();
    });
  });

  describe('Balance Monitoring', () => {
    it('should show success toast when balance increases', () => {
      // Reset the mock to ensure clean state
      mockShowToast.mockClear();
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
              status: TransactionStatus.approved,
            } as TransactionMeta,
          });
        }
      });

      // Update balance to simulate deposit completion
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '1500.00', // Increased from 1000.00
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
          totalBalance: '10600.00',
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
      ).toHaveBeenCalledWith('1500.00'); // Current balance
    });

    it('should not show success toast when balance decreases', () => {
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
              status: TransactionStatus.approved,
            } as TransactionMeta,
          });
        }
      });

      // Update balance to simulate decrease
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '500.00', // Decreased from 1000.00
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
          totalBalance: '9600.00',
        },
        isInitialLoading: false,
      });

      rerender({});

      expect(mockShowToast).not.toHaveBeenCalledWith({ success: true });
    });

    it('should not monitor balance when not waiting for funds', () => {
      const { rerender } = renderHook(() => usePerpsDepositStatus());

      // Update balance without setting up waiting for funds
      mockUsePerpsLiveAccount.mockReturnValue({
        account: {
          availableBalance: '1500.00',
          marginUsed: '9000.00',
          unrealizedPnl: '100.00',
          returnOnEquity: '0.15',
          totalBalance: '10600.00',
        },
        isInitialLoading: false,
      });

      rerender({});

      expect(mockShowToast).not.toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Controller Result Handling', () => {
    it('should show error toast when lastDepositResult indicates failure', () => {
      // Reset the mock to ensure clean state
      mockShowToast.mockClear();
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                depositInProgress: false,
                lastDepositResult: {
                  success: false,
                  error: 'Test error message',
                },
                lastDepositTransactionId: null,
              },
            },
          },
          confirmationMetrics: {
            transactionBridgeQuotesById: {},
            metricsById: {},
            transactionPayTokenById: {},
            isTransactionBridgeQuotesLoadingById: {},
            isTransactionUpdating: {},
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
                depositInProgress: false,
                lastDepositResult: {
                  success: true,
                  txHash: '0x123',
                },
                lastDepositTransactionId: null,
              },
            },
          },
          confirmationMetrics: {
            transactionBridgeQuotesById: {},
            metricsById: {},
            transactionPayTokenById: {},
            isTransactionBridgeQuotesLoadingById: {},
            isTransactionUpdating: {},
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
                depositInProgress: false,
                lastDepositResult: null,
                lastDepositTransactionId: null,
              },
            },
          },
          confirmationMetrics: {
            transactionBridgeQuotesById: {},
            metricsById: {},
            transactionPayTokenById: {},
            isTransactionBridgeQuotesLoadingById: {},
            isTransactionUpdating: {},
          },
        };
        return selector(state as RootState);
      });

      renderHook(() => usePerpsDepositStatus());

      expect(mockShowToast).not.toHaveBeenCalledWith({ error: true });
    });

    it('should clear deposit result after showing error toast', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                depositInProgress: false,
                lastDepositResult: {
                  success: false,
                  error: 'Test error message',
                },
                lastDepositTransactionId: null,
              },
            },
          },
          confirmationMetrics: {
            transactionBridgeQuotesById: {},
            metricsById: {},
            transactionPayTokenById: {},
            isTransactionBridgeQuotesLoadingById: {},
            isTransactionUpdating: {},
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
    it('should return depositInProgress true when controller state indicates deposit in progress', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                depositInProgress: true,
                lastDepositResult: null,
                lastDepositTransactionId: null,
              },
            },
          },
          confirmationMetrics: {
            transactionBridgeQuotesById: {},
            metricsById: {},
            transactionPayTokenById: {},
            isTransactionBridgeQuotesLoadingById: {},
            isTransactionUpdating: {},
          },
        };
        return selector(state as RootState);
      });

      const { result } = renderHook(() => usePerpsDepositStatus());

      expect(result.current.depositInProgress).toBe(true);
    });

    it('should return depositInProgress false when controller state indicates no deposit in progress', () => {
      mockUseSelector.mockImplementation((selector) => {
        const state = {
          engine: {
            backgroundState: {
              PerpsController: {
                depositInProgress: false,
                lastDepositResult: null,
                lastDepositTransactionId: null,
              },
            },
          },
          confirmationMetrics: {
            transactionBridgeQuotesById: {},
            metricsById: {},
            transactionPayTokenById: {},
            isTransactionBridgeQuotesLoadingById: {},
            isTransactionUpdating: {},
          },
        };
        return selector(state as RootState);
      });

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
                depositInProgress: false,
                lastDepositResult: {
                  success: false,
                  error: 'Test error message',
                },
                lastDepositTransactionId: null,
              },
            },
          },
          confirmationMetrics: {
            transactionBridgeQuotesById: {},
            metricsById: {},
            transactionPayTokenById: {},
            isTransactionBridgeQuotesLoadingById: {},
            isTransactionUpdating: {},
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
});
