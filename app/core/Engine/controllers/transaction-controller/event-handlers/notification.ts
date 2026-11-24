import {
  TransactionType,
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import NotificationManager from '../../../../NotificationManager';
import { CONFIRMATION_TRANSACTION_TYPES } from '../../../../../components/Views/confirmations/constants/confirmations';

export function handleShowNotification(transactionMeta: TransactionMeta) {
  const { status } = transactionMeta;
  if (
    transactionMeta.type !== undefined &&
    CONFIRMATION_TRANSACTION_TYPES.includes(transactionMeta.type) &&
    status !== TransactionStatus.failed
  ) {
    NotificationManager.watchSubmittedTransaction(transactionMeta);
  }
}
