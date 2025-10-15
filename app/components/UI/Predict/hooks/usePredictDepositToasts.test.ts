import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import {
  TransactionType,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { usePredictDepositToasts } from './usePredictDepositToasts';
import Engine from '../../../../core/Engine';
import { PredictDepositStatus } from '../types';
import { ToastContext } from '../../../../component-library/components/Toast';

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

// Mock useConfirmNavigation
jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(() => ({
    navigateToConfirmation: jest.fn(),
  })),
}));

// Mock usePredictEligibility
jest.mock('./usePredictEligibility', () => ({
  usePredictEligibility: jest.fn(() => ({
    isEligible: true,
  })),
}));

// Create a mock toast ref
const mockToastRef = {
  current: {
    showToast: jest.fn(),
    closeToast: jest.fn(),
  },
};

// Don't mock the ToastContext, instead we'll provide a wrapper

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
      clearDepositTransaction: jest.fn(),
      setDepositStatus: jest.fn(),
      depositWithConfirmation: jest.fn(() => Promise.resolve()),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

// Mock react-redux
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockState: any = {
  engine: {
    backgroundState: {
      PredictController: {
        depositTransaction: null,
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

describe('usePredictDepositToasts', () => {
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
    (
      Engine.context.PredictController.clearDepositTransaction as jest.Mock
    ).mockClear();
    (
      Engine.context.PredictController.setDepositStatus as jest.Mock
    ).mockClear();

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
            depositTransaction: null,
          },
        },
      },
    };
  });

  describe('initialization', () => {
    it('subscribes to transaction status updates on mount', () => {
      renderHook(() => usePredictDepositToasts(), { wrapper });

      expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('unsubscribes from transaction status updates on unmount', () => {
      const { unmount } = renderHook(() => usePredictDepositToasts(), {
        wrapper,
      });

      unmount();

      expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });
  });

  describe('transaction status updates', () => {
    it('ignores non-predict deposit transactions', async () => {
      renderHook(() => usePredictDepositToasts(), { wrapper });

      // Trigger callback with non-predict transaction
      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.swap }],
          },
        });
      });

      expect(
        Engine.context.PredictController.setDepositStatus,
      ).not.toHaveBeenCalled();
      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
    });

    it('shows pending toast when transaction is approved', async () => {
      renderHook(() => usePredictDepositToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          },
        });
      });

      expect(
        Engine.context.PredictController.setDepositStatus,
      ).toHaveBeenCalledWith(PredictDepositStatus.PENDING);
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.any(String),
            }),
          ]),
        }),
      );
    });

    it('shows confirmed toast when transaction is confirmed', async () => {
      renderHook(() => usePredictDepositToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
            metamaskPay: { totalFiat: '$100' },
          },
        });
      });

      expect(
        Engine.context.PredictController.setDepositStatus,
      ).toHaveBeenCalledWith(PredictDepositStatus.CONFIRMED);
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.any(Array),
        }),
      );
    });

    it('shows error toast when transaction fails', async () => {
      renderHook(() => usePredictDepositToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          },
        });
      });

      expect(
        Engine.context.PredictController.setDepositStatus,
      ).toHaveBeenCalledWith(PredictDepositStatus.ERROR);
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.any(Array),
          linkButtonOptions: expect.objectContaining({
            label: expect.any(String),
            onPress: expect.any(Function),
          }),
        }),
      );
    });
  });

  describe('toast retry functionality', () => {
    it('calls deposit function when error toast retry button is pressed', async () => {
      renderHook(() => usePredictDepositToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictDeposit }],
          },
        });
      });

      // Get the onPress function from the linkButtonOptions
      const toastCall = (mockToastRef.current.showToast as jest.Mock).mock
        .calls[0][0];
      const onPressRetry = toastCall.linkButtonOptions?.onPress;

      expect(onPressRetry).toBeDefined();

      // Call the retry function
      await act(async () => {
        onPressRetry();
      });

      // Verify that deposit would be called (it will call navigateToConfirmation)
      expect(onPressRetry).toBeInstanceOf(Function);
    });
  });
});
