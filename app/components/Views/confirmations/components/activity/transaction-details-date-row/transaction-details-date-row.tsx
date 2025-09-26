import React from 'react';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection } from '../../../../../UI/Box/box.types';

export function TransactionDetailsDateRow() {
  const { transactionMeta } = useTransactionDetails();

  const date = new Date(transactionMeta.time);

  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);

  const dateString = `${month} ${date.getDate()}, ${date.getFullYear()}`;

  const timeString = `${getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date)},`;

  return (
    <TransactionDetailsRow label={strings('transactions.date')}>
      <Box flexDirection={FlexDirection.Row} gap={6}>
        <Text color={TextColor.Alternative}>{timeString}</Text>
        <Text>{dateString}</Text>
      </Box>
    </TransactionDetailsRow>
  );
}
