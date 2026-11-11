import React from 'react';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { Text } from '@metamask/design-system-react-native';

export function TransactionDetailsDateRow() {
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
