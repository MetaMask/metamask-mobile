import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { useHwBatchSignTracker } from './useHwBatchSignTracker';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsEventType,
  type HardwareWalletsSwapsEvent,
} from './HardwareWalletsSwaps.state';
import { Flow } from './flowStrategy';
import { KEYSTONE_TX_CANCELED } from '../../../../constants/error';
import { STX_NO_HASH_ERROR } from '../../../../util/smart-transactions/smart-publish-hook';

const DEVICE_NOT_READY_RETRY_DELAY_MS = 1_000;

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
const EXPECT_REJECTED_TX: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Rejected,
  payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
};
const EXPECT_TX_FAILED: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.TransactionFailed,
};

// ---------- Types ----------

interface MockTransactionMeta {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  txParams: { from: string; to?: string };
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

function getLatestSubscribeHandler(eventName: string): StatusHandler {
  const calls = mockSubscribe.mock.calls.filter(
    ([event]: [string]) => event === eventName,
  );
  const handler = calls.at(-1)?.[1];
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

function matchingBatchTx(
  batchId: string,
  overrides: Partial<MockTransactionMeta> = {},
): MockTransactionMeta {
  return txMeta({
    id: `tx-${batchId}`,
    type: TransactionType.bridgeApproval,
    status: TransactionStatus.approved,
    batchId,
    ...overrides,
  });
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
    [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
  });
  renderEnabledHook();
  await act(async () => {
    await getApprovalHandler()();
  });
}

// ---------- Hardware operation mock helpers ----------

interface HwOpMockOpts {
  execute: () => Promise<void>;
  onError?: (error: unknown) => boolean;
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

function renderWithRetry(retryGenerationRef: { current: number }) {
  return renderHook(() =>
    useHwBatchSignTracker({
      fromAddress: FROM_ADDRESS,
      isEnabled: true,
      retryGenerationRef,
    }),
  );
}

const GAS_TOKEN_ADDRESS = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
const SEND_RECIPIENT_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const EXPECT_SIGNING_FEE_TRANSFER: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Signing,
  payload: { stepKind: HardwareWalletsSwapsStepKind.FeeTransfer },
};
const EXPECT_SIGNED_FEE_TRANSFER: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Signed,
  payload: { stepKind: HardwareWalletsSwapsStepKind.FeeTransfer },
};
const EXPECT_REJECTED_FEE_TRANSFER: HardwareWalletsSwapsEvent = {
  type: HardwareWalletsSwapsEventType.Rejected,
  payload: { stepKind: HardwareWalletsSwapsStepKind.FeeTransfer },
};

function renderSendHook(
  opts: {
    gasTokenAddress?: string;
    deferredApprovalRequestId?: string;
    expectedBatchTransactionCount?: number;
    retryGenerationRef?: { current: number };
  } = {},
) {
  return renderHook(() =>
    useHwBatchSignTracker({
      fromAddress: FROM_ADDRESS,
      isEnabled: true,
      retryGenerationRef: opts.retryGenerationRef,
      flow: Flow.Send,
      gasTokenAddress: opts.gasTokenAddress,
      deferredApprovalRequestId: opts.deferredApprovalRequestId,
      expectedBatchTransactionCount: opts.expectedBatchTransactionCount,
    }),
  );
}

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

    expect(mockUnsubscribe).toHaveBeenCalledTimes(5);
  });

  it('does not resubscribe when re-rendered with the same props', () => {
    const { rerender } = renderEnabledHook();

    rerender(undefined);

    expect(mockSubscribe).toHaveBeenCalledTimes(5);
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('resets tracker state when switching fromAddress', () => {
    const nextAddress = '0x0000000000000000000000000000000000000002';
    const { rerender } = renderHook(
      ({
        fromAddress,
        isEnabled,
      }: {
        fromAddress: string;
        isEnabled: boolean;
      }) => useHwBatchSignTracker({ fromAddress, isEnabled }),
      {
        initialProps: { fromAddress: FROM_ADDRESS, isEnabled: true },
      },
    );

    fireTxEvent(
      txMeta({
        id: 'tx-first-account-001',
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-first-account',
      }),
    );

    rerender({ fromAddress: nextAddress, isEnabled: true });
    mockUpdateSwaps.mockClear();

    const nextAccountTx = txMeta({
      id: 'tx-second-account-001',
      type: TransactionType.bridgeApproval,
      status: TransactionStatus.approved,
      batchId: 'batch-second-account',
      txParams: { from: nextAddress },
    });

    act(() => {
      getLatestSubscribeHandler(EVENT.status)({
        transactionMeta: nextAccountTx,
      });
    });

    expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_APPROVAL);
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
        txParams: { from: '0x976EA74026E726554dB657fA54763abd0C3a0aa9' },
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

  it('does not dispatch SIGNING twice for repeated approved updates', () => {
    renderEnabledHook();

    const meta = txMeta({
      type: TransactionType.bridgeApproval,
      status: TransactionStatus.approved,
      batchId: 'batch-duplicate-signing',
    });

    const handler = getStatusHandler();
    act(() => {
      handler({ transactionMeta: meta });
      handler({ transactionMeta: meta });
    });

    expect(mockUpdateSwaps).toHaveBeenCalledTimes(1);
    expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_APPROVAL);
  });

  it('does not dispatch SIGNED twice for the same transaction', () => {
    renderEnabledHook();

    const meta = txMeta({
      type: TransactionType.bridgeApproval,
      status: TransactionStatus.signed,
      batchId: 'batch-signed-dedupe',
    });

    const handler = getStatusHandler();
    act(() => {
      handler({ transactionMeta: meta });
      handler({ transactionMeta: meta });
    });

    expect(mockUpdateSwaps).toHaveBeenCalledTimes(1);
    expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNED_APPROVAL);
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
      const meta = txMeta({
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-old',
      });

      fireTxEvent(meta);

      mockUpdateSwaps.mockClear();

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...meta, status: TransactionStatus.dropped });
      await cancelPromise;

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

    it('dispatches SIGNING again for the same tx id after cancelCurrentBatch', async () => {
      const txId = 'tx-reused-signing-after-cancel';
      const staleBatchId = 'batch-before-cancel';
      const nextBatchId = 'batch-after-cancel';
      const { result } = renderEnabledHook();
      const meta = txMeta({
        id: txId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: staleBatchId,
      });

      fireTxEvent(meta);
      mockUpdateSwaps.mockClear();

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...meta, status: TransactionStatus.dropped });
      await cancelPromise;

      fireTxEvent({
        ...meta,
        status: TransactionStatus.approved,
        batchId: nextBatchId,
      });

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_APPROVAL);
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

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({
        ...originalMeta,
        status: TransactionStatus.dropped,
      });
      await cancelPromise;

      fireTxEvent({ ...originalMeta, id: 'tx-late-approved-001' });

      expect(mockUpdateSwaps).not.toHaveBeenCalled();
      expect(result.current.confirmationTxId).toBeUndefined();
    });

    it('blocks approved events from the prior generation after retry starts', () => {
      const retryGenerationRef = { current: 0 };
      const staleBatchId = 'batch-stale-generation-approved';
      const { result } = renderEnabledHook({ retryGenerationRef });

      fireTxEvent(
        txMeta({
          id: 'tx-prior-generation-approved',
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: staleBatchId,
        }),
      );
      retryGenerationRef.current = 1;
      mockUpdateSwaps.mockClear();

      fireTxEvent(
        txMeta({
          id: 'tx-late-prior-generation-approved',
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: staleBatchId,
        }),
      );

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

    it('awaits in-flight cancel when cancelCurrentBatch is invoked concurrently', async () => {
      const { result } = renderEnabledHook();
      const meta = txMeta({
        id: 'tx-concurrent-cancel-001',
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-concurrent-cancel',
      });
      let firstResolved = false;
      let secondResolved = false;

      setMockTransactions([meta]);
      fireTxEvent(meta);

      let firstCancel = Promise.resolve();
      let secondCancel = Promise.resolve();
      act(() => {
        firstCancel = result.current.cancelCurrentBatch().then(() => {
          firstResolved = true;
        });
        secondCancel = result.current.cancelCurrentBatch().then(() => {
          secondResolved = true;
        });
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(firstResolved).toBe(false);
      expect(secondResolved).toBe(false);
      expect(mockAbortTransactionSigning).toHaveBeenCalledTimes(1);

      broadcastTxEvent({ ...meta, status: TransactionStatus.dropped });

      await act(async () => {
        await firstCancel;
        await secondCancel;
      });

      expect(firstResolved).toBe(true);
      expect(secondResolved).toBe(true);
    });

    it('calls abortTransactionSigning for tracked txs on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();

      const meta = txMeta({
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-xyz',
      });

      fireTxEvent(meta);

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...meta, status: TransactionStatus.dropped });
      await cancelPromise;

      expect(mockAbortTransactionSigning).toHaveBeenCalledWith(meta.id);
    });

    it('does not abort or drop non-terminal bridge txs from a different batch on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();
      const activeBatchId = 'batch-active-cancel-001';
      const otherBatchId = 'batch-other-in-flight-001';
      const activeTx = txMeta({
        id: 'tx-active-batch-cancel-001',
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: activeBatchId,
      });
      const otherBatchTx = txMeta({
        id: 'tx-other-batch-cancel-001',
        type: TransactionType.bridge,
        status: TransactionStatus.approved,
        batchId: otherBatchId,
      });

      setMockTransactions([activeTx, otherBatchTx]);
      fireTxEvent(activeTx);

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...activeTx, status: TransactionStatus.dropped });
      await cancelPromise;

      expect(mockAbortTransactionSigning).toHaveBeenCalledWith(activeTx.id);
      expect(mockAbortTransactionSigning).not.toHaveBeenCalledWith(
        otherBatchTx.id,
      );
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'TransactionController:updateTransaction',
        expect.objectContaining({
          id: activeTx.id,
          status: TransactionStatus.dropped,
        }),
        expect.any(String),
      );
      expect(mockControllerMessengerCall).not.toHaveBeenCalledWith(
        'TransactionController:updateTransaction',
        expect.objectContaining({
          id: otherBatchTx.id,
          status: TransactionStatus.dropped,
        }),
        expect.any(String),
      );
    });

    it('does not reject pending approvals for a different in-flight batch on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();
      const activeBatchId = 'batch-active-approval-cancel-001';
      const otherBatchId = 'batch-other-approval-cancel-001';
      const activeTx = txMeta({
        id: 'tx-active-approval-cancel-001',
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: activeBatchId,
      });
      const otherBatchTx = txMeta({
        id: 'tx-other-approval-cancel-001',
        type: TransactionType.bridge,
        status: TransactionStatus.approved,
        batchId: otherBatchId,
      });

      setMockTransactions([activeTx, otherBatchTx]);
      setMockPendingApprovals({
        [activeBatchId]: {
          id: activeBatchId,
          type: ApprovalType.TransactionBatch,
        },
        [otherBatchId]: {
          id: otherBatchId,
          type: ApprovalType.TransactionBatch,
        },
        [otherBatchTx.id]: {
          id: otherBatchTx.id,
          type: ApprovalType.Transaction,
        },
      });
      fireTxEvent(activeTx);

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...activeTx, status: TransactionStatus.dropped });
      await cancelPromise;

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

      expectRejected(activeBatchId);
      expectNotRejected(otherBatchId);
      expectNotRejected(otherBatchTx.id);
    });

    it('aborts untracked non-terminal txs from the same batch on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();
      const batchId = 'batch-same-batch-untracked-001';
      const approvalTx = txMeta({
        id: 'tx-approval-same-batch-001',
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId,
      });
      const tradeTx = txMeta({
        id: 'tx-trade-same-batch-001',
        type: TransactionType.bridge,
        status: TransactionStatus.approved,
        batchId,
      });

      setMockTransactions([approvalTx, tradeTx]);
      fireTxEvent(approvalTx);

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...approvalTx, status: TransactionStatus.dropped });
      broadcastTxEvent({ ...tradeTx, status: TransactionStatus.dropped });
      await cancelPromise;

      expect(mockAbortTransactionSigning).toHaveBeenCalledWith(approvalTx.id);
      expect(mockAbortTransactionSigning).toHaveBeenCalledWith(tradeTx.id);
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'TransactionController:updateTransaction',
        expect.objectContaining({
          id: tradeTx.id,
          status: TransactionStatus.dropped,
        }),
        expect.any(String),
      );
    });

    it('does not locally abort or drop submitted batch transactions on cancelCurrentBatch', async () => {
      const { result } = renderEnabledHook();
      const approvedTx = txMeta({
        id: 'tx-approved-batch-001',
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-submitted-001',
      });
      const submittedTx = txMeta({
        id: 'tx-submitted-batch-001',
        type: TransactionType.bridge,
        status: TransactionStatus.submitted,
        batchId: 'batch-submitted-001',
      });

      setMockTransactions([approvedTx, submittedTx]);
      fireTxEvent(approvedTx);

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...approvedTx, status: TransactionStatus.dropped });
      await cancelPromise;

      expect(mockAbortTransactionSigning).toHaveBeenCalledWith(approvedTx.id);
      expect(mockAbortTransactionSigning).not.toHaveBeenCalledWith(
        submittedTx.id,
      );
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'TransactionController:updateTransaction',
        expect.objectContaining({
          id: approvedTx.id,
          status: TransactionStatus.dropped,
        }),
        expect.any(String),
      );
      expect(mockControllerMessengerCall).not.toHaveBeenCalledWith(
        'TransactionController:updateTransaction',
        expect.objectContaining({
          id: submittedTx.id,
          status: TransactionStatus.dropped,
        }),
        expect.any(String),
      );
    });

    it('resolves cancelCurrentBatch without events for submitted-only batches', async () => {
      const { result } = renderEnabledHook();
      const submittedTx = txMeta({
        id: 'tx-submitted-only-batch-001',
        type: TransactionType.bridge,
        status: TransactionStatus.submitted,
        batchId: 'batch-submitted-only-001',
      });

      setMockTransactions([submittedTx]);

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      expect(mockAbortTransactionSigning).not.toHaveBeenCalledWith(
        submittedTx.id,
      );
      expect(mockControllerMessengerCall).not.toHaveBeenCalledWith(
        'TransactionController:updateTransaction',
        expect.objectContaining({
          id: submittedTx.id,
          status: TransactionStatus.dropped,
        }),
        expect.any(String),
      );
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
        [bridgeTxId]: { id: bridgeTxId, type: ApprovalType.Transaction },
        [unrelatedTxId]: { id: unrelatedTxId, type: ApprovalType.Transaction },
        [bridgeBatchId]: {
          id: bridgeBatchId,
          type: ApprovalType.TransactionBatch,
        },
        [unrelatedBatchId]: {
          id: unrelatedBatchId,
          type: ApprovalType.TransactionBatch,
        },
      });

      fireTxEvent(bridgeTx);

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...bridgeTx, status: TransactionStatus.dropped });
      await cancelPromise;

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

      expectRejected(bridgeBatchId);
      expectRejected(bridgeTxId);
      expectNotRejected(unrelatedTxId);
      expectNotRejected(unrelatedBatchId);
    });

    it('rejects tracked Transaction approvals without batchId on cancel', async () => {
      const { result } = renderEnabledHook();
      const bridgeTxId = 'tx-bridge-no-batch-cancel-001';

      const bridgeTx = txMeta({
        id: bridgeTxId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
      });

      setMockTransactions([bridgeTx]);
      setMockPendingApprovals({
        [bridgeTxId]: { id: bridgeTxId, type: ApprovalType.Transaction },
      });

      await act(async () => {
        await getApprovalHandler()();
      });

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...bridgeTx, status: TransactionStatus.dropped });
      await cancelPromise;

      expect(Engine.rejectPendingApproval).toHaveBeenCalledWith(
        bridgeTxId,
        expect.any(Error),
        { ignoreMissing: true, logErrors: false },
      );
    });

    it('unsubscribes the cancel waiter when tracked txs become terminal', async () => {
      const { result } = renderEnabledHook();
      const meta = txMeta({
        id: 'tx-terminal-waiter-001',
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-terminal-waiter',
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

      broadcastTxEvent({ ...meta, status: TransactionStatus.dropped });
      await cancelPromise;

      expect(mockUnsubscribe).toHaveBeenCalledWith(
        EVENT.status,
        cancelWaiterHandler,
      );
    });

    it('unsubscribes the cancel waiter when the terminal-status timeout elapses', async () => {
      jest.useFakeTimers();

      try {
        const { result } = renderEnabledHook();
        const meta = txMeta({
          id: 'tx-timeout-waiter-001',
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-timeout-waiter',
        });
        let didResolve = false;

        setMockTransactions([meta]);
        fireTxEvent(meta);

        let cancelPromise = Promise.resolve();
        act(() => {
          cancelPromise = result.current.cancelCurrentBatch().then(() => {
            didResolve = true;
          });
        });

        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });

        const cancelWaiterHandler = getAllStatusHandlers().at(-1);

        act(() => {
          jest.advanceTimersByTime(30_000);
        });
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });

        expect(didResolve).toBe(true);
        await act(async () => {
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

    it('does not accept a retry batch while prior cancellation txs remain non-terminal', async () => {
      jest.useFakeTimers();

      try {
        const { result } = renderEnabledHook();
        const oldTx = txMeta({
          id: 'tx-prior-batch-approved-001',
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: 'batch-prior-cancel-001',
        });
        const retryBatchId = 'batch-retry-after-cancel-001';
        const retryTx = matchingBatchTx(retryBatchId);

        setMockTransactions([oldTx]);
        fireTxEvent(oldTx);

        let cancelPromise = Promise.resolve();
        act(() => {
          cancelPromise = result.current.cancelCurrentBatch();
        });

        await act(async () => {
          await Promise.resolve();
        });

        setMockTransactions([oldTx, retryTx]);
        setMockPendingApprovals({
          [retryBatchId]: {
            id: retryBatchId,
            type: ApprovalType.TransactionBatch,
          },
        });

        act(() => {
          getApprovalHandler()();
        });
        act(() => {
          jest.advanceTimersByTime(5_000);
        });
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });

        expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();

        broadcastTxEvent({ ...oldTx, status: TransactionStatus.dropped });

        await waitFor(() => {
          expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
            expect.objectContaining({
              address: FROM_ADDRESS,
              operationType: 'transaction',
              execute: expect.any(Function),
            }),
          );
        });
        expect(mockAcceptRequest).toHaveBeenCalledWith(
          retryBatchId,
          undefined,
          { waitForResult: true },
        );
        await cancelPromise;
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
        batchId: 'batch-active',
        chainId,
      });

      setMockTransactions([trackedTx, failedTx]);

      fireTxEvent(trackedTx);

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...trackedTx, status: TransactionStatus.dropped });
      await cancelPromise;

      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'TransactionController:wipeTransactions',
        { address: FROM_ADDRESS.toLowerCase(), chainId },
      );
    });

    it('does not wipe failed bridge transactions without related batch ids', async () => {
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

      expect(mockControllerMessengerCall).not.toHaveBeenCalledWith(
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

    it('clears confirmationTxId when a tracked transaction confirms', () => {
      const { result } = renderEnabledHook();
      const txId = 'tx-confirmed-clears';
      const batchId = 'batch-confirmed-clears';

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridge,
          status: TransactionStatus.approved,
          batchId,
        }),
      );
      expect(result.current.confirmationTxId).toBe(txId);

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridge,
          status: TransactionStatus.confirmed,
          batchId,
        }),
      );

      expect(result.current.confirmationTxId).toBeUndefined();
    });

    it('dispatches rejected when a tracked transaction is dropped outside local cancellation', () => {
      renderEnabledHook();
      const txId = 'tx-external-drop';
      const batchId = 'batch-external-drop';

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridge,
          status: TransactionStatus.approved,
          batchId,
        }),
      );
      mockUpdateSwaps.mockClear();

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridge,
          status: TransactionStatus.dropped,
          batchId,
        }),
      );

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_REJECTED_TX);
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
      const meta = txMeta({
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId: 'batch-cancel',
      });

      fireTxEvent(meta);

      expect(result.current.confirmationTxId).toBeDefined();

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });

      broadcastTxEvent({ ...meta, status: TransactionStatus.dropped });
      await cancelPromise;

      expect(result.current.confirmationTxId).toBeUndefined();
    });
  });

  describe('approval acceptance', () => {
    it('drains existing pending approvals when enabled', async () => {
      const batchId = 'batch-existing-on-enable-001';
      setMockTransactions([matchingBatchTx(batchId)]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });

      renderEnabledHook();

      await waitFor(() => {
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            address: FROM_ADDRESS,
            operationType: 'transaction',
            execute: expect.any(Function),
          }),
        );
      });
      expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
        waitForResult: true,
      });
    });

    it('accepts pending approval requests for matching bridge transactions', async () => {
      const txId = 'tx-approval-001';
      setMockTransactions([
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
        }),
      ]);
      setMockPendingApprovals({
        [txId]: { id: txId, type: ApprovalType.Transaction },
      });

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
      setMockPendingApprovals({
        [txId]: { id: txId, type: ApprovalType.Transaction },
      });

      renderEnabledHook();
      const handler = getApprovalHandler();

      await act(async () => {
        await handler();
        await handler();
      });

      expect(mockAcceptRequest).toHaveBeenCalledTimes(1);
    });

    it('does not tight-loop approval processing when the device is not ready', async () => {
      mockExecuteHardwareWalletOperation.mockImplementationOnce(
        async ({ onRejected }) => {
          await onRejected?.();
          return false;
        },
      );
      const batchId = 'batch-device-not-ready-001';
      setMockTransactions([matchingBatchTx(batchId)]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });

      renderEnabledHook();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      expect(mockAcceptRequest).not.toHaveBeenCalled();
    });

    it('retries a requeued approval after the device is not ready without requiring another approval event', async () => {
      jest.useFakeTimers();

      try {
        mockExecuteHardwareWalletOperation.mockImplementationOnce(
          async ({ onRejected }) => {
            await onRejected?.();
            return false;
          },
        );
        const batchId = 'batch-device-not-ready-retry-001';
        setMockTransactions([matchingBatchTx(batchId)]);
        setMockPendingApprovals({
          [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
        });

        renderEnabledHook();

        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });

        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
        expect(mockAcceptRequest).not.toHaveBeenCalled();

        act(() => {
          jest.advanceTimersByTime(DEVICE_NOT_READY_RETRY_DELAY_MS);
        });
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });

        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(2);
        expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
          waitForResult: true,
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('accepts pending transaction_batch approval requests through the hardware wallet operation flow', async () => {
      const batchId = 'batch-approval-001';
      setMockTransactions([matchingBatchTx(batchId)]);

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

    it('does not accept unrelated transaction_batch approval requests', async () => {
      const batchId = 'batch-unrelated-approval-001';
      setMockTransactions([
        txMeta({
          id: 'tx-unrelated-batch-approval-001',
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId,
          txParams: {
            from: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
          },
        }),
      ]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });

      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockAcceptRequest).not.toHaveBeenCalled();
    });

    it('does not accept transaction_batch approval requests from a different active batch', async () => {
      const activeBatchId = 'batch-active-approval-001';
      const otherBatchId = 'batch-other-approval-001';
      const activeTx = matchingBatchTx(activeBatchId);
      const otherTx = matchingBatchTx(otherBatchId);

      setMockTransactions([activeTx]);
      renderEnabledHook();
      fireTxEvent(activeTx);

      setMockTransactions([activeTx, otherTx]);
      setMockPendingApprovals({
        [otherBatchId]: {
          id: otherBatchId,
          type: ApprovalType.TransactionBatch,
        },
      });

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockAcceptRequest).not.toHaveBeenCalled();
    });

    it('does not accept transaction_batch approval requests for stale batches', async () => {
      const retryGenerationRef = { current: 0 };
      const staleBatchId = 'batch-stale-approval-001';
      const staleTx = matchingBatchTx(staleBatchId);

      setMockTransactions([staleTx]);
      renderHook(() =>
        useHwBatchSignTracker({
          fromAddress: FROM_ADDRESS,
          isEnabled: true,
          retryGenerationRef,
        }),
      );
      fireTxEvent(staleTx);

      retryGenerationRef.current = 1;
      setMockPendingApprovals({
        [staleBatchId]: {
          id: staleBatchId,
          type: ApprovalType.TransactionBatch,
        },
      });

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockAcceptRequest).not.toHaveBeenCalled();
    });

    it('accepts transaction_batch approval when no transactions exist yet (batch hook path)', async () => {
      const batchId = 'batch-hook-path-001';
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });
      setMockTransactions([]);

      renderEnabledHook();

      await waitFor(() => {
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            address: FROM_ADDRESS,
            operationType: 'transaction',
            execute: expect.any(Function),
          }),
        );
      });
      expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
        waitForResult: true,
      });
    });

    it('does not accept transaction_batch approval when transactions exist from a different address', async () => {
      const batchId = 'batch-hook-different-addr-001';
      setMockTransactions([
        txMeta({
          id: 'tx-diff-addr-001',
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId,
          txParams: {
            from: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
          },
        }),
      ]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });

      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockAcceptRequest).not.toHaveBeenCalled();
    });

    it('accepts pending transaction_batch approvals immediately when no transactions exist yet', async () => {
      const batchId = 'batch-delayed-transaction-001';
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });

      renderEnabledHook();

      await waitFor(() => {
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            address: FROM_ADDRESS,
            operationType: 'transaction',
            execute: expect.any(Function),
          }),
        );
      });
      expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
        waitForResult: true,
      });
    });

    it('clears transaction_batch dedupe and dispatches failed when hardware operation rejects', async () => {
      const batchId = 'batch-approval-rejected-001';
      const tx = matchingBatchTx(batchId);
      mockHwOpOnce(async ({ execute, onRejected }) => {
        await execute();
        await onRejected?.();
        return false;
      });

      setMockTransactions([tx]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });
      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      await waitFor(() => {
        expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_TX_FAILED);
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockAbortTransactionSigning).toHaveBeenCalledWith(tx.id);
      });
      await waitFor(() => {
        expect(getAllStatusHandlers()).toHaveLength(2);
      });
      broadcastTxEvent({ ...tx, status: TransactionStatus.dropped });
    });

    it('dispatches rejected when Keystone cancellation is reported through onError', async () => {
      const batchId = 'batch-keystone-cancel-001';
      const tx = matchingBatchTx(batchId);
      mockHwOpOnce(async ({ execute, onError, onRejected }) => {
        await execute();
        onError?.(new Error(KEYSTONE_TX_CANCELED));
        const rejectionPromise = onRejected?.();
        await waitFor(() => {
          expect(getAllStatusHandlers()).toHaveLength(2);
        });
        broadcastTxEvent({ ...tx, status: TransactionStatus.dropped });
        await rejectionPromise;
        return false;
      });

      setMockTransactions([tx]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });
      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(mockUpdateSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Rejected,
      });
      expect(mockUpdateSwaps).not.toHaveBeenCalledWith(EXPECT_TX_FAILED);
    });

    it('does not cancel the batch when STX submission failure is followed by hardware rejection', async () => {
      const batchId = 'batch-stx-no-hash-001';
      const tx = matchingBatchTx(batchId);
      let isSuppressed = false;
      mockHwOpOnce(async ({ execute, onError, onRejected }) => {
        try {
          await execute();
        } catch (error) {
          isSuppressed = onError?.(error) ?? false;
          await onRejected?.();
        }
        return false;
      });

      mockAcceptRequest.mockRejectedValueOnce(new Error(STX_NO_HASH_ERROR));
      setMockTransactions([tx]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });
      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(isSuppressed).toBe(true);
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_TX_FAILED);
      expect(Engine.rejectPendingApproval).not.toHaveBeenCalledWith(
        batchId,
        expect.any(Error),
        expect.anything(),
      );
      expect(mockAbortTransactionSigning).not.toHaveBeenCalledWith(tx.id);
      expect(mockControllerMessengerCall).not.toHaveBeenCalledWith(
        'TransactionController:updateTransaction',
        expect.objectContaining({
          id: tx.id,
          status: TransactionStatus.dropped,
        }),
        expect.any(String),
      );
    });

    it('does not suppress prefixed cancellation-like error messages', async () => {
      const batchId = 'batch-prefixed-error-001';
      const prefixedStxError = `${STX_NO_HASH_ERROR} with unrelated suffix`;
      let isSuppressed = true;
      mockHwOpOnce(async ({ execute, onError }) => {
        await execute();
        isSuppressed = onError?.(new Error(prefixedStxError)) ?? false;
        return false;
      });

      setMockTransactions([matchingBatchTx(batchId)]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });
      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(isSuppressed).toBe(false);
      expect(mockUpdateSwaps).not.toHaveBeenCalledWith(EXPECT_TX_FAILED);
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
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
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
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
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
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
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
      setMockTransactions([approvedMeta]);

      await act(async () => {
        statusHandler({ transactionMeta: approvedMeta });
        await approvalHandler();
        statusHandler({ transactionMeta: signedMeta });
      });
      mockUpdateSwaps.mockClear();

      let rejectionPromise = Promise.resolve();
      act(() => {
        rejectionPromise = Promise.resolve(rejectHardwareOperation?.());
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(Engine.rejectPendingApproval).not.toHaveBeenCalled();
      expect(mockUpdateSwaps).not.toHaveBeenCalledWith(EXPECT_TX_FAILED);

      broadcastTxEvent({
        ...approvedMeta,
        status: TransactionStatus.dropped,
      });
      await act(async () => {
        await rejectionPromise;
      });
    });

    it('ignores late transaction_batch rejection after a signed batch is cancelled', async () => {
      const batchId = 'batch-late-rejection-cancel-001';
      const txId = 'tx-late-rejection-cancel-001';
      let rejectHardwareOperation: (() => void | Promise<void>) | undefined;
      let releaseHardwareOperation: (() => void) | undefined;

      mockHwOpOnce(async ({ execute, onRejected }) => {
        rejectHardwareOperation = onRejected;
        await execute();
        await new Promise<void>((resolve) => {
          releaseHardwareOperation = resolve;
        });
        return false;
      });

      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });

      const { result } = renderEnabledHook();

      const approvalHandler = getApprovalHandler();
      const statusHandler = getStatusHandler();

      const approvedMeta = txMeta({
        id: txId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId,
      });
      const signedMeta = { ...approvedMeta, status: TransactionStatus.signed };
      setMockTransactions([approvedMeta]);

      act(() => {
        statusHandler({ transactionMeta: approvedMeta });
      });
      const processingPromise = approvalHandler();
      await waitFor(() => {
        expect(rejectHardwareOperation).toBeDefined();
      });

      act(() => {
        setMockTransactions([signedMeta]);
        statusHandler({ transactionMeta: signedMeta });
      });
      mockUpdateSwaps.mockClear();

      let cancelPromise = Promise.resolve();
      act(() => {
        cancelPromise = result.current.cancelCurrentBatch();
      });
      await waitFor(() => {
        expect(Engine.rejectPendingApproval).toHaveBeenCalledWith(
          batchId,
          expect.any(Error),
          { ignoreMissing: true, logErrors: false },
        );
      });
      (Engine.rejectPendingApproval as jest.Mock).mockClear();
      mockUpdateSwaps.mockClear();

      await act(async () => {
        await rejectHardwareOperation?.();
      });

      expect(Engine.rejectPendingApproval).not.toHaveBeenCalledWith(
        batchId,
        expect.any(Error),
        expect.anything(),
      );
      expect(mockUpdateSwaps).not.toHaveBeenCalledWith(EXPECT_TX_FAILED);

      broadcastTxEvent({ ...signedMeta, status: TransactionStatus.dropped });
      await cancelPromise;
      releaseHardwareOperation?.();
      await processingPromise;
    });

    it('ignores late transaction_batch rejection when batch txs are signed in TC before status handler runs', async () => {
      const batchId = 'batch-tc-signed-fallback-001';
      const txId = 'tx-tc-signed-fallback-001';
      let rejectHardwareOperation: (() => void | Promise<void>) | undefined;

      mockHwOpOnce(({ execute, onRejected }) => {
        rejectHardwareOperation = onRejected;
        return execute().then(() => false);
      });
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
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
        setMockTransactions([signedMeta]);
      });
      mockUpdateSwaps.mockClear();

      await act(async () => {
        await rejectHardwareOperation?.();
      });

      expect(Engine.rejectPendingApproval).not.toHaveBeenCalled();
      expect(mockUpdateSwaps).not.toHaveBeenCalledWith(EXPECT_TX_FAILED);
    });

    it('ignores late transaction_batch rejection for an existing pending approval without an approved status event', async () => {
      const batchId = 'batch-existing-tc-signed-fallback-001';
      const txId = 'tx-existing-tc-signed-fallback-001';
      let rejectHardwareOperation: (() => void | Promise<void>) | undefined;
      const approvedMeta = txMeta({
        id: txId,
        type: TransactionType.bridgeApproval,
        status: TransactionStatus.approved,
        batchId,
      });
      const signedMeta = { ...approvedMeta, status: TransactionStatus.signed };

      mockHwOpOnce(({ execute, onRejected }) => {
        rejectHardwareOperation = onRejected;
        return execute().then(() => false);
      });
      setMockTransactions([approvedMeta]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
      });

      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
        setMockTransactions([signedMeta]);
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
      setMockTransactions([matchingBatchTx(batchId)]);
      setMockPendingApprovals({
        [batchId]: { id: batchId, type: ApprovalType.TransactionBatch },
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

      setMockTransactions([
        matchingBatchTx(batchId1),
        matchingBatchTx(batchId2),
      ]);
      setMockPendingApprovals({
        [batchId1]: { id: batchId1, type: ApprovalType.TransactionBatch },
        [batchId2]: { id: batchId2, type: ApprovalType.TransactionBatch },
      });

      renderEnabledHook();

      await act(async () => {
        await getApprovalHandler()();
      });

      expect(callOrder).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
    });
  });

  describe('retry generation', () => {
    it('accepts the first approved event for a new batch after retryGenerationRef advances', () => {
      const retryGenerationRef = { current: 0 };
      const staleBatchId = 'batch-stale-before-retry';
      const nextBatchId = 'batch-new-after-retry';

      renderWithRetry(retryGenerationRef);
      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: staleBatchId,
        }),
      );
      mockUpdateSwaps.mockClear();

      retryGenerationRef.current = 1;
      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: nextBatchId,
        }),
      );

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_APPROVAL);
    });

    it('dispatches SIGNING again for the same tx id after retryGenerationRef advances', () => {
      const retryGenerationRef = { current: 0 };
      const txId = 'tx-reused-signing-after-retry';
      const staleBatchId = 'batch-stale-before-retry';
      const nextBatchId = 'batch-new-after-retry';

      renderWithRetry(retryGenerationRef);
      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: staleBatchId,
        }),
      );
      mockUpdateSwaps.mockClear();

      retryGenerationRef.current = 1;
      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: nextBatchId,
        }),
      );

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_APPROVAL);
    });

    it('dispatches SIGNED again for the same tx id after retryGenerationRef advances', () => {
      const retryGenerationRef = { current: 0 };
      const txId = 'tx-reused-signed-after-retry';
      const staleBatchId = 'batch-stale-signed-before-retry';
      const nextBatchId = 'batch-new-signed-after-retry';

      renderWithRetry(retryGenerationRef);
      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: staleBatchId,
        }),
      );
      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.signed,
          batchId: staleBatchId,
        }),
      );
      mockUpdateSwaps.mockClear();

      retryGenerationRef.current = 1;
      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.signed,
          batchId: nextBatchId,
        }),
      );

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNED_APPROVAL);
    });

    it('does not restore a prior generation tx as confirmationTxId after the retry tx signs', () => {
      const retryGenerationRef = { current: 0 };
      const staleTxId = 'tx-stale-confirmation-before-retry';
      const staleBatchId = 'batch-stale-confirmation-before-retry';
      const nextTxId = 'tx-new-confirmation-after-retry';
      const nextBatchId = 'batch-new-confirmation-after-retry';
      const { result } = renderWithRetry(retryGenerationRef);

      fireTxEvent(
        txMeta({
          id: staleTxId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: staleBatchId,
        }),
      );
      expect(result.current.confirmationTxId).toBe(staleTxId);

      retryGenerationRef.current = 1;
      fireTxEvent(
        txMeta({
          id: nextTxId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: nextBatchId,
        }),
      );
      expect(result.current.confirmationTxId).toBe(nextTxId);

      fireTxEvent(
        txMeta({
          id: nextTxId,
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.signed,
          batchId: nextBatchId,
        }),
      );

      expect(result.current.confirmationTxId).toBeUndefined();
    });

    it.each([
      {
        name: 'failed',
        status: TransactionStatus.failed,
        eventKey: 'failed' as const,
        expected: EXPECT_TX_FAILED,
      },
      {
        name: 'rejected',
        status: TransactionStatus.rejected,
        eventKey: 'rejected' as const,
        expected: EXPECT_REJECTED_TX,
      },
      {
        name: 'dropped',
        status: TransactionStatus.dropped,
        eventKey: 'status' as const,
        expected: EXPECT_REJECTED_TX,
      },
    ])(
      'dispatches terminal $name events for a new batch after retryGenerationRef advances',
      ({ status, eventKey, expected }) => {
        const retryGenerationRef = { current: 0 };
        const staleBatchId = 'batch-stale-terminal-before-retry';
        const nextBatchId = `batch-new-terminal-${status}`;

        renderWithRetry(retryGenerationRef);
        fireTxEvent(
          txMeta({
            type: TransactionType.bridgeApproval,
            status: TransactionStatus.approved,
            batchId: staleBatchId,
          }),
        );
        mockUpdateSwaps.mockClear();

        retryGenerationRef.current = 1;
        fireTxEvent(
          txMeta({
            type: TransactionType.bridge,
            status,
            batchId: nextBatchId,
          }),
          undefined,
          eventKey,
        );

        expect(mockUpdateSwaps).toHaveBeenCalledWith(expected);
      },
    );

    it('handles a confirmed event for a new batch after retryGenerationRef advances', () => {
      const retryGenerationRef = { current: 0 };
      const staleBatchId = 'batch-stale-confirmed-before-retry';
      const nextBatchId = 'batch-new-confirmed-after-retry';
      const nextTxId = 'tx-new-confirmed-after-retry';

      renderWithRetry(retryGenerationRef);
      fireTxEvent(
        txMeta({
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.approved,
          batchId: staleBatchId,
        }),
      );
      mockUpdateSwaps.mockClear();

      retryGenerationRef.current = 1;
      fireTxEvent(
        txMeta({
          id: nextTxId,
          type: TransactionType.bridge,
          status: TransactionStatus.confirmed,
          batchId: nextBatchId,
        }),
      );
      fireTxEvent(
        txMeta({
          id: nextTxId,
          type: TransactionType.bridge,
          status: TransactionStatus.failed,
          batchId: nextBatchId,
        }),
        undefined,
        'failed',
      );

      expect(mockUpdateSwaps).not.toHaveBeenCalled();
    });

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

      setMockTransactions([matchingBatchTx(staleBatchId1)]);
      setMockPendingApprovals({
        [staleBatchId1]: {
          id: staleBatchId1,
          type: ApprovalType.TransactionBatch,
        },
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
        setMockTransactions([
          matchingBatchTx(staleBatchId1),
          matchingBatchTx(staleBatchId2),
        ]);
        setMockPendingApprovals({
          [staleBatchId1]: {
            id: staleBatchId1,
            type: ApprovalType.TransactionBatch,
          },
          [staleBatchId2]: {
            id: staleBatchId2,
            type: ApprovalType.TransactionBatch,
          },
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
  });

  describe('send-mode', () => {
    it('does not pre-consume the deferred root send approval', async () => {
      const deferredApprovalRequestId = 'tx-sendbundle-root-approval';
      const batchId = 'batch-sendbundle-child';
      const rootTx = txMeta({
        id: deferredApprovalRequestId,
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
      });
      const childTx = txMeta({
        id: 'tx-sendbundle-child',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId,
      });
      setMockTransactions([rootTx, childTx]);
      setMockPendingApprovals({
        [deferredApprovalRequestId]: {
          id: deferredApprovalRequestId,
          type: ApprovalType.Transaction,
        },
        [batchId]: {
          id: batchId,
          type: ApprovalType.TransactionBatch,
        },
      });

      renderSendHook({
        gasTokenAddress: GAS_TOKEN_ADDRESS,
        deferredApprovalRequestId,
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockAcceptRequest).toHaveBeenCalledTimes(1);
      expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
        waitForResult: true,
      });
      expect(mockAcceptRequest).not.toHaveBeenCalledWith(
        deferredApprovalRequestId,
        expect.anything(),
        expect.anything(),
      );

      mockUpdateSwaps.mockClear();
      fireTxEvent(rootTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith({
        payload: { stepKind: 'transaction' },
        type: 'SIGNING',
      });
    });

    it('does not consume or cancel unbatched root send approvals without a deferred id', async () => {
      const rootApprovalRequestId = 'tx-send-root-missing-deferred-id';
      const rootTx = txMeta({
        id: rootApprovalRequestId,
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
      });
      setMockTransactions([rootTx]);
      setMockPendingApprovals({
        [rootApprovalRequestId]: {
          id: rootApprovalRequestId,
          type: ApprovalType.Transaction,
        },
      });

      const { result } = renderSendHook();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockAcceptRequest).not.toHaveBeenCalled();

      fireTxEvent(rootTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith({
        payload: { stepKind: 'transaction' },
        type: 'SIGNING',
      });

      // The root send tx is now tracked (SIGNING dispatched). Transition it to a
      // terminal state before cancelling so cancelCurrentBatch has no pending tx
      // to abort — verifying the tracker does not proactively cancel an
      // already-resolved unbatched root send approval.
      fireTxEvent({ ...rootTx, status: TransactionStatus.confirmed });

      await act(async () => {
        await result.current.cancelCurrentBatch();
      });

      expect(mockAbortTransactionSigning).not.toHaveBeenCalledWith(
        rootApprovalRequestId,
      );
      expect(mockControllerMessengerCall).not.toHaveBeenCalledWith(
        'TransactionController:updateTransaction',
        expect.objectContaining({ id: rootApprovalRequestId }),
        expect.any(String),
      );
      expect(Engine.rejectPendingApproval).not.toHaveBeenCalledWith(
        rootApprovalRequestId,
        expect.any(Error),
        expect.anything(),
      );
    });

    it('waits for sendbundle child txs before accepting the batch approval', async () => {
      const batchId = 'batch-sendbundle-delayed-child';
      const gasTokenTx = txMeta({
        id: 'tx-sendbundle-delayed-gastoken',
        type: TransactionType.gasPayment,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: GAS_TOKEN_ADDRESS },
        batchId,
      });
      const firstSendTx = txMeta({
        id: 'tx-sendbundle-delayed-send-1',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId,
      });
      const secondSendTx = txMeta({
        id: 'tx-sendbundle-delayed-send-2',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId,
      });
      setMockTransactions([]);
      setMockPendingApprovals({
        [batchId]: {
          id: batchId,
          type: ApprovalType.TransactionBatch,
        },
      });

      renderSendHook({
        gasTokenAddress: GAS_TOKEN_ADDRESS,
        expectedBatchTransactionCount: 3,
      });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockAcceptRequest).not.toHaveBeenCalled();

      setMockTransactions([gasTokenTx]);
      fireTxEvent(gasTokenTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Signing,
        payload: {
          stepKind: HardwareWalletsSwapsStepKind.FeeTransfer,
          stepIndex: 2,
        },
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockAcceptRequest).not.toHaveBeenCalled();

      setMockTransactions([gasTokenTx, firstSendTx]);
      mockUpdateSwaps.mockClear();
      fireTxEvent(firstSendTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Signing,
        payload: {
          stepKind: HardwareWalletsSwapsStepKind.Transaction,
          stepIndex: 0,
        },
      });
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockAcceptRequest).not.toHaveBeenCalled();

      setMockTransactions([gasTokenTx, firstSendTx, secondSendTx]);
      mockUpdateSwaps.mockClear();
      fireTxEvent(secondSendTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Signing,
        payload: {
          stepKind: HardwareWalletsSwapsStepKind.Transaction,
          stepIndex: 1,
        },
      });
      await waitFor(() => {
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalledWith(
          expect.objectContaining({
            address: FROM_ADDRESS,
            operationType: 'transaction',
            execute: expect.any(Function),
          }),
        );
      });
      expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
        waitForResult: true,
      });
    });

    it('waits for an approved sendbundle child before accepting the batch approval', async () => {
      const batchId = 'batch-sendbundle-delayed-approved-child';
      const pendingGasTokenTx = txMeta({
        id: 'tx-sendbundle-pending-gastoken',
        type: TransactionType.gasPayment,
        status: TransactionStatus.unapproved,
        txParams: { from: FROM_ADDRESS, to: GAS_TOKEN_ADDRESS },
        batchId,
      });
      const approvedGasTokenTx = {
        ...pendingGasTokenTx,
        status: TransactionStatus.approved,
      };
      setMockTransactions([pendingGasTokenTx]);
      setMockPendingApprovals({
        [batchId]: {
          id: batchId,
          type: ApprovalType.TransactionBatch,
        },
      });

      renderSendHook({ gasTokenAddress: GAS_TOKEN_ADDRESS });

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockExecuteHardwareWalletOperation).not.toHaveBeenCalled();
      expect(mockAcceptRequest).not.toHaveBeenCalled();
      expect(mockUpdateSwaps).not.toHaveBeenCalled();

      setMockTransactions([approvedGasTokenTx]);
      fireTxEvent(approvedGasTokenTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_FEE_TRANSFER);
      await waitFor(() => {
        expect(mockExecuteHardwareWalletOperation).toHaveBeenCalled();
      });
      expect(mockAcceptRequest).toHaveBeenCalledWith(batchId, undefined, {
        waitForResult: true,
      });
    });

    it('resets sendbundle transaction step indexes after retry generation advances', () => {
      const retryGenerationRef = { current: 0 };
      renderSendHook({
        gasTokenAddress: GAS_TOKEN_ADDRESS,
        expectedBatchTransactionCount: 3,
        retryGenerationRef,
      });

      const firstAttemptTx1 = txMeta({
        id: 'tx-sendbundle-retry-attempt-1-a',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId: 'batch-sendbundle-retry-attempt-1',
      });
      const firstAttemptTx2 = txMeta({
        id: 'tx-sendbundle-retry-attempt-1-b',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId: 'batch-sendbundle-retry-attempt-1',
      });
      fireTxEvent(firstAttemptTx1);
      fireTxEvent(firstAttemptTx2);

      retryGenerationRef.current = 1;
      mockUpdateSwaps.mockClear();

      const retryTx = txMeta({
        id: 'tx-sendbundle-retry-attempt-2-a',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId: 'batch-sendbundle-retry-attempt-2',
      });
      fireTxEvent(retryTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Signing,
        payload: {
          stepKind: HardwareWalletsSwapsStepKind.Transaction,
          stepIndex: 0,
        },
      });

      mockUpdateSwaps.mockClear();
      fireTxEvent({
        ...firstAttemptTx2,
        status: TransactionStatus.signed,
      });
      expect(mockUpdateSwaps).not.toHaveBeenCalled();

      const secondRetryTx = txMeta({
        id: 'tx-sendbundle-retry-attempt-2-b',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId: 'batch-sendbundle-retry-attempt-2',
      });
      fireTxEvent(secondRetryTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith({
        type: HardwareWalletsSwapsEventType.Signing,
        payload: {
          stepKind: HardwareWalletsSwapsStepKind.Transaction,
          stepIndex: 1,
        },
      });
    });

    it('dispatches FeeTransfer Signing/Signed for the gas-token tx and Transaction for the send tx (sendbundle)', () => {
      renderSendHook({ gasTokenAddress: GAS_TOKEN_ADDRESS });

      // Gas-token tx approved first → Signing FeeTransfer. In send-mode the
      // FeeTransfer (gas payment) is typed `gasPayment` by useGasFeeToken, so
      // classification is type-based (the `to` address is irrelevant).
      const gasTokenTx = txMeta({
        id: 'tx-sendbundle-gastoken',
        type: TransactionType.gasPayment,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: GAS_TOKEN_ADDRESS },
        batchId: 'batch-sendbundle',
      });
      fireTxEvent(gasTokenTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_FEE_TRANSFER);

      // Send tx approved second → Signing Transaction.
      mockUpdateSwaps.mockClear();
      const sendTx = txMeta({
        id: 'tx-sendbundle-send',
        type: TransactionType.simpleSend,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId: 'batch-sendbundle',
      });
      fireTxEvent(sendTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_TX);

      // Gas-token tx signed → Signed FeeTransfer.
      mockUpdateSwaps.mockClear();
      fireTxEvent({ ...gasTokenTx, status: TransactionStatus.signed });
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNED_FEE_TRANSFER);

      // Send tx signed → Signed Transaction.
      mockUpdateSwaps.mockClear();
      fireTxEvent({ ...sendTx, status: TransactionStatus.signed });
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNED_TX);
    });

    it('classifies send-mode txs by type, not by the gas-token `to` address', () => {
      // Send-mode classification is type-based: a gasPayment-typed tx is a
      // FeeTransfer even when its `to` is the send recipient, and a send-typed
      // tx is a Transaction even when its `to` is the gas-token address. This
      // is what lets the Send (which may itself transfer the gas token) be
      // distinguished from the gas-payment child where address matching fails.
      renderSendHook({ gasTokenAddress: GAS_TOKEN_ADDRESS });

      // gasPayment-typed tx → FeeTransfer, regardless of `to`.
      const gasPaymentTx = txMeta({
        id: 'tx-sendbundle-type-based-fee',
        type: TransactionType.gasPayment,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId: 'batch-sendbundle-type-based',
      });
      fireTxEvent(gasPaymentTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_FEE_TRANSFER);

      // send-typed tx → Transaction, regardless of `to`.
      mockUpdateSwaps.mockClear();
      const sendTx = txMeta({
        id: 'tx-sendbundle-type-based-send',
        type: TransactionType.tokenMethodTransfer,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: GAS_TOKEN_ADDRESS },
        batchId: 'batch-sendbundle-type-based',
      });
      fireTxEvent(sendTx);

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_TX);
    });

    it('dispatches Transaction for a plain native-gas send (no gasTokenAddress)', () => {
      const txId = 'tx-plain-send';
      renderSendHook({ deferredApprovalRequestId: txId });

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.simpleSend,
          status: TransactionStatus.approved,
          txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        }),
      );
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_TX);

      mockUpdateSwaps.mockClear();
      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.simpleSend,
          status: TransactionStatus.signed,
          txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        }),
      );
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNED_TX);
    });

    it('dispatches Rejected with Transaction stepKind for a send tx rejection', () => {
      const txId = 'tx-send-rejected';
      renderSendHook({ deferredApprovalRequestId: txId });

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.simpleSend,
          status: TransactionStatus.rejected,
          txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        }),
        undefined,
        'rejected',
      );

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_REJECTED_TX);
    });

    it('dispatches Rejected with FeeTransfer stepKind when the gas-token tx is rejected', () => {
      renderSendHook({ gasTokenAddress: GAS_TOKEN_ADDRESS });

      fireTxEvent(
        txMeta({
          id: 'tx-gastoken-rejected',
          type: TransactionType.gasPayment,
          status: TransactionStatus.rejected,
          txParams: { from: FROM_ADDRESS, to: GAS_TOKEN_ADDRESS },
          batchId: 'batch-reject-fee',
        }),
        undefined,
        'rejected',
      );

      expect(mockUpdateSwaps).toHaveBeenCalledWith(
        EXPECT_REJECTED_FEE_TRANSFER,
      );
    });

    it('dispatches TRANSACTION_FAILED for a send tx failure', () => {
      const txId = 'tx-send-failed';
      renderSendHook({ deferredApprovalRequestId: txId });

      fireTxEvent(
        txMeta({
          id: txId,
          type: TransactionType.simpleSend,
          status: TransactionStatus.failed,
          txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        }),
        undefined,
        'failed',
      );

      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_TX_FAILED);
    });

    it('tracks both ERC-20 tokenMethodTransfer sendbundle txs', () => {
      // ERC-20 gas-token sendbundle: both txs carry tokenMethodTransfer.
      renderSendHook({ gasTokenAddress: GAS_TOKEN_ADDRESS });

      const gasTokenTx = txMeta({
        id: 'tx-erc20-gastoken',
        type: TransactionType.gasPayment,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: GAS_TOKEN_ADDRESS },
        batchId: 'batch-erc20',
      });
      fireTxEvent(gasTokenTx);
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_FEE_TRANSFER);

      mockUpdateSwaps.mockClear();
      const sendTx = txMeta({
        id: 'tx-erc20-send',
        type: TransactionType.tokenMethodTransfer,
        status: TransactionStatus.approved,
        txParams: { from: FROM_ADDRESS, to: SEND_RECIPIENT_ADDRESS },
        batchId: 'batch-erc20',
      });
      fireTxEvent(sendTx);
      expect(mockUpdateSwaps).toHaveBeenCalledWith(EXPECT_SIGNING_TX);
    });

    it('still ignores bridge/swap types in send-mode (only SEND_TYPES are tracked)', () => {
      // send-mode filters on SEND_TYPES; a bridge-type tx must not be tracked.
      renderSendHook({ gasTokenAddress: GAS_TOKEN_ADDRESS });

      fireTxEvent(
        txMeta({
          id: 'tx-bridge-ignored-in-send-mode',
          type: TransactionType.bridgeApproval,
          status: TransactionStatus.signed,
          txParams: { from: FROM_ADDRESS, to: GAS_TOKEN_ADDRESS },
        }),
      );

      expect(mockUpdateSwaps).not.toHaveBeenCalled();
    });

    it('ignores send-type txs from a different address', () => {
      renderSendHook();

      fireTxEvent(
        txMeta({
          id: 'tx-send-different-from',
          type: TransactionType.simpleSend,
          status: TransactionStatus.signed,
          txParams: {
            from: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
            to: SEND_RECIPIENT_ADDRESS,
          },
        }),
      );

      expect(mockUpdateSwaps).not.toHaveBeenCalled();
    });
  });
});
