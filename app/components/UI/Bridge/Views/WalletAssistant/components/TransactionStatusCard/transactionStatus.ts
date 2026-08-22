import { StatusTypes } from '@metamask/bridge-controller';

export enum TransactionStatusTone {
  Pending = 'pending',
  Success = 'success',
  Danger = 'danger',
}

export interface TransactionStatusPresentation {
  title: string;
  description: string;
  tone: TransactionStatusTone;
  isPending: boolean;
}

const PENDING_PRESENTATION: TransactionStatusPresentation = {
  title: 'Transaction submitted',
  description:
    'MetaMask is tracking this transaction. You can leave this conversation and return later.',
  tone: TransactionStatusTone.Pending,
  isPending: true,
};

const COMPLETE_PRESENTATION: TransactionStatusPresentation = {
  title: 'Transaction completed',
  description: 'The destination transaction has completed.',
  tone: TransactionStatusTone.Success,
  isPending: false,
};

const FAILED_PRESENTATION: TransactionStatusPresentation = {
  title: 'Transaction failed',
  description:
    'The transaction did not complete. Review Activity for more details.',
  tone: TransactionStatusTone.Danger,
  isPending: false,
};

const UNKNOWN_PRESENTATION: TransactionStatusPresentation = {
  title: 'Transaction status unavailable',
  description: 'Open Activity to check the latest transaction status.',
  tone: TransactionStatusTone.Danger,
  isPending: false,
};

export const getTransactionStatusPresentation = (
  status: StatusTypes,
): TransactionStatusPresentation => {
  switch (status) {
    case StatusTypes.COMPLETE:
      return COMPLETE_PRESENTATION;
    case StatusTypes.FAILED:
      return FAILED_PRESENTATION;
    case StatusTypes.PENDING:
    case StatusTypes.SUBMITTED:
      return PENDING_PRESENTATION;
    case StatusTypes.UNKNOWN:
    default:
      return UNKNOWN_PRESENTATION;
  }
};
