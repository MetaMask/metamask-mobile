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
const mockTransactionData: Record<string, { quotes?: unknown[] }> = {};

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      subscribeOnceIf: (...args: unknown[]) => mockSubscribeOnceIf(...args),
      tryUnsubscribe: (...args: unknown[]) => mockTryUnsubscribe(...args),
      call: (action: string) => {
        if (action === 'TransactionController:getState') {
          return {
            batchTransactionCounts: mockBatchTransactionCounts,
            transactions: mockTransactions,
          };
        }
        if (action === 'TransactionPayController:getState') {
          return { transactionData: mockTransactionData };
        }
        throw new Error(`Unexpected messenger action: ${action}`);
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
    Object.keys(mockTransactionData).forEach((key) => {
      delete mockTransactionData[key];
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

  describe('batch signing', () => {
    const transactionId = 'parent-transaction';
    const batchId = '0xbatch';
    let firstTransaction: TransactionMeta;
    let secondTransaction: TransactionMeta;
    let signedHandler: (() => void) | undefined;
    let signedPredicate:
      | ((payload: { transactionMeta: TransactionMeta }) => boolean)
      | undefined;

    const emitSigned = (transaction: TransactionMeta) => {
      transaction.status = TransactionStatus.signed;
      const matches = signedPredicate?.({ transactionMeta: transaction });
      if (matches) {
        signedHandler?.();
      }
      return Boolean(matches);
    };

    beforeEach(() => {
      firstTransaction = buildTransactionMeta({
        id: 'first-transaction',
        batchId,
      });
      secondTransaction = buildTransactionMeta({
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

      signedHandler = undefined;
      signedPredicate = undefined;
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
    });

    it('keeps the prompt open until every required transaction is signed', async () => {
      const onSigningComplete = jest.fn();
      let firstMatched: boolean | undefined;
      let hiddenAfterFirst: number | undefined;
      let completedAfterFirst: number | undefined;
      onTransactionConfirm.mockImplementationOnce(async () => {
        firstMatched = emitSigned(firstTransaction);
        hiddenAfterFirst = mockHideAwaitingConfirmation.mock.calls.length;
        completedAfterFirst = onSigningComplete.mock.calls.length;
        emitSigned(secondTransaction);
      });
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

      expect(firstMatched).toBe(false);
      expect(hiddenAfterFirst).toBe(0);
      expect(completedAfterFirst).toBe(0);
      expect(mockSubscribeOnceIf).toHaveBeenCalledTimes(1);
      expect(onTransactionConfirm).toHaveBeenCalledWith({
        deferNavigation: true,
        onError: expect.any(Function),
      });
      expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
      expect(onSigningComplete).toHaveBeenCalledTimes(1);
      expect(mockHideAwaitingConfirmation).toHaveBeenCalledTimes(1);
      expect(onReject).not.toHaveBeenCalled();
    });

    it('completes signing before the transaction result resolves', async () => {
      const onSigningComplete = jest.fn();
      let completedBeforeResolve: number | undefined;
      onTransactionConfirm.mockImplementationOnce(async () => {
        emitSigned(firstTransaction);
        emitSigned(secondTransaction);
        completedBeforeResolve = onSigningComplete.mock.calls.length;
      });
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

      expect(completedBeforeResolve).toBe(1);
      expect(onSigningComplete).toHaveBeenCalledTimes(1);
    });

    it('does not reject or show a device error when the transaction fails after signing completes', async () => {
      const onSigningComplete = jest.fn();
      onTransactionConfirm.mockImplementationOnce(async () => {
        emitSigned(firstTransaction);
        emitSigned(secondTransaction);
        throw new Error('submission failed');
      });
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

      expect(onSigningComplete).toHaveBeenCalledTimes(1);
      expect(mockHideAwaitingConfirmation).toHaveBeenCalledTimes(1);
      expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
      expect(onReject).not.toHaveBeenCalled();
      expect(mockTryUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockSetPendingOperationAddress).toHaveBeenLastCalledWith(null);
    });

    it('rejects and shows a device error when signing fails before completion', async () => {
      const onSigningComplete = jest.fn();
      const error = new Error('device error');
      onTransactionConfirm.mockImplementationOnce(async () => {
        emitSigned(firstTransaction);
        throw error;
      });
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

      expect(onSigningComplete).not.toHaveBeenCalled();
      expect(mockHideAwaitingConfirmation).toHaveBeenCalledTimes(1);
      expect(mockShowHardwareWalletError).toHaveBeenCalledWith(error);
      expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('completes after a single non-batch leg is signed', async () => {
      const singleLeg = buildTransactionMeta({ id: 'single-leg' });
      mockTransactions.splice(0);
      Object.keys(mockBatchTransactionCounts).forEach((key) => {
        delete mockBatchTransactionCounts[key];
      });
      mockTransactions.push(
        buildTransactionMeta({
          id: transactionId,
          requiredTransactionIds: [singleLeg.id],
        }),
        singleLeg,
      );
      const onSigningComplete = jest.fn();
      let matched: boolean | undefined;
      let completedBeforeResolve: number | undefined;
      onTransactionConfirm.mockImplementationOnce(async () => {
        matched = emitSigned(singleLeg);
        completedBeforeResolve = onSigningComplete.mock.calls.length;
      });
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

      expect(matched).toBe(true);
      expect(completedBeforeResolve).toBe(1);
      expect(onSigningComplete).toHaveBeenCalledTimes(1);
    });

    it('waits for legs of later quotes when quotes are submitted sequentially', async () => {
      const firstLeg = buildTransactionMeta({ id: 'quote-1-leg' });
      const secondLeg = buildTransactionMeta({ id: 'quote-2-leg' });
      mockTransactions.splice(0);
      Object.keys(mockBatchTransactionCounts).forEach((key) => {
        delete mockBatchTransactionCounts[key];
      });
      mockTransactionData[transactionId] = { quotes: [{}, {}] };
      const parent = buildTransactionMeta({
        id: transactionId,
        requiredTransactionIds: [firstLeg.id],
      });
      mockTransactions.push(parent, firstLeg);
      const onSigningComplete = jest.fn();
      let firstMatched: boolean | undefined;
      let secondMatched: boolean | undefined;
      onTransactionConfirm.mockImplementationOnce(async () => {
        firstMatched = emitSigned(firstLeg);
        parent.requiredTransactionIds = [firstLeg.id, secondLeg.id];
        mockTransactions.push(secondLeg);
        secondMatched = emitSigned(secondLeg);
      });
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

      expect(firstMatched).toBe(false);
      expect(secondMatched).toBe(true);
      expect(onSigningComplete).toHaveBeenCalledTimes(1);
    });

    it('keeps waiting while a batch is missing legs', async () => {
      const onSigningComplete = jest.fn();
      let matched: boolean | undefined;
      const parent = mockTransactions.find((tx) => tx.id === transactionId);
      if (parent) {
        parent.requiredTransactionIds = [firstTransaction.id];
      }
      mockTransactions.splice(
        mockTransactions.findIndex((tx) => tx.id === secondTransaction.id),
        1,
      );
      onTransactionConfirm.mockImplementationOnce(async () => {
        matched = emitSigned(firstTransaction);
      });
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

      expect(matched).toBe(false);
      expect(onSigningComplete).toHaveBeenCalledTimes(1);
    });
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
