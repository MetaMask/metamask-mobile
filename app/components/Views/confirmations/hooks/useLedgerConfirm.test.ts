import { renderHook, act } from '@testing-library/react-native';
import { useLedgerConfirm } from './useLedgerConfirm';

const mockEnsureDeviceReady = jest.fn();
const mockSetPendingOperationAddress = jest.fn();
const mockShowAwaitingConfirmation = jest.fn();
const mockHideAwaitingConfirmation = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockIsUserCancellation = jest.fn().mockReturnValue(false);

jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    ensureDeviceReady: mockEnsureDeviceReady,
    setPendingOperationAddress: mockSetPendingOperationAddress,
    showAwaitingConfirmation: mockShowAwaitingConfirmation,
    hideAwaitingConfirmation: mockHideAwaitingConfirmation,
    showHardwareWalletError: mockShowHardwareWalletError,
  }),
  isUserCancellation: (...args: unknown[]) => mockIsUserCancellation(...args),
}));

const mockGetDeviceIdForAddress = jest.fn().mockResolvedValue('device-123');
jest.mock('../../../../core/HardwareWallet/helpers', () => ({
  getDeviceIdForAddress: (...args: unknown[]) =>
    mockGetDeviceIdForAddress(...args),
}));

describe('useLedgerConfirm', () => {
  const onReject = jest.fn();
  const onTransactionConfirm = jest.fn().mockResolvedValue(undefined);
  const executeApproval = jest.fn().mockResolvedValue(undefined);

  const defaultOptions = {
    fromAddress: '0x1234567890abcdef1234567890abcdef12345678',
    onReject,
    onTransactionConfirm,
    executeApproval,
    isTransactionReq: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureDeviceReady.mockResolvedValue(true);
  });

  it('calls executeApproval for message signing when device is ready', async () => {
    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockEnsureDeviceReady).toHaveBeenCalledWith('device-123', undefined);
    expect(mockSetPendingOperationAddress).toHaveBeenNthCalledWith(
      1,
      defaultOptions.fromAddress,
    );
    expect(
      mockSetPendingOperationAddress.mock.invocationCallOrder[0],
    ).toBeLessThan(mockEnsureDeviceReady.mock.invocationCallOrder[0]);
    expect(mockSetPendingOperationAddress).toHaveBeenLastCalledWith(null);
    expect(mockGetDeviceIdForAddress).toHaveBeenCalledWith(
      defaultOptions.fromAddress,
    );
    expect(mockShowAwaitingConfirmation).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
    expect(executeApproval).toHaveBeenCalledTimes(1);
    expect(mockHideAwaitingConfirmation).toHaveBeenCalledTimes(1);
    expect(onReject).not.toHaveBeenCalled();
  });

  it('calls onTransactionConfirm for transaction signing when device is ready', async () => {
    const { result } = renderHook(() =>
      useLedgerConfirm({ ...defaultOptions, isTransactionReq: true }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockShowAwaitingConfirmation).toHaveBeenCalledWith(
      'transaction',
      expect.any(Function),
    );
    expect(onTransactionConfirm).toHaveBeenCalledWith({
      onError: expect.any(Function),
    });
    expect(executeApproval).not.toHaveBeenCalled();
  });

  it('continues with readiness check when device id is unavailable', async () => {
    mockGetDeviceIdForAddress.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockEnsureDeviceReady).toHaveBeenCalledWith(undefined, undefined);
    expect(executeApproval).toHaveBeenCalledTimes(1);
  });

  it('rejects when device is not ready', async () => {
    mockEnsureDeviceReady.mockResolvedValue(false);

    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(mockShowAwaitingConfirmation).not.toHaveBeenCalled();
    expect(executeApproval).not.toHaveBeenCalled();
  });

  it('shows hardware wallet error and rejects on non-user-cancellation error', async () => {
    const signingError = new Error('signing failed');
    executeApproval.mockRejectedValueOnce(signingError);

    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockHideAwaitingConfirmation).toHaveBeenCalledTimes(1);
    expect(mockShowHardwareWalletError).toHaveBeenCalledWith(signingError);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('does not show hardware wallet error on user cancellation', async () => {
    const userCancelError = new Error('User rejected');
    executeApproval.mockRejectedValueOnce(userCancelError);
    mockIsUserCancellation.mockReturnValueOnce(true);

    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockHideAwaitingConfirmation).toHaveBeenCalledTimes(1);
    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('rejects only once when cancellation callback fires after error', async () => {
    jest.useFakeTimers();
    try {
      executeApproval.mockRejectedValueOnce(new Error('fail'));
      mockShowAwaitingConfirmation.mockImplementation(
        (_type: string, cancelCb: () => void) => {
          setTimeout(cancelCb, 0);
        },
      );

      const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

      await act(async () => {
        await result.current.onConfirm();
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(onReject).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('passes ensureDeviceReadyOptions to ensureDeviceReady', async () => {
    const options = { requireBlindSigning: false };

    const { result } = renderHook(() =>
      useLedgerConfirm({
        ...defaultOptions,
        ensureDeviceReadyOptions: options,
      }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockEnsureDeviceReady).toHaveBeenCalledWith('device-123', options);
  });

  it('passes undefined options when ensureDeviceReadyOptions not provided', async () => {
    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockEnsureDeviceReady).toHaveBeenCalledWith('device-123', undefined);
  });
});
