/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useHwBatchSignTracker } from './useHwBatchSignTracker';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStepKind } from '../Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

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

jest.mock('../../../../core/HardwareWallet', () => ({
  executeHardwareWalletOperation: jest.fn(async ({ execute }) => {
    await execute();
    return true;
  }),
  useHardwareWallet: () => ({
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
  } as any;
}

describe('useHwBatchSignTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

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
    const { unmount } = renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(4);
  });

  it('does not resubscribe when only hardware wallet callback identities change', () => {
    const { rerender } = renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    rerender({});

    expect(mockSubscribe).toHaveBeenCalledTimes(4);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('dispatches SIGNING when approval tx is approved', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridgeApproval,
          TransactionStatus.approved,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'SIGNING',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
  });

  it('dispatches SIGNING with Transaction stepKind for bridge tx', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridge,
          TransactionStatus.approved,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'SIGNING',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });
  });

  it('dispatches SIGNED when approval tx is signed', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridgeApproval,
          TransactionStatus.signed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'SIGNED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
  });

  it('dispatches SIGNED with Transaction stepKind for bridge tx', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridge,
          TransactionStatus.signed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'SIGNED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });
  });

  it('dispatches REJECTED when transaction is rejected', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionRejected',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridgeApproval,
          TransactionStatus.rejected,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'REJECTED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
  });

  it('dispatches TRANSACTION_FAILED when transaction fails', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionFailed',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridge,
          TransactionStatus.failed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'TRANSACTION_FAILED',
    });
  });

  it('ignores events from a different address', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
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
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.simpleSend,
          TransactionStatus.signed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch REJECTED twice for the same transaction', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionRejected',
    )?.[1];

    const txMeta = makeTransactionMeta(
      TransactionType.bridgeApproval,
      TransactionStatus.rejected,
    );

    act(() => {
      handler!({ transactionMeta: txMeta });
      handler!({ transactionMeta: txMeta });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);
  });

  describe('stale batch filtering', () => {
    it('accepts all events when batch ID is undefined (initial state)', () => {
      renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const handler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      act(() => {
        handler!({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridge,
            TransactionStatus.signed,
            FROM_ADDRESS,
            'batch-1',
          ),
        });
      });

      expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
        type: 'SIGNED',
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      });
    });

    it('sets batch ID on first approved tx and accepts matching batch events', () => {
      renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const statusHandler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      act(() => {
        statusHandler!({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridgeApproval,
            TransactionStatus.approved,
            FROM_ADDRESS,
            'batch-abc',
          ),
        });
      });

      expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
        type: 'SIGNING',
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      });

      act(() => {
        statusHandler!({
          transactionMeta: makeTransactionMeta(
            TransactionType.bridgeApproval,
            TransactionStatus.signed,
            FROM_ADDRESS,
            'batch-abc',
          ),
        });
      });

      expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
        type: 'SIGNED',
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      });
    });

    it('blocks events after cancelCurrentBatch sets batch ID to null', async () => {
      const { result } = renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const statusHandler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      const rejectedHandler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'TransactionController:transactionRejected',
      )?.[1];

      act(() => {
        statusHandler!({
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
        rejectedHandler!({
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
      const { result } = renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const statusHandler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      const txMeta = makeTransactionMeta(
        TransactionType.bridgeApproval,
        TransactionStatus.approved,
        FROM_ADDRESS,
        'batch-xyz',
      );

      act(() => {
        statusHandler!({ transactionMeta: txMeta });
      });

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      expect(mockAbortTransactionSigning).toHaveBeenCalledWith(txMeta.id);
    });

    it('returns cancelCurrentBatch function', () => {
      const { result } = renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      expect(result.current.cancelCurrentBatch).toBeInstanceOf(Function);
    });

    it('exposes confirmationTxId reactively', () => {
      const { result } = renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      expect(result.current.confirmationTxId).toBeUndefined();

      const statusHandler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      const txId = 'tx-fixed-id-001';

      act(() => {
        statusHandler!({
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
        statusHandler!({
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
      const { result } = renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const statusHandler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      act(() => {
        statusHandler!({
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
      (
        Engine.context.TransactionController.state as any
      ).transactions = [
        {
          id: txId,
          type: TransactionType.bridgeApproval,
          txParams: { from: FROM_ADDRESS },
        },
      ];
      (
        Engine.context.ApprovalController.state as any
      ).pendingApprovals = {
        [txId]: { id: txId, type: 'transaction' },
      };

      renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const handler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'ApprovalController:stateChange',
      )?.[1];

      await act(async () => {
        await handler!();
      });

      expect(Engine.context.ApprovalController.acceptRequest).toHaveBeenCalledWith(
        txId,
        undefined,
        { waitForResult: true },
      );
    });

    it('does not accept non-transaction approval requests', async () => {
      (
        Engine.context.ApprovalController.state as any
      ).pendingApprovals = {
        'sig-001': { id: 'sig-001', type: 'personal_sign' },
      };

      renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const handler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'ApprovalController:stateChange',
      )?.[1];

      await act(async () => {
        await handler!();
      });

      expect(Engine.context.ApprovalController.acceptRequest).not.toHaveBeenCalled();
    });

    it('does not accept the same approval request twice', async () => {
      const txId = 'tx-dup-001';
      (
        Engine.context.TransactionController.state as any
      ).transactions = [
        {
          id: txId,
          type: TransactionType.bridge,
          txParams: { from: FROM_ADDRESS },
        },
      ];
      (
        Engine.context.ApprovalController.state as any
      ).pendingApprovals = {
        [txId]: { id: txId, type: 'transaction' },
      };

      renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const handler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'ApprovalController:stateChange',
      )?.[1];

      await act(async () => {
        await handler!();
        await handler!();
      });

      expect(Engine.context.ApprovalController.acceptRequest).toHaveBeenCalledTimes(1);
    });

    it('accepts pending transaction_batch approval requests through the hardware wallet operation flow', async () => {
      const batchId = 'batch-approval-001';
      (
        Engine.context.ApprovalController.state as any
      ).pendingApprovals = {
        [batchId]: { id: batchId, type: 'transaction_batch' },
      };

      renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const handler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'ApprovalController:stateChange',
      )?.[1];

      await act(async () => {
        await handler!();
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          address: FROM_ADDRESS,
          operationType: 'transaction',
          execute: expect.any(Function),
        }),
      );
      expect(Engine.context.ApprovalController.acceptRequest).toHaveBeenCalledWith(
        batchId,
        undefined,
        { waitForResult: true },
      );
    });

    it('clears transaction_batch dedupe and dispatches failed when hardware operation rejects', async () => {
      const batchId = 'batch-approval-rejected-001';
      mockExecuteHardwareWalletOperation.mockImplementationOnce(
        async ({ onRejected }) => {
          await onRejected?.();
          return false;
        },
      );
      (
        Engine.context.ApprovalController.state as any
      ).pendingApprovals = {
        [batchId]: { id: batchId, type: 'transaction_batch' },
      };

      renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const handler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'ApprovalController:stateChange',
      )?.[1];

      await act(async () => {
        await handler!();
        await handler!();
      });

      await waitFor(() => {
        expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
          type: 'TRANSACTION_FAILED',
        });
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(2);
      });
    });

    it('ignores late transaction_batch rejection after a transaction in the batch signs', async () => {
      const batchId = 'batch-late-rejection-001';
      const txId = 'tx-late-rejection-001';
      let rejectHardwareOperation: (() => void) | undefined;
      mockExecuteHardwareWalletOperation.mockImplementationOnce(
        async ({ execute, onRejected }) => {
          rejectHardwareOperation = onRejected;
          await execute();
          return false;
        },
      );
      (
        Engine.context.ApprovalController.state as any
      ).pendingApprovals = {
        [batchId]: { id: batchId, type: 'transaction_batch' },
      };

      renderHook(() =>
        useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
      );

      const approvalHandler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'ApprovalController:stateChange',
      )?.[1];
      const statusHandler = mockSubscribe.mock.calls.find(
        ([event]: [string]) =>
          event === 'TransactionController:transactionStatusUpdated',
      )?.[1];

      await act(async () => {
        statusHandler!({
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
        await approvalHandler!();
        statusHandler!({
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
        type: 'TRANSACTION_FAILED',
      });
    });
  });
});
