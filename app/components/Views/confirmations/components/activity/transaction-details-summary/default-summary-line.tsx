import React from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionSummaryLine } from './transaction-summary-line';

export function DefaultSummaryLine({
  transactionMeta,
}: {
  transactionMeta: TransactionMeta;
}) {
  const { type } = transactionMeta;

  let title: string;

  switch (type) {
    case TransactionType.musdClaim:
      title = strings('transaction_details.summary_title.musd_claim');
      break;
    case TransactionType.swap:
      title = strings('transaction_details.summary_title.swap');
      break;
    case TransactionType.swapApproval:
      title = strings('transaction_details.summary_title.swap_approval');
      break;
    default:
      title = strings('transaction_details.summary_title.default');
  }

  return (
    <TransactionSummaryLine title={title} transactionMeta={transactionMeta} />
  );
}
