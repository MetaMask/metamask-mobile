import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text, {
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import Tooltip from '../../UI/Tooltip';

export function TransactionDetailsStatusRow() {
  const { transactionMeta } = useTransactionDetails();

  const statusText = getStatusText(transactionMeta.status);
  const statusColor = getStatusColour(transactionMeta.status);
  const statusIcon = getStatusIcon(transactionMeta.status);
  const errorMessage = getErrorMessage(transactionMeta);

  const tooltip =
    transactionMeta.status === TransactionStatus.failed
      ? errorMessage
      : undefined;

  return (
    <TransactionDetailsRow label={strings('transactions.status')}>
      <Box
        flexDirection={FlexDirection.Row}
        gap={6}
        alignItems={AlignItems.center}
      >
        {!tooltip && <Icon name={statusIcon} color={statusColor} />}
        {tooltip && (
          <Tooltip
            iconColor={IconColor.Error}
            tooltipTestId="status-tooltip"
            content={tooltip}
          />
        )}
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

function getStatusIcon(status: TransactionStatus): IconName {
  switch (status) {
    case TransactionStatus.confirmed:
      return IconName.Check;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return IconName.Warning;
    default:
      return IconName.Pending;
  }
}

function getErrorMessage(transactionMeta: TransactionMeta): string | undefined {
  const { error } = transactionMeta;

  if (!error) return undefined;

  if (error.stack) {
    try {
      const start = error.stack.indexOf('{');
      const end = error.stack.lastIndexOf('}');
      const stackObject = JSON.parse(error.stack.substring(start, end + 1));
      const stackMessage = stackObject?.data?.message;

      if (stackMessage) {
        return stackMessage;
      }
    } catch {
      // Intentionally empty
    }
  }

  return error.message;
}
