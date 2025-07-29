import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { handleShowNotification } from './notification';
import NotificationManager from '../../../../NotificationManager';

jest.mock('../../../../NotificationManager', () => ({
  watchSubmittedTransaction: jest.fn(),
}));

describe('handleShowNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('call watchSubmittedTransaction for redesigned transaction types', () => {
    const transactionMeta = {
      type: TransactionType.stakingDeposit,
      id: '123',
      status: 'submitted',
      time: Date.now(),
      transaction: {},
    } as unknown as TransactionMeta;

    handleShowNotification(transactionMeta);

    expect(NotificationManager.watchSubmittedTransaction).toHaveBeenCalledWith(
      transactionMeta,
    );
    expect(NotificationManager.watchSubmittedTransaction).toHaveBeenCalledTimes(
      1,
    );
  });

  it('not call watchSubmittedTransaction for non-redesigned transaction types', () => {
    const transactionMeta = {
      type: TransactionType.cancel,
      id: '123',
      status: 'submitted',
      time: Date.now(),
      transaction: {},
    } as unknown as TransactionMeta;

    handleShowNotification(transactionMeta);

    expect(
      NotificationManager.watchSubmittedTransaction,
    ).not.toHaveBeenCalled();
  });

  it('not call watchSubmittedTransaction for failed transaction', () => {
    const transactionMeta = {
      type: TransactionType.stakingDeposit,
      id: '123',
      status: 'failed',
    } as unknown as TransactionMeta;

    handleShowNotification(transactionMeta);

    expect(
      NotificationManager.watchSubmittedTransaction,
    ).not.toHaveBeenCalled();
  });

  it('handle undefined transaction type', () => {
    const transactionMeta = {
      type: undefined,
      id: '123',
      status: 'submitted',
      time: Date.now(),
      transaction: {},
    } as unknown as TransactionMeta;

    handleShowNotification(transactionMeta);

    expect(
      NotificationManager.watchSubmittedTransaction,
    ).not.toHaveBeenCalled();
  });
});
