import React from 'react';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { formatTimestampToDateTime } from '../../../../../../util/date';
import { strings } from '../../../../../../../locales/i18n';

export function TransactionDetailsDateRow() {
  const { transactionMeta } = useTransactionDetails();

  return (
    <TransactionDetailsRow label={strings('transactions.date')}>
      <Text>{formatTimestampToDateTime(transactionMeta.time)}</Text>
    </TransactionDetailsRow>
  );
}
