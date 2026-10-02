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
type ConfirmedHandler = (transactionMeta: TransactionMeta) => void;

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
    status: TransactionStatus.submitted,
    type: TransactionType.membershipSubscription,
    txParams: { from: '0x1' },
    chainId: '0x1',
    networkClientId: 'mainnet',
    time: Date.now(),
    ...overrides,
  } as TransactionMeta;
}

function getHandlers(): {
  statusUpdatedHandler: StatusUpdatedHandler;
  confirmedHandler: ConfirmedHandler;
} {
  const statusCall = mockSubscribe.mock.calls.find(
    ([event]) => event === 'TransactionController:transactionStatusUpdated',
  );
  const confirmedCall = mockSubscribe.mock.calls.find(
    ([event]) => event === 'TransactionController:transactionConfirmed',
  );

  if (!statusCall || !confirmedCall) {
    throw new Error('Expected both transaction event subscriptions');
  }

  return {
    statusUpdatedHandler: statusCall[1] as StatusUpdatedHandler,
    confirmedHandler: confirmedCall[1] as ConfirmedHandler,
  };
}

describe('waitForMembershipTopUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves when the matching top-up is confirmed via status update', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);
    const { statusUpdatedHandler } = getHandlers();
    const confirmedMeta = createTransactionMeta({
      status: TransactionStatus.confirmed,
    });

    statusUpdatedHandler({ transactionMeta: confirmedMeta });

    await expect(promise).resolves.toBe(confirmedMeta);
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionStatusUpdated',
      statusUpdatedHandler,
    );
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
    );
  });

  it('resolves when the matching top-up is confirmed via transactionConfirmed', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);
    const { confirmedHandler } = getHandlers();
    const confirmedMeta = createTransactionMeta({
      status: TransactionStatus.confirmed,
    });

    confirmedHandler(confirmedMeta);

    await expect(promise).resolves.toBe(confirmedMeta);
  });

  it('rejects with a user-rejected error when the top-up is rejected', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);
    const { statusUpdatedHandler } = getHandlers();

    statusUpdatedHandler({
      transactionMeta: createTransactionMeta({
        status: TransactionStatus.rejected,
      }),
    });

    await expect(promise).rejects.toThrow('User rejected the request');
  });

  it('rejects with the transaction error message when the top-up fails', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);
    const { statusUpdatedHandler } = getHandlers();

    statusUpdatedHandler({
      transactionMeta: createTransactionMeta({
        status: TransactionStatus.failed,
        error: { name: 'Error', message: 'relay quote failed' },
      }),
    });

    await expect(promise).rejects.toThrow('relay quote failed');
  });

  it('rejects with a status message when failed without meta.error', async () => {
    const { promise } = waitForMembershipTopUp(BATCH_ID);
    const { statusUpdatedHandler } = getHandlers();

    statusUpdatedHandler({
      transactionMeta: createTransactionMeta({
        status: TransactionStatus.dropped,
      }),
    });

    await expect(promise).rejects.toThrow(
      'Membership subscription top-up dropped',
    );
  });

  it('ignores events for a different batch id', async () => {
    const { promise, cancel } = waitForMembershipTopUp(BATCH_ID);
    const { statusUpdatedHandler, confirmedHandler } = getHandlers();

    statusUpdatedHandler({
      transactionMeta: createTransactionMeta({
        batchId: OTHER_BATCH_ID,
        status: TransactionStatus.confirmed,
      }),
    });
    confirmedHandler(
      createTransactionMeta({
        batchId: OTHER_BATCH_ID,
        status: TransactionStatus.confirmed,
      }),
    );

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    cancel();
    await expect(
      Promise.race([
        promise.then(() => 'resolved'),
        Promise.resolve('pending'),
      ]),
    ).resolves.toBe('pending');
  });

  it('ignores events for a non-membership transaction type', async () => {
    const { promise, cancel } = waitForMembershipTopUp(BATCH_ID);
    const { statusUpdatedHandler } = getHandlers();

    statusUpdatedHandler({
      transactionMeta: createTransactionMeta({
        type: TransactionType.moneyAccountDeposit,
        status: TransactionStatus.confirmed,
      }),
    });

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    cancel();
    await expect(
      Promise.race([
        promise.then(() => 'resolved'),
        Promise.resolve('pending'),
      ]),
    ).resolves.toBe('pending');
  });

  it('unsubscribes without settling when cancel is called', async () => {
    const { promise, cancel } = waitForMembershipTopUp(BATCH_ID);
    const { statusUpdatedHandler, confirmedHandler } = getHandlers();

    cancel();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionStatusUpdated',
      statusUpdatedHandler,
    );
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      confirmedHandler,
    );

    statusUpdatedHandler({
      transactionMeta: createTransactionMeta({
        status: TransactionStatus.confirmed,
      }),
    });

    await expect(
      Promise.race([
        promise.then(() => 'resolved'),
        Promise.resolve('pending'),
      ]),
    ).resolves.toBe('pending');
  });
});
