import {
  TransactionType,
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import NotificationManager from '../../../../NotificationManager';
import { REDESIGNED_TRANSACTION_TYPES } from '../../../../../components/Views/confirmations/constants/confirmations';
import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';

const SUPPRESS_GENERIC_NOTIFICATION_TYPES: readonly TransactionType[] = [
  TransactionType.perpsWithdraw,
];

export function handleShowNotification(transactionMeta: TransactionMeta) {
  const { status, type } = transactionMeta;
  if (
    REDESIGNED_TRANSACTION_TYPES.includes(type as TransactionType) &&
    !hasTransactionType(transactionMeta, SUPPRESS_GENERIC_NOTIFICATION_TYPES) &&
    status !== TransactionStatus.failed
  ) {
    NotificationManager.watchSubmittedTransaction(transactionMeta);
  }
}
