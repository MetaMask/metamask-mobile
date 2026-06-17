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

function getTextColor(status: TransactionStatus): TextColor {
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
