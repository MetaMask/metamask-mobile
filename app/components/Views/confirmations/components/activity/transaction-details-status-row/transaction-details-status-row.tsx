import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionDetailsStatus } from '../transaction-details-status';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';
import { hasTransactionType } from '../../../utils/transaction';

const TEXT_ONLY_STATUS_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdConversion,
  TransactionType.musdClaim,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
  TransactionType.predictClaim,
];

export function TransactionDetailsStatusRow() {
  const { transactionMeta } = useTransactionDetails();
  const showIcon = !hasTransactionType(transactionMeta, TEXT_ONLY_STATUS_TYPES);

  return (
    <TransactionDetailsRow label={strings('transactions.status')}>
      <TransactionDetailsStatus
        transactionMeta={transactionMeta}
        testId={TransactionDetailsSelectorIDs.STATUS}
        showIcon={showIcon}
      />
    </TransactionDetailsRow>
  );
}
