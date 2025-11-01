import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionDetailsStatus } from '../transaction-details-status';

export function TransactionDetailsStatusRow() {
  const { transactionMeta } = useTransactionDetails();

  return (
    <>
      <TransactionDetailsRow label={strings('transactions.status')}>
        <></>
      </TransactionDetailsRow>
      <TransactionDetailsStatus transactionMeta={transactionMeta} />
    </>
  );
}
