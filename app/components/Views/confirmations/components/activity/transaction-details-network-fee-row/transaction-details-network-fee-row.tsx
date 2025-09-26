import React from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';

export function TransactionDetailsNetworkFeeRow() {
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { networkFeeFiat } = metamaskPay || {};

  if (!networkFeeFiat) {
    return null;
  }

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.network_fee')}
    >
      <Text>{networkFeeFiat}</Text>
    </TransactionDetailsRow>
  );
}
