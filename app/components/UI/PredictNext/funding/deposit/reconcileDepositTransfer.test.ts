import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { BASE_DEPOSIT_NETWORK } from '../../config/depositEnvironment';
import type {
  PredictAmount,
  PredictDepositOperation,
  PredictEntityId,
  PredictFundingPlan,
  PredictHex,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { depositTransferRequestId } from './depositTransferExecutor';
import {
  DEFAULT_DEPOSIT_SENDER,
  DEFAULT_DEPOSIT_TX_HASH,
  makeDepositTransferTx,
} from './testUtils';
import {
  clearAllSessionDepositTransfers,
  clearSessionDepositTransfer,
  clearSessionDepositTransfersForOperation,
  findMatchingDepositTransaction,
  findMatchingUnapprovedDepositTransactions,
  getSessionDepositTransfer,
  isKnownFailedDepositHash,
  matchDepositTransferForResume,
  recordSessionDepositTransfer,
  waitForPendingDepositTransaction,
  type DepositTransactionMessenger,
} from './reconcileDepositTransfer';
import { encodeUsdcTransfer } from './usdcTransfer';

const VENUE_ID = 'kalshi' as PredictVenueId;
const OPERATION_ID = 'op-1';
const OTHER_OPERATION_ID = 'op-other';
const FROM: PredictHex = DEFAULT_DEPOSIT_SENDER;
const OTHER_FROM: PredictHex = '0x9999999999999999999999999999999999999999';
const USDC = BASE_DEPOSIT_NETWORK.usdc.address;
const DEPOSIT_ADDRESS: PredictHex =
  '0x3b0b371ae3cb08f272b87319684f6518b3b313a0';
const OTHER_ADDRESS: PredictHex = '0x2222222222222222222222222222222222222222';
const HASH_1: PredictHex = DEFAULT_DEPOSIT_TX_HASH;
const HASH_2: PredictHex = `0x${'cd'.repeat(32)}`;
const CREATED_AT = '2026-11-13T12:00:00.000Z' as PredictTimestamp;
const CREATED_AT_MS = Date.parse(CREATED_AT);

const PLAN: PredictFundingPlan = {
  chainId: 8453,
  tokenContract: USDC,
  amount: '25.50' as PredictAmount,
  depositAddress: DEPOSIT_ADDRESS,
  planExpiresAt: '2026-11-13T12:15:00.000Z' as PredictTimestamp,
};

const DEPOSIT_SOURCE = {
  operationId: OPERATION_ID,
  chainId: PLAN.chainId,
  tokenContract: PLAN.tokenContract,
  depositAddress: PLAN.depositAddress,
  amount: PLAN.amount,
  createdAt: CREATED_AT,
};

const DATA = encodeUsdcTransfer(DEPOSIT_ADDRESS, PLAN.amount);

const makeTx = (overrides: Partial<TransactionMeta> = {}): TransactionMeta =>
  makeDepositTransferTx(DEPOSIT_SOURCE, {
    requestId: undefined,
    ...overrides,
  });

describe('findMatchingDepositTransaction', () => {
  it('matches a submitted transaction scoped to sender, chain, token, recipient, amount, and time', () => {
    const result = findMatchingDepositTransaction({
      transactions: [
        makeTx({
          txParams: {
            from: FROM.toUpperCase(),
            to: USDC.toLowerCase(),
            data: DATA,
            value: '0x0',
          },
        }),
      ],
      from: FROM,
      plan: PLAN,
      createdAt: CREATED_AT,
      operationId: OPERATION_ID,
    });

    expect(result).toStrictEqual({
      kind: 'submitted',
      transfer: {
        txHash: HASH_1,
        chainId: 8453,
        to: USDC.toLowerCase(),
        data: DATA,
      },
    });
  });

  it('matches a tagged transaction for the same operationId even when the device clock is behind createdAt', () => {
    const result = findMatchingDepositTransaction({
      transactions: [
        makeTx({
          requestId: depositTransferRequestId(OPERATION_ID),
          time: CREATED_AT_MS - 600_000,
        }),
      ],
      from: FROM,
      plan: PLAN,
      createdAt: CREATED_AT,
      operationId: OPERATION_ID,
    });

    expect(result).toStrictEqual({
      kind: 'submitted',
      transfer: {
        txHash: HASH_1,
        chainId: 8453,
        to: USDC,
        data: DATA,
      },
    });
  });

  it('ignores a transaction from a different operationId even with the same deposit address, amount, and later timestamp', () => {
    expect(
      findMatchingDepositTransaction({
        transactions: [
          makeTx({
            requestId: depositTransferRequestId(OTHER_OPERATION_ID),
            time: CREATED_AT_MS + 1000,
          }),
        ],
        from: FROM,
        plan: PLAN,
        createdAt: CREATED_AT,
        operationId: OPERATION_ID,
      }),
    ).toBeUndefined();
  });

  it.each([
    [
      'different sender',
      makeTx({ txParams: { from: OTHER_FROM, to: USDC, data: DATA } }),
    ],
    ['different chain', makeTx({ chainId: '0x1' })],
    [
      'different token contract',
      makeTx({ txParams: { from: FROM, to: OTHER_ADDRESS, data: DATA } }),
    ],
    [
      'non-zero native value',
      makeTx({ txParams: { from: FROM, to: USDC, data: DATA, value: '0x1' } }),
    ],
    [
      'different recipient in calldata',
      makeTx({
        txParams: {
          from: FROM,
          to: USDC,
          data: encodeUsdcTransfer(OTHER_ADDRESS, PLAN.amount),
        },
      }),
    ],
    [
      'different amount in calldata',
      makeTx({
        txParams: {
          from: FROM,
          to: USDC,
          data: encodeUsdcTransfer(DEPOSIT_ADDRESS, '25.51' as PredictAmount),
        },
      }),
    ],
    [
      'another transaction type',
      makeTx({ type: TransactionType.contractInteraction }),
    ],
    ['created before the deposit', makeTx({ time: CREATED_AT_MS - 1 })],
    ['failed status', makeTx({ status: TransactionStatus.failed })],
    ['rejected status', makeTx({ status: TransactionStatus.rejected })],
    ['dropped status', makeTx({ status: TransactionStatus.dropped })],
  ])('ignores a transaction with %s', (_label, tx) => {
    expect(
      findMatchingDepositTransaction({
        transactions: [tx],
        from: FROM,
        plan: PLAN,
        createdAt: CREATED_AT,
        operationId: OPERATION_ID,
      }),
    ).toBeUndefined();
  });

  it('prefers a confirmed or submitted transfer with hash over an unapproved or failed one', () => {
    const failed = makeTx({
      id: 'tx-failed',
      status: TransactionStatus.failed,
      hash: HASH_2,
    });
    const unapproved = makeTx({
      id: 'tx-unapproved',
      status: TransactionStatus.unapproved,
      hash: undefined,
      time: CREATED_AT_MS + 3000,
    });
    const confirmed = makeTx({
      id: 'tx-confirmed',
      status: TransactionStatus.confirmed,
      hash: HASH_1,
      time: CREATED_AT_MS + 2000,
    });

    const result = findMatchingDepositTransaction({
      transactions: [failed, unapproved, confirmed],
      from: FROM,
      plan: PLAN,
      createdAt: CREATED_AT,
      operationId: OPERATION_ID,
    });

    expect(result).toStrictEqual({
      kind: 'submitted',
      transfer: {
        txHash: HASH_1,
        chainId: 8453,
        to: USDC,
        data: DATA,
      },
    });
  });

  it.each([
    TransactionStatus.unapproved,
    TransactionStatus.approved,
    TransactionStatus.signed,
    TransactionStatus.submitted,
  ])(
    'returns pending when a matching %s transaction has no hash yet',
    (status) => {
      const pendingTx = makeTx({ id: 'tx-pending', status, hash: undefined });

      const result = findMatchingDepositTransaction({
        transactions: [pendingTx],
        from: FROM,
        plan: PLAN,
        createdAt: CREATED_AT,
        operationId: OPERATION_ID,
      });

      expect(result).toStrictEqual({
        kind: 'pending',
        transactionMeta: pendingTx,
      });
    },
  );
});

describe('findMatchingUnapprovedDepositTransactions', () => {
  it('finds unapproved transactions for the operation even under clock skew and ignores others', () => {
    const skewedMatching = makeTx({
      id: 'tx-skewed',
      status: TransactionStatus.unapproved,
      hash: undefined,
      requestId: depositTransferRequestId(OPERATION_ID),
      time: CREATED_AT_MS - 120_000,
    });
    const otherOperation = makeTx({
      id: 'tx-other-op',
      status: TransactionStatus.unapproved,
      hash: undefined,
      requestId: depositTransferRequestId(OTHER_OPERATION_ID),
      time: CREATED_AT_MS + 1000,
    });
    const submittedSameOp = makeTx({
      id: 'tx-submitted',
      status: TransactionStatus.submitted,
      requestId: depositTransferRequestId(OPERATION_ID),
    });
    const untaggedMatching = makeTx({
      id: 'tx-untagged',
      status: TransactionStatus.unapproved,
      hash: undefined,
      time: CREATED_AT_MS + 1000,
    });

    expect(
      findMatchingUnapprovedDepositTransactions({
        transactions: [
          skewedMatching,
          otherOperation,
          submittedSameOp,
          untaggedMatching,
        ],
        from: FROM,
        operationId: OPERATION_ID,
        createdAt: CREATED_AT,
        plan: PLAN,
      }).map((tx) => tx.id),
    ).toStrictEqual(['tx-skewed', 'tx-untagged']);
  });
});

describe('isKnownFailedDepositHash', () => {
  it('returns true when the hash belongs to a failed, rejected, or dropped transaction', () => {
    expect(
      isKnownFailedDepositHash(
        [makeTx({ status: TransactionStatus.dropped, hash: HASH_1 })],
        HASH_1,
      ),
    ).toBe(true);
    expect(
      isKnownFailedDepositHash(
        [makeTx({ status: TransactionStatus.submitted, hash: HASH_1 })],
        HASH_1,
      ),
    ).toBe(false);
  });
});

describe('waitForPendingDepositTransaction', () => {
  const createMessenger = () => {
    const listeners = new Map<string, Set<(...args: never[]) => void>>();
    const messenger: DepositTransactionMessenger = {
      subscribe(event: string, handler: (...args: never[]) => void) {
        let set = listeners.get(event);
        if (!set) {
          set = new Set();
          listeners.set(event, set);
        }
        set.add(handler);
      },
      unsubscribe(event: string, handler: (...args: never[]) => void) {
        listeners.get(event)?.delete(handler);
      },
    };
    const emit = (event: string, payload: unknown) => {
      for (const handler of listeners.get(event) ?? []) {
        (handler as (arg: unknown) => void)(payload);
      }
    };
    const listenerCount = () =>
      Array.from(listeners.values()).reduce((sum, set) => sum + set.size, 0);
    return { messenger, emit, listenerCount };
  };

  it('presents confirmation for an unapproved transaction and resolves when submitted', async () => {
    const { messenger, emit, listenerCount } = createMessenger();
    const presentConfirmation = jest.fn();
    let currentTx = makeTx({
      id: 'tx-1',
      status: TransactionStatus.unapproved,
      hash: undefined,
    });

    const promise = waitForPendingDepositTransaction({
      txId: 'tx-1',
      fallbackChainId: 8453,
      shouldPresentConfirmation: true,
      presentConfirmation,
      getTransaction: () => currentTx,
      messenger,
    });

    expect(presentConfirmation).toHaveBeenCalledTimes(1);
    currentTx = makeTx({
      id: 'tx-1',
      status: TransactionStatus.submitted,
      hash: HASH_1,
    });
    emit('TransactionController:transactionSubmitted', {
      transactionMeta: currentTx,
    });

    await expect(promise).resolves.toStrictEqual({
      txHash: HASH_1,
      chainId: 8453,
      to: USDC,
      data: DATA,
    });
    expect(listenerCount()).toBe(0);
  });

  it('waits without presenting confirmation for a signed transaction and resolves on stateChange', async () => {
    const { messenger, emit, listenerCount } = createMessenger();
    const presentConfirmation = jest.fn();
    let currentTx = makeTx({
      id: 'tx-1',
      status: TransactionStatus.signed,
      hash: undefined,
    });

    const promise = waitForPendingDepositTransaction({
      txId: 'tx-1',
      fallbackChainId: 8453,
      shouldPresentConfirmation: false,
      presentConfirmation,
      getTransaction: () => currentTx,
      messenger,
    });

    expect(presentConfirmation).not.toHaveBeenCalled();
    currentTx = makeTx({
      id: 'tx-1',
      status: TransactionStatus.submitted,
      hash: HASH_1,
    });
    emit('TransactionController:stateChange', { transactions: [currentTx] });

    await expect(promise).resolves.toStrictEqual({
      txHash: HASH_1,
      chainId: 8453,
      to: USDC,
      data: DATA,
    });
    expect(listenerCount()).toBe(0);
  });

  it('rejects with a user-rejection code when the pending transaction is rejected', async () => {
    const { messenger, emit, listenerCount } = createMessenger();
    const currentTx = makeTx({
      id: 'tx-1',
      status: TransactionStatus.unapproved,
      hash: undefined,
    });

    const promise = waitForPendingDepositTransaction({
      txId: 'tx-1',
      fallbackChainId: 8453,
      shouldPresentConfirmation: true,
      presentConfirmation: jest.fn(),
      getTransaction: () => currentTx,
      messenger,
    });

    emit('TransactionController:transactionRejected', {
      transactionMeta: makeTx({
        id: 'tx-1',
        status: TransactionStatus.rejected,
        hash: undefined,
      }),
    });

    await expect(promise).rejects.toMatchObject({ code: 4001 });
    expect(listenerCount()).toBe(0);
  });

  it('rejects when the pending transaction fails or is dropped', async () => {
    const { messenger, emit, listenerCount } = createMessenger();
    const currentTx = makeTx({
      id: 'tx-1',
      status: TransactionStatus.signed,
      hash: undefined,
    });

    const promise = waitForPendingDepositTransaction({
      txId: 'tx-1',
      fallbackChainId: 8453,
      shouldPresentConfirmation: false,
      presentConfirmation: jest.fn(),
      getTransaction: () => currentTx,
      messenger,
    });

    emit('TransactionController:transactionDropped', {
      transactionMeta: makeTx({
        id: 'tx-1',
        status: TransactionStatus.dropped,
        hash: undefined,
      }),
    });

    await expect(promise).rejects.toThrow('Deposit transaction dropped');
    expect(listenerCount()).toBe(0);
  });
});

describe('session deposit transfer store', () => {
  afterEach(() => {
    clearAllSessionDepositTransfers();
  });

  it('stores, scopes by identity/operation/plan, and clears recorded transfers', () => {
    const transfer = {
      txHash: HASH_1,
      chainId: 8453,
      to: USDC,
      data: DATA,
    };
    const key = {
      venueId: VENUE_ID,
      operationId: 'op-1',
      from: FROM,
      plan: PLAN,
    };

    recordSessionDepositTransfer(key, transfer);

    expect(getSessionDepositTransfer(key)).toStrictEqual(transfer);
    expect(
      getSessionDepositTransfer({ ...key, from: OTHER_FROM }),
    ).toBeUndefined();
    expect(
      getSessionDepositTransfer({ ...key, operationId: 'op-2' }),
    ).toBeUndefined();

    clearSessionDepositTransfer(key);
    expect(getSessionDepositTransfer(key)).toBeUndefined();

    recordSessionDepositTransfer(key, transfer);
    clearSessionDepositTransfersForOperation({
      venueId: VENUE_ID,
      from: FROM,
      operationId: 'op-1',
    });
    expect(getSessionDepositTransfer(key)).toBeUndefined();
  });
});

describe('matchDepositTransferForResume', () => {
  const makeDeposit = (
    overrides: Partial<PredictDepositOperation> = {},
  ): PredictDepositOperation => ({
    operationId: OPERATION_ID as PredictEntityId,
    status: 'awaiting_transfer',
    amount: PLAN.amount,
    chainId: PLAN.chainId,
    tokenContract: PLAN.tokenContract,
    depositAddress: DEPOSIT_ADDRESS,
    planExpiresAt: PLAN.planExpiresAt,
    txHash: null,
    createdAt: CREATED_AT,
    next: { kind: 'wallet_transfer', ...PLAN },
    ...overrides,
  });

  it.each([TransactionStatus.submitted, TransactionStatus.confirmed])(
    'returns report for a matching %s transaction with hash',
    (status) => {
      const result = matchDepositTransferForResume({
        transactions: [makeTx({ status, hash: HASH_1 })],
        deposit: makeDeposit(),
      });

      expect(result).toStrictEqual({
        kind: 'report',
        txHash: HASH_1,
        chainId: 8453,
      });
    },
  );

  it('matches a tagged transaction for the same operationId even when device clock is behind createdAt', () => {
    const result = matchDepositTransferForResume({
      transactions: [
        makeTx({
          status: TransactionStatus.submitted,
          hash: HASH_1,
          requestId: depositTransferRequestId(OPERATION_ID),
          time: CREATED_AT_MS - 300_000,
        }),
      ],
      deposit: makeDeposit(),
    });

    expect(result).toStrictEqual({
      kind: 'report',
      txHash: HASH_1,
      chainId: 8453,
    });
  });

  it.each([
    [
      'wrong amount',
      makeTx({
        txParams: {
          from: FROM,
          to: USDC,
          data: encodeUsdcTransfer(DEPOSIT_ADDRESS, '25.51' as PredictAmount),
          value: '0x0',
        },
      }),
    ],
    [
      'wrong address',
      makeTx({
        txParams: {
          from: FROM,
          to: USDC,
          data: encodeUsdcTransfer(OTHER_ADDRESS, PLAN.amount),
          value: '0x0',
        },
      }),
    ],
    [
      'wrong token contract',
      makeTx({
        txParams: { from: FROM, to: OTHER_ADDRESS, data: DATA, value: '0x0' },
      }),
    ],
    ['wrong chain', makeTx({ chainId: '0x1' })],
    [
      'non-zero native value',
      makeTx({ txParams: { from: FROM, to: USDC, data: DATA, value: '0x1' } }),
    ],
    [
      'different operationId requestId',
      makeTx({ requestId: depositTransferRequestId(OTHER_OPERATION_ID) }),
    ],
    ['older than createdAt without tag', makeTx({ time: CREATED_AT_MS - 1 })],
  ])('returns none for %s', (_label, tx) => {
    expect(
      matchDepositTransferForResume({
        transactions: [tx],
        deposit: makeDeposit(),
      }),
    ).toStrictEqual({ kind: 'none' });
  });

  it.each([TransactionStatus.rejected, TransactionStatus.failed])(
    'returns cancel for a matching %s transaction',
    (status) => {
      const result = matchDepositTransferForResume({
        transactions: [makeTx({ status, hash: undefined })],
        deposit: makeDeposit(),
      });

      expect(result).toStrictEqual({ kind: 'cancel', status });
    },
  );

  it('returns none for a dropped transaction', () => {
    const result = matchDepositTransferForResume({
      transactions: [
        makeTx({ status: TransactionStatus.dropped, hash: undefined }),
      ],
      deposit: makeDeposit(),
    });

    expect(result).toStrictEqual({ kind: 'none' });
  });

  it.each([
    TransactionStatus.unapproved,
    TransactionStatus.approved,
    TransactionStatus.signed,
    TransactionStatus.submitted,
  ])(
    'returns pending for a matching %s transaction without a hash',
    (status) => {
      const tx = makeTx({ status, hash: undefined });
      const result = matchDepositTransferForResume({
        transactions: [tx],
        deposit: makeDeposit(),
      });

      expect(result).toStrictEqual({ kind: 'pending', transactionMeta: tx });
    },
  );

  it('prefers confirmed/submitted over pending and pending over rejected/failed', () => {
    const rejected = makeTx({
      id: 'tx-rejected',
      status: TransactionStatus.rejected,
      hash: undefined,
      time: CREATED_AT_MS + 4000,
    });
    const pending = makeTx({
      id: 'tx-pending',
      status: TransactionStatus.unapproved,
      hash: undefined,
      time: CREATED_AT_MS + 3000,
    });
    const submitted = makeTx({
      id: 'tx-submitted',
      status: TransactionStatus.submitted,
      hash: HASH_1,
      time: CREATED_AT_MS + 1000,
    });
    const confirmed = makeTx({
      id: 'tx-confirmed',
      status: TransactionStatus.confirmed,
      hash: HASH_2,
      time: CREATED_AT_MS + 500,
    });

    expect(
      matchDepositTransferForResume({
        transactions: [rejected, pending, submitted, confirmed],
        deposit: makeDeposit(),
      }),
    ).toStrictEqual({ kind: 'report', txHash: HASH_2, chainId: 8453 });

    expect(
      matchDepositTransferForResume({
        transactions: [rejected, pending],
        deposit: makeDeposit(),
      }),
    ).toMatchObject({ kind: 'pending', transactionMeta: pending });
  });

  it('still matches an awaiting_transfer deposit whose plan already expired (next.kind === wait)', () => {
    const result = matchDepositTransferForResume({
      transactions: [
        makeTx({
          status: TransactionStatus.submitted,
          hash: HASH_1,
          requestId: depositTransferRequestId(OPERATION_ID),
        }),
      ],
      deposit: makeDeposit({
        next: { kind: 'wait' },
      }),
    });

    expect(result).toStrictEqual({
      kind: 'report',
      txHash: HASH_1,
      chainId: 8453,
    });
  });

  it('returns none when the deposit is not awaiting_transfer', () => {
    expect(
      matchDepositTransferForResume({
        transactions: [makeTx({ status: TransactionStatus.submitted })],
        deposit: makeDeposit({
          status: 'processing',
          next: { kind: 'wait' },
        }),
      }),
    ).toStrictEqual({ kind: 'none' });
  });
});
