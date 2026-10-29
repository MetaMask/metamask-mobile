import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { waitForMembershipTopUp } from './waitForMembershipTopUp';

jest.mock('../../../../core/Engine');

type StatusUpdatedHandler = (payload: {
  transactionMeta: TransactionMeta;
}) => void;

const STATUS_UPDATED = 'TransactionController:transactionStatusUpdated';

const BATCH_ID =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;
const OTHER_BATCH_ID =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Hex;

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

Object.defineProperty(Engine, 'controllerMessenger', {
  value: { subscribe: mockSubscribe, unsubscribe: mockUnsubscribe },
  writable: true,
  configurable: true,
});

function createTransactionMeta(
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta {
  return {
    id: 'tx-1',
    batchId: BATCH_ID,
    status: TransactionStatus.approved,
    type: TransactionType.membershipSubscription,
    txParams: { from: '0x1' },
    chainId: '0x1',
    networkClientId: 'mainnet',
    time: Date.now(),
    ...overrides,
  } as TransactionMeta;
}

function getStatusUpdatedHandler(): StatusUpdatedHandler {
  const statusCall = mockSubscribe.mock.calls.find(
    ([event]) => event === STATUS_UPDATED,
  );

  if (!statusCall) {
    throw new Error('Expected a transactionStatusUpdated subscription');
  }

  return statusCall[1] as StatusUpdatedHandler;
}

async function expectPending(promise: Promise<unknown>): Promise<void> {
  await expect(
    Promise.race([promise.then(() => 'resolved'), Promise.resolve('pending')]),
  ).resolves.toBe('pending');
}

describe('waitForMembershipTopUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves and unsubscribes when the matching top-up is approved', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);
    const statusUpdatedHandler = getStatusUpdatedHandler();
    const approvedMeta = createTransactionMeta();

    statusUpdatedHandler({ transactionMeta: approvedMeta });

    await expect(promise).resolves.toBe(approvedMeta);
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      STATUS_UPDATED,
      statusUpdatedHandler,
    );
  });

  it.each([
    TransactionStatus.signed,
    TransactionStatus.submitted,
    TransactionStatus.confirmed,
  ])(
    'resolves when the first matching update is the later %s status',
    async (status) => {
      const { promise } = waitForMembershipTopUp(BATCH_ID);
      const meta = createTransactionMeta({ status });

      getStatusUpdatedHandler()({ transactionMeta: meta });

      await expect(promise).resolves.toBe(meta);
    },
  );

  it('ignores failures reported after approval', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);
    const statusUpdatedHandler = getStatusUpdatedHandler();
    const approvedMeta = createTransactionMeta();

    statusUpdatedHandler({ transactionMeta: approvedMeta });
    statusUpdatedHandler({
      transactionMeta: createTransactionMeta({
        status: TransactionStatus.failed,
      }),
    });

    await expect(promise).resolves.toBe(approvedMeta);
  });

  it('stays pending while the top-up is unapproved', async () => {
    const { promise, cancel } = waitForMembershipTopUp(BATCH_ID);

    getStatusUpdatedHandler()({
      transactionMeta: createTransactionMeta({
        status: TransactionStatus.unapproved,
      }),
    });

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    cancel();
    await expectPending(promise);
  });

  it('rejects with a user-rejected error when the top-up is rejected', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);

    getStatusUpdatedHandler()({
      transactionMeta: createTransactionMeta({
        status: TransactionStatus.rejected,
      }),
    });

    await expect(promise).rejects.toThrow('User rejected the request');
  });

  it('rejects with the transaction error message when the top-up fails', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);

    getStatusUpdatedHandler()({
      transactionMeta: createTransactionMeta({
        status: TransactionStatus.failed,
        error: { name: 'Error', message: 'No chainId defined.' },
      }),
    });

    await expect(promise).rejects.toThrow('No chainId defined.');
  });

  it.each([TransactionStatus.dropped, TransactionStatus.cancelled])(
    'rejects with a status message when %s without meta.error',
    async (status) => {
      const { promise } = waitForMembershipTopUp(BATCH_ID);

      getStatusUpdatedHandler()({
        transactionMeta: createTransactionMeta({ status }),
      });

      await expect(promise).rejects.toThrow(
        `Membership subscription top-up ${status}`,
      );
    },
  );

  it('ignores events for a different batch id', async () => {
    const { promise, cancel } = waitForMembershipTopUp(BATCH_ID);

    getStatusUpdatedHandler()({
      transactionMeta: createTransactionMeta({ batchId: OTHER_BATCH_ID }),
    });

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    cancel();
    await expectPending(promise);
  });

  it('ignores events for a non-membership transaction type', async () => {
    const { promise, cancel } = waitForMembershipTopUp(BATCH_ID);

    getStatusUpdatedHandler()({
      transactionMeta: createTransactionMeta({
        type: TransactionType.moneyAccountDeposit,
      }),
    });

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    cancel();
    await expectPending(promise);
  });

  it('unsubscribes without settling when cancel is called', async () => {
    const { promise, cancel } = waitForMembershipTopUp(BATCH_ID);
    const statusUpdatedHandler = getStatusUpdatedHandler();

    cancel();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      STATUS_UPDATED,
      statusUpdatedHandler,
    );

    statusUpdatedHandler({ transactionMeta: createTransactionMeta() });

    await expectPending(promise);
  });
});
