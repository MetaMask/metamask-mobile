import React from 'react';
import { TransactionStatus } from '@metamask/transaction-controller';
import {
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';

function getStatusText(status: TransactionStatus): string {
  switch (status) {
    case TransactionStatus.confirmed:
      return strings('transaction.confirmed');
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return strings('transaction.failed');
    default:
      return strings('transaction.pending');
  }
}

function getStatusColor(status: TransactionStatus): TextColor {
  switch (status) {
    case TransactionStatus.confirmed:
      return TextColor.SuccessDefault;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return TextColor.ErrorDefault;
    default:
      return TextColor.WarningDefault;
  }
}

export function MoneyTransactionDetailsStatusRow() {
  const { transactionMeta } = useTransactionDetails();
  const { status } = transactionMeta;

  return (
    <TransactionDetailsRow label={strings('transactions.status')}>
      <Text
        testID="money-transaction-status"
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={getStatusColor(status)}
      >
        {getStatusText(status)}
      </Text>
    </TransactionDetailsRow>
  );
}
