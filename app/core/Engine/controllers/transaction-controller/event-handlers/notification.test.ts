import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  handleShowNotification,
  handleShowSolanaPayStatusNotification,
} from './notification';
import NotificationManager from '../../../../NotificationManager';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../../../../NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
  watchSubmittedTransaction: jest.fn(),
}));

describe('handleShowSolanaPayStatusNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the persistent neutral notification for an unknown Solana outcome', () => {
    const transactionMeta = {
      metamaskPay: {
        solanaExecution: {
          phase: 'unknown',
          sourceStatus: 'unknown',
          relayStatus: 'unknown',
          followUpStatus: 'not-required',
        } as never,
      },
    } as unknown as TransactionMeta;

    handleShowSolanaPayStatusNotification(transactionMeta);

    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith({
      status: 'pending',
      title: strings('confirm.solana_pay.status_unavailable'),
    });
  });

  it('retains the normal product notification for a submitted outcome', () => {
    const transactionMeta = {
      metamaskPay: {
        solanaExecution: {
          phase: 'submitted',
          sourceStatus: 'pending',
          relayStatus: 'pending',
          followUpStatus: 'not-required',
        } as never,
      },
    } as unknown as TransactionMeta;

    handleShowSolanaPayStatusNotification(transactionMeta);

    expect(NotificationManager.showSimpleNotification).not.toHaveBeenCalled();
  });
});

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

  it('does not call watchSubmittedTransaction for perpsWithdraw (not in REDESIGNED_TRANSACTION_TYPES)', () => {
    const transactionMeta = {
      type: TransactionType.perpsWithdraw,
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
