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
  type HardwareWalletsSwapsEvent,
} from './HardwareWalletsSwaps.state';

jest.mock('../../../../core/Engine', () => ({
  rejectPendingApproval: jest.fn(),
  controllerMessenger: {
    call: jest.fn(),
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
const mockControllerMessengerCall = Engine.controllerMessenger
  .call as jest.Mock;
const mockAbortTransactionSigning = Engine.context.TransactionController
  .abortTransactionSigning as jest.Mock;
const mockExecuteHardwareWalletOperation =
  executeHardwareWalletOperation as jest.Mock;
const mockAcceptRequest = Engine.context.ApprovalController
  .acceptRequest as jest.Mock;
const mockUpdateSwaps = updateHardwareWalletsSwaps as unknown as jest.Mock;

// ---------- Constants ----------

const FROM_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

const EVENT = {
  status: 'TransactionController:transactionStatusUpdated',
  rejected: 'TransactionController:transactionRejected',
  failed: 'TransactionController:transactionFailed',
  approval: 'ApprovalController:stateChange',
} as const;

const EXPECT_SIGNED_APPROVAL: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Signed,
  payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
};
const EXPECT_SIGNED_TX: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Signed,
  payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
};
const EXPECT_SIGNING_APPROVAL: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Signing,
  payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
};
const EXPECT_SIGNING_TX: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Signing,
  payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
};
const EXPECT_REJECTED_APPROVAL: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Rejected,
  payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
};
const EXPECT_TX_FAILED: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.TransactionFailed,
};

// ---------- Types ----------

interface MockTransactionMeta {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  txParams: { from: string };
  batchId?: string;
  chainId?: string;
}

interface MockApprovalState {
  pendingApprovals: Record<string, { id: string; type: string }>;
}

interface MockTransactionState {
  transactions: MockTransactionMeta[];
}

type StatusHandler = (...args: unknown[]) => void;

// ---------- Mock state helpers ----------

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

// ---------- Event subscription helpers ----------

function getSubscribeHandler(eventName: string): StatusHandler {
  const call = mockSubscribe.mock.calls.find(
    ([event]: [string]) => event === eventName,
  );
  const handler = call?.[1];
  if (!handler) throw new Error(`No handler found for ${eventName}`);
  return handler as StatusHandler;
}

const getStatusHandler = () => getSubscribeHandler(EVENT.status);
const getRejectedHandler = () => getSubscribeHandler(EVENT.rejected);
const getApprovalHandler = () => getSubscribeHandler(EVENT.approval);

/** Collect every status handler that has been subscribed (initial + cancel-waiters). */
function getAllStatusHandlers(): StatusHandler[] {
  return mockSubscribe.mock.calls
    .filter(([e]: [string]) => e === EVENT.status)
    .map(([, h]: [string, StatusHandler]) => h);
}

/** Fire a transaction-meta event on the given (or default status) handler inside act(). */
function fireTxEvent(
  meta: MockTransactionMeta,
  handler?: StatusHandler,
  eventName: keyof typeof EVENT = 'status',
) {
  const h = handler ?? getSubscribeHandler(EVENT[eventName]);
  act(() => {
    h({ transactionMeta: meta });
  });
}

/** Broadcast a transaction-meta event to every status handler (incl. waiters). */
function broadcastTxEvent(meta: MockTransactionMeta) {
  act(() => {
    getAllStatusHandlers().forEach((h) => h({ transactionMeta: meta }));
  });
}

// ---------- Transaction meta factory ----------

let _txCounter = 0;
function txMeta(
  overrides: Pick<MockTransactionMeta, 'type' | 'status'> &
    Partial<Omit<MockTransactionMeta, 'type' | 'status'>>,
): MockTransactionMeta {
  _txCounter += 1;
  return {
    id: `tx-${overrides.type}-${overrides.status}-${_txCounter}`,
    txParams: { from: FROM_ADDRESS },
    ...overrides,
  };
}

// ---------- Hook render helpers ----------

function renderEnabledHook(
  props: { retryGenerationRef?: { current: number } } = {},
) {
  return renderHook(() =>
    useHwBatchSignTracker({
      fromAddress: FROM_ADDRESS,
      isEnabled: true,
      retryGenerationRef: props.retryGenerationRef,
    }),
  );
}

/** Set up a `transaction_batch` pending approval, render the hook, and pump the approval handler. */
async function processBatchApproval(batchId: string) {
  setMockPendingApprovals({
    [batchId]: { id: batchId, type: 'transaction_batch' },
  });
  renderEnabledHook();
  await act(async () => {
    await getApprovalHandler()();
  });
}

// ---------- Hardware operation mock helpers ----------

interface HwOpMockOpts {
  execute: () => Promise<void>;
  onRejected?: () => void | Promise<void>;
}

/**
 * Mock the next `executeHardwareWalletOperation` call.
 * The provided impl receives the resolved options and must return the
 * operation result (true = success, false = rejected).
 */
function mockHwOpOnce(impl: (opts: HwOpMockOpts) => Promise<boolean>) {
  mockExecuteHardwareWalletOperation.mockImplementationOnce(
    async (opts: HwOpMockOpts) => impl(opts),
  );
}

// ---------- Tests ----------

describe('useHwBatchSignTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletType = undefined;
    setMockPendingApprovals({});
    setMockTransactions([]);
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

    [EVENT.status, EVENT.rejected, EVENT.failed, EVENT.approval].forEach(
      (eventName) => {
        expect(mockSubscribe).toHaveBeenCalledWith(
          eventName,
          expect.any(Function),
        );
      },
    );
  });

  it('unsubscribes on cleanup', () => {
    const { unmount } = renderEnabledHook();

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(4);
  });

  it('does not resubscribe when re-rendered with the same props', () => {
    const { rerender } = renderEnabledHook();

    rerender(undefined);

    expect(mockSubscribe).toHaveBeenCalledTimes(4);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'SIGNING when approval tx is approved',
      txType: TransactionType.bridgeApproval,
      status: TransactionStatus.approved,
      eventKey: 'status' as const,
      expected: EXPECT_SIGNING_APPROVAL,
    },
    {
      name: 'SIGNING with Transaction stepKind for bridge tx',
      txType: TransactionType.bridge,
      status: TransactionStatus.approved,
      eventKey: 'status' as const,
      expected: EXPECT_SIGNING_TX,
    },
    {
      name: 'SIGNED when approval tx is signed',
      txType: TransactionType.bridgeApproval,
      status: TransactionStatus.signed,
      eventKey: 'status' as const,
      expected: EXPECT_SIGNED_APPROVAL,
    },
    {
      name: 'SIGNED with Transaction stepKind for bridge tx',
      txType: TransactionType.bridge,
      status: TransactionStatus.signed,
      eventKey: 'status' as const,
      expected: EXPECT_SIGNED_TX,
    },
    {
      name: 'REJECTED when transaction is rejected',
      txType: TransactionType.bridgeApproval,
      status: TransactionStatus.rejected,
      eventKey: 'rejected' as const,
      expected: EXPECT_REJECTED_APPROVAL,
    },
    {
      name: 'TRANSACTION_FAILED when transaction fails',
      txType: TransactionType.bridge,
      status: TransactionStatus.failed,
      eventKey: 'failed' as const,
      expected: EXPECT_TX_FAILED,
    },
  ])('dispatches $name', ({ txType, status, eventKey, expected }) => {
    renderEnabledHook();

    fireTxEvent(txMeta({ type: txType, status }), undefined, eventKey);

    expect(mockUpdateSwaps).toHaveBeenCalledWith(expected);
  });

  it('ignores events from a different address', () => {
    renderEnabledHook();

    fireTxEvent(
      txMeta({
        type: TransactionType.bridge,
        status: TransactionStatus.signed,
        txParams: { from: '0xdifferentAddress0000000000000000000000000' },
      }),
    );

    expect(mockUpdateSwaps).not.toHaveBeenCalled();
  });

  it('ignores non-bridge/swap transaction types', () => {
    renderEnabledHook();

    fireTxEvent(
      txMeta({
        type: TransactionType.simpleSend,
        status: TransactionStatus.signed,
      }),
    );

    expect(mockUpdateSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch REJECTED twice for the same transaction', () => {
    renderEnabledHook();

    const meta = txMeta({
      type: TransactionType.bridgeApproval,
      status: TransactionStatus.rejected,
    });

    const handler = getRejectedHandler();
    act(() => {
      handler({ transactionMeta: meta });
      handler({ transactionMeta: meta });
    });

    expect(mockUpdateSwaps).toHaveBeenCalledTimes(1);
  });

  describe('stale batch filtering', () => {
    it('accepts all events when batch ID is undefined (initial state)', () => {
      renderEnabledHook();

      fireTxEvent(
        txMeta({
          type: TransactionType.bridge,
          status: TransactionStatus.signed,
          batchId: 'batch-1',
        }),
      );

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNED_TX);
    });

    it('sets batch ID on first approved tx and accepts matching batch events', () => {
      renderEnabledHook();

      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-abc',
        }),
      );
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_APPROVAL);

      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.signed,
          batchId: 'batch-abc',
        }),
      );
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNED_APPROVAL);
    });

    it('blocks events after cancelCurrentBatch sets batch ID to null', async () => {
      const { result } = renderEnabledHook();

      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-old',
        }),
      );

      mockUpdateSwaps.mockClear();

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.rejected,
          batchId: 'batch-old',
        }),
        getRejectedHandler(),
      );

      expect(mockUpdateSwaps).not.toHaveBeenCalled();
    });

    it('blocks late approved events from a stale batch after cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();

      const originalMeta = txMeta({
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-stale-approved',
      });

      fireTxEvent(originalMeta);
      mockUpdateSwaps.mockClear();

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      fireTxEvent({ ...originalMeta, id: 'tx-late-approved-001' });

      expect(mockUpdateSwaps).not.toHaveBeenCalled();
      expect(result.current.confirmationTxId).toBeUndefined();
    });

    it('blocks approved events from a different batch while a batch is active', () => {
      const { result } = renderEnabledHook();

      const activeMeta = txMeta({
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-active-approved',
      });

      fireTxEvent(activeMeta);
      expect(result.current.confirmationTxId).toBe(activeMeta.id);
      mockUpdateSwaps.mockClear();

      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-late-approved',
        }),
      );

      expect(mockUpdateSwaps).not.toHaveBeenCalled();
      expect(result.current.confirmationTxId).toBe(activeMeta.id);
    });

    it('calls abortTransactionSigning for tracked txs on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();

      const meta = txMeta({
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-xyz',
      });

      fireTxEvent(meta);

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      expect(mockAbortTransactionSigning).toHaveBeenCalledWith(meta.id);
    });

    it('rejects only bridge/swap pending approvals for the tracked address on cancel', async () => {
      const { result } = renderEnabledHook();
      const bridgeTxId = 'tx-bridge-cancel-001';
      const unrelatedTxId = 'tx-unrelated-send-001';
      const unrelatedBatchId = 'batch-unrelated-staking-001';
      const bridgeBatchId = 'batch-bridge-cancel-001';

      const bridgeTx = txMeta({
        id: bridgeTxId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: bridgeBatchId,
      });
      const unrelatedTx = txMeta({
        id: unrelatedTxId,
        type: TransactionType.simpleSend,
        status: TransactionStatus.unapproved,
      });

      setMockTransactions([bridgeTx, unrelatedTx]);
      setMockPendingApprovals({
        [bridgeTxId]: { id: bridgeTxId, type: 'transaction' },
        [unrelatedTxId]: { id: unrelatedTxId, type: 'transaction' },
        [bridgeBatchId]: { id: bridgeBatchId, type: 'transaction_batch' },
        [unrelatedBatchId]: { id: unrelatedBatchId, type: 'transaction_batch' },
      });

      fireTxEvent(bridgeTx);

      act(() => {
        result.current.cancelCurrentBatch().catch(() => undefined);
      });

      const expectRejected = (id: string) =>
        expect(Engine.rejectPendingApproval).toHaveBeenCalledWith(
          id,
          expect.any(Error),
          { ignoreMissing: true, logErrors: false },
        );
      const expectNotRejected = (id: string) =>
        expect(Engine.rejectPendingApproval).not.toHaveBeenCalledWith(
          id,
          expect.any(Error),
          expect.anything(),
        );

      await waitFor(() => expectRejected(bridgeBatchId));
      expectRejected(bridgeTxId);
      expectNotRejected(unrelatedTxId);
      expectNotRejected(unrelatedBatchId);
    });

    it('unsubscribes the cancel waiter when the terminal-status timeout wins', async () => {
      jest.useFakeTimers();

      try {
        const { result } = renderEnabledHook();
        const meta = txMeta({
          id: 'tx-timeout-waiter-001',
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-timeout-waiter',
        });

        setMockTransactions([meta]);

        fireTxEvent(meta);

        let cancelPromise = Promise.resolve();
        act(() => {
          cancelPromise = result.current.cancelCurrentBatch();
        });

        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
          await Promise.resolve();
        });

        // The most recent status handler is the cancel-waiter.
        const statusHandlers = getAllStatusHandlers();
        const cancelWaiterHandler = statusHandlers.at(-1);

        expect(statusHandlers).toHaveLength(2);
        expect(cancelWaiterHandler).toEqual(expect.any(Function));

        await act(async () => {
          jest.advanceTimersByTime(5_000);
          await cancelPromise;
        });

        expect(mockUnsubscribe).toHaveBeenCalledWith(
          EVENT.status,
          cancelWaiterHandler,
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('wipes failed bridge transactions through the typed messenger action on cancel', async () => {
      const { result } = renderEnabledHook();
      const chainId = '0x1';
      const trackedTxId = 'tx-active-001';
      const failedTxId = 'tx-failed-001';

      const trackedTx = txMeta({
        id: trackedTxId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-active',
        chainId,
      });
      const failedTx = txMeta({
        id: failedTxId,
        type: TransactionType.bridge,
        status: TransactionStatus.failed,
        batchId: 'batch-failed',
        chainId,
      });

      setMockTransactions([trackedTx, failedTx]);

      fireTxEvent(trackedTx);

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      await waitFor(() => {
        expect(mockControllerMessengerCall).toHaveBeenCalledWith(
          'TransactionController:wipeTransactions',
          { address: FROM_ADDRESS.toLowerCase(), chainId },
        );
      });

      // After wipe, the cancel-waiter receives a dropped status for the tracked tx.
      broadcastTxEvent({ ...trackedTx, status: TransactionStatus.dropped });
      await cancelPromise;
    });

    it('wipes failed bridge transactions even when no active txs remain', async () => {
      const { result } = renderEnabledHook();
      const chainId = '0x1';

      setMockTransactions([
        txMeta({
          id: 'tx-failed-only-001',
          type: TransactionType.bridge,
          status: TransactionStatus.failed,
          batchId: 'batch-failed-only',
          chainId,
        }),
      ]);

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'TransactionController:wipeTransactions',
        { address: FROM_ADDRESS.toLowerCase(), chainId },
      );
    });

    it('exposes confirmationTxId reactively', () => {
      const { result } = renderEnabledHook();

      expect(result.current.confirmationTxId).toBeUndefined();

      const txId = 'tx-fixed-id-001';

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-123',
        }),
      );

      expect(result.current.confirmationTxId).toBe(txId);

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.signed,
          batchId: 'batch-123',
        }),
      );

      expect(result.current.confirmationTxId).toBeUndefined();
    });

    it('advances confirmationTxId to the next tracked tx when the current one signs', () => {
      const { result } = renderEnabledHook();

      const approvalTxId = 'tx-approval-pending';
      const tradeTxId = 'tx-bridge-pending';
      const batchId = 'batch-multi-sign';

      const approvalApproved = txMeta({
        id: approvalTxId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId,
      });
      const tradeApproved = txMeta({
        id: tradeTxId,
        type: TransactionType.bridge,
        status: TransactionStatus.approved,
        batchId,
      });

      act(() => {
        getStatusHandler()({ transactionMeta: approvalApproved });
        getStatusHandler()({ transactionMeta: tradeApproved });
      });

      expect(result.current.confirmationTxId).toBe(tradeTxId);

      fireTxEvent(
        txMeta({
          id: tradeTxId,
          type: TransactionType.bridge,
          status: TransactionStatus.signed,
          batchId,
        }),
      );
      expect(result.current.confirmationTxId).toBe(approvalTxId);

      fireTxEvent(
        txMeta({
          id: approvalTxId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.signed,
          batchId,
        }),
      );
      expect(result.current.confirmationTxId).toBeUndefined();
    });

    it('clears confirmationTxId on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();

      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-cancel',
        }),
      );

      expect(result.current.confirmationTxId).toBeDefined();

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      expect(result.current.confirmationTxId).toBeUndefined();
      await cancelPromise;
    });
  });

  describe('approval acceptance', () => {
    it('accepts pending approval requests for matching bridge transactions', async () => {
      const txId = 'tx-approval-001';
      setMockTransactions([
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
        }),
      ]);
      setMockPendingApprovals({ [txId]: { id: txId, type: 'transaction' } });

      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(mockAcceptRequest).toHaveBeenCalledWith(txId, undefined, {
        waitForResult: true,
      });
    });

    it('does not accept non-transaction approval requests', async () => {
      setMockPendingApprovals({
        'sig-001': { id: 'sig-001', type: 'personal_sign' },
      });

      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(mockAcceptRequest).not.toHaveBeenCalled();
    });

    it('does not accept the same approval request twice', async () => {
      const txId = 'tx-dup-001';
      setMockTransactions([
        txMeta({
          id: txId,
          type: TransactionType.bridge,
          status: TransactionStatus.approved,
        }),
      ]);
      setMockPendingApprovals({ [txId]: { id: txId, type: 'transaction' } });

      renderEnabledHook();
      const handler = getApprovalHandler();

      await act(async () => {
        await handler();
        await handler();
      });

      expect(mockAcceptRequest).toHaveBeenCalledTimes(1);
    });

    it('accepts pending transaction_batch approval requests through the hardware wallet operation flow', async () => {
      const batchId = 'batch-approval-001';

      await processBatchApproval(batchId);

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          address: FROM_ADDRESS,
          operationType: 'transaction',
          execute: expect.any(Function),
        }),
      );
      expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
        waitForResult: true,
      });
    });

    it('clears transaction_batch dedupe and dispatches failed when hardware operation rejects', async () => {
      const batchId = 'batch-approval-rejected-001';
      mockHwOpOnce(async ({ execute, onRejected }) => {
        await execute();
        await onRejected?.();
        return false;
      });

      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });
      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      await waitFor(() => {
        expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_TX_FAILED);
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      });
    });

    it('awaits batch cancellation before completing a rejected hardware operation', async () => {
      const batchId = 'batch-await-cancel-001';
      const txId = 'tx-await-cancel-001';
      let operationResolved = false;

      const tx = txMeta({
        id: txId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId,
      });
      setMockTransactions([tx]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });
      mockHwOpOnce(async ({ execute, onRejected }) => {
        await execute();
        await onRejected?.();
        operationResolved = true;
        return false;
      });

      renderEnabledHook();

      const approvalHandler = getApprovalHandler();
      const processingPromise = approvalHandler();

      await waitFor(() => {
        expect(mockAbortTransactionSigning).toHaveBeenCalledWith(txId);
      });
      await Promise.resolve();

      expect(operationResolved).toBe(false);

      broadcastTxEvent({ ...tx, status: TransactionStatus.dropped });

      await processingPromise;
      await waitFor(() => {
        expect(operationResolved).toBe(true);
      });
    });

    it('does not start another queue processor while rejected operation is unwinding', async () => {
      const batchId = 'batch-lock-during-cancel-001';
      const txId = 'tx-lock-during-cancel-001';
      let releaseOperation: (() => void) | undefined;

      const tx = txMeta({
        id: txId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId,
      });
      setMockTransactions([tx]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });
      mockHwOpOnce(async ({ execute, onRejected }) => {
        await execute();
        await onRejected?.();
        await new Promise<void>((resolve) => {
          releaseOperation = resolve;
        });
        return false;
      });

      renderEnabledHook();

      const approvalHandler = getApprovalHandler();
      const processingPromise = approvalHandler();

      await waitFor(() => {
        expect(mockAbortTransactionSigning).toHaveBeenCalledWith(txId);
      });

      broadcastTxEvent({ ...tx, status: TransactionStatus.dropped });

      await waitFor(() => {
        expect(releaseOperation).toBeDefined();
      });

      approvalHandler();

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);

      releaseOperation?.();
      await processingPromise;
    });

    it('ignores late transaction_batch rejection after a transaction in the batch signs', async () => {
      const batchId = 'batch-late-rejection-001';
      const txId = 'tx-late-rejection-001';
      let rejectHardwareOperation: (() => void | Promise<void>) | undefined;

      mockHwOpOnce(({ execute, onRejected }) => {
        rejectHardwareOperation = onRejected;
        return execute().then(() => false);
      });
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });

      renderEnabledHook();

      const approvalHandler = getApprovalHandler();
      const statusHandler = getStatusHandler();

      const approvedMeta = txMeta({
        id: txId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId,
      });
      const signedMeta = { ...approvedMeta, status: TransactionStatus.signed };

      await act(async () => {
        statusHandler({ transactionMeta: approvedMeta });
        await approvalHandler();
        statusHandler({ transactionMeta: signedMeta });
      });
      mockUpdateSwaps.mockClear();

      await act(async () => {
        await rejectHardwareOperation?.();
      });

      expect(Engine.rejectPendingApproval).not.toHaveBeenCalled();
      expect(mockUpdateSwaps).not.toHaveBeenCalledWith(EXPECT_TX_FAILED);
    });

    it('processes only one approval when stateChange fires concurrently', async () => {
      const batchId = 'batch-concurrent-001';
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });

      renderEnabledHook();

      const handler = getApprovalHandler();

      await act(async () => {
        handler();
        handler();
        handler();
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      expect(mockAcceptRequest).toHaveBeenCalledTimes(1);
    });

    it('processes multiple distinct approvals sequentially', async () => {
      const batchId1 = 'batch-seq-001';
      const batchId2 = 'batch-seq-002';
      const callOrder: string[] = [];
      mockExecuteHardwareWalletOperation
        .mockImplementationOnce(async ({ execute }) => {
          callOrder.push('start-1');
          await execute();
          callOrder.push('end-1');
          return true;
        })
        .mockImplementationOnce(async ({ execute }) => {
          callOrder.push('start-2');
          await execute();
          callOrder.push('end-2');
          return true;
        });

      setMockPendingApprovals({
        [batchId1]: { id: batchId1, type: 'transaction_batch' },
        [batchId2]: { id: batchId2, type: 'transaction_batch' },
      });

      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(callOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
    });
  });

  describe('retry generation', () => {
    function renderWithRetry(retryGenerationRef: { current: number }) {
      return renderHook(() =>
        useHwBatchSignTracker({
          fromAddress: FROM_ADDRESS,
          isEnabled: true,
          retryGenerationRef,
        }),
      );
    }

    it('stops queued batch approvals when retryGenerationRef advances', async () => {
      const retryGenerationRef = { current: 0 };
      let releaseFirstOperation: (() => void) | undefined;
      const staleBatchId1 = 'batch-stale-retry-001';
      const staleBatchId2 = 'batch-stale-retry-002';

      mockHwOpOnce(async ({ execute }) => {
        await new Promise<void>((resolve) => {
          releaseFirstOperation = resolve;
        });
        await execute();
        return true;
      });

      setMockPendingApprovals({
        [staleBatchId1]: { id: staleBatchId1, type: 'transaction_batch' },
      });

      renderWithRetry(retryGenerationRef);

      const approvalHandler = getApprovalHandler();

      await act(async () => {
        await approvalHandler();
      });

      await waitFor(() => {
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        setMockPendingApprovals({
          [staleBatchId1]: { id: staleBatchId1, type: 'transaction_batch' },
          [staleBatchId2]: { id: staleBatchId2, type: 'transaction_batch' },
        });
        await approvalHandler();
      });

      retryGenerationRef.current = 1;
      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-new-after-retry',
        }),
      );

      await act(async () => {
        releaseFirstOperation?.();
      });

      await waitFor(() => {
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
        expect(mockAcceptRequest).not.toHaveBeenCalledWith(
          staleBatchId2,
          undefined,
          { waitForResult: true },
        );
      });
    });

    it('allows the same approval id after retryGenerationRef advances', async () => {
      const retryGenerationRef = { current: 0 };
      const batchId = 'batch-re-dedupe-001';

      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });

      renderWithRetry(retryGenerationRef);

      const approvalHandler = getApprovalHandler();

      await act(async () => {
        await approvalHandler();
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      mockExecuteHardwareWalletOperation.mockClear();
      mockAcceptRequest.mockClear();

      retryGenerationRef.current = 1;
      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
        }),
      );

      setMockPendingApprovals({
        [batchId]: { id: batchId, type: 'transaction_batch' },
      });

      await act(async () => {
        await approvalHandler();
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
        waitForResult: true,
      });
    });
  });
});
