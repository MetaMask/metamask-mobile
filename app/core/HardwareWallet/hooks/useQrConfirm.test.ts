import { renderHook, act } from '@testing-library/react-native';

const mockEnsureDeviceReady = jest.fn();
const mockSetTargetWalletType = jest.fn();
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
    showAwaitingConfirmation: mockShowAwaitingConfirmation,
    hideAwaitingConfirmation: mockHideAwaitingConfirmation,
    showHardwareWalletError: mockShowHardwareWalletError,
  }),
  isUserCancellation: (...args: unknown[]) => mockIsUserCancellation(...args),
  executeHardwareWalletOperation: (...args: unknown[]) =>
    mockExecuteHardwareWalletOperation(...args),
}));

const mockApprovalRequest = { requestData: { from: '0xTestAddress' } };
const mockTransactionMetadata = { txParams: { from: '0xTestAddress' } };

jest.mock(
  '../../../components/Views/confirmations/hooks/useApprovalRequest',
  () => ({
    __esModule: true,
    default: () => ({ approvalRequest: mockApprovalRequest }),
  }),
);

jest.mock(
  '../../../components/Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: () => mockTransactionMetadata,
  }),
);

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

  it('opens scanner when QR signing is already in progress', async () => {
    mockIsSigningQRObject.current = true;

    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockSetSigningConfirmed).toHaveBeenCalled();
    expect(mockSetScannerVisible).toHaveBeenCalledWith(true);
    expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
  });

  it('calls rejectOnce when no fromAddress is available', async () => {
    const originalRequestData = mockApprovalRequest.requestData;
    const originalTxParams = mockTransactionMetadata.txParams;
    mockApprovalRequest.requestData =
      {} as typeof mockApprovalRequest.requestData;
    mockTransactionMetadata.txParams =
      {} as typeof mockTransactionMetadata.txParams;

    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();

    mockApprovalRequest.requestData = originalRequestData;
    mockTransactionMetadata.txParams = originalTxParams;
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

  it('uses from address from transaction metadata when approval request has no from', async () => {
    const originalRequestData = mockApprovalRequest.requestData;
    mockApprovalRequest.requestData =
      {} as typeof mockApprovalRequest.requestData;
    mockTransactionMetadata.txParams = { from: '0xTxMetaAddress' };

    const { result } = renderHook(() => useQrConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '0xTxMetaAddress',
      }),
    );

    mockApprovalRequest.requestData = originalRequestData;
  });
});
