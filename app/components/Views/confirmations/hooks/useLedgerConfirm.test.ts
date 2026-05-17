import { renderHook, act } from '@testing-library/react-native';
import { useLedgerConfirm } from './useLedgerConfirm';

const mockEnsureDeviceReady = jest.fn();
const mockShowAwaitingConfirmation = jest.fn();
const mockHideAwaitingConfirmation = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockIsUserCancellation = jest.fn().mockReturnValue(false);

jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    ensureDeviceReady: mockEnsureDeviceReady,
    showAwaitingConfirmation: mockShowAwaitingConfirmation,
    hideAwaitingConfirmation: mockHideAwaitingConfirmation,
    showHardwareWalletError: mockShowHardwareWalletError,
  }),
  isUserCancellation: (...args: unknown[]) => mockIsUserCancellation(...args),
}));

const mockGetDeviceId = jest.fn().mockResolvedValue('device-123');
jest.mock('../../../../core/Ledger/Ledger', () => ({
  getDeviceId: () => mockGetDeviceId(),
}));

describe('useLedgerConfirm', () => {
  const onReject = jest.fn();
  const onTransactionConfirm = jest.fn().mockResolvedValue(undefined);
  const executeApproval = jest.fn().mockResolvedValue(undefined);

  const defaultOptions = {
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

    expect(mockEnsureDeviceReady).toHaveBeenCalledWith('device-123');
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

    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
