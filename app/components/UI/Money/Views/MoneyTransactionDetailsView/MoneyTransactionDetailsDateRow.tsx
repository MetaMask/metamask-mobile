import React from 'react';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import { Text } from '@metamask/design-system-react-native';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import I18n, { strings } from '../../../../../../locales/i18n';

export function MoneyTransactionDetailsDateRow() {
  const { transactionMeta } = useTransactionDetails();
  const date = new Date(transactionMeta.time);

  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);

  const timeString = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);

  const dateString = `${month} ${date.getDate()}, ${date.getFullYear()} at ${timeString}`;

  return (
    <TransactionDetailsRow label={strings('transactions.date')}>
      <Text>{dateString}</Text>
    </TransactionDetailsRow>
  );
}
