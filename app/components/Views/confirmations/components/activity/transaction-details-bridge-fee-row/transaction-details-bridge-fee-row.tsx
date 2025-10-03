import React from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsSelectorIDs } from '../../../../../../../e2e/selectors/Transactions/TransactionDetailsModal.selectors';

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
      <Text testID={TransactionDetailsSelectorIDs.BRIDGE_FEE}>
        {bridgeFeeFiat}
      </Text>
    </TransactionDetailsRow>
  );
}
