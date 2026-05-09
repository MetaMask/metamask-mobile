/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { act, renderHook } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useHwBatchSignTracker } from './useHwBatchSignTracker';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStepKind } from '../Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    TransactionController: {
      abortTransactionSigning: jest.fn(),
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

import Engine from '../../../../core/Engine';

const mockSubscribe = Engine.controllerMessenger.subscribe as jest.Mock;
const mockUnsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;
const mockAbortTransactionSigning = Engine.context.TransactionController
  .abortTransactionSigning as jest.Mock;

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
  });

  it('unsubscribes on cleanup', () => {
    const { unmount } = renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
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
});
