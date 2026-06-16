import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';

export function TransactionDetailsFiatOrderIdRow() {
  const { transactionMeta } = useTransactionDetails();

  const isDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);
  const orderId = transactionMeta?.metamaskPay?.fiat?.orderId;

  if (!isDeposit || !orderId) {
    return null;
  }

  const displayId = orderId.includes('/') ? orderId.split('/').pop() : orderId;

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.order_id')}
    >
      <Text color={TextColor.Alternative}>{displayId}</Text>
    </TransactionDetailsRow>
  );
}
