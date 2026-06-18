import React from 'react';
import { TransactionStatus } from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { TransactionDetailsStatus } from '../transaction-details-status';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';

export function TransactionDetailsStatusRow() {
  const { transactionMeta } = useTransactionDetails();
  const isMoneyContext = useIsMoneyAccountContext();

  if (isMoneyContext) {
    const { status } = transactionMeta;
    return (
      <TransactionDetailsRow label={strings('transactions.status')}>
        <Text
          color={getTextColor(status)}
          variant={TextVariant.BodyMDMedium}
          testID={TransactionDetailsSelectorIDs.STATUS}
        >
          {getStatusText(status)}
        </Text>
      </TransactionDetailsRow>
    );
  }

  return (
    <TransactionDetailsRow label={strings('transactions.status')}>
      <TransactionDetailsStatus
        transactionMeta={transactionMeta}
        testId={TransactionDetailsSelectorIDs.STATUS}
      />
    </TransactionDetailsRow>
  );
}

const STATUS_TEXT_MAP: Partial<Record<TransactionStatus, string>> = {
  [TransactionStatus.confirmed]: 'transaction.confirmed',
  [TransactionStatus.failed]: 'transaction.failed',
  [TransactionStatus.dropped]: 'transaction.failed',
};

const STATUS_COLOR_MAP: Partial<Record<TransactionStatus, TextColor>> = {
  [TransactionStatus.confirmed]: TextColor.Success,
  [TransactionStatus.failed]: TextColor.Error,
  [TransactionStatus.dropped]: TextColor.Error,
};

function getStatusText(status: TransactionStatus): string {
  return strings(STATUS_TEXT_MAP[status] ?? 'transaction.pending');
}

function getTextColor(status: TransactionStatus): TextColor {
  return STATUS_COLOR_MAP[status] ?? TextColor.Warning;
}
