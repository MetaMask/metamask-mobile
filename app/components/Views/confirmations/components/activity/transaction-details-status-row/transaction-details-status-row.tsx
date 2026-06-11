import React from 'react';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { TransactionDetailsStatus } from '../transaction-details-status';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';
import { hasTransactionType } from '../../../utils/transaction';

const SIMPLE_STATUS_TYPES = [
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
      return TextColor.Success;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return TextColor.Error;
    default:
      return TextColor.Warning;
  }
}

export function TransactionDetailsStatusRow() {
  const { transactionMeta } = useTransactionDetails();

  if (hasTransactionType(transactionMeta, SIMPLE_STATUS_TYPES)) {
    return (
      <TransactionDetailsRow label={strings('transactions.status')}>
        <Text
          testID="transaction-details-status"
          variant={TextVariant.BodyMD}
          color={getStatusColor(transactionMeta.status)}
        >
          {getStatusText(transactionMeta.status)}
        </Text>
      </TransactionDetailsRow>
    );
  }

  return (
    <>
      <TransactionDetailsRow label={strings('transactions.status')}>
        <></>
      </TransactionDetailsRow>
      <TransactionDetailsStatus
        transactionMeta={transactionMeta}
        testId={TransactionDetailsSelectorIDs.STATUS}
      />
    </>
  );
}
