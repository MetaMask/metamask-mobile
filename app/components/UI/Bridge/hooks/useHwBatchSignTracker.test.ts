import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useHwBatchSignTracker } from './useHwBatchSignTracker';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsEventType,
} from '../Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

jest.mock('../../../../core/Engine', () => ({
  rejectPendingApproval: jest.fn(),
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    TransactionController: {
      abortTransactionSigning: jest.fn(),
      state: {
        transactions: [],
      },
    },
    ApprovalController: {
      acceptRequest: jest.fn().mockResolvedValue(undefined),
      state: {
        pendingApprovals: {},
      },
    },
  },
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  updateHardwareWalletsSwaps: jest.fn((action) => action),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn((action) => action),
  useSelector: jest.fn(),
}));

let mockWalletType: string | undefined;

jest.mock('../../../../core/HardwareWallet', () => ({
  executeHardwareWalletOperation: jest.fn(async ({ execute }) => {
    await execute();
    return true;
  }),
  useHardwareWallet: () => ({
    walletType: mockWalletType,
    ensureDeviceReady: jest.fn().mockResolvedValue(true),
    setPendingOperationAddress: jest.fn(),
    showAwaitingConfirmation: jest.fn(),
    hideAwaitingConfirmation: jest.fn(),
    showHardwareWalletError: jest.fn(),
  }),
}));

import Engine from '../../../../core/Engine';
import { executeHardwareWalletOperation } from '../../../../core/HardwareWallet';

const mockSubscribe = Engine.controllerMessenger.subscribe as jest.Mock;
const mockUnsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;
const mockAbortTransactionSigning = Engine.context.TransactionController
  .abortTransactionSigning as jest.Mock;
const mockExecuteHardwareWalletOperation =
  executeHardwareWalletOperation as jest.Mock;

const FROM_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

interface MockTransactionMeta {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  txParams: { from: string };
  batchId?: string;
}

interface MockApprovalState {
  pendingApprovals: Record<string, { id: string; type: string }>;
}
interface MockTransactionState {
  transactions: MockTransactionMeta[];
}

function setMockPendingApprovals(
  approvals: MockApprovalState['pendingApprovals'],
) {
  (
    Engine.context.ApprovalController.state as MockApprovalState
  ).pendingApprovals = approvals;
}

function setMockTransactions(txs: MockTransactionMeta[]) {
  (
    Engine.context.TransactionController.state as MockTransactionState
  ).transactions = txs;
}

function getSubscribeHandler(eventName: string): (...args: unknown[]) => void {
  const call = mockSubscribe.mock.calls.find(
    ([event]: [string]) => event === eventName,
  );
  const handler = call?.[1];
  if (!handler) throw new Error(`No handler found for ${eventName}`);
  return handler as (...args: unknown[]) => void;
}

function makeTransactionMeta(
  type: TransactionType,
  status: TransactionStatus,
  from = FROM_ADDRESS,
  batchId?: string,
) {
  return {
    id: `${type}-${status}-${Date.now()}`,
    type,
    status,
    txParams: { from },
    batchId,
  } satisfies MockTransactionMeta;
}

function renderEnabledHook() {
  return renderHook(() =>
    useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
  );
}

describe('useHwBatchSignTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletType = undefined;
  });

  it('does not subscribe when disabled', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: false }),
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('does not subscribe when fromAddress is undefined', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: undefined, isEnabled: true }),
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('subscribes to TransactionController events when enabled', () => {
    renderEnabledHook();

    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionStatusUpdated',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionRejected',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionFailed',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'ApprovalController:stateChange',
      expect.any(Function),
    );
  });

  it('unsubscribes on cleanup', () => {
    const { unmount } = renderEnabledHook();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(4);
  });

  it('does not resubscribe when re-rendered with the same props', () => {
    const { rerender } = renderEnabledHook();

    rerender();

    expect(mockSubscribe).toHaveBeenCalledTimes(4);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'SIGNING when approval tx is approved',
      txType: TransactionType.bridgeApproval,
      status: TransactionStatus.approved,
      event: 'TransactionController:transactionStatusUpdated',
      expected: {
        type: HardwareWalletsSwapsEventType.Signing,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    },
    {
      name: 'SIGNING with Transaction stepKind for bridge tx',
      txType: TransactionType.bridge,
      status: TransactionStatus.approved,
      event: 'TransactionController:transactionStatusUpdated',
      expected: {
        type: HardwareWalletsSwapsEventType.Signing,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      },
    },
    {
      name: 'SIGNED when approval tx is signed',
      txType: TransactionType.bridgeApproval,
      status: TransactionStatus.signed,
      event: 'TransactionController:transactionStatusUpdated',
      expected: {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    },
    {
      name: 'SIGNED with Transaction stepKind for bridge tx',
      txType: TransactionType.bridge,
      status: TransactionStatus.signed,
      event: 'TransactionController:transactionStatusUpdated',
      expected: {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      },
    },
    {
      name: 'REJECTED when transaction is rejected',
      txType: TransactionType.bridgeApproval,
      status: TransactionStatus.rejected,
      event: 'TransactionController:transactionRejected',
      expected: {
        type: HardwareWalletsSwapsEventType.Rejected,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    },
    {
      name: 'TRANSACTION_FAILED when transaction fails',
      txType: TransactionType.bridge,
      status: TransactionStatus.failed,
      event: 'TransactionController:transactionFailed',
      expected: {
        type: HardwareWalletsSwapsEventType.TransactionFailed,
      },
    },
  ])('dispatches $name', ({ txType, status, event, expected }) => {
    renderEnabledHook();

    const handler = getSubscribeHandler(event);

    act(() => {
      handler({ transactionMeta: makeTransactionMeta(txType, status) });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith(expected);
  });

  it('ignores events from a different address', () => {
    renderEnabledHook();

    const handler = getSubscribeHandler(
      'TransactionController:transactionStatusUpdated',
    );

    act(() => {
      handler({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridge,
          TransactionStatus.signed,
          '0xdifferentAddress0000000000000000000000000',
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('ignores non-bridge/swap transaction types', () => {
    renderEnabledHook();

    const handler = getSubscribeHandler(
      'TransactionController:transactionStatusUpdated',
    );

    act(() => {
      handler({
        transactionMeta: makeTransactionMeta(
          TransactionType.simpleSend,
          TransactionStatus.signed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch REJECTED twice for the same transaction', () => {
    renderEnabledHook();

    const handler = getSubscribeHandler(
      'TransactionController:transactionRejected',
    );

    const txMeta = makeTransactionMeta(
      TransactionType.bridgeApproval,
      TransactionStatus.rejected,
    );

    act(() => {
      handler({ transactionMeta: txMeta });
      handler({ transactionMeta: txMeta });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);
  });

  describe('stale batch filtering', () => {
    it('accepts all events when batch ID is undefined (initial state)', () => {
      renderEnabledHook();

      const handler = getSubscribeHandler(
        'TransactionController:transactionStatusUpdated',
      );

      act(() => {
        handler({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridge,
            TransactionStatus.signed,
            FROM_ADDRESS,
            'batch-1',
          ),
        });
      });

      expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      });
    });

    it('sets batch ID on first approved tx and accepts matching batch events', () => {
      renderEnabledHook();

      const statusHandler = getSubscribeHandler(
        'TransactionController:transactionStatusUpdated',
      );

      act(() => {
        statusHandler({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridgeApproval,
            TransactionStatus.approved,
            FROM_ADDRESS,
            'batch-abc',
          ),
        });
      });

      expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Signing,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      });

      act(() => {
        statusHandler({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridgeApproval,
            TransactionStatus.signed,
            FROM_ADDRESS,
            'batch-abc',
          ),
        });
      });

      expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      });
    });

    it('blocks events after cancelCurrentBatch sets batch ID to null', async () => {
      const { result } = renderEnabledHook();

      const statusHandler = getSubscribeHandler(
        'TransactionController:transactionStatusUpdated',
      );

      const rejectedHandler = getSubscribeHandler(
        'TransactionController:transactionRejected',
      );

      act(() => {
        statusHandler({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridgeApproval,
            TransactionStatus.approved,
            FROM_ADDRESS,
            'batch-old',
          ),
        });
      });

      (updateHardwareWalletsSwaps as unknown as jest.Mock).mockClear();

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      act(() => {
        rejectedHandler({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridgeApproval,
            TransactionStatus.rejected,
            FROM_ADDRESS,
            'batch-old',
          ),
        });
      });

      expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
    });

    it('calls abortTransactionSigning for tracked txs on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();

      const statusHandler = getSubscribeHandler(
        'TransactionController:transactionStatusUpdated',
      );

      const txMeta = makeTransactionMeta(
        TransactionType.bridgeApproval,
        TransactionStatus.approved,
        FROM_ADDRESS,
        'batch-xyz',
      );

      act(() => {
        statusHandler({ transactionMeta: txMeta });
      });

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      expect(mockAbortTransactionSigning).toHaveBeenCalledWith(txMeta.id);
    });

    it('exposes confirmationTxId reactively', () => {
      const { result } = renderEnabledHook();

      expect(result.current.confirmationTxId).toBeUndefined();

      const statusHandler = getSubscribeHandler(
        'TransactionController:transactionStatusUpdated',
      );

      const txId = 'tx-fixed-id-001';

      act(() => {
        statusHandler({
          transactionMeta: {
            ...makeTransactionMeta(
              TransactionType.bridgeApproval,
              TransactionStatus.approved,
              FROM_ADDRESS,
              'batch-123',
            ),
            id: txId,
          },
        });
      });

      expect(result.current.confirmationTxId).toBe(txId);

      act(() => {
        statusHandler({
          transactionMeta: {
            ...makeTransactionMeta(
              TransactionType.bridgeApproval,
              TransactionStatus.signed,
              FROM_ADDRESS,
              'batch-123',
            ),
            id: txId,
          },
        });
      });

      expect(result.current.confirmationTxId).toBeUndefined();
    });

    it('clears confirmationTxId on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();

      const statusHandler = getSubscribeHandler(
        'TransactionController:transactionStatusUpdated',
      );

      act(() => {
        statusHandler({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridgeApproval,
            TransactionStatus.approved,
            FROM_ADDRESS,
            'batch-cancel',
          ),
        });
      });

      expect(result.current.confirmationTxId).toBeDefined();

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      expect(result.current.confirmationTxId).toBeUndefined();
    });
  });

  describe('approval acceptance', () => {
    it('accepts pending approval requests for matching bridge transactions', async () => {
      const txId = 'tx-approval-001';
      setMockTransactions([
        {
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          txParams: { from: FROM_ADDRESS },
        },
      ]);
      setMockPendingApprovals({
        [txId]: { id: txId, type: 'transaction' },
      });

      renderEnabledHook();

      const handler = getSubscribeHandler('ApprovalController:stateChange');

      await act(async () => {
        await handler();
      });

      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).toHaveBeenCalledWith(txId, undefined, { waitForResult: true });
    });

    it('does not accept non-transaction approval requests', async () => {
      setMockPendingApprovals({
        'sig-001': { id: 'sig-001', type: 'personal_sign' },
      });

      renderEnabledHook();

      const handler = getSubscribeHandler('ApprovalController:stateChange');

      await act(async () => {
        await handler();
      });

      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).not.toHaveBeenCalled();
    });

    it('does not accept the same approval request twice', async () => {
      const txId = 'tx-dup-001';
      setMockTransactions([
        {
          id: txId,
          type: TransactionType.bridge,
          status: TransactionStatus.approved,
          txParams: { from: FROM_ADDRESS },
        },
      ]);
      setMockPendingApprovals({
        [txId]: { id: txId, type: 'transaction' },
      });

      renderEnabledHook();

      const handler = getSubscribeHandler('ApprovalController:stateChange');

      await act(async () => {
        await handler();
        await handler();
      });

      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).toHaveBeenCalledTimes(1);
    });

    it('accepts pending transaction_batch approval requests through the hardware wallet operation flow', async () => {
      const batchId = 'batch-approval-001';
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });

      renderEnabledHook();

      const handler = getSubscribeHandler('ApprovalController:stateChange');

      await act(async () => {
        await handler();
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          address: FROM_ADDRESS,
          operationType: 'transaction',
          execute: expect.any(Function),
        }),
      );
      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).toHaveBeenCalledWith(batchId, undefined, { waitForResult: true });
    });

    it('clears transaction_batch dedupe and dispatches failed when hardware operation rejects', async () => {
      const batchId = 'batch-approval-rejected-001';
      mockExecuteHardwareWalletOperation.mockImplementationOnce(
        async ({
          execute,
          onRejected,
        }: {
          execute: () => Promise<void>;
          onRejected?: () => void;
        }) => {
          await execute();
          await onRejected?.();
          return false;
        },
      );
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });

      renderEnabledHook();

      const handler = getSubscribeHandler('ApprovalController:stateChange');

      await act(async () => {
        await handler();
      });

      await waitFor(() => {
        expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        });
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      });
    });

    it('ignores late transaction_batch rejection after a transaction in the batch signs', async () => {
      const batchId = 'batch-late-rejection-001';
      const txId = 'tx-late-rejection-001';
      let rejectHardwareOperation: (() => void) | undefined;
      mockExecuteHardwareWalletOperation.mockImplementationOnce(
        async ({
          execute,
          onRejected,
        }: {
          execute: () => Promise<void>;
          onRejected?: () => void;
        }) => {
          rejectHardwareOperation = onRejected;
          await execute();
          return false;
        },
      );
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });

      renderEnabledHook();

      const approvalHandler = getSubscribeHandler(
        'ApprovalController:stateChange',
      );
      const statusHandler = getSubscribeHandler(
        'TransactionController:transactionStatusUpdated',
      );

      await act(async () => {
        statusHandler({
          transactionMeta: {
            ...makeTransactionMeta(
              TransactionType.bridgeApproval,
              TransactionStatus.approved,
              FROM_ADDRESS,
              batchId,
            ),
            id: txId,
          },
        });
        await approvalHandler();
        statusHandler({
          transactionMeta: {
            ...makeTransactionMeta(
              TransactionType.bridgeApproval,
              TransactionStatus.signed,
              FROM_ADDRESS,
              batchId,
            ),
            id: txId,
          },
        });
      });
      (updateHardwareWalletsSwaps as unknown as jest.Mock).mockClear();

      await act(async () => {
        rejectHardwareOperation?.();
      });

      expect(Engine.rejectPendingApproval).not.toHaveBeenCalled();
      expect(updateHardwareWalletsSwaps).not.toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.TransactionFailed,
      });
    });

    it('processes only one approval when stateChange fires concurrently', async () => {
      const batchId = 'batch-concurrent-001';
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });

      renderEnabledHook();

      const handler = getSubscribeHandler('ApprovalController:stateChange');

      await act(async () => {
        handler();
        handler();
        handler();
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.ApprovalController.acceptRequest,
      ).toHaveBeenCalledTimes(1);
    });

    it('processes multiple distinct approvals sequentially', async () => {
      const batchId1 = 'batch-seq-001';
      const batchId2 = 'batch-seq-002';
      const callOrder: string[] = [];
      mockExecuteHardwareWalletOperation
        .mockImplementationOnce(
          async ({ execute }: { execute: () => Promise<void> }) => {
            callOrder.push('start-1');
            await execute();
            callOrder.push('end-1');
            return true;
          },
        )
        .mockImplementationOnce(
          async ({ execute }: { execute: () => Promise<void> }) => {
            callOrder.push('start-2');
            await execute();
            callOrder.push('end-2');
            return true;
          },
        );

      setMockPendingApprovals({
        [batchId1]: { id: batchId1, type: 'transaction_batch' },
        [batchId2]: { id: batchId2, type: 'transaction_batch' },
      });

      renderEnabledHook();

      const handler = getSubscribeHandler('ApprovalController:stateChange');

      await act(async () => {
        await handler();
      });

      expect(callOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
    });
  });

  describe('QR wallet batch signing', () => {
    const { HardwareWalletType: HWType } = jest.requireActual(
      '@metamask/hw-wallet-sdk',
    );

    it.each([
      {
        name: 'QR wallets',
        walletType: HWType.Qr,
        showConfirmation: false,
      },
      {
        name: 'non-QR (Ledger) wallets',
        walletType: HWType.Ledger,
        showConfirmation: true,
      },
    ])(
      'uses showConfirmation=$showConfirmation for $name',
      async ({ walletType, showConfirmation }) => {
        mockWalletType = walletType;
        const batchId = `batch-${showConfirmation}-001`;
        setMockPendingApprovals({
          [batchId]: { id: batchId, type: 'transaction_batch' },
        });

        renderEnabledHook();

        const handler = getSubscribeHandler('ApprovalController:stateChange');

        await act(async () => {
          await handler();
        });

        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            address: FROM_ADDRESS,
            operationType: 'transaction',
            showConfirmation,
            execute: expect.any(Function),
          }),
        );
        expect(
          Engine.context.ApprovalController.acceptRequest,
        ).toHaveBeenCalledWith(batchId, undefined, { waitForResult: true });
      },
    );
  });
});
