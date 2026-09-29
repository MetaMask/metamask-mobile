import { renderHook, act } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import React from 'react';
import { usePerpsOrderDepositTracking } from './usePerpsOrderDepositTracking';
import { ToastContext } from '../../../../component-library/components/Toast';

const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockTrack = jest.fn();

interface MockAccount {
  spendableBalance: string;
}
let mockAccountSnapshot: MockAccount | null = null;
const mockAccountCallbacks = new Set<(account: MockAccount | null) => void>();
const mockAccountUnsubscribe = jest.fn();
const mockAccountSubscribe = jest.fn(
  ({ callback }: { callback: (account: MockAccount | null) => void }) => {
    mockAccountCallbacks.add(callback);
    if (mockAccountSnapshot) {
      callback(mockAccountSnapshot);
    }
    return () => {
      mockAccountUnsubscribe();
      mockAccountCallbacks.delete(callback);
    };
  },
);

const emitAccount = (spendableBalance: string) => {
  mockAccountSnapshot = { spendableBalance };
  [...mockAccountCallbacks].forEach((callback) =>
    callback(mockAccountSnapshot),
  );
};

const toastContextValue = {
  toastRef: { current: { showToast: jest.fn(), closeToast: mockCloseToast } },
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    ToastContext.Provider,
    { value: toastContextValue },
    children,
  );

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      accountManagement: {
        deposit: {
          inProgress: jest.fn((_percent: number, transactionId: string) => ({
            inProgress: true,
            transactionId,
          })),
          takingLonger: {
            closeButtonOptions: { onPress: undefined },
          },
          tradeCanceled: { tradeCanceled: true },
          orderNotPlaced: { orderNotPlaced: true },
          error: { error: true },
        },
      },
    },
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
      unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
    },
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('@metamask/perps-controller', () => ({
  PERPS_CONSTANTS: {
    DepositTakingLongerToastDelayMs: 100,
  },
  PERPS_EVENT_PROPERTY: {
    SCREEN_TYPE: 'screen_type',
    INTERACTION_TYPE: 'interaction_type',
  },
  PERPS_EVENT_VALUE: {
    SCREEN_TYPE: {
      CANCEL_TRADE_WITH_TOKEN_TOAST: 'cancel_trade_with_token_toast',
    },
    INTERACTION_TYPE: {
      CANCEL_TRADE_WITH_TOKEN: 'cancel_trade_with_token',
    },
  },
}));

jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    account: {
      getSnapshot: () => mockAccountSnapshot,
      subscribe: mockAccountSubscribe,
    },
  }),
}));

let mockSelectedAddress = '0xinitiating';
jest.mock('../../../../store', () => ({
  store: { getState: () => ({}) },
}));
jest.mock('../selectors/selectedAccountAddress', () => ({
  selectPerpsSelectedAccountAddress: () => mockSelectedAddress,
}));

jest.mock('../constants/perpsConfig', () => ({
  PERPS_PAY_WITH_TOKEN_CREDIT_TIMEOUT_MS: 1000,
}));

jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

describe('usePerpsOrderDepositTracking', () => {
  const transactionId = 'tx-123';
  const perpsDepositMeta: TransactionMeta = {
    id: transactionId,
    type: TransactionType.perpsDepositAndOrder,
    status: TransactionStatus.submitted,
  } as TransactionMeta;

  const confirmedMeta = {
    ...perpsDepositMeta,
    status: TransactionStatus.confirmed,
  } as TransactionMeta;

  type TransactionHandler = (payload: {
    transactionMeta: TransactionMeta;
  }) => void;

  const captureTransactionHandlers = () => {
    const handlers: {
      statusUpdated?: TransactionHandler;
      failed?: TransactionHandler;
    } = {};
    mockSubscribe.mockImplementation(
      (event: string, handler: TransactionHandler) => {
        if (event === 'TransactionController:transactionStatusUpdated') {
          handlers.statusUpdated = handler;
        }
        if (event === 'TransactionController:transactionFailed') {
          handlers.failed = handler;
        }
      },
    );
    return handlers;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAccountSnapshot = { spendableBalance: '10' };
    mockAccountCallbacks.clear();
    mockSelectedAddress = '0xinitiating';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns handleDepositConfirm function', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
      wrapper,
    });

    expect(typeof result.current.handleDepositConfirm).toBe('function');
  });

  it('does nothing when transaction type is not perpsDepositAndOrder', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
      wrapper,
    });
    const otherMeta = {
      id: 'other-id',
      type: TransactionType.simpleSend,
      status: TransactionStatus.submitted,
    } as TransactionMeta;
    const callback = jest.fn();

    act(() => {
      result.current.handleDepositConfirm(otherMeta, callback);
    });

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  it('shows persistent progress toast with close button and subscribes to controller when type is perpsDepositAndOrder', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
      wrapper,
    });

    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, jest.fn());
    });

    expect(mockShowToast).toHaveBeenCalled();
    const progressToastArg = mockShowToast.mock.calls[0][0];
    expect(progressToastArg).toMatchObject({
      hasNoTimeout: true,
      closeButtonOptions: expect.objectContaining({
        onPress: expect.any(Function),
      }),
    });

    progressToastArg.closeButtonOptions.onPress();
    expect(mockCloseToast).toHaveBeenCalled();

    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionFailed',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionStatusUpdated',
      expect.any(Function),
    );
  });

  describe('HyperLiquid credit', () => {
    it('does not place the order when the deposit transaction confirms before the credit', () => {
      const handlers = captureTransactionHandlers();
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      const callback = jest.fn();
      act(() => {
        result.current.handleDepositConfirm(perpsDepositMeta, callback, '3.39');
      });

      act(() => {
        handlers.statusUpdated?.({ transactionMeta: confirmedMeta });
      });

      expect(mockAccountSubscribe).toHaveBeenCalledTimes(1);
      expect(callback).not.toHaveBeenCalled();
    });

    it('places the order once the Perps balance rises by the required credit', () => {
      const handlers = captureTransactionHandlers();
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      const callback = jest.fn();
      act(() => {
        result.current.handleDepositConfirm(perpsDepositMeta, callback, '3.39');
      });
      act(() => {
        handlers.statusUpdated?.({ transactionMeta: confirmedMeta });
      });

      act(() => {
        emitAccount('12');
      });
      expect(callback).not.toHaveBeenCalled();

      act(() => {
        emitAccount('13.39');
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockAccountUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        handlers.statusUpdated,
      );
      expect(mockUnsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionFailed',
        handlers.failed,
      );
    });

    it('places the order at once when the credit landed before the confirmation event', () => {
      const handlers = captureTransactionHandlers();
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      const callback = jest.fn();
      act(() => {
        result.current.handleDepositConfirm(perpsDepositMeta, callback, '3.39');
      });
      mockAccountSnapshot = { spendableBalance: '13.5' };

      act(() => {
        handlers.statusUpdated?.({ transactionMeta: confirmedMeta });
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockAccountUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockAccountCallbacks.size).toBe(0);
    });

    it('treats any Perps balance increase as the credit when no amount is required', () => {
      const handlers = captureTransactionHandlers();
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      const callback = jest.fn();
      act(() => {
        result.current.handleDepositConfirm(perpsDepositMeta, callback);
      });
      act(() => {
        handlers.statusUpdated?.({ transactionMeta: confirmedMeta });
      });

      act(() => {
        emitAccount('10.5');
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('places the order only once when the credit is followed by more balance updates', () => {
      const handlers = captureTransactionHandlers();
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      const callback = jest.fn();
      act(() => {
        result.current.handleDepositConfirm(perpsDepositMeta, callback, '3.39');
      });
      act(() => {
        handlers.statusUpdated?.({ transactionMeta: confirmedMeta });
        emitAccount('14');
        emitAccount('15');
        jest.advanceTimersByTime(1000);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockShowToast).not.toHaveBeenCalledWith({ orderNotPlaced: true });
    });
    it('uses the first delivery as the baseline when no account snapshot exists yet', () => {
      const handlers = captureTransactionHandlers();
      mockAccountSnapshot = null;
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      const callback = jest.fn();
      act(() => {
        result.current.handleDepositConfirm(perpsDepositMeta, callback, '3.39');
      });
      act(() => {
        handlers.statusUpdated?.({ transactionMeta: confirmedMeta });
      });

      act(() => {
        emitAccount('50');
      });
      expect(callback).not.toHaveBeenCalled();

      act(() => {
        emitAccount('53.39');
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('account switch', () => {
    it('places no order and reports it when another account is selected during the credit wait', () => {
      const handlers = captureTransactionHandlers();
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      const callback = jest.fn();
      act(() => {
        result.current.handleDepositConfirm(perpsDepositMeta, callback, '3.39');
      });
      act(() => {
        handlers.statusUpdated?.({ transactionMeta: confirmedMeta });
      });

      mockSelectedAddress = '0xother';
      act(() => {
        emitAccount('500');
      });

      expect(callback).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({ orderNotPlaced: true });
      expect(mockAccountUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('credit timeout', () => {
    it('shows the deposit received, order not placed toast and places no order', () => {
      const handlers = captureTransactionHandlers();
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      const callback = jest.fn();
      act(() => {
        result.current.handleDepositConfirm(perpsDepositMeta, callback, '3.39');
      });
      act(() => {
        handlers.statusUpdated?.({ transactionMeta: confirmedMeta });
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      act(() => {
        emitAccount('20');
      });

      expect(mockShowToast).toHaveBeenCalledWith({ orderNotPlaced: true });
      expect(callback).not.toHaveBeenCalled();
      expect(mockAccountUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('does not start the credit timeout before the deposit confirms', () => {
      captureTransactionHandlers();
      const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
        wrapper,
      });
      act(() => {
        result.current.handleDepositConfirm(
          perpsDepositMeta,
          jest.fn(),
          '3.39',
        );
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockShowToast).not.toHaveBeenCalledWith({ orderNotPlaced: true });
      expect(mockAccountSubscribe).not.toHaveBeenCalled();
    });
  });

  it('does not place the order when the credit arrives after cancel trade requested', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
      wrapper,
    });
    const handlers: {
      statusUpdated?: (payload: { transactionMeta: TransactionMeta }) => void;
    } = {};

    mockSubscribe.mockImplementation(
      (
        _event: string,
        handler: (payload: { transactionMeta: TransactionMeta }) => void,
      ) => {
        if (_event === 'TransactionController:transactionStatusUpdated') {
          handlers.statusUpdated = handler;
        }
      },
    );

    const callback = jest.fn();
    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, callback);
    });

    const callCountBeforeAdvance = mockShowToast.mock.calls.length;
    jest.advanceTimersByTime(100);

    const takingLongerCall = mockShowToast.mock.calls[callCountBeforeAdvance];
    const closeButtonOptions = takingLongerCall?.[0] as {
      closeButtonOptions?: { onPress: () => void };
    };
    act(() => {
      closeButtonOptions?.closeButtonOptions?.onPress?.();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Perp UI Interaction' }),
      expect.objectContaining({
        interaction_type: 'cancel_trade_with_token',
      }),
    );

    const statusUpdatedHandler = handlers.statusUpdated;
    expect(statusUpdatedHandler).toBeDefined();
    act(() => {
      (
        statusUpdatedHandler as (payload: {
          transactionMeta: TransactionMeta;
        }) => void
      )({
        transactionMeta: {
          ...perpsDepositMeta,
          id: transactionId,
          status: TransactionStatus.confirmed,
        } as TransactionMeta,
      });
    });
    act(() => {
      emitAccount('20');
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('shows error toast when transaction fails with matching id', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
      wrapper,
    });
    const handlers: {
      failed?: (payload: { transactionMeta: TransactionMeta }) => void;
    } = {};

    mockSubscribe.mockImplementation(
      (
        _event: string,
        handler: (payload: { transactionMeta: TransactionMeta }) => void,
      ) => {
        if (_event === 'TransactionController:transactionFailed') {
          handlers.failed = handler;
        }
      },
    );

    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, jest.fn());
    });

    mockShowToast.mockClear();

    expect(handlers.failed).toBeDefined();
    act(() => {
      (
        handlers.failed as (payload: {
          transactionMeta: TransactionMeta;
        }) => void
      )({
        transactionMeta: {
          id: transactionId,
          type: TransactionType.perpsDepositAndOrder,
        } as TransactionMeta,
      });
    });

    expect(mockShowToast).toHaveBeenCalledWith({ error: true });
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionFailed',
      handlers.failed,
    );
    expect(mockAccountSubscribe).not.toHaveBeenCalled();
  });

  it('shows taking longer toast after delay', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking(), {
      wrapper,
    });

    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, jest.fn());
    });

    mockShowToast.mockClear();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Perp Screen Viewed' }),
      expect.objectContaining({
        screen_type: 'cancel_trade_with_token_toast',
      }),
    );

    expect(mockShowToast).toHaveBeenCalled();
    expect(mockShowToast.mock.calls[0][0]).toMatchObject({
      closeButtonOptions: expect.any(Object),
    });
  });
});
