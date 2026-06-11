import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { hasTransactionType } from '../../../utils/transaction';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection } from '../../../../../UI/Box/box.types';

const COMBINED_DATE_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdConversion,
  TransactionType.musdClaim,
  TransactionType.perpsDeposit,
  TransactionType.perpsWithdraw,
  TransactionType.predictDeposit,
  TransactionType.predictWithdraw,
  TransactionType.predictClaim,
];

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

  if (hasTransactionType(transactionMeta, COMBINED_DATE_TYPES)) {
    const dateString = `${month} ${date.getDate()}, ${date.getFullYear()} at ${timeString}`;
    return (
      <TransactionDetailsRow label={strings('transactions.date')}>
        <Text>{dateString}</Text>
      </TransactionDetailsRow>
    );
  }

  return (
    <TransactionDetailsRow label={strings('transactions.date')}>
      <Box flexDirection={FlexDirection.Row} gap={6}>
        <Text color={TextColor.Alternative}>{timeString},</Text>
        <Text>
          {month} {date.getDate()}, {date.getFullYear()}
        </Text>
      </Box>
    </TransactionDetailsRow>
  );
}
