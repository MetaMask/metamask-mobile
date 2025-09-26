import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionStatus } from '@metamask/transaction-controller';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { TransactionDetailsStatusIcon } from '../transaction-details-status-icon';

export function TransactionDetailsStatusRow() {
  const { transactionMeta } = useTransactionDetails();

  const statusText = getStatusText(transactionMeta.status);
  const statusColor = getStatusColour(transactionMeta.status);

  return (
    <TransactionDetailsRow label={strings('transactions.status')}>
      <Box
        flexDirection={FlexDirection.Row}
        gap={6}
        alignItems={AlignItems.center}
      >
        <TransactionDetailsStatusIcon transactionMeta={transactionMeta} />
        <Text color={statusColor}>{statusText}</Text>
      </Box>
    </TransactionDetailsRow>
  );
}

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

function getStatusColour(status: TransactionStatus): TextColor {
  switch (status) {
    case TransactionStatus.confirmed:
      return TextColor.Success;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return TextColor.Error;
    default:
      return TextColor.Warning;
  }
}
