import { renderHook, act } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { usePerpsOrderDepositTracking } from './usePerpsOrderDepositTracking';

const mockShowToast = jest.fn();
const mockSubscribe = jest.fn();

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
}));

describe('usePerpsOrderDepositTracking', () => {
  const transactionId = 'tx-123';
  const perpsDepositMeta: TransactionMeta = {
    id: transactionId,
    type: TransactionType.perpsDepositAndOrder,
    status: TransactionStatus.submitted,
  } as TransactionMeta;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns handleDepositConfirm function', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking());

    expect(typeof result.current.handleDepositConfirm).toBe('function');
  });

  it('does nothing when transaction type is not perpsDepositAndOrder', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking());
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

  it('shows progress toast and subscribes to controller when type is perpsDepositAndOrder', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking());

    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, jest.fn());
    });

    expect(mockShowToast).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionFailed',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionStatusUpdated',
      expect.any(Function),
    );
  });

  it('invokes callback when transaction status becomes confirmed', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking());
    let statusUpdatedHandler: (payload: {
      transactionMeta: TransactionMeta;
    }) => void;

    mockSubscribe.mockImplementation(
      (
        _event: string,
        handler: (payload: { transactionMeta: TransactionMeta }) => void,
      ) => {
        if (_event === 'TransactionController:transactionStatusUpdated') {
          statusUpdatedHandler = handler;
        }
      },
    );

    const callback = jest.fn();
    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, callback);
    });

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

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not invoke callback when transaction confirms after cancel trade requested', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking());
    let statusUpdatedHandler: (payload: {
      transactionMeta: TransactionMeta;
    }) => void;

    mockSubscribe.mockImplementation(
      (
        _event: string,
        handler: (payload: { transactionMeta: TransactionMeta }) => void,
      ) => {
        if (_event === 'TransactionController:transactionStatusUpdated') {
          statusUpdatedHandler = handler;
        }
      },
    );

    const callback = jest.fn();
    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, callback);
    });

    jest.advanceTimersByTime(100);

    const takingLongerCall = mockShowToast.mock.calls.find(
      (call: unknown[]) =>
        Array.isArray(call) &&
        call[0] &&
        typeof call[0] === 'object' &&
        'closeButtonOptions' in (call[0] as Record<string, unknown>),
    );
    const closeButtonOptions = takingLongerCall?.[0] as {
      closeButtonOptions?: { onPress: () => void };
    };
    act(() => {
      closeButtonOptions?.closeButtonOptions?.onPress?.();
    });

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

    expect(callback).not.toHaveBeenCalled();
  });

  it('shows error toast when transaction fails with matching id', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking());
    let failedHandler: (payload: { transactionMeta: TransactionMeta }) => void;

    mockSubscribe.mockImplementation(
      (
        _event: string,
        handler: (payload: { transactionMeta: TransactionMeta }) => void,
      ) => {
        if (_event === 'TransactionController:transactionFailed') {
          failedHandler = handler;
        }
      },
    );

    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, jest.fn());
    });

    mockShowToast.mockClear();

    expect(failedHandler).toBeDefined();
    act(() => {
      (
        failedHandler as (payload: { transactionMeta: TransactionMeta }) => void
      )({
        transactionMeta: {
          id: transactionId,
          type: TransactionType.perpsDepositAndOrder,
        } as TransactionMeta,
      });
    });

    expect(mockShowToast).toHaveBeenCalledWith({ error: true });
  });

  it('shows taking longer toast after delay', () => {
    const { result } = renderHook(() => usePerpsOrderDepositTracking());

    act(() => {
      result.current.handleDepositConfirm(perpsDepositMeta, jest.fn());
    });

    mockShowToast.mockClear();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockShowToast).toHaveBeenCalled();
    expect(mockShowToast.mock.calls[0][0]).toMatchObject({
      closeButtonOptions: expect.any(Object),
    });
  });
});
