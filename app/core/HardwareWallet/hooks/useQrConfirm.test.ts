import { renderHook, act } from '@testing-library/react-native';

const mockEnsureDeviceReady = jest.fn();
const mockSetTargetWalletType = jest.fn();
const mockSetPendingOperationAddress = jest.fn();
const mockShowAwaitingConfirmation = jest.fn();
const mockHideAwaitingConfirmation = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockIsUserCancellation = jest.fn().mockReturnValue(false);
const mockSetScannerVisible = jest.fn();
const mockSetSigningConfirmed = jest.fn();
const mockExecuteHardwareWalletOperation = jest.fn();

jest.mock('..', () => ({
  useHardwareWallet: () => ({
    ensureDeviceReady: mockEnsureDeviceReady,
    setTargetWalletType: mockSetTargetWalletType,
    setPendingOperationAddress: mockSetPendingOperationAddress,
    showAwaitingConfirmation: mockShowAwaitingConfirmation,
    hideAwaitingConfirmation: mockHideAwaitingConfirmation,
    showHardwareWalletError: mockShowHardwareWalletError,
  }),
  isUserCancellation: (...args: unknown[]) => mockIsUserCancellation(...args),
  executeHardwareWalletOperation: (...args: unknown[]) =>
    mockExecuteHardwareWalletOperation(...args),
}));

const mockIsSigningQRObject = { current: false };

jest.mock(
  '../../../components/Views/confirmations/context/qr-hardware-context',
  () => ({
    useQRHardwareContext: () => ({
      isSigningQRObject: mockIsSigningQRObject.current,
      setScannerVisible: mockSetScannerVisible,
      setSigningConfirmed: mockSetSigningConfirmed,
    }),
  }),
);

import { useQrConfirm } from './useQrConfirm';

describe('useQrConfirm', () => {
  const onReject = jest.fn();
  const onTransactionConfirm = jest.fn().mockResolvedValue(undefined);
  const executeApproval = jest.fn().mockResolvedValue(undefined);

  const defaultOptions = {
    fromAddress: '0xTestAddress',
    onReject,
    onTransactionConfirm,
    executeApproval,
    isTransactionReq: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSigningQRObject.current = false;
    mockExecuteHardwareWalletOperation.mockResolvedValue(true);
  });

  it('re-shows awaiting confirmation when QR signing is already in progress', async () => {
    mockIsSigningQRObject.current = true;

    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockShowAwaitingConfirmation).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
    expect(mockSetSigningConfirmed).not.toHaveBeenCalled();
    expect(mockSetScannerVisible).not.toHaveBeenCalled();
    expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
  });

  it('calls rejectOnce when no fromAddress is available', async () => {
    const { result } = renderHook(() =>
      useQrConfirm({ ...defaultOptions, fromAddress: '' }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
  });

  it('calls executeHardwareWalletOperation for message signing', async () => {
    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xTestAddress',
        operationType: 'message',
        setPendingOperationAddress: mockSetPendingOperationAddress,
      }),
    );
  });

  it('calls executeHardwareWalletOperation for transaction with transaction type', async () => {
    const { result } = renderHook(() =>
      useQrConfirm({ ...defaultOptions, isTransactionReq: true }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xTestAddress',
        operationType: 'transaction',
        setPendingOperationAddress: mockSetPendingOperationAddress,
      }),
    );
  });

  it('calls onTransactionConfirm inside execute for transaction requests', async () => {
    mockExecuteHardwareWalletOperation.mockImplementation(
      async ({ execute }) => {
        await execute();
      },
    );

    const { result } = renderHook(() =>
      useQrConfirm({ ...defaultOptions, isTransactionReq: true }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onTransactionConfirm).toHaveBeenCalledWith({
      onError: expect.any(Function),
    });
    expect(executeApproval).not.toHaveBeenCalled();
  });

  it('calls executeApproval inside execute for message requests', async () => {
    mockExecuteHardwareWalletOperation.mockImplementation(
      async ({ execute }) => {
        await execute();
      },
    );

    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(executeApproval).toHaveBeenCalledTimes(1);
    expect(onTransactionConfirm).not.toHaveBeenCalled();
  });

  it('shows error and rejects on non-user-cancellation error', async () => {
    const signingError = new Error('signing failed');
    mockExecuteHardwareWalletOperation.mockRejectedValueOnce(signingError);

    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockShowHardwareWalletError).toHaveBeenCalledWith(signingError);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('does not show error on user cancellation', async () => {
    const userCancelError = new Error('User rejected');
    mockExecuteHardwareWalletOperation.mockRejectedValueOnce(userCancelError);
    mockIsUserCancellation.mockReturnValueOnce(true);

    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('does not show error when already rejected', async () => {
    const error = new Error('fail');
    mockExecuteHardwareWalletOperation.mockImplementation(
      async ({ onRejected }) => {
        await onRejected();
        throw error;
      },
    );

    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('uses the explicit from address option', async () => {
    const { result } = renderHook(() =>
      useQrConfirm({ ...defaultOptions, fromAddress: '0xExplicitAddress' }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xExplicitAddress',
      }),
    );
  });

  it('rethrows error from onTransactionConfirm onError callback', async () => {
    const transactionError = new Error('transaction onError thrown');
    mockExecuteHardwareWalletOperation.mockImplementation(
      async ({ execute }) => {
        await execute();
      },
    );
    onTransactionConfirm.mockImplementationOnce(async ({ onError }) => {
      onError?.(transactionError);
    });
    mockExecuteHardwareWalletOperation.mockRejectedValueOnce(transactionError);

    const { result } = renderHook(() =>
      useQrConfirm({ ...defaultOptions, isTransactionReq: true }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onReject).toHaveBeenCalled();
  });

  it('does not reject twice when onRejected is called before execute throws', async () => {
    const error = new Error('execute failed');
    onTransactionConfirm.mockImplementationOnce(async ({ onError }) => {
      onError?.(error);
    });
    mockExecuteHardwareWalletOperation.mockImplementation(
      async ({ onRejected, execute }) => {
        await onRejected();
        try {
          await execute();
        } catch (_) {
          // Already rejected
        }
      },
    );

    const { result } = renderHook(() =>
      useQrConfirm({ ...defaultOptions, isTransactionReq: true }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
