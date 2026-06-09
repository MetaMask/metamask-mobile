import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import Text from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../../Views/confirmations/utils/transaction';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';

export function MoneyTransactionDetailsOrderIdRow() {
  const { transactionMeta } = useTransactionDetails();

  const isDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const orderId = transactionMeta?.metamaskPay?.fiat?.orderId;

  if (!isDeposit || !orderId) {
    return null;
  }

  const displayId = orderId.includes('/')
    ? orderId.split('/').pop()
    : orderId;

  return (
    <TransactionDetailsRow label={strings('transaction_details.label.order_id')}>
      <Text>{displayId}</Text>
    </TransactionDetailsRow>
  );
}
