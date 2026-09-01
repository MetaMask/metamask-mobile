import { StatusTypes } from '@metamask/bridge-controller';

import {
  getTransactionStatusPresentation,
  TransactionStatusTone,
} from './transactionStatus';

describe('getTransactionStatusPresentation', () => {
  it.each([StatusTypes.SUBMITTED, StatusTypes.PENDING])(
    'maps %s to the pending presentation',
    (status) => {
      expect(getTransactionStatusPresentation(status)).toEqual({
        title: 'Transaction submitted',
        description:
          'MetaMask is tracking this transaction. You can leave this conversation and return later.',
        tone: TransactionStatusTone.Pending,
        isPending: true,
      });
    },
  );

  it('maps complete to the success presentation', () => {
    expect(getTransactionStatusPresentation(StatusTypes.COMPLETE)).toEqual({
      title: 'Transaction completed',
      description: 'The destination transaction has completed.',
      tone: TransactionStatusTone.Success,
      isPending: false,
    });
  });

  it('maps failed to the error presentation', () => {
    expect(getTransactionStatusPresentation(StatusTypes.FAILED)).toEqual({
      title: 'Transaction failed',
      description:
        'The transaction did not complete. Review Activity for more details.',
      tone: TransactionStatusTone.Danger,
      isPending: false,
    });
  });

  it('maps unknown to an explicit unavailable presentation', () => {
    expect(getTransactionStatusPresentation(StatusTypes.UNKNOWN)).toEqual({
      title: 'Transaction status unavailable',
      description: 'Open Activity to check the latest transaction status.',
      tone: TransactionStatusTone.Danger,
      isPending: false,
    });
  });
});
