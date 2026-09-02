import { renderHook, act } from '@testing-library/react-native';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useLedgerConfirm } from './useLedgerConfirm';

const mockEnsureDeviceReady = jest.fn();
const mockSetPendingOperationAddress = jest.fn();
const mockShowAwaitingConfirmation = jest.fn();
const mockHideAwaitingConfirmation = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockIsUserCancellation = jest.fn().mockReturnValue(false);
const mockSubscribeOnceIf = jest.fn();
const mockTryUnsubscribe = jest.fn();
const mockTransactions: TransactionMeta[] = [];

function buildTransactionMeta(
  overrides: Partial<TransactionMeta> & { id: string },
): TransactionMeta {
  return {
    chainId: '0x1',
    networkClientId: 'mainnet',
    status: TransactionStatus.unapproved,
    time: 0,
    txParams: { from: '0x1234567890abcdef1234567890abcdef12345678' },
    ...overrides,
  };
}

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

const mockBatchTransactionCounts: Record<string, number> = {};

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      subscribeOnceIf: (...args: unknown[]) => mockSubscribeOnceIf(...args),
      tryUnsubscribe: (...args: unknown[]) => mockTryUnsubscribe(...args),
    },
    context: {
      TransactionController: {
        state: {
          get batchTransactionCounts() {
            return mockBatchTransactionCounts;
          },
          get transactions() {
            return mockTransactions;
          },
        },
      },
    },
  },
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
    mockTransactions.splice(0);
    Object.keys(mockBatchTransactionCounts).forEach((key) => {
      delete mockBatchTransactionCounts[key];
    });
    mockEnsureDeviceReady.mockResolvedValue(true);
  });

  it('calls executeApproval for message signing when device is ready', async () => {
    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockEnsureDeviceReady).toHaveBeenCalledWith('device-123');
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

  it('completes signing after every required batch transaction is signed', async () => {
    const transactionId = 'parent-transaction';
    const batchId = '0xbatch';
    const firstTransaction = buildTransactionMeta({
      id: 'first-transaction',
      batchId,
    });
    const secondTransaction = buildTransactionMeta({
      id: 'second-transaction',
      batchId,
    });
    mockBatchTransactionCounts[batchId] = 2;
    mockTransactions.push(
      buildTransactionMeta({
        id: transactionId,
        requiredTransactionIds: [firstTransaction.id, secondTransaction.id],
      }),
      firstTransaction,
      secondTransaction,
    );

    let signedHandler: (() => void) | undefined;
    let signedPredicate:
      | ((payload: { transactionMeta: TransactionMeta }) => boolean)
      | undefined;
    mockSubscribeOnceIf.mockImplementation(
      (
        _event: unknown,
        handler: () => void,
        predicate: (payload: { transactionMeta: TransactionMeta }) => boolean,
      ) => {
        signedHandler = handler;
        signedPredicate = predicate;
        return handler;
      },
    );
    onTransactionConfirm.mockImplementationOnce(async () => {
      firstTransaction.status = TransactionStatus.signed;
      const firstMatches = signedPredicate?.({
        transactionMeta: firstTransaction,
      });
      if (firstMatches) {
        signedHandler?.();
      }

      secondTransaction.status = TransactionStatus.signed;
      const secondMatches = signedPredicate?.({
        transactionMeta: secondTransaction,
      });
      if (secondMatches) {
        signedHandler?.();
      }
    });
    const onSigningComplete = jest.fn();
    const { result } = renderHook(() =>
      useLedgerConfirm({
        ...defaultOptions,
        isTransactionReq: true,
        onSigningComplete,
        transactionId,
      }),
    );

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockEnsureDeviceReady).toHaveBeenCalledTimes(1);
    expect(mockSubscribeOnceIf).toHaveBeenCalledTimes(1);
    expect(onTransactionConfirm).toHaveBeenCalledTimes(1);
    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(onSigningComplete).toHaveBeenCalledTimes(1);
    expect(onTransactionConfirm).toHaveBeenCalledWith({
      deferNavigation: true,
      onError: expect.any(Function),
    });
    expect(mockHideAwaitingConfirmation).toHaveBeenCalledTimes(1);
  });

  it('continues with readiness check when device id is unavailable', async () => {
    mockGetDeviceIdForAddress.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLedgerConfirm(defaultOptions));

    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mockEnsureDeviceReady).toHaveBeenCalledWith(undefined);
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
