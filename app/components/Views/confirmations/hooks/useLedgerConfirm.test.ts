import { renderHook, act } from '@testing-library/react-native';
import { useLedgerConfirm } from './useLedgerConfirm';

const mockExecuteHardwareWalletOperation = jest.fn();

const mockUseHardwareWallet = {
  ensureDeviceReady: jest.fn(),
  setTargetWalletType: jest.fn(),
  showAwaitingConfirmation: jest.fn(),
  hideAwaitingConfirmation: jest.fn(),
  showHardwareWalletError: jest.fn(),
};

jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => mockUseHardwareWallet,
  executeHardwareWalletOperation: (...args: unknown[]) =>
    mockExecuteHardwareWalletOperation(...args),
}));

describe('useLedgerConfirm', () => {
  const onReject = jest.fn();
  const onTransactionConfirm = jest.fn().mockResolvedValue(undefined);
  const executeApproval = jest.fn().mockResolvedValue(undefined);

  const defaultOptions = {
    fromAddress: '0x123',
    onReject,
    onTransactionConfirm,
    executeApproval,
    isTransactionReq: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteHardwareWalletOperation.mockResolvedValue(true);
  });

  it('calls executeApproval for message signing when device is ready', async () => {
    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith({
      address: '0x123',
      operationType: 'message',
      ensureDeviceReady: mockUseHardwareWallet.ensureDeviceReady,
      setTargetWalletType: mockUseHardwareWallet.setTargetWalletType,
      showAwaitingConfirmation: mockUseHardwareWallet.showAwaitingConfirmation,
      hideAwaitingConfirmation: mockUseHardwareWallet.hideAwaitingConfirmation,
      showHardwareWalletError: mockUseHardwareWallet.showHardwareWalletError,
      execute: expect.any(Function),
      onRejected: expect.any(Function),
    });
  });

  it('calls onTransactionConfirm for transaction signing when device is ready', async () => {
    const { result } = renderHook(() =>
      useLedgerConfirm({ ...defaultOptions, isTransactionReq: true }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    const executeArg = mockExecuteHardwareWalletOperation.mock.calls[0][0]
      .execute as () => Promise<void>;

    await executeArg();

    expect(onTransactionConfirm).toHaveBeenCalledWith({
      onError: expect.any(Function),
    });
  });

  it('rejects when device is not ready', async () => {
    mockExecuteHardwareWalletOperation.mockResolvedValue(false);

    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    const onRejectedArg = mockExecuteHardwareWalletOperation.mock.calls[0][0]
      .onRejected as () => void;

    onRejectedArg();

    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('passes the approval execution callback through to the shared hardware wallet operation', async () => {
    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    const executeArg = mockExecuteHardwareWalletOperation.mock.calls[0][0]
      .execute as () => Promise<void>;

    await executeArg();

    expect(executeApproval).toHaveBeenCalledTimes(1);
  });
});
