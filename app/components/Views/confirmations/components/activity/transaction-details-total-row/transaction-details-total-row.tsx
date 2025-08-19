import React from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';

export function TransactionDetailsTotalRow() {
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { totalFiat } = metamaskPay || {};

  if (!totalFiat) {
    return null;
  }

  return (
    <TransactionDetailsRow label={'Total'}>
      <Text>{totalFiat}</Text>
    </TransactionDetailsRow>
  );
}
