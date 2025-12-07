import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import {
  TransactionType,
  TransactionStatus,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { usePredictToasts } from './usePredictToasts';
import Engine from '../../../../core/Engine';
import { ToastContext } from '../../../../component-library/components/Toast';

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

// Mock @react-navigation/stack
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(),
}));

// Create a mock toast ref
const mockToastRef = {
  current: {
    showToast: jest.fn(),
    closeToast: jest.fn(),
  },
};

// Mock theme hook
jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: jest.fn(() => ({
    colors: {
      accent04: {
        dark: '#190066',
        normal: '#89b0ff',
      },
      success: {
        default: '#457a39',
      },
      error: {
        default: '#ca3542',
      },
    },
  })),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      clearDepositTransaction: jest.fn(),
      clearClaimTransaction: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

describe('usePredictToasts', () => {
  let mockSubscribeCallback:
    | ((payload: { transactionMeta: TransactionMeta }) => void)
    | null = null;

  const mockClearTransaction = jest.fn();
  const mockOnConfirmed = jest.fn();
  const mockOnRetry = jest.fn();
  const mockGetAmount = jest.fn((_transactionMeta: TransactionMeta) => '$100');

  const defaultConfig = {
    transactionType: TransactionType.predictDeposit,
    pendingToastConfig: {
      title: 'Processing Transaction',
      description: 'This may take a few moments',
      getAmount: mockGetAmount,
    },
    confirmedToastConfig: {
      title: 'Transaction Confirmed',
      description: 'Your transaction was successful for {amount}',
      getAmount: mockGetAmount,
    },
    errorToastConfig: {
      title: 'Transaction Failed',
      description: 'Something went wrong',
      retryLabel: 'Try Again',
      onRetry: mockOnRetry,
    },
    clearTransaction: mockClearTransaction,
    onConfirmed: mockOnConfirmed,
  };

  // Wrapper to provide ToastContext
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ToastContext.Provider,
      { value: { toastRef: mockToastRef } },
      children,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockToastRef.current.showToast.mockClear();
    mockClearTransaction.mockClear();
    mockOnConfirmed.mockClear();
    mockOnRetry.mockClear();
    mockGetAmount.mockClear();

    // Capture the subscribe callback
    mockSubscribeCallback = null;
    (Engine.controllerMessenger.subscribe as jest.Mock).mockImplementation(
      (_event: string, callback: typeof mockSubscribeCallback) => {
        mockSubscribeCallback = callback;
      },
    );
    (Engine.controllerMessenger.unsubscribe as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('subscribes to transaction status updates on mount', () => {
      // Act
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Assert
      expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('unsubscribes from transaction status updates on unmount', () => {
      // Arrange
      const { unmount } = renderHook(() => usePredictToasts(defaultConfig), {
        wrapper,
      });

      // Act
      unmount();

      // Assert
      expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });
  });

  describe('transaction filtering', () => {
    it('ignores transactions that do not match the specified transaction type', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.swap }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockClearTransaction).not.toHaveBeenCalled();
        expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
      });
    });

    it('processes transactions that match the specified transaction type', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalled();
      });
    });

    it('handles transactions with multiple nested transactions correctly', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [
              { type: TransactionType.swap },
              { type: TransactionType.predictDeposit },
            ],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalled();
      });
    });
  });

  describe('approved transaction status', () => {
    it('shows pending toast when transaction is approved', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: expect.anything(),
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Processing Transaction',
                isBold: true,
              }),
            ]),
            startAccessory: expect.anything(),
          }),
        );
      });
    });

    it('passes transactionMeta to onPress callback when link button is pressed', async () => {
      // Arrange
      const mockOnPress = jest.fn();
      const configWithOnPress = {
        ...defaultConfig,
        pendingToastConfig: {
          ...defaultConfig.pendingToastConfig,
          onPress: mockOnPress,
        },
      };
      renderHook(() => usePredictToasts(configWithOnPress), { wrapper });
      const transactionMeta = {
        id: 'test-transaction-id-123',
        status: TransactionStatus.approved,
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      } as TransactionMeta;

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        const toastCall = mockToastRef.current.showToast.mock.calls[0][0];
        const linkButtonOnPress = toastCall.closeButtonOptions?.onPress;
        expect(linkButtonOnPress).toBeDefined();

        // Call the link button onPress
        linkButtonOnPress?.();

        expect(mockOnPress).toHaveBeenCalledWith(transactionMeta);
      });
    });

    it('includes link button options when onPress is provided in pending toast config', async () => {
      // Arrange
      const mockOnPress = jest.fn();
      const configWithOnPress = {
        ...defaultConfig,
        pendingToastConfig: {
          ...defaultConfig.pendingToastConfig,
          onPress: mockOnPress,
        },
      };
      renderHook(() => usePredictToasts(configWithOnPress), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            closeButtonOptions: expect.objectContaining({
              label: expect.any(String),
              onPress: expect.any(Function),
            }),
          }),
        );
      });
    });

    it('excludes link button options when onPress is not provided in pending toast config', async () => {
      // Arrange
      const configWithoutOnPress = {
        ...defaultConfig,
        pendingToastConfig: {
          title: 'Processing',
          description: 'Please wait',
          getAmount: mockGetAmount,
        },
      };
      renderHook(() => usePredictToasts(configWithoutOnPress), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        const toastCall = mockToastRef.current.showToast.mock.calls[0][0];
        expect(toastCall.linkButtonOptions).toBeUndefined();
      });
    });

    it('calls getAmount with transaction metadata when showing pending toast', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });
      const transactionMeta = {
        status: TransactionStatus.approved,
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      } as TransactionMeta;

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockGetAmount).toHaveBeenCalledWith(transactionMeta);
      });
    });

    it('shows pending toast without amount when getAmount is not provided', async () => {
      // Arrange
      const configWithoutPendingAmount = {
        ...defaultConfig,
        pendingToastConfig: {
          title: 'Processing',
          description: 'Please wait',
        },
      };
      renderHook(() => usePredictToasts(configWithoutPendingAmount), {
        wrapper,
      });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Processing',
                isBold: true,
              }),
            ]),
          }),
        );
      });
    });

    it('does not clear transaction when status is approved', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockClearTransaction).not.toHaveBeenCalled();
      });
    });
  });

  describe('confirmed transaction status', () => {
    it('shows confirmed toast when transaction is confirmed', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: expect.anything(),
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Transaction Confirmed',
                isBold: true,
              }),
            ]),
          }),
        );
      });
    });

    it('calls getAmount with transaction metadata when showing confirmed toast', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });
      const transactionMeta = {
        status: TransactionStatus.confirmed,
        nestedTransactions: [{ type: TransactionType.predictDeposit }],
      } as TransactionMeta;

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockGetAmount).toHaveBeenCalledWith(transactionMeta);
      });
    });

    it('replaces {amount} placeholder in confirmed toast description', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Your transaction was successful for $100',
              }),
            ]),
          }),
        );
      });
    });

    it('clears transaction when transaction is confirmed', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockClearTransaction).toHaveBeenCalled();
      });
    });

    it('calls onConfirmed callback when transaction is confirmed', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockOnConfirmed).toHaveBeenCalled();
      });
    });

    it('does not call onConfirmed callback when it is not provided', async () => {
      // Arrange
      const configWithoutOnConfirmed = {
        ...defaultConfig,
        onConfirmed: undefined,
      };
      renderHook(() => usePredictToasts(configWithoutOnConfirmed), {
        wrapper,
      });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockOnConfirmed).not.toHaveBeenCalled();
      });
    });
  });

  describe('failed transaction status', () => {
    it('shows error toast when transaction fails', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: expect.anything(),
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Transaction Failed',
                isBold: true,
              }),
              expect.objectContaining({
                label: 'Something went wrong',
                isBold: false,
              }),
            ]),
            linkButtonOptions: expect.objectContaining({
              label: 'Try Again',
              onPress: mockOnRetry,
            }),
          }),
        );
      });
    });

    it('clears transaction when transaction fails', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockClearTransaction).toHaveBeenCalled();
      });
    });

    it('does not call onConfirmed callback when transaction fails', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockOnConfirmed).not.toHaveBeenCalled();
      });
    });

    it('calls retry function when error toast retry button is pressed', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert - Get the onPress function from the linkButtonOptions
      await waitFor(() => {
        const toastCall = mockToastRef.current.showToast.mock.calls[0][0];
        const onPressRetry = toastCall.linkButtonOptions?.onPress;

        expect(onPressRetry).toBe(mockOnRetry);
      });
    });
  });

  describe('different transaction types', () => {
    it('works with predictClaim transaction type', async () => {
      // Arrange
      const claimConfig = {
        ...defaultConfig,
        transactionType: TransactionType.predictClaim,
      };
      renderHook(() => usePredictToasts(claimConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).toHaveBeenCalled();
        expect(mockClearTransaction).toHaveBeenCalled();
      });
    });

    it('ignores predictClaim transactions when configured for predictDeposit', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
        expect(mockClearTransaction).not.toHaveBeenCalled();
      });
    });
  });

  describe('toast styling', () => {
    it('includes spinner accessory for pending toast', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        const toastCall = mockToastRef.current.showToast.mock.calls[0][0];
        expect(toastCall.startAccessory).toBeDefined();
      });
    });

    it('uses success icon color for confirmed toast', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        const toastCall = mockToastRef.current.showToast.mock.calls[0][0];
        expect(toastCall.iconColor).toBe('#013330'); // accent03.dark
      });
    });

    it('uses error icon color for failed toast', async () => {
      // Arrange
      renderHook(() => usePredictToasts(defaultConfig), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          } as TransactionMeta,
        });
      });

      // Assert
      await waitFor(() => {
        const toastCall = mockToastRef.current.showToast.mock.calls[0][0];
        expect(toastCall.iconColor).toBe('#ca3542'); // error.default
      });
    });
  });
});
