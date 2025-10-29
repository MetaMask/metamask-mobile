import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import {
  TransactionType,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { usePredictWithdrawToasts } from './usePredictWithdrawToasts';
import Engine from '../../../../core/Engine';
import { ToastContext } from '../../../../component-library/components/Toast';
import { PredictWithdrawStatus } from '../types';
import { usePredictWithdraw } from './usePredictWithdraw';

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

// Mock usePredictTrading
jest.mock('./usePredictTrading', () => ({
  usePredictTrading: jest.fn(() => ({
    prepareWithdraw: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock usePredictBalance
jest.mock('./usePredictBalance', () => ({
  usePredictBalance: jest.fn(() => ({
    balance: 100,
    hasNoBalance: false,
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadBalance: jest.fn(),
  })),
}));

// Mock usePredictWithdraw
const mockWithdraw = jest.fn();
jest.mock('./usePredictWithdraw', () => ({
  usePredictWithdraw: jest.fn(() => ({
    withdraw: mockWithdraw,
    withdrawTransaction: null,
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
      clearWithdrawTransaction: jest.fn(),
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
        withdrawTransaction: null,
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

describe('usePredictWithdrawToasts', () => {
  let mockSubscribeCallback:
    | ((payload: {
        transactionMeta: {
          status: string;
          nestedTransactions?: { type: string }[];
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
    mockWithdraw.mockClear();
    (
      Engine.context.PredictController.clearWithdrawTransaction as jest.Mock
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
            withdrawTransaction: null,
          },
        },
      },
    };

    // Reset usePredictWithdraw mock to return null transaction by default
    (usePredictWithdraw as jest.Mock).mockReturnValue({
      withdraw: mockWithdraw,
      withdrawTransaction: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('subscribes to transaction status updates on mount', () => {
      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );
    });

    it('unsubscribes from transaction status updates on unmount', () => {
      const { unmount } = renderHook(() => usePredictWithdrawToasts(), {
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
    it('ignores non-predict withdraw transactions', async () => {
      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.approved,
            nestedTransactions: [{ type: TransactionType.swap }],
          },
        });
      });

      expect(
        Engine.context.PredictController.clearWithdrawTransaction,
      ).not.toHaveBeenCalled();
      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
    });

    it('shows confirmed toast when transaction is confirmed', async () => {
      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.confirmed,
            nestedTransactions: [{ type: TransactionType.predictWithdraw }],
          },
        });
      });

      expect(
        Engine.context.PredictController.clearWithdrawTransaction,
      ).toHaveBeenCalled();
      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.any(Array),
        }),
      );
    });

    it('shows error toast when transaction fails', async () => {
      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictWithdraw }],
          },
        });
      });

      expect(
        Engine.context.PredictController.clearWithdrawTransaction,
      ).toHaveBeenCalled();
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

  describe('pending toast with useEffect', () => {
    it('shows pending toast when withdrawTransaction status is PENDING', () => {
      const mockTransaction = {
        status: PredictWithdrawStatus.PENDING,
        amount: '100',
      };

      (usePredictWithdraw as jest.Mock).mockReturnValue({
        withdraw: mockWithdraw,
        withdrawTransaction: mockTransaction,
      });

      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      expect(mockToastRef.current.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: expect.anything(),
          labelOptions: expect.any(Array),
        }),
      );
    });

    it('does not show pending toast when withdrawTransaction is null', () => {
      (usePredictWithdraw as jest.Mock).mockReturnValue({
        withdraw: mockWithdraw,
        withdrawTransaction: null,
      });

      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
    });

    it('does not show pending toast when withdrawTransaction status is not PENDING', () => {
      const mockTransaction = {
        status: PredictWithdrawStatus.CONFIRMED,
        amount: '100',
      };

      (usePredictWithdraw as jest.Mock).mockReturnValue({
        withdraw: mockWithdraw,
        withdrawTransaction: mockTransaction,
      });

      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
    });

    it('shows pending toast with correct amount when status is PENDING', () => {
      const mockTransaction = {
        status: PredictWithdrawStatus.PENDING,
        amount: '250',
      };

      (usePredictWithdraw as jest.Mock).mockReturnValue({
        withdraw: mockWithdraw,
        withdrawTransaction: mockTransaction,
      });

      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      expect(mockToastRef.current.showToast).toHaveBeenCalled();
      const callArgs = (mockToastRef.current.showToast as jest.Mock).mock
        .calls[0][0];
      expect(callArgs).toBeDefined();
    });
  });

  describe('toast retry functionality', () => {
    it('calls withdraw function when error toast retry button is pressed', async () => {
      renderHook(() => usePredictWithdrawToasts(), { wrapper });

      await act(async () => {
        mockSubscribeCallback?.({
          transactionMeta: {
            status: TransactionStatus.failed,
            nestedTransactions: [{ type: TransactionType.predictWithdraw }],
          },
        });
      });

      const toastCall = (mockToastRef.current.showToast as jest.Mock).mock
        .calls[0][0];
      const onPressRetry = toastCall.linkButtonOptions?.onPress;

      expect(onPressRetry).toBeDefined();
      expect(mockWithdraw).not.toHaveBeenCalled();

      await act(async () => {
        onPressRetry();
      });

      expect(mockWithdraw).toHaveBeenCalled();
    });
  });
});
