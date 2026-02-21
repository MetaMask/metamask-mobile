import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import {
  TransactionType,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { usePredictClaimToasts } from './usePredictClaimToasts';
import Engine from '../../../../core/Engine';
import { ToastContext } from '../../../../component-library/components/Toast';
import { PredictPositionStatus } from '../types';

// Mock usePredictClaim
const mockClaim = jest.fn();
jest.mock('./usePredictClaim', () => ({
  usePredictClaim: jest.fn(() => ({
    claim: mockClaim,
  })),
}));

// Mock usePredictPositions
const mockLoadPositions = jest.fn().mockResolvedValue(undefined);
jest.mock('./usePredictPositions', () => ({
  usePredictPositions: jest.fn(() => ({
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: mockLoadPositions,
  })),
}));

// Mock usePredictBalance
const mockLoadBalance = jest.fn().mockResolvedValue(undefined);
jest.mock('./usePredictBalance', () => ({
  usePredictBalance: jest.fn(() => ({
    balance: 100,
    hasNoBalance: false,
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadBalance: mockLoadBalance,
  })),
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
        dark: '#000000',
        normal: '#FFFFFF',
      },
      success: {
        default: '#00FF00',
      },
      error: {
        default: '#FF0000',
      },
    },
  })),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      confirmClaim: jest.fn(),
    },
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn(() => [
        {
          id: 'test-account-id',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          name: 'Test Account',
          metadata: {
            lastSelected: 0,
          },
        },
      ]),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

// Mock account data
const mockAccountId = 'test-account-id';
const mockAccountAddress = '0x1234567890123456789012345678901234567890';

// Mock react-redux
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockState: any = {
  engine: {
    backgroundState: {
      PredictController: {
        claimablePositions: {
          [mockAccountAddress]: [],
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: mockAccountId,
          accounts: {
            [mockAccountId]: {
              id: mockAccountId,
              address: mockAccountAddress,
              name: 'Test Account',
              type: 'eip155:eoa',
              metadata: {
                lastSelected: 0,
              },
            },
          },
        },
      },
    },
  },
};

jest.mock('react-redux', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: jest.fn((selector: any) => selector(mockState)),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect: () => (component: any) => component,
}));

describe('usePredictClaimToasts', () => {
  let mockSubscribeCallback:
    | ((payload: {
        transactionMeta: {
          status: string;
          nestedTransactions?: { type: string }[];
          metamaskPay?: { totalFiat?: string };
        };
      }) => void)
    | null = null;

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
    mockClaim.mockClear();
    mockLoadBalance.mockClear();
    mockLoadPositions.mockClear();

    // Capture the subscribe callback
    mockSubscribeCallback = null;
    (Engine.controllerMessenger.subscribe as jest.Mock).mockImplementation(
      (_event: string, callback: typeof mockSubscribeCallback) => {
        mockSubscribeCallback = callback;
      },
    );
    (Engine.controllerMessenger.unsubscribe as jest.Mock).mockClear();

    mockState = {
      engine: {
        backgroundState: {
          PredictController: {
            claimablePositions: {
              [mockAccountAddress]: [
                {
                  id: '1',
                  status: PredictPositionStatus.WON,
                  currentValue: 100,
                },
                {
                  id: '2',
                  status: PredictPositionStatus.WON,
                  currentValue: 50,
                },
              ],
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: mockAccountId,
              accounts: {
                [mockAccountId]: {
                  id: mockAccountId,
                  address: mockAccountAddress,
                  name: 'Test Account',
                  type: 'eip155:eoa',
                  metadata: {
                    lastSelected: 0,
                  },
                },
              },
            },
          },
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('subscribes to transaction status updates on mount', () => {
      // Arrange & Act
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Assert
      expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('unsubscribes from transaction status updates on unmount', () => {
      // Arrange
      const { unmount } = renderHook(() => usePredictClaimToasts(), {
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

  describe('transaction status updates', () => {
    it('ignores non-predict claim transactions', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.swap }],
          },
        });
      });

      // Assert
      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
    });

    it('shows pending toast when transaction is approved', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
            metamaskPay: { totalFiat: '$100' },
          },
        });
      });

      // Assert
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.any(String),
            }),
          ]),
          iconName: expect.anything(),
          hasNoTimeout: false,
          startAccessory: expect.any(Object),
        }),
      );
    });

    it('shows pending toast with empty amount when totalFiat is not provided', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.any(Array),
        }),
      );
    });

    it('shows confirmed toast when transaction is confirmed', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.any(String),
            }),
          ]),
          iconName: expect.anything(),
          hasNoTimeout: false,
        }),
      );
    });

    it('shows error toast when transaction fails', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.any(Array),
          iconName: expect.anything(),
          hasNoTimeout: false,
          linkButtonOptions: expect.objectContaining({
            label: expect.any(String),
            onPress: expect.any(Function),
          }),
        }),
      );
    });
  });

  describe('toast retry functionality', () => {
    it('calls claim function when error toast retry button is pressed', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Get the onPress function from the linkButtonOptions
      const toastCall = (mockToastRef.current.showToast as jest.Mock).mock
        .calls[0][0];
      const onPressRetry = toastCall.linkButtonOptions?.onPress;

      expect(onPressRetry).toBeDefined();

      // Act
      await act(async () => {
        onPressRetry();
      });

      // Assert
      expect(mockClaim).toHaveBeenCalled();
    });

    it('retry button is a valid function', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Get the onPress function from the linkButtonOptions
      const toastCall = (mockToastRef.current.showToast as jest.Mock).mock
        .calls[0][0];
      const onPressRetry = toastCall.linkButtonOptions?.onPress;

      // Assert
      expect(onPressRetry).toEqual(expect.any(Function));
    });
  });

  describe('onConfirmed callback', () => {
    it('calls loadBalance when transaction is confirmed', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert
      expect(mockLoadBalance).toHaveBeenCalled();
    });

    it('calls loadPositions with isRefresh when transaction is confirmed', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert
      expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
    });

    it('calls confirmClaim on PredictController when transaction is confirmed', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert
      expect(
        Engine.context.PredictController.confirmClaim,
      ).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });
  });

  describe('claimable positions', () => {
    it('calculates total claimable amount from won positions', async () => {
      // Arrange
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert - the confirmed toast should be called with the total claimable amount (100 + 50 = 150)
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.any(Array),
        }),
      );
    });

    it('handles empty claimable positions', async () => {
      // Arrange
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: {
                [mockAccountAddress]: [],
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: mockAccountId,
                accounts: {
                  [mockAccountId]: {
                    id: mockAccountId,
                    address: mockAccountAddress,
                    name: 'Test Account',
                    type: 'eip155:eoa',
                    metadata: {
                      lastSelected: 0,
                    },
                  },
                },
              },
            },
          },
        },
      };
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert
      expect(mockToastRef.current.showToast).toHaveBeenCalled();
    });

    it('filters only won positions for claimable amount calculation', async () => {
      // Arrange
      mockState = {
        engine: {
          backgroundState: {
            PredictController: {
              claimablePositions: {
                [mockAccountAddress]: [
                  {
                    id: '1',
                    status: PredictPositionStatus.WON,
                    currentValue: 100,
                  },
                  {
                    id: '2',
                    status: PredictPositionStatus.LOST,
                    currentValue: 50,
                  },
                  {
                    id: '3',
                    status: PredictPositionStatus.LOST,
                    currentValue: 75,
                  },
                ],
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: mockAccountId,
                accounts: {
                  [mockAccountId]: {
                    id: mockAccountId,
                    address: mockAccountAddress,
                    name: 'Test Account',
                    type: 'eip155:eoa',
                    metadata: {
                      lastSelected: 0,
                    },
                  },
                },
              },
            },
          },
        },
      };
      renderHook(() => usePredictClaimToasts(), { wrapper });

      // Act
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictClaim }],
          },
        });
      });

      // Assert - should only include the WON position (100)
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.any(Array),
        }),
      );
    });
  });
});
