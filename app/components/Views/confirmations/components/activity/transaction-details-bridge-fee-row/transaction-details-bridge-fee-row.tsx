import React from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';

export function TransactionDetailsBridgeFeeRow() {
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { bridgeFeeFiat } = metamaskPay || {};

  if (!bridgeFeeFiat) {
    return null;
  }

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.bridge_fee')}
    >
      <Text>{bridgeFeeFiat}</Text>
    </TransactionDetailsRow>
  );
}
